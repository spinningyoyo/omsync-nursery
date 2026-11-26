// The shelled and scaled (desert tortoise, snake, honu and ghost crab) built from parts. Each is drawn
// in its own units (x from the tail toward the nose, h above the ground) through plot(x, h, colour),
// lit from above in four tones, with its far limbs a darker tone; the caller places, mirrors and
// shades the ground under it. Members differ in shell and length, and each moves in its own gait:
// the tortoise's diagonal crawl with its shell rocking, the snake's slither as a travelling wave that
// stays put on the ground while the body slides through it, the honu's flipper strokes in water (and
// its heaving crawl on sand), the crab's sideways scuttle. tortoiseAt, snakeAt,
// honuShellAt and crabAt (below) place and pose them; the *Frame functions here choose the pose from a
// walker's state.
import { bone, bump, ease, joint, rowFill } from "./build.js";
import { clamp, frac, lerp, mix, rgba, shadowColour } from "./pixel.js";
import { paintAt, tonesFor } from "./place.js";

// A value along keyframes [[time, value], ...], eased between them.
function keys(t, frames) {
  if (t <= frames[0][0]) return frames[0][1];
  for (let i = 1; i < frames.length; i += 1) {
    const [t0, v0] = frames[i - 1];
    const [t1, v1] = frames[i];
    if (t <= t1) return lerp(v0, v1, ease((t - t0) / (t1 - t0)));
  }
  return frames.at(-1)[1];
}

// Four tones lit from above from one base colour, plus the far limbs' tone.
function ramp(base, dark, { lift = 0.2, shade = 0.3, deep = 0.6, far = 0.45 } = {}) {
  return {
    H: mix(base, "#ffffff", lift),
    T: base,
    S: mix(base, dark, shade),
    U: mix(base, dark, deep),
    F: mix(base, dark, far),
  };
}

// A limb through points, each bone tapering between widths, filled row by row so each row reaches
// the row before it (no corner-only joins). Returns its cells [x, h].
function limbCells(points, widths) {
  const cells = new Map();
  const span = rowFill(cells);
  for (let i = 0; i + 1 < points.length; i += 1)
    bone(span, points[i], points[i + 1], widths[i], widths[i + 1], { inset: true });
  return [...cells.values()];
}

// ---- The desert tortoise -------------------------------------------------------------------------

// A high dome nine columns long, rows h6 down to the marginal row at h2: vertebral scutes along the
// top, costal scutes below with paler centres (a) and dark seams (s), the marginals darkest.
const TORT_SHELL = ["..HHHHH..", ".HHsHHsH.", "TaTsTaTsT", "SSsSSsSSs", "UUUUUUUUU"];
// The head and neck held out, relative: neck column 9, head 10-11. K skin, k skin in shade, H lit,
// e eye, t the throat that pumps as it breathes.
const TORT_HEAD = [
  [9, 2, "k"],
  [9, 3, "K"],
  [10, 2, "t"],
  [10, 3, "e"],
  [10, 4, "H"],
  [11, 2, "k"],
  [11, 3, "K"],
  [11, 4, "H"],
];

// Tones from the scene's tortoise palette [shell, seams, skin, rim].
export function tortoiseTones([shell, seam, skin, rim]) {
  const s = ramp(shell, rim, { lift: 0.18, shade: 0.35, deep: 1 });
  const k = ramp(skin, rim, { lift: 0.15, shade: 0.35, far: 0.55 });
  return {
    ...s,
    s: seam,
    a: mix(shell, "#f2dc9c", 0.32),
    K: skin,
    k: k.S,
    kH: k.H,
    kF: k.F,
    t: k.S,
    tB: k.H,
    nail: rim,
    e: mix(rim, "#000000", 0.4),
  };
}

