"use client";

import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import {
  ANALYST_APPLICATIONS_CHANGED_EVENT,
  ANALYST_DISCLAIMER,
  ANALYST_NO_PROMISES,
  ANALYST_PATH_STEPS,
  ANALYST_PAYMENT_ADDRESS,
  ANALYST_PAYMENT_AMOUNT,
  ANALYST_PAYMENT_CHAIN_NAME,
  ANALYST_PAYMENT_TOKEN,
  ANALYST_PAYMENT_WARNING,
  ANALYST_REFUND_POLICY,
  ANALYST_REVENUE_COPY,
  isAdminUser,
  readAnalystApplicationByUserId,
  requestRefund,
  submitPaymentProof,
  upsertAnalystApplication,
  type AnalystApplicationRecord,
} from "@/lib/analyst-growth";

const INVESTMENT_NOTICE =
  "This content is for informational and educational purposes only and is not financial advice. Crypto assets involve risk of loss. All investment decisions are the sole responsibility of the user.";

export default function AnalystApplyPage() {
  const supabase = useMemo(() => (hasSupabaseConfig ? createClient() : null), []);
  const [user, setUser] = useState<User | null>(null);
  const [application, setApplication] = useState<AnalystApplicationRecord | null>(null);
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expertise, setExpertise] = useState("");
  const [bio, setBio] = useState("");
  const [mainMarkets, setMainMarkets] = useState("");
  const [sampleContent, setSampleContent] = useState("");
  const [sampleUrl, setSampleUrl] = useState("");
  const [agreeNoAdvice, setAgreeNoAdvice] = useState(false);
  const [agreeNoSignals, setAgreeNoSignals] = useState(false);
  const [agreeNoGuarantee, setAgreeNoGuarantee] = useState(false);
  const [agreeRefund, setAgreeRefund] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [senderWalletAddress, setSenderWalletAddress] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [refundWalletAddress, setRefundWalletAddress] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let active = true;

    supabase.auth.getUser().then(({ data }) => {
      if (!active) {
        return;
      }

      setUser(data.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (!user) {
      return;
    }

    const load = () => {
      const current = readAnalystApplicationByUserId(user.id);
      setApplication(current);
      setExpertise(current?.expertise ?? "");
      setBio(current?.bio ?? "");
      setMainMarkets(current?.mainMarkets ?? "");
      setSampleContent(current?.sampleContent ?? "");
      setSampleUrl(current?.sampleUrl ?? "");
      setTxHash(current?.txHash ?? "");
      setSenderWalletAddress(current?.senderWalletAddress ?? "");
      setPaymentNote(current?.paymentNote ?? "");
      setRefundWalletAddress(current?.refundWalletAddress ?? "");
      setRefundReason(current?.refundReason ?? "");
    };

    load();
    window.addEventListener("storage", load);
    window.addEventListener(ANALYST_APPLICATIONS_CHANGED_EVENT, load);

    return () => {
      window.removeEventListener("storage", load);
      window.removeEventListener(ANALYST_APPLICATIONS_CHANGED_EVENT, load);
    };
  }, [user]);

  const isAdmin = isAdminUser(user);
  const canRequestRefund =
    Boolean(application) &&
    (application?.paymentStatus === "confirmed" || application?.paymentStatus === "submitted") &&
    application?.status !== "under_review" &&
    application?.status !== "approved" &&
    application?.status !== "rejected";

  async function saveApplication() {
    if (!user) {
      setError("Please log in first.");
      return;
    }

    setIsSaving(true);
    setNotice(null);
    setError(null);

    const next = upsertAnalystApplication(user, {
      expertise,
      bio,
      mainMarkets,
      sampleContent,
      sampleUrl,
    });

    setApplication(next);
    setIsSaving(false);
    setNotice("Application saved. Continue with the 30 USDT BEP20 review fee.");
  }

  async function submitProof() {
    if (!user) {
      setError("Please log in first.");
      return;
    }

    if (!application) {
      setError("Create the application first.");
      return;
    }

    setIsSaving(true);
    setNotice(null);
    setError(null);

    const next = submitPaymentProof(user, {
      txHash,
      senderWalletAddress,
      paymentNote,
    });

    if (!next) {
      setError("No application found.");
      setIsSaving(false);
      return;
    }

    setApplication(next);
    setIsSaving(false);
    setNotice("Payment proof submitted. Chain Brief will review the transaction and application.");
  }

  async function submitRefundRequest() {
    if (!user) {
      setError("Please log in first.");
      return;
    }

    if (!application) {
      setError("Create the application first.");
      return;
    }

    if (!canRequestRefund) {
      setError("Refund may be restricted because the review process has already started.");
      return;
    }

    setIsSaving(true);
    setNotice(null);
    setError(null);

    const next = requestRefund(user, {
      refundWalletAddress,
      refundReason,
    });

    if (!next || "locked" in next) {
      setError("Refund may be restricted because the review process has already started.");
      setIsSaving(false);
      return;
    }

    setApplication(next);
    setIsSaving(false);
    setNotice("Refund request submitted. Use a valid USDT BEP20 wallet address for any refund.");
  }

  async function copyAddress() {
    await navigator.clipboard.writeText(ANALYST_PAYMENT_ADDRESS);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  if (!hasSupabaseConfig) {
    return (
      <main className="site-grid min-h-screen overflow-hidden">
        <Header />
        <Container className="section-space">
          <Card className="p-6">
            <p className="text-lg font-semibold text-ink">Supabase is not configured.</p>
            <p className="mt-2 text-sm leading-6 text-muted">
              Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
              to `.env.local`.
            </p>
          </Card>
        </Container>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="site-grid min-h-screen overflow-hidden">
        <Header />
        <Container className="section-space">
          <Card className="grid gap-4 p-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                Verified Analyst
              </p>
              <h1 className="mt-2 text-2xl font-semibold text-ink">
                Log in to apply as a Verified Analyst
              </h1>
              <p className="mt-2 text-sm leading-6 text-muted">
                Use Google login to connect your Chain Brief account before sending
                payment proof or requesting a refund.
              </p>
            </div>
            <Button className="w-full sm:w-auto" href="/login">
              Log in
            </Button>
          </Card>
        </Container>
      </main>
    );
  }

  return (
    <main className="site-grid min-h-screen overflow-hidden pb-20">
      <Header />
      <section className="border-t border-white/10 bg-background/72">
        <Container className="section-space">
          <div className="mb-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
                Verified Analyst
              </p>
              <h1 className="mt-2 break-words text-3xl font-semibold tracking-tight text-ink">
                Application review fee, payment proof, and refund flow
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
                Chain Brief is building a content-based analyst economy. This page is
                for informational and educational content, not investment signals.
              </p>
            </div>
            <Card className="p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                Current Status
              </p>
              <p className="mt-2 text-sm font-semibold text-ink">
                {application?.status ?? "draft"}
              </p>
              <p className="mt-1 text-xs text-muted-2">
                {application?.paymentStatus ?? "pending"}
              </p>
            </Card>
          </div>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
            <div className="grid gap-5">
              <Card className="p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                  Analyst Path
                </p>
                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                  {ANALYST_PATH_STEPS.map((step, index) => (
                    <div
                      className="rounded-md border border-white/10 bg-white/[0.03] p-4"
                      key={step.title}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="rounded-md border border-accent/30 bg-accent/15 px-2 py-1 text-xs font-bold text-blue-100">
                          {index + 1}
                        </span>
                        <span className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-muted-2">
                          {step.title}
                        </span>
                      </div>
                      <p className="mt-3 text-xs leading-5 text-muted">{step.description}</p>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                      Application Form
                    </p>
                    <h2 className="mt-2 text-xl font-semibold text-ink">
                      Tell Chain Brief what you cover.
                    </h2>
                  </div>
                  <Button href="#payment" variant="secondary">
                    Go to payment
                  </Button>
                </div>

                <div className="mt-5 grid gap-4">
                  <label className="block">
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                      Expertise area
                    </span>
                    <input
                      className="mt-2 min-h-11 w-full rounded-md border border-white/10 bg-background px-4 text-sm text-ink outline-none transition placeholder:text-muted-2 focus:border-accent focus:ring-2 focus:ring-accent/30"
                      onChange={(event) => setExpertise(event.target.value)}
                      placeholder="BTC, Solana, macro, DeFi, risk analysis"
                      value={expertise}
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                      Bio
                    </span>
                    <textarea
                      className="mt-2 min-h-28 w-full rounded-md border border-white/10 bg-background px-4 py-3 text-sm text-ink outline-none transition placeholder:text-muted-2 focus:border-accent focus:ring-2 focus:ring-accent/30"
                      onChange={(event) => setBio(event.target.value)}
                      placeholder="Short background, your style of analysis, and what readers should expect."
                      value={bio}
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                      Main markets
                    </span>
                    <input
                      className="mt-2 min-h-11 w-full rounded-md border border-white/10 bg-background px-4 text-sm text-ink outline-none transition placeholder:text-muted-2 focus:border-accent focus:ring-2 focus:ring-accent/30"
                      onChange={(event) => setMainMarkets(event.target.value)}
                      placeholder="BTC, ETH, SOL, MEME, DeFi"
                      value={mainMarkets}
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                      Sample analysis content
                    </span>
                    <textarea
                      className="mt-2 min-h-32 w-full rounded-md border border-white/10 bg-background px-4 py-3 text-sm text-ink outline-none transition placeholder:text-muted-2 focus:border-accent focus:ring-2 focus:ring-accent/30"
                      onChange={(event) => setSampleContent(event.target.value)}
                      placeholder="Paste a sample analysis, chart note, or trade review excerpt."
                      value={sampleContent}
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                      Sample analysis URL
                    </span>
                    <input
                      className="mt-2 min-h-11 w-full rounded-md border border-white/10 bg-background px-4 text-sm text-ink outline-none transition placeholder:text-muted-2 focus:border-accent focus:ring-2 focus:ring-accent/30"
                      onChange={(event) => setSampleUrl(event.target.value)}
                      placeholder="https://"
                      value={sampleUrl}
                    />
                  </label>

                  <div className="grid gap-2 rounded-md border border-white/10 bg-white/[0.03] p-4 text-sm text-muted">
                    <AgreementRow
                      checked={agreeNoAdvice}
                      label="I understand that Chain Brief is not an investment advisory platform."
                      onChange={setAgreeNoAdvice}
                    />
                    <AgreementRow
                      checked={agreeNoSignals}
                      label="I will not provide guaranteed-profit claims, principal guarantees, trading signals, or 1:1 buy/sell instructions."
                      onChange={setAgreeNoSignals}
                    />
                    <AgreementRow
                      checked={agreeNoGuarantee}
                      label="I understand that payment does not guarantee approval."
                      onChange={setAgreeNoGuarantee}
                    />
                    <AgreementRow
                      checked={agreeRefund}
                      label="I understand the refund policy."
                      onChange={setAgreeRefund}
                    />
                  </div>

                  <Button
                    disabled={
                      isSaving ||
                      !expertise.trim() ||
                      !bio.trim() ||
                      !mainMarkets.trim() ||
                      !sampleContent.trim() ||
                      !agreeNoAdvice ||
                      !agreeNoSignals ||
                      !agreeNoGuarantee ||
                      !agreeRefund
                    }
                    onClick={saveApplication}
                    type="button"
                  >
                    Save application
                  </Button>
                </div>
              </Card>

              <Card id="payment" className="p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                      Verified Analyst Application Review Fee
                    </p>
                    <h2 className="mt-2 text-xl font-semibold text-ink">30 USDT</h2>
                  </div>
                  <Button onClick={copyAddress} type="button" variant="secondary">
                    {copied ? "Copied!" : "Copy Address"}
                  </Button>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <InfoPill label="Amount" value={`${ANALYST_PAYMENT_AMOUNT} ${ANALYST_PAYMENT_TOKEN}`} />
                  <InfoPill
                    label="Network"
                    value={`${ANALYST_PAYMENT_TOKEN} BEP20 / ${ANALYST_PAYMENT_CHAIN_NAME}`}
                  />
                  <InfoPill label="Receiver address" value={ANALYST_PAYMENT_ADDRESS} span={2} />
                </div>

                <div className="mt-4 rounded-md border border-rose-400/20 bg-rose-400/10 p-3">
                  <p className="text-sm font-semibold text-rose-100">USDT BEP20 Only</p>
                  <p className="mt-2 text-sm leading-6 text-rose-100">
                    {ANALYST_PAYMENT_WARNING}
                  </p>
                </div>

                <div className="mt-4 rounded-md border border-white/10 bg-white/[0.03] p-3">
                  <p className="text-sm leading-6 text-muted">
                    This fee is not a purchase of analyst status. It is a platform review and
                    operation fee. Approval is not guaranteed.
                  </p>
                </div>

                <div className="mt-4 grid gap-4">
                  <label className="block">
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                      Transaction hash
                    </span>
                    <input
                      className="mt-2 min-h-11 w-full rounded-md border border-white/10 bg-background px-4 text-sm text-ink outline-none transition placeholder:text-muted-2 focus:border-accent focus:ring-2 focus:ring-accent/30"
                      onChange={(event) => setTxHash(event.target.value)}
                      placeholder="0x..."
                      value={txHash}
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                      Sender wallet address
                    </span>
                    <input
                      className="mt-2 min-h-11 w-full rounded-md border border-white/10 bg-background px-4 text-sm text-ink outline-none transition placeholder:text-muted-2 focus:border-accent focus:ring-2 focus:ring-accent/30"
                      onChange={(event) => setSenderWalletAddress(event.target.value)}
                      placeholder="0x..."
                      value={senderWalletAddress}
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                      Payment note
                    </span>
                    <textarea
                      className="mt-2 min-h-24 w-full rounded-md border border-white/10 bg-background px-4 py-3 text-sm text-ink outline-none transition placeholder:text-muted-2 focus:border-accent focus:ring-2 focus:ring-accent/30"
                      onChange={(event) => setPaymentNote(event.target.value)}
                      placeholder="Optional note for the review team"
                      value={paymentNote}
                    />
                  </label>
                  <Button disabled={isSaving || !application} onClick={submitProof} type="button">
                    Submit Payment Proof
                  </Button>
                  <p className="text-sm leading-6 text-muted">
                    Payment proof submission stores `payment_status = submitted` and `application_status = payment_submitted`.
                  </p>
                </div>
              </Card>

              <Card className="p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                  Refund Request
                </p>
                <p className="mt-2 text-sm leading-6 text-muted">{ANALYST_REFUND_POLICY}</p>
                <div className="mt-4 grid gap-4">
                  <label className="block">
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                      Refund wallet address
                    </span>
                    <input
                      className="mt-2 min-h-11 w-full rounded-md border border-white/10 bg-background px-4 text-sm text-ink outline-none transition placeholder:text-muted-2 focus:border-accent focus:ring-2 focus:ring-accent/30"
                      onChange={(event) => setRefundWalletAddress(event.target.value)}
                      placeholder="BEP20 refund address"
                      value={refundWalletAddress}
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                      Refund reason
                    </span>
                    <textarea
                      className="mt-2 min-h-28 w-full rounded-md border border-white/10 bg-background px-4 py-3 text-sm text-ink outline-none transition placeholder:text-muted-2 focus:border-accent focus:ring-2 focus:ring-accent/30"
                      onChange={(event) => setRefundReason(event.target.value)}
                      placeholder="Why are you requesting a refund?"
                      value={refundReason}
                    />
                  </label>
                  <Button disabled={isSaving || !canRequestRefund} onClick={submitRefundRequest} type="button" variant="secondary">
                    Request Refund
                  </Button>
                  {!canRequestRefund ? (
                    <p className="text-sm leading-6 text-amber-100">
                      Refund may be restricted because the review process has already started.
                    </p>
                  ) : null}
                </div>
              </Card>
            </div>

            <aside className="space-y-3">
              <Card className="p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                  How Analysts Can Earn on Chain Brief
                </p>
                <p className="mt-3 text-sm leading-6 text-muted">{ANALYST_REVENUE_COPY}</p>
                <div className="mt-4 grid gap-2 text-sm">
                  <div className="rounded-md border border-white/10 bg-white/[0.03] px-3 py-2">Analyst Reward Pool</div>
                  <div className="rounded-md border border-white/10 bg-white/[0.03] px-3 py-2">Premium research content</div>
                  <div className="rounded-md border border-white/10 bg-white/[0.03] px-3 py-2">Pro subscription revenue sharing</div>
                  <div className="rounded-md border border-white/10 bg-white/[0.03] px-3 py-2">Reader support / tips</div>
                  <div className="rounded-md border border-white/10 bg-white/[0.03] px-3 py-2">Sponsored research opportunities</div>
                </div>
              </Card>

              <Card className="p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                  Reward Structure
                </p>
                <div className="mt-3 grid gap-3">
                  <MetricRow label="This month's estimated reward" value="0 USDT" />
                  <MetricRow label="Lifetime rewards" value="0 USDT" />
                  <MetricRow label="Reward score" value="74 / 100" />
                  <MetricRow label="Reward source" value="Future revenue pool" />
                  <MetricRow label="Payout wallet" value={application?.refundWalletAddress || "Not set"} />
                  <MetricRow label="Payout status" value={application?.status === "approved" ? "pending" : "locked"} />
                  <MetricRow label="Payout tx hash" value="-" />
                </div>
              </Card>

              <Card className="p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                  Safety Note
                </p>
                <p className="mt-3 text-sm leading-6 text-muted">{INVESTMENT_NOTICE}</p>
                <p className="mt-3 text-sm leading-6 text-muted">{ANALYST_DISCLAIMER}</p>
                <p className="mt-3 text-sm leading-6 text-muted">{ANALYST_NO_PROMISES}</p>
              </Card>

              {isAdmin ? (
                <Card className="p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                    Admin
                  </p>
                  <Button className="mt-3 w-full" href="/admin/analyst-payments" variant="secondary">
                    Open payment review
                  </Button>
                </Card>
              ) : null}
            </aside>
          </div>

          {notice ? (
            <div className="mt-5 rounded-md border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm leading-6 text-emerald-100">
              {notice}
            </div>
          ) : null}
          {error ? (
            <div className="mt-5 rounded-md border border-rose-400/20 bg-rose-400/10 p-4 text-sm leading-6 text-rose-100">
              {error}
            </div>
          ) : null}
        </Container>
      </section>
    </main>
  );
}

function AgreementRow({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-2">
      <input checked={checked} className="mt-1" onChange={(event) => onChange(event.target.checked)} type="checkbox" />
      <span>{label}</span>
    </label>
  );
}

function InfoPill({
  label,
  value,
  span = 1,
}: {
  label: string;
  value: string;
  span?: 1 | 2;
}) {
  return (
    <div className={span === 2 ? "rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 sm:col-span-2" : "rounded-md border border-white/10 bg-white/[0.03] px-3 py-2"}>
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-muted-2">{label}</p>
      <p className="mt-1 break-words text-sm text-ink">{value}</p>
    </div>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-md border border-white/10 bg-white/[0.03] px-3 py-2">
      <span className="text-sm text-muted">{label}</span>
      <span className="text-right text-sm font-semibold text-ink">{value}</span>
    </div>
  );
}
