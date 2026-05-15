import Anthropic from "@anthropic-ai/sdk";

export type TranslateInput = {
  headline: string;
  body: string;
};

export type TranslateResult = {
  headline: string;
  body: string;
};

const SYSTEM_PROMPT = `You are a professional Korean translator specializing in crypto and financial news.

Rules:
- Translate the user's content from English to Korean.
- Keep ALL crypto and financial terminology in English exactly as written: Bitcoin, BTC, ETH, Ethereum, Solana, SOL, DeFi, ETF, NFT, Layer 2, zkEVM, USDT, USDC, SEC, FOMC, TVL, APY, DAO, dApp, Web3, on-chain, off-chain, stablecoin, altcoin, memecoin, liquidity, market cap, etc.
- Proper nouns (CoinDesk, Coinbase, Binance, BlackRock, etc.) stay in English.
- Numbers, percentages, and ticker symbols stay in English.
- Return ONLY valid JSON, with no markdown fences, explanation, or surrounding text.
- JSON format: {"headline":"<translated headline>","body":"<translated body>"}
- If a field was empty in the input, return an empty string for that field.`;

export async function translateToKorean(
  input: TranslateInput,
): Promise<TranslateResult> {
  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: JSON.stringify({
          headline: input.headline,
          body: input.body,
        }),
      },
    ],
  });

  const raw =
    message.content[0]?.type === "text" ? message.content[0].text.trim() : "";

  try {
    const parsed = JSON.parse(raw) as Partial<TranslateResult>;
    return {
      headline:
        typeof parsed.headline === "string" ? parsed.headline : input.headline,
      body: typeof parsed.body === "string" ? parsed.body : input.body,
    };
  } catch {
    const headlineMatch = /"headline"\s*:\s*"((?:[^"\\]|\\.)*)"/.exec(raw);
    const bodyMatch = /"body"\s*:\s*"((?:[^"\\]|\\.)*)"/.exec(raw);

    return {
      headline: headlineMatch
        ? unescapeJsonString(headlineMatch[1])
        : input.headline,
      body: bodyMatch ? unescapeJsonString(bodyMatch[1]) : input.body,
    };
  }
}

function unescapeJsonString(value: string) {
  try {
    return JSON.parse(`"${value}"`) as string;
  } catch {
    return value.replace(/\\"/g, '"');
  }
}