// One tortoise. Pose: phase, amp (0 standing, 1 walking), out (head out 1, withdrawn 0), dh (head
// up or down), down (shell lowered onto its plastron), fold (legs drawn in), blink, breath, bite.
export function drawTortoise(c, plot, pose) {
  const { phase = 0, amp = 0, out = 1, dh = 0, down = 0, fold = 0, blink = false, breath = 0, bite = false } = pose;
  const walking = amp > 0.5;
  const stepOf = (off) => (walking ? Math.floor(frac(phase + off) * 4) : 1);
  // Diagonal pairs: the near hind with the far fore, the near fore with the far hind. While a pair
  // swings the shell rocks onto the other, dipping at that end.
  const pairA = stepOf(0);
  const pairB = stepOf(0.5);
  const rock = pairA === 3 ? 1 : pairB === 3 ? -1 : 0;
  const sink = Math.round(down);
  const drop = (x) => sink + (rock > 0 && x >= 5 ? 1 : rock < 0 && x <= 3 ? 1 : 0);

  // A short leg in one of four drawn poses: reaching, under, pushed back, lifted with the foot tucked.
  const leg = ([x0, w], step, far, fore) => {
    if (fold > 0.5) return;
    const n = 2 - drop(x0);
    for (let h = n - 1; h >= 0; h -= 1) {
      if (step === 3 && h === 0) continue;
      let dx = 0;
      if (h === 0 && step === 0) dx = 1;
      if (h === 0 && step === 2) dx = -1;
      for (let x = x0 + dx; x < x0 + dx + w; x += 1) {
        let col = far ? c.kF : h === n - 1 ? c.k : c.K;
        if (!far && fore && h === 0 && x === x0 + dx + w - 1) col = c.nail;
        plot(x, h, col);
      }
      if (step === 3 && h === n - 1 && n > 1) plot(fore ? x0 + w : x0 - 1, h, far ? c.kF : c.K);
    }
  };
  leg([3, 1], pairB, true, false);
  leg([5, 1], pairA, true, true);

  // The head and neck, one piece: they slide back under the front of the shell to withdraw.
  const hx = -Math.round((1 - out) * 3);
  const hh = Math.round(dh) - drop(8);
  if (out > 0.05) {
    // The neck stretches down or up to keep the head on, so nothing floats.
    if (hh < 0) for (let h = 2 + hh; h < 2; h += 1) plot(9 + hx, h, c.k);
    if (hh > 0) for (let h = 4; h <= 3 + hh; h += 1) plot(9 + hx, h, c.K);
    for (const [x, h, key] of TORT_HEAD) {
      let col = key === "H" ? c.kH : c[key];
      if (key === "e" && blink) col = c.K;
      if (key === "t" && breath) col = c.tB;
      plot(x + hx, x === 9 ? h : h + hh, col);
    }
    if (bite) plot(11 + hx, 1 + hh, c.k);
  }

  // The shell, column by column so it can rock and settle as one piece.
  TORT_SHELL.forEach((line, r) => {
    [...line].forEach((ch, x) => {
      if (ch === ".") return;
      plot(x, 6 - r - drop(x), c[ch]);
    });
  });

  leg([1, 2], pairA, false, false);
  leg([6, 2], pairB, false, true);

  // Withdrawn: the shell rests on its plastron, the elephantine hind feet show as stubs and the
  // scaly forelegs fold across the opening at the front.
  if (fold > 0.5) {
    plot(0, 0, c.k);
    plot(1, 0, c.k);
    plot(3, 0, c.kF);
    for (const [x, h] of [
      [7, 0],
      [8, 0],
      [8, 1],
      [9, 0],
    ])
      plot(x, h, h === 1 ? c.K : c.k);
    plot(9, 1, c.nail);
  }
}

export const TORTOISE = { mid: 5, shadow: [-1, 12], stride: 2.4 };
export const TORTOISE_POSES = ["tuck", "graze", "look"];
const TORTOISE_EASE = 0.3; // seconds a walk takes to start or stop
const TORTOISE_NEED = { tuck: 4.8, graze: 3.6, look: 0 };

// The tortoise at rest, `since` seconds into a stop with `left` to go (its length S = since + left).
// "tuck": it pulls in, the head and neck sliding back under the shell as one piece, then the legs
// fold and the shell settles on its plastron; near the end its head peeks out, the shell rises and
// it comes out. "graze": it lowers its head to the ground and bites, then lifts it. "look": it
// stands, breathing, and lifts its head to look about.
function tortoiseRest(name, since, left, time, seed) {
  const S = since + left;
  const pose = {
    breath: frac((time + seed) / 2.6) < 0.5 ? 1 : 0,
    blink: frac((time + seed) / 3.9) < 0.03,
  };
  if (name === "tuck") {
    Object.assign(pose, {
      out: keys(since, [
        [0.8, 1],
        [1.3, 0],
        [S - 2.3, 0],
        [S - 1.9, 0.67],
        [S - 0.5, 0.67],
        [S, 1],
      ]),
      fold: keys(since, [
        [1.3, 0],
        [1.6, 1],
        [S - 0.9, 1],
        [S - 0.5, 0],
      ]),
      down: keys(since, [
        [1.3, 0],
        [1.6, 1],
        [S - 0.9, 1],
        [S - 0.5, 0],
      ]),
    });
    if (since > 1.3 && since < S - 0.5) pose.breath = 0;
    if (since > S - 1.9 && since < S - 0.5) pose.blink = frac((since - (S - 1.9)) / 0.9) < 0.12;
  } else if (name === "graze") {
    const down = bump(since, 0.7, S - 0.9, 0.5);
    pose.dh = Math.round(-2 * down);
    pose.bite = down > 0.99 && frac(since / 0.8) < 0.2;
  } else {
    pose.dh = Math.round(bump(since, 1, Math.min(3.4, S - 0.8), 0.3));
  }
  return pose;
}

// The tortoise's pose for a walker `t` (state, pose, since, timer, x and dir).
export function tortoiseFrame(t, time) {
  const dir = t.dir;
  const bx = t.x * dir;
  const still = t.since == null;
  const since = still ? 100 : time - t.since;
  const seed = (t.phase ?? 0) * 0.41;
  const phase = still ? (t.phase ?? 0) * 0.25 : bx / TORTOISE.stride;
  if (t.state === "walk")
    return {
      pose: { phase, amp: Math.min(1, since / TORTOISE_EASE), blink: frac((time + seed) / 3.9) < 0.03 },
      at: bx - TORTOISE.mid,
    };
  const left = t.timer ?? 99;
  let name = t.pose ?? "tuck";
  if (!(name in TORTOISE_NEED) || since + left < TORTOISE_NEED[name]) name = "look";
  const pose = { phase, amp: Math.max(0, 1 - since / TORTOISE_EASE), ...tortoiseRest(name, since, left, time, seed) };
  return { pose, at: bx - TORTOISE.mid };
}

