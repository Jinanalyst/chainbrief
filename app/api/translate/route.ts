import { NextResponse, type NextRequest } from "next/server";

const DEEPL_API_KEY = process.env.DEEPL_API_KEY;
const GOOGLE_TRANSLATE_KEY = process.env.GOOGLE_TRANSLATE_API_KEY;

type TranslateRequestBody = {
  headline: string;
  body: string;
};

type TranslateResult = {
  headline: string;
  body: string;
};

export async function POST(request: NextRequest) {
  try {
    const { headline, body } = (await request.json()) as TranslateRequestBody;

    if (!headline && !body) {
      return NextResponse.json({ error: "No text provided." }, { status: 400 });
    }

    if (DEEPL_API_KEY) {
      const result = await translateWithDeepl(headline, body, DEEPL_API_KEY);
      return NextResponse.json<TranslateResult>(result);
    }

    if (GOOGLE_TRANSLATE_KEY) {
      const result = await translateWithGoogle(headline, body, GOOGLE_TRANSLATE_KEY);
      return NextResponse.json<TranslateResult>(result);
    }

    // No API key — return mock placeholder after a short delay so the UI is exercisable
    await new Promise((resolve) => setTimeout(resolve, 700));
    return NextResponse.json<TranslateResult>({
      headline: headline ? `[번역 준비 중] ${headline}` : "",
      body: body ? `[번역 준비 중] ${body}` : "",
    });
  } catch {
    return NextResponse.json({ error: "Translation failed." }, { status: 500 });
  }
}

async function translateWithDeepl(
  headline: string,
  body: string,
  apiKey: string,
): Promise<TranslateResult> {
  const items: Array<{ key: "headline" | "body"; text: string }> = [];
  if (headline) items.push({ key: "headline", text: headline });
  if (body) items.push({ key: "body", text: body });

  const response = await fetch("https://api-free.deepl.com/v2/translate", {
    method: "POST",
    headers: {
      Authorization: `DeepL-Auth-Key ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: items.map((i) => i.text),
      target_lang: "KO",
      source_lang: "EN",
    }),
  });

  if (!response.ok) {
    throw new Error(`DeepL ${response.status}`);
  }

  const data = (await response.json()) as {
    translations: Array<{ text: string }>;
  };

  const result: TranslateResult = { headline: "", body: "" };
  items.forEach((item, idx) => {
    result[item.key] = data.translations[idx]?.text ?? item.text;
  });
  return result;
}

async function translateWithGoogle(
  headline: string,
  body: string,
  apiKey: string,
): Promise<TranslateResult> {
  const items: Array<{ key: "headline" | "body"; text: string }> = [];
  if (headline) items.push({ key: "headline", text: headline });
  if (body) items.push({ key: "body", text: body });

  const response = await fetch(
    `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        q: items.map((i) => i.text),
        target: "ko",
        source: "en",
        format: "text",
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Google Translate ${response.status}`);
  }

  const data = (await response.json()) as {
    data: { translations: Array<{ translatedText: string }> };
  };

  const result: TranslateResult = { headline: "", body: "" };
  items.forEach((item, idx) => {
    result[item.key] = data.data.translations[idx]?.translatedText ?? item.text;
  });
  return result;
}
