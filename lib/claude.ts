import Anthropic from "@anthropic-ai/sdk";
import { getVercelOidcToken } from "@vercel/oidc";

// Uses your own Claude API key when ANTHROPIC_API_KEY is set.
// Otherwise falls back to Vercel AI Gateway, which needs no key on Vercel deployments.
export async function getClaude(): Promise<{ client: Anthropic; model: string } | null> {
  if (process.env.ANTHROPIC_API_KEY) {
    return { client: new Anthropic(), model: process.env.STARCODED_MODEL || "claude-sonnet-5-5" };
  }
  let token = process.env.AI_GATEWAY_API_KEY;
  if (!token) {
    try {
      token = await getVercelOidcToken();
    } catch {
      return null;
    }
  }
  if (!token) return null;
  return {
    client: new Anthropic({ apiKey: token, baseURL: "https://ai-gateway.vercel.sh" }),
    model: process.env.STARCODED_MODEL || "anthropic/claude-sonnet-5.5",
  };
}

export const missingKey = () =>
  Response.json({ error: "The reader is not connected to a model yet. Set ANTHROPIC_API_KEY or deploy on Vercel." }, { status: 500 });
