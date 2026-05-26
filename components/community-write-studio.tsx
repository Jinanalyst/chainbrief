"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { Header } from "@/components/header";
import {
  addOpinionPost,
  clearCommunityQuoteTarget,
  databaseInsertFromCommunityPost,
  normalizeTags,
  readAuthorName,
  readCommunityQuoteTarget,
  writeAuthorName,
  type CommunityQuoteTarget,
  type CommunityPostType,
  type CommunityStance,
} from "@/lib/community";
import { cn } from "@/lib/cn";
import { createClient } from "@/lib/supabase/client";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { sanitizeHtml } from "@/lib/sanitize-html";
import { useI18n, usePreferences } from "@/lib/i18n/use-i18n";

// ─── Templates (produce HTML) ─────────────────────────────────────────────────

type Template = {
  id: string;
  label: string;
  description: string;
  postType: CommunityPostType;
  html: () => string;
};

const TEMPLATES: Template[] = [
  {
    id: "market_analysis",
    label: "Market Analysis",
    postType: "chart_analysis",
    description: "Map support, resistance, and multi-scenario outlook.",
    html: () => `
      <h2>Market Overview</h2>
      <p>Asset: <br/>Timeframe: <br/>Current trend: </p>
      <h3>Key Levels</h3>
      <p>Support: <br/>Resistance: </p>
      <h3>Scenarios</h3>
      <p>Bullish scenario: <br/>Bearish scenario: <br/>Invalidation: </p>
      <h3>Personal View</h3>
      <p><br/></p>
    `,
  },
  {
    id: "bull_case",
    label: "Bull Case",
    postType: "general",
    description: "Make the case for upside with catalysts and evidence.",
    html: () => `
      <h2>Bull Case</h2>
      <p>Thesis: </p>
      <h3>Supporting Catalysts</h3>
      <ul><li>Catalyst 1</li><li>Catalyst 2</li><li>Catalyst 3</li></ul>
      <h3>Key Risks</h3>
      <p>What could invalidate this thesis: </p>
      <h3>Conclusion</h3>
      <p><br/></p>
    `,
  },
  {
    id: "bear_case",
    label: "Bear Case",
    postType: "general",
    description: "Make the case for downside with red flags and risks.",
    html: () => `
      <h2>Bear Case</h2>
      <p>Thesis: </p>
      <h3>Risk Factors</h3>
      <ul><li>Risk 1</li><li>Risk 2</li><li>Risk 3</li></ul>
      <h3>Counter-argument</h3>
      <p>What bulls would say: </p>
      <h3>Conclusion</h3>
      <p><br/></p>
    `,
  },
  {
    id: "trading_review",
    label: "Trading Review",
    postType: "trade_review",
    description: "Log entry, exit, and lessons from a completed trade.",
    html: () => `
      <h2>Trade Summary</h2>
      <p>Asset: <br/>Direction: <br/>Entry: <br/>Exit: <br/>P/L: </p>
      <h3>Entry Reasoning</h3>
      <p>Why I entered: </p>
      <h3>What Happened</h3>
      <p>How the trade played out: </p>
      <h3>Lessons Learned</h3>
      <ul><li>Lesson 1</li><li>Lesson 2</li></ul>
    `,
  },
  {
    id: "news_reaction",
    label: "News Reaction",
    postType: "news_interpretation",
    description: "Break down what a headline means for the market.",
    html: () => `
      <h2>Headline</h2>
      <blockquote>Paste the news headline here<br/><em>— Source</em></blockquote>
      <h3>My Read</h3>
      <p>What this actually means: </p>
      <h3>Market Impact</h3>
      <p>Short-term impact: <br/>Long-term impact: </p>
      <h3>Alternative Interpretation</h3>
      <p><br/></p>
    `,
  },
  {
    id: "project_research",
    label: "Project Research",
    postType: "general",
    description: "Deep-dive on a protocol, token, or team.",
    html: () => `
      <h2>Project Overview</h2>
      <p>Name: <br/>Category: <br/>Launch date: </p>
      <h3>What It Does</h3>
      <p><br/></p>
      <h3>Strengths</h3>
      <ul><li>Strength 1</li></ul>
      <h3>Weaknesses</h3>
      <ul><li>Weakness 1</li></ul>
      <hr/>
      <h3>Verdict</h3>
      <p><br/></p>
    `,
  },
  {
    id: "risk_warning",
    label: "Risk Warning",
    postType: "risk_analysis",
    description: "Highlight a specific downside trigger or red flag.",
    html: () => `
      <h2>Risk Warning</h2>
      <p>Asset or event: <br/>Main risk: </p>
      <h3>Why This Matters</h3>
      <p>Possible impact: </p>
      <h3>Invalidation</h3>
      <p>What would invalidate this risk: </p>
      <h3>Data to Watch</h3>
      <ul><li>Signal 1</li><li>Signal 2</li></ul>
    `,
  },
];

