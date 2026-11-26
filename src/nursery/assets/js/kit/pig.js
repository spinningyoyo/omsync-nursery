// The pua'a (feral pig) built from parts, lit from above in four tones. The pig is drawn in its own
// cells (u along the body from the rump, v up from the ground, facing right): a body of columns with a
// bristle ridge along the spine, four short legs that cycle through four drawn poses (reach, under,
// push back, lift) because they are too short to bend, a wedge head on a neck that goes down with it,
// upright ears that sit on the head and a thin tail with a tuft that swings from the hips. puaaAt (below)
// places and poses it; walkPose and restPose here choose the pose. Poses: the trot, standing,
// rooting (the snout in the ground, soil flying up) and the mud wallow (it kneels fore end first, rolls
// onto its back and kicks, rises, shakes mud off and dries). Palette: the scene's pig
// ([body, dark, snout]) with puaaMud, puaaDust and groundShadow beside it.
import { frac, hash, mix, shadowColour, smooth } from "./pixel.js";
import { blinkAt, feet, sinceOf, tonesFor } from "./place.js";

function rectPx(g, colour, x, y, w, h) {
  g.ctx.fillStyle = colour;
  g.ctx.fillRect(x, y, w, h);
}

const ramp = (t, a, b) => smooth(Math.min(1, Math.max(0, (t - a) / (b - a))));
const inside = (t, a, b) => t >= a && t < b;
const bump = (t, a, b, c, d) => ramp(t, a, b) - ramp(t, c, d);

// ---- The build -----------------------------------------------------------------------------------

// Four tones lit from above, darker far legs, hooves, eye, a pale snout and the mud.
export function pigTones(g, mud = 0) {
  const [body, dark, snout] = g.pal.pig;
  const M = g.pal.puaaMud;
  const t = (c) => (mud > 0 ? mix(c, M, 0.7 * mud) : c);
  return {
    H: t(mix(body, snout, 0.24)),
    T: t(body),
    S: t(mix(body, dark, 0.45)),
    U: t(dark),
    far: t(mix(dark, "#000000", 0.2)),
    hoof: mix(dark, "#000000", 0.45),
    E: mix(dark, "#000000", 0.7),
    P: snout,
    N: mix(snout, dark, 0.45),
    B: t(mix(body, snout, 0.42)), // the paler belly, seen when it rolls
    M,
    drop: mix(M, "#ffffff", 0.12),
    soil: g.pal.puaaDust,
    shadow: shadowColour(g.pal),
  };
}

// The four drawn leg poses. Every leg is a solid column two cells wide (a hind leg's thigh is three
// wide, a rounded ham) whose top two rows stay under the body; only the lower two rows move, by how
// far the foot sits from the root: forward, under, back, or lifted with the hoof tucked. Each row
// overlaps the one above by a cell, so a leg is always joined edge to edge.
const FOOT = { reach: [1, 1], under: [0, 0], back: [-1, -1], lift: [-1, null] };

// A leg's rows from the top: [v, first column, width, hoof?], columns from the leg's root.
function legRows(pose, hind) {
  const [s1, s0] = FOOT[pose] || FOOT.under;
  const top = hind ? [-1, 3] : [0, 2];
  const rows = [
    [3, top[0], top[1], false],
    [2, top[0], top[1], false],
  ];
  if (s0 === null) rows.push([1, s1, 2, true]);
  else rows.push([1, s1, 2, false], [0, s0, 2, true]);
  return rows;
}
const LEG_ORDER = ["near hind", "far hind", "far fore", "near fore"];
const ROOTS = { "near hind": 1, "far hind": 3, "far fore": 7, "near fore": 9 };

// The body's columns, rump to shoulder: the top (the back rises to the shoulder hump) and the belly,
// full at the thigh and the chest. The bristle ridge stands one row over the odd columns.
const TOP = [7, 7, 8, 8, 8, 8, 8, 8, 8, 8, 7];
const BOT = [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4];
const FALL = [0, 0, 0, 0, 0, 0, 0.3, 0.7, 1.1, 1.5, 2]; // how far the back follows a lowered head
// A short thin tail hanging from the rump with a dark tuft, swinging out a cell from the hips.
const TAIL = [
  [
    [-1, -1],
    [-1, -2],
    [-1, -3, "D"],
  ],
  [
    [-1, -1],
    [-1, -2],
    [-2, -2, "D"],
  ],
];
const HEAD_T = [4, 4, 3, 3, 2, 2];