// ---- The snake -----------------------------------------------------------------------------------

// A Mojave-type rattlesnake: thirteen nodes from the rattle to the neck, thickest at mid-body, sand
// with brown blotches, black and pale rings before the rattle, and a broad head with a dark band
// through the eye.
const SNAKE = { n: 13, thick: [1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2], wave: 12 };

// Tones from the scene's snake palette [sand, brown] and the colour of its tongue.
export function snakeTones([sand, brown], tongue) {
  return {
    H: mix(sand, "#ffffff", 0.12),
    T: sand,
    S: mix(sand, brown, 0.3),
    U: mix(sand, brown, 0.5),
    bH: mix(brown, sand, 0.3),
    bT: brown,
    bU: mix(brown, "#000000", 0.3),
    ring: mix(brown, "#000000", 0.45),
    pale: mix(sand, "#ffffff", 0.45),
    rattle: mix(sand, "#8a7a64", 0.45),
    e: "#1a1410",
    tongue,
  };
}

// Laid out along the ground, its curves fixed to the ground: the wave is read at the node's place on
// the ground (X + i), so as the snake slides on, its body passes through the same bends. The head
// end damps the wave so the head glides level.
function snakeLine(X) {
  return Array.from({ length: SNAKE.n }, (_, i) => {
    const amp = i <= 8 ? 0.75 : i === 9 ? 0.6 : i === 10 ? 0.4 : 0.2;
    return [i, amp * (1 + Math.sin((2 * Math.PI * (X + i)) / SNAKE.wave)), i];
  });
}

// One snake from nodes [x, h, z] (h the underside of the body there, z the drawing order) with the
// head at the last node. Pose: tongue (0..1 out), blink, rattle (vibration, the frame number).
export function drawSnake(c, plot, nodes, pose = {}) {
  const samples = [];
  for (let i = 0; i + 1 < nodes.length; i += 1) {
    const steps = 6;
    for (let s = 0; s < steps; s += 1) {
      const u = s / steps;
      const [x0, h0, z0] = nodes[i];
      const [x1, h1, z1] = nodes[i + 1];
      samples.push({ x: lerp(x0, x1, u), h: lerp(h0, h1, u), z: lerp(z0, z1, u), i: i + u });
    }
  }
  samples.push({ x: nodes.at(-1)[0], h: nodes.at(-1)[1], z: nodes.at(-1)[2], i: nodes.length - 1 });
  samples.sort((a, b) => a.z - b.z);
  // Lit along the back, shaded low on the flank, darkest at the belly on the ground; the blotches
  // lie across the back and the upper flank, never the belly.
  const colour = (i, row, rows, ground) => {
    const node = Math.floor(i);
    if (node === 0) return c.rattle;
    if (node === 1) return c.ring;
    if (node === 2) return i - node < 0.5 ? c.pale : c.ring;
    const key = row === rows - 1 ? (rows === 1 ? "T" : "H") : ground ? "U" : "S";
    const blotch = node >= 3 && node <= 11 && (node + 1) % 4 < 2;
    if (blotch) return key === "H" ? c.bH : key === "U" ? c.bU : c.bT;
    return c[key];
  };
  let prev = null;
  for (const p of samples) {
    const X = Math.round(p.x);
    const H = Math.max(0, Math.round(p.h));
    const rows = SNAKE.thick[Math.min(SNAKE.n - 1, Math.round(p.i))];
    for (let r = 0; r < rows; r += 1) plot(X, H + r, colour(p.i, r, rows, H === 0));
    // A one-row stretch that steps both across and up gets the corner filled.
    if (prev && rows === 1 && prev.X !== X && prev.H !== H) plot(X, prev.H, colour(p.i, 0, 1, prev.H === 0));
    prev = { X, H };
  }
  // The rattle buzzing: it blurs a pixel to and fro.
  if (pose.rattle != null) {
    const [x, h] = nodes[0];
    plot(Math.round(x) + (pose.rattle % 2 ? -1 : 1), Math.round(h), rgba(c.rattle, 0.6));
  }
  // The head: broad behind the eye, the band through the eye, a narrower snout.
  const [nx, nh] = nodes.at(-1);
  const X = Math.round(nx) + 1;
  const H = Math.max(0, Math.round(nh));
  const head = [
    [0, 0, c.U],
    [1, 0, c.S],
    [2, 0, c.S],
    [0, 1, c.bT],
    [1, 1, pose.blink ? c.bT : c.e],
    [2, 1, c.T],
    [0, 2, c.H],
    [1, 2, c.H],
  ];
  for (const [dx, dh, col] of head) plot(X + dx, H + dh, col);
  // The forked tongue flicking out from under the snout.
  if (pose.tongue > 0) {
    const len = pose.tongue > 0.5 ? 2 : 1;
    for (let k = 1; k <= len; k += 1) plot(X + 2 + k, H, c.tongue);
    if (len === 2) {
      plot(X + 5, H + 1, c.tongue);
      if (H > 0) plot(X + 5, H - 1, c.tongue);
    }
  }
}

