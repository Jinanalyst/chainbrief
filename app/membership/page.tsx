"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { cn } from "@/lib/cn";
import {
  addOpinionPost,
  readAuthorName,
  writeAuthorName,
  type CommunityAttachment,
  type CommunityPostType,
  type CommunityStance,
} from "@/lib/community";

type MembershipPlan = {
  id: string;
  name: string;
  price: number;
  cadence: "monthly" | "annual";
  description: string;
  benefits: string[];
  enabled: boolean;
};

const MEMBERSHIP_PLANS_STORAGE_KEY = "chain-brief-membership-plans";

const DEFAULT_PLANS: MembershipPlan[] = [
  {
    id: "trial",
    name: "Free Trial",
    price: 0,
    cadence: "monthly",
    description: "Unpaid followers can preview your research and decide whether to join.",
    benefits: ["Limited free posts", "Public community updates", "Preview of premium research"],
    enabled: true,
  },
  {
    id: "paid",
    name: "Paid Membership",
    price: 15,
    cadence: "monthly",
    description: "Members follow your analyst page and pay to unlock full research.",
    benefits: ["Full analytical posts", "Images and video explanations", "Member-only risk updates"],
    enabled: true,
  },
  {
    id: "supporter",
    name: "Supporter Payment",
    price: 49,
    cadence: "monthly",
    description: "High-intent readers can send more money for deeper analyst access.",
    benefits: ["Priority follow-up questions", "Custom scenario notes", "Early access to reports"],
    enabled: false,
  },
];

const TOPICS = [
  "Bitcoin",
  "Ethereum",
  "Solana",
  "Macro",
  "Regulation",
  "Analysis",
  "News Reactions",
  "Risk",
];

const POST_TYPES: Array<{ label: string; value: CommunityPostType }> = [
  { label: "Market thesis", value: "chart_analysis" },
  { label: "News interpretation", value: "news_interpretation" },
  { label: "Risk analysis", value: "risk_analysis" },
  { label: "Trade review", value: "trade_review" },
  { label: "General note", value: "general" },
];

const STANCES: CommunityStance[] = ["Bullish", "Bearish", "Neutral", "Question"];
const IMAGE_LIMIT_BYTES = 8 * 1024 * 1024;
const VIDEO_LIMIT_BYTES = 24 * 1024 * 1024;

