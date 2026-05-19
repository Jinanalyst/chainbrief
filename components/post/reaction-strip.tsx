"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

export type ReactionKind = "bullish" | "bearish" | "neutral" | "need_more_data";

type Props = {
  targetId: string;
  // Either /api/briefs/[id]/reaction or /api/posts/[id]/reaction (briefs supported now)
  endpoint: string;
  initial?: { reaction: ReactionKind; reasoning?: string | null } | null;
  onSubmitted?: (reaction: ReactionKind, reasoning: string) => void;
};

const OPTIONS: { value: ReactionKind; label: string; tone: string }[] = [
  { value: "bullish", label: "Bullish ▲", tone: "border-emerald-400/40 bg-emerald-400/10 text-emerald-200" },
  { value: "bearish", label: "Bearish ▼", tone: "border-rose-400/40 bg-rose-400/10 text-rose-200" },
  { value: "neutral", label: "Neutral", tone: "border-slate-400/40 bg-slate-400/10 text-slate-200" },
  { value: "need_more_data", label: "Need more data", tone: "border-amber-400/40 bg-amber-400/10 text-amber-200" },
];

// Bull/Bear/Neutral/Need-More-Data reaction picker with optional reasoning textarea.
// Persists to Supabase via the given endpoint.
export function ReactionStrip({ targetId, endpoint, initial, onSubmitted }: Props) {
  const [picked, setPicked] = useState<ReactionKind | null>(initial?.reaction ?? null);
  const [reasoning, setReasoning] = useState(initial?.reasoning ?? "");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(value: ReactionKind, reason: string) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reaction: value, reasoning: reason }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Failed to save reaction");
      }
      onSubmitted?.(value, reason);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  function onPick(value: ReactionKind) {
    setPicked(value);
    setOpen(true);
    void submit(value, reasoning);
  }

  return (
    <div className="space-y-2" data-target-id={targetId}>
      <div className="flex flex-wrap gap-2">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            disabled={saving}
            onClick={() => onPick(opt.value)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50",
              picked === opt.value
                ? opt.tone
                : "border-tint/10 bg-tint/[0.03] text-muted hover:border-accent/40 hover:text-ink",
            )}
            aria-pressed={picked === opt.value}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {open && picked ? (
        <div className="rounded-md border border-tint/10 bg-tint/[0.03] p-3">
          <label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-2">
            Why? (optional reasoning, risk, invalidation level…)
          </label>
          <textarea
            value={reasoning}
            onChange={(e) => setReasoning(e.target.value)}
            onBlur={() => picked && submit(picked, reasoning)}
            placeholder="e.g. Bullish — support holds; invalid below 60k; risk: macro CPI"
            className="mt-1 min-h-16 w-full rounded-md border border-tint/10 bg-background px-3 py-2 text-sm text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
            maxLength={1000}
          />
          <div className="mt-1 flex items-center justify-between text-[11px] text-muted-2">
            <span>{saving ? "Saving…" : "Saved on blur"}</span>
            <span>{reasoning.length}/1000</span>
          </div>
        </div>
      ) : null}
      {error ? <p className="text-[11px] text-rose-300">{error}</p> : null}
    </div>
  );
}
