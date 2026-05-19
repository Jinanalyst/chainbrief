import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { Header } from "@/components/header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{ postId: string }>;
};

export default async function CommunityPostDetailPage({ params }: PageProps) {
  const { postId } = await params;
  const supabase = await createClient();

  const { data: post } = await supabase
    .from("posts")
    .select("id, author_id, title, body, category, post_type, coin_tags, view_count, created_at, quoted_post_id, quote_kind")
    .eq("id", postId)
    .eq("status", "published")
    .maybeSingle();

  if (!post) notFound();

  const [authorProfile, comments, likes, saves, reactions, rebriefs, quoteAnalyses] = await Promise.all([
    getProfiles(supabase, [post.author_id]),
    supabase
      .from("post_comments")
      .select("id, user_id, body, parent_comment_id, created_at")
      .eq("post_id", postId)
      .order("created_at", { ascending: true }),
    supabase.from("post_likes").select("user_id, created_at").eq("post_id", postId),
    supabase.from("post_bookmarks").select("user_id, created_at").eq("post_id", postId),
    supabase.from("post_reactions").select("user_id, reaction, created_at").eq("post_id", postId).order("created_at", { ascending: true }),
    supabase
      .from("posts")
      .select("id, author_id, title, body, created_at")
      .eq("quoted_post_id", postId)
      .eq("quote_kind", "rebrief")
      .eq("status", "published")
      .order("created_at", { ascending: false }),
    supabase
      .from("posts")
      .select("id, author_id, title, body, created_at")
      .eq("quoted_post_id", postId)
      .eq("quote_kind", "quote_analysis")
      .eq("status", "published")
      .order("created_at", { ascending: false }),
  ]);

  const interactionUserIds = [
    ...(comments.data ?? []).map((item) => item.user_id),
    ...(likes.data ?? []).map((item) => item.user_id),
    ...(saves.data ?? []).map((item) => item.user_id),
    ...(reactions.data ?? []).map((item) => item.user_id),
    ...(rebriefs.data ?? []).map((item) => item.author_id),
    ...(quoteAnalyses.data ?? []).map((item) => item.author_id),
  ].filter((value): value is string => Boolean(value));
  const profiles = { ...authorProfile, ...(await getProfiles(supabase, interactionUserIds)) };
  const bull = (reactions.data ?? []).filter((item) => item.reaction === "bull").length;
  const bear = (reactions.data ?? []).filter((item) => item.reaction === "bear").length;
  const sentimentTotal = bull + bear;
  const bullShare = sentimentTotal ? Math.round((bull / sentimentTotal) * 100) : 0;

  return (
    <main className="site-grid min-h-screen overflow-x-hidden pb-24">
      <Header />
      <section className="border-t border-tint/10 bg-background/72">
        <Container className="section-space">
          <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <div className="grid gap-4">
              <Card className="p-5 sm:p-6">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                  <Link className="font-semibold text-accent" href="/community">Community</Link>
                  <span>/</span>
                  <span>{profiles[post.author_id]?.username ?? "Chain Brief member"}</span>
                  <Badge tone="muted">{post.category}</Badge>
                </div>
                <h1 className="mt-4 break-words text-3xl font-semibold tracking-tight text-ink">{post.title}</h1>
                <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-7 text-muted">{post.body}</p>
                {post.coin_tags?.length ? (
                  <div className="mt-5 flex flex-wrap gap-2">
                    {post.coin_tags.map((tag: string) => <Badge key={tag} tone="muted">#{tag}</Badge>)}
                  </div>
                ) : null}
              </Card>

              <DetailSection title="Related Comments">
                {(comments.data ?? []).length ? (
                  (comments.data ?? []).map((comment) => (
                    <InteractionRow
                      key={comment.id}
                      body={comment.body}
                      meta={formatDate(comment.created_at)}
                      user={profiles[comment.user_id]?.username}
                    />
                  ))
                ) : (
                  <EmptyDetail>No comments yet.</EmptyDetail>
                )}
              </DetailSection>

              <DetailSection title="Rebriefs">
                {(rebriefs.data ?? []).length ? (
                  (rebriefs.data ?? []).map((item) => (
                    <InteractionRow
                      key={item.id}
                      body={item.body}
                      href={`/community/${item.id}`}
                      meta={formatDate(item.created_at)}
                      title={item.title}
                      user={profiles[item.author_id]?.username}
                    />
                  ))
                ) : (
                  <EmptyDetail>No rebriefs yet.</EmptyDetail>
                )}
              </DetailSection>

              <DetailSection title="Quote Analysis">
                {(quoteAnalyses.data ?? []).length ? (
                  (quoteAnalyses.data ?? []).map((item) => (
                    <InteractionRow
                      key={item.id}
                      body={item.body}
                      href={`/community/${item.id}`}
                      meta={formatDate(item.created_at)}
                      title={item.title}
                      user={profiles[item.author_id]?.username}
                    />
                  ))
                ) : (
                  <EmptyDetail>No quote analysis yet.</EmptyDetail>
                )}
              </DetailSection>
            </div>

            <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
              <Card className="p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Engagement</p>
                <div className="mt-4 grid gap-2 text-sm">
                  <StatRow label="Views" value={formatCompact(Number(post.view_count ?? 0))} />
                  <StatRow label="Likes" value={String((likes.data ?? []).length)} />
                  <StatRow label="Comments" value={String((comments.data ?? []).length)} />
                  <StatRow label="Saves" value={String((saves.data ?? []).length)} />
                  <StatRow label="Rebriefs" value={String((rebriefs.data ?? []).length)} />
                  <StatRow label="Quote analysis" value={String((quoteAnalyses.data ?? []).length)} />
                </div>
              </Card>

              <Card className="p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Bull/Bear History</p>
                <div className="mt-4">
                  <div className="mb-2 flex justify-between text-xs font-semibold text-muted">
                    <span>{bull} Bull</span>
                    <span>{bear} Bear</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-rose-400/30">
                    <div className="h-full rounded-full bg-emerald-400" style={{ width: `${bullShare}%` }} />
                  </div>
                </div>
                <div className="mt-4 grid gap-2">
                  {(reactions.data ?? []).map((item, index) => (
                    <div key={`${item.user_id}-${item.created_at}-${index}`} className="flex justify-between gap-3 rounded-lg border border-tint/10 bg-tint/[0.03] px-3 py-2 text-xs">
                      <span className="truncate text-ink">{profiles[item.user_id]?.username ?? "Member"}</span>
                      <span className={item.reaction === "bull" ? "text-success" : "text-danger"}>
                        {item.reaction.toUpperCase()} · {formatDate(item.created_at)}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>

              <InteractedUsers title="Liked by" userIds={(likes.data ?? []).map((item) => item.user_id)} profiles={profiles} />
              <InteractedUsers title="Saved by" userIds={(saves.data ?? []).map((item) => item.user_id)} profiles={profiles} />
            </aside>
          </div>
        </Container>
      </section>
    </main>
  );
}

async function getProfiles(supabase: Awaited<ReturnType<typeof createClient>>, userIds: string[]) {
  const ids = Array.from(new Set(userIds.filter(Boolean)));
  if (!ids.length) return {} as Record<string, { username: string | null; avatar_url: string | null }>;
  const { data } = await supabase.from("profiles").select("id, username, avatar_url").in("id", ids);
  return Object.fromEntries((data ?? []).map((item) => [item.id, { username: item.username, avatar_url: item.avatar_url }]));
}

function DetailSection({ children, title }: { children: ReactNode; title: string }) {
  return (
    <Card className="p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">{title}</p>
      <div className="mt-4 grid gap-3">{children}</div>
    </Card>
  );
}

function InteractionRow({ body, href, meta, title, user }: { body: string; href?: string; meta: string; title?: string; user?: string | null }) {
  const content = (
    <div className="rounded-xl border border-tint/10 bg-tint/[0.03] p-3">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
        <span className="font-semibold text-ink">{user ?? "Member"}</span>
        <span>{meta}</span>
      </div>
      {title ? <p className="mt-2 text-sm font-semibold text-ink">{title}</p> : null}
      <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-muted">{body}</p>
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

function EmptyDetail({ children }: { children: ReactNode }) {
  return <p className="text-sm leading-6 text-muted">{children}</p>;
}

function InteractedUsers({ profiles, title, userIds }: { profiles: Record<string, { username: string | null }>; title: string; userIds: string[] }) {
  const ids = Array.from(new Set(userIds));
  return (
    <Card className="p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">{title}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {ids.length ? ids.map((id) => <Badge key={id} tone="muted">{profiles[id]?.username ?? "Member"}</Badge>) : <EmptyDetail>No users yet.</EmptyDetail>}
      </div>
    </Card>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-tint/10 bg-tint/[0.03] px-3 py-2">
      <span className="text-muted">{label}</span>
      <span className="font-semibold text-ink">{value}</span>
    </div>
  );
}

function formatCompact(value: number) {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}
