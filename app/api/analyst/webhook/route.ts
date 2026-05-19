/**
 * POST /api/analyst/webhook
 *
 * Stripe webhook handler. Processes:
 *   - checkout.session.completed → record premium subscription in Supabase
 *   - customer.subscription.deleted → mark subscription cancelled
 *
 * Required env vars:
 *   STRIPE_SECRET_KEY        — Stripe secret key
 *   STRIPE_WEBHOOK_SECRET    — Webhook signing secret (whsec_…)
 *                              from Stripe Dashboard → Webhooks
 *
 * Register this endpoint in the Stripe Dashboard as:
 *   https://chainbrief.kr/api/analyst/webhook
 *
 * Webhook events to enable:
 *   - checkout.session.completed
 *   - customer.subscription.deleted
 */

import { NextRequest, NextResponse } from "next/server";
import { hasSupabaseAdminConfig, createAdminClient } from "@/lib/supabase/admin";

// Raw body required for Stripe signature verification
export const config = { api: { bodyParser: false } };

const STRIPE_API = "https://api.stripe.com/v1";

export async function POST(req: NextRequest) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeKey || !webhookSecret) {
    return new NextResponse("Webhook not configured", { status: 503 });
  }

  const rawBody = await req.text();
  const signature = req.headers.get("stripe-signature") ?? "";

  // Verify Stripe signature (manual HMAC — no SDK)
  const verified = await verifyStripeSignature(rawBody, signature, webhookSecret);
  if (!verified) {
    console.error("[webhook] Invalid Stripe signature");
    return new NextResponse("Invalid signature", { status: 400 });
  }

  let event: StripeEvent;
  try {
    event = JSON.parse(rawBody) as StripeEvent;
  } catch {
    return new NextResponse("Invalid JSON", { status: 400 });
  }

  try {
    await handleEvent(event, stripeKey);
  } catch (err) {
    console.error("[webhook] Handler error:", err);
    // Return 200 anyway to prevent Stripe from retrying on handler bugs
  }

  return new NextResponse("ok", { status: 200 });
}

// ── Event handlers ─────────────────────────────────────────────────────────────

async function handleEvent(event: StripeEvent, stripeKey: string) {
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as StripeCheckoutSession;
    if (session.mode !== "subscription") return;

    const analystId = session.metadata?.analyst_id;
    const email = session.customer_details?.email ?? session.customer_email ?? null;
    const stripeSessionId = session.id;

    if (!analystId || !email) {
      console.warn("[webhook] Missing analystId or email in session metadata");
      return;
    }

    if (hasSupabaseAdminConfig()) {
      const supabase = createAdminClient();
      const now = new Date().toISOString();

      // Record newsletter subscription
      const { error: subError } = await supabase.from("newsletter_subscriptions").upsert(
        {
          analyst_id: analystId,
          email: email.toLowerCase().trim(),
          plan: "premium",
          stripe_session_id: stripeSessionId,
          cancelled_at: null,
          subscribed_at: now,
        },
        { onConflict: "analyst_id,email" },
      );
      if (subError) {
        console.error("[webhook] newsletter_subscriptions upsert error:", subError.message);
      }

      // Look up analyst UUID via slug stored in analyst_profiles
      const { data: analystProfile } = await supabase
        .from("analyst_profiles")
        .select("analyst_id")
        .eq("slug", analystId)
        .maybeSingle();

      if (analystProfile) {
        const amountUsd = session.amount_total ? session.amount_total / 100 : 0;
        // Record 70% analyst share in revenue_events
        const { error: revError } = await supabase.from("revenue_events").insert({
          analyst_id: analystProfile.analyst_id,
          type: "subscription",
          amount: Math.round(amountUsd * 0.7 * 100) / 100,
          created_at: now,
        });
        if (revError) {
          console.error("[webhook] revenue_events insert error:", revError.message);
        }
      }
    }
    return;
  }

  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as StripeSubscription;
    // Retrieve customer email via Stripe API
    const customerId = subscription.customer;
    if (!customerId) return;

    const email = await getCustomerEmail(customerId, stripeKey);
    if (!email) return;

    if (hasSupabaseAdminConfig()) {
      const supabase = createAdminClient();
      await supabase
        .from("newsletter_subscriptions")
        .update({ cancelled_at: new Date().toISOString(), plan: "free" })
        .eq("email", email.toLowerCase().trim())
        .eq("plan", "premium");
    }
  }
}

// ── Stripe helpers ─────────────────────────────────────────────────────────────

async function getCustomerEmail(
  customerId: string,
  stripeKey: string,
): Promise<string | null> {
  try {
    const res = await fetch(`${STRIPE_API}/customers/${customerId}`, {
      headers: { Authorization: `Bearer ${stripeKey}` },
    });
    if (!res.ok) return null;
    const customer = (await res.json()) as { email?: string };
    return customer.email ?? null;
  } catch {
    return null;
  }
}

/**
 * Verify Stripe webhook signature using Web Crypto (available in Edge runtime).
 * Stripe signs with HMAC-SHA256. The format is:
 *   t=<timestamp>,v1=<hex-signature>[,v1=...]
 */
async function verifyStripeSignature(
  payload: string,
  header: string,
  secret: string,
): Promise<boolean> {
  try {
    const parts = Object.fromEntries(
      header.split(",").map((part) => part.split("=")),
    ) as Record<string, string>;

    const timestamp = parts["t"];
    const signatures = header
      .split(",")
      .filter((p) => p.startsWith("v1="))
      .map((p) => p.slice(3));

    if (!timestamp || !signatures.length) return false;

    // Check timestamp tolerance (5 minutes)
    const tolerance = 300;
    if (Math.abs(Date.now() / 1000 - Number(timestamp)) > tolerance) {
      return false;
    }

    const signedPayload = `${timestamp}.${payload}`;

    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );

    const sig = await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(signedPayload),
    );

    const computed = Buffer.from(sig).toString("hex");
    return signatures.includes(computed);
  } catch {
    return false;
  }
}

// ── Minimal Stripe types ───────────────────────────────────────────────────────

type StripeEvent = {
  type: string;
  data: { object: Record<string, unknown> };
};

type StripeCheckoutSession = {
  id: string;
  mode: string;
  amount_total: number | null;
  customer_email: string | null;
  customer_details?: { email?: string } | null;
  metadata?: Record<string, string> | null;
  customer?: string;
};

type StripeSubscription = {
  customer: string;
};