// The rattle's buzz: short arcs that leave the raised tail and fade, like the lion's rings but small.
// `b` is the seconds since the snake reared; a new arc leaves every 0.4 s and lasts half a second.
export function drawBuzz(plot, colour, [x, h], b) {
  const last = Math.floor(b / 0.4);
  for (let k = Math.max(0, last - 1); k <= last; k += 1) {
    const u = (b - k * 0.4) / 0.5;
    if (u < 0 || u >= 1) continue;
    const r = 1.5 + u * 3;
    const seen = new Set();
    for (let a = 100; a <= 170; a += 12) {
      const rad = (a * Math.PI) / 180;
      const px = Math.round(x + Math.cos(rad) * r);
      const ph = Math.round(h + 0.5 + Math.sin(rad) * r);
      if (seen.has(`${px},${ph}`)) continue;
      seen.add(`${px},${ph}`);
      plot(px, ph, rgba(colour, 0.85 * (1 - u)));
    }
  }
}

// The resting coil, side on: the rattle raised at the back, the body round the far side, back along
// the near side, a second turn laid on top, and the neck rising from the middle to a head held level.
// Each node: [x, h, z] (z the drawing order: far first).
const COIL = [
  [2.5, 3, 1.5],
  [2, 1.5, 1],
  [3, 1, 0],
  [5.5, 1, 0],
  [8, 1, 0],
  [10, 0.5, 2],
  [8, 0, 3],
  [5.5, 0, 3],
  [3, 0, 3],
  [3.5, 2, 4],
  [6, 2.5, 4],
  [8, 3, 5],
  [8.5, 4, 6],
];
// Rearing: the coil gathered a little higher and the neck drawn up and back in an S, ready.
const REAR = [
  [2.5, 3, 1.5],
  [2, 1.5, 1],
  [3, 1, 0],
  [5.5, 1, 0],
  [8, 1, 0],
  [10, 0.5, 2],
  [8, 0, 3],
  [5.5, 0, 3],
  [3, 0, 3],
  [3.5, 2, 4],
  [6, 2.5, 4],
  [7.5, 4.5, 5],
  [6.5, 6.5, 6],
];
const blendNodes = (A, B, u) => A.map((p, i) => p.map((v, k) => lerp(v, B[i][k], ease(u))));

export const SNAKE_UNITS = { mid: 8, shadow: [0, 17] };
export const SNAKE_POSES = ["coil", "coil", "rear", "stretch"];
const SNAKE_NEED = { stretch: 0, coil: 3.4, rear: 6.4 };

// The snake for a walker `s`: its nodes, its pose and, rearing, how long since it reared (for the
// buzz). Its curves are read from where it is on the ground, so it slithers through fixed bends.
export function snakeFrame(s, time) {
  const bx = s.x * s.dir;
  const at = Math.round(bx) - SNAKE_UNITS.mid;
  const still = s.since == null;
  const since = still ? 100 : time - s.since;
  const left = s.timer ?? 99;
  const S = since + left;
  const stretch = snakeLine(at);
  const pose = { blink: false, tongue: 0 };
  let nodes = stretch;
  if (s.state !== "walk" || still) {
    let name = s.pose ?? "coil";
    if (!(name in SNAKE_NEED) || S < SNAKE_NEED[name]) name = "stretch";
    if (still && s.state === "walk") name = "stretch";
    if (name !== "stretch") {
      const gather = keys(since, [
        [0.4, 0],
        [1.6, 1],
        [S - 1.4, 1],
        [S - 0.1, 0],
      ]);
      let body = COIL;
      if (name === "rear") {
        body = blendNodes(
          COIL,
          REAR,
          keys(since, [
            [2.2, 0],
            [2.7, 1],
            [S - 2.2, 1],
            [S - 1.7, 0],
          ]),
        );
        if (since > 2.4 && since < S - 1.8) Object.assign(pose, { rattle: Math.floor(time * 16), buzz: since - 2.4 });
      }
      nodes = blendNodes(stretch, body, gather);
    }
    // It flicks its tongue now and then, stopped.
    const ph = frac((time + (s.phase ?? 0) * 0.3) / 1.4);
    if (since > 0.3 && ph < 0.18) pose.tongue = ph < 0.09 ? 1 : 0.4;
  }
  return { nodes, pose, at };
}

// ---- The honu ------------------------------------------------------------------------------------

// A green sea turtle: a low, teardrop carapace (highest a little forward of the middle) with dark
// radiating streaks, a short blunt head, long fore flippers rooted at the shoulder and small hind
// flippers. Its own units: h0 the plastron's edge.
const HONU_TOP = [1, 1, 2, 2, 3, 3, 3, 3, 2, 1];

// Tones from the scene's turtle palette [shell, dark, skin].
export function honuTones([shell, dark, skin]) {
  const s = ramp(shell, dark, { lift: 0.22, shade: 0.45, deep: 0.85 });
  const k = ramp(skin, dark, { lift: 0.15, shade: 0.35, far: 0.6 });
  return { ...s, d: dark, K: skin, k: k.S, kH: k.H, kF: k.F, kU: k.U, e: mix(dark, "#000000", 0.5) };
}

