# starcoded

Photograph a tarot spread, ask a question, get a reading. Live at starcoded.wtf.

## How it works

1. The browser captures or uploads a photo and shrinks it to 1568px on the long edge.
2. `POST /api/identify` sends the photo to Claude, which returns the card in each spread position as JSON.
3. The user confirms or corrects the cards.
4. `POST /api/reading` looks up each card in `lib/cards.ts`, combines it with the position meaning from `lib/spreads.ts` and the question, and streams the interpretation.

## Run locally

```bash
cp .env.example .env.local   # then add your ANTHROPIC_API_KEY
npm install
npm run dev
```

## Deploy

Import the GitHub repo in Vercel, add `ANTHROPIC_API_KEY` as an environment variable, then add `starcoded.wtf` under the project's Domains.

## Where things live

- `lib/cards.ts`: all 78 cards with upright and reversed keywords and meanings
- `lib/spreads.ts`: spread layouts and position meanings
- `app/api/identify/route.ts`: card detection from the photo
- `app/api/reading/route.ts`: reading prompt and streaming
- `app/page.tsx`, `app/globals.css`: the interface
