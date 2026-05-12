import { NextResponse, type NextRequest } from "next/server";
import { translateToKorean, type TranslateResult } from "@/lib/translate";

type TranslateRequestBody = {
  headline: string;
  body: string;
};

export async function POST(request: NextRequest) {
  try {
    const { headline, body } = (await request.json()) as TranslateRequestBody;

    if (!headline && !body) {
      return NextResponse.json({ error: "No text provided." }, { status: 400 });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      // No key configured — return mock placeholder after short delay
      await new Promise((resolve) => setTimeout(resolve, 700));
      return NextResponse.json<TranslateResult>({
        headline: headline ? `[번역 준비 중] ${headline}` : "",
        body: body ? `[번역 준비 중] ${body}` : "",
      });
    }

    const result = await translateToKorean({ headline, body });
    return NextResponse.json<TranslateResult>(result);
  } catch {
    return NextResponse.json({ error: "Translation failed." }, { status: 500 });
  }
}
