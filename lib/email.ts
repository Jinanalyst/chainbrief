/**
 * lib/email.ts
 * -----------
 * Thin wrapper around the Resend REST API.
 * No npm package required — uses native fetch.
 *
 * Required env vars:
 *   RESEND_API_KEY       – Resend secret key (re_…)
 *   RESEND_FROM_EMAIL    – Verified sender address  (default: noreply@chainbrief.kr)
 *
 * If RESEND_API_KEY is not set the functions silently skip — this lets the
 * rest of the feature work in dev without a key configured.
 */

const RESEND_API = "https://api.resend.com/emails";
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "Chain Brief <noreply@chainbrief.kr>";

export type EmailPayload = {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
};

/** Send a single transactional email via Resend. Returns true on success. */
export async function sendEmail(payload: EmailPayload): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    // Dev / unconfigured — log but don't crash
    console.warn("[email] RESEND_API_KEY not set — skipping email send.");
    return false;
  }

  try {
    const res = await fetch(RESEND_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: Array.isArray(payload.to) ? payload.to : [payload.to],
        subject: payload.subject,
        html: payload.html,
        reply_to: payload.replyTo,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`[email] Resend error ${res.status}: ${body}`);
      return false;
    }

    return true;
  } catch (err) {
    console.error("[email] Fetch failed:", err);
    return false;
  }
}

/** Send to many recipients in batches (Resend free tier: 100 emails/day). */
export async function sendEmailBatch(
  recipients: string[],
  subject: string,
  html: string,
  batchSize = 50,
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  for (let i = 0; i < recipients.length; i += batchSize) {
    const batch = recipients.slice(i, i + batchSize);
    const ok = await sendEmail({ to: batch, subject, html });
    if (ok) sent += batch.length;
    else failed += batch.length;
  }

  return { sent, failed };
}

// ── Email templates ────────────────────────────────────────────────────────────

