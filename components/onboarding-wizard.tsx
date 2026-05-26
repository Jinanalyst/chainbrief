"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { cn } from "@/lib/cn";
import {
  ANALYSIS_STYLES,
  EXPERIENCE_LEVELS,
  MARKET_INTERESTS,
  PREFERRED_POST_TYPES,
  PROFILE_ROLES,
  EMPTY_PROFILE,
  readProfile,
  type ChainBriefProfile,
} from "@/lib/chainbrief-profile";

type StepId = "welcome" | "interests" | "style" | "experience" | "postTypes" | "bio" | "review";

const STEPS: { id: StepId; label: string }[] = [
  { id: "welcome", label: "Welcome" },
  { id: "interests", label: "Markets" },
  { id: "style", label: "Style" },
  { id: "experience", label: "Experience" },
  { id: "postTypes", label: "Formats" },
  { id: "bio", label: "Bio" },
  { id: "review", label: "Review" },
];

export function OnboardingWizard() {
  const router = useRouter();
  const supabase = useMemo(() => (hasSupabaseConfig ? createClient() : null), []);
  const [user, setUser] = useState<User | null>(null);
  const [stepIdx, setStepIdx] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [profile, setProfile] = useState<ChainBriefProfile>(EMPTY_PROFILE);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      const u = data.user;
      setUser(u);
      if (u) {
        const existing = readProfile(u.user_metadata as Record<string, unknown>);
        const meta = (u.user_metadata ?? {}) as Record<string, unknown>;
        const fallbackName =
          (typeof meta.full_name === "string" && meta.full_name) ||
          (typeof meta.name === "string" && meta.name) ||
          (u.email ? u.email.split("@")[0] : "") ||
          "";
        setProfile({
          ...EMPTY_PROFILE,
          ...(existing ?? {}),
          displayName: existing?.displayName?.trim() || fallbackName,
        });
      }
      setIsLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, [supabase]);

  const step = STEPS[stepIdx];
  const progress = ((stepIdx + 1) / STEPS.length) * 100;

  function go(delta: 1 | -1) {
    setDirection(delta);
    setStepIdx((i) => Math.max(0, Math.min(STEPS.length - 1, i + delta)));
  }

  function toggleArray(key: "marketInterests" | "preferredPostTypes", value: string) {
    setProfile((p) => {
      const has = p[key].includes(value);
      return { ...p, [key]: has ? p[key].filter((v) => v !== value) : [...p[key], value] };
    });
  }

  function canAdvance(): boolean {
    switch (step.id) {
      case "welcome":
        return profile.displayName.trim().length > 0;
      case "interests":
        return profile.marketInterests.length > 0;
      case "style":
        return profile.analysisStyle.length > 0;
      case "experience":
        return profile.experienceLevel.length > 0;
      case "postTypes":
        return profile.preferredPostTypes.length > 0;
      case "bio":
        return profile.analystBio.trim().length >= 10;
      case "review":
        return true;
    }
  }

  async function finish() {
    if (!supabase || !user) return;
    setIsSaving(true);
    setError(null);

    const now = new Date().toISOString();
    const next: ChainBriefProfile = {
      ...profile,
      displayName: profile.displayName.trim(),
      analystBio: profile.analystBio.trim(),
      // Mirror the curated tags into the legacy `interests` field so existing
      // surfaces (community filters, profile chips) keep working.
      interests: Array.from(new Set([...profile.interests, ...profile.marketInterests])),
      // If the user hasn't set a public `bio` yet, seed it with the analyst bio.
      bio: profile.bio.trim() || profile.analystBio.trim(),
      // Default the role to "Analyst" when the user hasn't picked one yet —
      // onboarding is specifically about analyst-profile formation.
      role: profile.role || "Analyst",
      onboardedAt: profile.onboardedAt ?? now,
      updatedAt: now,
    };

    const { error: updateError } = await supabase.auth.updateUser({
      data: {
        ...(user.user_metadata ?? {}),
        full_name: next.displayName,
        chainBriefProfile: next,
      },
    });

    if (updateError) {
      setIsSaving(false);
      setError(updateError.message);
      return;
    }

    // Mirror bio to the profiles row so it's visible to other users.
    await supabase
      .from("profiles")
      .upsert({ id: user.id, bio: next.bio }, { onConflict: "id" });

    setIsSaving(false);
    router.push("/community");
    router.refresh();
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-muted">Loading your profile…</p>
      </div>
    );
  }

  if (!hasSupabaseConfig || !user) {
    return (
      <div className="mx-auto grid max-w-md gap-4 rounded-2xl border premium-border bg-surface/88 p-8 text-center shadow-soft backdrop-blur">
        <p className="text-lg font-semibold text-ink">Sign in to start onboarding.</p>
        <p className="text-sm leading-6 text-muted">
          Chain Brief uses your account to remember your analyst profile across sessions.
        </p>
        <Button href="/login">Log in with Google</Button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      {/* Progress bar */}
      <div className="mb-8 flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-tint/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-accent to-blue-400 transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="shrink-0 text-xs font-semibold uppercase tracking-[0.18em] text-muted">
          {stepIdx + 1} / {STEPS.length}
        </span>
      </div>

      {/* Step content with slide animation */}
      <div className="relative overflow-hidden">
        <div
          key={step.id}
          className={cn(
            "rounded-2xl border premium-border bg-surface/88 p-6 shadow-soft backdrop-blur sm:p-8",
            "animate-[onb_320ms_ease-out_both]",
            direction === 1 ? "[--onb-x:24px]" : "[--onb-x:-24px]",
          )}
        >
          {step.id === "welcome" && (
            <WelcomeStep
              displayName={profile.displayName}
              onChange={(v) => setProfile((p) => ({ ...p, displayName: v }))}
            />
          )}

          {step.id === "interests" && (
            <ChipsStep
              eyebrow="Step 2 of 7"
              title="What markets do you follow?"
              subtitle="Pick everything that interests you. You can change this later."
              options={MARKET_INTERESTS as readonly string[]}
              selected={profile.marketInterests}
              onToggle={(v) => toggleArray("marketInterests", v)}
            />
          )}

          {step.id === "style" && (
            <SingleChoiceStep
              eyebrow="Step 3 of 7"
              title="How would you describe your analysis style?"
              subtitle="This shapes how your posts get surfaced to readers."
              options={ANALYSIS_STYLES as readonly string[]}
              selected={profile.analysisStyle}
              onSelect={(v) => setProfile((p) => ({ ...p, analysisStyle: v }))}
            />
          )}

          {step.id === "experience" && (
            <SingleChoiceStep
              eyebrow="Step 4 of 7"
              title="What's your experience level?"
              subtitle="No wrong answer — we use this to calibrate suggestions."
              options={EXPERIENCE_LEVELS as readonly string[]}
              selected={profile.experienceLevel}
              onSelect={(v) => setProfile((p) => ({ ...p, experienceLevel: v }))}
              columns={2}
            />
          )}

          {step.id === "postTypes" && (
            <ChipsStep
              eyebrow="Step 5 of 7"
              title="What do you like to write?"
              subtitle="Pick the post formats you'd most like to publish."
              options={PREFERRED_POST_TYPES as readonly string[]}
              selected={profile.preferredPostTypes}
              onToggle={(v) => toggleArray("preferredPostTypes", v)}
            />
          )}

          {step.id === "bio" && (
            <BioStep
              value={profile.analystBio}
              onChange={(v) => setProfile((p) => ({ ...p, analystBio: v }))}
            />
          )}

          {step.id === "review" && (
            <ReviewStep profile={profile} onJump={(id) => setStepIdx(STEPS.findIndex((s) => s.id === id))} />
          )}
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-md border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </p>
      )}

      {/* Footer nav */}
      <div className="mt-6 flex items-center justify-between gap-3">
        <Button
          variant="ghost"
          onClick={() => go(-1)}
          disabled={stepIdx === 0}
          className={cn(stepIdx === 0 && "invisible")}
        >
          ← Back
        </Button>

        {step.id === "review" ? (
          <Button onClick={finish} disabled={isSaving}>
            {isSaving ? "Saving…" : "Finish & enter Chain Brief"}
          </Button>
        ) : (
          <Button onClick={() => go(1)} disabled={!canAdvance()}>
            Continue →
          </Button>
        )}
      </div>

    </div>
  );
}

