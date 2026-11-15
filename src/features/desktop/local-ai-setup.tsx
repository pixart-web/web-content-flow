"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

import type {
  DesktopAiOverview,
  DesktopEvaluationResult,
  DesktopModelOffer,
  WcfDesktopApi,
} from "@/desktop/shell/desktop-api";

declare global {
  interface Window {
    wcfDesktop?: WcfDesktopApi;
  }
}

const button =
  "rounded-control min-h-11 border px-4 text-sm font-semibold disabled:opacity-50";
const primary = `${button} border-transparent bg-[var(--color-action-primary,#4f46e5)] text-white`;
const secondary = `${button} border-strong bg-surface hover:bg-surface-subtle`;
const gb = (bytes: number) => `${(bytes / 1024 ** 3).toFixed(1)} GB`;

function ModelCard(props: {
  offer: DesktopModelOffer;
  api: WcfDesktopApi;
  active: boolean;
  onChange: () => void;
}) {
  const { offer, api } = props;
  const [accepted, setAccepted] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  const [result, setResult] = useState<DesktopEvaluationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(
    () =>
      api.onDownloadProgress((event) => {
        if (event.id === offer.id)
          setProgress(
            event.percent === null
              ? event.status
              : `${event.status} ${event.percent}%`,
          );
      }),
    [api, offer.id],
  );

  const run = async (action: () => Promise<unknown>) => {
    setError(null);
    try {
      await action();
    } catch (failure: unknown) {
      setError(failure instanceof Error ? failure.message : String(failure));
    }
  };

  return (
    <li className="border-default bg-surface rounded-card border p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-semibold">
          {offer.displayName}
          {offer.recommended ? (
            <span className="text-secondary ml-2 text-xs font-normal">
              Recommended
            </span>
          ) : null}
        </h3>
        <span className="text-secondary text-sm">
          {gb(offer.sizeBytes)} · {offer.license}
        </span>
      </div>
      <p className="text-secondary mt-2 text-sm">{offer.evaluationSummary}</p>
      {!offer.fitsOnDisk ? (
        <p className="mt-2 text-sm" role="alert">
          Not enough free disk space for this model and your workspace.
        </p>
      ) : null}

      {props.active ? (
        <p className="mt-4 text-sm font-semibold" role="status">
          Active on this computer.
        </p>
      ) : !offer.installed || !offer.digestMatches ? (
        <div className="mt-4 space-y-3">
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(event) => setAccepted(event.target.checked)}
            />
            <span>
              I accept the{" "}
              <button
                className="text-link underline"
                type="button"
                onClick={() => void api.openExternal(offer.licenseUrl)}
              >
                {offer.license} licence
              </button>{" "}
              of {offer.displayName}.
            </span>
          </label>
          <div className="flex flex-wrap gap-3">
            <button
              className={primary}
              disabled={!accepted || progress !== null || !offer.fitsOnDisk}
              onClick={() =>
                void run(async () => {
                  setProgress("Starting");
                  try {
                    await api.downloadModel(offer.id, accepted);
                  } finally {
                    setProgress(null);
                    props.onChange();
                  }
                })
              }
            >
              Download {gb(offer.sizeBytes)}
            </button>
            {progress !== null ? (
              <button
                className={secondary}
                onClick={() => void api.cancelDownload(offer.id)}
              >
                Cancel
              </button>
            ) : null}
          </div>
          {progress !== null ? (
            <p
              className="text-secondary text-sm"
              role="status"
              aria-live="polite"
            >
              {progress}
            </p>
          ) : null}
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <p className="text-secondary text-sm">
            Downloaded and verified. Check it on this computer before using it
            (about 3 to 5 minutes).
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              className={result?.approved ? secondary : primary}
              disabled={evaluating}
              onClick={() =>
                void run(async () => {
                  setEvaluating(true);
                  try {
                    setResult(await api.evaluateModel(offer.id));
                  } finally {
                    setEvaluating(false);
                  }
                })
              }
            >
              {evaluating ? "Checking…" : "Check on this computer"}
            </button>
            {result?.approved ? (
              <button
                className={primary}
                onClick={() => void run(() => api.activateModel(offer.id))}
              >
                Use this model (restarts the app)
              </button>
            ) : null}
          </div>
          {result ? (
            <div
              className="border-default bg-surface-subtle rounded-control border p-3 text-sm"
              role="status"
            >
              <p className="font-semibold">
                {result.approved ? "Passed" : "Did not pass"} in{" "}
                {Math.round(result.durationMs / 1000)} s.
              </p>
              {result.reasons.map((reason) => (
                <p key={reason}>{reason}</p>
              ))}
              {result.claimFlags.length > 0 ? (
                <p className="mt-2">
                  Review generated text carefully: the check flagged possibly
                  invented details (
                  {result.claimFlags.flatMap((flag) => flag.terms).join(", ")}).
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      )}
      {error ? (
        <p className="mt-3 text-sm" role="alert">
          {error}
        </p>
      ) : null}
    </li>
  );
}

export function LocalAiSetup() {
  // undefined while rendering on the server; null outside the desktop app.
  const api = useSyncExternalStore<WcfDesktopApi | null | undefined>(
    () => () => {},
    () => window.wcfDesktop ?? null,
    () => undefined,
  );
  const [overview, setOverview] = useState<DesktopAiOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (bridge: WcfDesktopApi) => {
    try {
      setOverview(await bridge.aiOverview());
    } catch (failure: unknown) {
      setError(failure instanceof Error ? failure.message : String(failure));
    }
  }, []);

  useEffect(() => {
    if (!api) return;
    let live = true;
    api
      .aiOverview()
      .then((next) => {
        if (live) setOverview(next);
      })
      .catch((failure: unknown) => {
        if (live)
          setError(
            failure instanceof Error ? failure.message : String(failure),
          );
      });
    return () => {
      live = false;
    };
  }, [api]);

  if (api === undefined) return null;
  if (api === null)
    return (
      <p className="text-secondary mt-6">
        Local AI runs in the Web Content Flow desktop app, on your own computer.
      </p>
    );
  if (!overview)
    return (
      <p className="text-secondary mt-6" role="status">
        {error ?? "Checking this computer…"}
      </p>
    );

  const { hardware, ollama } = overview;
  return (
    <div className="mt-6 space-y-6">
      <section className="border-default bg-surface rounded-panel border p-6">
        <h2 className="font-display text-xl font-semibold">This computer</h2>
        <p className="text-secondary mt-2 text-sm">
          {hardware.cpu} · {hardware.memoryGb} GB memory
          {hardware.freeDiskGb === null
            ? ""
            : ` · ${hardware.freeDiskGb} GB free`}{" "}
          · profile <strong>{hardware.profile}</strong>
        </p>
        {hardware.profile === "none" ? (
          <p className="mt-3 text-sm">
            This computer has less memory than local models need (16 GB).
            Generation stays in mock mode.
          </p>
        ) : null}
      </section>

      <section className="border-default bg-surface rounded-panel border p-6">
        <h2 className="font-display text-xl font-semibold">
          Model runtime (Ollama)
        </h2>
        {ollama.state === "running" ? (
          <p className="text-secondary mt-2 text-sm">
            Running, version {ollama.version}
            {ollama.supported ? "." : " — please update Ollama."}
          </p>
        ) : ollama.state === "installed" ? (
          <div className="mt-3 flex items-center gap-3">
            <p className="text-secondary text-sm">Installed but not running.</p>
            <button
              className={primary}
              onClick={() =>
                void api
                  .startOllama()
                  .then(setOverview)
                  .catch((e: Error) => setError(e.message))
              }
            >
              Start Ollama
            </button>
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            <p className="text-secondary text-sm">
              Local models run in Ollama, a free app. Install it, then come back
              here.
            </p>
            <button
              className={primary}
              onClick={() => void api.openExternal(ollama.downloadUrl)}
            >
              Get Ollama
            </button>
          </div>
        )}
      </section>

      {ollama.state === "running" && hardware.profile !== "none" ? (
        <section>
          <h2 className="font-display text-xl font-semibold">Models</h2>
          {overview.active ? (
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <p className="text-secondary text-sm">
                Generating with {overview.active.tag} on this computer.
              </p>
              <button
                className={secondary}
                onClick={() => void api.deactivateModel()}
              >
                Turn off local AI (restarts the app)
              </button>
            </div>
          ) : null}
          <ul className="mt-4 space-y-4">
            {overview.offers.map((offer) => (
              <ModelCard
                key={offer.id}
                api={api}
                offer={offer}
                active={overview.active?.catalogId === offer.id}
                onChange={() => void refresh(api)}
              />
            ))}
          </ul>
        </section>
      ) : null}
      {error ? (
        <p className="text-sm" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
