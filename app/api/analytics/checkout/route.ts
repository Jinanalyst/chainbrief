/**
 * POST /api/analyst/checkout
 *
 * Creates a Stripe Checkout Session for a premium analyst membership.
 * Returns the Stripe-hosted checkout URL; the client redirects to it.
 *
 * Body: {
 *   analystId:   string  — slugified analyst ID (e.g. "john-kim")
 *   analystName: string  — display name shown on checkout
 *   priceUsd:    number  — monthly price in USD (1–99)
 *   userEmail?:  string  — pre-fill the email field on Stripe
 * }
 *
 * Required env vars:
 *   STRIPE_SECRET_KEY      — Stripe secret key (sk_live_… or sk_test_…)
 *   NEXT_PUBLIC_SITE_URL   — e.g. https://chainbrief.kr
 *
 * On success returns: { url: string }
 * On error returns:   { error: string }
 */

import { NextRequest, NextResponse } from "next/server";

const STRIPE_API = "https://api.stripe.com/v1";

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

export async function POST(req: NextRequest) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return NextResponse.json(
      { error: "Payment is not configured on this server." },
      { status: 503 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const analystId = getString(body.analystId);
  const analystName = getString(body.analystName) || analystId || "Analyst";
  const priceUsd = Number(body.priceUsd);
  const userEmail = getString(body.userEmail) || undefined;

  if (!analystId) {
    return NextResponse.json({ error: "analystId is required." }, { status: 400 });
  }

  if (!Number.isFinite(priceUsd) || priceUsd < 1 || priceUsd > 99) {
    return NextResponse.json(
      { error: "priceUsd must be between 1 and 99." },
      { status: 400 },
    );
  }

  // Build Stripe Checkout Session via REST (no SDK needed)
  const params = new URLSearchParams({
    mode: "subscription",
    "payment_method_types[]": "card",
    "line_items[0][price_data][currency]": "usd",
    "line_items[0][price_data][product_data][name]": `${analystName} — Premium Membership`,
    "line_items[0][price_data][product_data][description]":
      `Monthly premium access to ${analystName}'s full research on Chain Brief.`,
    "line_items[0][price_data][recurring][interval]": "month",
    "line_items[0][price_data][unit_amount]": String(Math.round(priceUsd * 100)),
    "line_items[0][quantity]": "1",
    success_url: `${BASE_URL}/analysts/${analystId}?checkout=success`,
    cancel_url: `${BASE_URL}/analysts/${analystId}?checkout=cancelled`,
    // Pass metadata so the webhook can record the subscription
    "metadata[analyst_id]": analystId,
    "metadata[analyst_name]": analystName,
    "metadata[plan]": "premium",
  });

  if (userEmail) {
    params.set("customer_email", userEmail);
  }

  try {
    const res = await fetch(`${STRIPE_API}/checkout/sessions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
      console.error("[checkout] Stripe error:", err);
      return NextResponse.json(
        { error: err.error?.message ?? "Stripe request failed." },
        { status: 502 },
      );
    }

    const session = (await res.json()) as { url?: string };
    if (!session.url) {
      return NextResponse.json({ error: "No checkout URL returned." }, { status: 502 });
    }

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[checkout] fetch error:", err);
    return NextResponse.json({ error: "Failed to contact payment provider." }, { status: 502 });
  }
}

function getString(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}