export default function MembershipPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [plans, setPlans] = useState<MembershipPlan[]>(() => readMembershipPlans());
  const [selectedPlanId, setSelectedPlanId] = useState("paid");
  const [authorName, setAuthorName] = useState(
    () => readAuthorName() || "Verified Analyst",
  );
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("Bitcoin");
  const [stance, setStance] = useState<CommunityStance>("Neutral");
  const [postType, setPostType] = useState<CommunityPostType>("chart_analysis");
  const [thesis, setThesis] = useState("");
  const [evidence, setEvidence] = useState("");
  const [risk, setRisk] = useState("");
  const [memberNote, setMemberNote] = useState("");
  const [attachments, setAttachments] = useState<CommunityAttachment[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.id === selectedPlanId) ?? plans[0],
    [plans, selectedPlanId],
  );
  const enabledPlans = plans.filter((plan) => plan.enabled);
  const body = buildAnalyticalBody({ thesis, evidence, risk, memberNote });
  const draftPreview = body.trim().slice(0, 180);

  function updatePlan(planId: string, patch: Partial<MembershipPlan>) {
    setPlans((current) => {
      const next = current.map((plan) =>
        plan.id === planId ? { ...plan, ...patch } : plan,
      );
      writeMembershipPlans(next);
      return next;
    });
  }

  function updateBenefit(planId: string, index: number, value: string) {
    setPlans((current) => {
      const next = current.map((plan) => {
        if (plan.id !== planId) return plan;
        const benefits = [...plan.benefits];
        benefits[index] = value;
        return { ...plan, benefits };
      });
      writeMembershipPlans(next);
      return next;
    });
  }

  function addBenefit(planId: string) {
    updatePlan(planId, {
      benefits: [
        ...(plans.find((plan) => plan.id === planId)?.benefits ?? []),
        "New member benefit",
      ],
    });
  }

  async function handleFiles(files: FileList | null) {
    if (!files?.length) {
      return;
    }

    const nextAttachments: CommunityAttachment[] = [];

    for (const file of Array.from(files)) {
      const kind = file.type.startsWith("image/")
        ? "image"
        : file.type.startsWith("video/")
          ? "video"
          : null;
      const maxSize = kind === "image" ? IMAGE_LIMIT_BYTES : VIDEO_LIMIT_BYTES;

      if (!kind || file.size > maxSize) {
        setError(
          "Only images up to 8 MB and videos up to 24 MB can be attached.",
        );
        continue;
      }

      nextAttachments.push({
        id: `membership-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        kind,
        name: file.name,
        mimeType: file.type,
        dataUrl: await readFileAsDataUrl(file),
        size: file.size,
      });
    }

    setAttachments((current) => [...current, ...nextAttachments].slice(0, 6));
    setError(null);
  }

  function removeAttachment(attachmentId: string) {
    setAttachments((current) =>
      current.filter((attachment) => attachment.id !== attachmentId),
    );
  }

  function applyTemplate(template: string) {
    const next = applyTemplateText(template);

    setTitle(next.title);
    setTopic(next.topic);
    setThesis(next.thesis);
    setEvidence(next.evidence);
    setRisk(next.risk);
    setMemberNote(next.memberNote);
  }

  function publishToCommunity() {
    const trimmedAuthor = authorName.trim();
    const trimmedTitle = title.trim();
    const trimmedBody = body.trim();

    if (!trimmedAuthor) {
      setError("Add your analyst name before publishing.");
      return;
    }

    if (!trimmedTitle) {
      setError("Add a title before publishing.");
      return;
    }

    if (trimmedBody.length < 80) {
      setError("Write at least 80 characters so the analysis has enough context.");
      return;
    }

    writeAuthorName(trimmedAuthor);
    addOpinionPost(formatPostBody(trimmedBody, selectedPlan), topic, {
      title: trimmedTitle,
      author: trimmedAuthor,
      avatar: getInitials(trimmedAuthor),
      stance,
      postType,
      analystTier: "verified_analyst",
      discussionType:
        postType === "news_interpretation"
          ? "news_reaction"
          : postType === "risk_analysis" || postType === "chart_analysis"
            ? "analysis"
            : "opinion",
      attachments,
    });

    setMessage("Published to Community as a Verified Analyst.");
    setError(null);
    window.setTimeout(() => router.push("/community"), 700);
  }

  return (
    <main className="site-grid min-h-screen overflow-x-hidden pb-24">
      <Header />
      <section className="border-t border-white/10 bg-background/72">
        <Container className="section-space">
          <div className="grid min-w-0 gap-6 lg:grid-cols-[15rem_minmax(0,1fr)_18rem]">
            <aside className="hidden min-w-0 lg:block">
              <Card className="p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                  Membership Studio
                </p>
                <div className="mt-4 grid gap-2">
                  {["Plans", "Analysis", "Community"].map((item) => (
                    <a
                      className="rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-sm font-semibold text-muted transition hover:border-accent/50 hover:text-ink"
                      href={`#${item.toLowerCase()}`}
                      key={item}
                    >
                      {item}
                    </a>
                  ))}
                </div>
              </Card>
            </aside>

            <div className="min-w-0">
              <section
                className="rounded-lg border border-white/10 bg-surface/78 p-5 sm:p-6"
                id="plans"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
                  Verified Analyst
                </p>
                <div className="mt-3 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                  <div>
                    <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
                      Organize memberships and publish analytical content.
                    </h1>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
                      Shape your plan ladder, write a member-aware thesis, and send it
                      into Community with a Verified Analyst label.
                    </p>
                  </div>
                  <Button href="/community" variant="secondary">
                    View Community
                  </Button>
                </div>
              </section>

              <section className="mt-5 grid gap-3 md:grid-cols-3">
                {plans.map((plan) => (
                  <PlanCard
                    key={plan.id}
                    active={selectedPlanId === plan.id}
                    onSelect={() => setSelectedPlanId(plan.id)}
                    plan={plan}
                  />
                ))}
              </section>

              <section className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
                <Card className="min-w-0 p-5" id="analysis">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                        Analysis Draft
                      </p>
                      <h2 className="mt-2 text-xl font-semibold text-ink">
                        Write for {selectedPlan?.name ?? "members"}
                      </h2>
                    </div>
                    <span className="rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-semibold text-blue-100">
                      Verified Analyst
                    </span>
                  </div>

                  <div className="mt-5 grid gap-4">
                    <label className="block">
                      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                        Analyst name
                      </span>
                      <input
                        className="mt-2 min-h-11 w-full rounded-md border border-white/10 bg-background px-4 text-sm text-ink outline-none transition placeholder:text-muted-2 focus:border-accent focus:ring-2 focus:ring-accent/30"
                        onChange={(event) => setAuthorName(event.target.value)}
                        placeholder="Your analyst name"
                        value={authorName}
                      />
                    </label>

                    <label className="block">
                      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                        Title
                      </span>
                      <input
                        className="mt-2 min-h-11 w-full rounded-md border border-white/10 bg-background px-4 text-sm text-ink outline-none transition placeholder:text-muted-2 focus:border-accent focus:ring-2 focus:ring-accent/30"
                        onChange={(event) => setTitle(event.target.value)}
                        placeholder="Example: Why BTC liquidity matters this week"
                        value={title}
                      />
                    </label>

                    <div className="grid gap-4 sm:grid-cols-3">
                      <SelectField label="Topic" onChange={setTopic} value={topic} values={TOPICS} />
                      <SelectField
                        label="Stance"
                        onChange={(value) => setStance(value as CommunityStance)}
                        value={stance}
                        values={STANCES}
                      />
                      <label className="block">
                        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                          Format
                        </span>
                        <select
                          className="mt-2 min-h-11 w-full rounded-md border border-white/10 bg-background px-4 text-sm text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30"
                          onChange={(event) =>
                            setPostType(event.target.value as CommunityPostType)
                          }
                          value={postType}
                        >
                          {POST_TYPES.map((item) => (
                            <option key={item.value} value={item.value}>
                              {item.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <div className="grid gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                            Analytical content
                          </p>
                          <p className="mt-1 text-xs leading-5 text-muted-2">
                            Structured like the Community writing studio: thesis, evidence, risk, and member context.
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {[
                            "BTC liquidity thesis",
                            "ETH upgrade risk",
                            "Macro event reaction",
                          ].map((template) => (
                            <button
                              className="rounded-full border border-white/10 bg-background px-3 py-1.5 text-xs font-semibold text-muted transition hover:border-accent/50 hover:text-ink"
                              key={template}
                              onClick={() => applyTemplate(template)}
                              type="button"
                            >
                              {template}
                            </button>
                          ))}
                        </div>
                      </div>

                      <AnalysisField
                        label="Thesis"
                        onChange={setThesis}
                        placeholder="What is the main analytical point?"
                        rows={5}
                        value={thesis}
                      />
                      <AnalysisField
                        label="Evidence and data"
                        onChange={setEvidence}
                        placeholder="Charts, flows, on-chain data, positioning, catalysts, sources."
                        rows={6}
                        value={evidence}
                      />
                      <AnalysisField
                        label="Risk and invalidation"
                        onChange={setRisk}
                        placeholder="What would prove this wrong? What should readers watch?"
                        rows={4}
                        value={risk}
                      />
                      <AnalysisField
                        label="Member note"
                        onChange={setMemberNote}
                        placeholder="What free-trial readers can see versus what paid members unlock by following and paying."
                        rows={4}
                        value={memberNote}
                      />
                    </div>

                    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                            Media attachments
                          </p>
                          <p className="mt-1 text-xs leading-5 text-muted-2">
                            Add images or videos. They publish into Community with the post.
                          </p>
                        </div>
                        <Button
                          onClick={() => fileInputRef.current?.click()}
                          type="button"
                          variant="secondary"
                        >
                          Upload media
                        </Button>
                        <input
                          accept="image/*,video/*"
                          className="hidden"
                          multiple
                          onChange={(event) => {
                            void handleFiles(event.target.files);
                            event.target.value = "";
                          }}
                          ref={fileInputRef}
                          type="file"
                        />
                      </div>

                      {attachments.length ? (
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          {attachments.map((attachment) => (
                            <figure
                              className="overflow-hidden rounded-lg border border-white/10 bg-background"
                              key={attachment.id}
                            >
                              {attachment.kind === "image" ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  alt={attachment.name}
                                  className="aspect-video w-full object-cover"
                                  src={attachment.dataUrl}
                                />
                              ) : (
                                <video
                                  className="aspect-video w-full bg-black object-cover"
                                  controls
                                  src={attachment.dataUrl}
                                />
                              )}
                              <figcaption className="flex items-center justify-between gap-3 px-3 py-2 text-xs text-muted-2">
                                <span className="truncate">{attachment.name}</span>
                                <button
                                  className="font-semibold text-rose-200 transition hover:text-rose-100"
                                  onClick={() => removeAttachment(attachment.id)}
                                  type="button"
                                >
                                  Remove
                                </button>
                              </figcaption>
                            </figure>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-3 rounded-md border border-dashed border-white/10 px-3 py-6 text-center text-sm text-muted">
                          No media attached yet.
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    <Button onClick={publishToCommunity} type="button">
                      Publish to Community
                    </Button>
                    <Button href="/analyst/write" variant="secondary">
                      Open analyst writer
                    </Button>
                  </div>

                  {message ? (
                    <p className="mt-4 rounded-md border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-100">
                      {message}
                    </p>
                  ) : null}
                  {error ? (
                    <p className="mt-4 rounded-md border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-sm text-rose-100">
                      {error}
                    </p>
                  ) : null}
                </Card>

                <aside className="space-y-3 lg:sticky lg:top-24 lg:self-start">
                  <Card className="p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                      Selected Plan
                    </p>
                    {selectedPlan ? (
                      <div className="mt-3 grid gap-3">
                        <label className="block">
                          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-2">
                            Plan name
                          </span>
                          <input
                            className="mt-1.5 min-h-9 w-full rounded-md border border-white/10 bg-background px-3 text-sm text-ink outline-none transition focus:border-accent"
                            onChange={(event) =>
                              updatePlan(selectedPlan.id, { name: event.target.value })
                            }
                            value={selectedPlan.name}
                          />
                        </label>
                        <label className="block">
                          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-2">
                            Monthly price
                          </span>
                          <input
                            className="mt-1.5 min-h-9 w-full rounded-md border border-white/10 bg-background px-3 text-sm text-ink outline-none transition focus:border-accent"
                            min={0}
                            onChange={(event) =>
                              updatePlan(selectedPlan.id, {
                                price: Number(event.target.value),
                              })
                            }
                            type="number"
                            value={selectedPlan.price}
                          />
                        </label>
                        <label className="block">
                          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-2">
                            Description
                          </span>
                          <textarea
                            className="mt-1.5 min-h-20 w-full rounded-md border border-white/10 bg-background px-3 py-2 text-sm text-ink outline-none transition focus:border-accent"
                            onChange={(event) =>
                              updatePlan(selectedPlan.id, {
                                description: event.target.value,
                              })
                            }
                            value={selectedPlan.description}
                          />
                        </label>
                        <label className="flex items-center gap-2 text-sm font-semibold text-muted">
                          <input
                            checked={selectedPlan.enabled}
                            onChange={(event) =>
                              updatePlan(selectedPlan.id, {
                                enabled: event.target.checked,
                              })
                            }
                            type="checkbox"
                          />
                          Enabled
                        </label>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-2">
                            Benefits
                          </p>
                          <div className="mt-2 grid gap-2">
                            {selectedPlan.benefits.map((benefit, index) => (
                              <input
                                className="min-h-9 rounded-md border border-white/10 bg-background px-3 text-sm text-ink outline-none transition focus:border-accent"
                                key={`${selectedPlan.id}-${index}`}
                                onChange={(event) =>
                                  updateBenefit(
                                    selectedPlan.id,
                                    index,
                                    event.target.value,
                                  )
                                }
                                value={benefit}
                              />
                            ))}
                            <button
                              className="text-left text-xs font-semibold text-accent transition hover:text-blue-200"
                              onClick={() => addBenefit(selectedPlan.id)}
                              type="button"
                            >
                              + Add benefit
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </Card>

                  <Card className="p-4" id="community">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                      Community Preview
                    </p>
                    <div className="mt-3 rounded-md border border-white/10 bg-white/[0.03] p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded bg-accent/15 px-2 py-1 text-[0.68rem] font-bold uppercase tracking-[0.12em] text-blue-200">
                          Verified Analyst
                        </span>
                        <span className="text-xs font-semibold text-muted">
                          {topic}
                        </span>
                      </div>
                      <h3 className="mt-3 break-words text-base font-semibold text-ink">
                        {title || "Your title will appear here"}
                      </h3>
                      <p className="mt-2 break-words text-sm leading-6 text-muted">
                        {draftPreview ||
                          "Your community preview will use the opening of your analysis."}
                      </p>
                      {attachments.length ? (
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          {attachments.slice(0, 2).map((attachment) => (
                            <div
                              className="overflow-hidden rounded-md border border-white/10"
                              key={attachment.id}
                            >
                              {attachment.kind === "image" ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  alt={attachment.name}
                                  className="aspect-video w-full object-cover"
                                  src={attachment.dataUrl}
                                />
                              ) : (
                                <video
                                  className="aspect-video w-full bg-black object-cover"
                                  src={attachment.dataUrl}
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </Card>

                  <Card className="p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                      Plan Count
                    </p>
                    <p className="mt-3 text-3xl font-semibold text-ink">
                      {enabledPlans.length}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-muted-2">
                      Enabled plans are referenced in your published analysis.
                    </p>
                  </Card>
                </aside>
              </section>
            </div>

            <aside className="hidden min-w-0 lg:block">
              <Card className="p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                  Publishing Rules
                </p>
                <ul className="mt-3 grid gap-2 text-sm leading-6 text-muted">
                  <li>State your thesis clearly.</li>
                  <li>Separate evidence from opinion.</li>
                  <li>Include risk and invalidation.</li>
                  <li>Avoid guaranteed-return language.</li>
                </ul>
              </Card>
            </aside>
          </div>
        </Container>
      </section>
    </main>
  );
}

function PlanCard({
  active,
  onSelect,
  plan,
}: {
  active: boolean;
  onSelect: () => void;
  plan: MembershipPlan;
}) {
  return (
    <button
      className={cn(
        "min-w-0 rounded-lg border p-4 text-left transition",
        active
          ? "border-accent/60 bg-accent/10"
          : "border-white/10 bg-surface/70 hover:border-accent/40",
        !plan.enabled && "opacity-60",
      )}
      onClick={onSelect}
      type="button"
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-words text-sm font-semibold text-ink">{plan.name}</p>
          <p className="mt-1 text-xs leading-5 text-muted">{plan.description}</p>
        </div>
        <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.03] px-2 py-1 text-xs font-semibold text-muted">
          {plan.enabled ? "On" : "Off"}
        </span>
      </div>
      <p className="mt-4 text-2xl font-semibold text-ink">
        {plan.price === 0 ? "Free" : `$${plan.price}`}
        {plan.price > 0 ? <span className="text-sm text-muted">/mo</span> : null}
      </p>
    </button>
  );
}

function SelectField({
  label,
  onChange,
  value,
  values,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
  values: readonly string[];
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
        {label}
      </span>
      <select
        className="mt-2 min-h-11 w-full rounded-md border border-white/10 bg-background px-4 text-sm text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {values.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
    </label>
  );
}

function AnalysisField({
  label,
  onChange,
  placeholder,
  rows,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  rows: number;
  value: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
        {label}
      </span>
      <textarea
        className="mt-2 w-full rounded-md border border-white/10 bg-background px-4 py-3 text-sm leading-7 text-ink outline-none transition placeholder:text-muted-2 focus:border-accent focus:ring-2 focus:ring-accent/30"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={rows}
        value={value}
      />
    </label>
  );
}

function buildAnalyticalBody({
  evidence,
  memberNote,
  risk,
  thesis,
}: {
  evidence: string;
  memberNote: string;
  risk: string;
  thesis: string;
}) {
  return [
    ["Thesis", thesis],
    ["Evidence and data", evidence],
    ["Risk and invalidation", risk],
    ["Member note", memberNote],
  ]
    .filter(([, value]) => value.trim().length > 0)
    .map(([label, value]) => `${label}\n${value.trim()}`)
    .join("\n\n");
}

function applyTemplateText(template: string) {
  if (template === "ETH upgrade risk") {
    return {
      title: "ETH upgrade risk: what members should watch",
      topic: "Ethereum",
      thesis:
        "Ethereum can benefit from the next upgrade cycle, but the trade depends on whether fee demand and staking flows improve together.",
      evidence:
        "Track ETH/BTC, L2 fee activity, staking queue changes, ETF flow headlines, and developer activity around the upgrade window.",
      risk:
        "The thesis weakens if ETH/BTC keeps making lower lows, L2 activity does not translate into mainnet value, or macro liquidity tightens.",
      memberNote:
        "Free-trial readers get the framework. Paid members get follow-up updates when the watched signals change.",
    };
  }

  if (template === "Macro event reaction") {
    return {
      title: "Macro event reaction: liquidity first, narrative second",
      topic: "Macro",
      thesis:
        "Crypto risk appetite is likely to follow liquidity conditions more than single-event headlines in the near term.",
      evidence:
        "Watch dollar strength, yields, ETF flows, stablecoin supply, BTC dominance, and whether equities confirm or reject the move.",
      risk:
        "The view fails if liquidity improves but crypto breadth stays weak, or if regulatory headlines dominate flow data.",
      memberNote:
        "Unpaid followers can read the event reaction. Paid members see the scenario map and follow-up positioning notes.",
    };
  }

  return {
    title: "BTC liquidity thesis: the setup into this week",
    topic: "Bitcoin",
    thesis:
      "Bitcoin upside is more credible when ETF demand, stablecoin liquidity, and market breadth improve at the same time.",
    evidence:
      "Track spot ETF inflows, stablecoin supply, open interest growth, funding rates, and whether altcoin breadth confirms BTC strength.",
    risk:
      "The setup weakens if leverage rises faster than spot demand or if BTC fails to hold key levels after a liquidity impulse.",
    memberNote:
      "Free-trial readers can see the thesis and risk framework. Paid members who follow and pay get the deeper update path.",
  };
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      typeof reader.result === "string"
        ? resolve(reader.result)
        : reject(new Error("File could not be read."));
    reader.onerror = () => reject(reader.error ?? new Error("File could not be read."));
    reader.readAsDataURL(file);
  });
}

function readMembershipPlans() {
  if (typeof window === "undefined") {
    return DEFAULT_PLANS;
  }

  try {
    const raw = window.localStorage.getItem(MEMBERSHIP_PLANS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;

    if (!Array.isArray(parsed)) {
      return DEFAULT_PLANS;
    }

    const plans = parsed
      .map(normalizePlan)
      .filter((plan): plan is MembershipPlan => Boolean(plan));

    return plans.length > 0 && !hasLegacyPlanNames(plans) ? plans : DEFAULT_PLANS;
  } catch {
    return DEFAULT_PLANS;
  }
}

function hasLegacyPlanNames(plans: MembershipPlan[]) {
  return plans.some((plan) =>
    ["Public Brief", "Core Research", "Analyst Desk"].includes(plan.name),
  );
}

function writeMembershipPlans(plans: MembershipPlan[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(MEMBERSHIP_PLANS_STORAGE_KEY, JSON.stringify(plans));
}

function normalizePlan(value: unknown): MembershipPlan | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const plan = value as Partial<MembershipPlan>;

  if (typeof plan.id !== "string" || typeof plan.name !== "string") {
    return null;
  }

  return {
    id: plan.id,
    name: plan.name,
    price: Number.isFinite(Number(plan.price)) ? Number(plan.price) : 0,
    cadence: plan.cadence === "annual" ? "annual" : "monthly",
    description:
      typeof plan.description === "string" ? plan.description : "",
    benefits: Array.isArray(plan.benefits)
      ? plan.benefits.filter((item): item is string => typeof item === "string")
      : [],
    enabled: plan.enabled !== false,
  };
}

function formatPostBody(body: string, plan?: MembershipPlan) {
  if (!plan) {
    return body;
  }

  const benefits = plan.benefits
    .map((benefit) => benefit.trim())
    .filter(Boolean)
    .map((benefit) => `- ${benefit}`)
    .join("\n");

  return [
    body,
    "",
    "Membership context",
    `${plan.name}: ${plan.price === 0 ? "Free" : `$${plan.price}/month`}`,
    plan.description,
    benefits ? `Member benefits:\n${benefits}` : "",
    "",
    "Risk note: This content is educational and is not financial advice.",
  ]
    .filter(Boolean)
    .join("\n");
}

function getInitials(value: string) {
  const words = value.trim().split(/\s+/).filter(Boolean);
  const initials = words
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

  return initials || "VA";
}
