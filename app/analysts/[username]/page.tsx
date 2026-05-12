"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { cn } from "@/lib/cn";
import {
  readAnalystPostsByAuthor,
  readAnalystProfile,
  isSubscribedTo,
  subscribeToAnalyst,
  unsubscribeFromAnalyst,
  type AnalystPost,
  type AnalystProfile,
} from "@/lib/analyst-posts";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AnalystNewsletterPage() {
  const { username } = useParams<{ username: string }>();
  const searchParams = useSearchParams();

  const [posts, setPosts] = useState<AnalystPost[]>([]);
  const [profile, setProfile] = useState<AnalystProfile | null>(null);
  const [subscribed, setSubscribed] = useState(false);
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);
  const [checkoutBanner, setCheckoutBanner] = useState<"success" | "cancelled" | null>(null);

  // Fetch live subscriber count from API
  const fetchSubscriberCount = useCallback(async () => {
    try {
      const res = await fetch(`/api/analyst/subscribers?analystId=${encodeURIComponent(username)}`);
      if (res.ok) {
        const data = (await res.json()) as { count?: number };
        const apiCount = data.count ?? 0;
        setSubscriberCount((prev) => Math.max(prev, apiCount));
      }
    } catch {
      // silently ignore — localStorage count is still shown
    }
  }, [username]);

  useEffect(() => {
    const analystPosts = readAnalystPostsByAuthor(username);
    setPosts(analystPosts);
    setProfile(readAnalystProfile(username));
    setSubscribed(isSubscribedTo(username));

    fetchSubscriberCount();
  }, [username, fetchSubscriberCount]);

  // Show checkout result banner from Stripe redirect
  useEffect(() => {
    const checkout = searchParams.get("checkout");
    if (checkout === "success") {
      setCheckoutBanner("success");
      setTimeout(() => setCheckoutBanner(null), 6000);
    } else if (checkout === "cancelled") {
      setCheckoutBanner("cancelled");
      setTimeout(() => setCheckoutBanner(null), 4000);
    }
  }, [searchParams]);

  const analystName = posts[0]?.analystName ?? profile?.name ?? username;
  const bio = profile?.bio ?? posts[0]?.analystBio ?? "";
  const avatar = posts[0]?.analystAvatar ?? analystName.slice(0, 2).toUpperCase();
  const membershipPrice = profile?.membershipPrice ?? 5;
  const membershipEnabled = profile?.membershipEnabled ?? false;
  const freePosts = posts.filter((p) => !p.isPremium);
  const premiumPosts = posts.filter((p) => p.isPremium);

  async function handleSubscribeSuccess(email: string, plan: "free" | "premium") {
    if (plan === "premium" && membershipEnabled) {
      // Kick off Stripe checkout — open in same tab
      try {
        const res = await fetch("/api/analyst/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            analystId: username,
            analystName,
            priceUsd: membershipPrice,
            userEmail: email,
          }),
        });
        if (res.ok) {
          const data = (await res.json()) as { url?: string; error?: string };
          if (data.url) {
            window.location.href = data.url;
            return;
          }
        }
      } catch {
        // Fall through to free subscribe
      }
    }

    // Free subscribe (or Stripe unavailable fallback)
    subscribeToAnalyst(username, email);
    setSubscribed(true);
    setSubscriberCount((c) => c + 1);
    setShowSubscribeModal(false);

    // Persist to Supabase + send welcome email
    fetch("/api/analyst/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "subscribe", analystId: username, analystName, email, plan }),
    }).catch(() => {});
  }

  function handleUnsubscribe() {
    unsubscribeFromAnalyst(username);
    setSubscribed(false);
    setSubscriberCount((c) => Math.max(0, c - 1));
  }

  if (posts.length === 0 && !profile) {
    return (
      <main className="site-grid min-h-screen overflow-x-hidden">
        <Header />
        <section className="border-t border-white/10 bg-background/72">
          <Container className="section-space">
            <Card className="p-8 text-center">
              <p className="text-lg font-semibold text-ink">Analyst not found</p>
              <p className="mt-2 text-sm text-muted">This analyst hasn't published anything yet.</p>
              <Button className="mt-5" href="/analysts">Browse analysts</Button>
            </Card>
          </Container>
        </section>
      </main>
    );
  }

  return (
    <main className="site-grid min-h-screen overflow-x-hidden pb-24">
      <Header />

      {/* Checkout result banners */}
      {checkoutBanner === "success" && (
        <div className="fixed inset-x-0 top-16 z-50 flex justify-center px-4 pt-3">
          <div className="flex w-full max-w-md items-center gap-3 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-5 py-4 shadow-xl backdrop-blur-sm">
            <span className="text-lg">✅</span>
            <div>
              <p className="text-sm font-semibold text-emerald-200">Payment successful!</p>
              <p className="text-xs text-emerald-300/70">Welcome to the premium tier. Your full access is now active.</p>
            </div>
          </div>
        </div>
      )}
      {checkoutBanner === "cancelled" && (
        <div className="fixed inset-x-0 top-16 z-50 flex justify-center px-4 pt-3">
          <div className="flex w-full max-w-md items-center gap-3 rounded-2xl border border-white/10 bg-surface/80 px-5 py-4 shadow-xl backdrop-blur-sm">
            <span className="text-lg">ℹ️</span>
            <p className="text-sm text-muted">Checkout cancelled. You can subscribe anytime.</p>
          </div>
        </div>
      )}

      {/* Subscribe modal */}
      {showSubscribeModal && (
        <SubscribeModal
          analystName={analystName}
          analystId={username}
          membershipEnabled={membershipEnabled}
          membershipPrice={membershipPrice}
          onSuccess={handleSubscribeSuccess}
          onClose={() => setShowSubscribeModal(false)}
        />
      )}

      {/* Hero / Profile header */}
      <section className="border-t border-white/10 bg-gradient-to-b from-accent/[0.06] to-background/0">
        <Container className="py-10 sm:py-14">
          <div className="mx-auto max-w-2xl">
            {/* Breadcrumb */}
            <p className="mb-5 text-xs text-muted-2">
              <Link href="/analysts" className="hover:text-accent">Analysts</Link>
              {" / "}
              <span className="text-muted">{analystName}</span>
            </p>

            {/* Avatar + name */}
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 border-accent/30 bg-accent/15 text-xl font-bold text-blue-100">
                {avatar}
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                  Chain Brief Analyst
                </p>
                <h1 className="mt-1 text-2xl font-semibold text-ink sm:text-3xl">
                  {analystName}
                </h1>
              </div>
            </div>

            {/* Bio */}
            {bio && (
              <p className="mt-4 text-sm leading-7 text-muted sm:text-base">{bio}</p>
            )}

            {/* Stats */}
            <div className="mt-5 flex flex-wrap items-center gap-4 text-sm text-muted">
              <span className="flex items-center gap-1.5">
                <span className="font-bold text-ink">{subscriberCount}</span> subscriber{subscriberCount !== 1 ? "s" : ""}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="font-bold text-ink">{posts.length}</span> post{posts.length !== 1 ? "s" : ""}
              </span>
              {membershipEnabled && (
                <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-0.5 text-xs font-semibold text-amber-200">
                  Premium ${membershipPrice}/mo
                </span>
              )}
            </div>

            {/* CTA */}
            <div className="mt-6 flex flex-wrap gap-3">
              {subscribed ? (
                <>
                  <div className="flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-200">
                    <span>✓</span> Subscribed
                  </div>
                  <button
                    type="button"
                    onClick={handleUnsubscribe}
                    className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-muted transition hover:border-rose-400/30 hover:text-rose-300"
                  >
                    Unsubscribe
                  </button>
                </>
              ) : (
                <>
                  <Button onClick={() => setShowSubscribeModal(true)}>
                    Subscribe for free
                  </Button>
                  {membershipEnabled && (
                    <Button onClick={() => setShowSubscribeModal(true)} variant="secondary">
                      Get premium — ${membershipPrice}/mo
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </Container>
      </section>

      {/* Posts feed */}
      <section className="border-t border-white/10 bg-background/72">
        <Container className="py-10">
          <div className="mx-auto max-w-2xl gap-8 grid">

            {/* Premium upsell banner (shown when posts exist + membership active) */}
            {membershipEnabled && premiumPosts.length > 0 && !subscribed && (
              <div className="overflow-hidden rounded-2xl border border-amber-400/20 bg-gradient-to-br from-amber-400/[0.08] to-background/0">
                <div className="h-0.5 w-full bg-gradient-to-r from-amber-400/60 to-amber-400/10" />
                <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-300">Premium membership</p>
                    <p className="mt-1.5 text-sm font-semibold text-ink">
                      {premiumPosts.length} premium post{premiumPosts.length !== 1 ? "s" : ""} locked
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      Get full access to all research for ${membershipPrice}/mo
                    </p>
                  </div>
                  <Button onClick={() => setShowSubscribeModal(true)}>
                    Unlock for ${membershipPrice}/mo
                  </Button>
                </div>
              </div>
            )}

            {/* Free posts */}
            {freePosts.length > 0 && (
              <div>
                <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                  Free posts · {freePosts.length}
                </h2>
                <div className="grid gap-4">
                  {freePosts.map((post) => (
                    <NewsletterPostCard
                      key={post.id}
                      post={post}
                      subscribed={subscribed}
                      onSubscribe={() => setShowSubscribeModal(true)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Premium posts */}
            {premiumPosts.length > 0 && (
              <div>
                <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                  Premium posts · {premiumPosts.length}
                </h2>
                <div className="grid gap-4">
                  {premiumPosts.map((post) => (
                    <NewsletterPostCard
                      key={post.id}
                      post={post}
                      subscribed={subscribed}
                      onSubscribe={() => setShowSubscribeModal(true)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Empty */}
            {posts.length === 0 && (
              <Card className="p-8 text-center">
                <p className="text-muted">No posts published yet.</p>
              </Card>
            )}
          </div>
        </Container>
      </section>
    </main>
  );
}

// ─── Newsletter post card ──────────────────────────────────────────────────────

function NewsletterPostCard({
  post,
  subscribed,
  onSubscribe,
}: {
  post: AnalystPost;
  subscribed: boolean;
  onSubscribe: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const locked = post.isPremium && !subscribed;

  const publishedDate = new Date(post.publishedAt).toLocaleDateString(undefined, {
    year: "numeric", month: "long", day: "numeric",
  });

  return (
    <article className="overflow-hidden rounded-2xl border border-white/10 bg-surface/60">
      {/* Accent bar for premium */}
      {post.isPremium && (
        <div className="h-0.5 w-full bg-gradient-to-r from-amber-400/60 to-amber-400/10" />
      )}

      {/* Header */}
      <div className="p-5 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {post.isPremium && (
                <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider text-amber-200">
                  Premium
                </span>
              )}
              {post.topic && (
                <span className="text-[0.65rem] font-semibold uppercase tracking-widest text-muted-2">
                  #{post.topic}
                </span>
              )}
            </div>
            <h3 className="mt-2 text-base font-semibold leading-snug text-ink sm:text-lg">
              {post.title}
            </h3>
          </div>
        </div>
        <p className="mt-1.5 text-xs text-muted-2">{publishedDate}</p>

        {/* Preview — always visible */}
        <p className="mt-3 text-sm leading-6 text-muted">{post.preview}</p>
      </div>

      {/* Full content or paywall */}
      {locked ? (
        /* ── Paywall ── */
        <div className="relative">
          {/* Blurred body teaser */}
          <div className="px-5 pb-3 select-none">
            <div className="relative overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <p className="pointer-events-none line-clamp-3 text-sm leading-6 text-muted blur-[3px]">
                {post.body}
              </p>
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/60 to-background/95" />
            </div>
          </div>
          {/* Lock CTA */}
          <div className="border-t border-white/[0.06] bg-white/[0.02] px-5 py-5 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-accent/30 bg-accent/15 text-lg">
              🔒
            </div>
            <p className="mt-3 text-sm font-semibold text-ink">Premium content</p>
            <p className="mt-1 text-xs text-muted">Subscribe to read the full analysis.</p>
            <button
              type="button"
              onClick={onSubscribe}
              className="mt-4 rounded-full bg-accent px-5 py-2 text-sm font-semibold text-white transition hover:bg-accent/80"
            >
              Subscribe to unlock
            </button>
          </div>
        </div>
      ) : (
        /* ── Full body (free or subscribed) ── */
        <div className="border-t border-white/[0.06]">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex w-full items-center justify-between px-5 py-3 text-left hover:bg-white/[0.02]"
          >
            <span className="text-xs font-semibold text-accent">
              {expanded ? "Collapse" : "Read full post"}
            </span>
            <span className={cn("text-xs text-muted transition-transform", expanded && "rotate-180")}>
              ▾
            </span>
          </button>
          {expanded && (
            <div className="px-5 pb-6">
              <div className="whitespace-pre-wrap text-sm leading-7 text-muted">
                {post.body}
              </div>
            </div>
          )}
        </div>
      )}
    </article>
  );
}

// ─── Subscribe modal ──────────────────────────────────────────────────────────

function SubscribeModal({
  analystName,
  analystId,
  membershipEnabled,
  membershipPrice,
  onSuccess,
  onClose,
}: {
  analystName: string;
  analystId: string;
  membershipEnabled: boolean;
  membershipPrice: number;
  onSuccess: (email: string, plan: "free" | "premium") => void;
  onClose: () => void;
}) {
  const [email, setEmail] = useState("");
  const [plan, setPlan] = useState<"free" | "premium">("free");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Please enter a valid email address.");
      return;
    }
    setError("");
    setLoading(true);
    await onSuccess(trimmed, plan);
    // If plan === "premium" + Stripe configured, window navigates away.
    // Otherwise mark submitted here.
    setSubmitted(true);
    setLoading(false);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[#0d1220] shadow-2xl">
        {/* Header */}
        <div className="border-b border-white/10 px-6 py-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
              Subscribe
            </p>
            <button type="button" onClick={onClose} className="text-muted hover:text-ink">✕</button>
          </div>
          <h2 className="mt-2 text-lg font-semibold text-ink">
            {submitted ? "You're subscribed! 🎉" : `Subscribe to ${analystName}`}
          </h2>
          {!submitted && (
            <p className="mt-1.5 text-sm text-muted">
              Get notified when new research drops.
            </p>
          )}
        </div>

        {submitted ? (
          <div className="px-6 py-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-400/10 text-2xl">
              ✉️
            </div>
            <p className="mt-4 text-sm leading-6 text-muted">
              You'll receive an email every time{" "}
              <span className="font-semibold text-ink">{analystName}</span> publishes new content.
            </p>
            <Button className="mt-5 w-full" onClick={onClose}>Done</Button>
          </div>
        ) : (
          <div className="grid gap-4 px-6 py-5">
            {/* Plan selector */}
            {membershipEnabled && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                  Choose a plan
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {(["free", "premium"] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPlan(p)}
                      className={cn(
                        "rounded-xl border p-3 text-left transition",
                        plan === p
                          ? "border-accent/60 bg-accent/10"
                          : "border-white/[0.08] bg-white/[0.02] hover:border-white/20",
                      )}
                    >
                      <p className="text-sm font-semibold capitalize text-ink">{p}</p>
                      <p className="mt-0.5 text-xs text-muted">
                        {p === "free"
                          ? "Free newsletter updates"
                          : `$${membershipPrice}/mo — full premium access`}
                      </p>
                    </button>
                  ))}
                </div>
                {plan === "premium" && (
                  <p className="mt-2 text-[0.7rem] leading-5 text-amber-200/70">
                    You'll be redirected to a secure Stripe payment page to complete checkout.
                  </p>
                )}
              </div>
            )}

            {/* Email input */}
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                Email address
              </span>
              <input
                autoFocus
                className="mt-2 min-h-11 w-full rounded-md border border-white/10 bg-background px-4 text-sm text-ink outline-none transition placeholder:text-muted-2 focus:border-accent focus:ring-2 focus:ring-accent/30"
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                placeholder="you@example.com"
                type="email"
                value={email}
              />
              {error && <p className="mt-1.5 text-xs text-rose-300">{error}</p>}
            </label>

            <p className="text-[0.7rem] leading-5 text-muted-2">
              By subscribing, you agree to receive emails from this analyst. You can unsubscribe at any time.
              Content is for informational purposes only, not financial advice.
            </p>

            <Button
              className="w-full"
              disabled={loading}
              onClick={handleSubmit}
              type="button"
            >
              {loading
                ? plan === "premium" ? "Redirecting to checkout…" : "Subscribing…"
                : plan === "premium" && membershipEnabled
                  ? `Get premium — $${membershipPrice}/mo`
                  : "Subscribe for free"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
