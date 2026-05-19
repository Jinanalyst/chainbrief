"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { VideoThumbnail } from "@/components/sns/VideoThumbnail";
import { formatRelativeTime } from "@/lib/i18n";
import type { Language } from "@/lib/i18n";
import type { SnsVideo } from "@/lib/sns/types";

type SNSCardProps = {
  language: Language;
  video: SnsVideo;
};

const SNS_CATEGORY_LABELS: Record<Language, Record<SnsVideo["category"], string>> = {
  ko: {
    Research: "리서치",
    Macro: "매크로",
    Bitcoin: "비트코인",
    Ethereum: "이더리움",
    Solana: "솔라나",
    Security: "보안",
    "AI & Crypto": "AI & 크립토",
  },
  en: {
    Research: "Research",
    Macro: "Macro",
    Bitcoin: "Bitcoin",
    Ethereum: "Ethereum",
    Solana: "Solana",
    Security: "Security",
    "AI & Crypto": "AI & Crypto",
  },
};

export function SNSCard({ language, video }: SNSCardProps) {
  const isYouTube = video.provider === "youtube";
  const embedUrl = isYouTube ? getYouTubeEmbedUrl(video.url) : null;
  const providerLabel = isYouTube ? "YouTube" : "RSS";
  const [expanded, setExpanded] = useState(false);
  const canExpand = isYouTube && Boolean(embedUrl);

  const openLabel =
    language === "ko"
      ? isYouTube
        ? "YouTube에서 보기"
        : "원문 열기"
      : isYouTube
        ? "Watch on YouTube"
        : "Open original";

  const expandLabel = language === "ko" ? "크게 보기" : "Expand";
  const collapseLabel = language === "ko" ? "접기" : "Collapse";

  if (canExpand && expanded) {
    return (
      <article className="min-w-0 px-3 py-4 transition sm:px-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="rounded bg-red-500/15 px-2 py-1 text-[0.68rem] font-bold uppercase tracking-[0.12em] text-red-200">
            {providerLabel}
          </span>
          <span className="max-w-full truncate text-xs font-semibold uppercase tracking-[0.14em] text-accent">
            {video.sourceName}
          </span>
          <Badge tone="muted">{SNS_CATEGORY_LABELS[language][video.category]}</Badge>
          <span className="text-xs font-medium text-muted-2">
            {formatRelativeTime(video.publishedAt, language)}
          </span>
          <button
            className="ml-auto rounded-md border border-tint/10 bg-tint/[0.04] px-2.5 py-1 text-xs font-bold text-muted transition hover:border-accent/40 hover:text-ink"
            onClick={() => setExpanded(false)}
            type="button"
          >
            {collapseLabel}
          </button>
        </div>

        <div className="overflow-hidden rounded-lg border border-tint/10 bg-black">
          <iframe
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="aspect-video w-full"
            referrerPolicy="strict-origin-when-cross-origin"
            src={`${embedUrl}?autoplay=1`}
            title={video.title}
          />
        </div>

        <h2 className="mt-3 break-words text-base font-semibold leading-snug text-ink sm:text-lg">
          {video.title}
        </h2>
        <p className="mt-2 break-words text-sm leading-6 text-muted">{video.description}</p>

        {video.tags.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {video.tags.map((tag) => (
              <span
                className="rounded-full border border-tint/10 bg-tint/[0.03] px-2.5 py-1 text-xs font-medium text-muted"
                key={tag}
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}
      </article>
    );
  }

  return (
    <article className="group grid min-w-0 gap-3 px-3 py-4 transition hover:bg-tint/[0.03] sm:gap-4 sm:px-4 md:grid-cols-[13rem_minmax(0,1fr)] lg:grid-cols-[15rem_minmax(0,1fr)]">
      <div className="min-w-0">
        {canExpand ? (
          <button
            aria-label={expandLabel}
            className="group/play relative block aspect-video w-full overflow-hidden rounded-md border border-tint/10 bg-black"
            onClick={() => setExpanded(true)}
            type="button"
          >
            {video.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt={video.title}
                className="h-full w-full object-cover transition group-hover/play:scale-[1.02]"
                loading="lazy"
                src={video.thumbnailUrl}
              />
            ) : null}
            <span className="absolute inset-0 flex items-center justify-center bg-black/30 transition group-hover/play:bg-black/45">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/95 shadow-lg ring-2 ring-white/30">
                <span className="ml-1 inline-block h-0 w-0 border-y-[8px] border-y-transparent border-l-[14px] border-l-white" />
              </span>
            </span>
          </button>
        ) : video.thumbnailUrl ? (
          <VideoThumbnail alt={video.title} src={video.thumbnailUrl} />
        ) : (
          <div className="flex aspect-video items-center justify-center rounded-md border border-tint/10 bg-tint/[0.04] px-4 text-center text-xs font-semibold uppercase tracking-[0.16em] text-muted">
            RSS
          </div>
        )}
      </div>

      <div className="min-w-0">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="rounded bg-red-500/15 px-2 py-1 text-[0.68rem] font-bold uppercase tracking-[0.12em] text-red-200">
            {providerLabel}
          </span>
          <span className="max-w-full truncate text-xs font-semibold uppercase tracking-[0.14em] text-accent">
            {video.sourceName}
          </span>
          <Badge tone="muted">{SNS_CATEGORY_LABELS[language][video.category]}</Badge>
          <span className="text-xs font-medium text-muted-2">
            {formatRelativeTime(video.publishedAt, language)}
          </span>
        </div>

        {isYouTube ? (
          <button
            className="mt-3 block w-full text-left"
            onClick={() => canExpand && setExpanded(true)}
            type="button"
          >
            <h2 className="break-words text-base font-semibold leading-snug text-ink transition group-hover:text-accent-ink sm:text-lg">
              {video.title}
            </h2>
          </button>
        ) : (
          <a href={video.url} rel="noreferrer" target="_blank">
            <h2 className="mt-3 break-words text-base font-semibold leading-snug text-ink transition group-hover:text-accent-ink sm:text-lg">
              {video.title}
            </h2>
          </a>
        )}

        <p className="mt-2 break-words text-sm leading-6 text-muted sm:line-clamp-2">
          {video.description}
        </p>

        {video.tags.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {video.tags.map((tag) => (
              <span
                className="rounded-full border border-tint/10 bg-tint/[0.03] px-2.5 py-1 text-xs font-medium text-muted"
                key={tag}
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          {canExpand ? (
            <Button
              className="min-h-10 px-4"
              onClick={() => setExpanded(true)}
              type="button"
            >
              ▶ {expandLabel}
            </Button>
          ) : null}
          <Button
            className="min-h-10 px-4"
            href={video.url}
            rel="noreferrer"
            target="_blank"
            variant="secondary"
          >
            {openLabel}
          </Button>
        </div>
      </div>
    </article>
  );
}

function getYouTubeEmbedUrl(value: string) {
  const videoId = getYouTubeVideoId(value);

  return videoId ? `https://www.youtube-nocookie.com/embed/${videoId}` : null;
}

function getYouTubeVideoId(value: string) {
  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      return sanitizeYouTubeVideoId(url.pathname.slice(1));
    }

    if (
      host === "youtube.com" ||
      host === "m.youtube.com" ||
      host === "youtube-nocookie.com"
    ) {
      const queryId = url.searchParams.get("v");

      if (queryId) {
        return sanitizeYouTubeVideoId(queryId);
      }

      const pathMatch = url.pathname.match(/\/(?:embed|shorts)\/([^/?#]+)/);
      return sanitizeYouTubeVideoId(pathMatch?.[1]);
    }

    return null;
  } catch {
    return null;
  }
}

function sanitizeYouTubeVideoId(value?: string | null) {
  return value && /^[A-Za-z0-9_-]{11}$/.test(value) ? value : null;
}
