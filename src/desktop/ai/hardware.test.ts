import { describe, expect, it } from "vitest";

import { modelsForHardware, profileFor, type Hardware } from "./hardware";
import { MODEL_CATALOG } from "./model-catalog";

const GB = 1024 ** 3;
const mac = (memory: number, freeDisk = 100): Hardware => ({
  platform: "darwin",
  arch: "arm64",
  cpu: "Apple M4",
  memoryBytes: memory * GB,
  appleSilicon: true,
  gpuMemoryBytes: null,
  freeDiskBytes: freeDisk * GB,
});
const pc = (memory: number, gpu: number | null): Hardware => ({
  platform: "win32",
  arch: "x64",
  cpu: "x86",
  memoryBytes: memory * GB,
  appleSilicon: false,
  gpuMemoryBytes: gpu === null ? null : gpu * GB,
  freeDiskBytes: 200 * GB,
});

describe("hardware profiles (LF-17)", () => {
  it("maps memory and GPU to profiles", () => {
    expect(profileFor(mac(8))).toBe("none");
    expect(profileFor(mac(16))).toBe("essential");
    expect(profileFor(mac(32))).toBe("standard");
    expect(profileFor(mac(64))).toBe("advanced");
    expect(profileFor(pc(32, null))).toBe("essential");
    expect(profileFor(pc(16, 12))).toBe("standard");
    expect(profileFor(pc(32, 24))).toBe("advanced");
  });

  it("offers the candidate first on the M4 test Mac and never rejected models", () => {
    const offered = modelsForHardware(MODEL_CATALOG, mac(32));
    expect(offered.map((o) => o.entry.id)).toEqual([
      "gemma4-12b-qat",
      "qwen3.5-4b",
    ]);
    expect(offered[0]!.recommended).toBe(true);
  });

  it("offers nothing recommended on 16 GB and nothing at all below it", () => {
    const essential = modelsForHardware(MODEL_CATALOG, mac(16));
    expect(essential.map((o) => o.entry.id)).toEqual(["qwen3.5-4b"]);
    expect(essential.some((o) => o.recommended)).toBe(false);
    expect(modelsForHardware(MODEL_CATALOG, mac(8))).toEqual([]);
  });

  it("flags models that do not fit on disk with room for the workspace", () => {
    const [gemma] = modelsForHardware(MODEL_CATALOG, mac(32, 15));
    expect(gemma!.fitsOnDisk).toBe(false);
  });
});
