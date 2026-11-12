"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { CARDS, type Card } from "@/lib/cards";
import { Learn } from "./learn";

type Filter = "all" | "major" | "wands" | "cups" | "swords" | "pentacles";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "all 78" },
  { id: "major", label: "major arcana" },
  { id: "wands", label: "wands" },
  { id: "cups", label: "cups" },
  { id: "swords", label: "swords" },
  { id: "pentacles", label: "pentacles" },
];

const inFilter = (c: Card, f: Filter) => f === "all" || (f === "major" ? c.arcana === "major" : c.suit === f);
const kind = (c: Card) => (c.arcana === "major" ? "major arcana" : c.suit!);

// The same card for everyone on a given calendar day, chosen from the date.
function cardForDay(day: string): Card {
  let h = 7;
  for (const ch of day) h = (h * 31 + ch.charCodeAt(0)) % 100003;
  return CARDS[h % CARDS.length];
}

// The date is only known in the browser, so the server render leaves today's card out.
const noSubscription = () => () => {};
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};

type Round = { card: Card; options: Card[]; picked: string | null };

function shuffled<T>(list: T[]): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function newRound(pool: Card[], avoid?: string): Round {
  const choices = pool.length > 1 ? pool.filter((c) => c.id !== avoid) : pool;
  const card = choices[Math.floor(Math.random() * choices.length)];
  const others = shuffled(CARDS.filter((c) => c.id !== card.id)).slice(0, 2);
  return { card, options: shuffled([card, ...others]), picked: null };
}

export function Deck() {
  const day = useSyncExternalStore(noSubscription, today, () => "");
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [round, setRound] = useState<Round | null>(null);
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);

  const pool = useMemo(() => CARDS.filter((c) => inFilter(c, filter)), [filter]);
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return pool;
    return pool.filter(
      (c) => c.name.toLowerCase().includes(q) || [...c.upright, ...c.reversed].some((k) => k.includes(q)),
    );
  }, [pool, query]);

  function pick(id: string) {
    if (!round || round.picked) return;
    const right = id === round.card.id;
    const next = right ? streak + 1 : 0;
    setRound({ ...round, picked: id });
    setStreak(next);
    setBest(Math.max(best, next));
  }

  function chooseFilter(f: Filter) {
    setFilter(f);
    // Practice follows the filter, so a round in progress starts over with the new set.
    if (round) setRound(newRound(CARDS.filter((c) => inFilter(c, f))));
  }

  const right = round?.picked === round?.card.id;

  return (
    <section id="learn" className="deck" aria-labelledby="learn-title">
      <h2 id="learn-title" className="display">
        learn the deck.
      </h2>

      {day && (
        <div className="deck-block">
          <h3>today&apos;s card</h3>
          <Learn key={day} card={cardForDay(day)} label="one card to sit with today" />
        </div>
      )}

      <div className="deck-block">
        <h3>choose what to study</h3>
        <div className="chips" role="group" aria-label="filter the deck">
          {FILTERS.map((f) => (
            <button key={f.id} type="button" className="chip" aria-pressed={filter === f.id} onClick={() => chooseFilter(f.id)}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="deck-block">
        <h3>practice</h3>
        {!round ? (
          <>
            <p className="quiet practice-intro">
              see a card, pick its keywords. {filter === "all" ? "drawn from the whole deck." : `drawn from the ${FILTERS.find((f) => f.id === filter)!.label}.`}
            </p>
            <button type="button" className="ghost" onClick={() => setRound(newRound(pool))}>
              start practicing
            </button>
          </>
        ) : (
          <div className="practice">
            <p className="quiet">which keywords belong to this card, upright?</p>
            <p className="practice-card">{round.card.name}</p>
            <div className="options">
              {round.options.map((o) => {
                const state = !round.picked
                  ? undefined
                  : o.id === round.card.id
                    ? "right"
                    : o.id === round.picked
                      ? "wrong"
                      : "other";
                return (
                  <button
                    key={o.id}
                    type="button"
                    className="option"
                    data-state={state}
                    disabled={!!round.picked}
                    onClick={() => pick(o.id)}
                  >
                    {o.upright.join(", ")}
                    {state === "right" && <span className="option-tag">correct</span>}
                    {state === "wrong" && <span className="option-tag">that is {o.name}</span>}
                  </button>
                );
              })}
            </div>
            <div className="practice-foot" aria-live="polite">
              {round.picked ? (
                <>
                  <p className="practice-answer">
                    <strong>{right ? "yes." : "not quite."}</strong> {round.card.meaning}
                  </p>
                  <button type="button" className="primary" onClick={() => setRound(newRound(pool, round.card.id))}>
                    next card
                  </button>
                </>
              ) : (
                <span />
              )}
              <p className="quiet streak">
                {streak} in a row{best > streak ? `, best ${best}` : ""}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="deck-block">
        <h3>browse</h3>
        <label className="sr" htmlFor="deck-search">
          find a card by name or keyword
        </label>
        <input
          id="deck-search"
          className="search"
          type="search"
          placeholder="find a card by name or keyword"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <p className="quiet count" aria-live="polite">
          {shown.length === 0 ? "no cards match. try a different word." : `${shown.length} ${shown.length === 1 ? "card" : "cards"}`}
        </p>
        <div>
          {shown.map((c, i) => (
            <Learn key={c.id} card={c} label={kind(c)} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
