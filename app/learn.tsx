"use client";

import { useState } from "react";
import type { Card } from "@/lib/cards";
import { getLore } from "@/lib/lore";

// Study notes for one card in a reading. Closed by default so the reading stays the focus.
// The column that matches how the card was drawn is emphasized.
export function Learn({
  card,
  reversed = false,
  label,
  thumb,
  index = 0,
  startOpen = false,
}: {
  card: Card;
  reversed?: boolean;
  label: string;
  thumb?: string;
  index?: number;
  startOpen?: boolean;
}) {
  // The notes are only built once a card is opened, which keeps the full deck list light.
  const [open, setOpen] = useState(startOpen);
  const lore = getLore(card);
  const rows = [
    { label: "keywords", upright: card.upright.join(", "), reversed: card.reversed.join(", ") },
    ...lore.areas,
  ];
  return (
    <details
      className="learn"
      style={{ "--i": Math.min(index, 8) } as React.CSSProperties}
      open={open}
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
      <summary>
        <span className="quiet">{label}</span>
        <span className="learn-name">
          {card.name}
          {reversed && <em> reversed</em>}
        </span>
        <span className="learn-mark" aria-hidden="true" />
      </summary>

      {open && (
      <div className="learn-body">
        <div className="learn-top">
          {thumb && (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="learn-photo" src={thumb} alt={`your ${card.name} card`} />
          )}
          <div>
            <p className="learn-meaning">{reversed ? card.reversedMeaning : card.meaning}</p>
            <dl className="facts">
              <div>
                <dt>type</dt>
                <dd>{lore.type}</dd>
              </div>
              <div>
                <dt>element</dt>
                <dd>{lore.element}</dd>
              </div>
              <div>
                <dt>astrology</dt>
                <dd>{lore.astrology}</dd>
              </div>
              <div>
                <dt>number</dt>
                <dd>{lore.number}</dd>
              </div>
              <div>
                <dt>yes or no</dt>
                <dd>
                  {lore.yesNo.upright} upright, {lore.yesNo.reversed} reversed
                </dd>
              </div>
            </dl>
          </div>
        </div>

        <h3>what to look for on the card</h3>
        <ul className="symbols">
          {lore.symbols.map((s) => (
            <li key={s.name}>
              <span>{s.name}</span>
              <span className="quiet">{s.meaning}</span>
            </li>
          ))}
        </ul>

        <h3>how it reads</h3>
        <table className={reversed ? "reads drew-reversed" : "reads drew-upright"}>
          <thead>
            <tr>
              <td />
              <th scope="col">upright</th>
              <th scope="col">reversed</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label}>
                <th scope="row">{r.label}</th>
                <td>{r.upright}</td>
                <td>{r.reversed}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}
    </details>
  );
}
