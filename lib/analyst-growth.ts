import type { User } from "@supabase/supabase-js";

export const ANALYST_PAYMENT_AMOUNT = 30;
export const ANALYST_PAYMENT_TOKEN = "USDT";
export const ANALYST_PAYMENT_NETWORK = "BEP20";
export const ANALYST_PAYMENT_CHAIN_NAME = "BNB Smart Chain";
export const ANALYST_PAYMENT_ADDRESS = "0x7a459149d910087d358cb46a9f70fd650738f446";
export const ANALYST_PAYMENT_WARNING =
  "Send only USDT BEP20 on BNB Smart Chain. Sending through ERC20, TRC20, Polygon, Arbitrum, or any other network may make confirmation or refund impossible.";
export const ANALYST_REFUND_POLICY =
  "Chain Brief’s Verified Analyst application review fee may be refunded if the user requests a refund within 7 days after payment and before the application review has started. Once the review process has started, the fee may become non-refundable because platform review and operation costs have already been incurred.";
export const ANALYST_DISCLAIMER =
  "This content is for informational and educational purposes only and is not financial advice. Crypto assets involve risk of loss. All investment decisions are the sole responsibility of the user.";
export const ANALYST_NO_PROMISES =
  "Chain Brief does not provide 1:1 investment advice, buy/sell instructions, guaranteed returns, or principal protection.";
export const ANALYST_REVENUE_COPY =
  "Verified Analysts may become eligible for future rewards based on content quality, reader engagement, risk-aware writing, consistency, and platform trust. Rewards are not guaranteed and may depend on Chain Brief’s future revenue, review policies, and platform rules.";

export const ANALYST_PATH_STEPS = [
  {
    title: "Regular User",
    description:
      "Participates in the community, comments on news, and joins Bull/Bear discussions.",
  },
  {
    title: "Rookie Analyst",
    description:
      "Starts writing news interpretations, chart analysis, trading reviews, and risk notes.",
  },
  {
    title: "Rising Analyst",
    description:
      "Builds credibility through consistent, high-quality posts and community engagement.",
  },
  {
    title: "Verified Analyst",
    description:
      "A trusted analyst reviewed by Chain Brief based on writing quality, risk awareness, and community trust.",
  },
  {
    title: "Partner Expert",
    description:
      "A top-level analyst who may participate in premium research, reward pools, and future revenue sharing.",
  },
] as const;

export const ANALYST_POST_TYPES = [
  "general",
  "news_interpretation",
  "chart_analysis",
  "trade_review",
  "loss_review",
  "risk_analysis",
] as const;

export type AnalystPostType = (typeof ANALYST_POST_TYPES)[number];

export type AnalystApplicationStatus =
  | "draft"
  | "payment_pending"
  | "payment_submitted"
  | "under_review"
  | "approved"
  | "rejected"
  | "refund_requested";

export type AnalystPaymentStatus =
  | "pending"
  | "submitted"
  | "confirmed"
  | "rejected"
  | "refund_requested"
  | "refunded"
  | "refund_rejected";

export type AnalystRefundStatus = "none" | "requested" | "approved" | "rejected" | "refunded";

export type AnalystApplicationRecord = {
  id: string;
  userId: string;
  userEmail: string;
  expertise: string;
  bio: string;
  mainMarkets: string;
  sampleContent: string;
  sampleUrl: string;
  status: AnalystApplicationStatus;
  paymentStatus: AnalystPaymentStatus;
  refundStatus: AnalystRefundStatus;
  amountUsdt: number;
  token: typeof ANALYST_PAYMENT_TOKEN;
  network: typeof ANALYST_PAYMENT_NETWORK;
  chainName: typeof ANALYST_PAYMENT_CHAIN_NAME;
  receiverAddress: string;
  senderWalletAddress: string;
  txHash: string;
  paymentNote: string;
  refundWalletAddress: string;
  refundReason: string;
  refundTxHash: string;
  adminNote: string;
  createdAt: string;
  confirmedAt?: string;
  refundRequestedAt?: string;
  refundedAt?: string;
  reviewedAt?: string;
  updatedAt: string;
};

