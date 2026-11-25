// The ground birds built from parts: the greater roadrunner (desert), the wild turkey (Smokies), the
// secretary bird (Serengeti), the moa, Hawaii's feral red junglefowl rooster, and the hen, the
// farmyard rooster's mate (the village). A bird is an egg of
// overlapping ovals that tilts and breathes, a neck that curves from the chest to a small head, a tail
// that fans from the rump, a wing rooted on the shoulder that changes shape from folded to open, and two
// thin legs of two bones whose ankle bends backward, lit from above in four tones. drawBird draws one
// facing right with plot(x, h, colour) (h the height over the ground row; h -1 is its soft shadow);
// animals.js's groundBirdAt places it and chooses its pose. A member (RUNNER, TURKEY, SECRETARY,
// MOA, HEN) is a spec, its colours made from the scene's palette (groundTones): runner [brown, buff, blue,
// red, bill, belly, legs], turkey [body, wing, red, blue, dark], secretary [grey, black, face, white],
// moa [body, tail, comb, legs], with the scene's groundShadow beside them.
import { bone, joint, mixPose, plant, rowFill, straighten } from "./build.js";
import { clamp, frac, lerp, mix, rad, smooth } from "./pixel.js";

const lighten = (c, a = 0.16) => mix(c, "#ffffff", a);
const darken = (c, a = 0.16) => mix(c, "#000000", a);
// Four tones lit from above: highlight, base, shade, darkest underneath.
const ramp = (base, under = darken(base, 0.3)) => ({
  H: lighten(base),
  T: base,
  S: darken(base, 0.16),
  U: under,
});

// ---- Parts ------------------------------------------------------------------------------------

// A leg's cells: two tapering bones filled row by row so no row meets the next at a corner only.
// Each cell is [x, h, bone].
function limbCells(R, J, F, w) {
  const cells = new Map();
  const span = rowFill(cells);
  const of = (id) => (h, a, b) => span(h, a, b, id);
  bone(of(0), R, J, w[0], w[1]);
  bone(of(1), J, F, w[1], w[2] ?? w[1]);
  return [...cells.values()];
}

// ---- The bird ---------------------------------------------------------------------------------

