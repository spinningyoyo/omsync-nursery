// Effects shared by the scenes. Mist bands drift across the page, drawn over the plants and behind
// the animals; a scene draws them in draw() so reduced motion leaves them out. The night sky's stars
// and the Milky Way are drawn behind the plants, in drawBack().
import { blob, clamp, hash, rect, smooth } from "./pixel.js";

// A band of mist somewhere across the page, `lift` rows above the soil and up to `span` rows
// higher, drifting at its own speed.
export function mistBand(f, lift, span) {
  return {
    x0: f.rand() * (f.cols + 140),
    y: f.groundY - lift - f.rand() * span,
    w: 60 + f.rand() * 60,
    h: 5 + f.rand() * 4,
    speed: 1.5 + f.rand() * 2,
  };
}

// A soft, translucent band of mist that wraps from one edge of the page to the other.
export function mistAt(g, m, time, cols) {
  const x = ((m.x0 + time * m.speed) % (cols + 140)) - 70;
  g.ctx.globalAlpha = 0.16;
  blob(g, Math.round(x), m.y, m.w, m.h, () => g.pal.mist);
  blob(g, Math.round(x) + Math.round(m.w * 0.25), m.y - 2, Math.round(m.w * 0.6), m.h, () => g.pal.mist);
  g.ctx.globalAlpha = 1;
}

// Night sky

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

