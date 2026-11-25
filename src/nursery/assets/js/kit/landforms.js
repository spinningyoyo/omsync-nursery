// The landforms family: the far mountains and hills behind a scene, each drawn whole at every size
// and grown by its height (s), so a watering raises it rather than slicing it. A scene sows several
// of them in its far rows, where the engine fades them toward the sky.
//
// - peak: a jagged mountain lit on the left, with snow on its upper slopes (Yellowstone's Absaroka,
//   the Shahdag massif over the village). Options: rows (its height at scale 1), tones [lit, base,
//   shade], snow.
// - ridge: a wide, soft hill, its crest speckled lighter (the Smokies' blue ridgelines, the village's
//   forested foothills). Options: rows, width, tones [lit, base, shade], and a fringe along the crest
//   once grown: "spires" (spruce and fir, dark spires on the highest ridges) or "crowns" (a broadleaf
//   forest's round crowns all along it).
import { hash, rect, row } from "./pixel.js";

export function peak(g, p, s, base, { rows, tones, snow }) {
  const height = Math.max(4, Math.round(rows * p.scale * s));
  const width = Math.round(height * 1.5);
  for (let r = 0; r < height; r += 1) {
    const f = r / height;
    const bulge = (hash(r, p.seed, 1) - 0.5) * 2;
    const half = Math.round((width / 2) * (1 - f) ** 0.9 + bulge);
    if (half < 1) break;
    row(g, base - 1 - r, p.x - half, p.x + half, (x) => {
      if (f > 0.7 + (hash(x, 0, p.seed) - 0.5) * 0.14) return snow;
      const u = (x - p.x) / half;
      return tones[u < -0.3 ? 0 : u < 0.3 ? 1 : 2];
    });
  }
}

export function ridge(g, p, s, base, { rows = 26, width: wide = 90, tones, fringe = null }) {
  const height = Math.max(3, Math.round(rows * p.scale * s));
  const width = Math.round(wide * p.scale);
  const tops = [];
  for (let r = 0; r < height; r += 1) {
    const f = r / height;
    const half = Math.round((width / 2) * (1 - f) ** 0.6 + (hash(r, p.seed, 1) - 0.5) * 2);
    if (half < 1) break;
    tops.push(half);
    row(g, base - 1 - r, p.x - half, p.x + half, (x) => {
      if (f > 0.82 && hash(x, r, p.seed) < 0.5) return tones[0];
      return tones[hash(x, r, p.seed + 3) < 0.15 ? 2 : 1];
    });
  }
  if (!fringe || s < 1) return;
  // The row of the crest over column x: the highest row still that wide.
  const crest = (x) => tops.findIndex((half) => half < Math.abs(x - p.x)) - 1;
  if (fringe === "spires") {
    // Spires stand along the upper slopes, where the ridge is high enough for spruce and fir.
    for (let x = p.x - Math.round(width * 0.3); x <= p.x + Math.round(width * 0.3); x += 3) {
      if (hash(x, 1, p.seed) < 0.35) continue;
      const r = crest(x);
      if (r < height * 0.55) continue;
      const tall = 3 + Math.round(hash(x, 2, p.seed) * 3);
      for (let k = 0; k < tall; k += 1)
        rect(g, tones[2], x - (k < tall - 2 ? 1 : 0), base - 1 - r - k, k < tall - 2 ? 3 : 1, 1);
    }
    return;
  }
  // Round crowns all along the crest, lit on top and shaded under, so the hill's skyline is a
  // broadleaf forest's.
  for (let x = p.x - Math.round(width * 0.46); x <= p.x + Math.round(width * 0.46); x += 3) {
    const r = crest(x);
    if (r < 1) continue;
    const y = base - 1 - r + Math.round(hash(x, 4, p.seed));
    const big = hash(x, 5, p.seed) < 0.4 ? 1 : 0;
    rect(g, tones[0], x - 1, y - 2 - big, 3, 1);
    rect(g, tones[1], x - 2, y - 1 - big, 5, 1 + big);
    rect(g, tones[2], x - 2, y, 5, 1);
  }
}