// One bird, facing right, drawn with plot(x, h, colour) (h is the height over the ground row).
// Pose fields (all optional): phase and amp (the gait), run (0 walk to 1 run), bob (head bob),
// bodyX (the body's world column, to plant the feet), tilt (degrees, front up), breath, puff,
// neckX and neckH (the head's shift), peck (0 to 1: bill to the ground), preen (0 to 1: head laid
// back on the wing), tailAng (degrees), tailFan (0 to 1), wingAng (degrees) and wingExt (0 folded
// to 1 open), crest, flush, blink, foot ([x, h] for the near foot, off the gait), prey.
export function drawBird(spec, C, plot, pose = {}) {
  const P = { phase: 0, amp: 0, run: 0, bob: 0, ...pose };
  const cells = new Map();
  const put = (x, h, c) => {
    if (!c) return;
    x = Math.floor(x);
    h = Math.floor(h);
    cells.set(`${x}|${h}`, [x, h, c]);
  };
  const post = mixPose(spec.post.stand, spec.post.run, P.run);
  const gait = {
    stance: lerp(spec.stance, spec.runStance ?? spec.stance, P.run),
    stride: lerp(spec.stride, spec.runStride ?? spec.stride, P.run),
    lift: lerp(spec.lift, spec.runLift ?? spec.lift, P.run),
  };
  const peck = P.peck ?? 0;
  const preen = P.preen ?? 0;
  const tiltDeg = post.tilt + (P.tilt ?? 0) + peck * (spec.peckTilt ?? 0);
  const t = rad(tiltDeg);
  const ct = Math.cos(t);
  const st = Math.sin(t);
  const puff = 1 + (P.puff ?? 0) * (spec.puff ?? 0.1);
  const dropAmt = Math.round(P.amp * spec.bob * (0.5 + 0.5 * Math.cos(4 * Math.PI * P.phase)) + (P.drop ?? 0));
  const lift = (P.breath ?? 0) * 0.35;
  const O = [spec.cx + (P.bodyShift ?? 0), spec.cy - dropAmt + lift];
  const local = (u, v) => [O[0] + u * ct - v * st, O[1] + u * st + v * ct];

  // ---- the body mask and its tones
  const mask = new Set();
  for (let x = Math.floor(O[0] - 14); x <= Math.ceil(O[0] + 14); x += 1) {
    for (let h = Math.floor(O[1] - 10); h <= Math.ceil(O[1] + 10); h += 1) {
      const dx = x + 0.5 - O[0];
      const dh = h + 0.5 - O[1];
      const u = dx * ct + dh * st;
      const v = -dx * st + dh * ct;
      for (const [u0, v0, rx, ry] of spec.lobes) {
        if (((u - u0) / (rx * puff)) ** 2 + ((v - v0 * puff) / (ry * puff)) ** 2 <= 1) {
          mask.add(`${x}|${h}`);
          break;
        }
      }
    }
  }
  const ext = new Map();
  for (const k of mask) {
    const [x, h] = k.split("|").map(Number);
    const e = ext.get(x) ?? [h, h];
    ext.set(x, [Math.min(e[0], h), Math.max(e[1], h)]);
  }
  const xs = [...ext.keys()];
  const x0 = Math.min(...xs);
  const bodyCells = [];
  for (const k of mask) {
    const [x, h] = k.split("|").map(Number);
    const [lo, hi] = ext.get(x);
    const height = hi - lo + 1;
    const d = hi - h;
    const e = h - lo;
    const shadeRows = Math.max(1, Math.round(height * 0.28));
    const tone =
      d < (height >= 5 ? 2 : 1) && height >= 3
        ? "H"
        : e < 1 && height >= 2
          ? "U"
          : e < shadeRows + 1 && height >= 4
            ? "S"
            : "T";
    bodyCells.push([x, h, spec.paint?.(tone, { x: x - x0, d, e, height, C, P }) ?? C.body[tone]]);
  }

  // ---- the shadow
  const sh = spec.shadow;
  for (let x = Math.round(O[0] + sh[0] + (P.bodyShift ?? 0) * 0); x < Math.round(O[0] + sh[1]); x += 1)
    put(x, -1, C.shadow);

  // ---- legs
  const root = (far) => {
    const [x, h] = local(
      spec.leg.root[0] + (far ? spec.leg.far[0] : 0),
      spec.leg.root[1] + (far ? spec.leg.far[1] : 0),
    );
    return [x, h];
  };
  const reach = (offset) => {
    const p = frac(P.phase + offset);
    if (p < gait.stance) return [gait.stride / 2 - (gait.stride * p) / gait.stance, 0];
    const s = (p - gait.stance) / (1 - gait.stance);
    return [-gait.stride / 2 + gait.stride * smooth(s), gait.lift * Math.sin(Math.PI * s)];
  };
  const legCells = (far) => {
    const R0 = root(far);
    const off = far ? 0.5 : 0;
    const [rx, rh] = reach(off);
    const baseX = spec.cx + (far ? spec.leg.far[0] : 0) + spec.leg.stand[far ? 1 : 0] + (P.bodyShift ?? 0);
    let F = [plant(baseX + rx * P.amp, P.bodyX ?? null), rh * P.amp];
    let straight = 1 - P.amp;
    if (!far && P.foot) {
      F = [baseX + P.foot[0], P.foot[1]];
      straight = 1 - (P.footOn ?? 1);
    }
    if (far && P.farFoot) {
      F = [baseX + P.farFoot[0], P.farFoot[1]];
      straight = 0;
    }
    const R = [R0[0], R0[1]];
    const J = straighten(R, F, joint(R, F, spec.leg.a, spec.leg.b, -1), straight);
    const cellsOut = limbCells(R, J, F, spec.leg.w);
    // The foot: toes forward along the ground, curled when lifted.
    const fh = Math.round(F[1]);
    const px = Math.round(F[0] - 0.5);
    const planted = fh <= 0;
    const toes = planted ? spec.leg.toes : [1, 0];
    for (let x = px - (planted ? toes[1] : 0); x <= px + toes[0]; x += 1) cellsOut.push([x, Math.max(0, fh), 1]);
    return cellsOut;
  };
  const drawLeg = (far) => {
    for (const [x, h, part] of legCells(far)) {
      const c = part === 0 ? C.leg.upper : C.leg.lower;
      put(x, h, far ? darken(c, 0.24) : c);
    }
  };
  const drawThigh = (far) => {
    if (!spec.thigh) return;
    const R = root(far);
    const [tx, ty, rx, ry] = spec.thigh;
    const cx = R[0] + tx;
    const cy = R[1] + ty;
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x += 1) {
      for (let h = Math.floor(cy - ry); h <= Math.ceil(cy + ry); h += 1) {
        if (((x + 0.5 - cx) / rx) ** 2 + ((h + 0.5 - cy) / ry) ** 2 > 1) continue;
        const low = h + 0.5 < cy - ry * 0.35;
        const c = far ? C.thigh.S : low ? C.thigh.S : h + 0.5 > cy + ry * 0.45 ? C.thigh.H : C.thigh.T;
        put(x, h, far ? darken(c, 0.2) : c);
      }
    }
  };

  // ---- wings
  const wingBlade = (R, angDeg, e, scale, ramps) => {
    const W = spec.wing;
    const L = lerp(W.len[0], W.len[1], e) * scale;
    const wd = lerp(W.wid[0], W.wid[1], e) * scale;
    const th = rad(angDeg);
    const ax = Math.cos(th);
    const ay = Math.sin(th);
    const out = [];
    for (let x = Math.floor(R[0] - L - wd - 1); x <= Math.ceil(R[0] + L + wd + 1); x += 1) {
      for (let h = Math.floor(R[1] - L - wd - 1); h <= Math.ceil(R[1] + L + wd + 1); h += 1) {
        const dx = x + 0.5 - R[0];
        const dh = h + 0.5 - R[1];
        const u = (dx * ax + dh * ay) / L;
        if (u < 0 || u > 1) continue;
        const v = -dx * ay + dh * ax; // left of the axis
        const lens = Math.sin(Math.PI * clamp(u * 0.92 + 0.04, 0, 1)) ** 0.75;
        const open = u < 0.12 ? 0.4 + (u / 0.12) * 0.6 : 1 - 0.5 * ((u - 0.12) / 0.88) ** 2;
        const half = lerp(lens, open, e) * wd * 0.5;
        // On the folded wing the leading edge is the upper side.
        const lead = v * (ax < 0 ? -1 : 1) > 0;
        const edge = lead ? half * 0.8 : half * 1.2;
        if (Math.abs(v) > edge) continue;
        const rel = v / (edge + 0.001);
        const tone = (lead ? rel : -rel) > 0.55 && lead ? "H" : !lead && Math.abs(rel) > 0.55 ? "S" : "T";
        out.push([x, h, (u >= W.flightAt ? ramps.flight : ramps.cover)[tone], u]);
      }
    }
    return out;
  };

  // ---- anchors
  const shoulder = local(...spec.wing.root);
  const N = local(...spec.neck.base);
  const tailRoot = local(...spec.tail.root);

  // far wing: only when the wing is open
  const wingE = clamp(P.wingExt ?? 0, 0, 1);
  const wingA = (spec.wing.fold ?? 190) + tiltDeg * 0.6 + (P.wingAng ?? 0);
  if (wingE > 0.15) {
    const far = wingBlade([shoulder[0] + 1, shoulder[1]], wingA - 14, wingE, 0.92, C.wingFar);
    for (const [x, h, c] of far) put(x, h, c);
  }

  // ---- tail
  const T = spec.tail;
  const fan = P.tailFan ?? 0;
  const axis = lerp(post.tail + (P.tailAng ?? 0), T.fanAxis ?? post.tail, fan);
  const spread = lerp(T.spread, T.fanSpread ?? T.spread, fan);
  const rays = [];
  for (let k = 0; k < T.n; k += 1) {
    const f = T.n > 1 ? k / (T.n - 1) : 0.5;
    const ang = rad(axis + (f - 0.5) * spread);
    const len = T.len * (1 - (T.round ?? 0) * (2 * f - 1) ** 2 * (0.4 + 0.6 * fan)) * lerp(1, T.fanLen ?? 1, fan);
    rays.push({ k, f, ang, len });
  }
  // the far rays first
  rays.sort((a, b) => Math.sin(a.ang) - Math.sin(b.ang));
  for (const r of rays) {
    const steps = Math.ceil(r.len * 3);
    for (let s = 0; s <= steps; s += 1) {
      const d = (s / steps) * r.len;
      const [c] = [T.paint(d / r.len, r.f, fan, C)];
      put(tailRoot[0] + Math.cos(r.ang) * d, tailRoot[1] + Math.sin(r.ang) * d, c);
    }
  }

  // ---- far leg and thigh, then the body
  drawLeg(true);
  drawThigh(true);
  for (const [x, h, c] of bodyCells) put(x, h, c);

  // ---- near leg
  drawLeg(false);
  drawThigh(false);

  // ---- the neck and head
  const bobAmp = spec.headBob ?? 0;
  const u2 = frac(P.phase * 2);
  const bobX = P.bob
    ? Math.round(P.amp * P.bob * bobAmp * (u2 < 0.7 ? lerp(1, -1, u2 / 0.7) : lerp(-1, 1, (u2 - 0.7) / 0.3)))
    : 0;
  const nv = post.neck;
  let H = [N[0] + nv[0] + (P.neckX ?? 0) + bobX, N[1] + nv[1] + (P.neckH ?? 0)];
  let bow = spec.neck.bow;
  if (peck > 0) {
    const target = [N[0] + spec.peck[0], spec.peck[1]];
    H = [lerp(H[0], target[0], smooth(peck)), lerp(H[1], target[1], smooth(peck))];
    bow = lerp(bow, spec.neck.peckBow ?? bow, peck);
  }
  if (preen > 0) {
    const target = [shoulder[0] + spec.preen[0], shoulder[1] + spec.preen[1]];
    H = [lerp(H[0], target[0], smooth(preen)), lerp(H[1], target[1], smooth(preen))];
    bow = lerp(bow, spec.neck.preenBow ?? bow, preen);
  }
  H = [Math.round(H[0]), Math.round(H[1])];
  const headSpec = spec.head({ ...P, peck, preen, crest: P.crest ?? post.crest, post }, C);
  const flip = preen > 0.55;
  // The neck: a curve from N to the head, thick cells stamped along it.
  const nm = new Set();
  const mid = [(N[0] + H[0]) / 2, (N[1] + H[1]) / 2];
  const dxn = H[0] - N[0];
  const dhn = H[1] - N[1];
  const len = Math.hypot(dxn, dhn) || 1;
  const ctrl = [mid[0] + (-dhn / len) * bow, mid[1] + (dxn / len) * bow];
  const w = spec.neck.w;
  for (let s = 0; s <= 1.0001; s += 0.04) {
    const q = [
      (1 - s) ** 2 * N[0] + 2 * (1 - s) * s * ctrl[0] + s * s * H[0],
      (1 - s) ** 2 * N[1] + 2 * (1 - s) * s * ctrl[1] + s * s * H[1],
    ];
    const r = lerp(w[0], w[1], s) / 2;
    for (let x = Math.floor(q[0] - r); x <= Math.ceil(q[0] + r); x += 1) {
      for (let h = Math.floor(q[1] - r); h <= Math.ceil(q[1] + r); h += 1) {
        if (Math.hypot(x + 0.5 - q[0], h + 0.5 - q[1]) <= r + 0.15) nm.add(`${x}|${h}|${s.toFixed(2)}`);
      }
    }
  }
  const nset = new Map();
  for (const k of nm) {
    const [x, h, s] = k.split("|");
    const key = `${x}|${h}`;
    if (!nset.has(key) || +s < nset.get(key)) nset.set(key, +s);
  }
  for (const [key, s] of nset) {
    const [x, h] = key.split("|").map(Number);
    const up = nset.has(`${x}|${h + 1}`);
    const down = nset.has(`${x}|${h - 1}`);
    const back = nset.has(`${x - 1}|${h}`);
    const tone = !up ? "H" : !down ? "U" : !back ? "S" : "T";
    put(x, h, spec.neck.paint(s, tone, C, x, h));
  }
  // the head from its grid, anchored on `at`
  const grid = headSpec.grid;
  const [ax, ay] = headSpec.at;
  const lid = P.blink ? (headSpec.lid ?? "B") : null;
  grid.forEach((line, r) => {
    for (let c = 0; c < line.length; c += 1) {
      let ch = line[c];
      if (ch === "." || ch === " ") continue;
      if (ch === "e" && lid) ch = lid;
      const colour = headSpec.keys[ch];
      if (!colour) continue;
      const gx = flip ? ax - c : c - ax;
      put(H[0] + gx, H[1] - (r - ay), colour);
    }
  });

  // ---- near wing, over the body
  {
    const R = [shoulder[0], shoulder[1]];
    const blade = wingBlade(R, wingA, wingE, 1, C.wing);
    // the folded wing sits inside the body's reach; a rim of the body shows
    for (const [x, h, c] of blade) put(x, h, c);
  }

  // ---- prey on the ground (the secretary's hunt)
  if (P.prey) for (const [x, h, c] of P.prey) put(x, h, c);

  for (const [x, h, c] of cells.values()) if (h >= -1) plot(x, h, c);
}

