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

  // Texture level of the whole frame, so busy backgrounds raise the bar.
  let sum = 0;
  let n = 0;
  for (let y = 1; y < h - 1; y += 3) {
    for (let x = 1; x < w - 1; x += 3) {
      sum += Math.abs(at(x + 1, y) - at(x - 1, y)) + Math.abs(at(x, y + 1) - at(x, y - 1));
      n += 2;
    }
  }
  const floor = Math.max(16, (sum / n) * 2.5);

  const tolX = Math.max(2, Math.round(r.w * 0.12));
  const tolY = Math.max(2, Math.round(r.h * 0.08));
  const y0 = clampY(r.y + r.h * 0.15);
  const y1 = clampY(r.y + r.h * 0.85);
  const x0 = clampX(r.x + r.w * 0.15);
  const x1 = clampX(r.x + r.w * 0.85);

  const vertical = (cx: number) => {
    let best = 0;
    for (let dx = -tolX; dx <= tolX; dx++) {
      const x = clampX(cx + dx);
      let s = 0;
      for (let y = y0; y <= y1; y++) s += Math.abs(at(x + 1, y) - at(x - 1, y));
      best = Math.max(best, s / (y1 - y0 + 1));
    }
    return best;
  };
  const horizontal = (cy: number) => {
    let best = 0;
    for (let dy = -tolY; dy <= tolY; dy++) {
      const y = clampY(cy + dy);
      let s = 0;
      for (let x = x0; x <= x1; x++) s += Math.abs(at(x, y + 1) - at(x, y - 1));
      best = Math.max(best, s / (x1 - x0 + 1));
    }
    return best;
  };

  const scores = [vertical(r.x), vertical(r.x + r.w), horizontal(r.y), horizontal(r.y + r.h)];
  const sides = scores.filter((s) => s >= floor).length;

  // Movement inside the outline since the previous sample.
  let motion = 255;
  if (prev) {
    let d = 0;
    let m = 0;
    for (let y = clampY(r.y); y <= clampY(r.y + r.h); y += 2) {
      for (let x = clampX(r.x); x <= clampX(r.x + r.w); x += 2) {
        d += Math.abs(gray[y * w + x] - prev[y * w + x]);
        m++;
      }
    }
    motion = d / m;
  }

  // Fingers usually cover part of one edge, so three clean sides count as a card.
  // A hand-held card always trembles a little, so stillness allows for small movement.
  return { sides, motion, aligned: sides >= 3, still: motion < STILL };
}
