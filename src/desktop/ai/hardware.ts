import { execFile } from "node:child_process";
import { statfs } from "node:fs/promises";
import { arch, cpus, platform, totalmem } from "node:os";
import { promisify } from "node:util";

import {
  hardwareProfiles,
  type CatalogEntry,
  type HardwareProfile,
} from "./model-catalog";

// L3 (LF-17): what this computer can run. Profiles (docs/technical/49 §3.6):
//   essential  16 GB RAM (no model approved yet)
//   standard   32 GB unified memory (Apple Silicon) or a GPU with >= 12 GB
//   advanced   64 GB unified memory or a GPU with >= 24 GB
//   none       below essential: mock generation, private server or an
//              optional external provider

const run = promisify(execFile);
const GB = 1024 ** 3;

export type Hardware = Readonly<{
  platform: NodeJS.Platform;
  arch: string;
  cpu: string;
  memoryBytes: number;
  appleSilicon: boolean;
  gpuMemoryBytes: number | null;
  freeDiskBytes: number | null;
}>;

async function nvidiaMemoryBytes(): Promise<number | null> {
  try {
    const { stdout } = await run(
      "nvidia-smi",
      ["--query-gpu=memory.total", "--format=csv,noheader,nounits"],
      { timeout: 5_000 },
    );
    const mib = Math.max(...stdout.split("\n").map(Number).filter(Boolean));
    return Number.isFinite(mib) ? mib * 1024 * 1024 : null;
  } catch {
    return null;
  }
}

export async function detectHardware(dataDir: string): Promise<Hardware> {
  let freeDiskBytes: number | null = null;
  try {
    const stats = await statfs(dataDir);
    freeDiskBytes = stats.bavail * stats.bsize;
  } catch {}
  const appleSilicon = platform() === "darwin" && arch() === "arm64";
  return {
    platform: platform(),
    arch: arch(),
    cpu: cpus()[0]?.model ?? "unknown",
    memoryBytes: totalmem(),
    appleSilicon,
    gpuMemoryBytes: appleSilicon ? null : await nvidiaMemoryBytes(),
    freeDiskBytes,
  };
}

export function profileFor(hardware: Hardware): HardwareProfile | "none" {
  const memory = hardware.memoryBytes / GB;
  const gpu = (hardware.gpuMemoryBytes ?? 0) / GB;
  // Small tolerance: a "32 GB" machine reports slightly less.
  if ((hardware.appleSilicon && memory >= 62) || gpu >= 23) return "advanced";
  if ((hardware.appleSilicon && memory >= 31) || gpu >= 11.5) return "standard";
  if (memory >= 15.5) return "essential";
  return "none";
}

const rank = (profile: HardwareProfile) => hardwareProfiles.indexOf(profile);

// Models this computer may offer: fits the profile, fits on disk (with 10 GB
// to spare for the workspace) and is not rejected. Recommended first.
export function modelsForHardware(
  catalog: readonly CatalogEntry[],
  hardware: Hardware,
) {
  const profile = profileFor(hardware);
  if (profile === "none") return [];
  return catalog
    .filter((entry) => entry.evaluation.status !== "rejected")
    .filter((entry) => rank(entry.minProfile) <= rank(profile))
    .map((entry) => ({
      entry,
      fitsOnDisk:
        hardware.freeDiskBytes === null ||
        hardware.freeDiskBytes - entry.sizeBytes > 10 * GB,
      recommended: entry.evaluation.status === "candidate",
    }))
    .sort((a, b) => Number(b.recommended) - Number(a.recommended));
}
