"use client";

import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { FollowButton } from "@/components/post/follow-button";
import { useI18n, usePreferences } from "@/lib/i18n/use-i18n";
import { createClient } from "@/lib/supabase/client";
import { hasSupabaseConfig } from "@/lib/supabase/config";

type AnalystSummary = {
  id: string;
  name: string;
  bio: string;
  avatar: string;
  role: string;
  postCount: number;
  membershipPrice: number;
  membershipEnabled: boolean;
};

const ANALYST_ROLES = [
  "rookie_analyst",
  "rising_analyst",
  "verified_analyst",
  "partner_expert",
];

export default function AnalystsDirectoryPage() {
  const [analysts, setAnalysts] = useState<AnalystSummary[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [preferences] = usePreferences();
  const { language } = useI18n(preferences.language);
  const supabase = useMemo(() => (hasSupabaseConfig ? createClient() : null), []);

  useEffect(() => {
    if (!supabase) {
      setLoaded(true);
      return;
    }
    let cancelled = false;
    const client = supabase;

    async function load() {
      const { data: profiles } = await client
        .from("profiles")
        .select("id, username, avatar_url, bio, role, analyst_membership_enabled, analyst_membership_price_usd")
        .in("role", ANALYST_ROLES)
        .order("role", { ascending: false })
        .limit(200);

      if (cancelled) return;
      const ids = (profiles ?? []).map((p) => p.id as string);
      let postCounts = new Map<string, number>();
      if (ids.length) {
        const { data: counts } = await client
          .from("posts")
          .select("author_id")
          .in("author_id", ids)
          .eq("status", "published");
        if (cancelled) return;
        for (const row of counts ?? []) {
          const id = row.author_id as string;
          postCounts.set(id, (postCounts.get(id) ?? 0) + 1);
        }
      }

      const summaries: AnalystSummary[] = (profiles ?? []).map((p) => {
        const name = (p.username as string | null)?.trim() || "Chain Brief member";
        return {
          id: p.id as string,
          name,
          bio: (p.bio as string | null) ?? "",
          avatar: (p.avatar_url as string | null) ?? "",
          role: (p.role as string | null) ?? "user",
          postCount: postCounts.get(p.id as string) ?? 0,
          membershipPrice: Number(p.analyst_membership_price_usd ?? 0),
          membershipEnabled: Boolean(p.analyst_membership_enabled),
        };
      });
      setAnalysts(summaries);
      setLoaded(true);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  return (
    <main className="site-grid min-h-screen overflow-x-hidden pb-24">
      <Header />

      {/* Hero */}
      <section className="border-t border-tint/10 bg-background/72">
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
      <section className="border-t border-tint/10 bg-surface/40">
        <Container className="py-8">
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { icon: "✍️", title: "Analysts write", body: "Verified analysts publish research, analysis, and insights — free and premium." },
              { icon: "📬", title: "You subscribe", body: "Subscribe with your email. Free posts arrive instantly. Premium unlocks full depth." },
              { icon: "📈", title: "Stay ahead", body: "Get notified when your analysts publish. Read on the site or in your inbox." },
            ].map((step) => (
              <div className="rounded-xl border border-tint/10 bg-tint/[0.03] p-5 text-center" key={step.title}>
                <span className="text-2xl">{step.icon}</span>
                <p className="mt-3 text-sm font-semibold text-ink">{step.title}</p>
                <p className="mt-1.5 text-xs leading-5 text-muted">{step.body}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Analyst grid */}
      <section className="border-t border-tint/10 bg-background/72">
        <Container className="py-10">
          {!loaded ? (
            <p className="text-sm text-muted">Loading…</p>
          ) : analysts.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              <div className="mb-6 flex items-center justify-between gap-3">
                <h2 className="text-xl font-semibold text-ink">
                  {analysts.length} analyst{analysts.length !== 1 ? "s" : ""} publishing
                </h2>
                <p className="text-xs text-muted-2">Sorted by tier</p>
              </div>
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {analysts.map((a) => (
                  <AnalystCard key={a.id} analyst={a} language={language} />
                ))}
              </div>
            </>
          )}
        </Container>
      </section>
    </main>
  );
}

function AnalystCard({
  analyst,
  language,
}: {
  analyst: AnalystSummary;
  language: "ko" | "en";
}) {
  const initial = analyst.name.slice(0, 1).toUpperCase();
  const isUrlAvatar =
    typeof analyst.avatar === "string" && /^(https?:\/\/|\/)/i.test(analyst.avatar);
  return (
    <div className="group block overflow-hidden rounded-2xl border border-tint/10 bg-surface/60 transition hover:border-accent/30 hover:bg-surface/80">
      <div className="h-1 w-full bg-gradient-to-r from-accent/60 to-blue-400/30" />

      <div className="p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-accent/30 bg-accent/15 text-sm font-bold text-accent-ink">
            {isUrlAvatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img alt={analyst.name} className="h-full w-full object-cover" src={analyst.avatar} />
            ) : (
              initial
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate font-semibold text-ink">{analyst.name}</p>
              <FollowButton language={language} targetId={analyst.id} />
            </div>
            <p className="mt-0.5 text-xs text-muted-2">
              {formatRole(analyst.role, language)} · {analyst.postCount} post
              {analyst.postCount !== 1 ? "s" : ""}
            </p>
          </div>
          {analyst.membershipEnabled && (
            <span className="ml-auto shrink-0 rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider text-amber-200">
              Premium
            </span>
          )}
        </div>

        {analyst.bio && (
          <p className="mt-3 line-clamp-2 text-xs leading-5 text-muted">{analyst.bio}</p>
        )}

        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="text-xs text-muted-2">
            {analyst.membershipEnabled
              ? `$${analyst.membershipPrice}/mo for premium`
              : language === "ko"
                ? "무료 뉴스레터"
                : "Free newsletter"}
          </span>
        </div>
      </div>
    </div>
  );
}

function formatRole(role: string, language: "ko" | "en") {
  const map: Record<string, { ko: string; en: string }> = {
    rookie_analyst: { ko: "루키 분석가", en: "Rookie Analyst" },
    rising_analyst: { ko: "라이징 분석가", en: "Rising Analyst" },
    verified_analyst: { ko: "Verified Analyst", en: "Verified Analyst" },
    partner_expert: { ko: "Partner Expert", en: "Partner Expert" },
  };
  return map[role]?.[language] ?? role;
}

function EmptyState() {
  return (
    <div className="mx-auto max-w-xl text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-tint/10 bg-surface/60 text-3xl">
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
