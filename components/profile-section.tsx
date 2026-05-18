"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { readCommunityPosts, readAuthorName, COMMUNITY_POSTS_CHANGED_EVENT, type CommunityPost } from "@/lib/community";
import { cn } from "@/lib/cn";

type ChainBriefProfile = {
  displayName: string;
  role: string;
  interests: string[];
  bio: string;
  socialLinks: ChainBriefSocialLinks;
  updatedAt?: string;
};

type ChainBriefSocialLinks = {
  x: string;
  telegram: string;
  discord: string;
  website: string;
};

type AnalystScores = {
  evidence: number;
  risk: number;
  reaction: number;
  consistency: number;
  credibility: number;
};

const PROFILE_ROLES = [
  "Crypto researcher",
  "Investor",
  "Builder",
  "Community member",
  "Analyst",
];

const DEFAULT_SOCIAL_LINKS: ChainBriefSocialLinks = {
  x: "",
  telegram: "",
  discord: "",
  website: "",
};

const ZERO_SCORES: AnalystScores = {
  evidence: 0,
  risk: 0,
  reaction: 0,
  consistency: 0,
  credibility: 0,
};

// ─── Live score algorithm ─────────────────────────────────────────────────────

function computeAnalystScores(posts: CommunityPost[], authorKeys: string[]): AnalystScores {
  const keySet = new Set(authorKeys);
  const mine = posts.filter((p) => keySet.has(p.author) && p.kind === "opinion");
  if (!mine.length) return ZERO_SCORES;

  // 근거 충실도 — analysis post ratio + avg body depth
  const analysisPosts = mine.filter((p) =>
    p.postType === "chart_analysis" ||
    p.postType === "trade_review" ||
    p.postType === "news_interpretation" ||
    p.postType === "loss_review" ||
    p.postType === "risk_analysis",
  );
  const avgBodyLen = mine.reduce((s, p) => s + p.body.length, 0) / mine.length;
  const evidence = Math.min(100, Math.round(
    (analysisPosts.length / mine.length) * 60 + Math.min(40, avgBodyLen / 15),
  ));

  // 리스크 설명 — risk/loss posts + posts that have an explicit stance
  const riskPosts = mine.filter((p) => p.postType === "risk_analysis" || p.postType === "loss_review");
  const stancedPosts = mine.filter((p) => p.stance);
  const risk = Math.min(100, Math.round(
    (riskPosts.length / mine.length) * 50 + (stancedPosts.length / mine.length) * 50,
  ));

  // 독자 반응 — weighted engagement per post, normalised
  const totalEng = mine.reduce((s, p) => s + p.likes * 2 + p.commentsCount * 3 + p.views * 0.05, 0);
  const avgEng = totalEng / mine.length;
  const reaction = Math.min(100, Math.round(Math.sqrt(avgEng) * 12));

  // 꾸준함 — total posts + recency (last 30 days)
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const recentCount = mine.filter((p) => new Date(p.publishedAt).getTime() > thirtyDaysAgo).length;
  const consistency = Math.min(100, Math.round(
    Math.min(mine.length * 10, 60) + Math.min(recentCount * 8, 40),
  ));

  // 신뢰도 — bull/bear balance (objectivity) + post volume
  const bullish = mine.filter((p) => p.stance === "Bullish").length;
  const bearish = mine.filter((p) => p.stance === "Bearish").length;
  const stancedTotal = bullish + bearish;
  const balance = stancedTotal > 0 ? 1 - Math.abs(bullish - bearish) / stancedTotal : 0;
  const credibility = Math.min(100, Math.round(balance * 50 + Math.min(mine.length * 5, 50)));

  return { evidence, risk, reaction, consistency, credibility };
}

// ─── Collapsible section wrapper ─────────────────────────────────────────────

function CollapsibleCard({
  title,
  accent = false,
  defaultOpen = true,
  id,
  children,
}: {
  title: string;
  accent?: boolean;
  defaultOpen?: boolean;
  id?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Card className="min-w-0 overflow-hidden p-0" id={id}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-tint/[0.03]"
      >
        <p className={cn(
          "text-xs font-semibold uppercase tracking-[0.18em]",
          accent ? "text-accent" : "text-muted",
        )}>
          {title}
        </p>
        <span className={cn("text-xs text-muted transition-transform duration-200", open ? "rotate-180" : "rotate-0")}>▾</span>
      </button>
      <div className={cn("transition-all duration-200", open ? "border-t border-tint/[0.06]" : "hidden")}>
        <div className="p-4">
          {children}
        </div>
      </div>
    </Card>
  );
}