// pose: legs [near hind, far hind, far fore, near fore] pose names (or "fold"), dF and dB (the
// shoulders and hips dipping), hd (head down, -0.5 up to 1), breath, blink, tail (0 to 2), lieF and
// lieB (0 to 3, the fore and hind end lowered), roll (0 lying, 0.5 tilting, 1 on its back), kick
// (a time for the legs in the air), shake [rear dx, front dx, head dy, ear dy], mud (0 to 1),
// puddle (0 to 1), extra [[u, v, colour]] grains and drops.
export function drawPig(g, ox, y, dir, pose = {}, tones = pigTones(g)) {
  const {
    legs = ["under", "under", "under", "under"],
    dF = 0,
    dB = 0,
    hd = 0,
    breath = 0,
    blink = false,
    tail = 0,
  } = pose;
  const {
    lieF = 0,
    lieB = 0,
    roll = 0,
    kick = 0,
    shake = [0, 0, 0, 0],
    mud = 0,
    puddle = 0,
    extra = [],
    eyeShut = false,
  } = pose;
  const T = tones;
  const cells = new Map();
  const put = (u, v, c) => {
    if (c) cells.set(`${u},${v}`, [u, v, c]);
  };
  const flipped = roll >= 0.67;
  const tilting = roll >= 0.34 && !flipped;

  // The body's columns.
  const col = [];
  for (let u = 0; u <= 10; u++) {
    const lie = u >= 6 ? lieF : u <= 4 ? lieB : Math.round((lieF + lieB) / 2);
    const dip = u >= 6 ? dF : u <= 4 ? dB : 0;
    const fall = hd > 0 ? Math.round(hd * FALL[u]) : 0;
    const air = breath && u >= 4 && u <= 8 ? 1 : 0;
    const bot = BOT[u] - lie - dip;
    const top = Math.max(bot + 1, TOP[u] - lie - dip - fall + air);
    col.push({ bot, top, dx: u <= 4 ? shake[0] : u >= 6 ? shake[1] : 0 });
  }
  const bodyBottom = (u) => (u >= 0 && u <= 10 ? col[u].bot : 99);

  // Legs, clipped where the body covers them.
  const legCells = (name, tone) => {
    const root = ROOTS[name];
    const hind = name.endsWith("hind");
    const fore = !hind;
    const lie = hind ? lieB : lieF;
    const p = legs[LEG_ORDER.indexOf(name)];
    if (fore && lie >= 3 && !flipped && !tilting) {
      // Folded forward under the chest.
      const near = name === "near fore";
      const from = near ? 8 : 9;
      for (let u = from; u <= from + 3; u++) put(u, 0, u === from + 3 ? T.hoof : tone);
      return;
    }
    if (lie >= 4) return;
    legRows(p, hind).forEach(([v, st, w, hoof]) => {
      for (let k = 0; k < w; k++) {
        const u = root + st + k;
        if (v >= bodyBottom(u)) continue;
        put(u, v, hoof ? T.hoof : tone);
      }
    });
  };

  const bodyCells = () => {
    for (let u = 0; u <= 10; u++) {
      const { bot, top } = col[u];
      for (let v = bot; v <= top; v++) {
        const d = top - v;
        const c = d === 0 ? T.H : v === bot ? T.U : v === bot + 1 ? T.S : T.T;
        put(u, v, c);
      }
    }
    // The bristle ridge: one continuous band along the spine, from the rump up to the neck behind the
    // ears, rising with the hump and lying flat (the owner's edit: no raised block, carried to the neck).
    if (!tilting && !flipped) {
      for (let u = 2; u <= 10; u++) put(u, col[u].top + 1, u >= 6 ? T.U : T.S);
    }
  };

  const tailCells = () => {
    const root = col[0].top;
    for (const [du, dv, c] of TAIL[tail] || TAIL[0]) put(du, root + dv + 1, c === "D" ? T.U : T.S);
  };

  // The head: a wedge from the neck down to the snout disc, ears and eye on it.
  const headCells = (cy0, slope, eyeOpen, floor) => {
    const rows = [];
    for (let k = 0; k < 6; k++) {
      const cy = cy0 - slope * k;
      const t = HEAD_T[k];
      const bot = Math.max(floor, Math.round(cy - t / 2));
      rows.push([bot, bot + t - 1]);
    }
    rows.forEach(([bot, top], k) => {
      for (let v = bot; v <= top; v++) {
        let c = v === top ? (k === 0 ? T.H : T.T) : v === bot ? T.S : T.T;
        if (k === 5) c = T.P; // the pale disc at the very tip
        put(10 + k, v, c);
      }
    });
    put(12, rows[2][1] - 1, eyeOpen ? T.E : T.S);
    return rows;
  };

  // Two small upright ears on the head behind the eye, moving with it.
  const ears = (rows, flap) => {
    if (flipped) return;
    const t1 = rows[1][1];
    const t2 = rows[2][1];
    put(11, t1 + 1 + flap, T.T);
    put(11, t1 + 2 + flap, T.H);
    put(12, t2 + 1 + flap, T.T);
    put(12, t2 + 2 + flap, T.H);
    if (flap) {
      put(11, t1 + 1, T.T);
      put(12, t2 + 1, T.T);
    }
  };

  // ---- Compose -------------------------------------------------------------------------------
  let headRows;
  const hdn = hd;
  const cy0 = 7 - Math.round(2 * hdn) - lieF - dF + shake[2] - 1.5;
  const floor = hdn > 0 ? Math.max(-1, Math.round(4 - 5 * hdn) - lieF - dF) : 4 - lieF - dF;
  const slope = 0.2 + 0.7 * Math.max(hdn, 0);
  const eyeOpen = !(blink || eyeShut);

  if (flipped) {
    // On its back: the pale belly up, the legs kicking, the back in the mud.
    for (let u = 0; u <= 10; u++) {
      for (let v = 0; v <= 4; v++) {
        const c = v === 4 ? T.B : v === 3 ? T.B : v === 2 ? T.T : v === 1 ? T.S : T.U;
        put(u, v, c);
      }
    }
    put(0, 4, null);
    put(10, 4, null);
    const kickLeg = (rx, tone, off, hind) => {
      const which = Math.floor(kick * 6 + off) % 3;
      legRows(["under", "reach", "back"][which], hind).forEach(([v, st, w, hoof]) => {
        for (let k = 0; k < w; k++) put(rx + st + k, 8 - v, hoof ? T.hoof : tone);
      });
    };
    kickLeg(2, T.S, 0, true);
    kickLeg(4, T.T, 1.5, true);
    kickLeg(7, T.T, 2.5, false);
    kickLeg(9, T.S, 0.7, false);
    headRows = headCells(2.5, 0.2, eyeOpen, 0);
    ears(headRows, 0);
    const root = 3;
    for (const [du, dv, c] of TAIL[0]) put(du, root + dv + 1, c === "D" ? T.U : T.S);
  } else if (tilting) {
    // Half over: the far legs come up over the back.
    legCells("near hind", T.S);
    legCells("near fore", T.S);
    bodyCells();
    tailCells();
    for (const [rx, pose2] of [
      [3, "under"],
      [7, "reach"],
    ]) {
      const top = col[rx].top;
      legRows(pose2, rx < 5).forEach(([v, st, w, hoof]) => {
        for (let k = 0; k < w; k++) put(rx + st + k, top + 5 - v, hoof ? T.hoof : T.T);
      });
    }
    headRows = headCells(cy0, slope, eyeOpen, floor);
    ears(headRows, 0);
  } else {
    legCells("far hind", T.far);
    legCells("far fore", T.far);
    bodyCells();
    tailCells();
    legCells("near hind", T.S);
    legCells("near fore", T.S);
    headRows = headCells(cy0, slope, eyeOpen, floor);
    ears(headRows, shake[3]);
  }

  // Mud patches on the flanks and belly.
  if (mud > 0.15) {
    for (const [key, cell] of cells) {
      const [u, v] = cell;
      if (u < 0 || u > 10 || v > 5) continue;
      if (hash(u, v, 11) < mud * 0.35 && v <= 4) cells.set(key, [u, v, T.M]);
    }
  }

  // Tidy the legs, as the bears are tidied: a cell with no more than one neighbour goes, a hole with
  // three neighbours fills.
  const at = (u, v) => cells.get(`${u},${v}`);
  for (let pass = 0; pass < 2; pass++) {
    for (const [key, [u, v]] of [...cells]) {
      if (v > 3 || u < 0 || u > 10 || key.startsWith("-")) continue;
      const n = [at(u - 1, v), at(u + 1, v), at(u, v - 1), at(u, v + 1)].filter(Boolean).length;
      if (n <= 1) cells.delete(key);
    }
    for (let u = 0; u <= 10; u++) {
      for (let v = 0; v <= 3; v++) {
        if (at(u, v)) continue;
        const nb = [at(u - 1, v), at(u + 1, v), at(u, v - 1), at(u, v + 1)].filter(Boolean);
        if (nb.length >= 3) put(u, v, nb[0][2]);
      }
    }
  }

  // ---- Paint -----------------------------------------------------------------------------------
  const X = (u) => (dir > 0 ? ox + u : ox - u);
  const px = (u, v, c) => rectPx(g, c, X(u), y - 1 - v, 1, 1);
  for (let u = -1; u <= 15; u++) px(u, -1, T.shadow);
  if (puddle > 0) {
    const hw = Math.round(puddle * 10);
    for (let u = 7 - hw; u <= 7 + hw; u++) px(u, -1, T.M);
    if (puddle > 0.5) {
      px(5, -1, T.drop);
      px(6, -1, T.drop);
    }
  }
  const dxOf = (u) => (u <= 4 ? shake[0] : u >= 6 ? shake[1] : 0);
  for (const [u, v, c] of cells.values()) px(u + dxOf(u), v, c);
  // Cells that move on their own: the head follows the front's shake.
  for (const [u, v, c] of extra) px(u, v, c === "drop" ? T.drop : c === "soil" ? T.soil : c);
}