// ─── Constants ────────────────────────────────────────────────────────────────

const STANCES: CommunityStance[] = ["Bullish", "Bearish", "Neutral", "Question"];

const TOPICS = [
  "Bitcoin", "Ethereum", "Solana", "Macro", "Regulation",
  "Event", "News Reactions", "Analysis", "Questions", "Lounge",
];

const IMAGE_LIMIT_BYTES = 8 * 1024 * 1024;
const VIDEO_LIMIT_BYTES = 24 * 1024 * 1024;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getSelectedArticleSlug() {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("articleSlug")?.trim() ?? "";
}

function getInitialQuoteTarget(slug: string) {
  if (!slug) return null;
  const target = readCommunityQuoteTarget();
  return target?.slug === slug ? target : null;
}

function getInitialTopic(target: CommunityQuoteTarget | null) {
  if (!target) return "Bitcoin";
  return (TOPICS as readonly string[]).includes(target.category)
    ? target.category
    : "News Reactions";
}

function quoteTargetToHtml(target: CommunityQuoteTarget) {
  const safeTitle = escapeText(target.title);
  const safeSource = escapeText(target.sourceName);
  const safeUrl = encodeURI(target.originalUrl);
  const summary = escapeText(target.briefSummary || target.excerpt || "");
  return [
    `<h2>Headline</h2>`,
    `<blockquote>${safeTitle}<br/><em>— ${safeSource}</em></blockquote>`,
    `<h3>My Take</h3>`,
    `<p><br/></p>`,
    `<h3>Why It Matters</h3>`,
    `<p>${summary || "<br/>"}</p>`,
    `<h3>Source</h3>`,
    `<p><a href="${safeUrl}" target="_blank" rel="noreferrer noopener">${safeSource}</a></p>`,
  ].join("");
}

function escapeText(input: string) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function htmlToPlain(html: string) {
  if (typeof window === "undefined") return html;
  const div = document.createElement("div");
  div.innerHTML = html;
  return (div.textContent || "").trim();
}

