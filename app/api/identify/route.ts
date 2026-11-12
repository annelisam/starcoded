import type Anthropic from "@anthropic-ai/sdk";
import { CARDS, CARD_IDS, getCard } from "@/lib/cards";
import { getSpread } from "@/lib/spreads";
import { MODEL, getClient, missingKey } from "@/lib/claude";

export const maxDuration = 60;

const MEDIA_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
type MediaType = (typeof MEDIA_TYPES)[number];

const MAX_IMAGE_CHARS = 5_500_000; // about 4 MB of image, under Vercel's request body limit

export async function POST(request: Request) {
  const client = getClient();
  if (!client) return missingKey();

  let body: { image?: string; mediaType?: string; spreadId?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "The request was not valid JSON." }, { status: 400 });
  }

  const spread = getSpread(body.spreadId ?? "");
  if (!spread) return Response.json({ error: "Unknown spread." }, { status: 400 });
  if (!body.image || body.image.length > MAX_IMAGE_CHARS) {
    return Response.json({ error: "The photo is missing or too large." }, { status: 400 });
  }
  if (!MEDIA_TYPES.includes(body.mediaType as MediaType)) {
    return Response.json({ error: "The photo must be a JPEG, PNG, or WebP." }, { status: 400 });
  }

  const positions = spread.positions.map((p, i) => `${i + 1}. ${p.name}`).join("\n");
  const cardList = CARDS.map((c) => `${c.id} (${c.name})`).join(", ");

  const prompt = `This photo shows a tarot spread. The reader says it is the "${spread.name}" spread: ${spread.layout}.

Positions, in order:
${positions}

Identify the card in each position. Use the card's title text if it is legible, and the artwork if it is not. A card is reversed when its artwork and title are upside down from the viewer's side of the photo. In a celtic cross, treat the sideways crossing card as upright.

Rules:
- Return one entry per card you can actually see, in position order, numbered from 1.
- If the photo shows fewer or more cards than the spread has positions, return the cards you see in reading order and explain in "notes".
- Set confidence to "low" for any card you are guessing at because of glare, blur, cropping, or an unfamiliar deck.
- If the photo has no tarot cards, return an empty list and say so in "notes".
- Keep "notes" to one short sentence, or an empty string when everything is clear.

Valid card ids: ${cardList}`;

  let response: Anthropic.Message;
  try {
    response = await client.messages.create({
      model: MODEL,
      max_tokens: 1500,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: body.mediaType as MediaType, data: body.image },
            },
            { type: "text", text: prompt },
          ],
        },
      ],
      output_config: {
        format: {
          type: "json_schema",
          schema: {
            type: "object",
            properties: {
              cards: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    position: { type: "integer" },
                    card: { type: "string", enum: CARD_IDS },
                    reversed: { type: "boolean" },
                    confidence: { type: "string", enum: ["high", "low"] },
                  },
                  required: ["position", "card", "reversed", "confidence"],
                  additionalProperties: false,
                },
              },
              notes: { type: "string" },
            },
            required: ["cards", "notes"],
            additionalProperties: false,
          },
        },
      },
    });
  } catch (err) {
    console.error("identify failed", err);
    return Response.json({ error: "The card reader could not be reached. Try again." }, { status: 502 });
  }

  const text = response.content.find((b) => b.type === "text");
  if (!text || text.type !== "text" || response.stop_reason !== "end_turn") {
    return Response.json({ error: "The photo could not be read. Try a clearer one." }, { status: 502 });
  }

  let parsed: { cards: { position: number; card: string; reversed: boolean; confidence: string }[]; notes: string };
  try {
    parsed = JSON.parse(text.text);
  } catch {
    return Response.json({ error: "The photo could not be read. Try a clearer one." }, { status: 502 });
  }

  const cards = parsed.cards
    .filter((c) => getCard(c.card))
    .slice(0, spread.positions.length)
    .map((c) => ({
      card: getCard(c.card)!.id,
      reversed: c.reversed,
      lowConfidence: c.confidence.toLowerCase() === "low",
    }));

  return Response.json({ cards, notes: parsed.notes });
}