// ---- The trot ----------------------------------------------------------------------------------

// The trot's cycle: 0.6 s, and 3.6 px of ground at the scene's 6 px/s, so a planted hoof holds its spot.
const CYCLE = 0.6;
const STRIDE = 3.6;
const BASE = 0.12;

// A leg's pose at a point in its cycle: reach, under, push back (the stance, 52%), lift (the swing).
const phasePose = (c) => {
  const f = frac(c);
  if (f < 0.12) return "reach";
  if (f < 0.32) return "under";
  if (f < 0.52) return "back";
  if (f < 0.86) return "lift";
  return "reach";
};

// The clock of the leg `off` of a cycle behind the first, `d` px into the walk. After a stop it runs on
// to the leg's next "under" and holds there, so the legs settle one after the other. `since` is the
// seconds the animal has stood, or null while it walks.
export function legClock(d, off, since = null) {
  const c = BASE + off + d / STRIDE;
  if (since === null) return c;
  const target = frac(c) >= BASE && frac(c) < 0.32 ? c : Math.ceil(c - BASE - 0.0001) + BASE + 0.02;
  return Math.min(target, c + since / CYCLE);
}

// The legs and body of the trot: diagonal pairs move together, the shoulders and hips dip in turn and
// the tail swings. `moving` is false while it settles into a stop.
export function walkPose(clockA, clockB, moving) {
  const legs = [phasePose(clockA), phasePose(clockB), phasePose(clockA), phasePose(clockB)];
  if (!moving) return { legs, dF: 0, dB: 0, tail: 0, ruffle: 0 };
  const dF = frac(clockA * 2 + 0.1) < 0.4 ? 1 : 0;
  const dB = frac(clockA * 2 + 0.45) < 0.4 ? 1 : 0;
  return { legs, dF, dB, tail: [0, 1, 1, 0][Math.floor(clockA * 4) % 4], ruffle: dF };
}

