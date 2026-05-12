"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { Header } from "@/components/header";
import {
  addOpinionPost,
  readAuthorName,
  writeAuthorName,
  type CommunityAttachment,
  type CommunityPostType,
  type CommunityStance,
} from "@/lib/community";
import { cn } from "@/lib/cn";
import { createClient } from "@/lib/supabase/client";
import { hasSupabaseConfig } from "@/lib/supabase/config";

// ─── Block types ──────────────────────────────────────────────────────────────

type TextBlock      = { id: string; type: "text";      content: string };
type HeadingBlock   = { id: string; type: "heading";   level: 2 | 3; content: string };
type QuoteBlock     = { id: string; type: "quote";     content: string; attribution: string };
type ImageBlock     = { id: string; type: "image";     dataUrl: string; caption: string; name: string; size: number; mimeType: string };
type VideoBlock     = { id: string; type: "video";     source: "file" | "url"; dataUrl?: string; url?: string; caption: string; name?: string; size?: number; mimeType?: string };
type LinkBlock      = { id: string; type: "link";      url: string; label: string };
type DividerBlock   = { id: string; type: "divider" };
type ChecklistBlock = { id: string; type: "checklist"; items: Array<{ id: string; text: string; checked: boolean }> };

type Block = TextBlock | HeadingBlock | QuoteBlock | ImageBlock | VideoBlock | LinkBlock | DividerBlock | ChecklistBlock;

// ─── Factory helpers ──────────────────────────────────────────────────────────

const uid = () => Math.random().toString(36).slice(2, 10);

const mkText      = (content = ""): TextBlock      => ({ id: uid(), type: "text", content });
const mkHeading   = (content = "", level: 2 | 3 = 2): HeadingBlock => ({ id: uid(), type: "heading", level, content });
const mkQuote     = (content = "", attribution = ""): QuoteBlock => ({ id: uid(), type: "quote", content, attribution });
const mkLink      = (url = "", label = ""): LinkBlock => ({ id: uid(), type: "link", url, label });
const mkDivider   = (): DividerBlock => ({ id: uid(), type: "divider" });
const mkChecklist = (items: string[] = [""]): ChecklistBlock => ({
  id: uid(), type: "checklist",
  items: items.map((text) => ({ id: uid(), text, checked: false })),
});

function newBlock(type: Block["type"]): Block {
  switch (type) {
    case "text":      return mkText();
    case "heading":   return mkHeading();
    case "quote":     return mkQuote();
    case "image":     return { id: uid(), type: "image", dataUrl: "", caption: "", name: "", size: 0, mimeType: "" };
    case "video":     return { id: uid(), type: "video", source: "url", url: "", caption: "" };
    case "link":      return mkLink();
    case "divider":   return mkDivider();
    case "checklist": return mkChecklist();
  }
}

// ─── Templates ───────────────────────────────────────────────────────────────

type Template = { id: string; label: string; description: string; postType: CommunityPostType; blocks: () => Block[] };