// ---- The members ------------------------------------------------------------------------------

// The roadrunner: slender and level, a neck that slants up to a small head, a shaggy crest, a long
// bill, and a tail as long as the body that stands cocked at rest and streams level at a run.
const RUNNER = {
  id: "runner",
  cx: 9,
  cy: 6.2,
  lobes: [
    [0.4, 0, 3.9, 2],
    [-2, 0.2, 2.7, 1.8],
  ],
  post: {
    stand: { tilt: 18, neck: [1.4, 2.6], tail: 125, crest: 1 },
    run: { tilt: -3, neck: [3.4, 1.4], tail: 184, crest: 0.45 },
  },
  puff: 0.06,
  bob: 1,
  headBob: 0,
  stance: 0.62,
  runStance: 0.44,
  stride: 3.6,
  runStride: 7.5,
  lift: 1.5,
  runLift: 2.6,
  leg: { root: [-0.2, -1.2], far: [1.4, 0], a: 2.7, b: 2.7, w: [1, 1], toes: [2, 1], stand: [0.8, -0.2] },
  thigh: [0, -0.1, 1.7, 1.2],
  shadow: [-5, 6],
  neck: { base: [2.8, 0.7], bow: -0.7, w: [3, 2], peckBow: 0, preenBow: 1 },
  wing: { root: [1.5, 0.6], len: [5.2, 6.4], wid: [2.3, 3.6], flightAt: 0.55, fold: 190 },
  tail: { root: [-3.9, 0.2], len: 6.2, n: 5, spread: 16, round: 0 },
  peck: [3, 1],
  preen: [-2.5, 1.5],
  paint(tone, { x, d, C }) {
    if (tone === "T" && (x + d) % 3 === 0 && d > 0) return C.streak;
    return null;
  },
  colours([brown, buff, blue, red, bill, belly, legs]) {
    const body = {
      H: lighten(brown, 0.18),
      T: brown,
      S: mix(brown, belly, 0.3),
      U: mix(belly, brown, 0.35),
    };
    return {
      body,
      shadow: "shadow",
      leg: { upper: belly, lower: legs },
      thigh: { H: lighten(belly, 0), T: mix(belly, brown, 0.35), S: mix(belly, brown, 0.55) },
      wing: { cover: ramp(brown), flight: ramp(darken(brown, 0.28)) },
      wingFar: { cover: ramp(darken(brown, 0.2)), flight: ramp(darken(brown, 0.42)) },
      buff,
      streak: buff,
      blue,
      red,
      bill,
      brown,
    };
  },
  neckPaint: null,
  head(P, C) {
    const up = P.crest > 0.66 ? 2 : P.crest > 0.3 ? 1 : 0;
    const grids = [
      ["........", "CCCBB...", ".CbBeKKK", "..rBBKK.", "...BB..."],
      ["..C.....", "CCCBB...", ".CbBeKKK", "..rBBKK.", "...BB..."],
      ["C.C.....", ".CCBB...", ".CbBeKKK", "..rBBKK.", "...BB..."],
    ];
    return {
      grid: grids[up],
      at: [3, 3],
      lid: "B",
      keys: { C: C.brown, B: C.brown, b: C.blue, r: C.red, e: "#14100c", K: C.bill },
    };
  },
};
RUNNER.neck.paint = (s, tone, C, x, h) => {
  const c = (x + h) % 2 === 0 && tone === "T" ? C.buff : C.body[tone];
  return s > 0.55 ? c : tone === "S" || tone === "U" ? C.body[tone] : c;
};
RUNNER.tail.paint = (s, f, _fan, C) => {
  if (s > 0.93) return C.buff;
  return f > 0.7 ? C.wing.cover.H : f < 0.3 ? C.wing.cover.S : C.wing.cover.T;
};