// ─── Step components ──────────────────────────────────────────────────────────

function StepHeader({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">{eyebrow}</p>
      <h1 className="mt-2 text-2xl font-semibold leading-tight text-ink sm:text-3xl">{title}</h1>
      {subtitle && <p className="mt-2 text-sm leading-6 text-muted sm:text-base">{subtitle}</p>}
    </div>
  );
}

function WelcomeStep({ displayName, onChange }: { displayName: string; onChange: (v: string) => void }) {
  return (
    <>
      <StepHeader
        eyebrow="Step 1 of 7"
        title="Let's build your analyst profile."
        subtitle="A few quick questions so Chain Brief can match you with the right briefs and readers."
      />
      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
          What should we call you?
        </span>
        <input
          autoFocus
          value={displayName}
          onChange={(e) => onChange(e.target.value)}
          placeholder="e.g. Jin the On-chain Guy"
          className="mt-3 min-h-12 w-full rounded-xl border border-tint/10 bg-background px-4 text-base text-ink outline-none transition placeholder:text-muted-2 focus:border-accent focus:ring-2 focus:ring-accent/30"
        />
      </label>
      <p className="mt-3 text-xs leading-5 text-muted-2">
        This is the name shown on your posts. You can change it anytime in Profile settings.
      </p>
    </>
  );
}