// One honu. Pose: stroke (flipper angle in degrees from pointing back: + up, - down), flat (flipper
// edge-on, 0..1), tilt (rows its front rises), dh (head up or down), eyesShut, blink, mouth.
// `land` lays the fore flipper's tip on the ground at x = reach instead of swinging it.
export function drawHonu(c, plot, pose) {
  const { stroke = 0, tilt = 0, dh = 0, blink = false, eyesShut = false, land = null, mouth = false } = pose;
  const lift = (x) => Math.round(tilt * clamp((x - 2) / 8, 0, 1));
  const flipper = (far) => {
    const R = far ? [7, 2 + lift(7)] : [8, 1 + lift(8)];
    let tip;
    let mid;
    if (land) {
      tip = [land.reach + (far ? -1 : 0), land.raise];
      mid = joint(R, tip, 2.4, 3.2, land.reach > R[0] ? -1 : 1, [R[0], R[1] + 2.4 * 0.7]);
    } else {
      const a = (stroke * Math.PI) / 180;
      tip = [R[0] - 4.5 * Math.cos(a), R[1] + 4.5 * Math.sin(a)];
      const b = a * 0.7;
      mid = [R[0] - 2.2 * Math.cos(b), R[1] + 2.2 * Math.sin(b)];
    }
    const w = land ? 1 : lerp(2, 1, pose.flat ?? 0);
    return limbCells([R, mid, tip], [2, w, 1]);
  };
  for (const [x, h] of flipper(true)) plot(x, h, c.kF);
  // Hind flipper trailing behind the shell.
  plot(-1, lift(0), c.k);
  plot(0, lift(0), c.k);
  // Head and neck.
  const H = Math.round(dh);
  const hl = lift(11);
  const head = [
    [10, 1, c.k],
    [10, 2, c.K],
    [11, 1 + H, c.k],
    [11, 2 + H, eyesShut || blink ? c.K : c.e],
    [11, 3 + H, c.kH],
    [12, 1 + H, mouth ? c.kU : c.k],
    [12, 2 + H, c.K],
  ];
  if (H < 0) head.push([10, 1 + H, c.k]);
  if (H > 0) head.push([10, 3, c.K]);
  for (const [x, h, col] of head) plot(x, h + hl, col);
  // The carapace: lit on top, streaked, its rim darkest.
  for (let x = 0; x < HONU_TOP.length; x += 1) {
    const top = HONU_TOP[x];
    const o = lift(x);
    for (let h = 0; h <= top; h += 1) {
      let col = h === top ? c.H : h === 0 ? c.U : h === 1 ? c.S : c.T;
      if (h > 0 && h < top && (x * 2 + h) % 5 === 0) col = c.d;
      if (h === top && top >= 2 && x % 3 === 1) col = c.T;
      plot(x + 1, h + o, col);
    }
  }
  for (const [x, h] of flipper(false)) plot(x, h, land ? c.k : c.K);
}

// The hatchling: three columns of dark shell, a head, a flipper that strokes. Its own units.
export function drawHatchling(c, plot, stroke) {
  const a = (stroke * Math.PI) / 180;
  const R = [2, 1];
  const tip = [R[0] - 2.5 * Math.cos(a), R[1] + 2.5 * Math.sin(a)];
  for (const [x, h] of limbCells([R, tip], [1, 1])) plot(x, h, c.kF);
  for (const [x, h, col] of [
    [0, 0, c.U],
    [1, 0, c.U],
    [2, 0, c.U],
    [0, 1, c.S],
    [1, 1, c.T],
    [2, 1, c.T],
    [1, 2, c.H],
    [3, 1, c.K],
    [3, 0, c.k],
    [4, 1, c.k],
  ])
    plot(x, h, col);
  plot(3, 1, c.e);
}

// Tones for the hatchling from the same palette: a darker shell, as hatchlings have.
export function hatchTones([, dark, skin]) {
  const shell = mix(dark, "#000000", 0.35);
  return {
    ...ramp(shell, "#000000", { lift: 0.25, shade: 0.25, deep: 0.45 }),
    K: mix(skin, dark, 0.2),
    k: mix(skin, dark, 0.45),
    kF: mix(dark, "#000000", 0.2),
    e: "#100c08",
  };
}

export const HONU = { mid: 6, shadow: [-2, 14], cycle: 1.4 };
export const HATCHLING = { mid: 2, cycle: 0.7 };

// The flipper stroke in water, p of the way through: a strong downstroke sweeping down and back,
// then a slower recovery, the flipper flat to us through the sweep and edge-on as it comes back.
export function strokeAt(p) {
  const q = frac(p);
  if (q < 0.45) return { stroke: lerp(35, -40, ease(q / 0.45)), flat: 0 };
  return { stroke: lerp(-40, 35, ease((q - 0.45) / 0.55)), flat: 1 };
}

// Swimming, `time` seconds in: the flipper strokes and the body lifts a row with each downstroke.
// Returns the pose and how many rows it bobs.
export function swimAt(time) {
  return { pose: strokeAt(time / HONU.cycle), bob: Math.round(Math.sin((2 * Math.PI * time) / HONU.cycle + 1) * 0.6) };
}

