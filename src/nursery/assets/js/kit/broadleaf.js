// The broadleaf family: one build for every broadleaf tree, modelled on the Hundred Acre Wood's Bee
// Tree. A trunk lit on its left and shaded on its right, a tone darker under the crown; boughs you
// can see between the clumps, lit on top and shaded under; leaves in separate clumps lit from above
// in four tones, with sky between them; a grown tree finishing in a round head; and a soft shadow on
// the ground (palette key groundShadow). In wind each bough bends at its tip and its clumps go with it,
// the higher boughs more, and the top of the trunk leans a little with the crown.
//
// Members differ in height (`rows`), colour (`tones`, `extra`), bark (`bark`, `mark`, `lean`,
// `thick` boughs) and airiness: `spread` (how far the boughs reach, as a share of the height),
// `from` (where the crown starts) and `airy` (0 a full head of big clumps, 1 a few small clumps
// strung along long boughs, as on the Bee Tree).
import { clamp, hash, lerp, mix, rect, shadowColour, smooth } from "./pixel.js";

const px = (g, colour, x, y) => rect(g, colour, Math.round(x), Math.round(y), 1, 1);

// A bark's four tones from a scene's two (or three): lit, base, shade and the darkest, under the crown.
export function barkTones(bark) {
  if (bark.length >= 4) return bark;
  const shade = bark.length === 3 ? bark[2] : mix(bark[1], "#000000", 0.32);
  return [mix(bark[0], "#ffffff", 0.2), bark[0], bark[1], shade];
}

// A smooth gust in about -1.1..1.1 at time t, a little out of step from place to place.
export function gust(time, x) {
  return Math.sin(time * 1.3 + x * 0.045) * 0.8 + Math.sin(time * 2.9 + x * 0.11) * 0.3;
}

// The pixels of a line that joins edge to edge: where a step goes both across and up, it fills the
// corner, so a bough never hangs on by a corner.
export function line4(x0, y0, x1, y1) {
  let x = Math.round(x0);
  let y = Math.round(y0);
  const xe = Math.round(x1);
  const ye = Math.round(y1);
  const dx = Math.abs(xe - x);
  const dy = -Math.abs(ye - y);
  const sx = x < xe ? 1 : -1;
  const sy = y < ye ? 1 : -1;
  let err = dx + dy;
  const pts = [[x, y]];
  while (x !== xe || y !== ye) {
    const e2 = 2 * err;
    const stepX = e2 >= dy;
    const stepY = e2 <= dx;
    if (stepX && stepY) pts.push([x + sx, y]);
    if (stepX) {
      err += dy;
      x += sx;
    }
    if (stepY) {
      err += dx;
      y += sy;
    }
    pts.push([x, y]);
  }
  return pts;
}

// A bough from (x0, y0) to (x1, y1), w0 thick at the trunk tapering to w1: its upper side lit, its
// underside shaded (`lit` takes the lightest tone for the top of a thick one). A steep bough is lit on its left, like the trunk.
export function bough(g, B, x0, y0, x1, y1, w0 = 1, w1 = 1, lit = false) {
  const pts = line4(x0, y0, x1, y1);
  const flat = Math.abs(x1 - x0) >= Math.abs(y1 - y0);
  pts.forEach(([x, y], i) => {
    const w = Math.max(1, Math.round(lerp(w0, w1, i / Math.max(1, pts.length - 1))));
    for (let k = 0; k < w; k += 1) {
      const tone = w === 1 ? B[1] : k === 0 ? B[lit ? 0 : 1] : B[2];
      if (flat) px(g, k === w - 1 && w > 1 ? B[2] : tone, x, y + k);
      else px(g, tone, x + k - (w >> 1), y);
    }
  });
}

// A trunk standing on `base`, `rows` tall. widthAt(r) and xAt(r) give its width and centre on row r
// above the ground. Lit on the left, shaded on the right, and a tone darker from row `shadeFrom` up,
// where the crown shades it. mark(r, i, w, t) may fleck the bark; t is the tone it would have.
export function barkTrunk(g, B, base, rows, widthAt, xAt, shadeFrom, mark) {
  let prev = null;
  for (let r = 0; r < rows; r += 1) {
    const w = widthAt(r);
    const left = Math.round(xAt(r)) - (w >> 1);
    const dark = r >= shadeFrom ? 1 : 0;
    for (let i = 0; i < w; i += 1) {
      let t = w >= 3 ? (i === 0 ? 0 : i === w - 1 ? 2 : 1) : w === 2 ? i + 1 : 1;
      t = Math.min(3, t + dark);
      px(g, mark?.(r, i, w, t) ?? B[t], left + i, base - 1 - r);
    }
    // A one-wide trunk that steps sideways keeps a pixel on the row it leaves.
    if (prev !== null && w === 1 && left !== prev) px(g, B[Math.min(3, 1 + dark)], prev, base - 1 - r);
    prev = left;
  }
}

