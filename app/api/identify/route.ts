import type Anthropic from "@anthropic-ai/sdk";
import { CARDS, CARD_IDS, getCard } from "@/lib/cards";
import { getSpread } from "@/lib/spreads";
import { getClaude, missingKey } from "@/lib/claude";

export const maxDuration = 60;

const MEDIA_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
type MediaType = (typeof MEDIA_TYPES)[number];

const MAX_IMAGE_CHARS = 5_500_000; // about 4 MB of image, under Vercel's request body limit

export async function POST(request: Request) {
  const claude = await getClaude();
  if (!claude) return missingKey();
  const { client, model } = claude;

  let body: { image?: string; images?: string[]; offset?: number; mediaType?: string; spreadId?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "The request was not valid JSON." }, { status: 400 });
  }

  const spread = getSpread(body.spreadId ?? "");
  if (!spread) return Response.json({ error: "Unknown spread." }, { status: 400 });

  // Two capture modes: one photo of the whole spread, or one photo per card in position order.
  const perCard = Array.isArray(body.images);
  const images = (perCard ? body.images! : [body.image]).filter((i): i is string => typeof i === "string" && i.length > 0);
  const totalChars = images.reduce((n, i) => n + i.length, 0);
  // When photos arrive one at a time, offset says which position the first photo belongs to.
  const offset = perCard && Number.isInteger(body.offset) ? Math.max(0, body.offset!) : 0;
  if (images.length === 0 || offset + images.length > spread.positions.length || totalChars > MAX_IMAGE_CHARS) {
    return Response.json({ error: "The photo is missing or too large." }, { status: 400 });
  }
  if (!MEDIA_TYPES.includes(body.mediaType as MediaType)) {
    return Response.json({ error: "The photo must be a JPEG, PNG, or WebP." }, { status: 400 });
  }
  const mediaType = body.mediaType as MediaType;

  const positions = spread.positions.map((p, i) => `${i + 1}. ${p.name}`).join("\n");
  const cardList = CARDS.map((c) => `${c.id} (${c.name})`).join(", ");

  const scene = perCard
    ? `Each photo shows one tarot card held up to a webcam, for the "${spread.name}" spread. Each photo is labeled with its position number.

Positions, in order:
${positions}

Identify the card in each photo. Use the card's title text if it is legible, and the artwork if it is not. A card is reversed when its artwork and title appear upside down in the photo. Ignore the person, their hands, and the background.

Rules:
- Return one entry per photo that shows a tarot card, with "position" set to that photo's position number.
- If a photo shows no tarot card, leave it out and say so in "notes".`
    : `This photo shows a tarot spread. The reader says it is the "${spread.name}" spread: ${spread.layout}.

Positions, in order:
${positions}

Identify the card in each position. Use the card's title text if it is legible, and the artwork if it is not. A card is reversed when its artwork and title are upside down from the viewer's side of the photo. In a celtic cross, treat the sideways crossing card as upright.

Rules:
- Return one entry per card you can actually see, in position order, numbered from 1.
- If the photo shows fewer or more cards than the spread has positions, return the cards you see in reading order and explain in "notes".
- If the photo has no tarot cards, return an empty list and say so in "notes".`;

  const prompt = `${scene}
- Set confidence to "low" for any card you are guessing at because of glare, blur, cropping, or an unfamiliar deck.
- Keep "notes" to one short sentence, or an empty string when everything is clear.

Valid card ids: ${cardList}`;

  const content: Anthropic.ContentBlockParam[] = [];
  images.forEach((data, i) => {
    if (perCard) content.push({ type: "text", text: `Photo for position ${offset + i + 1} (${spread.positions[offset + i].name}):` });
    content.push({ type: "image", source: { type: "base64", media_type: mediaType, data } });
  });
  content.push({ type: "text", text: prompt });

  let response: Anthropic.Message;
  try {
    response = await client.messages.create({
      model,
      max_tokens: 1500,
      messages: [{ role: "user", content }],
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

  const clean = (c: (typeof parsed.cards)[number]) => ({
    card: getCard(c.card)!.id,
    reversed: c.reversed,
    lowConfidence: c.confidence.toLowerCase() === "low",
  });
  const valid = parsed.cards.filter((c) => getCard(c.card));

  // Per-card mode answers photo by photo, with null where no card was seen.
  const cards = perCard
    ? images.map((_, i) => {
        const hit = valid.find((c) => c.position === offset + i + 1);
        return hit ? clean(hit) : null;
      })
    : valid.slice(0, spread.positions.length).map(clean);

  return Response.json({ cards, notes: parsed.notes });
}