// The crawl on sand, both fore flippers together: reach forward lifted, plant and heave the body on
// (the front lifting a row), then rest and breathe. `slide` 0..1 is how far into the heave. The
// Hawaii scene's honu crawls up the beach with it when it hauls out.
export const CRAWL = 1.8; // seconds per heave
const HEAVE = 3; // pixels per heave
export function crawlAt(p) {
  const q = frac(p);
  if (q < 0.3) {
    const u = ease(q / 0.3);
    return {
      land: { reach: Math.round(lerp(6, 12, u)), raise: Math.round(Math.sin(Math.PI * u) * 2) },
      tilt: 0,
      slide: 0,
      dh: 0,
    };
  }
  if (q < 0.65) {
    const u = ease((q - 0.3) / 0.35);
    return {
      land: { reach: Math.round(12 - HEAVE * u), raise: 0 },
      tilt: Math.sin(Math.PI * u) > 0.3 ? 1 : 0,
      slide: u,
      dh: 0,
    };
  }
  const u = (q - 0.65) / 0.35;
  return {
    land: { reach: 12 - HEAVE, raise: 0 },
    tilt: 0,
    slide: 1,
    dh: u > 0.3 && u < 0.75 ? 1 : 0,
    mouth: u > 0.35 && u < 0.6,
  };
}

// How far the body has moved after p heaves (p may be fractional): the flipper stays planted while
// the body slides on HEAVE pixels in each heave.
export function crawlX(p) {
  return HEAVE * (Math.floor(p) + crawlAt(p).slide);
}

// Hauled out, `t` seconds into the bask: lying flat with the head down on the sand and the fore
// flippers laid back, blinking, its eyes slowly closing; a gasp for breath with the head up and the
// mouth open; then two flicks of a fore flipper toss sand onto its back, as basking green turtles do.
const FLICKS = [6.5, 7.3];
export function baskAt(t) {
  const flick = (s) => clamp((t - s) / 0.5, 0, 1);
  const f = Math.max(...FLICKS.map((s) => Math.sin(Math.PI * flick(s))));
  const within = (spans) => spans.some(([a, b]) => t >= a && t < b);
  return {
    land: { reach: Math.round(lerp(6, 3, f)), raise: Math.round(f * 2) },
    dh: Math.round(
      keys(t, [
        [5, -1],
        [5.3, 0],
        [5.8, 0],
        [6.1, -1],
      ]),
    ),
    mouth: t >= 5.3 && t < 5.7,
    eyesShut: (t >= 2.6 && t < 5.1) || t >= 11,
    blink: within([
      [1.2, 1.32],
      [9.0, 9.12],
    ]),
  };
}

// Grains of sand from each flick: up off the flipper tip and over onto the shell, where they rest a
// while and fade. `colour` is the sand's hex.
export function drawGrains(plot, colour, t) {
  for (const [k, s] of FLICKS.entries()) {
    for (let i = 0; i < 3; i += 1) {
      const u = (t - s - 0.15 - i * 0.05) / 0.5;
      if (u < 0) continue;
      const from = [4 - i, 1];
      const to = [3 + i * 2 - k, 3 + (i === 1 ? 1 : 0)];
      if (u < 1) {
        plot(
          Math.round(lerp(from[0], to[0], u)),
          Math.round(lerp(from[1], to[1], u) + Math.sin(Math.PI * u) * 3),
          colour,
        );
      } else {
        const age = t - s - 0.65;
        if (age < 3) plot(to[0], to[1] + 1, rgba(colour, age < 2 ? 1 : 3 - age));
      }
    }
  }
}

// ---- The ghost crab ------------------------------------------------------------------------------

// An ʻōhiki seen face on, as it scuttles sideways: a box of a carapace held high, tall eyestalks, four
// legs a side with the knees up above the body (the rear ones in the far tone), and claws of unequal
// size folded before the mouth, the big one pale. Its own units: x 0 to 10, centre 5.
// Tones from the scene's crab palette [shell, dark].
export function crabTones([shell, dark]) {
  const s = ramp(shell, dark, { lift: 0.4, shade: 0.45, deep: 1, far: 1 });
  return {
    ...s,
    L: mix(shell, dark, 0.3),
    F: mix(dark, "#000000", 0.12),
    claw: mix(shell, "#ffffff", 0.45),
    tip: mix(dark, "#000000", 0.35),
    e: "#1a1a1a",
  };
}

