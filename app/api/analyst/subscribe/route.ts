/**
 * POST /api/analyst/subscribe
 *
 * Handles two actions:
 *
 * 1. action = "subscribe"
 *    Body: { analystId, email, plan? }
 *    - Saves subscription to `newsletter_subscriptions` (Supabase)
 *    - Sends a welcome email via Resend
 *    Returns: { ok: true, alreadySubscribed?: boolean }
 *
 * 2. action = "notify"
 *    Body: { analystId, analystName, postTitle, postPreview, postId, isPremium? }
 *    - Reads all subscriber emails for this analyst
 *    - Sends new-post notification emails in batches
 *    Returns: { ok: true, sent: number, failed: number }
 *
 * Uses the Supabase service-role key to bypass RLS on newsletter_subscriptions.
 * If the admin client is unavailable, responses degrade gracefully.
 */

import { NextRequest, NextResponse } from "next/server";
import { hasSupabaseAdminConfig, createAdminClient } from "@/lib/supabase/admin";
import {
  sendEmail,
  sendEmailBatch,
  buildWelcomeEmailHtml,
  buildNewPostEmailHtml,
} from "@/lib/email";

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const action = getString(body.action);

  if (action === "subscribe") {
    return handleSubscribe(body);
  }

  if (action === "notify") {
    return handleNotify(body);
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

// ── Subscribe ──────────────────────────────────────────────────────────────────

async function handleSubscribe(body: Record<string, unknown>) {
  const analystId = getString(body.analystId);
  const email = getString(body.email)?.toLowerCase().trim();
  const plan = getString(body.plan) === "premium" ? "premium" : "free";

  if (!analystId || !email) {
    return NextResponse.json(
      { error: "analystId and email are required." },
      { status: 400 },
    );
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
  }

  // Save to Supabase (upsert so re-subscribing works)
  if (hasSupabaseAdminConfig()) {
    try {
      const supabase = createAdminClient();
      const { error } = await supabase.from("newsletter_subscriptions").upsert(
        {
          analyst_id: analystId,
          email,
          plan,
          cancelled_at: null,
          subscribed_at: new Date().toISOString(),
        },
        { onConflict: "analyst_id,email" },
      );
      if (error && error.code !== "23505") {
        // 23505 = unique violation (already subscribed — fine)
        console.error("[subscribe] Supabase upsert error:", error.message);
      }
    } catch (err) {
      console.error("[subscribe] Supabase error:", err);
    }
  }

  // Send welcome email (fire-and-forget)
  const analystName = getString(body.analystName) || analystId;
  sendEmail({
    to: email,
    subject: `You're subscribed to ${analystName} on Chain Brief`,
    html: buildWelcomeEmailHtml({ analystName, analystId, baseUrl: BASE_URL }),
  }).catch(() => {});

  return NextResponse.json({ ok: true });
}

// ── Notify ─────────────────────────────────────────────────────────────────────

async function handleNotify(body: Record<string, unknown>) {
  const analystId = getString(body.analystId);
  const analystName = getString(body.analystName) || analystId || "Your analyst";
  const postTitle = getString(body.postTitle) ?? "New post";
  const postPreview = getString(body.postPreview) ?? "";
  const postId = getString(body.postId) ?? "";
  const isPremium = Boolean(body.isPremium);

  if (!analystId) {
    return NextResponse.json({ error: "analystId is required." }, { status: 400 });
  }

  // Fetch subscriber emails from Supabase
  let emails: string[] = [];
  if (hasSupabaseAdminConfig()) {
    try {
      const supabase = createAdminClient();
      const { data } = await supabase
        .from("newsletter_subscriptions")
        .select("email")
        .eq("analyst_id", analystId)
        .is("cancelled_at", null);
      emails = (data ?? []).map((row: { email: string }) => row.email);
    } catch (err) {
      console.error("[notify] Supabase error:", err);
    }
  }

  if (!emails.length) {
    return NextResponse.json({ ok: true, sent: 0, failed: 0 });
  }

  const html = buildNewPostEmailHtml({
    analystName,
    analystId,
    postTitle,
    postPreview,
    postId,
    isPremium,
    baseUrl: BASE_URL,
  });

  const { sent, failed } = await sendEmailBatch(
    emails,
    `${analystName}: ${postTitle}`,
    html,
  );

  return NextResponse.json({ ok: true, sent, failed });
}

// ── helpers ────────────────────────────────────────────────────────────────────

function getString(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}
