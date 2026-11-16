// The owls on one build (the desert's great horned owl, the Smokies' barred owl, Iceland's short-eared
// owl), seen head on. The head is a sphere with a facial disc on it: it swivels by sliding the disc,
// the eyes and the beak across the head, and the great horned owl's ear tufts travel with it. A perched
// owl (drawPerch) takes a pose { s: swivel -1..1, blink 0..1, fluff 0..1, shiver, breath }; its neck
// row fills whenever the head lifts, so the head stays joined to the body. A flying owl (drawFlight)
// has wings rooted on its shoulders that change shape through a soft beat and a long glide (beatAt,
// flightPose). Palette, from the scene: owl [brown, shade, face, eyes, beak]. animals.js drives them.

import { clamp, mix, rect } from "./pixel.js";

// ---- Tones and species ---------------------------------------------------------------------------

// Four tones lit from above, a pale rim for the dark page, and the underwing and belly in the pale
// of the face. The scene's owl palette is [brown, shade, face, eyes, beak].
export function owlTones([brown, shade, face, eyes, beak], theme = "dark") {
  const night = theme === "dark";
  const t = {
    hi: mix(brown, face, 0.3),
    base: brown,
    shade,
    deep: mix(shade, "#000000", 0.4),
    face,
    belly: mix(face, brown, 0.35),
    under: mix(face, brown, 0.5),
    rim: night ? mix(brown, face, 0.72) : mix(brown, face, 0.3),
    eyes,
    beak,
  };
  t.far = {
    ...t,
    hi: mix(t.hi, "#000000", 0.18),
    base: mix(t.base, "#000000", 0.18),
    shade: mix(t.shade, "#000000", 0.18),
    deep: mix(t.deep, "#000000", 0.15),
    under: mix(t.under, "#000000", 0.2),
    rim: mix(t.rim, "#000000", 0.2),
  };
  return t;
}

// What differs between the owls: ear tufts, the pattern of the breast, an eye ring, and how the wing
// is held in a glide (the short-eared owl holds it in a shallow V).
export const SPECIES = {
  horned: { tufts: true, breast: "bars", ring: false, glide: 0.16, wing: 6.4, arch: 0.2, round: false },
  barred: { tufts: false, breast: "streaks", ring: false, glide: 0.16, wing: 6.4, arch: 0.2, round: true },
  shortEared: { tufts: false, breast: "streaks", ring: true, glide: 0.3, wing: 6.4, arch: 0.3, round: false },
};

// ---- A pixel canvas ------------------------------------------------------------------------------

function canvas() {
  const cells = new Map();
  return {
    put(x, y, colour) {
      cells.set(`${x},${y}`, { x, y, colour });
    },
    has: (x, y) => cells.has(`${x},${y}`),
    del(x, y) {
      cells.delete(`${x},${y}`);
    },
    cells,
    flush(g, ox, oy, dir) {
      for (const { x, y, colour } of cells.values()) rect(g, colour, dir > 0 ? ox + x : ox - x, oy + y, 1, 1);
    },
  };
}

// ---- The head --------------------------------------------------------------------------------------