// Pose: phase, amp (scuttling), body (the underside's row, 2 standing, 1 crouched), eyes (stalk up 1,
// folded 0), eyeL and eyeR (one dips a row), claws (0 folded, 1 raised), nip (raised claws open).
export function drawCrab(c, plot, pose) {
  const { phase = 0, amp = 0, body = 2, eyes = 1, eyeL = 0, eyeR = 0, claws = 0, nip = false } = pose;
  const b = Math.round(body);
  const splay = 2 - b;
  // Legs: front pair near, rear pair far; tips step to and fro in alternating sets as it runs right.
  const legs = [
    { side: -1, reach: 2 + splay, knee: [2, 3], far: true, a: 0 },
    { side: -1, reach: 1 + splay, knee: [1.5, 2], far: false, a: 0.5 },
    { side: 1, reach: 2 + splay, knee: [2, 3], far: true, a: 0.5 },
    { side: 1, reach: 1 + splay, knee: [1.5, 2], far: false, a: 0 },
  ];
  const legAt = (L) => {
    const p = frac(phase + L.a);
    let shift = 0;
    let up = 0;
    if (amp > 0.5) {
      if (p < 0.5) shift = lerp(1, -1, p / 0.5);
      else {
        const s = (p - 0.5) / 0.5;
        shift = lerp(-1, 1, s);
        up = Math.sin(Math.PI * s) > 0.5 ? 1 : 0;
      }
    }
    const edge = L.side < 0 ? 2 : 8;
    const R = [edge, b + 1];
    const K = [edge + L.side * (L.knee[0] + splay * 0.5), b + L.knee[1] - splay];
    const F = [edge + L.side * L.reach + Math.round(shift), up];
    return limbCells([R, K, F], [1, 1, 1]);
  };
  for (const L of legs.filter((l) => l.far)) for (const [x, h] of legAt(L)) plot(x, h, c.F);
  // Carapace, wide and short: the underside row darkest, a base row shaded at its sides, a lit top.
  for (let x = 2; x <= 8; x += 1) {
    plot(x, b, c.U);
    plot(x, b + 1, x === 2 || x === 8 ? c.S : c.T);
    if (x > 2 && x < 8) plot(x, b + 2, c.H);
  }
  // Eyestalks: up on the carapace, or folded flat to the sides.
  const eye = (x, dip, side) => {
    if (eyes > 0.5) {
      plot(x, b + 3, c.T);
      if (!dip) plot(x, b + 4, c.T);
      plot(x, b + 4 + (dip ? 0 : 1), c.e);
    } else {
      plot(x + side, b + 2, c.e);
    }
  };
  eye(3, eyeL, -1);
  eye(7, eyeR, 1);
  for (const L of legs.filter((l) => !l.far)) for (const [x, h] of legAt(L)) plot(x, h, c.L);
  // Claws: folded before the mouth, or raised high to the sides, the big one open as it threatens.
  const u = clamp(claws, 0, 1);
  const small = [Math.round(lerp(3, 1, u)), Math.round(lerp(b, b + 4, u))];
  const big = [Math.round(lerp(6, 9, u)), Math.round(lerp(b, b + 5, u))];
  plot(small[0], small[1], c.claw);
  if (u <= 0.5) plot(small[0], small[1] - 1, c.tip);
  for (const [dx, dh, col] of [
    [0, 0, c.claw],
    [1, 0, c.claw],
    [0, -1, c.claw],
    [1, -1, c.H],
    [1, 1, nip ? null : c.claw],
    [2, 1, nip ? c.claw : null],
    [1, -2, u <= 0.5 ? c.tip : null],
  ])
    if (col) plot(big[0] + dx - 1, big[1] + dh, col);
  if (u > 0.5) {
    // The arms joining the raised claws to the body, and the dark fingertips at the top of each claw,
    // where it now points.
    plot(2, b + 2, c.L);
    plot(1, b + 3, c.L);
    plot(8, b + 3, c.L);
    plot(8, b + 2, c.L);
    plot(9, b + 3, c.L);
    plot(nip ? big[0] + 1 : big[0], big[1] + 2, c.tip);
    plot(small[0], small[1] + 1, c.tip);
  }
}

export const CRAB = { mid: 5, shadow: [0, 11], stride: 3.6 };
export const CRAB_POSES = ["alert", "crouch", "threat"];
const CRAB_EASE = 0.2;
const CRAB_NEED = { alert: 0, crouch: 2, threat: 2.2 };

// The ghost crab for a walker `c`: scuttling sideways with its legs stepping in alternating sets, or
// stopped: alert with an eyestalk dipping, crouched with its eyestalks folded into their grooves, or
// in its threat display, both claws raised and the big one snapping.
export function crabFrame(c, time) {
  const bx = c.x * c.dir;
  const still = c.since == null;
  const since = still ? 100 : time - c.since;
  const phase = still ? (c.phase ?? 0) * 0.25 : bx / CRAB.stride;
  const at = bx - CRAB.mid;
  if (c.state === "walk") return { pose: { phase, amp: Math.min(1, since / CRAB_EASE) }, at };
  const left = c.timer ?? 99;
  const S = since + left;
  let name = c.pose ?? "alert";
  if (!(name in CRAB_NEED) || S < CRAB_NEED[name]) name = "alert";
  const seed = (c.phase ?? 0) * 0.3;
  const pose = { phase, amp: Math.max(0, 1 - since / CRAB_EASE) };
  const wiggle = frac((time + seed) / 1.9);
  if (name === "alert")
    Object.assign(pose, { eyeL: wiggle > 0.1 && wiggle < 0.22, eyeR: wiggle > 0.55 && wiggle < 0.67 });
  else if (name === "crouch") {
    const d = bump(since, 0.3, S - 0.2, 0.3);
    Object.assign(pose, { body: 2 - d, eyes: 1 - d });
  } else {
    const up = bump(since, 0.25, S - 0.2, 0.35);
    Object.assign(pose, { claws: up, nip: up > 0.99 && Math.floor(time * 4) % 2 === 0 });
  }
  return { pose, at };
}

// Shelled and scaled

// Built from parts (shell.js): a desert tortoise that plods in diagonal pairs with its shell rocking,
// a snake that slithers through bends fixed to the ground, a honu that swims on strokes of its fore
// flippers, and a ghost crab that scuttles sideways. Each palette is the scene's array under the
// animal's name (tortoise, snake, turtle, crab) with the scene's `groundShadow` beside it (and the
// snake's `snakeTongue` and `snakeBuzz`). Tones are made once per array and animal, so the honu and its
// hatchling, which share the turtle array, keep their own.
const shellTones = (colours, key, make) => tonesFor(colours, key, () => make(colours));

