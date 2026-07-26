"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  WebsiteGenerationRequestSchema,
  type WebsiteGenerationRequest,
} from "@/domain/website/website-schemas";

import {
  configureWebsiteAction,
  generateWebsiteAction,
} from "./website-actions";

const pages = [
  "HOME",
  "ABOUT",
  "SERVICES",
  "PRODUCTS",
  "CONTACT",
  "FAQ",
  "PRICING",
  "TESTIMONIALS",
] as const;

export function WebsiteSetupForm({
  projectId,
  initial,
}: {
  projectId: string;
  initial?: WebsiteGenerationRequest;
}) {
  const [selectedPages, setSelectedPages] = useState<string[]>(
    initial?.selectedPages ?? ["HOME", "ABOUT", "SERVICES", "CONTACT"],
  );
  const [message, setMessage] = useState<string>();
  const [customPage, setCustomPage] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <form
      className="border-default bg-surface rounded-panel space-y-5 border p-5 sm:p-6"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const request = WebsiteGenerationRequestSchema.safeParse({
          schemaVersion: "1.0",
          websiteObjective: data.get("websiteObjective"),
          websiteType: data.get("websiteType"),
          selectedPages,
          additionalPages: customPage
            ? [
                {
                  key: `custom-${String(data.get("customPageName") ?? "")
                    .trim()
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, "-")
                    .replace(/^-|-$/g, "")}`,
                  name: data.get("customPageName"),
                  purpose: data.get("customPagePurpose"),
                },
              ]
            : [],
          primaryConversionAction: data.get("primaryConversionAction"),
          seoFocus: data.get("seoFocus") || undefined,
          notes: data.get("notes") || undefined,
          mockScenario: data.get("mockScenario"),
        });
        if (!request.success) {
          setMessage(
            request.error.issues[0]?.message ?? "Check the Website setup.",
          );
          return;
        }
        startTransition(async () => {
          const saved = await configureWebsiteAction(projectId, request.data);
          if (!saved.ok) {
            setMessage(saved.error.message);
            return;
          }
          const queued = await generateWebsiteAction(projectId);
          setMessage(
            queued.ok
              ? "Website generation queued. You can continue working."
              : queued.error.message,
          );
          router.refresh();
        });
      }}
    >
      <div>
        <h2 className="font-display text-xl font-semibold">Website setup</h2>
        <p className="text-secondary mt-2 text-sm">
          Choose the pages and outcome. Each page will become an editable
          content item.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-semibold">
          Website objective
          <textarea
            className="border-default rounded-control mt-1 min-h-28 w-full border p-3 font-normal"
            defaultValue={initial?.websiteObjective}
            name="websiteObjective"
            required
          />
        </label>
        <div className="grid gap-4">
          <label className="text-sm font-semibold">
            Website type
            <select
              className="border-default rounded-control mt-1 min-h-11 w-full border px-3 font-normal"
              defaultValue={initial?.websiteType ?? "BUSINESS"}
              name="websiteType"
            >
              {[
                "BUSINESS",
                "SERVICE",
                "PORTFOLIO",
                "ECOMMERCE",
                "LANDING_PAGE",
                "OTHER",
              ].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <label className="text-sm font-semibold">
            Primary conversion action
            <input
              className="border-default rounded-control mt-1 min-h-11 w-full border px-3 font-normal"
              defaultValue={initial?.primaryConversionAction}
              name="primaryConversionAction"
              required
            />
          </label>
        </div>
      </div>
      <fieldset>
        <legend className="text-sm font-semibold">Pages</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {pages.map((page) => (
            <label
              className="border-default rounded-control flex min-h-11 items-center gap-2 border px-3 text-sm"
              key={page}
            >
              <input
                checked={selectedPages.includes(page)}
                onChange={(event) =>
                  setSelectedPages((current) =>
                    event.target.checked
                      ? [...current, page]
                      : current.filter((value) => value !== page),
                  )
                }
                type="checkbox"
              />
              {page.charAt(0) + page.slice(1).toLowerCase()}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="border-default rounded-card border p-4">
        <legend className="px-1 text-sm font-semibold">
          Custom page, optional
        </legend>
        <label className="mt-2 flex min-h-11 items-center gap-2 text-sm">
          <input
            checked={customPage}
            onChange={(event) => setCustomPage(event.target.checked)}
            type="checkbox"
          />
          Add one custom page
        </label>
        {customPage ? (
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold">
              Custom page name
              <input
                className="border-default rounded-control mt-1 min-h-11 w-full border px-3 font-normal"
                name="customPageName"
                required
              />
            </label>
            <label className="text-sm font-semibold">
              Custom page purpose
              <textarea
                className="border-default rounded-control mt-1 min-h-20 w-full border p-3 font-normal"
                name="customPagePurpose"
                required
              />
            </label>
          </div>
        ) : null}
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-semibold">
          SEO focus, optional
          <input
            className="border-default rounded-control mt-1 min-h-11 w-full border px-3 font-normal"
            defaultValue={initial?.seoFocus}
            name="seoFocus"
          />
        </label>
        <label className="text-sm font-semibold">
          Mock scenario
          <select
            className="border-default rounded-control mt-1 min-h-11 w-full border px-3 font-normal"
            defaultValue={initial?.mockScenario ?? "success"}
            name="mockScenario"
          >
            <option value="success">Success</option>
            <option value="one-page-failure">One-page failure</option>
            <option value="invalid-services-page">
              Invalid Services output
            </option>
            <option value="timeout-home-page">Home timeout</option>
          </select>
        </label>
      </div>
      <label className="block text-sm font-semibold">
        Notes, optional
        <textarea
          className="border-default rounded-control mt-1 min-h-20 w-full border p-3 font-normal"
          defaultValue={initial?.notes}
          name="notes"
        />
      </label>
      {message ? (
        <p
          role="status"
          className="bg-surface-subtle rounded-control p-3 text-sm"
        >
          {message}
        </p>
      ) : null}
      <button
        className="bg-action-primary text-inverse rounded-control min-h-11 px-4 text-sm font-semibold"
        disabled={pending}
        type="submit"
      >
        {pending ? "Preparing generation…" : "Save setup and generate website"}
      </button>
    </form>
  );
}
