import type { Spread } from "@/lib/spreads";

const CARD_W = 10;
const CARD_H = 17;
const PAD = 3;

type Slots = Spread["slots"];

function layout(slots: Slots) {
  const boxes = slots.map((s) => {
    const cx = s.x + CARD_W / 2;
    const cy = s.y + CARD_H / 2;
    const w = s.sideways ? CARD_H : CARD_W;
    const h = s.sideways ? CARD_W : CARD_H;
    return { cx, cy, w, h, x: cx - w / 2, y: cy - h / 2, lx: cx + (s.lx ?? 0), ly: cy + (s.ly ?? 0), sideways: !!s.sideways };
  });
  const minX = Math.min(...boxes.map((b) => b.x)) - PAD;
  const minY = Math.min(...boxes.map((b) => b.y)) - PAD;
  const maxX = Math.max(...boxes.map((b) => b.x + b.w)) + PAD;
  const maxY = Math.max(...boxes.map((b) => b.y + b.h)) + PAD;
  return { boxes, viewBox: `${minX} ${minY} ${maxX - minX} ${maxY - minY}` };
}

export const ONE_SLOT: Slots = [{ x: 0, y: 0 }];

// Outlines drawn over the live camera.
// `state` drives the target: searching (dashed), locking (outline draws itself), checking (pulses), done.
export function Guide({
  slots,
  firstNumber = 1,
  state,
  filled,
  numbers = true,
}: {
  slots: Slots;
  firstNumber?: number;
  state?: "searching" | "locking" | "checking" | "done";
  filled?: boolean[];
  numbers?: boolean;
}) {
  const { boxes, viewBox } = layout(slots);
  return (
    <svg className={`guide${state ? ` is-${state}` : ""}`} viewBox={viewBox} aria-hidden="true">
      {boxes.map((b, i) => (
        <g key={i} className={filled?.[i] ? "is-filled" : undefined}>
          <rect className="guide-shadow" x={b.x} y={b.y} width={b.w} height={b.h} rx={0.8} />
          <rect className="guide-line" x={b.x} y={b.y} width={b.w} height={b.h} rx={0.8} />
          {state && <rect className="guide-progress" x={b.x} y={b.y} width={b.w} height={b.h} rx={0.8} pathLength={1} />}
          {numbers && (
            <text className="guide-number" x={b.lx} y={b.ly} textAnchor="middle" dominantBaseline="central">
              {i + firstNumber}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}

// A small diagram of the spread. Captured cards appear in their positions.
export function SpreadMap({
  slots,
  thumbs,
  current,
  hidden,
  reveal,
}: {
  slots: Slots;
  thumbs: (string | undefined)[];
  current?: number;
  hidden?: number;
  reveal?: boolean;
}) {
  const { boxes, viewBox } = layout(slots);
  return (
    <svg className={`map${reveal ? " is-reveal" : ""}`} viewBox={viewBox} aria-hidden="true">
      {boxes.map((b, i) => {
        const thumb = i === hidden ? undefined : thumbs[i];
        const state = thumb ? "filled" : i === current ? "current" : "todo";
        return (
          <g key={i} className={`slot is-${state}`} style={{ "--i": i } as React.CSSProperties}>
            {thumb && (
              <image
                href={thumb}
                x={b.cx - CARD_W / 2}
                y={b.cy - CARD_H / 2}
                width={CARD_W}
                height={CARD_H}
                preserveAspectRatio="xMidYMid slice"
                transform={b.sideways ? `rotate(90 ${b.cx} ${b.cy})` : undefined}
              />
            )}
            <rect data-slot={i} className="slot-line" x={b.x} y={b.y} width={b.w} height={b.h} rx={0.8} />
            {!thumb && (
              <text className="slot-number" x={b.lx} y={b.ly} textAnchor="middle" dominantBaseline="central">
                {i + 1}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
