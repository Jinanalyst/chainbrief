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

export function SNSCard({ language, video }: SNSCardProps) {
  return (
    <article className="group grid gap-4 px-4 py-4 transition hover:bg-white/[0.03] md:grid-cols-[15rem_minmax(0,1fr)]">
      <a href={video.url} rel="noreferrer" target="_blank">
        <VideoThumbnail alt={video.title} src={video.thumbnailUrl} />
      </a>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded bg-red-500/15 px-2 py-1 text-[0.68rem] font-bold uppercase tracking-[0.12em] text-red-200">
            YouTube
          </span>
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
            {video.sourceName}
          </span>
          <Badge tone="muted">{video.category}</Badge>
          <span className="text-xs font-medium text-muted-2">
            {formatRelativeTime(video.publishedAt, language)}
          </span>
        </div>

        <a href={video.url} rel="noreferrer" target="_blank">
          <h2 className="mt-3 text-base font-semibold leading-snug text-ink transition group-hover:text-blue-100 sm:text-lg">
            {video.title}
          </h2>
        </a>

        <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted">
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

        <div className="mt-4">
          <Button
            className="min-h-10 px-4"
            href={video.url}
            rel="noreferrer"
            target="_blank"
            variant="secondary"
          >
            Watch on YouTube
          </Button>
        </div>
      </div>
    </article>
  );
}