function ChipsStep({
  eyebrow,
  title,
  subtitle,
  options,
  selected,
  onToggle,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  options: readonly string[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <>
      <StepHeader eyebrow={eyebrow} title={title} subtitle={subtitle} />
      <div className="flex flex-wrap gap-2.5">
        {options.map((opt) => {
          const active = selected.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onToggle(opt)}
              className={cn(
                "min-h-11 rounded-full border px-4 text-sm font-semibold transition",
                "focus:outline-none focus:ring-2 focus:ring-accent/40",
                active
                  ? "border-accent bg-accent/15 text-accent-ink shadow-[0_8px_24px_-12px_rgba(47,123,255,0.6)]"
                  : "border-tint/12 bg-tint/[0.04] text-muted hover:border-accent/40 hover:bg-tint/[0.08] hover:text-ink",
              )}
            >
              {active && <span className="mr-1.5 text-accent">✓</span>}
              {opt}
            </button>
          );
        })}
      </div>
      <p className="mt-5 text-xs text-muted-2">
        {selected.length === 0 ? "Select at least one." : `${selected.length} selected`}
      </p>
    </>
  );
}

function SingleChoiceStep({
  eyebrow,
  title,
  subtitle,
  options,
  selected,
  onSelect,
  columns = 1,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  options: readonly string[];
  selected: string;
  onSelect: (v: string) => void;
  columns?: 1 | 2;
}) {
  return (
    <>
      <StepHeader eyebrow={eyebrow} title={title} subtitle={subtitle} />
      <div className={cn("grid gap-3", columns === 2 ? "sm:grid-cols-2" : "grid-cols-1")}>
        {options.map((opt) => {
          const active = selected === opt;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onSelect(opt)}
              className={cn(
                "group flex items-center justify-between gap-3 rounded-xl border px-5 py-4 text-left transition",
                "focus:outline-none focus:ring-2 focus:ring-accent/40",
                active
                  ? "border-accent bg-accent/10 shadow-[0_12px_28px_-16px_rgba(47,123,255,0.6)]"
                  : "border-tint/12 bg-tint/[0.03] hover:border-accent/40 hover:bg-tint/[0.06]",
              )}
            >
              <span className={cn("text-base font-semibold", active ? "text-ink" : "text-muted group-hover:text-ink")}>
                {opt}
              </span>
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition",
                  active ? "border-accent bg-accent text-white" : "border-tint/20 bg-background text-transparent",
                )}
              >
                ✓
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}

function BioStep({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const remaining = 280 - value.length;
  return (
    <>
      <StepHeader
        eyebrow="Step 6 of 7"
        title="Tell readers who you are."
        subtitle="A short public bio that appears under your name on every post. 1–2 sentences is perfect."
      />
      <textarea
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, 280))}
        placeholder="e.g. On-chain researcher focused on ETH liquidity and stablecoin flows. I publish a weekly risk note."
        className="min-h-32 w-full rounded-xl border border-tint/10 bg-background px-4 py-3 text-sm leading-6 text-ink outline-none transition placeholder:text-muted-2 focus:border-accent focus:ring-2 focus:ring-accent/30"
      />
      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="text-muted-2">
          {value.trim().length < 10 ? "At least 10 characters." : "Looks good."}
        </span>
        <span className={cn("font-semibold", remaining < 20 ? "text-amber-300" : "text-muted-2")}>
          {remaining} left
        </span>
      </div>
    </>
  );
}

function ReviewStep({
  profile,
  onJump,
}: {
  profile: ChainBriefProfile;
  onJump: (id: StepId) => void;
}) {
  return (
    <>
      <StepHeader
        eyebrow="Step 7 of 7"
        title="Looks great. Ready to go?"
        subtitle="Here's how your analyst profile will start out. You can keep editing it anytime."
      />
      <div className="grid gap-3">
        <ReviewRow label="Display name" value={profile.displayName} onEdit={() => onJump("welcome")} />
        <ReviewRow
          label="Market interests"
          value={profile.marketInterests.join(", ") || "—"}
          onEdit={() => onJump("interests")}
        />
        <ReviewRow label="Analysis style" value={profile.analysisStyle || "—"} onEdit={() => onJump("style")} />
        <ReviewRow
          label="Experience"
          value={profile.experienceLevel || "—"}
          onEdit={() => onJump("experience")}
        />
        <ReviewRow
          label="Preferred formats"
          value={profile.preferredPostTypes.join(", ") || "—"}
          onEdit={() => onJump("postTypes")}
        />
        <ReviewRow label="Public bio" value={profile.analystBio || "—"} onEdit={() => onJump("bio")} multiline />
      </div>
    </>
  );
}

function ReviewRow({
  label,
  value,
  onEdit,
  multiline = false,
}: {
  label: string;
  value: string;
  onEdit: () => void;
  multiline?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-tint/10 bg-tint/[0.03] px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-2">{label}</p>
        <p
          className={cn(
            "mt-1 text-sm text-ink",
            multiline ? "whitespace-pre-wrap break-words leading-6" : "truncate",
          )}
        >
          {value}
        </p>
      </div>
      <button
        type="button"
        onClick={onEdit}
        className="shrink-0 text-xs font-semibold text-accent underline-offset-2 hover:underline"
      >
        Edit
      </button>
    </div>
  );
}

// Re-export role list so the profile editor can stay aligned. Kept here to
// avoid an unused-import warning in callers that only need one constant set.
export { PROFILE_ROLES };