export function buildWelcomeEmailHtml(opts: {
  analystName: string;
  analystId: string;
  baseUrl: string;
}): string {
  const profileUrl = `${opts.baseUrl}/analysts/${opts.analystId}`;
  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#0a0f1e;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:40px auto;padding:0 16px;">
    <div style="border-radius:16px;border:1px solid rgba(255,255,255,0.1);background:#111827;overflow:hidden;">
      <div style="height:4px;background:linear-gradient(90deg,#3b82f6,#6366f1);"></div>
      <div style="padding:32px;">
        <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:#3b82f6;">Chain Brief</p>
        <h1 style="margin:8px 0 0;font-size:22px;font-weight:700;color:#f1f5f9;">You're subscribed to ${opts.analystName}</h1>
        <p style="margin:16px 0 0;font-size:14px;line-height:1.7;color:#94a3b8;">
          Great — you'll get an email whenever <strong style="color:#e2e8f0;">${opts.analystName}</strong> publishes new research on Chain Brief.
        </p>
        <p style="margin:12px 0 0;font-size:13px;line-height:1.7;color:#64748b;">
          This content is for informational purposes only and not financial advice.
        </p>
        <div style="margin:24px 0 0;">
          <a href="${profileUrl}" style="display:inline-block;background:#3b82f6;color:#fff;font-size:14px;font-weight:600;padding:10px 20px;border-radius:8px;text-decoration:none;">
            View analyst page →
          </a>
        </div>
      </div>
      <div style="border-top:1px solid rgba(255,255,255,0.06);padding:16px 32px;">
        <p style="margin:0;font-size:12px;color:#475569;">
          You received this because you subscribed to ${opts.analystName} on Chain Brief.
          <a href="${profileUrl}" style="color:#3b82f6;text-decoration:none;">Manage subscription</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export function buildNewPostEmailHtml(opts: {
  analystName: string;
  analystId: string;
  postTitle: string;
  postPreview: string;
  postId: string;
  isPremium: boolean;
  baseUrl: string;
}): string {
  const postUrl = `${opts.baseUrl}/analysts/${opts.analystId}`;
  const premiumBadge = opts.isPremium
    ? `<span style="display:inline-block;background:rgba(251,191,36,.12);color:#fbbf24;font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;padding:2px 8px;border-radius:99px;border:1px solid rgba(251,191,36,.25);margin-bottom:12px;">Premium</span>`
    : "";
  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#0a0f1e;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:40px auto;padding:0 16px;">
    <div style="border-radius:16px;border:1px solid rgba(255,255,255,0.1);background:#111827;overflow:hidden;">
      <div style="height:4px;background:linear-gradient(90deg,#3b82f6,#6366f1);"></div>
      <div style="padding:32px;">
        <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:#3b82f6;">New from ${opts.analystName}</p>
        ${premiumBadge}
        <h1 style="margin:8px 0 0;font-size:20px;font-weight:700;line-height:1.3;color:#f1f5f9;">${opts.postTitle}</h1>
        <p style="margin:16px 0 0;font-size:14px;line-height:1.7;color:#94a3b8;">${opts.postPreview}</p>
        ${opts.isPremium ? `<p style="margin:14px 0 0;font-size:13px;color:#64748b;">This is a premium post. Subscribe to read the full analysis.</p>` : ""}
        <div style="margin:24px 0 0;">
          <a href="${postUrl}" style="display:inline-block;background:#3b82f6;color:#fff;font-size:14px;font-weight:600;padding:10px 20px;border-radius:8px;text-decoration:none;">
            Read full post →
          </a>
        </div>
        <p style="margin:20px 0 0;font-size:12px;color:#475569;">
          This is for informational purposes only and not financial advice.
        </p>
      </div>
      <div style="border-top:1px solid rgba(255,255,255,0.06);padding:16px 32px;">
        <p style="margin:0;font-size:12px;color:#475569;">
          You received this because you subscribed to ${opts.analystName} on Chain Brief.
          <a href="${postUrl}" style="color:#3b82f6;text-decoration:none;">Manage subscription</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export function buildApprovalEmailHtml(opts: {
  fullName: string;
  dashboardUrl: string;
}): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#0a0f1e;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:40px auto;padding:0 16px;">
    <div style="border-radius:16px;border:1px solid rgba(255,255,255,0.1);background:#111827;overflow:hidden;">
      <div style="height:4px;background:linear-gradient(90deg,#3b82f6,#6366f1);"></div>
      <div style="padding:32px;">
        <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:#3b82f6;">Chain Brief — Verified Analyst</p>
        <h1 style="margin:8px 0 0;font-size:22px;font-weight:700;color:#f1f5f9;">Welcome aboard, ${opts.fullName}! 🎉</h1>
        <p style="margin:16px 0 0;font-size:14px;line-height:1.7;color:#94a3b8;">
          Your analyst application has been <strong style="color:#34d399;">approved</strong>. You are now a Verified Analyst on Chain Brief.
        </p>
        <p style="margin:12px 0 0;font-size:14px;line-height:1.7;color:#94a3b8;">
          You can now publish research, enable a membership tier, and build your subscriber base. Head to your dashboard to get started.
        </p>
        <div style="margin:24px 0 0;">
          <a href="${opts.dashboardUrl}" style="display:inline-block;background:#3b82f6;color:#fff;font-size:14px;font-weight:600;padding:10px 20px;border-radius:8px;text-decoration:none;">
            Open my dashboard →
          </a>
        </div>
      </div>
      <div style="border-top:1px solid rgba(255,255,255,0.06);padding:16px 32px;">
        <p style="margin:0;font-size:12px;color:#475569;">Chain Brief — crypto research for the community.</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export function buildRejectionEmailHtml(opts: {
  fullName: string;
  reason: string;
  applyUrl: string;
}): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#0a0f1e;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:40px auto;padding:0 16px;">
    <div style="border-radius:16px;border:1px solid rgba(255,255,255,0.1);background:#111827;overflow:hidden;">
      <div style="height:4px;background:#ef4444;"></div>
      <div style="padding:32px;">
        <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:#3b82f6;">Chain Brief — Analyst Application</p>
        <h1 style="margin:8px 0 0;font-size:22px;font-weight:700;color:#f1f5f9;">Application update, ${opts.fullName}</h1>
        <p style="margin:16px 0 0;font-size:14px;line-height:1.7;color:#94a3b8;">
          After reviewing your application, we're unable to approve it at this time.
        </p>
        ${opts.reason ? `<div style="margin:16px 0 0;border-radius:10px;border:1px solid rgba(239,68,68,.2);background:rgba(239,68,68,.08);padding:14px 18px;"><p style="margin:0;font-size:13px;line-height:1.6;color:#fca5a5;">${opts.reason}</p></div>` : ""}
        <p style="margin:16px 0 0;font-size:14px;line-height:1.7;color:#94a3b8;">
          You may reapply 30 days after this decision. Keep building your research track record!
        </p>
        <div style="margin:24px 0 0;">
          <a href="${opts.applyUrl}" style="display:inline-block;background:rgba(255,255,255,0.08);color:#e2e8f0;font-size:14px;font-weight:600;padding:10px 20px;border-radius:8px;text-decoration:none;border:1px solid rgba(255,255,255,0.1);">
            View application status
          </a>
        </div>
      </div>
      <div style="border-top:1px solid rgba(255,255,255,0.06);padding:16px 32px;">
        <p style="margin:0;font-size:12px;color:#475569;">Chain Brief — crypto research for the community.</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}
