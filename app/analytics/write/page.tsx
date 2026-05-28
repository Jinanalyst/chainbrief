"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { cn } from "@/lib/cn";
import { createClient } from "@/lib/supabase/client";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import {
  publishAnalystPost,
  upsertAnalystProfile,
  readAnalystProfile,
  slugifyAnalyst,
} from "@/lib/analyst-posts";
import { readAuthorName } from "@/lib/community";

const TOPICS = [
  "Bitcoin", "Ethereum", "Solana", "DeFi", "Macro",
  "Layer2", "Security", "NFT", "Regulation", "General",
];

export default function AnalystWritePage() {
  const router = useRouter();
  const supabase = useMemo(() => (hasSupabaseConfig ? createClient() : null), []);

  const [authorName, setAuthorName] = useState("");
  const [authorBio, setAuthorBio] = useState("");
  const [membershipPrice, setMembershipPrice] = useState(5);
  const [membershipEnabled, setMembershipEnabled] = useState(false);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [topic, setTopic] = useState("Bitcoin");
  const [isPremium, setIsPremium] = useState(false);
  const [notifySubscribers, setNotifySubscribers] = useState(true);
  const [previewMode, setPreviewMode] = useState(false);

  const [isPublishing, setIsPublishing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analystId = useMemo(() => slugifyAnalyst(authorName), [authorName]);
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);

  // Fetch live subscriber count from API when analystId changes
  useEffect(() => {
    if (!analystId || analystId === "analyst") return;
    fetch(`/api/analytics/subscribers?analystId=${encodeURIComponent(analystId)}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data: { count?: number } | null) => {
        if (data && typeof data.count === "number") {
          setSubscriberCount(data.count);
        }
      })
      .catch(() => {});
  }, [analystId]);

  useEffect(() => {
    // Resolve author name from localStorage > Supabase metadata
    const saved = readAuthorName();
    if (saved) {
      const timer = window.setTimeout(() => {
        setAuthorName(saved);
        const profile = readAnalystProfile(slugifyAnalyst(saved));
        if (profile) {
          setAuthorBio(profile.bio);
          setMembershipPrice(profile.membershipPrice);
          setMembershipEnabled(profile.membershipEnabled);
        }
      }, 0);
      return () => window.clearTimeout(timer);
    }
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => {
      const user = data.user;
      if (!user) return;
      setUserId(user.id);
      const profile = user.user_metadata?.chainBriefProfile as { displayName?: string } | undefined;
      const name =
        profile?.displayName ??
        (typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : null) ??
        user.email ??
        "";
      if (name) setAuthorName(name);
    });
  }, [supabase]);

  const preview = body.trim().slice(0, 160) + (body.trim().length > 160 ? "…" : "");
  const avatar = authorName.slice(0, 2).toUpperCase() || "AN";

  async function publish() {
    if (!title.trim()) { setError("Please add a title."); return; }
    if (!body.trim()) { setError("Please add content."); return; }
    if (!authorName.trim()) { setError("Please set your author name."); return; }

    setIsPublishing(true);
    setError(null);

    // Save/update analyst profile
    upsertAnalystProfile({
      id: analystId,
      name: authorName.trim(),
      bio: authorBio.trim(),
      avatar,
      membershipPrice,
      membershipEnabled,
    });

    // Publish the post
    const post = publishAnalystPost({
      analystId,
      analystName: authorName.trim(),
      analystBio: authorBio.trim(),
      analystAvatar: avatar,
      title: title.trim(),
      preview,
      body: body.trim(),
      isPremium,
      tags: [topic],
      topic,
    });

    // Mirror to Supabase posts table so the dashboard counts it
    if (supabase && userId) {
      supabase.from("posts").insert({
        author_id: userId,
        title: title.trim(),
        body: body.trim(),
        category: topic,
        post_type: isPremium ? "premium" : "general",
        coin_tags: [topic],
        status: "published",
      }).then(({ error }) => {
        if (error) console.warn("[write] posts insert:", error.message);
      });
    }

    // Notify subscribers via API (fire-and-forget)
    if (notifySubscribers && subscriberCount > 0) {
      try {
        await fetch("/api/analytics/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "notify",
            analystId,
            analystName: authorName.trim(),
            postTitle: post.title,
            postPreview: post.preview,
            postId: post.id,
          }),
        });
      } catch {
        // Notification is best-effort
      }
    }

    setIsPublishing(false);
    setMessage(
      notifySubscribers && subscriberCount > 0
        ? `Published! Email sent to ${subscriberCount} subscriber${subscriberCount !== 1 ? "s" : ""}.`
        : "Published to your analyst page.",
    );

    setTimeout(() => {
      router.push(`/analysts/${analystId}`);
    }, 1800);
  }

  return (
    <main className="site-grid min-h-screen overflow-x-hidden pb-24">
      <Header />
      <section className="border-t border-tint/10 bg-background/72">
        <Container className="section-space">
          <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">

            {/* ── Editor ── */}
            <Card className="min-w-0 p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
                    Analyst Newsletter
                  </p>
                  <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
                    Write & publish
                  </h1>
                </div>
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
                  {previewMode ? "← Edit" : "Preview"}
                </button>
              </div>

              {previewMode ? (
                /* ── Preview ── */
                <div className="mt-5 rounded-2xl border border-tint/10 bg-surface/60 overflow-hidden">
                  <div className="h-1 w-full bg-gradient-to-r from-accent/60 to-blue-400/30" />
                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-accent/30 bg-accent/15 text-sm font-bold text-accent-ink">
                        {avatar}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-ink">{authorName || "Your Name"}</p>
                        <p className="text-xs text-muted-2">{new Date().toLocaleDateString()}</p>
                      </div>
                      {isPremium && (
                        <span className="ml-auto rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider text-amber-200">
                          Premium
                        </span>
                      )}
                    </div>
                    <h2 className="text-xl font-semibold text-ink">{title || "Your title"}</h2>
                    <p className="mt-1 text-xs text-muted-2">#{topic}</p>
                    <p className="mt-3 text-sm leading-7 text-muted whitespace-pre-wrap">
                      {body || "Your content will appear here…"}
                    </p>
                  </div>
                </div>
              ) : (
                /* ── Editor fields ── */
                <div className="mt-5 grid gap-4">
                  <label className="block">
                    <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Title</span>
                    <input
                      className="mt-2 min-h-11 w-full rounded-md border border-tint/10 bg-background px-4 text-sm text-ink outline-none transition placeholder:text-muted-2 focus:border-accent focus:ring-2 focus:ring-accent/30"
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Research headline…"
                      value={title}
                    />
                  </label>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Topic</span>
                      <select
                        className="mt-2 min-h-11 w-full rounded-md border border-tint/10 bg-background px-4 text-sm text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30"
                        onChange={(e) => setTopic(e.target.value)}
                        value={topic}
                      >
                        {TOPICS.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </label>

                    <div>
                      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Access</span>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        {[
                          { value: false, label: "Free", desc: "Everyone" },
                          { value: true, label: "Premium", desc: "Subscribers" },
                        ].map((opt) => (
                          <button
                            key={String(opt.value)}
                            type="button"
                            onClick={() => setIsPremium(opt.value)}
                            className={cn(
                              "rounded-xl border p-2.5 text-left transition",
                              isPremium === opt.value
                                ? "border-accent/60 bg-accent/10"
                                : "border-tint/[0.08] bg-tint/[0.02] hover:border-tint/20",
                            )}
                          >
                            <p className="text-xs font-semibold text-ink">{opt.label}</p>
                            <p className="text-[0.65rem] text-muted">{opt.desc}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <label className="block">
                    <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                      Content
                    </span>
                    <textarea
                      className="mt-2 min-h-72 w-full rounded-md border border-tint/10 bg-background px-4 py-3 text-sm leading-7 text-ink outline-none transition placeholder:text-muted-2 focus:border-accent focus:ring-2 focus:ring-accent/30"
                      onChange={(e) => setBody(e.target.value)}
                      placeholder={`Share your analysis, thesis, key data points, and risk assessment…\n\nTip: Include your sources, acknowledge uncertainty, and always mention risk.`}
                      value={body}
                    />
                    <span className="mt-1 block text-right text-xs text-muted-2">
                      {body.length} chars
                    </span>
                  </label>

                  {isPremium && (
                    <div className="rounded-md border border-amber-400/20 bg-amber-400/10 px-3 py-2.5">
                      <p className="text-xs leading-5 text-amber-100">
                        Premium posts show only a preview to non-subscribers. Make sure your preview (first 160 chars) is compelling.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Button disabled={isPublishing} onClick={publish} type="button">
                  {isPublishing ? "Publishing…" : "Publish post"}
                </Button>
                <Button href="/analytics/dashboard" variant="secondary">Cancel</Button>
                {subscriberCount > 0 && (
                  <label className="flex items-center gap-2 text-xs text-muted cursor-pointer">
                    <input
                      checked={notifySubscribers}
                      className="rounded"
                      onChange={(e) => setNotifySubscribers(e.target.checked)}
                      type="checkbox"
                    />
                    Notify {subscriberCount} subscriber{subscriberCount !== 1 ? "s" : ""} by email
                  </label>
                )}
              </div>

              {message && (
                <div className="mt-4 rounded-md border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-100">
                  {message}
                </div>
              )}
              {error && (
                <div className="mt-4 rounded-md border border-rose-400/20 bg-rose-400/10 p-4 text-sm text-rose-100">
                  {error}
                </div>
              )}
            </Card>

            {/* ── Sidebar ── */}
            <aside className="space-y-3 lg:sticky lg:top-24 lg:self-start">

              {/* Author identity */}
              <Card className="p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Your Identity</p>
                <div className="mt-3 grid gap-3">
                  <label className="block">
                    <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-2">Display name</span>
                    <input
                      className="mt-1.5 min-h-9 w-full rounded-md border border-tint/10 bg-background px-3 text-sm text-ink outline-none transition placeholder:text-muted-2 focus:border-accent"
                      onChange={(e) => setAuthorName(e.target.value)}
                      placeholder="Your name"
                      value={authorName}
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-2">Bio (optional)</span>
                    <textarea
                      className="mt-1.5 min-h-20 w-full rounded-md border border-tint/10 bg-background px-3 py-2 text-sm text-ink outline-none transition placeholder:text-muted-2 focus:border-accent"
                      onChange={(e) => setAuthorBio(e.target.value)}
                      placeholder="Short bio shown on your analyst page"
                      value={authorBio}
                    />
                  </label>
                </div>
              </Card>

              {/* Membership settings */}
              <Card className="p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Membership</p>
                <div className="mt-3 grid gap-3">
                  <label className="flex items-center gap-3 rounded-xl border border-tint/10 bg-tint/[0.03] px-3 py-2.5 cursor-pointer">
                    <input
                      checked={membershipEnabled}
                      onChange={(e) => setMembershipEnabled(e.target.checked)}
                      type="checkbox"
                    />
                    <div>
                      <p className="text-xs font-semibold text-ink">Enable premium tier</p>
                      <p className="text-[0.65rem] text-muted">Gate select posts behind membership</p>
                    </div>
                  </label>
                  {membershipEnabled && (
                    <label className="block">
                      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-2">
                        Monthly price (USD)
                      </span>
                      <input
                        className="mt-1.5 min-h-9 w-full rounded-md border border-tint/10 bg-background px-3 text-sm text-ink outline-none transition focus:border-accent"
                        max={99}
                        min={1}
                        onChange={(e) => setMembershipPrice(Number(e.target.value))}
                        step={1}
                        type="number"
                        value={membershipPrice}
                      />
                    </label>
                  )}
                </div>
              </Card>

              {/* Subscriber stats */}
              <Card className="p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Subscribers</p>
                <p className="mt-3 text-3xl font-semibold text-ink">{subscriberCount}</p>
                <p className="mt-1 text-xs text-muted-2">
                  {subscriberCount === 0
                    ? "No subscribers yet. Share your analyst page to grow."
                    : `${subscriberCount} will receive an email when you publish.`}
                </p>
                {analystId && (
                  <a
                    href={`/analysts/${analystId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 block text-xs font-semibold text-accent underline-offset-2 hover:underline"
                  >
                    View my analyst page →
                  </a>
                )}
              </Card>

              {/* Tips */}
              <Card className="p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Writing tips</p>
                <ul className="mt-3 grid gap-2 text-xs leading-5 text-muted">
                  {[
                    "Lead with your clearest point",
                    "Cite sources and data",
                    "Always acknowledge risk and uncertainty",
                    "A free post builds trust — gate only premium depth",
                    "Consistency grows subscribers faster than quality alone",
                  ].map((tip) => (
                    <li key={tip} className="flex gap-2">
                      <span className="shrink-0 text-accent">·</span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </Card>
            </aside>
          </div>
        </Container>
      </section>
    </main>
  );
}