export type AnalystRewardSnapshot = {
  id: string;
  period: string;
  rewardSource: string;
  qualifiedViews: number;
  readTimeScore: number;
  bookmarkScore: number;
  trustScore: number;
  totalScore: number;
  rewardAmountUsdt: number;
  status: "pending" | "calculated" | "paid";
};

export type AnalystPayoutSnapshot = {
  id: string;
  period: string;
  amountUsdt: number;
  walletAddress: string;
  txHash: string;
  payoutStatus: "pending" | "scheduled" | "paid" | "failed";
  paidAt?: string;
};

const APPLICATIONS_KEY = "chain-brief-analyst-applications";
export const ANALYST_APPLICATIONS_CHANGED_EVENT =
  "chain-brief-analyst-applications-changed";

function isBrowser() {
  return typeof window !== "undefined";
}

export function readAnalystApplications() {
  if (!isBrowser()) {
    return [] as AnalystApplicationRecord[];
  }

  const stored = window.localStorage.getItem(APPLICATIONS_KEY);
  if (!stored) {
    return [];
  }

  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed)
      ? parsed.filter(isAnalystApplicationRecord).sort(sortNewestFirst)
      : [];
  } catch {
    return [];
  }
}

export function readAnalystApplicationByUserId(userId: string) {
  return readAnalystApplications().find((application) => application.userId === userId) ?? null;
}

export function upsertAnalystApplication(
  user: User,
  input: {
    expertise: string;
    bio: string;
    mainMarkets: string;
    sampleContent: string;
    sampleUrl: string;
  },
) {
  const current = readAnalystApplicationByUserId(user.id);
  const now = new Date().toISOString();

  const next: AnalystApplicationRecord = {
    id: current?.id ?? createApplicationId(user.id),
    userId: user.id,
    userEmail: user.email ?? "",
    expertise: input.expertise.trim(),
    bio: input.bio.trim(),
    mainMarkets: input.mainMarkets.trim(),
    sampleContent: input.sampleContent.trim(),
    sampleUrl: input.sampleUrl.trim(),
    status: current?.status === "approved" ? "approved" : current?.status ?? "payment_pending",
    paymentStatus: current?.paymentStatus ?? "pending",
    refundStatus: current?.refundStatus ?? "none",
    amountUsdt: ANALYST_PAYMENT_AMOUNT,
    token: ANALYST_PAYMENT_TOKEN,
    network: ANALYST_PAYMENT_NETWORK,
    chainName: ANALYST_PAYMENT_CHAIN_NAME,
    receiverAddress: ANALYST_PAYMENT_ADDRESS,
    senderWalletAddress: current?.senderWalletAddress ?? "",
    txHash: current?.txHash ?? "",
    paymentNote: current?.paymentNote ?? "",
    refundWalletAddress: current?.refundWalletAddress ?? "",
    refundReason: current?.refundReason ?? "",
    refundTxHash: current?.refundTxHash ?? "",
    adminNote: current?.adminNote ?? "",
    createdAt: current?.createdAt ?? now,
    confirmedAt: current?.confirmedAt,
    refundRequestedAt: current?.refundRequestedAt,
    refundedAt: current?.refundedAt,
    reviewedAt: current?.reviewedAt,
    updatedAt: now,
  };

  writeAnalystApplication(next);
  return next;
}

export function submitPaymentProof(
  user: User,
  input: {
    txHash: string;
    senderWalletAddress: string;
    paymentNote?: string;
  },
) {
  const current = readAnalystApplicationByUserId(user.id);
  if (!current) {
    return null;
  }

  const next: AnalystApplicationRecord = {
    ...current,
    senderWalletAddress: input.senderWalletAddress.trim(),
    txHash: input.txHash.trim(),
    paymentNote: input.paymentNote?.trim() ?? "",
    paymentStatus: "submitted",
    status: "payment_submitted",
    updatedAt: new Date().toISOString(),
  };

  writeAnalystApplication(next);
  return next;
}

