import { NextResponse, type NextRequest } from "next/server";
import {
  createYouTubeChannelFeedUrl,
  getYouTubeFeedUrlFromUrl,
  getYouTubeChannelIdFromUrl,
  isLikelyYouTubeChannelInput,
} from "@/lib/custom-rss-sources";

type RequestBody = {
  url?: string;
};

const REQUEST_TIMEOUT_MS = 9000;

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as RequestBody;
  const input = body.url?.trim() ?? "";

  if (!isLikelyYouTubeChannelInput(input)) {
    return NextResponse.json(
      { error: "Enter a YouTube channel URL, handle URL, channel ID, or RSS feed URL." },
      { status: 400 },
    );
  }

  const directFeedUrl = getYouTubeFeedUrlFromUrl(input);

  if (directFeedUrl) {
    const title = await fetchFeedTitle(directFeedUrl);

    return NextResponse.json({
      channelId: getYouTubeChannelIdFromUrl(directFeedUrl),
      feedUrl: directFeedUrl,
      title,
    });
  }

  const directChannelId = getYouTubeChannelIdFromUrl(input);

  if (directChannelId) {
    const title = await fetchFeedTitle(createYouTubeChannelFeedUrl(directChannelId));

    return NextResponse.json({
      channelId: directChannelId,
      feedUrl: createYouTubeChannelFeedUrl(directChannelId),
      title,
    });
  }

  const channelUrl = toYouTubeChannelUrl(input);

  if (!channelUrl) {
    return NextResponse.json(
      { error: "Enter a YouTube channel URL, handle URL, channel ID, or RSS feed URL." },
      { status: 400 },
    );
  }

  try {
    const response = await fetch(channelUrl, {
      headers: {
        "User-Agent": "ChainBrief/0.1 YouTube Channel Resolver",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new Error(`YouTube returned ${response.status}`);
    }

    const html = await response.text();
    const channelId = extractChannelId(html);

    if (!channelId) {
      return NextResponse.json(
        { error: "Could not resolve that YouTube channel. Try the channel's RSS feed URL." },
        { status: 422 },
      );
    }

    return NextResponse.json({
      channelId,
      feedUrl: createYouTubeChannelFeedUrl(channelId),
      title: extractTitle(html),
    });
  } catch (error) {
    console.error("Failed to resolve YouTube channel", error);

    return NextResponse.json(
      { error: "Could not resolve that YouTube channel right now." },
      { status: 503 },
    );
  }
}

function toYouTubeChannelUrl(value: string) {
  const trimmed = value.trim();

  if (trimmed.startsWith("@")) {
    return `https://www.youtube.com/${trimmed}`;
  }

  try {
    const url = new URL(trimmed);
    const host = url.hostname.replace(/^www\./, "");

    if (
      host !== "youtube.com" &&
      host !== "m.youtube.com" &&
      host !== "youtube-nocookie.com"
    ) {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

async function fetchFeedTitle(feedUrl: string) {
  try {
    const response = await fetch(feedUrl, {
      headers: {
        "User-Agent": "ChainBrief/0.1 YouTube Feed Title Resolver",
        Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml",
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      return null;
    }

    const xml = await response.text();
    return decodeHtml(matchFirst(xml, /<title>([^<]+)<\/title>/i));
  } catch {
    return null;
  }
}

function extractChannelId(html: string) {
  const patterns = [
    /<meta[^>]+itemprop=["']channelId["'][^>]+content=["'](UC[A-Za-z0-9_-]{22})["']/i,
    /<meta[^>]+content=["'](UC[A-Za-z0-9_-]{22})["'][^>]+itemprop=["']channelId["']/i,
    /"channelId":"(UC[A-Za-z0-9_-]{22})"/,
    /"externalId":"(UC[A-Za-z0-9_-]{22})"/,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);

    if (match?.[1]) {
      return match[1];
    }
  }

  return null;
}

function extractTitle(html: string) {
  return (
    decodeHtml(matchFirst(html, /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)) ??
    decodeHtml(matchFirst(html, /<title>([^<]+)<\/title>/i))
  )?.replace(/\s+-\s+YouTube$/i, "") ?? null;
}

function matchFirst(value: string, pattern: RegExp) {
  return value.match(pattern)?.[1] ?? null;
}

function decodeHtml(value: string | null) {
  return value
    ?.replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim() || null;
}
