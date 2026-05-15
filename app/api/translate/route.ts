import { NextResponse, type NextRequest } from "next/server";
import { translateToKorean, type TranslateResult } from "@/lib/translate";

type TranslateRequestBody = {
  headline?: unknown;
  body?: unknown;
};

export async function POST(request: NextRequest) {
  let headline = "";
  let body = "";

  try {
    const payload = (await request.json()) as TranslateRequestBody;
    headline = typeof payload.headline === "string" ? payload.headline : "";
    body = typeof payload.body === "string" ? payload.body : "";

    if (!headline && !body) {
      return NextResponse.json({ error: "No text provided." }, { status: 400 });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      await new Promise((resolve) => setTimeout(resolve, 700));
      return NextResponse.json<TranslateResult>(
        createUnavailableTranslation(headline, body),
      );
    }

    const result = await translateToKorean({ headline, body });
    return NextResponse.json<TranslateResult>(result);
  } catch {
    return NextResponse.json<TranslateResult>(
      createUnavailableTranslation(headline, body),
    );
  }
}

function createUnavailableTranslation(
  headline: string,
  body: string,
): TranslateResult {
  return {
    headline: headline ? `[번역 준비 중] ${headline}` : "",
    body: body
      ? `번역 서비스가 아직 연결되지 않아 원문을 표시합니다.\n\n${body}`
      : "",
  };
}
