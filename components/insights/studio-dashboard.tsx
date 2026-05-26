"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  INSIGHT_CATEGORIES,
  type Insight,
  type InsightCategory,
} from "@/lib/insights";

type Props = {
  initialInsights: Insight[];
};

function formatDate(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export function StudioDashboard({ initialInsights }: Props) {
  const router = useRouter();
  const [items, setItems] = useState<Insight[]>(initialInsights);
  const [filter, setFilter] = useState<InsightCategory | "all">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "draft" | "published">("all");
  const [creating, setCreating] = useState(false);
  const [newCategory, setNewCategory] = useState<InsightCategory>("macro");
  const [error, setError] = useState<string | null>(null);

  const visible = items.filter((item) => {
    if (filter !== "all" && item.category !== filter) return false;
    if (statusFilter !== "all" && item.status !== statusFilter) return false;
    return true;
  });

  async function createNew() {
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/insights", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: "Untitled insight",
          category: newCategory,
        }),
      });
      const payload = await res.json();
      if (!res.ok) {
        setError(payload.error ?? "could not create");
        return;
      }
      router.push(`/insights/studio/${payload.insight.id}`);
    } finally {
      setCreating(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this insight permanently?")) return;
    const res = await fetch(`/api/insights/${id}`, { method: "DELETE" });
    if (res.ok) {
      setItems((current) => current.filter((it) => it.id !== id));
    } else {
      const payload = await res.json().catch(() => ({}));
      setError(payload.error ?? "could not delete");
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-accent">
            Writing studio
          </p>
          <h1 className="text-2xl font-bold text-ink sm:text-3xl">Your insights</h1>
          <p className="mt-1 text-sm text-muted">
            Draft, edit, and publish to chainbrief.kr/insights.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value as InsightCategory)}
            className="min-h-11 rounded-md border border-tint/15 bg-tint/[0.04] px-3 text-sm text-ink"
          >
            {INSIGHT_CATEGORIES.map((c) => (
              <option value={c.value} key={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <Button onClick={createNew} disabled={creating} type="button">
            {creating ? "Creating…" : "New insight"}
          </Button>
        </div>
      </div>

      {error ? (
        <div className="mb-4 rounded-md border border-red-400/40 bg-red-400/10 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      ) : null}

      <div className="mb-4 flex flex-wrap gap-2">
        {(["all", ...INSIGHT_CATEGORIES.map((c) => c.value)] as const).map((value) => {
          const label =
            value === "all"
              ? "All categories"
              : INSIGHT_CATEGORIES.find((c) => c.value === value)?.label ?? value;
          const active = filter === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value as InsightCategory | "all")}
              className={
                "rounded-full border px-3 py-1 text-xs font-semibold transition " +
                (active
                  ? "border-accent bg-accent text-white"
                  : "border-tint/15 bg-tint/[0.04] text-muted hover:text-ink")
              }
            >
              {label}
            </button>
          );
        })}
        <span className="mx-1 h-6 w-px bg-tint/15" />
        {(["all", "draft", "published"] as const).map((value) => {
          const active = statusFilter === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => setStatusFilter(value)}
              className={
                "rounded-full border px-3 py-1 text-xs font-semibold transition " +
                (active
                  ? "border-accent bg-accent text-white"
                  : "border-tint/15 bg-tint/[0.04] text-muted hover:text-ink")
              }
            >
              {value === "all" ? "All status" : value}
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <div className="rounded-lg border border-dashed border-tint/20 bg-tint/[0.03] p-10 text-center text-sm text-muted">
          Nothing here yet. Click <strong>New insight</strong> to start writing.
        </div>
      ) : (
        <ul className="grid gap-2">
          {visible.map((item) => (
            <li
              key={item.id}
              className="flex flex-col gap-2 rounded-lg border border-tint/10 bg-tint/[0.03] p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-accent">
                  <span>
                    {INSIGHT_CATEGORIES.find((c) => c.value === item.category)?.label ??
                      item.category}
                  </span>
                  <span
                    className={
                      "rounded-full px-2 py-0.5 text-[10px] " +
                      (item.status === "published"
                        ? "bg-green-500/15 text-green-400"
                        : "bg-tint/10 text-muted")
                    }
                  >
                    {item.status}
                  </span>
                  <span className="text-muted">·</span>
                  <span className="text-muted">Updated {formatDate(item.updated_at)}</span>
                </div>
                <h2 className="mt-1 truncate text-base font-bold text-ink">{item.title}</h2>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {item.status === "published" ? (
                  <Link
                    href={`/insights/${item.slug}`}
                    className="text-xs font-semibold text-muted hover:text-ink"
                    target="_blank"
                  >
                    View ↗
                  </Link>
                ) : null}
                <Button href={`/insights/studio/${item.id}`} variant="secondary" className="px-3 py-2 text-xs">
                  Edit
                </Button>
                <button
                  type="button"
                  onClick={() => remove(item.id)}
                  className="rounded-md border border-tint/15 px-3 py-2 text-xs font-semibold text-muted hover:border-red-400/40 hover:text-red-400"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
