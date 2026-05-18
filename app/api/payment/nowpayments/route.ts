/**
 * POST /api/payment/nowpayments
 *
 * Creates a NOWPayments crypto invoice and returns the hosted payment URL.
 * API key is never exposed to the frontend.
 *
 * Body:
 *   amount        number   — price in USD (e.g. 9.99)
 *   currency      string   — "USDT" | "USDC"
 *   network?      string   — "ERC20" | "TRC20" | "MATIC" (default: "ERC20")
 *   orderId       string   — unique order reference (caller-generated)
 *   membershipType string  — e.g. "pro" | "premium" | "analyst"
 *   userEmail?    string   — pre-fill on NOWPayments page
 *
 * Required env vars:
 *   NOWPAYMENTS_API_KEY    — secret API key from NOWPayments dashboard
 *   NOWPAYMENTS_IPN_SECRET — IPN secret for webhook verification (optional but recommended)
 *   NEXT_PUBLIC_SITE_URL   — e.g. https://chainbrief.kr
 *
 * On success: { payment_url, invoice_id, order_id }
 * On error:   { error }
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const NOWPAYMENTS_API = "https://api.nowpayments.io/v1";

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

// Maps user-facing currency + network → NOWPayments pay_currency code
const CURRENCY_MAP: Record<string, Record<string, string>> = {
  USDT: {
    ERC20: "usdterc20",
    TRC20: "usdttrc20",
    MATIC: "usdtmatic",
    BSC: "usdtbsc",
  },
  USDC: {
    ERC20: "usdcerc20",
    MATIC: "usdcmatic",
    BSC: "usdcbsc",
  },
};

export async function POST(req: NextRequest) {
  const apiKey = process.env.NOWPAYMENTS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Crypto payment is not configured on this server." },
      { status: 503 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const amount = Number(body.amount);
  const currency = getString(body.currency).toUpperCase();
  const network = getString(body.network).toUpperCase() || "ERC20";
  const orderId = getString(body.orderId);
  const membershipType = getString(body.membershipType);
  const userEmail = getString(body.userEmail) || undefined;

  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "amount must be a positive number." }, { status: 400 });
  }

  if (!["USDT", "USDC"].includes(currency)) {
    return NextResponse.json({ error: "currency must be USDT or USDC." }, { status: 400 });
  }

  if (!orderId) {
    return NextResponse.json({ error: "orderId is required." }, { status: 400 });
  }

  if (!membershipType) {
    return NextResponse.json({ error: "membershipType is required." }, { status: 400 });
  }

  const payCurrency = CURRENCY_MAP[currency]?.[network];
  if (!payCurrency) {
    return NextResponse.json(
      { error: `Unsupported network "${network}" for ${currency}. Use ERC20, TRC20, or MATIC.` },
      { status: 400 },
    );
  }

  // Create invoice via NOWPayments REST API
  let invoiceData: { id: string; invoice_url: string };
  try {
    const payload: Record<string, unknown> = {
      price_amount: amount,
      price_currency: "usd",
      pay_currency: payCurrency,
      order_id: orderId,
      order_description: `Chainbrief ${membershipType} membership`,
      success_url: `${BASE_URL}/membership?payment=success&order=${orderId}`,
      cancel_url: `${BASE_URL}/membership?payment=cancelled&order=${orderId}`,
      is_fixed_rate: true,
      is_fee_paid_by_user: false,
    };

    if (userEmail) {
      payload.customer_email = userEmail;
    }

    const res = await fetch(`${NOWPAYMENTS_API}/invoice`, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { message?: string };
      console.error("[nowpayments] API error:", err);
      return NextResponse.json(
        { error: err.message ?? "NOWPayments request failed." },
        { status: 502 },
      );
    }

    invoiceData = (await res.json()) as { id: string; invoice_url: string };

    if (!invoiceData.invoice_url) {
      return NextResponse.json({ error: "No payment URL returned." }, { status: 502 });
    }
  } catch (err) {
    console.error("[nowpayments] fetch error:", err);
    return NextResponse.json({ error: "Failed to contact payment provider." }, { status: 502 });
  }

  // Persist the pending order to Supabase (non-blocking — don't fail the request if this errors)
  try {
    const supabase = await createClient();
    await supabase.from("cb_crypto_payments").insert({
      order_id: orderId,
      invoice_id: invoiceData.id,
      membership_type: membershipType,
      currency,
      network,
      amount_usd: amount,
      status: "pending",
      user_email: userEmail ?? null,
    });
  } catch (dbErr) {
    // Log but don't block — the user should still get their payment URL
    console.error("[nowpayments] db insert error:", dbErr);
  }

  return NextResponse.json({
    payment_url: invoiceData.invoice_url,
    invoice_id: invoiceData.id,
    order_id: orderId,
  });
}

function getString(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}
