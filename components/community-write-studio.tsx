"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { Header } from "@/components/header";
import {
  addOpinionPost,
  type CommunityAttachment,
  type CommunityPostType,
  type CommunityStance,
} from "@/lib/community";
import { cn } from "@/lib/cn";

const STANCES: CommunityStance[] = ["Bullish", "Bearish", "Neutral", "Question"];

const TOPICS = [
  "Bitcoin",
  "Ethereum",
  "Solana",
  "Macro",
  "Regulation",
  "Event",
  "News Reactions",
  "Analysis",
  "Questions",
  "Lounge",
];

const POST_TYPES: Array<{ value: CommunityPostType; label: string; description: string }> = [
  { value: "general", label: "General", description: "Casual community thoughts and quick takes." },
  {
    value: "news_interpretation",
    label: "News Interpretation",
    description: "Break down what a market headline means.",
  },
  {
    value: "chart_analysis",
    label: "Chart Analysis",
    description: "Map out support, resistance, and scenarios.",
  },
  {
    value: "trade_review",
    label: "Trading Review",
    description: "Review your entry, exit, and lesson learned.",
  },
  {
    value: "loss_review",
    label: "Loss Review",
    description: "Document risk mistakes and emotional bias.",
  },
  {
    value: "risk_analysis",
    label: "Risk Analysis",
    description: "Focus on downside triggers and invalidation.",
  },
];

const POST_TEMPLATES: Record<CommunityPostType, string> = {
  general: "",
  news_interpretation: `1. What is the key point of this news?
2. Is this bullish, bearish, or neutral?
3. Why do you think so?
4. Short-term impact:
5. Long-term impact:
6. Alternative scenario:
7. Key risks to watch:`,
  chart_analysis: `1. Asset:
2. Timeframe:
3. Current trend:
4. Key support:
5. Key resistance:
6. Bullish scenario:
7. Bearish scenario:
8. Invalidation condition:
9. Personal view:`,
  trade_review: `1. Entry reason:
2. Exit reason:
3. What went well:
4. What went wrong:
5. What I will improve next time:
6. Lesson learned:`,
  loss_review: `1. What happened:
2. Original reasoning:
3. Missed risk:
4. Emotional mistake:
5. What I would do differently:
6. Lesson learned:`,
  risk_analysis: `1. Asset or event:
2. Main risk:
3. Possible impact:
4. What could invalidate this risk:
5. Data or news to monitor:
6. Personal view:`,
};

const INVESTMENT_NOTICE =
  "This content is for informational and educational purposes only and is not financial advice. Crypto assets involve risk of loss. All investment decisions are the sole responsibility of the user.";

const MAX_ATTACHMENTS = 6;
const IMAGE_LIMIT_BYTES = 8 * 1024 * 1024;
const VIDEO_LIMIT_BYTES = 24 * 1024 * 1024;

type AttachmentDraft = CommunityAttachment & { previewUrl: string };

