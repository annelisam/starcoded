// Browser-side card detection for the webcam flow.
// It looks for straight edges along the on-screen outline and waits for the image to hold still,
// the same idea a banking app uses to auto-capture a check.

export type Region = { x: number; y: number; w: number; h: number };

const CARD_W = 10;
const CARD_H = 17;
const PAD = 3;
export const STILL = 14; // average change per pixel, 0 to 255, below which the picture counts as steady
const INSET = 0.92; // the guide overlay covers 92% of the camera frame

type Slot = { x: number; y: number; sideways?: boolean };

// Where each outline of the on-screen guide sits inside a frame of the given size.
export function slotRegions(slots: Slot[], frameW: number, frameH: number): Region[] {
  const boxes = slots.map((s) => {
    const w = s.sideways ? CARD_H : CARD_W;
    const h = s.sideways ? CARD_W : CARD_H;
    return { x: s.x + CARD_W / 2 - w / 2, y: s.y + CARD_H / 2 - h / 2, w, h };
  });
  const minX = Math.min(...boxes.map((b) => b.x)) - PAD;
  const minY = Math.min(...boxes.map((b) => b.y)) - PAD;
  const spanX = Math.max(...boxes.map((b) => b.x + b.w)) + PAD - minX;
  const spanY = Math.max(...boxes.map((b) => b.y + b.h)) + PAD - minY;
  const scale = Math.min((frameW * INSET) / spanX, (frameH * INSET) / spanY);
  const offX = (frameW - spanX * scale) / 2;
  const offY = (frameH - spanY * scale) / 2;
  return boxes.map((b) => ({
    x: offX + (b.x - minX) * scale,
    y: offY + (b.y - minY) * scale,
    w: b.w * scale,
    h: b.h * scale,
  }));
}

// Where the single-card outline sits inside a frame of the given size.
export function cardRegion(frameW: number, frameH: number): Region {
  return slotRegions([{ x: 0, y: 0 }], frameW, frameH)[0];
}

// Average brightness of the frame, 0 to 255.
export function brightness(gray: Uint8ClampedArray): number {
  let sum = 0;
  let n = 0;
  for (let i = 0; i < gray.length; i += 7) {
    sum += gray[i];
    n++;
  }
  return sum / n;
}

export function toGray(rgba: Uint8ClampedArray): Uint8ClampedArray {
  const gray = new Uint8ClampedArray(rgba.length / 4);
  for (let i = 0, j = 0; i < rgba.length; i += 4, j++) {
    gray[j] = (rgba[i] * 77 + rgba[i + 1] * 150 + rgba[i + 2] * 29) >> 8;
  }
  return gray;
}

export type Analysis = { sides: number; motion: number; aligned: boolean; still: boolean };

// Average change per pixel inside a region between two samples.
// Each sample is measured against its own average brightness first, so a webcam that brightens or
// dims the whole picture does not register as something new in the outline.
export function regionDiff(a: Uint8ClampedArray, b: Uint8ClampedArray, w: number, h: number, r: Region): number {
  const xa = Math.max(0, Math.round(r.x));
  const xb = Math.min(w - 1, Math.round(r.x + r.w));
  const ya = Math.max(0, Math.round(r.y));
  const yb = Math.min(h - 1, Math.round(r.y + r.h));
  let sumA = 0;
  let sumB = 0;
  let n = 0;
  for (let y = ya; y <= yb; y += 2) {
    for (let x = xa; x <= xb; x += 2) {
      sumA += a[y * w + x];
      sumB += b[y * w + x];
      n++;
    }
  }
  if (!n) return 0;
  const shift = (sumA - sumB) / n;
  let d = 0;
  for (let y = ya; y <= yb; y += 2) {
    for (let x = xa; x <= xb; x += 2) {
      d += Math.abs(a[y * w + x] - b[y * w + x] - shift);
    }
  }
  return d / n;
}

const SEGMENTS = 4;

// Looks for a card inside the outline `r`.
//
// A card edge is a long straight line with the same light-to-dark direction along its whole length.
// A face, a shoulder, or a cluttered shelf has curved or broken edges, so each side of the outline is
// split into four segments and at least three of them must show the same edge on the same line.
// The sides that are found must also agree on whether the inside is lighter or darker than the outside.
export function analyze(
  gray: Uint8ClampedArray,
  prev: Uint8ClampedArray | null,
  w: number,
  h: number,
  r: Region,
): Analysis {
  const at = (x: number, y: number) => gray[y * w + x];
  const clampX = (x: number) => Math.max(1, Math.min(w - 2, Math.round(x)));
  const clampY = (y: number) => Math.max(1, Math.min(h - 2, Math.round(y)));

  // Texture level of the whole frame, so busy scenes raise the bar.
  let sum = 0;
  let n = 0;
  for (let y = 1; y < h - 1; y += 3) {
    for (let x = 1; x < w - 1; x += 3) {
      sum += Math.abs(at(x + 1, y) - at(x - 1, y)) + Math.abs(at(x, y + 1) - at(x, y - 1));
      n += 2;
    }
  }
  const floor = Math.max(14, (sum / n) * 1.5);

  const tolX = Math.max(2, Math.round(r.w * 0.12));
  const tolY = Math.max(2, Math.round(r.h * 0.08));

  // Returns +1 or -1 for the direction of a straight edge near the given line, or 0 if there is none.
  const edge = (vertical: boolean, center: number): number => {
    const tol = vertical ? tolX : tolY;
    const from = vertical ? r.y + r.h * 0.1 : r.x + r.w * 0.1;
    const span = (vertical ? r.h : r.w) * 0.8;
    // Cards are rarely perfectly square to the camera, so each line is also tried with a slight lean.
    const lean = Math.max(1, Math.round(span * 0.09));
    let best = 0;
    let bestSign = 0;
    for (let d = -tol; d <= tol; d++) {
      for (let slope = -lean; slope <= lean; slope++) {
        let pos = 0;
        let neg = 0;
        let strength = 0;
        for (let k = 0; k < SEGMENTS; k++) {
          const a = Math.round(from + (span * k) / SEGMENTS);
          const b = Math.round(from + (span * (k + 1)) / SEGMENTS);
          let g = 0;
          for (let t = a; t < b; t++) {
            const off = center + d + slope * ((t - from) / span - 0.5);
            if (vertical) {
              const x = clampX(off);
              g += at(x + 1, clampY(t)) - at(x - 1, clampY(t));
            } else {
              const y = clampY(off);
              g += at(clampX(t), y + 1) - at(clampX(t), y - 1);
            }
          }
          g /= Math.max(1, b - a);
          if (g >= floor) pos++;
          else if (g <= -floor) neg++;
          strength += Math.abs(g);
        }
        if (Math.max(pos, neg) >= SEGMENTS - 1 && strength > best) {
          best = strength;
          bestSign = pos >= neg ? 1 : -1;
        }
      }
    }
    return bestSign;
  };

  // Convert each edge direction to "inside is lighter" (+1) or "inside is darker" (-1).
  const inward = [edge(true, r.x), -edge(true, r.x + r.w), edge(false, r.y), -edge(false, r.y + r.h)];
  const found = inward.filter((s) => s !== 0);
  const sides = found.length;
  const agree = found.every((s) => s === found[0]);

  const motion = prev ? regionDiff(gray, prev, w, h, r) : 255;

  // Fingers usually cover part of one edge, so three clean sides count as a card.
  // A hand-held card always trembles a little, so stillness allows for small movement.
  return { sides, motion, aligned: sides >= 3 && agree, still: motion < STILL };
}