// The turkey: big, round, on long legs, a small head on a long neck, a fanned tail behind the
// back when it struts.
const TURKEY = {
  id: "turkey",
  cx: 8,
  cy: 7.6,
  lobes: [
    [0, 0, 4.8, 3],
    [2.6, -0.1, 2.8, 2.6],
    [-2.4, 0.4, 2.7, 2.3],
  ],
  post: {
    stand: { tilt: 12, neck: [1.6, 3.4], tail: 168, crest: 0 },
    run: { tilt: 12, neck: [1.6, 3.4], tail: 168, crest: 0 },
  },
  puff: 0.16,
  bob: 1,
  headBob: 1,
  stance: 0.6,
  stride: 4,
  lift: 1.6,
  leg: { root: [-0.4, -1.8], far: [1.6, 0], a: 2.5, b: 2.5, w: [2, 1], toes: [2, 1], stand: [0.4, 0] },
  thigh: [0, -0.3, 2.3, 2.1],
  shadow: [-5, 6],
  neck: { base: [3.8, 1.2], bow: 0.9, w: [3, 2], peckBow: -0.4, preenBow: -1.6 },
  wing: { root: [1.6, 0.9], len: [5.6, 7], wid: [3.2, 4.4], flightAt: 0.5, fold: 188 },
  tail: { root: [-3.4, 0.2], len: 3.4, n: 26, spread: 14, fanAxis: 100, fanSpread: 150, fanLen: 2.5, round: 0.22 },
  peck: [3, 1],
  preen: [-1, 4.8],
  paint(tone, { x, d, C }) {
    return (x + d * 2) % 4 === 0 && tone !== "U" && d > 1 ? C.bar : null;
  },
  colours([body, wing, red, blue, dark]) {
    return {
      body: ramp(wing, mix(dark, wing, 0.25)),
      shadow: "shadow",
      leg: { upper: mix(red, wing, 0.5), lower: mix(red, "#d8a898", 0.35) },
      thigh: ramp(wing),
      wing: { cover: ramp(body), flight: ramp(mix(body, dark, 0.35)) },
      wingFar: { cover: ramp(darken(body, 0.2)), flight: ramp(darken(body, 0.4)) },
      tailTone: ramp(mix(body, "#c8742c", 0.55)),
      bar: mix(body, dark, 0.55),
      tip: mix(wing, "#e8d8b0", 0.6),
      band: dark,
      red,
      blue,
      dark,
      body0: body,
      wing0: wing,
    };
  },
  head(P, C) {
    const snood = P.flush > 0.5 ? 1 : 0;
    const grids = [
      [".bbb.", "bbebK", ".bbK.", "..rr."],
      [".bbbr", "bbebK", ".bbK.", "..rr."],
    ];
    const flush = P.flush ?? 0;
    return {
      grid: grids[snood],
      at: [1, 2],
      lid: "b",
      keys: {
        b: mix(C.blue, "#eef3fb", flush * 0.3),
        r: mix(C.red, "#ff3a2e", flush * 0.5),
        e: "#14100c",
        K: C.dark,
      },
    };
  },
};
TURKEY.neck.paint = (s, tone, C) => {
  if (s < 0.42) return C.body[tone];
  return tone === "S" || tone === "U" ? darken(C.blue, 0.2) : C.blue;
};
TURKEY.tail.paint = (s, f, fan, C) => {
  const t = C.tip;
  if (fan < 0.2) return s > 0.9 ? t : f > 0.5 ? C.tailTone.H : C.tailTone.T;
  if (s > 0.9) return t;
  if (s > 0.76) return C.band;
  return f > 0.8 ? C.tailTone.H : f > 0.35 ? C.tailTone.T : C.tailTone.S;
};

