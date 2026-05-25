import { NextResponse } from "next/server";

const NEWSDATA_ENDPOINT = "https://newsdata.io/api/1/crypto";

export async function GET(request: Request) {
  const apiKey = process.env.NEWSDATA_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "NEWSDATA_API_KEY is not configured. Set it as a server-side environment variable in Vercel.",
      },
      { status: 500 },
    );
  }

  const incomingUrl = new URL(request.url);
  const upstream = new URL(NEWSDATA_ENDPOINT);
  upstream.searchParams.set("apikey", apiKey);

  for (const [key, value] of incomingUrl.searchParams.entries()) {
    if (key.toLowerCase() === "apikey") continue;
    upstream.searchParams.set(key, value);
  }

  try {
    const response = await fetch(upstream.toString(), {
      headers: {
        Accept: "application/json",
        "User-Agent": "ChainBrief/0.1 NewsData Reader",
      },
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          error: `NewsData.io request failed with status ${response.status}.`,
        },
        { status: 502 },
      );
    }

    const payload = await response.json();

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "NewsData.io could not be reached right now." },
      { status: 502 },
    );
  }
}
