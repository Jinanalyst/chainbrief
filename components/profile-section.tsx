"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import type { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { hasSupabaseConfig } from "@/lib/supabase/config";

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
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hydrateProfile = useCallback((nextUser: User | null) => {
    const profile = readProfile(nextUser);
    const metadata = nextUser?.user_metadata ?? {};

    setDisplayName(
      profile?.displayName ??
        getStringMetadata(metadata.name) ??
        getStringMetadata(metadata.full_name) ??
        "",
    );
    setRole(profile?.role ?? PROFILE_ROLES[0]);
    setInterests(profile?.interests?.join(", ") ?? "");
    setBio(profile?.bio ?? "");
    setSocialLinks(profile?.socialLinks ?? DEFAULT_SOCIAL_LINKS);
  }, []);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let isMounted = true;

    supabase.auth.getUser().then(({ data }) => {
      if (!isMounted) {
        return;
      }

      setUser(data.user);
      hydrateProfile(data.user);
      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      hydrateProfile(session?.user ?? null);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [hydrateProfile, supabase]);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!supabase || !user) {
      return;
    }

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
      data: {
        ...user.user_metadata,
        full_name: profile.displayName,
        chainBriefProfile: profile,
      },
    });

    setIsSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setUser(data.user);
    setMessage("Profile saved. Your Chain Brief identity is ready.");
  }

  if (!hasSupabaseConfig) {
    return (
      <Card className="p-6">
        <p className="text-lg font-semibold text-ink">Supabase is not configured.</p>
        <p className="mt-2 text-sm leading-6 text-muted">
          Add `NEXT_PUBLIC_SUPABASE_URL` and
          `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to `.env.local`.
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
            Use Google login to connect your Chain Brief account before joining
            community discussions.
          </p>
        </div>
        <Button className="w-full sm:w-auto" href="/login">
          Log in with Google
        </Button>
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
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <Card className="min-w-0 p-5 sm:p-6">
        <div className="flex min-w-0 items-start gap-4">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt=""
              className="h-14 w-14 shrink-0 rounded-full border border-white/10 object-cover"
              src={avatarUrl}
            />
          ) : (
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-accent/30 bg-accent/15 text-sm font-bold text-blue-100">
              {initials}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
              Chain Brief Profile
            </p>
            <h2 className="mt-2 break-words text-2xl font-semibold text-ink">
              {profile?.displayName || displayName || "Create your profile"}
            </h2>
            <p className="mt-2 break-words text-sm leading-6 text-muted">
              {user.email}
            </p>
          </div>
        </div>

        <form className="mt-6 grid gap-4" onSubmit={saveProfile}>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
              Display name
            </span>
            <input
              className="mt-2 min-h-11 w-full rounded-md border border-white/10 bg-background px-4 text-sm text-ink outline-none transition placeholder:text-muted-2 focus:border-accent focus:ring-2 focus:ring-accent/30"
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="Your Chain Brief name"
              required
              value={displayName}
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
              Role
            </span>
            <select
              className="mt-2 min-h-11 w-full rounded-md border border-white/10 bg-background px-4 text-sm text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30"
              onChange={(event) => setRole(event.target.value)}
              value={role}
            >
              {PROFILE_ROLES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
              Topics
            </span>
            <input
              className="mt-2 min-h-11 w-full rounded-md border border-white/10 bg-background px-4 text-sm text-ink outline-none transition placeholder:text-muted-2 focus:border-accent focus:ring-2 focus:ring-accent/30"
              onChange={(event) => setInterests(event.target.value)}
              placeholder="Bitcoin, DeFi, Macro"
              value={interests}
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
              Bio
            </span>
            <textarea
              className="mt-2 min-h-32 w-full rounded-md border border-white/10 bg-background px-4 py-3 text-sm text-ink outline-none transition placeholder:text-muted-2 focus:border-accent focus:ring-2 focus:ring-accent/30"
              maxLength={240}
              onChange={(event) => setBio(event.target.value)}
              placeholder="Share what you follow in crypto and how you use Chain Brief."
              value={bio}
            />
          </label>

          <div className="grid gap-3 rounded-md border border-white/10 bg-white/[0.03] p-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                Social links
              </p>
              <p className="mt-1 text-xs leading-5 text-muted-2">
                Add the SNS accounts you want to share with the community.
              </p>
            </div>

            <SocialLinkField
              label="X / Twitter"
              placeholder="https://x.com/your-handle"
              value={socialLinks.x}
              onChange={(value) => setSocialLinks((current) => ({ ...current, x: value }))}
            />
            <SocialLinkField
              label="Telegram"
              placeholder="https://t.me/your-handle"
              value={socialLinks.telegram}
              onChange={(value) => setSocialLinks((current) => ({ ...current, telegram: value }))}
            />
            <SocialLinkField
              label="Discord"
              placeholder="discord.gg/your-server"
              value={socialLinks.discord}
              onChange={(value) => setSocialLinks((current) => ({ ...current, discord: value }))}
            />
            <SocialLinkField
              label="Website"
              placeholder="https://your-site.com"
              value={socialLinks.website}
              onChange={(value) => setSocialLinks((current) => ({ ...current, website: value }))}
            />
          </div>

          <Button disabled={isSaving} type="submit">
            {isSaving ? "Saving..." : profile ? "Update profile" : "Create profile"}
          </Button>
        </form>

        {message ? <p className="mt-4 text-sm leading-6 text-emerald-300">{message}</p> : null}
        {error ? <p className="mt-4 text-sm leading-6 text-rose-300">{error}</p> : null}
      </Card>

      <aside className="space-y-3">
        <Card className="min-w-0 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
            Analyst Score
          </p>
          <div className="mt-3 grid gap-3">
            <ScoreRow label="근거 충실도" value={72} />
            <ScoreRow label="리스크 설명" value={68} />
            <ScoreRow label="독자 반응" value={81} />
            <ScoreRow label="꾸준함" value={64} />
            <ScoreRow label="신뢰도" value={76} />
          </div>
        </Card>

        <Card className="min-w-0 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
            Community Readiness
          </p>
          <div className="mt-3 grid gap-2 text-sm">
            <ProfileCheck complete={Boolean(displayName.trim())} label="Display name" />
            <ProfileCheck complete={parseInterests(interests).length > 0} label="Topics" />
            <ProfileCheck complete={Boolean(bio.trim())} label="Bio" />
            <ProfileCheck complete={hasAnySocialLink(socialLinks)} label="Social links" />
          </div>
        </Card>

        <Card className="min-w-0 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
            Social Preview
          </p>
          <div className="mt-3 grid gap-2 text-sm">
            <SocialPreviewRow label="X" value={socialLinks.x} />
            <SocialPreviewRow label="Telegram" value={socialLinks.telegram} />
            <SocialPreviewRow label="Discord" value={socialLinks.discord} />
            <SocialPreviewRow label="Website" value={socialLinks.website} />
          </div>
        </Card>

        <Card className="min-w-0 p-4" id="verified-analyst">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
            Verified Analyst
          </p>
          <h3 className="mt-2 text-lg font-semibold text-ink">
            콘텐츠 기반 시장 분석가 신청
          </h3>
          <p className="mt-2 text-sm leading-6 text-muted">
            투자 리딩이 아니라 근거, 리스크 설명, 꾸준함으로 신뢰를 쌓는 분석가 신청입니다.
          </p>
          <div className="mt-4 grid gap-3">
            <input
              className="min-h-10 rounded-md border border-white/10 bg-background px-3 text-sm text-ink outline-none transition placeholder:text-muted-2 focus:border-accent focus:ring-2 focus:ring-accent/30"
              onChange={(event) => setExpertise(event.target.value)}
              placeholder="전문 분야"
              value={expertise}
            />
            <input
              className="min-h-10 rounded-md border border-white/10 bg-background px-3 text-sm text-ink outline-none transition placeholder:text-muted-2 focus:border-accent focus:ring-2 focus:ring-accent/30"
              onChange={(event) => setMarkets(event.target.value)}
              placeholder="주로 분석하는 코인/시장"
              value={markets}
            />
            <textarea
              className="min-h-28 rounded-md border border-white/10 bg-background px-3 py-3 text-sm text-ink outline-none transition placeholder:text-muted-2 focus:border-accent focus:ring-2 focus:ring-accent/30"
              onChange={(event) => setSampleContent(event.target.value)}
              placeholder="자기소개 및 샘플 분석글 링크 또는 내용"
              value={sampleContent}
            />
            <label className="flex items-start gap-2 text-xs leading-5 text-muted">
              <input
                checked={noAdviceAgreed}
                className="mt-1"
                onChange={(event) => setNoAdviceAgreed(event.target.checked)}
                type="checkbox"
              />
              투자 권유, 수익 보장, 1:1 매수/매도 지시를 하지 않는 데 동의합니다.
            </label>
            <label className="flex items-start gap-2 text-xs leading-5 text-muted">
              <input
                checked={riskAgreed}
                className="mt-1"
                onChange={(event) => setRiskAgreed(event.target.checked)}
                type="checkbox"
              />
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
        </Card>

        <Card className="min-w-0 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
            Next Step
          </p>
          <p className="mt-3 text-sm leading-6 text-muted">
            After creating a profile, jump into Community and post your market
            take on the latest brief.
          </p>
          <Button className="mt-4 w-full" href="/community" variant="secondary">
            Open community
          </Button>
        </Card>
      </aside>
    </div>
  );
}

function ScoreRow({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex justify-between gap-3 text-xs">
        <span className="text-muted">{label}</span>
        <span className="font-semibold text-blue-100">{value}</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
        <span className="block h-full rounded-full bg-accent" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function ProfileCheck({ complete, label }: { complete: boolean; label: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-white/[0.03] px-3 py-2">
      <span className="text-muted">{label}</span>
      <span className={complete ? "text-emerald-300" : "text-muted-2"}>
        {complete ? "Ready" : "Missing"}
      </span>
    </div>
  );
}

function readProfile(user: User | null): ChainBriefProfile | null {
  const value = user?.user_metadata?.chainBriefProfile;

  if (!value || typeof value !== "object") {
    return null;
  }

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
  return value
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 8);
}

function getStringMetadata(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getInitials(value: string) {
  return value
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "CB";
}

function sanitizeSocialLinks(value: unknown): ChainBriefSocialLinks {
  if (!value || typeof value !== "object") {
    return DEFAULT_SOCIAL_LINKS;
  }

  const links = value as Partial<ChainBriefSocialLinks>;

  return {
    x: typeof links.x === "string" ? links.x : "",
    telegram: typeof links.telegram === "string" ? links.telegram : "",
    discord: typeof links.discord === "string" ? links.discord : "",
    website: typeof links.website === "string" ? links.website : "",
  };
}

function hasAnySocialLink(links: ChainBriefSocialLinks) {
  return Boolean(
    links.x.trim() || links.telegram.trim() || links.discord.trim() || links.website.trim(),
  );
}

function normalizeLink(value: string) {
  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  return `https://${value}`;
}

function SocialLinkField({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
        {label}
      </span>
      <input
        className="mt-2 min-h-11 w-full rounded-md border border-white/10 bg-background px-4 text-sm text-ink outline-none transition placeholder:text-muted-2 focus:border-accent focus:ring-2 focus:ring-accent/30"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        value={value}
      />
    </label>
  );
}

function SocialPreviewRow({ label, value }: { label: string; value: string }) {
  const trimmed = value.trim();

  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-white/[0.03] px-3 py-2">
      <span className="text-muted">{label}</span>
      {trimmed ? (
        <a
          className="truncate text-sm font-semibold text-blue-100 underline-offset-4 hover:underline"
          href={normalizeLink(trimmed)}
          rel="noreferrer"
          target="_blank"
        >
          {trimmed}
        </a>
      ) : (
        <span className="text-muted-2">Not added</span>
      )}
    </div>
  );
}