export function CommunityWriteStudio({
  initialPostType = "general",
}: {
  initialPostType?: CommunityPostType;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("Bitcoin");
  const [postType, setPostType] = useState<CommunityPostType>(initialPostType);
  const [body, setBody] = useState(POST_TEMPLATES[initialPostType]);
  const [stance, setStance] = useState<CommunityStance>("Neutral");
  const [attachments, setAttachments] = useState<AttachmentDraft[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);

  const template = POST_TEMPLATES[postType];

  async function handleFiles(files: FileList | null) {
    if (!files?.length) {
      return;
    }

    const availableSlots = Math.max(0, MAX_ATTACHMENTS - attachments.length);
    if (availableSlots === 0) {
      setError(`You can attach up to ${MAX_ATTACHMENTS} files.`);
      return;
    }

    const selected = Array.from(files).slice(0, availableSlots);
    const nextItems: AttachmentDraft[] = [];

    for (const file of selected) {
      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");

      if (!isImage && !isVideo) {
        setError("Only image and video files are supported.");
        continue;
      }

      const limit = isImage ? IMAGE_LIMIT_BYTES : VIDEO_LIMIT_BYTES;
      if (file.size > limit) {
        setError(
          isImage
            ? "Image files must be 8MB or smaller."
            : "Video files must be 24MB or smaller.",
        );
        continue;
      }

      const dataUrl = await readFileAsDataUrl(file);
      nextItems.push({
        id: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
        kind: isImage ? "image" : "video",
        name: file.name,
        mimeType: file.type,
        dataUrl,
        size: file.size,
        previewUrl: dataUrl,
      });
    }

    if (nextItems.length) {
      setAttachments((current) => [...current, ...nextItems].slice(0, MAX_ATTACHMENTS));
      setMessage("Media added. Review the preview before publishing.");
      setError(null);
    }
  }

  function handleTypeChange(nextType: CommunityPostType) {
    const nextTemplate = POST_TEMPLATES[nextType];

    setPostType(nextType);
    if (!body.trim() || body === template) {
      setBody(nextTemplate);
    }
  }

  function removeAttachment(id: string) {
    setAttachments((current) => current.filter((item) => item.id !== id));
  }

  function publishPost() {
    const trimmedTitle = title.trim();
    const trimmedBody = body.trim();

    if (!trimmedTitle || !trimmedBody) {
      setError("Please add both a title and body.");
      return;
    }

    setIsPublishing(true);
    setError(null);
    setMessage(null);

    addOpinionPost(trimmedBody, topic, {
      title: trimmedTitle,
      stance,
      postType,
      analystTier:
        postType === "general"
          ? undefined
          : postType === "risk_analysis"
            ? "rising_analyst"
            : "rookie_analyst",
      discussionType:
        topic === "Analysis"
          ? "analysis"
          : topic === "Questions"
            ? "question"
            : topic === "Event"
              ? "event"
              : topic === "News Reactions"
                ? "news_reaction"
                : "opinion",
      attachments: attachments.map(({ previewUrl, ...attachment }) => attachment),
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
            <Card className="min-w-0 p-5 sm:p-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
                  Writing Studio
                </p>
                <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink">
                  Write with a clear direction.
                </h1>
                <p className="mt-3 text-sm leading-6 text-muted">
                  Pick a post type, fill in the template, and attach images or short videos
                  when they help the analysis.
                </p>
              </div>

              <div className="mt-6 grid gap-5">
                <section className="grid gap-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                    Choose a direction
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {POST_TYPES.map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => handleTypeChange(item.value)}
                        className={cn(
                          "rounded-xl border p-4 text-left transition",
                          postType === item.value
                            ? "border-accent/60 bg-accent/15"
                            : "border-white/10 bg-white/[0.03] hover:border-accent/50 hover:bg-white/[0.05]",
                        )}
                      >
                        <p className="text-sm font-semibold text-ink">{item.label}</p>
                        <p className="mt-2 text-xs leading-5 text-muted">{item.description}</p>
                      </button>
                    ))}
                  </div>
                </section>

                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                    Title
                  </span>
                  <input
                    className="mt-2 h-11 w-full rounded-md border border-white/10 bg-background px-3 text-sm text-ink outline-none transition placeholder:text-muted-2 focus:border-accent focus:ring-2 focus:ring-accent/30"
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="Short, clear title"
                    value={title}
                  />
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                      Topic
                    </span>
                    <select
                      className="mt-2 h-11 w-full rounded-md border border-white/10 bg-background px-3 text-sm text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30"
                      onChange={(event) => setTopic(event.target.value)}
                      value={topic}
                    >
                      {TOPICS.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div>
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                      Stance
                    </span>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {STANCES.map((item) => (
                        <button
                          key={item}
                          type="button"
                          aria-pressed={stance === item}
                          onClick={() => setStance(item)}
                          className={cn(
                            "rounded-full border px-3 py-1.5 text-xs font-bold transition",
                            stance === item
                              ? "border-accent/60 bg-accent/20 text-blue-100"
                              : "border-white/10 bg-white/[0.03] text-muted hover:border-accent/50 hover:text-ink",
                          )}
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                    Body
                  </span>
                  <textarea
                    className="mt-2 min-h-56 w-full rounded-md border border-white/10 bg-background px-4 py-3 text-sm text-ink outline-none transition placeholder:text-muted-2 focus:border-accent focus:ring-2 focus:ring-accent/30"
                    onChange={(event) => setBody(event.target.value)}
                    placeholder="Write the analysis, context, and your reasoning."
                    value={body}
                  />
                </label>

                {postType !== "general" ? (
                  <div className="rounded-md border border-amber-400/20 bg-amber-400/10 px-3 py-2">
                    <p className="text-xs leading-5 text-amber-100">{INVESTMENT_NOTICE}</p>
                  </div>
                ) : null}

                <section className="grid gap-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                        Media
                      </p>
                      <p className="mt-1 text-xs leading-5 text-muted-2">
                        Images and videos are previewed locally before publishing.
                      </p>
                    </div>
                    <Button
                      variant="secondary"
                      onClick={() => fileInputRef.current?.click()}
                      type="button"
                    >
                      Add image / video
                    </Button>
                    <input
                      ref={fileInputRef}
                      accept="image/*,video/*"
                      className="hidden"
                      multiple
                      onChange={(event) => {
                        void handleFiles(event.target.files);
                        event.target.value = "";
                      }}
                      type="file"
                    />
                  </div>

                  {attachments.length ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {attachments.map((attachment) => (
                        <article
                          key={attachment.id}
                          className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]"
                        >
                          {attachment.kind === "image" ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              alt={attachment.name}
                              className="aspect-video w-full object-cover"
                              src={attachment.previewUrl}
                            />
                          ) : (
                            <video
                              className="aspect-video w-full bg-black object-cover"
                              controls
                              src={attachment.previewUrl}
                            />
                          )}
                          <div className="flex items-center justify-between gap-3 p-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-ink">
                                {attachment.name}
                              </p>
                              <p className="text-xs text-muted-2">
                                {attachment.kind === "image" ? "Image" : "Video"} •{" "}
                                {(attachment.size / (1024 * 1024)).toFixed(1)} MB
                              </p>
                            </div>
                            <button
                              className="text-xs font-semibold text-muted transition hover:text-ink"
                              onClick={() => removeAttachment(attachment.id)}
                              type="button"
                            >
                              Remove
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-4 text-sm leading-6 text-muted">
                      Add up to {MAX_ATTACHMENTS} media files to support your analysis.
                    </div>
                  )}
                </section>

                <div className="flex flex-wrap gap-2">
                  <Button disabled={isPublishing} onClick={publishPost} type="button">
                    {isPublishing ? "Publishing..." : "Publish"}
                  </Button>
                  <Button href="/community" variant="secondary">
                    Cancel
                  </Button>
                </div>

                {message ? (
                  <div className="rounded-md border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm leading-6 text-emerald-100">
                    {message}
                  </div>
                ) : null}
                {error ? (
                  <div className="rounded-md border border-rose-400/20 bg-rose-400/10 p-4 text-sm leading-6 text-rose-100">
                    {error}
                  </div>
                ) : null}
              </div>
            </Card>

            <aside className="space-y-3">
              <Card className="p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                  Writing directions
                </p>
                <div className="mt-3 grid gap-2">
                  {POST_TYPES.map((item, index) => (
                    <div
                      key={item.value}
                      className="flex items-start justify-between gap-3 rounded-md border border-white/10 bg-white/[0.03] px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-ink">
                          {index + 1}. {item.label}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-muted">{item.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                  Selected template
                </p>
                <pre className="mt-3 overflow-auto whitespace-pre-wrap break-words text-xs leading-6 text-muted">
                  {template || "No template for general posts."}
                </pre>
              </Card>

              <Card className="p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                  Reminder
                </p>
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

async function readFileAsDataUrl(file: File) {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read file."));
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.readAsDataURL(file);
  });
}
