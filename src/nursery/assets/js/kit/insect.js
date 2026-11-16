// Insects, the extra-small tier: butterflies by day and fireflies by night. The shape is a few
// pixels, so the detail is in the motion and the glow.
//
// A butterfly (`butterflyAt`) flutters on a looping path, eases down onto a flower, rests with its
// wings slowly opening and closing, and eases up again. Its wings beat open, half, edge-on, half,
// with the lit upper wing on top and the darker underside below. The scene picks the flower in
// update() (`butterflyPick`) and gives draw() the head's top (`meadowFlowerHead` in plants.js), so
// the feet land on it however the flower has grown and swayed.
//
// A firefly (`fireflyAt`) eases its glow up, holds it a moment and fades it, then rests dark, each
// on its own rhythm; at the brightest it gets a faint 1 px halo. `treeFireflies` makes the crown of
// a tree flash in time: a wave runs out from the middle, draws together until the whole tree
// flashes as one, then loosens again, and the crown takes a faint wash from the flashes.
import { clamp, frac, lerp, mix, rect, smooth, TAU } from "./pixel.js";

// ---- Butterflies -------------------------------------------------------------------------------

const EASE = 1.2; // seconds to land, and to take off
const REST = 3.5; // seconds resting on the flower
const REACH = 40; // the farthest flower a butterfly will go to, in art px

// Wings open (1) to edge-on (0) through half. Seen from behind: a 1 px body, the lit upper wing on
// top and the darker underside below.
function wings(g, x, y, open, colour) {
  const lit = mix(colour, "#ffffff", 0.22);
  const under = mix(colour, "#000000", 0.32);
  const w = open > 0.78 ? 2 : open > 0.4 ? 1 : 0;
  if (w === 0) {
    // Edge-on: the closed wings are a thin sliver, lit above, dark below.
    rect(g, lit, x, y - 1, 1, 1);
    rect(g, colour, x, y, 1, 1);
    rect(g, under, x, y + 1, 1, 1);
    return;
  }
  rect(g, g.pal.body, x, y, 1, 2);
  for (const s of [-1, 1]) {
    rect(g, lit, w === 2 ? (s < 0 ? x - 2 : x + 1) : x + s, y - 1, w === 2 ? 2 : 1, 1);
    rect(g, w === 2 ? lit : colour, x + s, y, 1, 1);
    rect(g, under, x + s, y + 1, 1, 1);
  }
  if (w === 2) {
    rect(g, colour, x - 2, y, 1, 1);
    rect(g, colour, x + 2, y, 1, 1);
  }
}

// Where the butterfly is in its round: `n` counts rounds, `u` is the seconds since it began to
// land, and `pt` is its path time, which stands still while it rests so that it flies on from the
// flower. b.at is when round 0 begins and b.cycle how long a round lasts.
function clock(b, time) {
  const s = time - b.at;
  const n = Math.floor(s / b.cycle);
  const u = s - n * b.cycle;
  const held = clamp(u - EASE, 0, REST);
  return { n, u, pt: time - n * REST - held };
}

// The loose path: small rises and dips on top of a slow sweep. `pt` is path time.
function path(b, pt) {
  return {
    x: b.homeX + Math.sin(pt * b.speed + b.phase) * 30 + Math.sin(pt * 1.9 + b.phase) * 6,
    y: b.homeY + Math.sin(pt * b.speed * 1.3 + b.phase * 2) * 10 + Math.sin(pt * 3.1) * 2,
  };
}

// In update(): at the start of each round, choose the flower to land on. `spots` are objects with
// an x (the scene's mature flowers) and `others` the flowers the other butterflies have chosen. The
// butterfly picks the one nearest the place it will land, or none when all are far.
export function butterflyPick(b, time, spots, others = []) {
  const { n } = clock(b, time);
  if (b.n === n) return;
  b.n = n;
  const landing = path(b, b.at + n * b.cycle + EASE - n * REST).x;
  let best = null;
  for (const s of spots) {
    if (others.includes(s) || Math.abs(s.x - landing) > REACH) continue;
    if (!best || Math.abs(s.x - landing) < Math.abs(best.x - landing)) best = s;
  }
  b.flower = best;
}