// ---- The stops ---------------------------------------------------------------------------------

// The seconds a wallow needs from the first step down to dry.
export const WALLOW_SECONDS = 13.4;
const WALLOW_AT = 7; // the routine below starts here, with the pig on its feet
const SHAKE = [16.2, 17.6];

// Standing: it breathes, blinks, flicks its tail and now and then looks up.
function standing(t) {
  const k = t % 7;
  return {
    hd: -0.4 * bump(k, 1.8, 2.1, 3.3, 3.6),
    blink: inside((t + 1.3) % 3.7, 0, 0.14),
    breath: t % 3 < 0.9 ? 1 : 0,
    tail: inside(k, 4.5, 5.1) ? [0, 1, 1, 0][Math.floor(t * 5) % 4] : 0,
  };
}

// Rooting for a stop of `total` seconds: the head eases down, the snout digs in strokes with the tail
// wagging and soil flying up, the head eases up again before it walks on.
function rooting(t, total) {
  const dig = inside(t, 0.6, total - 0.6);
  const wave = 0.5 - 0.5 * Math.cos(((t - 0.6) / 0.75) * Math.PI * 2);
  const weight = bump(t, 0.6, 1.1, total - 1.1, total - 0.6);
  const extra = [];
  // Soil thrown up as the snout digs: three grains a stroke, up and a little forward.
  const j = Math.floor((t - 1.15) / 0.75);
  const age = t - (1.15 + j * 0.75);
  if (j >= 0 && age <= 0.6 && 1.15 + j * 0.75 < total - 1.1) {
    for (let i = 0; i < 3; i++) {
      const h = hash(j, i, 7);
      const u = 14 + i + age * (3 + h * 4);
      const v = 1 + age * (9 + h * 3) - age * age * 18;
      if (v >= 0) extra.push([Math.round(u), Math.round(v), "soil"]);
    }
  }
  return {
    hd: ramp(t, 0, 0.6) - ramp(t, total - 0.6, total) - 0.22 * wave * weight,
    blink: inside((t + 0.5) % 3.7, 0, 0.14),
    breath: !dig && t % 3 < 0.9 ? 1 : 0,
    tail: dig ? [0, 1, 1, 0][Math.floor(t * 5) % 4] : 0,
    extra,
  };
}