// The secretary bird: tall on long legs, a grey body with black "trousers", black flight feathers
// and a pair of long central tail feathers, an orange face and a crest of quills.
const SECRETARY = {
  id: "secretary",
  cx: 9,
  cy: 13.2,
  lobes: [
    [0.2, 0, 4, 2.1],
    [-2.2, 0.4, 2.5, 1.7],
  ],
  post: {
    stand: { tilt: 3, neck: [1.4, 3.2], tail: 196, crest: 0.5 },
    run: { tilt: 3, neck: [1.4, 3.2], tail: 196, crest: 0.5 },
  },
  puff: 0.06,
  bob: 1,
  headBob: 1,
  stance: 0.62,
  stride: 6.4,
  lift: 3.4,
  peckTilt: -24,
  leg: { root: [-0.4, -1.6], far: [1.8, 0], a: 4.2, b: 7.2, w: [2, 1, 1], toes: [3, 1], stand: [0.6, 0] },
  thigh: [0, -2.2, 2.1, 3.2],
  shadow: [-6, 8],
  neck: { base: [3, 0.7], bow: 0.4, w: [3, 3], peckBow: -0.3, preenBow: -1.6 },
  wing: { root: [1.5, 0.8], len: [5, 8.4], wid: [2.8, 4.6], flightAt: 0.52, fold: 188 },
  tail: { root: [-4.1, 0.4], len: 8.4, n: 3, spread: 7, round: 1.15 },
  peck: [4.5, 1],
  preen: [-1, 4.6],
  colours([grey, black, face, white]) {
    return {
      body: ramp(grey, mix(grey, black, 0.35)),
      shadow: "shadow",
      leg: { upper: black, lower: mix(grey, "#f0c0b0", 0.55) },
      thigh: { H: mix(black, grey, 0.25), T: black, S: darken(black, 0.3) },
      wing: { cover: ramp(grey), flight: ramp(black, "#08090b") },
      wingFar: { cover: ramp(darken(grey, 0.22)), flight: ramp(darken(black, 0.1)) },
      face,
      black,
      white,
      grey,
    };
  },
  head(P, C) {
    const up = P.crest > 0.75 ? 0 : P.crest > 0.3 ? 1 : 2;
    const grids = [
      ["K.K.K...", ".KKK....", "KKKgg...", "KK.OeWK.", "..gOOWK.", "...ggKK."],
      ["K.......", "KKK.....", "KKKgg...", "KK.OeWK.", "..gOOWK.", "...ggKK."],
      ["........", "KKKK....", "KKKgg...", "KK.OeWK.", "..gOOWK.", "...ggKK."],
    ];
    return {
      grid: grids[up],
      at: [3, 4],
      lid: "g",
      keys: { K: C.black, g: C.grey, O: C.face, W: C.white, e: "#14100c" },
    };
  },
  neckPaint: null,
};
SECRETARY.neck.paint = (_s, tone, C) => C.body[tone];
SECRETARY.tail.paint = (s, f, _fan, C) =>
  Math.abs(f - 0.5) < 0.1 ? (s > 0.86 ? C.white : C.black) : s > 0.4 ? C.black : C.body.T;

