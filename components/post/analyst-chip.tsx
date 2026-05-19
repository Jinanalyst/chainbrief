"use client";

import { cn } from "@/lib/cn";

export type AnalystTier = "rookie_analyst" | "rising_analyst" | "verified_analyst" | "partner_expert" | "user";

const TIER_LABEL: Record<AnalystTier, string> = {
  user: "User",
  rookie_analyst: "Rookie Analyst",
  rising_analyst: "Rising Analyst",
  verified_analyst: "Verified Analyst",
  partner_expert: "Partner Expert",
};

const TIER_TONE: Record<AnalystTier, string> = {
  user: "border-tint/10 bg-tint/[0.04] text-muted",
  rookie_analyst: "border-slate-400/30 bg-slate-400/10 text-slate-200",
  rising_analyst: "border-sky-400/40 bg-sky-400/10 text-sky-200",
  verified_analyst: "border-emerald-400/40 bg-emerald-400/10 text-emerald-200",
  partner_expert: "border-amber-400/40 bg-amber-400/10 text-amber-200",
};

export function AnalystChip({
  tier,
  score,
  compact = false,
}: {
  tier: AnalystTier;
  score?: number | null;
  compact?: boolean;
}) {
  const t = tier ?? "user";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-semibold",
        compact ? "text-[10px]" : "text-[11px]",
        TIER_TONE[t],
      )}
      title={`${TIER_LABEL[t]}${typeof score === "number" ? ` · score ${score}` : ""}`}
    >
      <span>{TIER_LABEL[t]}</span>
      {typeof score === "number" ? (
        <span className="rounded-full bg-black/30 px-1.5 py-[1px] text-[10px] text-white">{score}</span>
      ) : null}
    </span>
  );
}

export function classifyTier(score: number): AnalystTier {
  if (score >= 75) return "verified_analyst";
  if (score >= 40) return "rising_analyst";
  return "rookie_analyst";
}

export function tierLabel(tier: AnalystTier) {
  return TIER_LABEL[tier];
}