const TEMPLATES: Template[] = [
  {
    id: "market_analysis", label: "Market Analysis", postType: "chart_analysis",
    description: "Map support, resistance, and multi-scenario outlook.",
    blocks: () => [
      mkHeading("Market Overview"),
      mkText("Asset:\nTimeframe:\nCurrent trend:"),
      mkHeading("Key Levels", 3),
      mkText("Support:\nResistance:"),
      mkHeading("Scenarios", 3),
      mkText("Bullish scenario:\nBearish scenario:\nInvalidation:"),
      mkHeading("Personal View", 3),
      mkText(""),
    ],
  },
  {
    id: "bull_case", label: "Bull Case", postType: "general",
    description: "Make the case for upside with catalysts and evidence.",
    blocks: () => [
      mkHeading("Bull Case"),
      mkText("Thesis:"),
      mkHeading("Supporting Catalysts", 3),
      mkChecklist(["Catalyst 1", "Catalyst 2", "Catalyst 3"]),
      mkHeading("Key Risks", 3),
      mkText("What could invalidate this thesis:"),
      mkHeading("Conclusion", 3),
      mkText(""),
    ],
  },
  {
    id: "bear_case", label: "Bear Case", postType: "general",
    description: "Make the case for downside with red flags and risks.",
    blocks: () => [
      mkHeading("Bear Case"),
      mkText("Thesis:"),
      mkHeading("Risk Factors", 3),
      mkChecklist(["Risk 1", "Risk 2", "Risk 3"]),
      mkHeading("Counter-argument", 3),
      mkText("What bulls would say:"),
      mkHeading("Conclusion", 3),
      mkText(""),
    ],
  },
  {
    id: "trading_review", label: "Trading Review", postType: "trade_review",
    description: "Log entry, exit, and lessons from a completed trade.",
    blocks: () => [
      mkHeading("Trade Summary"),
      mkText("Asset:\nDirection:\nEntry:\nExit:\nP/L:"),
      mkHeading("Entry Reasoning", 3),
      mkText("Why I entered:"),
      mkHeading("What Happened", 3),
      mkText("How the trade played out:"),
      mkHeading("Lessons Learned", 3),
      mkChecklist(["Lesson 1", "Lesson 2"]),
    ],
  },
  {
    id: "news_reaction", label: "News Reaction", postType: "news_interpretation",
    description: "Break down what a headline means for the market.",
    blocks: () => [
      mkHeading("Headline"),
      mkQuote("Paste the news headline here", "Source"),
      mkHeading("My Read", 3),
      mkText("What this actually means:"),
      mkHeading("Market Impact", 3),
      mkText("Short-term impact:\nLong-term impact:"),
      mkHeading("Alternative Interpretation", 3),
      mkText(""),
    ],
  },
  {
    id: "project_research", label: "Project Research", postType: "general",
    description: "Deep-dive on a protocol, token, or team.",
    blocks: () => [
      mkHeading("Project Overview"),
      mkText("Name:\nCategory:\nLaunch date:"),
      mkHeading("What It Does", 3),
      mkText(""),
      mkHeading("Strengths", 3),
      mkChecklist(["Strength 1"]),
      mkHeading("Weaknesses", 3),
      mkChecklist(["Weakness 1"]),
      mkDivider(),
      mkHeading("Verdict", 3),
      mkText(""),
    ],
  },
  {
    id: "risk_warning", label: "Risk Warning", postType: "risk_analysis",
    description: "Highlight a specific downside trigger or red flag.",
    blocks: () => [
      mkHeading("Risk Warning"),
      mkText("Asset or event:\nMain risk:"),
      mkHeading("Why This Matters", 3),
      mkText("Possible impact:"),
      mkHeading("Invalidation", 3),
      mkText("What would invalidate this risk:"),
      mkHeading("Data to Watch", 3),
      mkChecklist(["Signal 1", "Signal 2"]),
    ],
  },
];

// ─── Serializers ──────────────────────────────────────────────────────────────

function blocksToText(blocks: Block[]): string {
  return blocks
    .map((b) => {
      switch (b.type) {
        case "text":      return b.content;
        case "heading":   return `${"#".repeat(b.level)} ${b.content}`;
        case "quote":     return `> ${b.content}${b.attribution ? `\n— ${b.attribution}` : ""}`;
        case "image":     return `[Image: ${b.name}]${b.caption ? `\nCaption: ${b.caption}` : ""}`;
        case "video":     { const src = b.source === "url" ? b.url : b.name; return `[Video: ${src ?? ""}]${b.caption ? `\nCaption: ${b.caption}` : ""}`; }
        case "link":      return `[${b.label || b.url}](${b.url})`;
        case "divider":   return "---";
        case "checklist": return b.items.map((i) => `- [${i.checked ? "x" : " "}] ${i.text}`).join("\n");
      }
    })
    .filter(Boolean)
    .join("\n\n");
}

function blocksToAttachments(blocks: Block[]): CommunityAttachment[] {
  const result: CommunityAttachment[] = [];
  for (const b of blocks) {
    if (b.type === "image" && b.dataUrl) {
      result.push({ id: b.id, kind: "image", name: b.name, mimeType: b.mimeType, dataUrl: b.dataUrl, size: b.size });
    } else if (b.type === "video" && b.source === "file" && b.dataUrl) {
      result.push({ id: b.id, kind: "video", name: b.name ?? "", mimeType: b.mimeType ?? "", dataUrl: b.dataUrl, size: b.size ?? 0 });
    }
  }
  return result;
}

// ─── YouTube helper ───────────────────────────────────────────────────────────

function getYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/))([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STANCES: CommunityStance[] = ["Bullish", "Bearish", "Neutral", "Question"];

const TOPICS = [
  "Bitcoin", "Ethereum", "Solana", "Macro", "Regulation",
  "Event", "News Reactions", "Analysis", "Questions", "Lounge",
];

const INVESTMENT_NOTICE =
  "This content is for informational and educational purposes only and is not financial advice. Crypto assets involve risk of loss. All investment decisions are the sole responsibility of the user.";

const IMAGE_LIMIT_BYTES = 8 * 1024 * 1024;
const VIDEO_LIMIT_BYTES = 24 * 1024 * 1024;

const BLOCK_MENU_ITEMS: Array<{ type: Block["type"]; label: string; icon: string }> = [
  { type: "text",      label: "Text",      icon: "¶" },
  { type: "heading",   label: "Heading",   icon: "H" },
  { type: "quote",     label: "Quote",     icon: "❝" },
  { type: "image",     label: "Image",     icon: "⬜" },
  { type: "video",     label: "Video",     icon: "▶" },
  { type: "link",      label: "Link",      icon: "↗" },
  { type: "divider",   label: "Divider",   icon: "—" },
  { type: "checklist", label: "Checklist", icon: "✓" },
];

// ─── Block editors ────────────────────────────────────────────────────────────

function TextEditor({ block, onChange }: { block: TextBlock; onChange: (b: TextBlock) => void }) {
  const rows = Math.max(2, block.content.split("\n").length);
  return (
    <textarea
      className="w-full resize-none rounded-md border border-white/10 bg-background px-3 py-2 text-sm text-ink outline-none transition placeholder:text-muted-2 focus:border-accent focus:ring-1 focus:ring-accent/30"
      rows={rows}
      value={block.content}
      onChange={(e) => onChange({ ...block, content: e.target.value })}
      placeholder="Start writing…"
    />
  );
}

function HeadingEditor({ block, onChange }: { block: HeadingBlock; onChange: (b: HeadingBlock) => void }) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onChange({ ...block, level: block.level === 2 ? 3 : 2 })}
        className="shrink-0 rounded border border-white/10 bg-white/[0.04] px-2 py-1 text-xs font-bold text-muted transition hover:text-ink"
        title="Toggle heading level"
      >
        H{block.level}
      </button>
      <input
        className={cn(
          "w-full rounded-md border border-white/10 bg-background px-3 py-2 font-bold text-ink outline-none transition placeholder:text-muted-2 focus:border-accent focus:ring-1 focus:ring-accent/30",
          block.level === 2 ? "text-xl" : "text-base",
        )}
        value={block.content}
        onChange={(e) => onChange({ ...block, content: e.target.value })}
        placeholder="Heading text…"
      />
    </div>
  );
}

function QuoteEditor({ block, onChange }: { block: QuoteBlock; onChange: (b: QuoteBlock) => void }) {
  return (
    <div className="space-y-2 border-l-2 border-accent/60 pl-3">
      <textarea
        className="w-full resize-none rounded-md border border-white/10 bg-background px-3 py-2 text-sm italic text-ink outline-none transition placeholder:text-muted-2 focus:border-accent focus:ring-1 focus:ring-accent/30"
        rows={2}
        value={block.content}
        onChange={(e) => onChange({ ...block, content: e.target.value })}
        placeholder="Quote text…"
      />
      <input
        className="w-full rounded-md border border-white/10 bg-background px-3 py-1.5 text-xs text-muted outline-none transition placeholder:text-muted-2 focus:border-accent"
        value={block.attribution}
        onChange={(e) => onChange({ ...block, attribution: e.target.value })}
        placeholder="— Attribution (optional)"
      />
    </div>
  );
}

function ImageEditor({ block, onChange }: { block: ImageBlock; onChange: (b: ImageBlock) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/") || file.size > IMAGE_LIMIT_BYTES) return;
    const dataUrl = await readFileAsDataUrl(file);
    onChange({ ...block, dataUrl, name: file.name, size: file.size, mimeType: file.type });
  }

  return (
    <div className="space-y-2">
      {block.dataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={block.dataUrl} alt={block.name} className="max-h-64 w-full rounded-lg object-cover" />
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex h-24 w-full items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/[0.02] text-sm text-muted transition hover:border-accent/50 hover:text-accent"
        >
          Click to upload image (max 8 MB)
        </button>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { if (e.target.files?.[0]) void handleFile(e.target.files[0]); e.target.value = ""; }}
      />
      {block.dataUrl && (
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-md border border-white/10 bg-background px-3 py-1.5 text-xs text-ink outline-none placeholder:text-muted-2 focus:border-accent"
            value={block.caption}
            onChange={(e) => onChange({ ...block, caption: e.target.value })}
            placeholder="Caption (optional)"
          />
          <button
            type="button"
            onClick={() => onChange({ ...block, dataUrl: "", name: "", size: 0, mimeType: "" })}
            className="text-xs text-muted transition hover:text-rose-300"
          >
            Remove
          </button>
        </div>
      )}
    </div>
  );
}