export function requestRefund(
  user: User,
  input: {
    refundWalletAddress: string;
    refundReason: string;
  },
) {
  const current = readAnalystApplicationByUserId(user.id);
  if (!current) {
    return null;
  }

  const lockedStatuses = new Set(["under_review", "approved", "rejected"]);
  if (lockedStatuses.has(current.status)) {
    return { locked: true, application: current } as const;
  }

  const next: AnalystApplicationRecord = {
    ...current,
    refundWalletAddress: input.refundWalletAddress.trim(),
    refundReason: input.refundReason.trim(),
    refundStatus: "requested",
    paymentStatus: current.paymentStatus === "pending" ? "refund_requested" : current.paymentStatus,
    status: "refund_requested",
    refundRequestedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  writeAnalystApplication(next);
  return next;
}

export function adminPatchApplication(
  applicationId: string,
  patch: Partial<
    Pick<
      AnalystApplicationRecord,
      | "status"
      | "paymentStatus"
      | "refundStatus"
      | "reviewedAt"
      | "confirmedAt"
      | "refundedAt"
      | "refundTxHash"
      | "adminNote"
    >
  >,
) {
  const applications = readAnalystApplications();
  const index = applications.findIndex((application) => application.id === applicationId);

  if (index === -1) {
    return null;
  }

  const current = applications[index];
  const next: AnalystApplicationRecord = {
    ...current,
    ...patch,
    updatedAt: new Date().toISOString(),
  };

  applications[index] = next;
  writeApplications(applications);
  return next;
}

export function readAnalystRewards(userId: string): AnalystRewardSnapshot[] {
  const application = readAnalystApplicationByUserId(userId);

  if (!application || application.status !== "approved") {
    return [];
  }

  return [
    {
      id: `${userId}-2025-05`,
      period: "This month",
      rewardSource: "Analyst Reward Pool",
      qualifiedViews: 1240,
      readTimeScore: 78,
      bookmarkScore: 64,
      trustScore: 82,
      totalScore: 74,
      rewardAmountUsdt: 0,
      status: "calculated",
    },
  ];
}

export function readAnalystPayouts(userId: string): AnalystPayoutSnapshot[] {
  const application = readAnalystApplicationByUserId(userId);

  if (!application || application.status !== "approved") {
    return [];
  }

  return [
    {
      id: `${userId}-payout-2025-05`,
      period: "This month",
      amountUsdt: 0,
      walletAddress: application.refundWalletAddress || application.senderWalletAddress || "",
      txHash: "",
      payoutStatus: "pending",
    },
  ];
}

export function isAdminUser(user: User | null) {
  const profile = user?.user_metadata?.chainBriefProfile as
    | { role?: string }
    | undefined;

  return profile?.role === "admin" || user?.user_metadata?.role === "admin";
}

export function listAnalystApplicationsForAdmin() {
  return readAnalystApplications();
}

function createApplicationId(userId: string) {
  return `analyst-${userId}-${Date.now().toString(36)}`;
}

function writeAnalystApplication(application: AnalystApplicationRecord) {
  const applications = readAnalystApplications();
  const index = applications.findIndex((item) => item.id === application.id);

  if (index >= 0) {
    applications[index] = application;
  } else {
    applications.unshift(application);
  }

  writeApplications(applications);
}

function writeApplications(applications: AnalystApplicationRecord[]) {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(APPLICATIONS_KEY, JSON.stringify(applications.slice(0, 200)));
  window.dispatchEvent(new CustomEvent(ANALYST_APPLICATIONS_CHANGED_EVENT));
}

function sortNewestFirst(a: AnalystApplicationRecord, b: AnalystApplicationRecord) {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

function isAnalystApplicationRecord(value: unknown): value is AnalystApplicationRecord {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as AnalystApplicationRecord;

  return (
    typeof record.id === "string" &&
    typeof record.userId === "string" &&
    typeof record.expertise === "string" &&
    typeof record.bio === "string" &&
    typeof record.mainMarkets === "string" &&
    typeof record.sampleContent === "string" &&
    typeof record.sampleUrl === "string" &&
    typeof record.status === "string" &&
    typeof record.paymentStatus === "string" &&
    typeof record.refundStatus === "string" &&
    typeof record.amountUsdt === "number" &&
    typeof record.createdAt === "string"
  );
}