// The moa, a feral rooster: chestnut with a golden hackle, a red comb and wattle, a dark green
// sickle tail arching up and back, yellow legs.
const MOA = {
  id: "moa",
  cx: 6,
  cy: 4.9,
  lobes: [
    [0, 0, 3.1, 1.9],
    [1.4, 0.3, 1.8, 1.7],
  ],
  post: {
    stand: { tilt: 22, neck: [1.4, 1.8], tail: 128, crest: 1 },
    run: { tilt: 22, neck: [1.4, 1.8], tail: 128, crest: 1 },
  },
  puff: 0.12,
  bob: 0,
  headBob: 1,
  stance: 0.56,
  stride: 3.6,
  lift: 1.2,
  leg: { root: [0.2, -1], far: [1, 0], a: 1.7, b: 1.7, w: [1, 1], toes: [2, 1], stand: [0.4, 0] },
  thigh: [0, -0.2, 1.4, 1.1],
  shadow: [-4, 5],
  neck: { base: [2.3, 0.7], bow: 0.7, w: [3, 2], peckBow: -0.3, preenBow: 1 },
  wing: { root: [0.8, 0.6], len: [3.6, 6.4], wid: [2, 4], flightAt: 0.6, fold: 188 },
  tail: { root: [-2.8, 0.9], len: 4.4, n: 4, spread: 30, round: 0.15, fanAxis: 125, fanSpread: 40, fanLen: 1 },
  peck: [2, 1],
  preen: [-1.5, 1.2],
  colours([body, tail, comb, legs]) {
    return {
      body: ramp(body, darken(body, 0.45)),
      shadow: "shadow",
      leg: { upper: legs, lower: legs },
      thigh: ramp(darken(body, 0.1)),
      wing: { cover: ramp(darken(body, 0.18)), flight: ramp(tail) },
      wingFar: { cover: ramp(darken(body, 0.34)), flight: ramp(darken(tail, 0.2)) },
      hackle: mix(body, "#f0c060", 0.45),
      tail,
      comb,
      legs,
    };
  },
  head(P, C) {
    const down = P.peck > 0.5;
    const grids = [
      ["..cc.", ".cfeY", "..fYY", "..wf."],
      ["..cc.", ".cfe.", "..fY.", "..wY."],
      ["..cc..", ".cfeYY", "..f...", "..wfY."],
    ];
    return {
      grid: P.crow > 0.5 ? grids[2] : down ? grids[1] : grids[0],
      at: [1, 2],
      lid: "f",
      keys: { c: C.comb, f: mix(C.comb, "#ffffff", 0.05), w: C.comb, e: "#14100c", Y: C.legs },
    };
  },
};
MOA.neck.paint = (s, tone, C) =>
  s > 0.3 ? (tone === "S" || tone === "U" ? darken(C.hackle, 0.2) : C.hackle) : C.body[tone];
MOA.tail.paint = (_s, f, _fan, C) => (f > 0.6 ? C.wing.flight.H : f > 0.25 ? C.tail : C.wing.flight.S);

// The hen: the rooster's build without his finery. A low single comb, no golden hackle, and a short
// tail of a few feathers held up; a little smaller. Her palette is [body, tail, comb, legs] like his.
const HEN = {
  ...MOA,
  id: "hen",
  lobes: [
    [0, 0, 2.9, 1.8],
    [1.3, 0.3, 1.7, 1.6],
  ],
  neck: { ...MOA.neck, paint: (_s, tone, C) => C.body[tone] },
  tail: { ...MOA.tail, len: 2.4, n: 3, spread: 18, fanLen: 0.8 },
  head(P, C) {
    const down = P.peck > 0.5;
    const grids = [
      ["..c..", ".cfeY", "..fYY", "..w.."],
      ["..c..", ".cfe.", "..fY.", "..wY."],
    ];
    return {
      grid: down ? grids[1] : grids[0],
      at: [1, 2],
      lid: "f",
      keys: { c: C.comb, f: mix(C.body.T, C.comb, 0.25), w: C.comb, e: "#14100c", Y: C.legs },
    };
  },
};

export const MEMBERS = {
  runner: RUNNER,
  turkey: TURKEY,
  secretary: SECRETARY,
  moa: MOA,
  hen: HEN,
};

// A spec's colours from a scene's palette array, made once per array.
const tonesOf = new WeakMap();
export function groundTones(spec, colours) {
  let C = tonesOf.get(colours);
  if (!C) {
    C = spec.colours(colours);
    tonesOf.set(colours, C);
  }
  return C;
}

// ---- The walk ---------------------------------------------------------------------------------