// Paints an animal whose own units are laid at origin `ox` (in its mirrored coordinates, so the animal
// faces `dir`), its feet on row y - 1, over a soft shadow on row y from column s0 to s1 (exclusive).
function shellAt(g, ox, y, dir, [s0, s1], draw) {
  paintAt(g, ox * dir, y, dir, draw, { colour: shadowColour(g.pal), span: [s0, s1 - 1] });
}

// A desert tortoise walking, or stopped: it pulls its head in and settles on its plastron (the
// default), grazes or lifts its head to look, as t.pose (TORTOISE_POSES) says. Its feet stand on row
// y - 1. Its palette is tortoise: [shell, seam, skin, rim].
export const tortoisePoses = TORTOISE_POSES;
export function tortoiseAt(g, t, y, time = 0) {
  if (g.trace) return g.trace.draw(tortoiseAt, g, t, y, time);
  const f = tortoiseFrame(t, time);
  const pal = shellTones(g.pal.tortoise, "tortoise", tortoiseTones);
  shellAt(g, Math.round(f.at), y, t.dir, TORTOISE.shadow, (plot) => drawTortoise(pal, plot, f.pose));
}

// A snake slithering, or stopped: stretched flicking its tongue, coiled, or reared with its rattle
// buzzing, as s.pose (SNAKE_POSES) says. Its palette is snake: [sand, brown].
export const snakePoses = SNAKE_POSES;
export function snakeAt(g, s, time = 0) {
  if (g.trace) return g.trace.draw(snakeAt, g, s, time);
  const f = snakeFrame(s, time);
  const pal = shellTones(g.pal.snake, "snake", (c) => snakeTones(c, g.pal.snakeTongue));
  shellAt(g, f.at, s.y ?? g.groundY + 6, s.dir, SNAKE_UNITS.shadow, (plot) => {
    drawSnake(pal, plot, f.nodes, f.pose);
    if (f.pose.buzz != null) drawBuzz(plot, g.pal.snakeBuzz, f.nodes[0], f.pose.buzz);
  });
}

// A sea turtle swimming with its shell's bottom row at y, or its hatchling at scale k below 1. Its
// palette is turtle: [shell, dark, skin].
export function honuShellAt(g, t, y, time, k = 1) {
  if (g.trace) return g.trace.draw(honuShellAt, g, t, y, time, k);
  const hatch = k < 1;
  const unit = hatch ? HATCHLING : HONU;
  // Its shell's bottom row is y, the row its feet would stand on; its middle is at t.x.
  const x = Math.round(t.x) - t.dir * unit.mid;
  if (hatch) {
    const stroke = strokeAt(time / HATCHLING.cycle + 0.3 + (t.phase ?? 0) * 0.1).stroke;
    paintAt(g, x, y + 1, t.dir, (plot) =>
      drawHatchling(shellTones(g.pal.turtle, "hatchling", hatchTones), plot, stroke),
    );
  } else {
    const swim = swimAt(time);
    const pal = shellTones(g.pal.turtle, "honu", honuTones);
    paintAt(g, x, y + 1, t.dir, (plot) => drawHonu(pal, (px, h, colour) => plot(px, h + swim.bob, colour), swim.pose));
  }
}

// A honu hauled out on the sand with its feet on row y - 1: t.mode "crawl" heaves itself along on both
// fore flippers (t.age seconds in; the scene moves its x with crawlX), "bask" lies flat blinking,
// gasping and flicking sand onto its back (t.age seconds into the bask). Its palette is turtle:
// [shell, dark, skin], with sand grains of the scene's soil[2].
export function honuAshoreAt(g, t, y) {
  if (g.trace) return g.trace.draw(honuAshoreAt, g, t, y);
  const crawling = t.mode === "crawl";
  const pose = crawling ? crawlAt(t.age / CRAWL) : baskAt(t.age);
  const pal = shellTones(g.pal.turtle, "honu", honuTones);
  shellAt(g, Math.round(t.x) * t.dir - HONU.mid, y, t.dir, HONU.shadow, (plot) => {
    drawHonu(pal, plot, pose);
    if (!crawling) drawGrains(plot, g.pal.soil[2], t.age);
  });
}

// A ghost crab scuttling sideways, or stopped (alert, crouched or threatening with its claws raised,
// as c.pose says, CRAB_POSES), its legs on row y. Its palette is crab: [shell, dark].
export const crabPoses = CRAB_POSES;
export function crabAt(g, c, y, time = 0) {
  if (g.trace) return g.trace.draw(crabAt, g, c, y, time);
  const f = crabFrame(c, time);
  const pal = shellTones(g.pal.crab, "crab", crabTones);
  shellAt(g, Math.round(f.at), y + 1, c.dir ?? 1, CRAB.shadow, (plot) => drawCrab(pal, plot, f.pose));
}

export const FAMILY = {
  id: "shelled-scaled",
  title: "Shelled and scaled",
  group: "Animals",
  differ: "shell, length",
  drivers: {
    crabAt: { role: "walker", member: () => "crab" },
    tortoiseAt: { role: "walker", member: () => "tortoise" },
    snakeAt: { role: "walker", member: () => "snake" },
    honuAshoreAt: { role: "walker", member: () => "honu" },
    honuAt: { role: "swimmer", member: () => "honu" },
    honuShellAt: { role: "swimmer", member: () => "honu" },
  },
};