async function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read file."));
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.readAsDataURL(file);
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CommunityWriteStudio({
  initialPostType = "general",
}: {
  initialPostType?: CommunityPostType;
}) {
  const router = useRouter();
  const [preferences] = usePreferences();
  const { t: copy } = useI18n(preferences.language);
  const w = copy.write;

  const stanceLabels: Record<CommunityStance, string> = {
    Bullish: w.stanceBullish,
    Bearish: w.stanceBearish,
    Neutral: w.stanceNeutral,
    Question: w.stanceQuestion,
  };

  const templateTranslations: Record<string, { label: string; description: string }> = {
    market_analysis:  { label: w.tplMarketAnalysis,  description: w.tplMarketAnalysisDesc },
    bull_case:        { label: w.tplBullCase,        description: w.tplBullCaseDesc },
    bear_case:        { label: w.tplBearCase,        description: w.tplBearCaseDesc },
    trading_review:   { label: w.tplTradingReview,   description: w.tplTradingReviewDesc },
    news_reaction:    { label: w.tplNewsReaction,    description: w.tplNewsReactionDesc },
    project_research: { label: w.tplProjectResearch, description: w.tplProjectResearchDesc },
    risk_warning:     { label: w.tplRiskWarning,     description: w.tplRiskWarningDesc },
  };

  const supabase = useMemo(() => (hasSupabaseConfig ? createClient() : null), []);
  const editorRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const [selectedArticleSlug] = useState(() => getSelectedArticleSlug());
  const [quoteTarget] = useState<CommunityQuoteTarget | null>(() =>
    getInitialQuoteTarget(selectedArticleSlug),
  );

  // Author
  const [authorName, setAuthorName] = useState(() => readAuthorName());
  const [editingAuthor, setEditingAuthor] = useState(false);
  const [authorDraft, setAuthorDraft] = useState("");

  useEffect(() => {
    if (readAuthorName()) return;
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

  // Editor state
  const [title, setTitle] = useState(() =>
    quoteTarget ? `Thoughts on ${quoteTarget.title}` : "",
  );
  const [topic, setTopic] = useState(() => getInitialTopic(quoteTarget));
  const [tagDraft, setTagDraft] = useState(() =>
    normalizeTags([
      getInitialTopic(quoteTarget),
      quoteTarget?.category ?? "",
      quoteTarget ? "News Reactions" : "",
    ]).join(", "),
  );
  const [stance, setStance] = useState<CommunityStance>("Neutral");
  const [postType, setPostType] = useState<CommunityPostType>(
    quoteTarget ? "news_interpretation" : initialPostType,
  );
  const [bodyHtml, setBodyHtml] = useState<string>(() =>
    quoteTarget ? quoteTargetToHtml(quoteTarget) : "",
  );
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(
    quoteTarget ? "news_reaction" : null,
  );
  const [templateOpen, setTemplateOpen] = useState(true);
  const [previewMode, setPreviewMode] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);

  // Initialise contentEditable with the seed HTML once.
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML === "" && bodyHtml) {
      editorRef.current.innerHTML = bodyHtml;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When a template is applied, push HTML into the surface (replaces current).
  const applyTemplate = useCallback((tpl: Template) => {
    setBodyHtml(tpl.html());
    setPostType(tpl.postType);
    setActiveTemplateId(tpl.id);
    if (editorRef.current) {
      editorRef.current.innerHTML = tpl.html();
    }
  }, []);

  const readHtmlFromEditor = useCallback(() => {
    if (!editorRef.current) return;
    const html = sanitizeHtml(editorRef.current.innerHTML);
    setBodyHtml((prev) => (prev === html ? prev : html));
  }, []);

  function exec(command: string, value?: string) {
    editorRef.current?.focus();
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

  async function handleImagePicked(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      for (const file of files) {
        if (!file.type.startsWith("image/")) continue;
        if (file.size > IMAGE_LIMIT_BYTES) {
          setError("Image is larger than 8 MB.");
          continue;
        }
        const dataUrl = await readFileAsDataUrl(file);
        insertHtmlAtCaret(
          `<p><img src="${dataUrl}" alt="" draggable="true" style="max-width:100%;border-radius:8px;cursor:grab" loading="lazy" /></p><p><br/></p>`,
        );
      }
    } finally {
      setUploading(false);
    }
  }

  async function handleVideoPicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("video/")) return;
    if (file.size > VIDEO_LIMIT_BYTES) {
      setError("Video is larger than 24 MB.");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      insertHtmlAtCaret(
        `<p><video controls src="${dataUrl}" style="max-width:100%;border-radius:8px"></video></p><p><br/></p>`,
      );
    } finally {
      setUploading(false);
    }
  }

  async function publishPost() {
    const trimmedTitle = title.trim();
    const html = sanitizeHtml(bodyHtml);
    const plain = htmlToPlain(html);
    const tags = normalizeTags([topic, tagDraft]);

    if (!trimmedTitle) { setError("Please add a title."); return; }
    if (!plain) { setError("Please add some content."); return; }

    setIsPublishing(true);
    setError(null);
    setMessage(null);

    const localPost = addOpinionPost(html, topic, {
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
        quoteTarget ? "news_reaction" :
        topic === "Analysis" ? "analysis" :
        topic === "Questions" ? "question" :
        topic === "Event" ? "event" :
        topic === "News Reactions" ? "news_reaction" :
        "opinion",
      relatedArticleSlug: quoteTarget?.slug,
      relatedArticleTitle: quoteTarget?.title,
      relatedArticleSource: quoteTarget?.sourceName,
      relatedArticleUrl: quoteTarget?.originalUrl,
      attachments: [],
      tags,
      preview: plain,
    });

    if (supabase) {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData.user;

      if (user) {
        const profileName =
          authorName ||
          (typeof user.user_metadata?.name === "string" ? user.user_metadata.name : "") ||
          (typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : "") ||
          user.email ||
          "Chain Brief member";

        const { data: existingProfile } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", user.id)
          .maybeSingle();

        if (!existingProfile) {
          const { error: profileError } = await supabase.from("profiles").insert({
            id: user.id,
            username: profileName,
          });

          if (profileError) {
            await supabase.from("profiles").insert({
              id: user.id,
              username: `${profileName}-${user.id.slice(0, 8)}`,
            });
          }
        }

        const { error: postError } = await supabase
          .from("posts")
          .insert(databaseInsertFromCommunityPost(localPost, user.id));

        if (postError) {
          setError("Saved locally, but could not sync to your Chain Brief account.");
          setIsPublishing(false);
          return;
        }
      }
    }

    if (quoteTarget) {
      clearCommunityQuoteTarget();
    }

    setIsPublishing(false);
    setMessage("Post published to Community.");
    router.push(
      quoteTarget
        ? `/community?articleSlug=${encodeURIComponent(quoteTarget.slug)}`
        : "/community",
    );
  }

  return (
    <main className="site-grid min-h-screen overflow-x-hidden pb-24">
      <Header />
      <section className="border-t border-tint/10 bg-background/72">
        <Container className="section-space">
          <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,1.2fr)_22rem]">

            {/* Editor panel */}
            <Card className="min-w-0 p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">{w.studio}</p>
                  <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink">{w.studioTitle}</h1>
                  <p className="mt-3 text-sm leading-6 text-muted">{w.studioDesc}</p>
                </div>
                <div className="flex items-center gap-2">
                  {uploading ? <span className="text-xs text-muted">Uploading…</span> : null}
                  <button
                    type="button"
                    onClick={() => setPreviewMode((v) => !v)}
                    className={cn(
                      "mt-1 shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                      previewMode
                        ? "border-accent/60 bg-accent/15 text-accent-ink"
                        : "border-tint/10 text-muted hover:border-accent/50 hover:text-ink",
                    )}
                  >
                    {previewMode ? w.editMode : w.preview}
                  </button>
                </div>
              </div>

              <div className="mt-6 grid gap-5">
                {quoteTarget ? (
                  <div className="rounded-md border border-accent/25 bg-accent-soft/25 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent-ink">
                      {w.writingAbout}
                    </p>
                    <p className="mt-2 break-words text-sm font-semibold text-ink">
                      {quoteTarget.title}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {quoteTarget.sourceName} · {quoteTarget.category}
                    </p>
                  </div>
                ) : null}

                {/* Title */}
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">{w.titleLabel}</span>
                  <input
                    className="mt-2 w-full rounded-md border border-tint/10 bg-background px-3 py-3 text-2xl font-bold text-ink outline-none transition placeholder:text-muted-2 focus:border-accent focus:ring-2 focus:ring-accent/30"
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={w.titlePlaceholder}
                    value={title}
                  />
                </label>

                {/* Topic + Stance */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">{w.topicLabel}</span>
                    <select
                      className="mt-2 h-11 w-full rounded-md border border-tint/10 bg-background px-3 text-sm text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30"
                      onChange={(e) => setTopic(e.target.value)}
                      value={topic}
                    >
                      {TOPICS.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </label>

                  <div>
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">{w.stanceLabel}</span>
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
                              ? "border-accent/60 bg-accent/20 text-accent-ink"
                              : "border-tint/10 bg-tint/[0.03] text-muted hover:border-accent/50 hover:text-ink",
                          )}
                        >
                          {stanceLabels[s]}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">SEO tags</span>
                  <input
                    className="mt-2 h-11 w-full rounded-md border border-tint/10 bg-background px-3 text-sm text-ink outline-none transition placeholder:text-muted-2 focus:border-accent focus:ring-2 focus:ring-accent/30"
                    onChange={(e) => setTagDraft(e.target.value)}
                    placeholder="BTC, ETF, Macro, Solana"
                    value={tagDraft}
                  />
                  <p className="mt-2 text-xs leading-5 text-muted">
                    Use comma-separated tags. They become community filters and indexable topic links.
                  </p>
                </label>

                {/* Toolbar + WYSIWYG surface */}
                <div>
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">{w.contentLabel}</span>

                  {!previewMode && (
                    <div className="mt-2 flex flex-wrap items-center gap-1 rounded-md border border-tint/10 bg-tint/[0.03] p-1 text-xs font-semibold text-ink">
                      <ToolbarButton onClick={() => exec("bold")} title="Bold (Ctrl+B)">
                        <span className="font-bold">B</span>
                      </ToolbarButton>
                      <ToolbarButton onClick={() => exec("italic")} title="Italic (Ctrl+I)">
                        <em>I</em>
                      </ToolbarButton>
                      <ToolbarButton onClick={() => exec("underline")} title="Underline (Ctrl+U)">
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
                      <ToolbarButton onClick={insertLink} title="Insert link">Link</ToolbarButton>
                      <ToolbarButton
                        onClick={() => imageInputRef.current?.click()}
                        title="Insert image"
                        disabled={uploading}
                      >
                        Image
                      </ToolbarButton>
                      <ToolbarButton
                        onClick={() => videoInputRef.current?.click()}
                        title="Insert video"
                        disabled={uploading}
                      >
                        Video
                      </ToolbarButton>
                      <span className="mx-1 h-5 w-px bg-tint/15" />
                      <ToolbarButton onClick={() => exec("removeFormat")} title="Clear formatting">Clear</ToolbarButton>
                    </div>
                  )}

                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    multiple
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

                  {previewMode ? (
                    <div
                      className="prose-insight mt-3 min-h-40 rounded-md border border-tint/10 bg-tint/[0.02] px-5 py-5 text-[15px] leading-7 text-ink"
                      dangerouslySetInnerHTML={{ __html: sanitizeHtml(bodyHtml) || `<p class="text-muted-2">Nothing to preview yet.</p>` }}
                    />
                  ) : (
                    <div
                      ref={editorRef}
                      contentEditable
                      suppressContentEditableWarning
                      onInput={readHtmlFromEditor}
                      onBlur={readHtmlFromEditor}
                      data-placeholder="Share your take. Quote a headline, add a chart, walk through your reasoning…"
                      className="insights-editor mt-2 min-h-[28rem] rounded-md border border-tint/10 bg-background px-5 py-5 text-[15px] leading-7 text-ink outline-none focus:border-accent/50"
                    />
                  )}
                </div>

                {postType !== "general" && (
                  <div className="rounded-md border border-amber-400/20 bg-amber-400/10 px-3 py-2">
                    <p className="text-xs leading-5 text-amber-100">{w.investmentNotice}</p>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <Button disabled={isPublishing} onClick={publishPost} type="button">
                    {isPublishing ? w.publishing : w.publish}
                  </Button>
                  <Button href="/community" variant="secondary">{w.cancel}</Button>
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
              <Card className="min-w-0 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">{w.postingAs}</p>

                {editingAuthor ? (
                  <div className="mt-3 flex gap-2">
                    <input
                      autoFocus
                      className="min-h-9 flex-1 rounded-md border border-accent/50 bg-background px-3 text-sm text-ink outline-none focus:ring-2 focus:ring-accent/30"
                      onKeyDown={(e) => { if (e.key === "Enter") saveAuthorName(); if (e.key === "Escape") setEditingAuthor(false); }}
                      onChange={(e) => setAuthorDraft(e.target.value)}
                      placeholder={w.namePlaceholder}
                      value={authorDraft}
                    />
                    <button
                      type="button"
                      onClick={saveAuthorName}
                      className="rounded-md border border-accent/50 bg-accent/15 px-3 py-1.5 text-xs font-semibold text-accent-ink transition hover:bg-accent/25"
                    >
                      {w.save}
                    </button>
                  </div>
                ) : (
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-accent/30 bg-accent/15 text-xs font-bold text-accent-ink">
                        {authorName ? authorName.slice(0, 2).toUpperCase() : "?"}
                      </div>
                      <span className="truncate text-sm font-semibold text-ink">
                        {authorName || <span className="italic text-muted-2">{w.noNameSet}</span>}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setAuthorDraft(authorName); setEditingAuthor(true); }}
                      className="shrink-0 rounded-md border border-tint/10 px-2.5 py-1 text-xs font-semibold text-muted transition hover:border-accent/50 hover:text-accent"
                    >
                      {w.editName}
                    </button>
                  </div>
                )}

                {!authorName && !editingAuthor && (
                  <p className="mt-2 text-xs leading-5 text-amber-200/80">
                    {w.nameHint}
                  </p>
                )}
              </Card>

              <Card className="overflow-hidden p-0">
                <button
                  type="button"
                  onClick={() => setTemplateOpen((v) => !v)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">{w.postTemplates}</p>
                  <span className="text-xs text-muted">{templateOpen ? "▲" : "▼"}</span>
                </button>
                {templateOpen && (
                  <div className="grid gap-2 border-t border-tint/[0.06] px-3 pb-3 pt-2">
                    {TEMPLATES.map((tpl) => (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => applyTemplate(tpl)}
                        className={cn(
                          "rounded-xl border p-3 text-left transition",
                          activeTemplateId === tpl.id
                            ? "border-accent/60 bg-accent/10"
                            : "border-tint/[0.06] bg-tint/[0.02] hover:border-accent/40 hover:bg-tint/[0.04]",
                        )}
                      >
                        <p className="text-sm font-semibold text-ink">{templateTranslations[tpl.id]?.label ?? tpl.label}</p>
                        <p className="mt-1 text-xs leading-5 text-muted">{templateTranslations[tpl.id]?.description ?? tpl.description}</p>
                      </button>
                    ))}
                  </div>
                )}
              </Card>

              <Card className="p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">{w.reminder}</p>
                <p className="mt-3 text-sm leading-6 text-muted">{w.reminderText}</p>
              </Card>
            </aside>

          </div>
        </Container>
      </section>
    </main>
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
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="rounded px-2 py-1 text-xs hover:bg-tint/[0.08] disabled:opacity-40"
    >
      {children}
    </button>
  );
}