// Each member's stride time in seconds. The walking speed follows: stride / stance / cycle.
export const CYCLE = { runner: 0.62, turkey: 1.0, secretary: 1.5, moa: 0.62, hen: 0.62 };
export const speedOf = (kind) => {
  const s = MEMBERS[kind];
  const run = kind === "runner" ? 1 : 0;
  return lerp(s.stride, s.runStride ?? s.stride, run) / lerp(s.stance, s.runStance ?? s.stance, run) / CYCLE[kind];
};

// ---- At rest ----------------------------------------------------------------------------------

// A stopped bird plays one of its poses for part of the stop and stands, breathing and looking about,
// for the rest. Each pose is keyframes [seconds, fields]: every numeric field eases between its
// neighbours, and a field a key leaves out is 0 there, so a pose eases in from standing and out
// again. `extra` adds what the keys cannot: the roadrunner's tail pump, the secretary's prey, the moa's
// scratch and flap.
function sample(keys, t) {
  let i = 0;
  while (i < keys.length - 2 && t >= keys[i + 1][0]) i += 1;
  const [t0, A] = keys[i];
  const [t1, B] = keys[i + 1];
  const u = smooth(Math.min(1, Math.max(0, (t - t0) / (t1 - t0))));
  const out = {};
  for (const k of new Set([...Object.keys(A), ...Object.keys(B)])) out[k] = lerp(A[k] ?? 0, B[k] ?? 0, u);
  return out;
}
const bump = (t, a, b, e = 0.15) =>
  t <= a || t >= b ? 0 : smooth(Math.min(1, (t - a) / e)) * smooth(Math.min(1, (b - t) / e));

const SETTLE = 0.3; // seconds after a stop before its pose starts
const DISPLAY = { fan: 1, puff: 1, flush: 1, neckX: -1.5, neckH: -1.2, wingAng: 32, tilt: -4 };
const STAMP = { footOn: 1, wingExt: 0.5, wingAng: 25 };

const POSES = {
  runner: {
    pump: {
      seconds: 2.6,
      keys: [
        [0, {}],
        [2.6, {}],
      ],
      extra(P, t) {
        P.tailAng = (P.tailAng ?? 0) - bump(t, 0.4, 2.0, 0.1) * Math.sin(((t - 0.4) / 1.6) * Math.PI * 6) * 16;
      },
    },
    preen: {
      seconds: 3.6,
      keys: [
        [0, {}],
        [0.7, { preen: 1, crest0: 1 }],
        [2.9, { preen: 1, crest0: 1 }],
        [3.6, {}],
      ],
    },
    stretch: {
      seconds: 3.0,
      keys: [
        [0, {}],
        [0.6, { wingExt: 1, wingAng: 38, tilt: -8, tailAng: -22 }],
        [2.4, { wingExt: 1, wingAng: 38, tilt: -8, tailAng: -22 }],
        [3.0, {}],
      ],
    },
  },
  turkey: {
    preen: {
      seconds: 3.4,
      keys: [
        [0, {}],
        [0.7, { preen: 1 }],
        [2.7, { preen: 1 }],
        [3.4, {}],
      ],
    },
    display: {
      seconds: 6.2,
      keys: [
        [0, {}],
        [1.0, DISPLAY],
        [1.3, DISPLAY],
        [4.9, DISPLAY],
        [6.2, {}],
      ],
      extra(P) {
        P.tailFan = P.fan;
      },
    },
  },
  secretary: {
    stamp: {
      seconds: 6.0,
      keys: [
        [0, {}],
        [0.6, { neckX: 1, neckH: -1 }],
        [1.4, { ...STAMP, neckX: 1, neckH: -1, footX: 5, footH: 4.5, tilt: -2 }],
        [1.7, { ...STAMP, neckX: 1.5, footX: 7, footH: 0, tilt: -6 }],
        [2.0, { ...STAMP, footX: 5, footH: 3.5, tilt: -2 }],
        [2.3, { ...STAMP, neckX: 1.5, footX: 7, footH: 0, tilt: -6 }],
        [2.6, { ...STAMP, footX: 5, footH: 3.5, tilt: -2 }],
        [2.9, { ...STAMP, neckX: 1.5, footX: 7, footH: 0, tilt: -6 }],
        [3.5, {}],
        [4.1, { peck: 1, drop: 4, tilt: -6 }],
        [4.7, { peck: 1, drop: 4, tilt: -6 }],
        [5.3, { neckH: 1.5, neckX: 0 }],
        [6.0, {}],
      ],
      extra(P, t, k) {
        P.crest = 0.4 + 0.6 * bump(t, 0.2, 1.0, 0.3) + 0.6 * bump(t, 0.6, 3.5, 0.4);
        P.foot = k.footOn > 0.01 ? [k.footX, k.footH] : undefined;
        // The prey, ahead on the ground: stamped flat, then eaten.
        if (t > 0 && t < 5.0) {
          const px = 17;
          const c = t > 2.8 ? "#6a5a44" : "#8a7458";
          P.prey = [
            [px, 0, c],
            [px + 1, 0, c],
            [px + 2, 0, c],
          ];
          if (t < 1.6) P.prey.push([px + 1, 1, c], [px + 2, 1, "#4a3c2c"], [px - 1, 0, "#a89070"]);
          if (t > 4.3) P.prey = [[px + 1, 0, c]];
        }
      },
    },
    preen: {
      seconds: 3.4,
      keys: [
        [0, {}],
        [0.7, { preen: 1 }],
        [2.7, { preen: 1 }],
        [3.4, {}],
      ],
    },
    stretch: {
      seconds: 3.0,
      keys: [
        [0, {}],
        [0.6, { wingExt: 1, wingAng: 35, tilt: -5 }],
        [2.4, { wingExt: 1, wingAng: 35, tilt: -5 }],
        [3.0, {}],
      ],
    },
  },
  moa: {
    peck: {
      seconds: 2.0,
      keys: [
        [0, {}],
        [0.2, { peck: 1 }],
        [0.4, {}],
        [0.6, { peck: 1 }],
        [0.8, {}],
        [1.0, { peck: 1 }],
        [1.2, {}],
        [2.0, {}],
      ],
    },
    scratch: {
      seconds: 4.8,
      keys: [
        [0, {}],
        [0.6, { scratch: 1, peck: 0.7, tilt: -4 }],
        [2.7, { scratch: 1, peck: 0.7, tilt: -4 }],
        [3.2, {}],
        [3.5, { peck: 1 }],
        [3.7, {}],
        [3.9, { peck: 1 }],
        [4.2, {}],
        [4.8, {}],
      ],
      extra(P, t, k) {
        if (!(k.scratch > 0.01)) return;
        const sc = frac(t * 1.7);
        const drag = sc < 0.6;
        const x = drag ? 2 - (4 * sc) / 0.6 : -2 + 4 * smooth((sc - 0.6) / 0.4);
        const h = drag ? 0 : 2 * Math.sin((Math.PI * (sc - 0.6)) / 0.4);
        P.foot = [x * k.scratch, h * k.scratch];
        P.footOn = k.scratch;
        P.tilt = (P.tilt ?? 0) + (drag ? 0 : 3) * k.scratch;
      },
    },
    preen: {
      seconds: 3.1,
      keys: [
        [0, {}],
        [0.6, { preen: 1 }],
        [2.5, { preen: 1 }],
        [3.1, {}],
      ],
    },
    flap: {
      seconds: 2.4,
      keys: [
        [0, {}],
        [0.6, { flap: 1, neckH: 0.4, tilt: 5 }],
        [1.8, { flap: 1, neckH: 0.4, tilt: 5 }],
        [2.4, {}],
      ],
      extra(P, t, k) {
        if (!(k.flap > 0.01)) return;
        P.wingExt = k.flap;
        P.wingAng = -70 + 90 * (0.5 + 0.5 * Math.sin(t * 15)) * k.flap;
      },
    },
    // The crow, which a scene times (never picked for a stop): a quick flap of the wings, then the
    // neck stretched up and back with the beak open for the long call, and down again.
    crow: {
      seconds: 3.0,
      timed: true,
      keys: [
        [0, {}],
        [0.3, { flap: 1, tilt: 4 }],
        [0.8, { flap: 1, tilt: 4 }],
        [1.1, { neckH: 1.6, neckX: -0.6, tilt: -10, crow: 1 }],
        [2.4, { neckH: 1.6, neckX: -0.6, tilt: -10, crow: 1 }],
        [3.0, {}],
      ],
      extra(P, t, k) {
        if (!(k.flap > 0.01)) return;
        P.wingExt = k.flap;
        P.wingAng = -70 + 90 * (0.5 + 0.5 * Math.sin(t * 15)) * k.flap;
      },
    },
  },
};
// The hen pecks, scratches, preens and flaps as the rooster does, but never crows.
POSES.hen = Object.fromEntries(Object.entries(POSES.moa).filter(([name]) => name !== "crow"));

