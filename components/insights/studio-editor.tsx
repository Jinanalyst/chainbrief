"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useI18n, usePreferences } from "@/lib/i18n/use-i18n";
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

// Open-source / no-copyright fonts. System families are royalty-free; the
// named web fonts are SIL Open Font License and loaded in app/layout.tsx.
const FONT_OPTIONS: { label: string; value: string }[] = [
  { label: "Default", value: "" },
  { label: "Sans (System)", value: 'system-ui, -apple-system, "Segoe UI", Arial, sans-serif' },
  { label: "Serif", value: 'Georgia, "Times New Roman", serif' },
  { label: "Mono", value: '"Courier New", monospace' },
  { label: "Inter", value: 'Inter, system-ui, sans-serif' },
  { label: "Lora", value: 'Lora, Georgia, serif' },
  { label: "Merriweather", value: 'Merriweather, Georgia, serif' },
  { label: "JetBrains Mono", value: '"JetBrains Mono", "Courier New", monospace' },
];

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
  const [preferences] = usePreferences();
  const { t } = useI18n(preferences.language);
  const i = t.insights;
  const e = i.editor;
  const tb = e.toolbar;
  const sb = e.sidebar;

  const categoryLabel = (value: InsightCategory): string => {
    switch (value) {
      case "education": return i.categoryEducation;
      case "crypto": return i.categoryCrypto;
      case "stocks": return i.categoryStocks;
      case "macro": return i.categoryMacro;
    }
  };

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
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [slugInput, setSlugInput] = useState(initialInsight.slug);

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

  function applyFont(family: string) {
    if (!family) {
      exec("removeFormat");
      return;
    }
    editorRef.current?.focus();
    document.execCommand("styleWithCSS", false, "true");
    document.execCommand("fontName", false, family);
    readHtmlFromEditor();
  }

  function formatBlock(tag: string) {
    exec("formatBlock", `<${tag}>`);
  }

  function insertLink() {
    const url = window.prompt(e.linkPrompt, "https://");
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
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;
    for (const file of files) {
      const result = await uploadFile(file);
      if (!result) continue;
      insertHtmlAtCaret(
        `<p><img src="${result.url}" alt="" draggable="true" style="max-width:100%;border-radius:8px;cursor:grab" loading="lazy" /></p><p><br/></p>`,
      );
    }
  }

  async function handleCoverPicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const result = await uploadFile(file);
    if (!result) return;
    setDraft((d) => ({ ...d, cover_image_url: result.url }));
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
    if (!confirm(i.studio.confirmDelete)) return;
    const res = await fetch(`/api/insights/${insight.id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/insights/studio");
    } else {
      const payload = await res.json().catch(() => ({}));
      setError(payload.error ?? "could not delete");
    }
  }

  const isPublished = insight.status === "published";
  const statusBadge = isPublished ? i.statusPublished : i.statusDraft;
  const statusLabel: Record<SaveState, string> = {
    idle: dirty ? e.unsaved : e.upToDate,
    saving: e.saving,
    saved: e.saved,
    error: e.saveFailed,
  };

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/insights/studio"
            className="text-xs font-semibold text-muted hover:text-ink"
          >
            {e.backStudio}
          </Link>
          <span
            className={
              "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest " +
              (isPublished
                ? "bg-green-500/15 text-green-400"
                : "bg-tint/10 text-muted")
            }
          >
            {statusBadge}
          </span>
          <span className="text-xs text-muted">
            {statusLabel[saveState]}
            {uploading ? e.uploading : ""}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isPublished ? (
            <Link
              href={`/insights/${insight.slug}`}
              target="_blank"
              className="min-h-10 rounded-md border border-tint/15 bg-tint/[0.04] px-3 py-2.5 text-xs font-semibold text-ink hover:border-accent/50"
            >
              {e.view}
            </Link>
          ) : null}
          <Button onClick={togglePublish} type="button" variant={isPublished ? "secondary" : "primary"}>
            {isPublished ? e.unpublish : e.publish}
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
            onChange={(ev) => setDraft((d) => ({ ...d, title: ev.target.value }))}
            placeholder={e.titlePlaceholder}
            className="w-full rounded-md border border-tint/10 bg-transparent px-3 py-3 text-2xl font-bold text-ink outline-none focus:border-accent/50"
          />
          <textarea
            value={draft.excerpt}
            onChange={(ev) => setDraft((d) => ({ ...d, excerpt: ev.target.value }))}
            placeholder={e.excerptPlaceholder}
            rows={2}
            className="w-full resize-none rounded-md border border-tint/10 bg-transparent px-3 py-2 text-sm text-muted outline-none focus:border-accent/50"
          />

          <div className="flex flex-wrap items-center gap-1 rounded-md border border-tint/10 bg-tint/[0.03] p-1 text-xs font-semibold text-ink">
            <ToolbarButton onClick={() => exec("bold")} title={tb.bold}>
              <span className="font-bold">B</span>
            </ToolbarButton>
            <ToolbarButton onClick={() => exec("italic")} title={tb.italic}>
              <em>I</em>
            </ToolbarButton>
            <ToolbarButton onClick={() => exec("underline")} title={tb.underline}>
              <span className="underline">U</span>
            </ToolbarButton>
            <span className="mx-1 h-5 w-px bg-tint/15" />
            <ToolbarButton onClick={() => formatBlock("h2")} title={tb.h2}>H2</ToolbarButton>
            <ToolbarButton onClick={() => formatBlock("h3")} title={tb.h3}>H3</ToolbarButton>
            <ToolbarButton onClick={() => formatBlock("p")} title={tb.paragraph}>¶</ToolbarButton>
            <span className="mx-1 h-5 w-px bg-tint/15" />
            <select
              aria-label="Font family"
              title="Font family"
              onMouseDown={(ev) => ev.preventDefault()}
              onChange={(ev) => {
                applyFont(ev.target.value);
                ev.target.selectedIndex = 0;
              }}
              className="rounded border border-transparent bg-transparent px-1.5 py-1 text-xs font-semibold text-ink outline-none hover:bg-tint/[0.08] focus:border-accent/40"
            >
              {FONT_OPTIONS.map((f) => (
                <option key={f.label} value={f.value} style={{ fontFamily: f.value || undefined }}>
                  {f.label}
                </option>
              ))}
            </select>
            <span className="mx-1 h-5 w-px bg-tint/15" />
            <ToolbarButton onClick={() => exec("insertUnorderedList")} title={tb.bulleted}>{tb.listBulleted}</ToolbarButton>
            <ToolbarButton onClick={() => exec("insertOrderedList")} title={tb.numbered}>{tb.listNumbered}</ToolbarButton>
            <ToolbarButton onClick={() => formatBlock("blockquote")} title={tb.quote}>❝</ToolbarButton>
            <span className="mx-1 h-5 w-px bg-tint/15" />
            <ToolbarButton onClick={insertLink} title={tb.link}>{tb.linkLabel}</ToolbarButton>
            <ToolbarButton
              onClick={() => imageInputRef.current?.click()}
              title={tb.image}
              disabled={uploading}
            >
              {tb.imageLabel}
            </ToolbarButton>
            <ToolbarButton
              onClick={() => videoInputRef.current?.click()}
              title={tb.video}
              disabled={uploading}
            >
              {tb.videoLabel}
            </ToolbarButton>
            <span className="mx-1 h-5 w-px bg-tint/15" />
            <ToolbarButton onClick={() => exec("removeFormat")} title={tb.clear}>{tb.clearLabel}</ToolbarButton>
          </div>

          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={handleImagePicked}
          />
          <input
            ref={coverInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={handleCoverPicked}
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
            data-placeholder={e.bodyPlaceholder}
            className="insights-editor min-h-[60vh] rounded-md border border-tint/10 bg-transparent px-5 py-5 text-[15px] leading-7 text-ink outline-none focus:border-accent/50"
          />
        </div>

        <aside className="flex h-fit flex-col gap-4 rounded-lg border border-tint/10 bg-tint/[0.03] p-4 text-sm">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-muted">
              {sb.category}
            </label>
            <select
              value={draft.category}
              onChange={(ev) =>
                setDraft((d) => ({ ...d, category: ev.target.value as InsightCategory }))
              }
              className="w-full rounded-md border border-tint/15 bg-tint/[0.04] px-3 py-2 text-sm text-ink"
            >
              {INSIGHT_CATEGORIES.map((c) => (
                <option value={c.value} key={c.value}>
                  {categoryLabel(c.value)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-muted">
              {sb.coverImage}
            </label>
            <input
              value={draft.cover_image_url}
              onChange={(ev) => setDraft((d) => ({ ...d, cover_image_url: ev.target.value }))}
              placeholder={sb.coverImagePlaceholder}
              className="w-full rounded-md border border-tint/15 bg-tint/[0.04] px-3 py-2 text-sm text-ink"
            />
            <button
              type="button"
              onClick={() => coverInputRef.current?.click()}
              className="mt-2 text-xs font-semibold text-accent hover:underline"
              disabled={uploading}
            >
              {sb.uploadHint}
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
              {sb.slug}
            </label>
            <div className="flex items-center gap-1 rounded-md border border-tint/10 bg-tint/[0.02] px-2 py-1 text-xs text-muted">
              <span className="shrink-0">/insights/</span>
              <input
                value={slugInput}
                onChange={(ev) => setSlugInput(ev.target.value)}
                onBlur={async () => {
                  const next = slugInput.trim();
                  if (!next || next === insight.slug) {
                    setSlugInput(insight.slug);
                    return;
                  }
                  const res = await fetch(`/api/insights/${insight.id}`, {
                    method: "PATCH",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({ slug: next }),
                  });
                  const json = await res.json().catch(() => ({}));
                  if (!res.ok) {
                    setError(json.error ?? "could not save");
                    setSlugInput(insight.slug);
                    return;
                  }
                  const updated = json.insight as Insight;
                  setInsight(updated);
                  setSlugInput(updated.slug);
                }}
                className="w-full min-w-0 bg-transparent text-xs text-ink outline-none"
                spellCheck={false}
              />
            </div>
          </div>
          <button
            type="button"
            onClick={remove}
            className="mt-2 rounded-md border border-tint/15 px-3 py-2 text-xs font-semibold text-muted hover:border-red-400/40 hover:text-red-400"
          >
            {sb.deleteInsight}
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
