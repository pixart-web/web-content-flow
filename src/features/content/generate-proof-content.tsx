"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { generateFoundationCopyAction } from "./content-actions";

export function GenerateProofContent({ projectId }: { projectId: string }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string>();
  const router = useRouter();
  return (
    <div>
      <button
        className="bg-action-primary text-inverse rounded-control min-h-11 px-4 text-sm font-semibold"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await generateFoundationCopyAction(projectId);
            setMessage(
              result.ok
                ? "Foundation copy generation queued in mock mode."
                : result.error.message,
            );
            if (result.ok) router.refresh();
          })
        }
        type="button"
      >
        {pending ? "Queueing…" : "Generate foundation copy"}
      </button>
      {message ? (
        <p className="text-secondary mt-2 text-sm" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