// Seconds a crow lasts, for the scene that times it.
export const CROW_SECONDS = POSES.moa.crow.seconds + SETTLE;

// The turkey's strut: from `from` to `to` seconds into its display it walks on at `speed` px/s with its
// fan up, a step every 2 s.
export const STRUT = { turkey: { pose: "display", from: 1.6, to: 5.2, speed: 3.3 } };

// The poses a stop of `timer` seconds has room for, a pose twice as likely as plain standing (the moa
// always does something).
export function restPoses(kind, timer) {
  const fit = Object.entries(POSES[kind])
    .filter(([, p]) => !p.timed && p.seconds + SETTLE + 0.3 <= timer)
    .map(([name]) => name);
  const list = fit.flatMap((n) => [n, n]);
  return (kind === "moa" || kind === "hen") && fit.length ? list : ["stand", ...list];
}

// A bird standing about: it breathes, blinks and now and then looks up and back.
function idle(kind, time, seed) {
  const u = (time + seed * 2.7) % 9;
  const look = bump(u, 5, 5.9, 0.3);
  const look2 = bump(u, 7.2, 8, 0.3);
  const P = { breath: 0.5 + 0.5 * Math.sin(time * 2.3 + seed), neckH: look, neckX: look * 0.6 - look2 * 0.9 };
  P.blink = (time / 3.3 + seed * 0.37) % 1 < 0.035 ? 1 : 0;
  if (kind === "runner") P.tailAng = Math.sin(time * 1.3 + seed) * 3;
  return P;
}

// The fields of a stopped bird's pose `name`, `since` seconds into its stop, at clock `time`.
export function restPose(kind, name, since, time, seed = 0) {
  const script = POSES[kind][name];
  const t = since - SETTLE;
  const P = idle(kind, time, seed);
  if (!script) return P;
  if (t < 0 || t > script.seconds) return { ...P, neckH: 0, neckX: 0 };
  const k = sample(script.keys, t);
  Object.assign(P, k, { neckH: k.neckH ?? 0, neckX: k.neckX ?? 0 });
  script.extra?.(P, t, k);
  if (k.crest0 > 0.5) P.crest = 0;
  P.blink = (time / 3.3 + seed * 0.37) % 1 < 0.035 ? 1 : 0;
  return P;
}