// Whether a pixel at strength a (0 to 1) is lit in an ordered dither, so a glow fades in steps of
// scattered pixels and stays pixel art.
export const dithered = (x, y, a) => (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16 < a;

// A star of one pixel, or with `big` a faint cross round it.
export function starAt(g, colour, x, y, alpha, big) {
  g.ctx.globalAlpha = alpha;
  rect(g, colour, x, y, 1, 1);
  if (big) {
    g.ctx.globalAlpha = alpha * 0.5;
    rect(g, colour, x - 1, y, 3, 1);
    rect(g, colour, x, y - 1, 1, 3);
  }
}

// Stars scattered over the sky, down to `clear` rows above the soil, each twinkling at its own rate;
// about one in eight is a bigger, warmer one. Drawn with the palette's star: [white, warm].
export function starField(f, count, clear) {
  return Array.from({ length: count }, () => ({
    x: Math.floor(f.rand() * f.cols),
    y: 3 + Math.floor(f.rand() * Math.max(10, f.groundY - clear)),
    phase: f.rand() * 6.28,
    rate: 0.6 + f.rand() * 1.6,
    big: f.rand() < 0.12,
  }));
}

export function starFieldAt(g, stars, time) {
  for (const star of stars) {
    const pulse = 0.5 + 0.5 * Math.sin(time * star.rate + star.phase);
    starAt(g, g.pal.star[star.big ? 1 : 0], star.x, star.y, 0.35 + pulse * 0.65, star.big);
  }
  g.ctx.globalAlpha = 1;
}

// The Milky Way's glow comes in five steps of strength, each in three tones: warm toward the core,
// pale in the middle of the band and cool toward its far end. Fainter steps run purple, brighter
// ones peach and white.
const MILKY_STEPS = [0.14, 0.24, 0.34, 0.46, 0.6];
const MILKY_TONES = [
  ["#8a7f9e", "#7d86a8", "#6f7fae"],
  ["#c9a98a", "#a9a3bd", "#8f9fcb"],
  ["#e8c99c", "#cfc6d8", "#b3c2e4"],
  ["#f6dcae", "#e6e0ea", "#d2ddf2"],
  ["#fff0d2", "#f8f4f0", "#eef3ff"],
];
const BAND_SAMPLES = 400;

// Value noise in two dimensions, and three octaves of it, for the band's star clouds and dust.
function noise(x, y, seed) {
  const i = Math.floor(x);
  const j = Math.floor(y);
  const u = smooth(x - i);
  const v = smooth(y - j);
  const a = hash(i, j, seed);
  const b = hash(i + 1, j, seed);
  const c = hash(i, j + 1, seed);
  const d = hash(i + 1, j + 1, seed);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

const clouds = (x, y, seed) =>
  0.55 * noise(x, y, seed) + 0.3 * noise(x * 2.1, y * 2.1, seed + 1) + 0.15 * noise(x * 4.3, y * 4.3, seed + 2);

// The Milky Way's centre line, from its core at `from` (along 0) to its far end at `to` (along 1):
// straight, or bowed through `via` as a fisheye lens bends it. A scene adds to it how the band runs:
//   width(along)  its half-width
//   glow(along)   its brightness along its length
//   core(along)   the core's bulge, which spreads wider than the band
//   rift          how far along the Great Rift's dark lane reaches from the core
//   warm          how far along the warm tones reach
export function bandPath(from, to, via = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 }) {
  return Array.from({ length: BAND_SAMPLES + 1 }, (_, i) => {
    const t = i / BAND_SAMPLES;
    const m = 1 - t;
    return {
      x: m * m * from.x + 2 * m * t * via.x + t * t * to.x,
      y: m * m * from.y + 2 * m * t * via.y + t * t * to.y,
    };
  });
}

// The band's direction at sample i, as a unit vector.
function tangent(points, i) {
  const a = points[Math.max(0, i - 1)];
  const b = points[Math.min(points.length - 1, i + 1)];
  const length = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  return { x: (b.x - a.x) / length, y: (b.y - a.y) / length };
}

// How far along the band the pixel (x, y) lies, and how far off its centre line, to one side or
// the other: the nearest of a coarse set of samples, then the nearest of its neighbours.
function placeOnBand(points, x, y) {
  const away = (i) => (points[i].x - x) ** 2 + (points[i].y - y) ** 2;
  let best = 0;
  for (let i = 0; i < points.length; i += 8) if (away(i) < away(best)) best = i;
  const near = best;
  for (let i = Math.max(0, near - 8); i <= Math.min(points.length - 1, near + 8); i += 1) {
    if (away(i) < away(best)) best = i;
  }
  const d = tangent(points, best);
  return { along: best / BAND_SAMPLES, off: (x - points[best].x) * d.y - (y - points[best].y) * d.x };
}

// The point `along` the band and `across` it, in band widths.
export function onBand(band, along, across) {
  const i = Math.round(clamp(along, 0, 1) * BAND_SAMPLES);
  const d = tangent(band.points, i);
  const w = band.width(along) * across;
  return { x: Math.round(band.points[i].x + d.y * w), y: Math.round(band.points[i].y - d.x * w) };
}

// The Milky Way never moves, so it is drawn once into its own canvas, `cols` by `rows`: a glow in
// fixed steps, dithered from one to the next, with ragged edges, clumps of star cloud, the dark lane
// of the Great Rift wandering up from the core, dust round the core, and its own dense, faint stars.
export function milkyWayCanvas(cols, rows, band) {
  const canvas = document.createElement("canvas");
  canvas.width = cols;
  canvas.height = rows;
  const ctx = canvas.getContext("2d");
  const dust = [];
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      const { along, off } = placeOnBand(band.points, x, y);
      const w = band.width(along);
      const across = (off + (clouds(x / 13, y / 13, 21) - 0.5) * w * 0.9) / w;
      if (Math.abs(across) > 1.7) continue;
      let glow = Math.exp(-across * across * 2) * band.glow(along);
      glow += band.core(along) * Math.exp(-across * across * 1.2);
      glow *= 0.3 + 1.45 * clouds(x / 6.5, y / 6.5, 3) ** 1.4;
      const lane = off - w * (0.08 + 0.5 * (clouds(along * 7, 0.5, 31) - 0.5));
      const laneWidth = w * (0.12 + 0.16 * clouds(along * 9, 1.5, 33));
      const rift = Math.exp(-((lane / laneWidth) ** 2)) * clamp((band.rift - along) / 0.1, 0, 1);
      glow *= 1 - 0.9 * rift * (0.55 + 0.45 * clouds(x / 3, y / 3, 35));
      if (along < 0.2 && clouds(x / 3.5, y / 3.5, 9) > 0.63) glow *= 0.3;
      const s = glow * 0.55;
      let step = MILKY_STEPS.findLastIndex((level) => s >= level);
      const next = step + 1;
      if (next < MILKY_STEPS.length) {
        const low = step < 0 ? MILKY_STEPS[0] * 0.45 : MILKY_STEPS[step];
        if (s > low && dithered(x, y, (s - low) / (MILKY_STEPS[next] - low))) step = next;
      }
      if (step < 0) continue;
      const tone = along + (hash(x, y, 7) - 0.5) * 0.1;
      ctx.globalAlpha = MILKY_STEPS[step];
      ctx.fillStyle = MILKY_TONES[step][tone < band.warm ? 0 : tone < 0.62 ? 1 : 2];
      ctx.fillRect(x, y, 1, 1);
      if (hash(x, y, 11) < glow * 0.16) dust.push({ x, y, seed: hash(x, y, 13), a: 0.35 + 0.6 * hash(x, y, 12) });
    }
  }
  for (const d of dust) {
    ctx.globalAlpha = d.a;
    ctx.fillStyle = d.seed < 0.22 ? "#ffe6c0" : d.seed > 0.86 ? "#cfe0ff" : "#ffffff";
    ctx.fillRect(d.x, d.y, 1, 1);
  }
  return canvas;
}
