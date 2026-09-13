"use client";

import { useActionState } from "react";

import {
  submitBetaInterest,
  type BetaInterestState,
} from "@/features/marketing/beta-interest";

const initialState: BetaInterestState = { status: "idle" };

function ErrorText({ messages }: { messages: string[] | undefined }) {
  return messages?.[0] ? (
    <span className="field-error">{messages[0]}</span>
  ) : null;
}

export function BetaForm() {
  const [state, action, pending] = useActionState(
    submitBetaInterest,
    initialState,
  );
  if (state.status === "success")
    return (
      <div className="form-success" role="status">
        {state.message}
      </div>
    );

  return (
    <form action={action} className="beta-form" noValidate>
      <div className="form-grid">
        <label>
          Name
          <input autoComplete="name" name="name" required maxLength={100} />
          <ErrorText messages={state.fieldErrors?.name} />
        </label>
        <label>
          Work email
          <input
            autoComplete="email"
            name="email"
            required
            type="email"
            maxLength={254}
          />
          <ErrorText messages={state.fieldErrors?.email} />
        </label>
        <label>
          Company or project
          <input
            autoComplete="organization"
            name="companyOrProject"
            required
            maxLength={160}
          />
          <ErrorText messages={state.fieldErrors?.companyOrProject} />
        </label>
        <label>
          Role
          <select name="role" required defaultValue="">
            <option disabled value="">
              Select a role
            </option>
            <option value="FOUNDER">Founder</option>
            <option value="MARKETING">Marketing team</option>
            <option value="AGENCY">Agency</option>
            <option value="CONSULTANT">Consultant</option>
            <option value="OTHER">Other</option>
          </select>
          <ErrorText messages={state.fieldErrors?.role} />
        </label>
      </div>
      <label>
        Primary content challenge
        <textarea name="primaryChallenge" required maxLength={1000} />
        <ErrorText messages={state.fieldErrors?.primaryChallenge} />
      </label>
      <label>
        Current tools <span>(optional)</span>
        <input name="currentTools" maxLength={500} />
        <ErrorText messages={state.fieldErrors?.currentTools} />
      </label>
      <label>
        Expected monthly usage
        <select name="expectedMonthlyUsage" required defaultValue="">
          <option disabled value="">
            Select a range
          </option>
          <option value="UNDER_20">Fewer than 20 content items</option>
          <option value="20_100">20–100 content items</option>
          <option value="101_500">101–500 content items</option>
          <option value="OVER_500">More than 500 content items</option>
          <option value="UNSURE">Not sure yet</option>
        </select>
        <ErrorText messages={state.fieldErrors?.expectedMonthlyUsage} />
      </label>
      <label className="checkbox">
        <input name="consent" type="checkbox" required />
        <span>
          I agree that Web Content Flow may use these details to evaluate and
          contact me about private-beta access.
        </span>
      </label>
      <ErrorText messages={state.fieldErrors?.consent} />
      <label aria-hidden style={{ position: "absolute", left: "-10000px" }}>
        Website
        <input autoComplete="off" name="website" tabIndex={-1} />
      </label>
      {state.status === "error" ? (
        <div className="form-error" role="alert">
          {state.message}
        </div>
      ) : null}
      <button className="marketing-button" disabled={pending} type="submit">
        {pending ? "Recording interest…" : "Request early access"}
      </button>
      <p className="support-note">
        Do not include passwords, API keys, confidential client data or full
        project content.
      </p>
    </form>
  );
}
