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
import { looksLikeHtml, sanitizeHtml } from "@/lib/sanitize-html";
import { renderMarkdown } from "@/lib/markdown";

type Props = {
  initialInsight: Insight;
};

type SaveState = "idle" | "saving" | "saved" | "error";

type Draft = {
  title: string;
  excerpt: string;
  body: string; // HTML
  category: InsightCategory;
  cover_image_url: string;
};

function toDraft(insight: Insight): Draft {
  // If body is legacy markdown (no leading tag), pre-render it to HTML so the
  // WYSIWYG surface displays it correctly.
  const body = insight.body ?? "";
  const html = looksLikeHtml(body) ? body : renderMarkdown(body);
  return {
    title: insight.title,
    excerpt: insight.excerpt ?? "",
    body: html,
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
  const [uploading, setUploading] = useState(false);

  const lastSavedSerialised = useRef(JSON.stringify(toDraft(initialInsight)));
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const dirty = useMemo(
    () => JSON.stringify(draft) !== lastSavedSerialised.current,
    [draft],
  );

  // Initialise contentEditable surface once with the stored HTML.
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML === "") {
      editorRef.current.innerHTML = draft.body;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      // Don't bounce server-returned body back into the contentEditable —
      // doing so would steal cursor focus mid-typing. Just sync the saved
      // marker.
      lastSavedSerialised.current = JSON.stringify({
        title: updated.title,
        excerpt: updated.excerpt ?? "",
        body: updated.body ?? "",
        category: updated.category,
        cover_image_url: updated.cover_image_url ?? "",
      });
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
    }, 1500);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [draft, dirty, persist]);

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

  function readHtmlFromEditor() {
    if (!editorRef.current) return;
    const html = sanitizeHtml(editorRef.current.innerHTML);
    setDraft((d) => (d.body === html ? d : { ...d, body: html }));
  }

  function exec(command: string, value?: string) {
    editorRef.current?.focus();
    // document.execCommand is deprecated but remains the simplest cross-browser
    // way to drive contentEditable formatting; libraries replicate this.
    document.execCommand(command, false, value);
    readHtmlFromEditor();
  }

  function formatBlock(tag: string) {
    exec("formatBlock", `<${tag}>`);
  }

  function insertLink() {
    const url = window.prompt("Link URL", "https://");
    if (!url) return;
    exec("createLink", url);
  }

  function insertHtmlAtCaret(html: string) {
    editorRef.current?.focus();
    document.execCommand("insertHTML", false, html);
    readHtmlFromEditor();
  }

  async function uploadFile(file: File): Promise<{ url: string; kind: "image" | "video" } | null> {
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/insights/upload", { method: "POST", body: fd });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "upload failed");
        return null;
      }
      return { url: json.url as string, kind: json.kind as "image" | "video" };
    } finally {
      setUploading(false);
    }
  }

  async function handleImagePicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const result = await uploadFile(file);
    if (!result) return;
    insertHtmlAtCaret(
      `<p><img src="${result.url}" alt="" style="max-width:100%;border-radius:8px" loading="lazy" /></p><p><br/></p>`,
    );
  }

  async function handleVideoPicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const result = await uploadFile(file);
    if (!result) return;
    insertHtmlAtCaret(
      `<p><video controls src="${result.url}" style="max-width:100%;border-radius:8px"></video></p><p><br/></p>`,
    );
  }

  async function togglePublish() {
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
          <span className="text-xs text-muted">
            {statusLabel[saveState]}
            {uploading ? " · uploading…" : ""}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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

          <div className="flex flex-wrap items-center gap-1 rounded-md border border-tint/10 bg-tint/[0.03] p-1 text-xs font-semibold text-ink">
            <ToolbarButton onClick={() => exec("bold")} title="Bold (Ctrl+B)">
              <span className="font-bold">B</span>
            </ToolbarButton>
            <ToolbarButton onClick={() => exec("italic")} title="Italic (Ctrl+I)">
              <em>I</em>
            </ToolbarButton>
            <ToolbarButton onClick={() => exec("underline")} title="Underline">
              <span className="underline">U</span>
            </ToolbarButton>
            <span className="mx-1 h-5 w-px bg-tint/15" />
            <ToolbarButton onClick={() => formatBlock("h2")} title="Heading 2">H2</ToolbarButton>
            <ToolbarButton onClick={() => formatBlock("h3")} title="Heading 3">H3</ToolbarButton>
            <ToolbarButton onClick={() => formatBlock("p")} title="Paragraph">¶</ToolbarButton>
            <span className="mx-1 h-5 w-px bg-tint/15" />
            <ToolbarButton onClick={() => exec("insertUnorderedList")} title="Bulleted list">• List</ToolbarButton>
            <ToolbarButton onClick={() => exec("insertOrderedList")} title="Numbered list">1. List</ToolbarButton>
            <ToolbarButton onClick={() => formatBlock("blockquote")} title="Quote">❝</ToolbarButton>
            <span className="mx-1 h-5 w-px bg-tint/15" />
            <ToolbarButton onClick={insertLink} title="Link">🔗 Link</ToolbarButton>
            <ToolbarButton
              onClick={() => imageInputRef.current?.click()}
              title="Upload image"
              disabled={uploading}
            >
              🖼 Image
            </ToolbarButton>
            <ToolbarButton
              onClick={() => videoInputRef.current?.click()}
              title="Upload video"
              disabled={uploading}
            >
              🎬 Video
            </ToolbarButton>
            <span className="mx-1 h-5 w-px bg-tint/15" />
            <ToolbarButton onClick={() => exec("removeFormat")} title="Clear formatting">Clear</ToolbarButton>
          </div>

          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={handleImagePicked}
          />
          <input
            ref={videoInputRef}
            type="file"
            accept="video/*"
            hidden
            onChange={handleVideoPicked}
          />

          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onInput={readHtmlFromEditor}
            onBlur={readHtmlFromEditor}
            data-placeholder="Start writing your insight…"
            className="insights-editor min-h-[60vh] rounded-md border border-tint/10 bg-transparent px-5 py-5 text-[15px] leading-7 text-ink outline-none focus:border-accent/50"
          />
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
              Cover image
            </label>
            <input
              value={draft.cover_image_url}
              onChange={(e) => setDraft((d) => ({ ...d, cover_image_url: e.target.value }))}
              placeholder="Paste a URL, or use Image button in toolbar"
              className="w-full rounded-md border border-tint/15 bg-tint/[0.04] px-3 py-2 text-sm text-ink"
            />
            <button
              type="button"
              onClick={async () => {
                imageInputRef.current?.click();
              }}
              className="mt-2 text-xs font-semibold text-accent hover:underline"
            >
              Upload via toolbar →
            </button>
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
  title,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()} // keep selection
      onClick={onClick}
      className="rounded px-2 py-1 text-xs hover:bg-tint/[0.08] disabled:opacity-40"
    >
      {children}
    </button>
  );
}
