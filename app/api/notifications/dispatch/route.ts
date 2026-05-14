import { NextResponse, type NextRequest } from "next/server";
import { dispatchNotificationsForLatestBriefs } from "@/lib/notification-dispatch";

export async function GET(request: NextRequest) {
  const cronHeader = request.headers.get("x-vercel-cron");
  const authHeader = request.headers.get("authorization")?.trim();
  const expectedSecret = process.env.CRON_SECRET?.trim();

  const isAuthorized =
    Boolean(cronHeader) ||
    (Boolean(expectedSecret) && authHeader === `Bearer ${expectedSecret}`);

  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await dispatchNotificationsForLatestBriefs();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Dispatch failed." },
      { status: 500 },
    );
  }
}