function VideoEditor({ block, onChange }: { block: VideoBlock; onChange: (b: VideoBlock) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const ytId = block.source === "url" && block.url ? getYouTubeId(block.url) : null;

  async function handleFile(file: File) {
    if (!file.type.startsWith("video/") || file.size > VIDEO_LIMIT_BYTES) return;
    const dataUrl = await readFileAsDataUrl(file);
    onChange({ ...block, source: "file", dataUrl, url: undefined, name: file.name, size: file.size, mimeType: file.type });
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onChange({ ...block, source: "url", dataUrl: undefined, url: block.url ?? "", name: undefined, size: undefined, mimeType: undefined })}
          className={cn("rounded-full border px-3 py-1 text-xs font-semibold transition", block.source === "url" ? "border-accent/60 bg-accent/15 text-blue-100" : "border-white/10 text-muted hover:text-ink")}
        >
          URL
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className={cn("rounded-full border px-3 py-1 text-xs font-semibold transition", block.source === "file" ? "border-accent/60 bg-accent/15 text-blue-100" : "border-white/10 text-muted hover:text-ink")}
        >
          Upload file
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(e) => { if (e.target.files?.[0]) void handleFile(e.target.files[0]); e.target.value = ""; }}
        />
      </div>

      {block.source === "url" && (
        <input
          className="w-full rounded-md border border-white/10 bg-background px-3 py-2 text-sm text-ink outline-none transition placeholder:text-muted-2 focus:border-accent focus:ring-1 focus:ring-accent/30"
          value={block.url ?? ""}
          onChange={(e) => onChange({ ...block, url: e.target.value })}
          placeholder="YouTube or direct video URL…"
        />
      )}

      {ytId && (
        <div className="relative overflow-hidden rounded-lg">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`} alt="YouTube thumbnail" className="w-full rounded-lg" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black/60">
              <span className="text-xl text-white">▶</span>
            </div>
          </div>
        </div>
      )}

      {block.source === "file" && block.dataUrl && (
        <video src={block.dataUrl} controls className="w-full rounded-lg bg-black" />
      )}

      <input
        className="w-full rounded-md border border-white/10 bg-background px-3 py-1.5 text-xs text-ink outline-none placeholder:text-muted-2 focus:border-accent"
        value={block.caption}
        onChange={(e) => onChange({ ...block, caption: e.target.value })}
        placeholder="Caption (optional)"
      />
    </div>
  );
}

function LinkEditor({ block, onChange }: { block: LinkBlock; onChange: (b: LinkBlock) => void }) {
  return (
    <div className="space-y-2 rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <input
        className="w-full rounded-md border border-white/10 bg-background px-3 py-2 text-sm text-ink outline-none transition placeholder:text-muted-2 focus:border-accent"
        value={block.url}
        onChange={(e) => onChange({ ...block, url: e.target.value })}
        placeholder="https://…"
        type="url"
      />
      <input
        className="w-full rounded-md border border-white/10 bg-background px-3 py-1.5 text-xs text-ink outline-none placeholder:text-muted-2 focus:border-accent"
        value={block.label}
        onChange={(e) => onChange({ ...block, label: e.target.value })}
        placeholder="Link label (optional)"
      />
    </div>
  );
}

function ChecklistEditor({ block, onChange }: { block: ChecklistBlock; onChange: (b: ChecklistBlock) => void }) {
  function updateItem(id: string, text: string) {
    onChange({ ...block, items: block.items.map((i) => (i.id === id ? { ...i, text } : i)) });
  }
  function toggleItem(id: string) {
    onChange({ ...block, items: block.items.map((i) => (i.id === id ? { ...i, checked: !i.checked } : i)) });
  }
  function addItem() {
    onChange({ ...block, items: [...block.items, { id: uid(), text: "", checked: false }] });
  }
  function removeItem(id: string) {
    if (block.items.length <= 1) return;
    onChange({ ...block, items: block.items.filter((i) => i.id !== id) });
  }

  return (
    <div className="space-y-1.5">
      {block.items.map((item) => (
        <div key={item.id} className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => toggleItem(item.id)}
            className={cn(
              "mt-px h-4 w-4 shrink-0 rounded border transition",
              item.checked ? "border-accent bg-accent/80" : "border-white/20 bg-white/[0.03] hover:border-accent/60",
            )}
          >
            {item.checked && <span className="flex h-full w-full items-center justify-center text-[10px] font-bold text-white">✓</span>}
          </button>
          <input
            className={cn(
              "flex-1 rounded bg-transparent px-1 py-0.5 text-sm text-ink outline-none placeholder:text-muted-2",
              item.checked && "text-muted line-through",
            )}
            value={item.text}
            onChange={(e) => updateItem(item.id, e.target.value)}
            placeholder="Item…"
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); addItem(); }
              if (e.key === "Backspace" && !item.text) { e.preventDefault(); removeItem(item.id); }
            }}
          />
          <button type="button" onClick={() => removeItem(item.id)} className="text-xs text-muted transition hover:text-rose-300">✕</button>
        </div>
      ))}
      <button type="button" onClick={addItem} className="mt-1 text-xs text-muted transition hover:text-accent">
        + Add item
      </button>
    </div>
  );
}

// ─── Block row ────────────────────────────────────────────────────────────────

interface BlockRowProps {
  block: Block;
  index: number;
  total: number;
  onChange: (block: Block) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onInsertAfter: (type: Block["type"]) => void;
  dragHandlers: {
    onDragStart: () => void;
    onDragOver: (e: React.DragEvent) => void;
    onDrop: () => void;
    isDragOver: boolean;
  };
}

function BlockRow({ block, index, total, onChange, onDelete, onMoveUp, onMoveDown, onInsertAfter, dragHandlers }: BlockRowProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const blockLabel =
    block.type === "heading" ? `Heading H${block.level}` :
    block.type === "checklist" ? "Checklist" :
    block.type;

  return (
    <div
      draggable
      onDragStart={dragHandlers.onDragStart}
      onDragOver={dragHandlers.onDragOver}
      onDrop={dragHandlers.onDrop}
      className={cn(
        "group relative rounded-xl border transition",
        dragHandlers.isDragOver
          ? "border-accent/60 bg-accent/5 ring-1 ring-accent/30"
          : "border-white/[0.06] bg-white/[0.02] hover:border-white/10",
      )}
    >
      {/* Toolbar — shown on hover */}
      <div className="absolute right-2 top-2 z-10 flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        <button type="button" onClick={onMoveUp} disabled={index === 0} className="rounded p-1.5 text-xs text-muted transition hover:text-ink disabled:opacity-25" title="Move up">↑</button>
        <button type="button" onClick={onMoveDown} disabled={index === total - 1} className="rounded p-1.5 text-xs text-muted transition hover:text-ink disabled:opacity-25" title="Move down">↓</button>
        <button type="button" onClick={onDelete} className="rounded p-1.5 text-xs text-muted transition hover:text-rose-300" title="Delete block">✕</button>
        <span className="cursor-grab rounded p-1.5 text-xs text-muted select-none" title="Drag to reorder">⠿</span>
      </div>

      <div className="px-3 pb-3 pr-24 pt-3">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-2 capitalize">{blockLabel}</p>

        {block.type === "text"      && <TextEditor      block={block} onChange={(b) => onChange(b)} />}
        {block.type === "heading"   && <HeadingEditor   block={block} onChange={(b) => onChange(b)} />}
        {block.type === "quote"     && <QuoteEditor     block={block} onChange={(b) => onChange(b)} />}
        {block.type === "image"     && <ImageEditor     block={block} onChange={(b) => onChange(b)} />}
        {block.type === "video"     && <VideoEditor     block={block} onChange={(b) => onChange(b)} />}
        {block.type === "link"      && <LinkEditor      block={block} onChange={(b) => onChange(b)} />}
        {block.type === "divider"   && <hr className="border-white/10" />}
        {block.type === "checklist" && <ChecklistEditor block={block} onChange={(b) => onChange(b)} />}
      </div>

      {/* Insert block after — shown on hover */}
      <div className="flex justify-center border-t border-white/[0.04] py-1 opacity-0 transition-opacity group-hover:opacity-100">
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="rounded-full border border-dashed border-white/10 px-2.5 py-0.5 text-xs text-muted transition hover:border-accent/50 hover:text-accent"
          >
            + Insert block
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute bottom-8 left-1/2 z-20 w-44 -translate-x-1/2 overflow-hidden rounded-xl border border-white/10 bg-[#0f1420] shadow-2xl">
                {BLOCK_MENU_ITEMS.map((item) => (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => { onInsertAfter(item.type); setMenuOpen(false); }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-ink transition hover:bg-white/[0.06]"
                  >
                    <span className="w-5 text-center text-xs text-muted">{item.icon}</span>
                    {item.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Preview renderer ─────────────────────────────────────────────────────────

function BlockPreview({ blocks }: { blocks: Block[] }) {
  return (
    <div className="space-y-4 text-sm leading-6 text-ink">
      {blocks.map((b) => {
        switch (b.type) {
          case "text":
            return (
              <p key={b.id} className="whitespace-pre-wrap text-ink/90">
                {b.content || <span className="text-muted-2">(empty text block)</span>}
              </p>
            );
          case "heading":
            return b.level === 2
              ? <h2 key={b.id} className="text-xl font-bold text-ink">{b.content}</h2>
              : <h3 key={b.id} className="text-base font-semibold text-ink">{b.content}</h3>;
          case "quote":
            return (
              <blockquote key={b.id} className="border-l-2 border-accent/60 pl-3 italic text-ink/80">
                <p>{b.content}</p>
                {b.attribution && <footer className="mt-1 not-italic text-xs text-muted">— {b.attribution}</footer>}
              </blockquote>
            );
          case "image":
            return b.dataUrl ? (
              <figure key={b.id}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={b.dataUrl} alt={b.name} className="w-full rounded-lg" />
                {b.caption && <figcaption className="mt-1 text-center text-xs text-muted">{b.caption}</figcaption>}
              </figure>
            ) : (
              <div key={b.id} className="rounded-xl border border-dashed border-white/10 p-4 text-center text-xs text-muted">[No image uploaded]</div>
            );
          case "video": {
            const ytId = b.source === "url" && b.url ? getYouTubeId(b.url) : null;
            return (
              <figure key={b.id}>
                {ytId ? (
                  <div className="relative overflow-hidden rounded-lg">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`} alt="Video thumbnail" className="w-full rounded-lg" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black/60">
                        <span className="text-xl text-white">▶</span>
                      </div>
                    </div>
                  </div>
                ) : b.source === "file" && b.dataUrl ? (
                  <video src={b.dataUrl} controls className="w-full rounded-lg bg-black" />
                ) : (
                  <div className="rounded-xl border border-dashed border-white/10 p-4 text-center text-xs text-muted">[Video: {b.url ?? "no source"}]</div>
                )}
                {b.caption && <figcaption className="mt-1 text-center text-xs text-muted">{b.caption}</figcaption>}
              </figure>
            );
          }
          case "link":
            return (
              <div key={b.id} className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
                <span className="text-accent">↗</span>
                <a href={b.url} target="_blank" rel="noopener noreferrer" className="text-sm text-accent underline-offset-2 hover:underline">
                  {b.label || b.url}
                </a>
              </div>
            );
          case "divider":
            return <hr key={b.id} className="border-white/10" />;
          case "checklist":
            return (
              <ul key={b.id} className="space-y-1">
                {b.items.map((item) => (
                  <li key={item.id} className={cn("flex items-center gap-2 text-sm", item.checked && "text-muted line-through")}>
                    <span className={cn("flex h-4 w-4 shrink-0 items-center justify-center rounded border", item.checked ? "border-accent bg-accent/80" : "border-white/20")}>
                      {item.checked && <span className="text-[10px] font-bold text-white">✓</span>}
                    </span>
                    {item.text}
                  </li>
                ))}
              </ul>
            );
        }
      })}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CommunityWriteStudio({
  initialPostType = "general",
}: {
  initialPostType?: CommunityPostType;
}) {
  const router = useRouter();
  const supabase = useMemo(() => (hasSupabaseConfig ? createClient() : null), []);
  const dragIndexRef = useRef<number | null>(null);
  const [authorName, setAuthorName] = useState(() => readAuthorName());
  const [editingAuthor, setEditingAuthor] = useState(false);
  const [authorDraft, setAuthorDraft] = useState("");

  // On mount, resolve the best available author name and save to localStorage
  useEffect(() => {
    const saved = readAuthorName();
    if (saved) {
      setAuthorName(saved);
      return; // localStorage name takes priority
    }
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => {
      const user = data.user;
      if (!user) return;
      const profile = user.user_metadata?.chainBriefProfile as { displayName?: string } | undefined;
      const name =
        profile?.displayName ??
        (typeof user.user_metadata?.name === "string" ? user.user_metadata.name : null) ??
        (typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : null) ??
        user.email ??
        "";
      if (name) {
        setAuthorName(name);
        writeAuthorName(name);
      }
    });
  }, [supabase]);

  function saveAuthorName() {
    const trimmed = authorDraft.trim();
    if (trimmed) {
      setAuthorName(trimmed);
      writeAuthorName(trimmed);
    }
    setEditingAuthor(false);
  }

  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("Bitcoin");
  const [stance, setStance] = useState<CommunityStance>("Neutral");
  const [postType, setPostType] = useState<CommunityPostType>(initialPostType);
  const [blocks, setBlocks] = useState<Block[]>([mkText()]);
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(true);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);

  function applyTemplate(tpl: Template) {
    setBlocks(tpl.blocks());
    setPostType(tpl.postType);
    setActiveTemplateId(tpl.id);
  }

  function updateBlock(index: number, block: Block) {
    setBlocks((prev) => prev.map((b, i) => (i === index ? block : b)));
  }

  function deleteBlock(index: number) {
    setBlocks((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.length ? next : [mkText()];
    });
  }

  function moveBlock(from: number, to: number) {
    setBlocks((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }

  function insertBlock(afterIndex: number, type: Block["type"]) {
    setBlocks((prev) => {
      const next = [...prev];
      next.splice(afterIndex + 1, 0, newBlock(type));
      return next;
    });
  }

  function addBlockAtEnd(type: Block["type"]) {
    setBlocks((prev) => [...prev, newBlock(type)]);
  }

  function handleDragStart(index: number) {
    dragIndexRef.current = index;
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    setDragOver(index);
  }

  function handleDrop(index: number) {
    if (dragIndexRef.current !== null && dragIndexRef.current !== index) {
      moveBlock(dragIndexRef.current, index);
    }
    dragIndexRef.current = null;
    setDragOver(null);
  }

  function publishPost() {
    const trimmedTitle = title.trim();
    const body = blocksToText(blocks);

    if (!trimmedTitle) { setError("Please add a title."); return; }
    if (!body.trim()) { setError("Please add some content."); return; }

    setIsPublishing(true);
    setError(null);
    setMessage(null);

    addOpinionPost(body, topic, {
      title: trimmedTitle,
      author: authorName,
      stance,
      postType,
      analystTier:
        postType === "general"
          ? undefined
          : postType === "risk_analysis"
            ? "rising_analyst"
            : "rookie_analyst",
      discussionType:
        topic === "Analysis" ? "analysis" :
        topic === "Questions" ? "question" :
        topic === "Event" ? "event" :
        topic === "News Reactions" ? "news_reaction" :
        "opinion",
      attachments: blocksToAttachments(blocks),
    });

    setIsPublishing(false);
    setMessage("Post published to Community.");
    router.push("/community");
  }

  return (
    <main className="site-grid min-h-screen overflow-x-hidden pb-24">
      <Header />
      <section className="border-t border-white/10 bg-background/72">
        <Container className="section-space">
          <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,1.2fr)_22rem]">

            {/* Editor panel */}
            <Card className="min-w-0 p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">Writing Studio</p>
                  <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink">Write with a clear direction.</h1>
                  <p className="mt-3 text-sm leading-6 text-muted">
                    Pick a template, build your post with blocks, and publish.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewMode((v) => !v)}
                  className={cn(
                    "mt-1 shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                    previewMode
                      ? "border-accent/60 bg-accent/15 text-blue-100"
                      : "border-white/10 text-muted hover:border-accent/50 hover:text-ink",
                  )}
                >
                  {previewMode ? "← Edit" : "Preview"}
                </button>
              </div>

              <div className="mt-6 grid gap-5">
                {/* Title */}
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Title</span>
                  <input
                    className="mt-2 h-11 w-full rounded-md border border-white/10 bg-background px-3 text-sm text-ink outline-none transition placeholder:text-muted-2 focus:border-accent focus:ring-2 focus:ring-accent/30"
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Short, clear title"
                    value={title}
                  />
                </label>

                {/* Topic + Stance */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Topic</span>
                    <select
                      className="mt-2 h-11 w-full rounded-md border border-white/10 bg-background px-3 text-sm text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30"
                      onChange={(e) => setTopic(e.target.value)}
                      value={topic}
                    >
                      {TOPICS.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </label>

                  <div>
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Stance</span>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {STANCES.map((s) => (
                        <button
                          key={s}
                          type="button"
                          aria-pressed={stance === s}
                          onClick={() => setStance(s)}
                          className={cn(
                            "rounded-full border px-3 py-1.5 text-xs font-bold transition",
                            stance === s
                              ? "border-accent/60 bg-accent/20 text-blue-100"
                              : "border-white/10 bg-white/[0.03] text-muted hover:border-accent/50 hover:text-ink",
                          )}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Block content */}
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Content</span>
                    <span className="text-xs text-muted-2">{blocks.length} block{blocks.length !== 1 ? "s" : ""}</span>
                  </div>

                  {previewMode ? (
                    <div className="min-h-40 rounded-xl border border-white/10 bg-white/[0.02] p-5">
                      <BlockPreview blocks={blocks} />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {blocks.map((block, index) => (
                        <BlockRow
                          key={block.id}
                          block={block}
                          index={index}
                          total={blocks.length}
                          onChange={(b) => updateBlock(index, b)}
                          onDelete={() => deleteBlock(index)}
                          onMoveUp={() => index > 0 && moveBlock(index, index - 1)}
                          onMoveDown={() => index < blocks.length - 1 && moveBlock(index, index + 1)}
                          onInsertAfter={(type) => insertBlock(index, type)}
                          dragHandlers={{
                            onDragStart: () => handleDragStart(index),
                            onDragOver: (e) => handleDragOver(e, index),
                            onDrop: () => handleDrop(index),
                            isDragOver: dragOver === index,
                          }}
                        />
                      ))}

                      {/* Add block at end */}
                      <div className="relative flex justify-center pt-1">
                        <button
                          type="button"
                          onClick={() => setAddMenuOpen((v) => !v)}
                          className="flex items-center gap-1.5 rounded-full border border-dashed border-white/10 px-4 py-1.5 text-xs font-semibold text-muted transition hover:border-accent/50 hover:text-accent"
                        >
                          <span className="text-base leading-none">+</span> Add block
                        </button>
                        {addMenuOpen && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setAddMenuOpen(false)} />
                            <div className="absolute bottom-10 left-1/2 z-20 w-44 -translate-x-1/2 overflow-hidden rounded-xl border border-white/10 bg-[#0f1420] shadow-2xl">
                              {BLOCK_MENU_ITEMS.map((item) => (
                                <button
                                  key={item.type}
                                  type="button"
                                  onClick={() => { addBlockAtEnd(item.type); setAddMenuOpen(false); }}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-ink transition hover:bg-white/[0.06]"
                                >
                                  <span className="w-5 text-center text-xs text-muted">{item.icon}</span>
                                  {item.label}
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {postType !== "general" && (
                  <div className="rounded-md border border-amber-400/20 bg-amber-400/10 px-3 py-2">
                    <p className="text-xs leading-5 text-amber-100">{INVESTMENT_NOTICE}</p>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <Button disabled={isPublishing} onClick={publishPost} type="button">
                    {isPublishing ? "Publishing…" : "Publish"}
                  </Button>
                  <Button href="/community" variant="secondary">Cancel</Button>
                </div>

                {message && (
                  <div className="rounded-md border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm leading-6 text-emerald-100">
                    {message}
                  </div>
                )}
                {error && (
                  <div className="rounded-md border border-rose-400/20 bg-rose-400/10 p-4 text-sm leading-6 text-rose-100">
                    {error}
                  </div>
                )}
              </div>
            </Card>

            {/* Sidebar */}
            <aside className="space-y-3 lg:sticky lg:top-24 lg:self-start">

              {/* ── Posting as ── */}
              <Card className="min-w-0 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Posting as</p>

                {editingAuthor ? (
                  <div className="mt-3 flex gap-2">
                    <input
                      autoFocus
                      className="min-h-9 flex-1 rounded-md border border-accent/50 bg-background px-3 text-sm text-ink outline-none focus:ring-2 focus:ring-accent/30"
                      onKeyDown={(e) => { if (e.key === "Enter") saveAuthorName(); if (e.key === "Escape") setEditingAuthor(false); }}
                      onChange={(e) => setAuthorDraft(e.target.value)}
                      placeholder="Your display name"
                      value={authorDraft}
                    />
                    <button
                      type="button"
                      onClick={saveAuthorName}
                      className="rounded-md border border-accent/50 bg-accent/15 px-3 py-1.5 text-xs font-semibold text-blue-100 transition hover:bg-accent/25"
                    >
                      Save
                    </button>
                  </div>
                ) : (
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-accent/30 bg-accent/15 text-xs font-bold text-blue-100">
                        {authorName ? authorName.slice(0, 2).toUpperCase() : "?"}
                      </div>
                      <span className="truncate text-sm font-semibold text-ink">
                        {authorName || <span className="italic text-muted-2">No name set</span>}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setAuthorDraft(authorName); setEditingAuthor(true); }}
                      className="shrink-0 rounded-md border border-white/10 px-2.5 py-1 text-xs font-semibold text-muted transition hover:border-accent/50 hover:text-accent"
                    >
                      Edit
                    </button>
                  </div>
                )}

                {!authorName && !editingAuthor && (
                  <p className="mt-2 text-xs leading-5 text-amber-200/80">
                    Set a name so your posts are saved correctly and appear in your profile history.
                  </p>
                )}
              </Card>

              <Card className="overflow-hidden p-0">
                <button
                  type="button"
                  onClick={() => setTemplateOpen((v) => !v)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Post Templates</p>
                  <span className="text-xs text-muted">{templateOpen ? "▲" : "▼"}</span>
                </button>
                {templateOpen && (
                  <div className="grid gap-2 border-t border-white/[0.06] px-3 pb-3 pt-2">
                    {TEMPLATES.map((tpl) => (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => applyTemplate(tpl)}
                        className={cn(
                          "rounded-xl border p-3 text-left transition",
                          activeTemplateId === tpl.id
                            ? "border-accent/60 bg-accent/10"
                            : "border-white/[0.06] bg-white/[0.02] hover:border-accent/40 hover:bg-white/[0.04]",
                        )}
                      >
                        <p className="text-sm font-semibold text-ink">{tpl.label}</p>
                        <p className="mt-1 text-xs leading-5 text-muted">{tpl.description}</p>
                      </button>
                    ))}
                  </div>
                )}
              </Card>

              <Card className="p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Block types</p>
                <div className="mt-3 grid grid-cols-4 gap-1.5">
                  {BLOCK_MENU_ITEMS.map((item) => (
                    <button
                      key={item.type}
                      type="button"
                      onClick={() => addBlockAtEnd(item.type)}
                      title={item.label}
                      className="flex flex-col items-center gap-1 rounded-lg border border-white/[0.06] bg-white/[0.02] py-2 text-muted transition hover:border-accent/40 hover:text-accent"
                    >
                      <span className="text-sm">{item.icon}</span>
                      <span className="text-[9px] font-semibold uppercase tracking-wider">{item.label}</span>
                    </button>
                  ))}
                </div>
              </Card>

              <Card className="p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Reminder</p>
                <p className="mt-3 text-sm leading-6 text-muted">
                  Chain Brief is for market analysis and educational discussion. Avoid guaranteed
                  profit language, signal-room framing, or 1:1 buy/sell instructions.
                </p>
              </Card>
            </aside>

          </div>
        </Container>
      </section>
    </main>
  );
}

// ─── Util ─────────────────────────────────────────────────────────────────────

async function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read file."));
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.readAsDataURL(file);
  });
}
