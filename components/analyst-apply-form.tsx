"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import {
  submitAnalystApplicationAction,
  type ApplicationFormState,
} from "@/lib/analyst-actions";

const EXPERTISE_OPTIONS = [
  "Bitcoin",
  "Ethereum",
  "Solana",
  "DeFi",
  "Macro",
  "Layer2",
] as const;

const EXPERIENCE_OPTIONS = [
  { value: "lt_1", label: "< 1 year" },
  { value: "1_3", label: "1 – 3 years" },
  { value: "3_5", label: "3 – 5 years" },
  { value: "5_plus", label: "5+ years" },
] as const;

const initialState: ApplicationFormState = {};

export function AnalystApplyForm({
  hasExistingApplication,
}: {
  hasExistingApplication: boolean;
}) {
  const [state, formAction, isPending] = useActionState(
    submitAnalystApplicationAction,
    initialState,
  );

  return (
    <form action={formAction} className="mt-6 grid gap-5">
      {/* Existing application notice */}
      {hasExistingApplication && (
        <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 py-3">
          <p className="text-sm leading-6 text-amber-100">
            You already have an application on record. Submitting this form will
            create a new one only if your previous application was rejected and
            the 30-day cooldown has passed.
          </p>
        </div>
      )}

      {/* Error banner */}
      {state.error && (
        <div className="rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3">
          <p className="text-sm font-semibold text-rose-200">
            ⚠ {state.error}
          </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
            Full name *
          </span>
          <input
            className="mt-2 min-h-11 w-full rounded-md border border-tint/10 bg-background px-4 text-sm text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30"
            name="full_name"
            required
            placeholder="Your legal or display name"
          />
        </label>

        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
            Twitter / X handle
          </span>
          <input
            className="mt-2 min-h-11 w-full rounded-md border border-tint/10 bg-background px-4 text-sm text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30"
            name="twitter_handle"
            placeholder="@yourhandle"
          />
        </label>
      </div>

      <fieldset className="grid gap-3">
        <legend className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
          Expertise areas * <span className="normal-case text-muted-2">(pick at least one)</span>
        </legend>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {EXPERTISE_OPTIONS.map((item) => (
            <label
              key={item}
              className="flex cursor-pointer items-center gap-3 rounded-xl border border-tint/10 bg-tint/[0.03] px-4 py-3 text-sm text-ink transition hover:border-accent/40 hover:bg-tint/[0.05]"
            >
              <input
                className="accent-blue-400"
                name="expertise_areas"
                type="checkbox"
                value={item}
              />
              <span>{item}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
          Years of experience *
        </span>
        <select
          className="mt-2 min-h-11 w-full rounded-md border border-tint/10 bg-background px-4 text-sm text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30"
          name="experience_years"
          defaultValue="lt_1"
        >
          {EXPERIENCE_OPTIONS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
          Short bio * <span className="normal-case text-muted-2">(max 300 chars)</span>
        </span>
        <textarea
          className="mt-2 min-h-28 w-full rounded-md border border-tint/10 bg-background px-4 py-3 text-sm text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30"
          maxLength={300}
          name="bio"
          required
          placeholder="Who you are and how you approach market analysis."
        />
      </label>

      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
          Sample analysis link *
        </span>
        <input
          className="mt-2 min-h-11 w-full rounded-md border border-tint/10 bg-background px-4 text-sm text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30"
          name="sample_link"
          required
          type="url"
          placeholder="https://your-post-or-thread"
        />
      </label>

      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
          Motivation * <span className="normal-case text-muted-2">(max 500 chars)</span>
        </span>
        <textarea
          className="mt-2 min-h-32 w-full rounded-md border border-tint/10 bg-background px-4 py-3 text-sm text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30"
          maxLength={500}
          name="motivation"
          required
          placeholder="Why do you want to become a Verified Analyst on Chain Brief?"
        />
      </label>

      {/* Disclaimer agreement */}
      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-tint/10 bg-tint/[0.03] px-4 py-3">
        <input
          required
          className="mt-1 accent-blue-400"
          name="disclaimer_agreed"
          type="checkbox"
        />
        <span className="text-xs leading-5 text-muted">
          I confirm this content is for informational purposes only and not
          financial advice. I will not provide 1:1 buy/sell instructions,
          guaranteed returns, or principal protection.
        </span>
      </label>

      <Button disabled={isPending} type="submit">
        {isPending ? "Submitting…" : "Submit application"}
      </Button>
    </form>
  );
}