// ─── Collapsible form section (inside the main Card) ─────────────────────────

function FormSection({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-xl border border-tint/10 bg-tint/[0.02]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-tint/[0.03]"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">{title}</p>
        <span className={cn("text-xs text-muted transition-transform duration-200", open ? "rotate-180" : "rotate-0")}>▾</span>
      </button>
      {open && <div className="grid gap-4 border-t border-tint/[0.06] px-4 pb-4 pt-4">{children}</div>}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ProfileSection() {
  const supabase = useMemo(() => (hasSupabaseConfig ? createClient() : null), []);
  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState(PROFILE_ROLES[0]);
  const [interests, setInterests] = useState("");
  const [bio, setBio] = useState("");
  const [socialLinks, setSocialLinks] = useState<ChainBriefSocialLinks>(DEFAULT_SOCIAL_LINKS);
  const [expertise, setExpertise] = useState("");
  const [sampleContent, setSampleContent] = useState("");
  const [markets, setMarkets] = useState("");
  const [noAdviceAgreed, setNoAdviceAgreed] = useState(false);
  const [riskAgreed, setRiskAgreed] = useState(false);
  const [isLoading, setIsLoading] = useState(hasSupabaseConfig);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [scores, setScores] = useState<AnalystScores>(ZERO_SCORES);
  const [postCount, setPostCount] = useState(0);
  const [allPosts, setAllPosts] = useState<CommunityPost[]>([]);

  const hydrateProfile = useCallback((nextUser: User | null) => {
    const profile = readProfile(nextUser);
    const metadata = nextUser?.user_metadata ?? {};

    const name =
      profile?.displayName ??
      getStringMetadata(metadata.name) ??
      getStringMetadata(metadata.full_name) ??
      "";

    setDisplayName(name);
    setRole(profile?.role ?? PROFILE_ROLES[0]);
    setInterests(profile?.interests?.join(", ") ?? "");
    setBio(profile?.bio ?? "");
    setSocialLinks(profile?.socialLinks ?? DEFAULT_SOCIAL_LINKS);

    // Build all author identifiers that could belong to this user
    // (display name + localStorage saved name + email + legacy "You" default)
    const savedName = readAuthorName();
    const authorKeys = [...new Set([name, savedName, nextUser?.email ?? "", "You"].filter(Boolean))];

    // Compute live analyst score from community posts
    const posts = readCommunityPosts();
    setAllPosts(posts);
    setScores(computeAnalystScores(posts, authorKeys));
    setPostCount(posts.filter((p) => authorKeys.includes(p.author) && p.kind === "opinion").length);
  }, []);

  useEffect(() => {
    if (!supabase) return;

    let isMounted = true;

    supabase.auth.getUser().then(({ data }) => {
      if (!isMounted) return;
      setUser(data.user);
      hydrateProfile(data.user);
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      hydrateProfile(session?.user ?? null);
    });

    function syncPosts() {
      setAllPosts(readCommunityPosts());
    }
    window.addEventListener("storage", syncPosts);
    window.addEventListener(COMMUNITY_POSTS_CHANGED_EVENT, syncPosts);

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      window.removeEventListener("storage", syncPosts);
      window.removeEventListener(COMMUNITY_POSTS_CHANGED_EVENT, syncPosts);
    };
  }, [hydrateProfile, supabase]);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !user) return;

    setIsSaving(true);
    setMessage(null);
    setError(null);

    const profile: ChainBriefProfile = {
      displayName: displayName.trim(),
      role,
      interests: parseInterests(interests),
      bio: bio.trim(),
      socialLinks: {
        x: socialLinks.x.trim(),
        telegram: socialLinks.telegram.trim(),
        discord: socialLinks.discord.trim(),
        website: socialLinks.website.trim(),
      },
      updatedAt: new Date().toISOString(),
    };

    const { data, error: updateError } = await supabase.auth.updateUser({
      data: { ...user.user_metadata, full_name: profile.displayName, chainBriefProfile: profile },
    });

    setIsSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setUser(data.user);

    // Recompute scores after save with updated display name
    {
      const savedName = readAuthorName();
      const authorKeys = [...new Set([profile.displayName, savedName, data.user?.email ?? "", "You"].filter(Boolean))];
      const posts = readCommunityPosts();
      setAllPosts(posts);
      setScores(computeAnalystScores(posts, authorKeys));
      setPostCount(posts.filter((p) => authorKeys.includes(p.author) && p.kind === "opinion").length);
    }

    setMessage("Profile saved. Your Chain Brief identity is ready.");
  }

  async function uploadAvatar(file: File) {
    if (!supabase || !user) return;

    setIsUploadingAvatar(true);
    setAvatarError(null);

    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${user.id}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      setIsUploadingAvatar(false);
      setAvatarError(uploadError.message);
      return;
    }

    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

    const { data, error: updateError } = await supabase.auth.updateUser({
      data: { ...user.user_metadata, avatar_url: publicUrl },
    });

    if (updateError) {
      setIsUploadingAvatar(false);
      setAvatarError(updateError.message);
      return;
    }

    await supabase
      .from("profiles")
      .update({ avatar_url: publicUrl })
      .eq("id", user.id);

    setIsUploadingAvatar(false);
    setUser(data.user);
  }

  if (!hasSupabaseConfig) {
    return (
      <Card className="p-6">
        <p className="text-lg font-semibold text-ink">Supabase is not configured.</p>
        <p className="mt-2 text-sm leading-6 text-muted">
          Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to `.env.local`.
        </p>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="p-6">
        <p className="text-sm font-semibold text-muted">Loading profile...</p>
      </Card>
    );
  }

  if (!user) {
    return (
      <Card className="grid gap-4 p-6">
        <div>
          <p className="text-lg font-semibold text-ink">Log in to create a profile.</p>
          <p className="mt-2 text-sm leading-6 text-muted">
            Use Google login to connect your Chain Brief account before joining community discussions.
          </p>
        </div>
        <Button className="w-full sm:w-auto" href="/login">Log in with Google</Button>
      </Card>
    );
  }

  const profile = readProfile(user);
  const avatarUrl =
    getStringMetadata(user.user_metadata.avatar_url) ??
    getStringMetadata(user.user_metadata.picture);
  const initials = getInitials(displayName || user.email || "CB");
  const canApply = expertise.trim() && sampleContent.trim() && markets.trim() && noAdviceAgreed && riskAgreed;

  return (
    <>
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
      {/* ── Left: edit form ── */}
      <Card className="min-w-0 p-5 sm:p-6">
        <div className="flex min-w-0 items-start gap-4">
          <div className="shrink-0">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadAvatar(file);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="group relative h-14 w-14 overflow-hidden rounded-full"
              title="Upload profile picture"
              disabled={isUploadingAvatar}
            >
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img alt="" className="h-14 w-14 rounded-full border border-tint/10 object-cover" src={avatarUrl} />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-full border border-accent/30 bg-accent/15 text-sm font-bold text-accent-ink">
                  {initials}
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/60 opacity-0 transition group-hover:opacity-100 group-disabled:opacity-100">
                <span className="text-[10px] font-semibold text-white">
                  {isUploadingAvatar ? "..." : "Upload"}
                </span>
              </div>
            </button>
            {avatarError && <p className="mt-1 w-14 text-center text-[10px] text-rose-300">{avatarError}</p>}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Chain Brief Profile</p>
            <h2 className="mt-2 break-words text-2xl font-semibold text-ink">
              {profile?.displayName || displayName || "Create your profile"}
            </h2>
            <p className="mt-2 break-words text-sm leading-6 text-muted">{user.email}</p>
          </div>
        </div>

        <form className="mt-6 grid gap-3" onSubmit={saveProfile}>
          <FormSection title="Basic Info" defaultOpen={true}>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Display name</span>
              <input
                className="mt-2 min-h-11 w-full rounded-md border border-tint/10 bg-background px-4 text-sm text-ink outline-none transition placeholder:text-muted-2 focus:border-accent focus:ring-2 focus:ring-accent/30"
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your Chain Brief name"
                required
                value={displayName}
              />
            </label>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Role</span>
              <select
                className="mt-2 min-h-11 w-full rounded-md border border-tint/10 bg-background px-4 text-sm text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30"
                onChange={(e) => setRole(e.target.value)}
                value={role}
              >
                {PROFILE_ROLES.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Topics</span>
              <input
                className="mt-2 min-h-11 w-full rounded-md border border-tint/10 bg-background px-4 text-sm text-ink outline-none transition placeholder:text-muted-2 focus:border-accent focus:ring-2 focus:ring-accent/30"
                onChange={(e) => setInterests(e.target.value)}
                placeholder="Bitcoin, DeFi, Macro"
                value={interests}
              />
            </label>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Bio</span>
              <textarea
                className="mt-2 min-h-28 w-full rounded-md border border-tint/10 bg-background px-4 py-3 text-sm text-ink outline-none transition placeholder:text-muted-2 focus:border-accent focus:ring-2 focus:ring-accent/30"
                maxLength={240}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Share what you follow in crypto and how you use Chain Brief."
                value={bio}
              />
            </label>
          </FormSection>

          <FormSection title="Social Links" defaultOpen={false}>
            <SocialLinkField label="X / Twitter" placeholder="https://x.com/your-handle" value={socialLinks.x} onChange={(v) => setSocialLinks((c) => ({ ...c, x: v }))} />
            <SocialLinkField label="Telegram" placeholder="https://t.me/your-handle" value={socialLinks.telegram} onChange={(v) => setSocialLinks((c) => ({ ...c, telegram: v }))} />
            <SocialLinkField label="Discord" placeholder="discord.gg/your-server" value={socialLinks.discord} onChange={(v) => setSocialLinks((c) => ({ ...c, discord: v }))} />
            <SocialLinkField label="Website" placeholder="https://your-site.com" value={socialLinks.website} onChange={(v) => setSocialLinks((c) => ({ ...c, website: v }))} />
          </FormSection>

          <Button disabled={isSaving} type="submit">
            {isSaving ? "Saving..." : profile ? "Update profile" : "Create profile"}
          </Button>
        </form>

        {message ? <p className="mt-4 text-sm leading-6 text-emerald-300">{message}</p> : null}
        {error   ? <p className="mt-4 text-sm leading-6 text-rose-300">{error}</p>    : null}
      </Card>

      {/* ── Right: sidebar ── */}
      <aside className="space-y-3">
        {/* Analyst Score — live */}
        <CollapsibleCard title="Analyst Score" defaultOpen={true}>
          {postCount === 0 ? (
            <p className="text-xs leading-5 text-muted-2">
              Post your first analysis in Community to start building your score.
            </p>
          ) : (
            <>
              <p className="mb-3 text-xs text-muted-2">Based on {postCount} post{postCount !== 1 ? "s" : ""} · live</p>
              <div className="grid gap-3">
                <ScoreRow label="근거 충실도" value={scores.evidence} hint="Analysis depth & body length" />
                <ScoreRow label="리스크 설명" value={scores.risk} hint="Risk posts & explicit stance" />
                <ScoreRow label="독자 반응" value={scores.reaction} hint="Views, likes & comments" />
                <ScoreRow label="꾸준함" value={scores.consistency} hint="Post volume & recency" />
                <ScoreRow label="신뢰도" value={scores.credibility} hint="Bull/bear balance & volume" />
              </div>
            </>
          )}
        </CollapsibleCard>

        {/* Community Readiness */}
        <CollapsibleCard title="Community Readiness" defaultOpen={true}>
          <div className="grid gap-2 text-sm">
            <ProfileCheck complete={Boolean(displayName.trim())} label="Display name" />
            <ProfileCheck complete={parseInterests(interests).length > 0} label="Topics" />
            <ProfileCheck complete={Boolean(bio.trim())} label="Bio" />
            <ProfileCheck complete={hasAnySocialLink(socialLinks)} label="Social links" />
          </div>
        </CollapsibleCard>

        {/* Social Preview */}
        <CollapsibleCard title="Social Preview" defaultOpen={false}>
          <div className="grid gap-2 text-sm">
            <SocialPreviewRow label="X" value={socialLinks.x} />
            <SocialPreviewRow label="Telegram" value={socialLinks.telegram} />
            <SocialPreviewRow label="Discord" value={socialLinks.discord} />
            <SocialPreviewRow label="Website" value={socialLinks.website} />
          </div>
        </CollapsibleCard>

        {/* Membership */}
        <CollapsibleCard title="Membership" id="membership" defaultOpen={false}>
          <p className="text-sm leading-6 text-muted">
            Configure your plan ladder, write member-aware analysis, and publish into Community as a Verified Analyst.
          </p>
          <Button className="mt-4 w-full" href="/membership" variant="secondary">
            Open Membership Studio
          </Button>
        </CollapsibleCard>

        {/* Verified Analyst */}
        <CollapsibleCard title="Verified Analyst" accent id="verified-analyst" defaultOpen={false}>
          <h3 className="text-base font-semibold text-ink">콘텐츠 기반 시장 분석가 신청</h3>
          <p className="mt-2 text-sm leading-6 text-muted">
            투자 리딩이 아니라 근거, 리스크 설명, 꾸준함으로 신뢰를 쌓는 분석가 신청입니다.
          </p>
          <div className="mt-4 grid gap-3">
            <input
              className="min-h-10 rounded-md border border-tint/10 bg-background px-3 text-sm text-ink outline-none transition placeholder:text-muted-2 focus:border-accent focus:ring-2 focus:ring-accent/30"
              onChange={(e) => setExpertise(e.target.value)}
              placeholder="전문 분야"
              value={expertise}
            />
            <input
              className="min-h-10 rounded-md border border-tint/10 bg-background px-3 text-sm text-ink outline-none transition placeholder:text-muted-2 focus:border-accent focus:ring-2 focus:ring-accent/30"
              onChange={(e) => setMarkets(e.target.value)}
              placeholder="주로 분석하는 코인/시장"
              value={markets}
            />
            <textarea
              className="min-h-28 rounded-md border border-tint/10 bg-background px-3 py-3 text-sm text-ink outline-none transition placeholder:text-muted-2 focus:border-accent focus:ring-2 focus:ring-accent/30"
              onChange={(e) => setSampleContent(e.target.value)}
              placeholder="자기소개 및 샘플 분석글 링크 또는 내용"
              value={sampleContent}
            />
            <label className="flex items-start gap-2 text-xs leading-5 text-muted">
              <input checked={noAdviceAgreed} className="mt-1" onChange={(e) => setNoAdviceAgreed(e.target.checked)} type="checkbox" />
              투자 권유, 수익 보장, 1:1 매수/매도 지시를 하지 않는 데 동의합니다.
            </label>
            <label className="flex items-start gap-2 text-xs leading-5 text-muted">
              <input checked={riskAgreed} className="mt-1" onChange={(e) => setRiskAgreed(e.target.checked)} type="checkbox" />
              리스크 고지와 원금 손실 가능성 안내를 모든 분석 콘텐츠에 포함하는 데 동의합니다.
            </label>
            <Button
              disabled={!canApply}
              onClick={() => setMessage("Verified Analyst application saved locally. Database submission is ready for Supabase integration.")}
              type="button"
              variant="secondary"
            >
              Verified Analyst 신청하기
            </Button>
          </div>
          <p className="mt-4 text-xs leading-5 text-amber-100">
            본 콘텐츠는 투자 권유가 아닌 정보 제공 목적입니다. 가상자산 투자는 원금 손실 위험이 있으며, 최종 판단과 책임은 투자자 본인에게 있습니다.
          </p>
        </CollapsibleCard>

        {/* Next Step */}
        <CollapsibleCard title="Next Step" defaultOpen={false}>
          <p className="text-sm leading-6 text-muted">
            After creating a profile, jump into Community and post your market take on the latest brief.
          </p>
          <Button className="mt-4 w-full" href="/community" variant="secondary">Open community</Button>
        </CollapsibleCard>
      </aside>
    </div>

    {/* ── Full-width post history ── */}
    <PostHistorySection posts={allPosts} authorKeys={[...new Set([displayName, readAuthorName(), user.email ?? "", "You"].filter(Boolean))]} />
    </>
  );
}

