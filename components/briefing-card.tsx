import type { Article } from "@/lib/rss/types";
import { cn } from "@/lib/cn";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatBriefSummary } from "@/lib/summary";

type BriefingCardProps = {
  article: Article;
  featured?: boolean;
};

export function BriefingCard({ article, featured = false }: BriefingCardProps) {
  return (
    <Card
      as="article"
      className={cn(
        "group border-l-2 border-l-white/10 p-4 hover:-translate-y-0.5 hover:border-accent/45 hover:border-l-accent hover:shadow-glow",
        featured && "bg-surface-2/90 p-5 sm:p-6",
      )}
    >
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
          {article.sourceName}
        </span>
        <Badge tone={featured ? "accent" : "muted"}>{article.category}</Badge>
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-2">
          {formatDate(article.publishedAt)}
        </span>
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-2">
          {article.readingTime}
        </span>
      </div>

      <a href={article.originalUrl} target="_blank" rel="noreferrer">
        <h2
          className={cn(
            "mt-4 font-semibold leading-tight text-ink transition group-hover:text-blue-100",
            featured ? "text-2xl sm:text-3xl" : "text-lg",
          )}
        >
          {article.title}
        </h2>
      </a>

      <p
        className={cn(
          "mt-3 leading-7 text-muted",
          featured ? "text-base" : "text-sm",
        )}
      >
        {formatBriefSummary(article, "ko")}
      </p>

      <p className="mt-3 text-sm leading-6 text-muted-2">{article.excerpt}</p>

      <div className="mt-5 flex flex-wrap gap-2">
        {article.tags.map((tag) => (
          <span
            key={tag}
            className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-medium text-muted"
          >
            {tag}
          </span>
        ))}
      </div>

      <div className="mt-5">
        <Button
          className={featured ? undefined : "min-h-10 px-4"}
          href={article.originalUrl}
          target="_blank"
          rel="noreferrer"
          variant={featured ? "primary" : "secondary"}
        >
          Read Original
        </Button>
      </div>
    </Card>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}
