export type Spread = {
  id: string;
  name: string;
  layout: string;
  positions: { name: string; meaning: string }[];
  // Camera guide. One slot per position, in a grid where a card is 10 wide and 17 tall.
  // x and y are the top-left corner of an upright card. lx and ly move the number label.
  slots: { x: number; y: number; sideways?: boolean; lx?: number; ly?: number }[];
};

export const SPREADS: Spread[] = [
  {
    id: "single",
    name: "one card",
    layout: "a single card",
    positions: [{ name: "the card", meaning: "the core message for this question" }],
    slots: [{ x: 0, y: 0 }],
  },
  {
    id: "yes-no",
    name: "yes or no",
    layout: "a single card, pulled for a question that can be answered yes or no",
    positions: [{ name: "the answer", meaning: "yes, no, or maybe, and the reason behind it" }],
    slots: [{ x: 0, y: 0 }],
  },
  {
    id: "past-present-future",
    name: "past, present, future",
    layout: "three cards in a row, read left to right",
    positions: [
      { name: "past", meaning: "what led here" },
      { name: "present", meaning: "where things stand now" },
      { name: "future", meaning: "where this is heading on its current course" },
    ],
    slots: [{ x: 0, y: 0 }, { x: 12, y: 0 }, { x: 24, y: 0 }],
  },
  {
    id: "situation-action-outcome",
    name: "situation, action, outcome",
    layout: "three cards in a row, read left to right",
    positions: [
      { name: "situation", meaning: "what is really going on" },
      { name: "action", meaning: "what to do about it" },
      { name: "outcome", meaning: "the likely result of taking that action" },
    ],
    slots: [{ x: 0, y: 0 }, { x: 12, y: 0 }, { x: 24, y: 0 }],
  },
  {
    id: "five-card-cross",
    name: "five card cross",
    layout:
      "a plus shape: center card, then the card to its left, the card to its right, the card above, the card below",
    positions: [
      { name: "present", meaning: "the heart of the matter" },
      { name: "past", meaning: "the influence that is fading" },
      { name: "future", meaning: "the influence that is arriving" },
      { name: "conscious", meaning: "what is known and aimed for" },
      { name: "unconscious", meaning: "what is driving things underneath" },
    ],
    slots: [{ x: 12, y: 19 }, { x: 0, y: 19 }, { x: 24, y: 19 }, { x: 12, y: 0 }, { x: 12, y: 38 }],
  },
  {
    id: "celtic-cross",
    name: "celtic cross",
    layout:
      "a cross of six on the left (center card, the card laid sideways across it, below, left, above, right) and a column of four on the right, read bottom to top",
    positions: [
      { name: "present", meaning: "the heart of the matter" },
      { name: "challenge", meaning: "what crosses or complicates it" },
      { name: "foundation", meaning: "the root of the situation" },
      { name: "recent past", meaning: "what is moving out" },
      { name: "crown", meaning: "the conscious aim, the best that can be reached" },
      { name: "near future", meaning: "what is moving in" },
      { name: "self", meaning: "how the asker is showing up" },
      { name: "environment", meaning: "other people and outside forces" },
      { name: "hopes and fears", meaning: "what is wished for and dreaded" },
      { name: "outcome", meaning: "where this resolves on its current course" },
    ],
    slots: [
      { x: 16, y: 28.5, ly: -5.5 },
      { x: 16, y: 28.5, sideways: true, lx: 6 },
      { x: 16, y: 47.5 },
      { x: 0, y: 28.5 },
      { x: 16, y: 9.5 },
      { x: 32, y: 28.5 },
      { x: 48, y: 57 },
      { x: 48, y: 38 },
      { x: 48, y: 19 },
      { x: 48, y: 0 },
    ],
  },
];

export const getSpread = (id: string) => SPREADS.find((s) => s.id === id);
