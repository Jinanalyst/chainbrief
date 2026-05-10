"use client";

import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { SectionTitle } from "@/components/ui/section-title";
import {
  addOpinionPost,
  COMMUNITY_POSTS_CHANGED_EVENT,
  readCommunityPosts,
  type CommunityPost,
} from "@/lib/community";
import { BRIEF_CATEGORIES } from "@/lib/preferences";
import {
  formatLocalDateTime,
  formatRelativeTime,
  getCategoryLabel,
} from "@/lib/i18n";
import { useI18n, usePreferences } from "@/lib/i18n/use-i18n";
import { cn } from "@/lib/cn";

export default function CommunityPage() {
  const [preferences] = usePreferences();
  const { t: copy } = useI18n(preferences.language);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [draft, setDraft] = useState("");
  const [topic, setTopic] = useState("All");

  useEffect(() => {
    function syncPosts() {
      setPosts(readCommunityPosts());
    }

    syncPosts();
    window.addEventListener("storage", syncPosts);
    window.addEventListener(COMMUNITY_POSTS_CHANGED_EVENT, syncPosts);

    return () => {
      window.removeEventListener("storage", syncPosts);
      window.removeEventListener(COMMUNITY_POSTS_CHANGED_EVENT, syncPosts);
    };
  }, []);

  const filteredPosts = useMemo(() => {
    if (topic === "All") {
      return posts;
    }

    return posts.filter((post) => {
      const postTopic = post.topic ?? post.articleCategory ?? "All";
      return postTopic === topic;
    });
  }, [posts, topic]);

  function submitPost() {
    const value = draft.trim();

    if (!value) {
      return;
    }

    addOpinionPost(value, topic === "All" ? undefined : topic);
    setDraft("");
  }

  return (
    <main className="site-grid min-h-screen overflow-hidden">
      <Header />
      <section className="border-t border-white/10 bg-background/72">
        <Container className="section-space">
          <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <div className="min-w-0">
              <SectionTitle
                eyebrow={copy.pages.communityEyebrow}
                title={copy.pages.communityTitle}
                description={copy.pages.communityDescription}
              />
              <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-2">
                {copy.pages.communityPrompt}
              </p>

              <Card className="mt-6 min-w-0 p-4 sm:p-5">
                <div className="flex flex-wrap gap-2">
                  {BRIEF_CATEGORIES.map((item) => (
                    <button
                      aria-pressed={topic === item}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-xs font-bold transition",
                        topic === item
                          ? "border-accent/60 bg-accent/20 text-blue-100"
                          : "border-white/10 bg-white/[0.03] text-muted hover:border-accent/50 hover:text-ink",
                      )}
                      key={item}
                      onClick={() => setTopic(item)}
                      type="button"
                    >
                      {getCategoryLabel(item, preferences.language)}
                    </button>
                  ))}
                </div>

                <label className="mt-5 block min-w-0">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                    Your take
                  </span>
                  <textarea
                    className="mt-2 min-h-32 w-full rounded-md border border-white/10 bg-background px-4 py-3 text-sm text-ink outline-none transition placeholder:text-muted-2 focus:border-accent focus:ring-2 focus:ring-accent/30"
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder="Write a quick opinion on the market or a brief."
                    value={draft}
                  />
                </label>

                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Button className="w-full sm:w-auto" onClick={submitPost} type="button">
                    Post to community
                  </Button>
                  <p className="text-sm leading-6 text-muted-2">
                    Shares stay in this browser for now.
                  </p>
                </div>
              </Card>

              <div className="mt-6 grid gap-3">
                {filteredPosts.length === 0 ? (
                  <Card className="p-5">
                    <p className="text-sm leading-6 text-muted">
                      No community posts yet. Share a brief or write the first take.
                    </p>
                  </Card>
                ) : (
                  filteredPosts.map((post) => (
                    <CommunityPostCard
                      key={post.id}
                      post={post}
                      language={preferences.language}
                    />
                  ))
                )}
              </div>
            </div>

            <aside className="space-y-3 lg:sticky lg:top-24 lg:self-start">
              <Card className="min-w-0 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                  Community
                </p>
                <dl className="mt-3 grid gap-2 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted">Posts</dt>
                    <dd className="font-semibold text-ink">{posts.length}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted">Reposts</dt>
                    <dd className="font-semibold text-ink">
                      {posts.filter((post) => post.kind === "repost").length}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted">Opinions</dt>
                    <dd className="font-semibold text-ink">
                      {posts.filter((post) => post.kind === "opinion").length}
                    </dd>
                  </div>
                </dl>
              </Card>
            </aside>
          </div>
        </Container>
      </section>
    </main>
  );
}

function CommunityPostCard({
  post,
  language,
}: {
  post: CommunityPost;
  language: "ko" | "en";
}) {
  return (
    <Card className="min-w-0 p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={post.kind === "repost" ? "accent" : "muted"}>
          {post.kind === "repost" ? "Repost" : "Opinion"}
        </Badge>
        {post.topic ? <Badge tone="muted">{getCategoryLabel(post.topic, language)}</Badge> : null}
        <span className="text-xs font-medium text-muted-2">
          {formatRelativeTime(post.createdAt, language)}
        </span>
      </div>

      <p className="mt-3 break-words text-sm leading-7 text-ink">{post.body}</p>

      {post.articleTitle ? (
        <div className="mt-4 rounded-md border border-white/10 bg-white/[0.03] p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-2">
            Shared brief
          </p>
          <p className="mt-2 break-words text-sm font-semibold text-ink">
            {post.articleTitle}
          </p>
          <p className="mt-1 text-sm leading-6 text-muted">
            {post.articleSummary}
          </p>
          {post.articleUrl ? (
            <a
              className="mt-3 inline-flex text-sm font-semibold text-accent transition hover:text-blue-300"
              href={post.articleUrl}
              rel="noreferrer"
              target="_blank"
            >
              Open original
            </a>
          ) : null}
        </div>
      ) : null}

      <p className="mt-3 text-xs text-muted-2">
        {formatLocalDateTime(post.createdAt, language)}
      </p>
    </Card>
  );
}
