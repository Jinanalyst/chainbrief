"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import {
  readAnalystPosts,
  readAnalystProfile,
  readSubscriberEmails,
  type AnalystPost,
  type AnalystProfile,
} from "@/lib/analyst-posts";

type AnalystSummary = {
  id: string;
  name: string;
  bio: string;
  avatar: string;
  postCount: number;
  subscriberCount: number;
  latestPost: AnalystPost | null;
  membershipPrice: number;
  membershipEnabled: boolean;
};

function buildSummaries(): AnalystSummary[] {
  const posts = readAnalystPosts();
  const byAnalyst = new Map<string, AnalystPost[]>();
  for (const p of posts) {
    const arr = byAnalyst.get(p.analystId) ?? [];
    arr.push(p);
    byAnalyst.set(p.analystId, arr);
  }

  return Array.from(byAnalyst.entries()).map(([id, analystPosts]) => {
    const sorted = [...analystPosts].sort(
      (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
    );
    const profile = readAnalystProfile(id);
    const latest = sorted[0];
    return {
      id,
      name: latest.analystName,
      bio: profile?.bio ?? latest.analystBio ?? "",
      avatar: latest.analystAvatar,
      postCount: analystPosts.length,
      subscriberCount: readSubscriberEmails(id).length,
      latestPost: latest,
      membershipPrice: profile?.membershipPrice ?? 5,
      membershipEnabled: profile?.membershipEnabled ?? false,
    };
  });
}

export default function AnalystsDirectoryPage() {
  const [analysts, setAnalysts] = useState<AnalystSummary[]>([]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setAnalysts(buildSummaries());
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  return (
    <main className="site-grid min-h-screen overflow-x-hidden pb-24">
      <Header />

      {/* Hero */}
      <section className="border-t border-white/10 bg-background/72">
        <Container className="pb-10 pt-8 sm:pb-12 sm:pt-10">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">
              Analyst Network
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
              Crypto research from people who do the work.
            </h1>
            <p className="mt-4 text-base leading-7 text-muted">
              Subscribe to verified analysts and get their research delivered to your inbox. Free and premium newsletters, all in one place.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Button href="/analyst/apply">Become an analyst</Button>
              <Button href="/analyst/dashboard" variant="secondary">My dashboard</Button>
            </div>
          </div>
        </Container>
      </section>

      {/* How it works */}
      <section className="border-t border-white/10 bg-surface/40">
        <Container className="py-8">
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { icon: "✍️", title: "Analysts write", body: "Verified analysts publish research, analysis, and insights — free and premium." },
              { icon: "📬", title: "You subscribe", body: "Subscribe with your email. Free posts arrive instantly. Premium unlocks full depth." },
              { icon: "📈", title: "Stay ahead", body: "Get notified when your analysts publish. Read on the site or in your inbox." },
            ].map((step) => (
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5 text-center" key={step.title}>
                <span className="text-2xl">{step.icon}</span>
                <p className="mt-3 text-sm font-semibold text-ink">{step.title}</p>
                <p className="mt-1.5 text-xs leading-5 text-muted">{step.body}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Analyst grid */}
      <section className="border-t border-white/10 bg-background/72">
        <Container className="py-10">
          {analysts.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              <div className="mb-6 flex items-center justify-between gap-3">
                <h2 className="text-xl font-semibold text-ink">
                  {analysts.length} analyst{analysts.length !== 1 ? "s" : ""} publishing
                </h2>
                <p className="text-xs text-muted-2">Sorted by latest activity</p>
              </div>
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {analysts.map((a) => (
                  <AnalystCard key={a.id} analyst={a} />
                ))}
              </div>
            </>
          )}
        </Container>
      </section>
    </main>
  );
}

function AnalystCard({ analyst }: { analyst: AnalystSummary }) {
  return (
    <Link
      href={`/analysts/${analyst.id}`}
      className="group block overflow-hidden rounded-2xl border border-white/10 bg-surface/60 transition hover:border-accent/30 hover:bg-surface/80"
    >
      {/* Top accent bar */}
      <div className="h-1 w-full bg-gradient-to-r from-accent/60 to-blue-400/30" />

      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-accent/30 bg-accent/15 text-sm font-bold text-blue-100">
            {analyst.avatar}
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold text-ink group-hover:text-blue-100 transition">
              {analyst.name}
            </p>
            <p className="mt-0.5 text-xs text-muted-2">
              {analyst.postCount} post{analyst.postCount !== 1 ? "s" : ""}
              {" · "}
              {analyst.subscriberCount} subscriber{analyst.subscriberCount !== 1 ? "s" : ""}
            </p>
          </div>
          {analyst.membershipEnabled && (
            <span className="ml-auto shrink-0 rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider text-amber-200">
              Premium
            </span>
          )}
        </div>

        {/* Bio */}
        {analyst.bio && (
          <p className="mt-3 line-clamp-2 text-xs leading-5 text-muted">{analyst.bio}</p>
        )}

        {/* Latest post preview */}
        {analyst.latestPost && (
          <div className="mt-4 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
            <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-muted-2">
              Latest
            </p>
            <p className="mt-1.5 line-clamp-1 text-sm font-semibold text-ink">
              {analyst.latestPost.title}
            </p>
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted">
              {analyst.latestPost.preview}
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="text-xs text-muted-2">
            {analyst.membershipEnabled
              ? `$${analyst.membershipPrice}/mo for premium`
              : "Free newsletter"}
          </span>
          <span className="text-xs font-semibold text-accent">
            Subscribe →
          </span>
        </div>
      </div>
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="mx-auto max-w-xl text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-surface/60 text-3xl">
        📝
      </div>
      <h2 className="mt-5 text-xl font-semibold text-ink">No analysts yet</h2>
      <p className="mt-3 text-sm leading-6 text-muted">
        Be the first to publish research on Chain Brief. Apply to become a verified analyst and start your newsletter.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button href="/analyst/apply">Apply now</Button>
        <Button href="/analyst/write" variant="secondary">Write your first post</Button>
      </div>
    </div>
  );
}