// A soft shadow on the ground under a tree, half `half` wide, straight under it (lit from above).
export function groundShadow(g, cx, base, half) {
  g.ctx.fillStyle = shadowColour(g.pal);
  const h = Math.max(1, Math.round(half));
  g.ctx.fillRect(Math.round(cx) - h, base, h * 2 + 1, 1);
  const inner = Math.max(1, Math.round(h * 0.6));
  g.ctx.fillRect(Math.round(cx) - inner, base, inner * 2 + 1, 1);
  if (h >= 5) g.ctx.fillRect(Math.round(cx) - inner, base + 1, inner * 2 + 1, 1);
}

// A clump of leaves centred on (cx, cy), w by h: a rounded, lumpy top over a flatter underside, lit
// from above in four tones (tones[0] the light on top, tones[3] the darkest underneath), its edge
// ragged so it reads as leaves. `dark` (0..1) shades a clump low or deep in the crown; `extra(dx, dy,
// tone)` may replace a leaf (flowers). Returns its box.
export function leafClump(g, cx, cy, w, h, tones, seed, o = {}) {
  const { dark = 0, extra, ragged = 0.3, flat = 0.42 } = o;
  const rx = w / 2;
  const up = h * (1 - flat);
  const down = h * flat;
  const lumps =
    w >= 6
      ? [
          [-0.24, 0.3],
          [0.22, 0.26],
        ]
      : [];
  const top = Math.floor(cy - up - (lumps.length ? 1 : 0));
  const bottom = Math.ceil(cy + down);
  for (let y = top; y <= bottom; y += 1) {
    for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x += 1) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      let d = (dx / rx) ** 2 + (dy / (dy < 0 ? up : down)) ** 2;
      for (const [lx, lr] of lumps) {
        const ly = cy - up * 0.55;
        const r = w * lr;
        d = Math.min(d, ((x + 0.5 - (cx + lx * w)) ** 2 + (y + 0.5 - ly) ** 2) / (r * r));
      }
      if (d > 1) continue;
      if (d > 0.62 && hash(x - Math.round(cx), y - Math.round(cy), seed) < ragged) continue;
      const v = (y - top) / Math.max(1, bottom - top);
      const score = v + (dx / rx) * 0.12 + (hash(x - Math.round(cx), y - Math.round(cy), seed + 1) - 0.5) * 0.3 + dark;
      const tone = score < 0.3 ? 0 : score < 0.6 ? 1 : score < 0.84 ? 2 : 3;
      const c = extra?.(x - Math.round(cx), y - Math.round(cy), tone) ?? tones[tone];
      px(g, c, x, y);
    }
  }
  return { left: cx - rx, right: cx + rx, top, bottom };
}