// The head, crown row y0, seven wide (columns -3..3), four rows tall. `s` is the swivel: 0 faces you,
// 1 looks to the right in profile, -1 to the left. `blink` is 0 open to 1 shut.
function head(c, t, sp, y0, { s = 0, blink = 0, narrow = false }) {
  const a = (clamp(s, -1, 1) * Math.PI) / 2;
  const cs = Math.cos(a);
  const sn = Math.sin(a);
  const dc = Math.round(sn * 3); // where the middle of the face is
  const side = sn >= 0 ? 1 : -1;
  const hw = Math.max(1, Math.round((narrow ? 1 : 2) * cs)); // half the disc's width, foreshortened
  // The head's silhouette: a crown row 5 wide, two rows 7 wide, a chin row 5 wide (5, 3 narrow, in flight).
  const rows = narrow
    ? [
        [-1, 1],
        [-2, 2],
        [-2, 2],
        [-1, 1],
      ]
    : [
        [-2, 2],
        [-3, 3],
        [-3, 3],
        [-2, 2],
      ];
  rows.forEach(([l, r], i) => {
    for (let x = l; x <= r; x++) c.put(x, y0 + i, i === 0 ? t.hi : t.base);
  });
  // Pale rim along the crown and the upper corners, for the dark page.
  for (let x = rows[0][0]; x <= rows[0][1]; x++) c.put(x, y0, t.rim);
  c.put(rows[1][0], y0 + 1, t.rim);
  c.put(rows[1][1], y0 + 1, t.rim);
  // The facial disc on rows 1 and 2, its edge a ruff of shade.
  for (let i = 1; i <= 2; i++) {
    for (let x = dc - hw; x <= dc + hw; x++) {
      if (x < rows[i][0] || x > rows[i][1]) continue;
      const edge = x === dc - hw || x === dc + hw;
      c.put(x, y0 + i, edge && hw >= 2 ? t.under : t.face);
    }
    for (const x of [dc - hw - 1, dc + hw + 1])
      if (x >= rows[i][0] && x <= rows[i][1] && cs > 0.3) c.put(x, y0 + i, t.shade);
  }
  // The chin takes the face's pale below the beak.
  if (Math.abs(dc) <= 2) for (let x = dc - 1; x <= dc + 1; x++) if (x >= -2 && x <= 2) c.put(x, y0 + 3, t.under);
  // Eyes: the near one slides toward the middle as the head turns, the far one slips round the edge.
  const e = Math.round(cs);
  const lid = blink < 0.34 ? 0 : blink < 0.67 ? 1 : 2;
  const eyeColour = lid === 0 ? t.eyes : lid === 1 ? mix(t.eyes, t.shade, 0.6) : t.deep;
  const eyeAt = (x) => {
    if (x < -3 || x > 3) return;
    if (sp.ring) {
      // The short-eared owl's dark eye ring.
      c.put(x, y0 + 1, t.deep);
      if (lid === 0) c.put(x, y0 + 2, t.deep);
    }
    c.put(x, y0 + 1, eyeColour);
    if (sp.ring && lid === 2) c.put(x, y0 + 1, t.deep);
    // The lid comes down over the disc a little as it shuts.
    if (lid >= 1 && !sp.ring) c.put(x, y0, t.shade);
  };
  if (cs > 0.45) {
    eyeAt(dc - side * Math.max(1, e));
    eyeAt(dc + side * Math.max(1, e));
  } else {
    eyeAt(dc - side);
  }
  // The beak: in front of the face's middle; in profile it ends past the edge of the head.
  const profile = Math.abs(s) > 0.8;
  c.put(dc + (profile ? side : 0), y0 + 2, t.beak);
  // Ear tufts follow the head: they sit at the crown's corners and are carried across as it turns.
  if (sp.tufts) {
    const tx = Math.round((narrow ? 1.4 : 2) * cs);
    for (const sign of [-1, 1]) {
      // As the head turns, the two tufts meet over its back.
      const x = sign * tx - side * (profile ? 1 : 0);
      c.put(x, y0 - 1, t.base);
    }
  }
}

// ---- Perched --------------------------------------------------------------------------------------

// A perched owl at (ox, oy), its toes on row oy. Pose fields: s (swivel), blink, fluff (0..1,
// the feathers stand out), shiver (the ripple of a shake, in frames), breath (0 or 1).
export function drawPerch(g, ox, oy, dir, t, sp, pose = {}) {
  const c = canvas();
  const { fluff = 0, shiver = 0, breath = 0 } = pose;
  const puff = fluff > 0.5 ? 1 : 0;
  head(c, t, sp, -8 - breath, pose);
  // A breath lifts the head a pixel: the neck stretches to keep it joined to the shoulders.
  if (breath) for (let x = -2; x <= 2; x++) c.put(x, -5, Math.abs(x) <= 1 ? t.belly : t.base);
  // Body rows -4..-1 (the head sits on the shoulders; a breath lifts it a pixel).
  const half = [3, 3, 3, 2];
  for (let i = 0; i < 4; i++) {
    const y = -4 + i;
    const hw = half[i] + (i < 3 ? puff : 0);
    for (let x = -hw; x <= hw; x++) {
      const ax = Math.abs(x);
      let colour;
      if (ax <= 1) {
        colour = t.belly;
        if (sp.breast === "bars" && (i === 1 || i === 3)) colour = t.shade;
        if (sp.breast === "streaks" && (ax === 1 || i === 1) && i !== 0 && i !== 3) colour = t.shade;
      } else if (ax === hw) {
        colour = i === 0 ? t.rim : i === 3 ? t.deep : t.shade;
      } else {
        colour = i === 0 ? t.hi : i === 3 ? t.deep : i === 2 ? t.shade : t.base;
      }
      c.put(x, y, colour);
    }
    // A fluffed body shows pale feather tips where the edge stands out.
    if (puff && i > 0 && i < 3 && (i + shiver) % 2 === 0) {
      c.put(-hw, y, t.under);
      c.put(hw, y, t.under);
    }
  }
  // The chest pale rises toward the chin on top rows.
  c.put(0, -4, t.belly);
  // Toes.
  c.put(-1, 0, t.under);
  c.put(1, 0, t.under);
  c.put(-2, 0, t.deep);
  c.put(2, 0, t.deep);
  c.flush(g, ox, oy, dir);
}

// ---- In flight -------------------------------------------------------------------------------------

