import Anthropic from "@anthropic-ai/sdk";

export const MODEL = process.env.STARCODED_MODEL || "claude-sonnet-5-5";

export function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  return new Anthropic();
}

export const missingKey = () =>
  Response.json(
    { error: "The server has no ANTHROPIC_API_KEY set. Add it in the Vercel project settings or .env.local." },
    { status: 500 },
  );