// ─── Post history ─────────────────────────────────────────────────────────────

function PostHistorySection({ posts, authorKeys }: { posts: CommunityPost[]; authorKeys: string[] }) {
  const keySet = new Set(authorKeys);
  const mine = posts
    .filter((p) => keySet.has(p.author))
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

  return (
    <div className="mt-8">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Post History</p>
          <h2 className="mt-1 text-xl font-semibold text-ink">Your written posts</h2>
        </div>
        <span className="text-xs text-muted-2">{mine.length} post{mine.length !== 1 ? "s" : ""}</span>
      </div>

      {mine.length === 0 ? (
        <Card className="p-6">
          <p className="text-sm leading-6 text-muted">
            You haven&apos;t posted anything yet.{" "}
            <a href="/community/write" className="text-accent underline-offset-2 hover:underline">
              Write your first post →
            </a>
          </p>
        </Card>
      ) : (
        <div className="grid gap-3">
          {mine.map((post) => (
            <PostHistoryCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}

const POST_TYPE_LABELS: Record<string, string> = {
  general:          "General",
  news_interpretation: "News Analysis",
  chart_analysis:   "Chart Analysis",
  trade_review:     "Trade Review",
  loss_review:      "Loss Review",
  risk_analysis:    "Risk Analysis",
};

const STANCE_COLORS: Record<string, string> = {
  Bullish:  "bg-accent/15 text-accent-ink",
  Bearish:  "bg-rose-500/15 text-rose-200",
  Neutral:  "bg-tint/[0.06] text-muted",
  Question: "bg-amber-400/10 text-amber-200",
};

function PostHistoryCard({ post }: { post: CommunityPost }) {
  const [expanded, setExpanded] = useState(false);

  const exactTime = new Date(post.publishedAt).toLocaleString(undefined, {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });

  const kindLabel =
    post.kind === "thread_repost" ? "Repost" :
    post.kind === "thread_quote"  ? "Quote"  :
    post.kind === "quote"         ? "Quote"  : null;

  return (
    <Card className="min-w-0 overflow-hidden p-0">
      {/* Summary row — always visible, click to expand */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-start gap-4 px-4 py-4 text-left transition hover:bg-tint/[0.03]"
      >
        {/* Expand indicator */}
        <span className={cn("mt-1 shrink-0 text-xs text-muted transition-transform duration-200", expanded ? "rotate-180" : "rotate-0")}>▾</span>

        <div className="min-w-0 flex-1">
          {/* Badges row */}
          <div className="flex flex-wrap items-center gap-2">
            {post.postType && (
              <span className="rounded-full border border-tint/10 bg-tint/[0.04] px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider text-muted">
                {POST_TYPE_LABELS[post.postType] ?? post.postType}
              </span>
            )}
            {post.stance && (
              <span className={cn("rounded-full px-2 py-0.5 text-[0.65rem] font-bold", STANCE_COLORS[post.stance] ?? "bg-tint/[0.06] text-muted")}>
                {post.stance}
              </span>
            )}
            {kindLabel && (
              <span className="rounded-full border border-accent/20 bg-accent/10 px-2 py-0.5 text-[0.65rem] font-semibold text-accent-ink">
                {kindLabel}
              </span>
            )}
            {post.topic && (
              <span className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted-2">
                #{post.topic}
              </span>
            )}
          </div>

          {/* Title */}
          <p className="mt-2 break-words text-sm font-semibold text-ink leading-snug">
            {post.title || <span className="italic text-muted-2">(untitled)</span>}
          </p>

          {/* Preview line */}
          {!expanded && (
            <p className="mt-1 line-clamp-1 text-xs leading-5 text-muted">{post.preview}</p>
          )}
        </div>

        {/* Timestamp — right side */}
        <time
          dateTime={post.publishedAt}
          className="shrink-0 text-right text-xs text-muted-2"
          title={exactTime}
        >
          <span className="block">{new Date(post.publishedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span>
          <span className="block text-muted-2/70">{new Date(post.publishedAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}</span>
        </time>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-tint/[0.06] px-4 pb-5 pt-4">
          {/* Exact timestamp */}
          <p className="mb-3 text-xs font-semibold text-muted-2">
            Posted: <span className="text-ink">{exactTime}</span>
          </p>

          {/* Full body */}
          <div className="whitespace-pre-wrap break-words text-sm leading-6 text-muted">
            {post.body || <span className="italic text-muted-2">(no body)</span>}
          </div>

          {/* Attachments */}
          {post.attachments?.length ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {post.attachments.map((a) => (
                <figure key={a.id} className="overflow-hidden rounded-xl border border-tint/10">
                  {a.kind === "image" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img alt={a.name} className="aspect-video w-full object-cover" src={a.dataUrl} />
                  ) : (
                    <video className="aspect-video w-full bg-black" controls src={a.dataUrl} />
                  )}
                  <figcaption className="px-3 py-1.5 text-xs text-muted-2">{a.name}</figcaption>
                </figure>
              ))}
            </div>
          ) : null}

          {/* Engagement stats */}
          <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-2">
            <span>{post.views} views</span>
            <span>{post.likes} likes</span>
            <span>{post.commentsCount} comments</span>
          </div>

          <div className="mt-4">
            <a href="/community/write" className="text-xs font-semibold text-accent underline-offset-2 hover:underline">
              Write another post →
            </a>
          </div>
        </div>
      )}
    </Card>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ScoreRow({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-xs">
        <span className="text-muted">{label}</span>
        <span className="font-semibold text-accent-ink">{value}</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-tint/10">
        <span
          className="block h-full rounded-full bg-accent transition-all duration-700"
          style={{ width: `${value}%` }}
        />
      </div>
      <p className="mt-1 text-[10px] text-muted-2">{hint}</p>
    </div>
  );
}

function ProfileCheck({ complete, label }: { complete: boolean; label: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-tint/10 bg-tint/[0.03] px-3 py-2">
      <span className="text-muted">{label}</span>
      <span className={complete ? "text-emerald-300" : "text-muted-2"}>{complete ? "Ready" : "Missing"}</span>
    </div>
  );
}

function SocialLinkField({
  label, placeholder, value, onChange,
}: {
  label: string; placeholder: string; value: string; onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">{label}</span>
      <input
        className="mt-2 min-h-11 w-full rounded-md border border-tint/10 bg-background px-4 text-sm text-ink outline-none transition placeholder:text-muted-2 focus:border-accent focus:ring-2 focus:ring-accent/30"
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        value={value}
      />
    </label>
  );
}

function SocialPreviewRow({ label, value }: { label: string; value: string }) {
  const trimmed = value.trim();
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-tint/10 bg-tint/[0.03] px-3 py-2">
      <span className="text-muted">{label}</span>
      {trimmed ? (
        <a className="truncate text-sm font-semibold text-accent-ink underline-offset-4 hover:underline" href={normalizeLink(trimmed)} rel="noreferrer" target="_blank">
          {trimmed}
        </a>
      ) : (
        <span className="text-muted-2">Not added</span>
      )}
    </div>
  );
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function readProfile(user: User | null): ChainBriefProfile | null {
  const value = user?.user_metadata?.chainBriefProfile;
  if (!value || typeof value !== "object") return null;
  const profile = value as Partial<ChainBriefProfile>;
  return {
    displayName: typeof profile.displayName === "string" ? profile.displayName : "",
    role: typeof profile.role === "string" ? profile.role : PROFILE_ROLES[0],
    interests: Array.isArray(profile.interests)
      ? profile.interests.filter((item): item is string => typeof item === "string")
      : [],
    bio: typeof profile.bio === "string" ? profile.bio : "",
    socialLinks: sanitizeSocialLinks(profile.socialLinks),
    updatedAt: typeof profile.updatedAt === "string" ? profile.updatedAt : undefined,
  };
}

function parseInterests(value: string) {
  return value.split(/[,\n]/).map((item) => item.trim()).filter(Boolean).slice(0, 8);
}

function getStringMetadata(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getInitials(value: string) {
  return (
    value.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "CB"
  );
}

function sanitizeSocialLinks(value: unknown): ChainBriefSocialLinks {
  if (!value || typeof value !== "object") return DEFAULT_SOCIAL_LINKS;
  const links = value as Partial<ChainBriefSocialLinks>;
  return {
    x:        typeof links.x        === "string" ? links.x        : "",
    telegram: typeof links.telegram === "string" ? links.telegram : "",
    discord:  typeof links.discord  === "string" ? links.discord  : "",
    website:  typeof links.website  === "string" ? links.website  : "",
  };
}

function hasAnySocialLink(links: ChainBriefSocialLinks) {
  return Boolean(links.x.trim() || links.telegram.trim() || links.discord.trim() || links.website.trim());
}

function normalizeLink(value: string) {
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}