// A wing, drawn on `side` (-1 or 1) from the head's flank outward, four columns wide (columns 4..7
// from the middle, so the span is 15): broad and blunt, four rows deep at the shoulder and two at the
// tip, a lit leading edge with its pale rim, a paler underside, bars toward the tip, and a fringe of
// separated primaries on the tip. b is the beat from -1 (down) to 1 (up), vel its rate of change: up
// lifts the wing in a shallow V with the tips highest, level holds it flat, down bends it below level
// with the tips lowest, and the tip trails the wrist while the wing moves. The wing is the same on
// both sides, as it is seen from the front.
const WING_DEPTH = [4, 4, 3, 2];
function wing(c, side, y0, b, vel, t) {
  const lift = b > 0 ? -b * 2.7 : -b * 0; // up: the tip rises
  const cols = [];
  for (let i = 0; i < 4; i++) {
    const k = i / 3;
    let shift = b > 0 ? lift * k * (0.5 + 0.5 * k) : -b * (0.9 * k + 1.7 * k * k);
    shift += vel * 1.3 * k * k;
    const top = y0 + 1 + Math.round(shift);
    cols.push([4 + i, top, top + WING_DEPTH[i] - 1]);
  }
  // Make each column meet the one before it, never only at a corner.
  for (let i = 1; i < 4; i++) {
    const prev = cols[i - 1];
    const cur = cols[i];
    if (cur[2] < prev[1]) cur[2] = prev[1];
    if (cur[1] > prev[2]) cur[1] = prev[2];
  }
  cols.forEach(([x, top, bottom], i) => {
    for (let y = top; y <= bottom; y++) {
      let colour = t.under;
      if (y === top) colour = i === 0 ? t.hi : t.rim;
      else if (y === bottom) colour = t.shade;
      else if (i >= 2 && (x + y) % 2 === 0) colour = t.base;
      if (i === 3) colour = y === top ? t.rim : y === bottom ? t.deep : t.shade;
      c.put(side * x, y, colour);
    }
    // The fringe: the last two primaries stand apart below the tip.
    if (i === 3) c.put(side * x, bottom + 1, t.deep);
    if (i === 2) c.put(side * x, bottom + 1, t.shade);
  });
}

// A flying owl at (ox, oy), the middle of its head, facing you: a big round head on the line of the
// wings, a short body below it. The body rises a pixel on the downstroke.
export function drawFlight(g, ox, oy, dir, t, sp, st = {}) {
  const c = canvas();
  const { b = sp.glide, vel = 0 } = st;
  const beat = b < 0 ? Math.max(-1, b * 1.7) : b;
  const bob = beat < -0.35 ? -1 : 0;
  const y0 = -2 + bob;
  wing(c, -1, y0, beat, vel, t);
  wing(c, 1, y0, beat, vel, t);
  // Body under the head: shoulders as wide as the head, then the belly and the tail.
  const half = [3, 2, 1, 1];
  half.forEach((hw, i) => {
    const y = y0 + 4 + i;
    for (let x = -hw; x <= hw; x++) {
      const ax = Math.abs(x);
      let colour = ax <= 1 && hw > 1 ? t.belly : i < 1 ? t.base : i > 2 ? t.deep : t.shade;
      if (hw === 1) colour = i === 3 ? t.deep : t.belly;
      if (ax === hw && hw > 1) colour = i === 0 ? t.shade : t.deep;
      if (ax <= 1 && sp.breast === "bars" && i === 1) colour = t.shade;
      if (ax === 1 && sp.breast === "streaks" && i === 1) colour = t.shade;
      c.put(x, y, colour);
    }
  });
  head(c, t, sp, y0, { s: 0 });
  c.flush(g, ox, oy, dir);
}

// ---- The beat --------------------------------------------------------------------------------------

const FLIGHT_LOOP = 3; // seconds: one soft beat, then a long glide
const BEAT = 1.4; // seconds the beat takes

// The wing's beat b at time t: -1 down .. 1 up. Rests at the glide's arch, rises over the first part
// of the beat, falls through level to the bottom of the stroke, and eases back.
function beatAt(time, glide) {
  const u = (((time % FLIGHT_LOOP) + FLIGHT_LOOP) % FLIGHT_LOOP) / BEAT;
  const sway = Math.sin(time * 1.3) * 0.05;
  if (u >= 1) return glide + sway;
  const sh = Math.sin(2 * Math.PI * u) * Math.min(1, Math.sin(Math.PI * u) * 2.4);
  return glide + (sh > 0 ? (1 - glide) * sh : (1 + glide) * 0.55 * sh) + sway * (1 - Math.abs(sh));
}

export function flightPose(time, sp) {
  const b = beatAt(time, sp.glide);
  const vel = clamp((beatAt(time + 0.05, sp.glide) - beatAt(time - 0.05, sp.glide)) / 0.1 / 3, -1, 1);
  return { b, vel, bob: b < -0.25 ? -1 : 0 };
}