// A butterfly of colour pal.flowers[b.colour]. `perch` is where its flower's head tops out ({ x, y },
// the row of the top petal), or null to fly the whole time.
export function butterflyAt(g, b, time, perch = null) {
  if (g.trace) return g.trace.draw(butterflyAt, g, b, time, perch);
  const { u, pt } = clock(b, time);
  const w = !perch
    ? 0
    : u < EASE
      ? smooth(u / EASE)
      : u < EASE + REST
        ? 1
        : u < 2 * EASE + REST
          ? 1 - smooth((u - EASE - REST) / EASE)
          : 0;
  const free = path(b, pt);
  const beat = 0.5 + 0.5 * Math.cos(TAU * 2 * time + b.phase * 8);
  const slow = 0.5 + 0.5 * Math.sin(TAU * (u / (REST * 1.4)));
  const calm = smooth(clamp((w - 0.55) / 0.45, 0, 1));
  const open = lerp(beat, 0.05 + 0.6 * slow, calm);
  const x = lerp(free.x + Math.sin(time * 5) * 0.4, perch ? perch.x : free.x, w);
  // The body (1 x 2) stands on the petal; in flight the wings' beat bobs it.
  const y = lerp(free.y + Math.sin(TAU * 2 * time) * 1.2, perch ? perch.y - 2 : free.y, w);
  wings(g, Math.round(x), Math.round(y), open, g.pal.flowers[b.colour]);
}

// ---- Fireflies ---------------------------------------------------------------------------------

// A flash: eases up, holds a moment, fades, then rests dark. u runs 0..1 through one period.
const flash = (u) => (u < 0.22 ? smooth(u / 0.22) : u < 0.34 ? 1 : u < 0.72 ? 1 - smooth((u - 0.34) / 0.38) : 0);

// The two glow tones for a colour: a warm point and a paler core.
export const glowTones = (colour) => [mix(colour, "#d08a20", 0.35), mix(colour, "#ffffff", 0.45)];

// One glow of strength I (0..1): a dim warm point as it rises, a paler core and a faint 1 px halo
// at the brightest. tones is [warm, pale].
function fireflyGlow(g, x, y, I, [warm, pale]) {
  if (I < 0.06) return;
  const ctx = g.ctx;
  if (I > 0.62) {
    ctx.globalAlpha = 0.3 * smooth((I - 0.62) / 0.38);
    rect(g, pale, x - 1, y, 1, 1);
    rect(g, pale, x + 1, y, 1, 1);
    rect(g, pale, x, y - 1, 1, 1);
    rect(g, pale, x, y + 1, 1, 1);
  }
  ctx.globalAlpha = Math.min(1, 0.18 + I * 0.9);
  rect(g, I > 0.55 ? mix(warm, pale, smooth((I - 0.55) / 0.45)) : warm, x, y, 1, 1);
  ctx.globalAlpha = 1;
}

// A firefly drifting at (x, y) that blinks on its own rhythm: `phase` (any number) fixes both the
// moment and the length of its period, 2.5 to 5 seconds.
export function fireflyAt(g, x, y, time, phase, tones) {
  if (g.trace) return g.trace.draw(fireflyAt, g, x, y, time, phase, tones);
  const period = 2.5 + frac(phase * 7.3) * 2.5;
  fireflyGlow(g, Math.round(x), Math.round(y), flash(frac(time / period + phase / TAU)), tones);
}

const TREE_LOOP = 12; // seconds from wave to together and back
const TREE_BEAT = 3; // seconds between flashes

// The fireflies of one crown (tree: { cx, half, top, bottom }); each has u (-1..1 across), v (0..1
// down) and a phase. They flash every 3 s. The delay between the middle and the edge swells and
// fades over twelve seconds, so the flash runs outward as a wave, draws together until the whole
// tree flashes as one, then loosens again.
export function treeFireflies(g, flies, tree, time, tones) {
  const { cx, half, top, bottom } = tree;
  const spread = 0.5 + 0.5 * Math.cos((time / TREE_LOOP) * TAU); // 1 a wave, 0 together
  let sum = 0;
  const lit = flies.map((f) => {
    const x = Math.round(cx + f.u * half * 0.85 + Math.sin(time * 0.3 + f.phase) * 0.8);
    const y = Math.round(top + 3 + f.v * (bottom - top - 5));
    const delay = spread * 1.3 * Math.abs(f.u) + spread * 0.25 * Math.sin(f.phase);
    const I = flash(frac((time - delay) / TREE_BEAT) * 0.78);
    sum += I;
    return { x, y, I };
  });
  const wash = lit.length ? sum / lit.length : 0;
  if (wash > 0.04) {
    // The crown takes a faint wash from the flashes.
    g.ctx.globalAlpha = 0.1 * wash;
    const mid = (top + bottom) / 2;
    const hh = (bottom - top) / 2 + 2;
    for (let y = top - 2; y <= bottom + 2; y += 1) {
      const k = 1 - ((y - mid) / hh) ** 2;
      if (k <= 0) continue;
      const w = Math.round(half * Math.sqrt(k) + 2);
      rect(g, tones[1], Math.round(cx) - w, Math.round(y), w * 2 + 1, 1);
    }
    g.ctx.globalAlpha = 1;
  }
  for (const p of lit) fireflyGlow(g, p.x, p.y, p.I, tones);
}