// The mud wallow, `at` seconds into the stop: a wet patch shows, it kneels fore end first, drops its
// rump, rolls onto its back and kicks, rolls back, gets up front end first and shakes itself, throwing
// mud drops, its coat darker and patched with mud until it dries off.
function wallowing(at) {
  const t = Math.min(WALLOW_AT + at, 19.8);
  const hd = -0.4 * (bump(t, 7.3, 7.6, 7.9, 8.2) + bump(t, 17.9, 18.2, 18.7, 19.0));
  const lieF = Math.round(4 * bump(t, 8.5, 9.2, 14.7, 15.2));
  const lieB = Math.round(4 * bump(t, 8.9, 9.7, 15.0, 15.6));
  const roll = bump(t, 10.4, 11.3, 13.3, 14.2);
  const down = lieF >= 4;
  const m = ramp(t, 10.8, 13) - 0.4 * ramp(t, SHAKE[0], SHAKE[1]) - 0.6 * ramp(t, 17.8, 19.8);
  const puddle = ramp(t, 7.6, 8.4) * (1 - ramp(t, 17.5, 19.8));
  const blink =
    inside(t, 9.9, 10.3) ||
    (down && roll > 0.3 && roll < 1) ||
    [10.0, 15.9, 18.3, 19.2].some((s) => inside(t, s, s + 0.14));
  const wag = inside(t, 7.5, 8.0);
  let shake = [0, 0, 0, 0];
  let ruffle = 0;
  if (inside(t, SHAKE[0], SHAKE[1])) {
    const k = Math.floor(t * 8) % 2;
    shake = [k, -k, k, k];
    ruffle = k;
  }
  const extra = [];
  // Mud flung off as it shakes: from the back and flanks, out and down.
  if (t >= SHAKE[0] && t < SHAKE[1] + 0.8) {
    for (let i = 0; i < 12; i++) {
      const t0 = SHAKE[0] + i * 0.1;
      const age = t - t0;
      if (age < 0 || age > 0.7 || t0 > SHAKE[1]) continue;
      const h = hash(i, 3, 9);
      const side = i % 2 ? 1 : -1;
      const u = 2 + h * 8 + side * age * (5 + h * 4);
      const v = 8 + age * (5 + h * 3) - age * age * 16;
      if (v >= 0) extra.push([Math.round(u), Math.round(v), "drop"]);
    }
  }
  return {
    hd,
    lieF,
    lieB,
    roll,
    mud: Math.max(0, m),
    puddle,
    blink,
    tail: wag ? [0, 1, 1, 0][Math.floor(t * 5) % 4] : 0,
    ruffle,
    breath: t % 3 < 0.9 ? 1 : 0,
    shake,
    extra,
    kick: t,
  };
}

