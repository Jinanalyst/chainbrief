"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  INSIGHT_CATEGORIES,
  type Insight,
  type InsightCategory,
} from "@/lib/insights";
import { renderMarkdown } from "@/lib/markdown";

type Props = {
  initialInsight: Insight;
};

type SaveState = "idle" | "saving" | "saved" | "error";

type Draft = {
  title: string;
  excerpt: string;
  body: string;
  category: InsightCategory;
  cover_image_url: string;
};

function toDraft(insight: Insight): Draft {
  return {
    title: insight.title,
    excerpt: insight.excerpt ?? "",
    body: insight.body ?? "",
    category: insight.category,
    cover_image_url: insight.cover_image_url ?? "",
  };
}

export function StudioEditor({ initialInsight }: Props) {
  const router = useRouter();
  const [insight, setInsight] = useState<Insight>(initialInsight);
  const [draft, setDraft] = useState<Draft>(() => toDraft(initialInsight));
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const lastSavedSerialised = useRef(JSON.stringify(toDraft(initialInsight)));
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const dirty = useMemo(
    () => JSON.stringify(draft) !== lastSavedSerialised.current,
    [draft],
  );

  const persist = useCallback(
    async (overrides: Partial<Draft & { status: "draft" | "published" }> = {}) => {
      setSaveState("saving");
      setError(null);
      const payload = {
        title: overrides.title ?? draft.title,
        excerpt: overrides.excerpt ?? draft.excerpt,
        body: overrides.body ?? draft.body,
        category: overrides.category ?? draft.category,
        cover_image_url: overrides.cover_image_url ?? draft.cover_image_url,
        status: overrides.status,
      };
      const res = await fetch(`/api/insights/${insight.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSaveState("error");
        setError(json.error ?? "could not save");
        return null;
      }
      const updated = json.insight as Insight;
      setInsight(updated);
      const nextDraft = toDraft(updated);
      lastSavedSerialised.current = JSON.stringify(nextDraft);
      setSaveState("saved");
      return updated;
    },
    [draft, insight.id],
  );

  // Debounced autosave whenever the draft changes.
  useEffect(() => {
    if (!dirty) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaveState("idle");
    saveTimer.current = setTimeout(() => {
      void persist();
    }, 1200);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [draft, dirty, persist]);

  // Warn on page exit while a save is in flight.
  useEffect(() => {
    function beforeUnload(e: BeforeUnloadEvent) {
      if (dirty || saveState === "saving") {
        e.preventDefault();
        e.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [dirty, saveState]);

  async function togglePublish() {
    // Flush in-flight edits first.
    const flushed = await persist();
    if (!flushed) return;
    const nextStatus = flushed.status === "published" ? "draft" : "published";
    await persist({ status: nextStatus });
  }

  async function remove() {
    if (!confirm("Delete this insight permanently?")) return;
    const res = await fetch(`/api/insights/${insight.id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/insights/studio");
    } else {
      const payload = await res.json().catch(() => ({}));
      setError(payload.error ?? "could not delete");
    }
  }

  function insertMarkdown(prefix: string, suffix: string = prefix) {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = draft.body.slice(start, end);
    const next = draft.body.slice(0, start) + prefix + selected + suffix + draft.body.slice(end);
    setDraft((d) => ({ ...d, body: next }));
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(start + prefix.length, end + prefix.length);
    });
  }

  const previewHtml = useMemo(() => renderMarkdown(draft.body), [draft.body]);
  const isPublished = insight.status === "published";

  const statusLabel: Record<SaveState, string> = {
    idle: dirty ? "Unsaved" : "Up to date",
    saving: "Saving…",
    saved: "Saved",
    error: "Save failed",
  };

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/insights/studio"
            className="text-xs font-semibold text-muted hover:text-ink"
          >
            ← Studio
          </Link>
          <span
            className={
              "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest " +
              (isPublished
                ? "bg-green-500/15 text-green-400"
                : "bg-tint/10 text-muted")
            }
          >
            {insight.status}
          </span>
          <span className="text-xs text-muted">{statusLabel[saveState]}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPreview((s) => !s)}
            className="min-h-10 rounded-md border border-tint/15 bg-tint/[0.04] px-3 text-xs font-semibold text-ink hover:border-accent/50"
          >
            {showPreview ? "Edit" : "Preview"}
          </button>
          {isPublished ? (
            <Link
              href={`/insights/${insight.slug}`}
              target="_blank"
              className="min-h-10 rounded-md border border-tint/15 bg-tint/[0.04] px-3 py-2.5 text-xs font-semibold text-ink hover:border-accent/50"
            >
              View ↗
            </Link>
          ) : null}
          <Button onClick={togglePublish} type="button" variant={isPublished ? "secondary" : "primary"}>
            {isPublished ? "Unpublish" : "Publish"}
          </Button>
        </div>
      </div>

      {error ? (
        <div className="mb-4 rounded-md border border-red-400/40 bg-red-400/10 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
        <div className="flex min-w-0 flex-col gap-3">
          <input
            value={draft.title}
            onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
            placeholder="Title"
            className="w-full rounded-md border border-tint/10 bg-transparent px-3 py-3 text-2xl font-bold text-ink outline-none focus:border-accent/50"
          />
          <textarea
            value={draft.excerpt}
            onChange={(e) => setDraft((d) => ({ ...d, excerpt: e.target.value }))}
            placeholder="One-line excerpt shown on the listing page"
            rows={2}
            className="w-full resize-none rounded-md border border-tint/10 bg-transparent px-3 py-2 text-sm text-muted outline-none focus:border-accent/50"
          />

          {!showPreview ? (
            <>
              <div className="flex flex-wrap items-center gap-1 rounded-md border border-tint/10 bg-tint/[0.03] p-1 text-xs font-semibold text-muted">
                <ToolbarButton onClick={() => insertMarkdown("**")}>B</ToolbarButton>
                <ToolbarButton onClick={() => insertMarkdown("_")}><em>I</em></ToolbarButton>
                <ToolbarButton onClick={() => insertMarkdown("`")}>{"<>"}</ToolbarButton>
                <span className="mx-1 h-5 w-px bg-tint/15" />
                <ToolbarButton onClick={() => insertMarkdown("\n## ", "")}>H2</ToolbarButton>
                <ToolbarButton onClick={() => insertMarkdown("\n### ", "")}>H3</ToolbarButton>
                <ToolbarButton onClick={() => insertMarkdown("\n- ", "")}>List</ToolbarButton>
                <ToolbarButton onClick={() => insertMarkdown("\n> ", "")}>Quote</ToolbarButton>
                <ToolbarButton onClick={() => insertMarkdown("\n```\n", "\n```\n")}>Code</ToolbarButton>
                <ToolbarButton onClick={() => insertMarkdown("[", "](https://)")}>Link</ToolbarButton>
                <ToolbarButton onClick={() => insertMarkdown("\n![alt](", ")\n")}>Image</ToolbarButton>
              </div>

              <textarea
                ref={textareaRef}
                value={draft.body}
                onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
                placeholder="Write your insight in markdown… ideas, charts, calls."
                className="min-h-[60vh] w-full resize-y rounded-md border border-tint/10 bg-transparent px-4 py-4 font-mono text-sm leading-6 text-ink outline-none focus:border-accent/50"
              />
            </>
          ) : (
            <div className="min-h-[60vh] rounded-md border border-tint/10 bg-tint/[0.02] p-6">
              <h1 className="text-2xl font-bold text-ink">{draft.title || "Untitled"}</h1>
              {draft.excerpt ? <p className="mt-2 text-base text-muted">{draft.excerpt}</p> : null}
              <article
                className="prose-insight mt-6 text-[15px] leading-7 text-ink"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            </div>
          )}
        </div>

        <aside className="flex h-fit flex-col gap-4 rounded-lg border border-tint/10 bg-tint/[0.03] p-4 text-sm">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-muted">
              Category
            </label>
            <select
              value={draft.category}
              onChange={(e) =>
                setDraft((d) => ({ ...d, category: e.target.value as InsightCategory }))
              }
              className="w-full rounded-md border border-tint/15 bg-tint/[0.04] px-3 py-2 text-sm text-ink"
            >
              {INSIGHT_CATEGORIES.map((c) => (
                <option value={c.value} key={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-muted">
              Cover image URL
            </label>
            <input
              value={draft.cover_image_url}
              onChange={(e) => setDraft((d) => ({ ...d, cover_image_url: e.target.value }))}
              placeholder="https://…"
              className="w-full rounded-md border border-tint/15 bg-tint/[0.04] px-3 py-2 text-sm text-ink"
            />
            {draft.cover_image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={draft.cover_image_url}
                alt=""
                className="mt-2 aspect-[16/9] w-full rounded-md object-cover"
              />
            ) : null}
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-muted">
              Slug
            </label>
            <div className="break-all rounded-md border border-tint/10 bg-tint/[0.02] px-3 py-2 text-xs text-muted">
              /insights/{insight.slug}
            </div>
          </div>
          <button
            type="button"
            onClick={remove}
            className="mt-2 rounded-md border border-tint/15 px-3 py-2 text-xs font-semibold text-muted hover:border-red-400/40 hover:text-red-400"
          >
            Delete insight
          </button>
        </aside>
      </div>
    </div>
  );
}

function ToolbarButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded px-2 py-1 text-ink hover:bg-tint/[0.08]"
    >
      {children}
    </button>
  );
}