// Where a broadleaf tree's parts stand at `time`, grown to s on `base`, without painting it: its
// height, trunk, boughs ({ x0, y0, x1, y1, w0 }, low to high) and clumps. A scene uses it to hang
// something from a bough (the Bee Tree's nest).
export function broadleafLayout(p, s, base, spec, time) {
  const { rows, from = 0.36, spread = 0.3, airy = 0.4, lean = 0, thick = false } = spec;
  const total = Math.max(3, Math.round(rows * p.scale * s));
  const amp = clamp(total / 30, 0.35, 1.3);
  const wind = (k, off = 0) => gust(time + off, p.x) * amp * k;
  const tilt = (r) => (lean * Math.min(1, total / 30) * r) / total;
  // The upper trunk bends a little with the crown.
  const bend = (r) => wind(0.7) * smooth(clamp((r / total - 0.45) / 0.55, 0, 1));
  const xAt = (r) => p.x + tilt(r) + bend(r);
  const k = airy >= 0.7 ? 0.12 : (0.44 - 0.26 * airy) * (total < 20 ? 1.2 : 1);
  const cw = Math.max(3, Math.round(total * k));
  const ch = Math.max(2, Math.round(cw * 0.55 + 0.4));
  const clumps = [];
  const boughs = [];
  let stem;
  if (total < 9) {
    // A sapling: a stem under one clump.
    stem = Math.max(1, Math.round(total * 0.55));
    const w = Math.max(3, Math.round(total * 0.8));
    const h = Math.max(2, Math.round(total * 0.5));
    clumps.push({ cx: xAt(stem) + Math.round(wind(0.5)), cy: base - stem - Math.round(h * 0.4), w, h, dark: 0, i: 0 });
  } else {
    stem = Math.round(total * 0.84) - Math.round(ch * 0.4);
    const n = clamp(Math.round(((1 - from) * total) / (4 + airy * 5)), total >= 20 ? 3 : 2, 8);
    const side0 = p.seed % 2 ? 1 : -1;
    for (let i = 0; i < n; i += 1) {
      const a = from + (0.78 - from) * (n === 1 ? 0 : i / (n - 1));
      const c = (a - from) / Math.max(0.1, 1 - from);
      const env = clamp(1 - 1.5 * (c - 0.22) ** 2, 0.45, 1);
      const side = i % 2 ? -side0 : side0;
      const reach = Math.max(2, Math.round(spread * total * env));
      const rise = Math.round(reach * (0.5 + 0.4 * c));
      const r0 = Math.round(a * total);
      const x0 = Math.round(xAt(r0));
      const y0 = base - 1 - r0;
      const sway = Math.round(wind(0.55 + a * 0.6, i * 0.35));
      const x1 = x0 + side * reach + sway;
      const y1 = y0 - rise;
      const w0 = thick ? (total >= 14 ? 2 : 1) : total >= 40 ? 2 : 1;
      boughs.push({ x0, y0, x1, y1, w0 });
      // Clumps along the bough: one at the tip, and on a long or airy bough more strung along it.
      const along = airy >= 0.7 ? [0.42, 0.7, 1] : reach > cw * 0.8 ? [0.5, 1] : [1];
      along.forEach((t, j) => {
        const tip = t === 1;
        const size = tip ? 1 : airy >= 0.7 ? 0.8 : 0.75;
        const w = Math.max(3, Math.round(cw * size));
        const h = Math.max(2, Math.round(ch * size));
        clumps.push({
          cx: Math.round(lerp(x0, x1, t)),
          cy: Math.round(lerp(y0, y1, t)) - Math.round(h * 0.3),
          w,
          h,
          dark: 0.14 * (1 - c) + (tip ? 0 : 0.08),
          i: i * 4 + j + 1,
        });
      });
    }
    // The leader: the trunk's top, under the highest clump. A grown tree finishes in a round head
    // there: one wider, taller clump with lobes at its shoulders and a smooth edge, so the crown
    // reads as complete. Young, half-grown and clearing-shrunk trees keep the small top.
    const mature = s >= 1 && p.scale >= 0.7;
    const tw = mature ? Math.round(cw * (airy >= 0.7 ? 1.25 : 1.5)) : Math.round(cw * 1.1);
    const th = mature ? Math.max(3, Math.round(tw * 0.66)) : Math.max(2, Math.round(ch * 1.05));
    clumps.push({
      cx: Math.round(xAt(stem)) + Math.round(wind(0.4)),
      cy: base - total + Math.round(th * 0.58),
      w: tw,
      h: th,
      dark: -0.04,
      i: 99,
      head: mature,
    });
  }
  return { total, stem, tilt, xAt, boughs, clumps };
}

// Paints a broadleaf tree (see the header for its spec) and records the crown it drew in p.crown, so
// leaves and petals can fall from it and animals perch under it, and its clumps in p.clumps.
export function broadleafTree(g, p, s, base, spec) {
  const { tones, from = 0.36, airy = 0.4, mark, extra } = spec;
  const B = barkTones(spec.bark ?? spec.trunkTones);
  const { total, stem, tilt, xAt, boughs, clumps } = broadleafLayout(p, s, base, spec, g.time);
  const foot = total >= 46 ? 4 : total >= 26 ? 3 : total >= 12 ? 2 : 1;
  const half = Math.max(...clumps.map((c) => Math.abs(c.cx - p.x) + c.w / 2));
  groundShadow(g, p.x + Math.round(tilt(total) * 0.5), base, half * 0.85);
  const shadeFrom = total < 9 ? stem : Math.round(from * total) - 2;
  const widthAt = (r) => {
    const u = r / Math.max(1, stem);
    let w = Math.max(1, Math.round(lerp(foot, Math.max(1, foot - 2), u)));
    if (r < 2 && foot >= 2) w += 2 - r;
    return w;
  };
  // A mark is a colour for scattered flecks (birch, aspen) or a function (r, i, w, seed).
  const fleck =
    typeof mark === "string"
      ? (r, i) => (hash(r, i, p.seed) < 0.22 ? mark : null)
      : mark
        ? (r, i, w) => mark(r, i, w, p.seed)
        : null;
  barkTrunk(g, B, base, stem, widthAt, xAt, shadeFrom, fleck);
  for (const b of boughs) bough(g, B, b.x0, b.y0, b.x1, b.y1, b.w0, 1);
  // Low clumps first, so a higher clump sits over the shaded top of the one beneath.
  const drawn = [...clumps].sort((a, b) => b.cy - a.cy);
  const boxes = drawn.map((c) =>
    leafClump(g, c.cx, c.cy, c.w, c.h, tones, p.seed + c.i * 7, {
      dark: c.dark,
      extra,
      ragged: c.head ? 0.1 : 0.22 + airy * 0.2,
      flat: c.head ? 0.36 : 0.42,
    }),
  );
  p.crown = {
    cx: Math.round(xAt(total)),
    top: Math.min(...boxes.map((b) => b.top)),
    half: Math.round(half),
    bottom: Math.max(...boxes.map((b) => b.bottom)),
  };
  p.clumps = drawn;
  return p.crown;
}

export const FAMILY = {
  id: "broadleaf",
  title: "Broadleaf trees",
  group: "Trees",
  differ: "height, colour, bark, airiness",
};