// The pose of a stop: kind "stand", "root" or "wallow", `t` seconds into it, `total` seconds long.
export function restPose(kind, t, total = 6) {
  if (kind === "wallow") return wallowing(t);
  if (kind === "root") return rooting(t, total);
  return standing(t);
}

// Pigs

// Built from parts (pig.js): the pua'a, a feral pig. It trots with its feet planted (the stride is the
// scene's 6 px/s over 3.6 px a cycle), settles its legs one after the other into a stop and rests in the
// pose rest() picked as it stopped (puaaPoses): "stand" (breathing, blinking, a look up), "root" (the head
// eases down and the snout digs in strokes, soil flying up) or, in a stop long enough, "wallow", its
// signature: a wet patch, it kneels fore end first, rolls onto its back and kicks, rises, shakes mud off
// and dries. p.since (settle, critters.js) is when its state last changed, p.timer the seconds its stop
// has left, p.sinceX and p.prevX where it changed; p.pose shows a pose on demand. Its palette is the
// scene's pig ([body, dark, snout]) with puaaMud, puaaDust and groundShadow beside it.
export const puaaPoses = (p) =>
  (p.timer ?? 0) >= WALLOW_SECONDS
    ? ["root", "root", "stand", "wallow", "wallow", "wallow"]
    : ["root", "root", "stand"];

// The pig's tones, made for each tenth of mud on its coat.
const pigTonesFor = (g, mud) => {
  const key = Math.round(mud * 10);
  return tonesFor(g.pal, `pig:${key}`, () => pigTones(g, key / 10));
};

export function puaaAt(g, p, time = 0) {
  if (g.trace) return g.trace.draw(puaaAt, g, p, time);
  const since = sinceOf(p, time);
  const walking = p.state === "walk";
  const fy = feet(g, p);
  let pose;
  if (walking) {
    const d = p.sinceX == null ? (p.phase ?? 0) * 1.2 : Math.abs(p.x - p.sinceX);
    pose = walkPose(legClock(d, 0), legClock(d, 0.5), true);
  } else {
    const d = p.sinceX == null || p.prevX == null ? 0 : Math.abs(p.sinceX - p.prevX);
    const total = since + (p.timer ?? 0);
    pose = {
      ...walkPose(legClock(d, 0, since), legClock(d, 0.5, since), false),
      ...restPose(p.pose ?? "stand", since, total),
    };
  }
  if (walking) pose.blink = blinkAt(time, 0, 3.7);
  drawPig(g, Math.round(p.x), fy, p.dir, pose, pigTonesFor(g, pose.mud ?? 0));
}

export const FAMILY = {
  id: "pigs",
  title: "Pigs",
  group: "Animals",
  differ: "size, colour",
  drivers: {
    puaaAt: { role: "walker", member: () => "puaa" },
  },
};
