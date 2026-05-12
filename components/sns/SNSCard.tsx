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
  const openLabel =
    language === "ko"
      ? isYouTube
        ? "YouTube에서 보기"
        : "원문 열기"
      : isYouTube
        ? "Watch on YouTube"
        : "Open original";

  return (
    <article className="group grid min-w-0 gap-3 px-3 py-4 transition hover:bg-white/[0.03] sm:gap-4 sm:px-4 md:grid-cols-[13rem_minmax(0,1fr)] lg:grid-cols-[15rem_minmax(0,1fr)]">
      <div className="min-w-0">
        {embedUrl ? (
          <iframe
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="aspect-video w-full rounded-md border border-white/10 bg-black"
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            src={embedUrl}
            title={video.title}
          />
        ) : video.thumbnailUrl ? (
          <VideoThumbnail alt={video.title} src={video.thumbnailUrl} />
        ) : (
          <div className="flex aspect-video items-center justify-center rounded-md border border-white/10 bg-white/[0.04] px-4 text-center text-xs font-semibold uppercase tracking-[0.16em] text-muted">
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
          <h2 className="mt-3 break-words text-base font-semibold leading-snug text-ink sm:text-lg">
            {video.title}
          </h2>
        ) : (
          <a href={video.url} rel="noreferrer" target="_blank">
            <h2 className="mt-3 break-words text-base font-semibold leading-snug text-ink transition group-hover:text-blue-100 sm:text-lg">
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
                className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs font-medium text-muted"
                key={tag}
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}

        {!isYouTube ? (
          <div className="mt-4">
            <Button
              className="min-h-10 w-full px-4 sm:w-auto"
              href={video.url}
              rel="noreferrer"
              target="_blank"
              variant="secondary"
            >
              {openLabel}
            </Button>
          </div>
        ) : null}
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
