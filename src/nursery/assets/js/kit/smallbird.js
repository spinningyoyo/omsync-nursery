// The small flyers on one build: kingfishers, Steller's jay, great hornbill, lilac-breasted roller,
// white-tailed tropicbird, ʻiʻiwi, Atlantic puffin, mountain bluebird, cardinal and chimney swift. A bird
// is a set of cells (swimmer.js's Cells; u along the body, v up) filled from capsules, so a wing that
// bends, a neck that turns or a tail that tilts stays one joined shape. Parts, back to front: far wing,
// tail, far leg, body, neck, head, bill, crest, near leg, near wing. Four tones lit from above (back lit,
// belly shaded), the far wing in its own darker tone, and a soft ground shadow for birds standing.
// `birdCells` builds one (its `upright` tilts the body up to 60 degrees, so one build serves flying and
// perched), `flyingBird` flies it, `perchedSmall` perches it and `puffinStand` is the puffins' standing
// template. animals.js's small-flyer drivers place and pose them. Palettes, from the scene: cardinal,
// swift, bluebird, jay and iiwi are { C, H, E, K, T, b, B, l, t, p, d } (crown, head, eye, bill, tail
// tip, tail, back, breast, wing leading edge, patch, trailing edge); kingfisher [blue, orange, bill,
// white], hornbill [black, white, yellow, casque], roller [lilac, teal, blue, dark] with rollerDepth
// [pale, deep, crown], tropicbird [white, black, bill, shade] and puffin [black, white, beak, tip, foot].

import { ease, pulse } from "./build.js";
import { clamp, frac, lerp, mix, shadowColour, smooth } from "./pixel.js";
import { Cells, capsule as capsule0, tidy as tidy0 } from "./swimmer.js";

// The kit's capsule and tidy drop cells below v = 0; a bird centred on its body needs them all.
const capsule = (c, a, b, ra, rb, tone) => capsule0(c, a, b, ra, rb, tone, -99);
const tidy = (c) => tidy0(c, null, -99);

const RAD = Math.PI / 180;

// ---- Tones ----------------------------------------------------------------------------------------

const RAMPS = new Map();
const ramp = (c) => {
  if (!RAMPS.has(c)) RAMPS.set(c, [mix(c, "#ffffff", 0.2), c, mix(c, "#000000", 0.24), mix(c, "#000000", 0.44)]);
  return RAMPS.get(c);
};
const pick = (r, lit) => (lit > 0.5 ? r[0] : lit > -0.15 ? r[1] : lit > -0.65 ? r[2] : r[3]);
const dark = (c, a = 0.32) => mix(c, "#000000", a);

// ---- Species ---------------------------------------------------------------------------------------
//
// Every number is in cells, facing right, body centre at (0, 0), and multiplied by `s`. body: the
// spindle a-b with radius r; head: its centre and radius; bill: length, radius, droop (the curve,
// down); tail: length, width, drop; wing: root on the shoulder, arm and hand lengths, width, sweep
// (how far back it lies when level), fingers (spread primaries). fly: wingbeat Hz and amplitude, and
// `bound` (period s, flaps per burst) for the ones that bound. stand: leg length below the body, and
// how upright it sits (x60 degrees of nose-up tilt). col(p) maps the scene's palette to the base colours of the tones.

const passerine = (p) => ({
  back: p.B,
  belly: p.l,
  head: p.H,
  cap: p.C,
  throat: p.H,
  bill: p.K,
  eye: p.E,
  tail: p.b,
  tailTip: p.T,
  wingTop: p.t,
  wingPatch: p.p,
  wingEdge: p.d,
  wingTrail: p.d,
  wingUnder: mix(p.l, p.t, 0.45),
  leg: mix(p.K, "#8a7a6a", 0.5),
});

const BASE = {
  s: 1,
  body: { a: [-1.6, -0.1], b: [1.6, 0.2], r: 1.8 },
  head: { at: [3.1, 1.0], r: 1.25 },
  bill: { len: 1.5, r: 0.55, droop: 0 },
  tail: { len: 3.4, w: 1.1, drop: -0.5 },
  wing: { root: [0.5, 1.0], arm: 3.2, hand: 3.2, w: 1.5, sweep: 0.55, fingers: 0 },
  fly: { hz: 4, amp: 58, mid: 14 },
  stand: { legs: 1.2, upright: 0.8 },
};

export const SPECIES = {
  cardinal: {
    ...BASE,
    label: "Cardinal",
    own: true,
    tail: { len: 4.2, w: 1.2, drop: -0.7 },
    bill: { len: 1.4, r: 0.8, droop: 0 },
    crest: { len: 2.2, w: 0.65 },
    mask: true,
    fly: { hz: 3, amp: 56, mid: 12, bound: { period: 1.5, burst: 3 } },
    col: (p) => ({ ...passerine(p), mask: "#1a0e0a", crest: p.C }),
  },
  jay: {
    ...BASE,
    label: "Steller's jay",
    own: true,
    body: { a: [-1.6, -0.1], b: [1.6, 0.2], r: 1.95 },
    head: { at: [3.1, 1.1], r: 1.35 },
    tail: { len: 4.2, w: 1.2, drop: -0.6 },
    bill: { len: 1.8, r: 0.55, droop: 0 },
    crest: { len: 3.0, w: 0.8 },
    wing: { root: [0.5, 1.0], arm: 3.0, hand: 3.0, w: 1.7, sweep: 0.5, fingers: 0 },
    fly: { hz: 3, amp: 60, mid: 12, bound: { period: 1.5, burst: 3 } },
    col: (p) => ({ ...passerine(p), crest: p.C, bars: true }),
  },
  bluebird: {
    ...BASE,
    label: "Mountain bluebird",
    own: true,
    body: { a: [-1.6, -0.1], b: [1.6, 0.2], r: 1.75 },
    bill: { len: 1.1, r: 0.5, droop: 0 },
    wing: { root: [0.5, 1.0], arm: 3.4, hand: 3.6, w: 1.45, sweep: 0.6, fingers: 0 },
    fly: { hz: 3, amp: 60, mid: 14, bound: { period: 1.5, burst: 3 } },
    col: (p) => ({ ...passerine(p), throat: p.l }),
  },
  iiwi: {
    ...BASE,
    label: "ʻIʻiwi",
    own: true,
    body: { a: [-1.5, -0.1], b: [1.5, 0.2], r: 1.7 },
    head: { at: [2.9, 1.0], r: 1.2 },
    bill: { len: 3.4, r: 0.5, droop: 1.8 },
    tail: { len: 2.6, w: 1.1, drop: -0.4 },
    wing: { root: [0.4, 0.9], arm: 3.0, hand: 3.2, w: 1.45, sweep: 0.55, fingers: 0 },
    fly: { hz: 3, amp: 58, mid: 14, bound: { period: 1.5, burst: 3 } },
    col: (p) => ({ ...passerine(p), wingUnder: mix(p.l, p.t, 0.6) }),
  },
  swift: {
    ...BASE,
    label: "Chimney swift",
    own: true,
    body: { a: [-2.0, -0.1], b: [2.0, 0.1], r: 1.45 },
    head: { at: [3.3, 0.45], r: 1.05 },
    bill: { len: 0.6, r: 0.45, droop: 0 },
    tail: { len: 1.8, w: 0.9, drop: -0.1 },
    wing: { root: [0.9, 0.7], arm: 4.4, hand: 4.8, w: 1.3, sweep: 0.92, fingers: 0 },
    fly: { hz: 4, amp: 40, mid: 6, bound: { period: 1.5, burst: 5 } },
    stand: { legs: 0.6, upright: 1.2 },
    col: (p) => passerine(p),
  },
  roller: {
    ...BASE,
    label: "Lilac-breasted roller",
    body: { a: [-1.7, -0.1], b: [1.6, 0.2], r: 1.9 },
    head: { at: [3.2, 1.0], r: 1.3 },
    bill: { len: 1.9, r: 0.55, droop: 0.4 },
    tail: { len: 3.2, w: 1.2, drop: -0.5 },
    wing: { root: [0.5, 1.0], arm: 3.4, hand: 3.6, w: 1.7, sweep: 0.5, fingers: 2 },
    fly: { hz: 3.2, amp: 60, mid: 12 },
    col: (p) => {
      const [lilac, teal, blue, darkc] = p.roller;
      const [pale, deep, crown] = p.rollerDepth;
      return {
        back: mix(crown, "#a5693a", 0.6),
        belly: teal,
        throat: lilac,
        breast: lilac,
        rump: blue,
        head: crown,
        cap: crown,
        bill: darkc,
        eye: darkc,
        tail: blue,
        tailTip: deep,
        wingTop: teal,
        wingPatch: pale,
        wingEdge: deep,
        wingTrail: deep,
        wingUnder: mix(pale, teal, 0.5),
        leg: darkc,
      };
    },
  },
  kingfisher: {
    ...BASE,
    label: "Kingfisher",
    body: { a: [-1.4, -0.1], b: [1.5, 0.2], r: 1.7 },
    head: { at: [3.0, 1.1], r: 1.6 },
    bill: { len: 3.4, r: 0.62, droop: 0 },
    tail: { len: 1.8, w: 1.0, drop: -0.3 },
    wing: { root: [0.4, 1.0], arm: 2.6, hand: 2.6, w: 1.6, sweep: 0.5, fingers: 0 },
    fly: { hz: 3.2, amp: 62, mid: 10, bound: { period: 1.25, burst: 3 } },
    stand: { legs: 0.8, upright: 0.67 },
    col: (p) => {
      const [blue, orange, bill, white] = p.kingfisher;
      return {
        back: blue,
        belly: orange,
        throat: white,
        head: blue,
        cap: mix(blue, "#000000", 0.12),
        bill,
        eye: bill,
        tail: mix(blue, "#000000", 0.1),
        tailTip: blue,
        wingTop: blue,
        wingPatch: mix(blue, white, 0.35),
        wingEdge: mix(blue, "#000000", 0.35),
        wingTrail: mix(blue, "#000000", 0.25),
        wingUnder: mix(orange, white, 0.4),
        leg: orange,
        collar: white,
      };
    },
  },
  tropicbird: {
    ...BASE,
    label: "Tropicbird",
    body: { a: [-1.8, -0.1], b: [1.6, 0.2], r: 1.65 },
    head: { at: [3.2, 0.9], r: 1.2 },
    bill: { len: 1.6, r: 0.55, droop: 0 },
    tail: { len: 2.6, w: 0.9, drop: -0.2 },
    streamers: { n: 2, len: 8 },
    wing: { root: [0.7, 0.9], arm: 4.2, hand: 4.6, w: 1.4, sweep: 0.62, fingers: 2 },
    fly: { hz: 3.2, amp: 52, mid: 10 },
    stand: { legs: 0.8, upright: 0.5 },
    col: (p) => {
      const [white, black, bill, shade] = p.tropicbird;
      return {
        back: mix(white, shade, 0.18),
        belly: mix(white, shade, 0.5),
        throat: white,
        head: white,
        cap: white,
        bill,
        eye: black,
        tail: white,
        tailTip: white,
        wingTop: white,
        wingPatch: black,
        wingEdge: black,
        wingTrail: shade,
        wingUnder: mix(white, shade, 0.4),
        leg: shade,
        eyebar: black,
        streamer: white,
        streamerTip: shade,
      };
    },
  },
  puffin: {
    ...BASE,
    label: "Puffin",
    body: { a: [-1.2, -0.2], b: [1.2, 0.1], r: 1.95 },
    head: { at: [2.5, 0.9], r: 1.55 },
    bill: { len: 2.3, r: 1.0, droop: 0 },
    tail: { len: 1.6, w: 0.9, drop: -0.3 },
    wing: { root: [0.3, 0.9], arm: 2.3, hand: 2.4, w: 1.4, sweep: 0.5, fingers: 0 },
    fly: { hz: 4, amp: 40, mid: 8 },
    trail: true,
    stand: { legs: 1.0, upright: 1.25 },
    col: (p) => {
      const [black, white, beak, tip, foot] = p.puffin;
      return {
        back: black,
        belly: white,
        throat: white,
        head: white,
        cap: black,
        bill: beak,
        billTip: tip,
        eye: black,
        tail: black,
        wingTop: black,
        wingEdge: black,
        wingTrail: mix(black, "#ffffff", 0.12),
        wingUnder: mix(black, white, 0.45),
        leg: foot,
        puffin: true,
      };
    },
  },
  hornbill: {
    ...BASE,
    label: "Great hornbill",
    s: 1.4,
    body: { a: [-1.6, -0.1], b: [1.5, 0.1], r: 1.75 },
    head: { at: [3.3, 1.3], r: 1.2 },
    bill: { len: 3.4, r: 0.85, droop: 0.5 },
    tail: { len: 3.8, w: 1.3, drop: -0.3 },
    wing: { root: [0.4, 0.9], arm: 3.6, hand: 4.0, w: 1.9, sweep: 0.5, fingers: 3 },
    fly: { hz: 2, amp: 50, mid: 6 },
    stand: { legs: 1.0, upright: 0.33 },
    casque: true,
    col: (p) => {
      const [black, white, yellow, casque] = p.hornbill;
      return {
        back: black,
        belly: mix(black, white, 0.15),
        throat: white,
        head: white,
        cap: black,
        bill: yellow,
        eye: black,
        tail: white,
        tailBand: black,
        wingTop: black,
        wingPatch: white,
        wingEdge: white,
        wingTrail: white,
        wingUnder: mix(white, black, 0.2),
        leg: mix(black, white, 0.3),
        casque,
        neck: white,
      };
    },
  },
};

// Kessie, the small blue bird Eeyore rescued in the Hundred Acre Wood: the bluebird's build with her own
// palette (white belly), a steady flapper that does not bound.
SPECIES.kessie = { ...SPECIES.bluebird, label: "Kessie", fly: { hz: 3.5, amp: 58, mid: 14 } };

// ---- Colours ----------------------------------------------------------------------------------------

// A species' base colours from the scene's palette (read once per palette, since a palette never changes).
const COLOURS = new WeakMap();
function coloursFor(g, id) {
  if (!COLOURS.has(g.pal)) COLOURS.set(g.pal, {});
  const m = COLOURS.get(g.pal);
  const sp = SPECIES[id];
  m[id] ??= sp.col(sp.own ? g.pal[id] : g.pal);
  return m[id];
}

// ---- Building ---------------------------------------------------------------------------------------

const rot = ([x, y], deg) => {
  const c = Math.cos(deg * RAD);
  const s = Math.sin(deg * RAD);
  return [x * c - y * s, x * s + y * c];
};

// A wing from its root on the shoulder: the arm to the wrist, the hand beyond it, both foreshortened
// as the wing turns (phi up from level, bend how far the hand trails the arm), blended toward the
// folded wing along the flank (fold, 0 to 1). The far wing is a darker tone, set a little behind and
// higher, drawn first so the body covers its root.
function addWing(cells, sp, C, P, far) {
  const k = sp.s;
  const W = sp.wing;
  const ang = P.upright * 60;
  const root = rot([(W.root[0] + (far ? -0.8 : 0)) * k, (W.root[1] + (far ? 0.25 : 0)) * k], ang);
  const phi = (P.phi + (far ? 9 : 0)) * RAD;
  const hp = (P.phi + P.bend + (far ? 9 : 0)) * RAD;
  const A = W.arm * k;
  const H = W.hand * k;
  const fold = P.fold;
  let av = [-A * (W.sweep * Math.cos(phi) + 0.12), A * Math.sin(phi)];
  let hv = [-H * ((W.sweep + 0.18) * Math.cos(hp) + 0.12), H * Math.sin(hp)];
  const fa = rot([-A * 0.5, -A * 0.12], ang);
  const fh = rot([-H * 0.95, -H * 0.12], ang);
  av = [lerp(av[0], fa[0], fold), lerp(av[1], fa[1], fold)];
  hv = [lerp(hv[0], fh[0], fold), lerp(hv[1], fh[1], fold)];
  const wrist = [root[0] + av[0], root[1] + av[1]];
  const tip = [wrist[0] + hv[0], wrist[1] + hv[1]];
  const under = P.phi < -8 && fold < 0.5;
  const tint = (c) => (far ? dark(c, 0.3) : c);
  const rU = ramp(tint(C.wingUnder));
  const rUe = ramp(tint(mix(C.wingUnder, C.wingEdge, 0.5)));
  const rTop = ramp(tint(C.wingTop));
  const rEdge = ramp(tint(C.wingEdge));
  const rPatch = ramp(tint(C.wingPatch ?? C.wingTop));
  const rTrail = ramp(tint(C.wingTrail));
  const tone = (seg) => (lit, _nx, ny, t) => {
    if (under) return pick(seg === 1 && t > 0.6 ? rUe : rU, lit);
    if (seg === 1 && t > 0.55) return pick(rEdge, lit);
    if (C.bars && seg === 0 && Math.floor(t * 6) % 2 === 1) return pick(rEdge, lit);
    if (ny < -0.35) return pick(rTrail, lit);
    if (C.wingPatch && seg === 1 && t < 0.5 && ny < 0.3) return pick(rPatch, lit);
    return pick(rTop, lit);
  };
  const w = W.w * k * (1 + 0.45 * Math.max(0, Math.sin(phi)) * (1 - fold));
  capsule(cells, root, wrist, w, w * 0.85, tone(0));
  capsule(cells, wrist, tip, w * 0.85, w * (W.fingers ? 0.6 : 0.4), tone(1));
  if (W.fingers && fold < 0.5) {
    const hl = Math.hypot(hv[0], hv[1]) || 1;
    const dir = [hv[0] / hl, hv[1] / hl];
    for (let i = 0; i < W.fingers; i++) {
      const d = rot(dir, (i - (W.fingers - 1) / 2) * 17 * (1 - fold * 2));
      const from = [tip[0] - dir[0] * 1.6 * k, tip[1] - dir[1] * 1.6 * k];
      const to = [tip[0] + d[0] * 1.5 * k, tip[1] + d[1] * 1.5 * k];
      capsule(cells, from, to, 0.5, 0.42, (lit) => pick(rEdge, lit));
    }
  }
}

// One leg standing: hip in the belly, foot on the ground, the ankle bending back (the "knee" seen is
// the ankle), toes forward. A far leg is a darker tone.
function addLeg(cells, C, hip, foot, far) {
  const a = Math.hypot(foot[0] - hip[0], foot[1] - hip[1]);
  const half = Math.max(0.9, a * 0.62);
  const mid = [(hip[0] + foot[0]) / 2, (hip[1] + foot[1]) / 2];
  const h = Math.sqrt(Math.max(0, half * half - (a * a) / 4));
  const ankle = [mid[0] - h, mid[1] + h * 0.15];
  const c = far ? dark(C.leg, 0.35) : C.leg;
  capsule(cells, hip, ankle, 0.55, 0.5, () => c);
  capsule(cells, ankle, foot, 0.5, 0.5, () => c);
  const fu = Math.round(foot[0]);
  const fv = Math.round(foot[1]);
  for (const u of [fu - 1, fu, fu + 1]) cells.set(u, fv, c);
}

// The bird as cells. pose: phi, bend, fold (the wing), upright (0 to 1, how upright it sits), head
// [du, dv] (the head moves on its neck), look (the bill's angle in degrees, 0 level), blink, open,
// pitch (head up and tail down, flying), breath, legs ("tuck" | "trail" | "stand"), ground (v of
// the feet when standing), tail (lift), t (time, for the streamers), wing: false to leave it out.
function birdCells(sp, C, pose = {}) {
  const P = { phi: 0, bend: 0, fold: 1, upright: 0, look: 0, pitch: 0, breath: 0, legs: "tuck", tail: 0, ...pose };
  const k = sp.s;
  const cells = new Cells();
  const ang = P.upright * 60;
  const fl = P.fluff ?? 0;
  if (P.wing !== false) addWing(cells, sp, C, P, true);

  const shrink = 1 - 0.28 * fl;
  const bodyA = rot([sp.body.a[0] * k * shrink, sp.body.a[1] * k - P.pitch * 0.4], ang);
  const bodyB = rot([sp.body.b[0] * k * shrink, sp.body.b[1] * k], ang);
  const br = sp.body.r * k * (1 + P.breath * 0.05 + 0.3 * fl);
  const nrm = rot([0, -1], ang);
  const hipV = (bodyA[1] + bodyB[1]) / 2 + nrm[1] * br * 0.55;
  const hipU = (bodyA[0] + bodyB[0]) / 2 + nrm[0] * br * 0.55;

  // The tail, with the hips.
  const tl = sp.tail.len * k * (1 - 0.3 * fl);
  const tdir = rot([-1, sp.tail.drop / 3], ang + P.tail * 12 - P.pitch * 10);
  const tb = rot([-0.3 * k, 0.1], ang);
  const tbase = [bodyA[0] + tb[0], bodyA[1] + tb[1]];
  const tend = [tbase[0] + tdir[0] * tl, tbase[1] + tdir[1] * tl];
  const rTail = ramp(C.tail);
  capsule(cells, tbase, tend, sp.tail.w * k, sp.tail.w * k * 0.85, (lit, _nx, ny, t) => {
    if (C.tailBand && t > 0.45 && t < 0.72) return pick(ramp(C.tailBand), lit);
    if (C.tailTip && t > 0.85) return pick(ramp(C.tailTip), lit);
    return pick(rTail, ny < -0.3 ? lit - 0.3 : lit);
  });
  if (sp.streamers) {
    for (let s = 0; s < sp.streamers.n; s++) {
      let prev = [tbase[0] - 1.5 * k, tbase[1] + (s ? -0.6 : 0.2)];
      for (let i = 1; i <= sp.streamers.len; i++) {
        const sway = Math.sin((P.t ?? 0) * 5 - i * 0.75 + s * 1.3) * Math.min(1.1, i * 0.22);
        const next = [prev[0] - 1, tbase[1] + (s ? -0.7 : 0.2) + sway - i * 0.05];
        capsule(cells, prev, next, 0.5, 0.5, () => (i > sp.streamers.len * 0.7 ? C.streamerTip : C.streamer));
        prev = next;
      }
    }
  }

  if (P.legs === "stand") addLeg(cells, C, [hipU + 0.9, hipV], [hipU + 1.9, P.ground], true);

  // The body: a lit back, a shaded belly, the darkest tone under it.
  const backR = ramp(C.back);
  const bellyR = ramp(C.belly);
  capsule(cells, bodyA, bodyB, br, br * 0.9, (lit, _nx, ny, t) => {
    if (ny > -0.18) {
      if (C.breast && t > 0.5 && ny < 0.45) return pick(ramp(C.breast), lit);
      if (C.rump && t < 0.28) return pick(ramp(C.rump), lit);
      return pick(backR, lit);
    }
    if (t > 0.62 && C.throat !== C.belly) return pick(ramp(C.throat), lit);
    return pick(bellyR, lit - 0.1);
  });

  // The neck and the head: the head sits at its rest position moved by `head`, the neck reaching it.
  const [dh, dv] = P.head ?? [0, 0];
  const h0 = rot([sp.head.at[0] * k, sp.head.at[1] * k], ang);
  const sink = [bodyB[0] + 0.3, bodyB[1] + br * 0.55];
  const hx = lerp(h0[0], sink[0], 0.75 * fl) + dh + P.pitch * 0.2;
  const hy = lerp(h0[1], sink[1], 0.75 * fl) + dv + P.pitch * 0.9;
  const hr = sp.head.r * k;
  const neckC = (ny) => C.neck ?? (ny < -0.3 ? C.throat : C.head);
  capsule(cells, [bodyB[0] - 0.2, bodyB[1] + 0.2], [hx, hy], Math.min(hr * 0.95, br * 0.85), hr * 0.9, (lit, _nx, ny) =>
    pick(ramp(neckC(ny)), lit),
  );
  capsule(cells, [hx - 0.4, hy], [hx, hy], hr, hr, (lit, nx, ny) => {
    if (sp.mask && nx > 0.1 && ny < 0.5 && ny > -0.6) return pick(ramp(C.mask), lit);
    if (C.cap !== C.head && ny > 0.25) return pick(ramp(C.cap), lit);
    if (ny < -0.45) return pick(ramp(C.throat), lit - 0.1);
    return pick(ramp(C.head), lit);
  });
  if (C.collar && !C.puffin) {
    for (let v = Math.round(hy - hr); v <= Math.round(hy - hr * 0.2); v++)
      cells.set(Math.round(hx - hr * 0.7), v, C.collar);
  }
  if (sp.crest) {
    const c0 = [hx - hr * 0.3, hy + hr * 0.8];
    const c1 = [c0[0] - 1.0, c0[1] + sp.crest.len * (P.crestDown ? 0.2 : 0.8) + 0.2];
    capsule(cells, c0, c1, sp.crest.w + 0.3, sp.crest.w * 0.4, (lit) => pick(ramp(C.crest ?? C.cap), lit));
  }
  if (sp.casque) {
    const c0 = [hx + hr * 0.3, hy + hr * 0.5];
    capsule(cells, c0, [c0[0] + 2.2 * k * 0.8, c0[1] + 0.7], 0.8 * k, 0.55 * k, (lit) => pick(ramp(C.casque), lit));
  }

  // The bill, from the head's edge at the angle `look`.
  const ba = P.look * RAD;
  const b0 = [hx + Math.cos(ba) * hr * 0.6, hy - 0.2 + Math.sin(ba) * hr * 0.6];
  const bl = sp.bill.len * k;
  const droop = sp.bill.droop * k;
  const open = P.open ?? 0;
  const segs = sp.bill.droop > 1 ? 4 : 1;
  let prev = b0;
  for (let i = 1; i <= segs; i++) {
    const f = i / segs;
    const nxt = [b0[0] + Math.cos(ba) * bl * f, b0[1] + Math.sin(ba) * bl * f - droop * f * f - open * 0.3 * f];
    const r0 = Math.max(0.48, sp.bill.r * k * (1 - 0.55 * ((i - 1) / segs)));
    const r1 = Math.max(i === segs ? 0.4 : 0.48, sp.bill.r * k * (1 - 0.55 * f));
    capsule(cells, prev, nxt, r0, r1, (lit, _nx, _ny, t) => {
      const u = (i - 1 + t) / segs;
      return pick(ramp(C.puffin ? (u > 0.42 ? C.billTip : C.bill) : C.bill), lit);
    });
    prev = nxt;
  }

  if (P.legs === "stand") addLeg(cells, C, [hipU, hipV], [hipU + 0.3, P.ground], false);
  else if (P.legs === "trail") {
    const l0 = [bodyA[0] + 0.2, bodyA[1] - 1.2];
    capsule(cells, [l0[0] + 0.4, l0[1] - 0.3], [l0[0] - 1.6, l0[1] - 0.6], 0.5, 0.5, () => dark(C.leg, 0.3));
    capsule(cells, l0, [l0[0] - 2.2, l0[1] - 0.2], 0.5, 0.5, () => C.leg);
  }

  if (P.wing !== false) addWing(cells, sp, C, P, false);
  tidy(cells);

  // The eye, last, and its lid.
  const ex = Math.round(hx + hr * 0.35);
  const ey = Math.round(hy + 0.3);
  if (C.eyebar) for (let u = Math.round(hx - hr * 0.5); u <= Math.round(hx + hr * 0.9); u++) cells.set(u, ey, C.eyebar);
  if (cells.has(ex, ey)) cells.set(ex, ey, P.blink ? (C.cap ?? C.head) : C.eye);
  if (C.puffin && !P.blink) cells.set(ex, ey + 1, mix(C.head, "#808890", 0.25));
  return cells;
}

// The height (v) of the ground below the body centre for a bird standing as it rests: its feet on that row.
export function groundOf(sp) {
  const k = sp.s;
  const ang = sp.stand.upright * 60;
  const a = rot([sp.body.a[0] * k, sp.body.a[1] * k], ang);
  const b = rot([sp.body.b[0] * k, sp.body.b[1] * k], ang);
  const nrm = rot([0, -1], ang);
  const hipV = (a[1] + b[1]) / 2 + nrm[1] * sp.body.r * k * 0.55;
  return Math.round(hipV - sp.stand.legs * k - 1.0);
}

// Paints cells at (ox, y) facing dir; row y - 1 holds v = 0. `shadow` is [u0, u1, row].
function paintBird(g, cells, ox, y, dir, shadow = null) {
  const X = (u) => (dir > 0 ? ox + u : ox - u - 1);
  if (shadow) {
    g.ctx.fillStyle = shadowColour(g.pal);
    for (let u = shadow[0]; u <= shadow[1]; u++) g.ctx.fillRect(X(u), shadow[2], 1, 1);
  }
  for (const [u, v, c] of cells.values()) {
    g.ctx.fillStyle = c;
    g.ctx.fillRect(X(u), y - 1 - v, 1, 1);
  }
}

// ---- Flight -------------------------------------------------------------------------------------------

// The wing and the body's rise at time t. A flapper beats on a cosine: the wing goes up and down with
// the hand trailing the arm (behind on the upstroke, folding), and the body rises on the downstroke. A
// bounder (jay, kingfisher, bluebird, cardinal, iiwi, swift) beats a burst of flaps, then folds its
// wings shut and glides over the top of an arc, opening them again before the next burst. `phase`
// shifts it in time.
function flightPose(sp, t, phase = 0) {
  const F = sp.fly;
  let p = t * F.hz + phase;
  let fold = 0;
  let dy = 0;
  let pitch = 0;
  if (F.bound) {
    const P = F.bound.period;
    const n = F.bound.burst;
    const c = frac(t / P + phase / (P * F.hz));
    const burst = n / F.hz / P;
    if (c < burst) {
      const u = c / burst;
      p = n * u;
      dy = (2 * u - 1) * 1.7;
      pitch = 0.6;
    } else {
      const u = (c - burst) / (1 - burst);
      p = 0;
      fold = smooth(clamp(Math.min(u / 0.2, (1 - u) / 0.2), 0, 1));
      dy = 1.7 * (1 - 2 * u * u);
      pitch = 0.6 - 1.6 * u;
    }
  }
  const s = Math.sin(2 * Math.PI * p);
  const bob = F.bound ? (fold > 0.5 ? 0 : 0.5 * s) : 0.8 * s;
  return {
    phi: F.mid + F.amp * Math.cos(2 * Math.PI * p),
    bend: 26 * s * (s < 0 ? 1.3 : 1),
    fold,
    dy: dy + bob,
    pitch,
  };
}

// A species drawn flying at (x, y), facing dir. `eel` is the colour of a sand eel hanging from the bill.
export function flyingBird(g, id, x, y, dir, t, phase = 0, eel = null) {
  const sp = SPECIES[id];
  const f = flightPose(sp, t, phase);
  const cells = birdCells(sp, coloursFor(g, id), {
    ...f,
    upright: 0,
    t,
    legs: sp.trail ? "trail" : "tuck",
    tail: -f.pitch * 0.5,
    look: -f.pitch * 6,
  });
  if (eel) hangEel(cells, sp, eel);
  paintBird(g, cells, Math.round(x), Math.round(y - f.dy), dir);
}

// Three cells of sand eel hanging from the bill's middle, for a bird flying or standing at upright 0.
function hangEel(cells, sp, eel) {
  const u = Math.round((sp.head.at[0] + sp.bill.len * 0.55) * sp.s);
  const v = Math.round(sp.head.at[1] * sp.s) - 1;
  for (let i = 0; i < 3; i++) cells.set(u, v - i, eel);
}

// ---- Landing and taking off ---------------------------------------------------------------------------

// A bird between flying (k 0) and perched (k 1): the wings beat slowly and ever shallower, the body
// rears upright and the legs come down. It meets perchedSmall's pose at k 1, so the two join. (x, y) as in
// paintBird: the body centre, the bird standing when its feet are at y + groundOf.
export function transitBird(g, id, x, y, dir, t, k, phase = 0) {
  const sp = SPECIES[id];
  const e = smooth(clamp(k, 0, 1));
  const w = Math.sin(2 * Math.PI * (t * 2.4 + phase));
  const beat = 1 - e;
  const cells = birdCells(sp, coloursFor(g, id), {
    phi: beat * (sp.fly.mid + sp.fly.amp * 0.9 * Math.cos(2 * Math.PI * (t * 2.4 + phase))),
    bend: beat * 26 * w,
    fold: 0,
    upright: sp.stand.upright * e,
    legs: k > 0.3 ? "stand" : sp.trail ? "trail" : "tuck",
    ground: groundOf(sp),
    t,
    tail: 0,
  });
  paintBird(g, cells, Math.round(x), Math.round(y - beat * 0.8 * w), dir);
}

// ---- Perched ----------------------------------------------------------------------------------------------

// What each move changes, as numbers that ease in and out with the move's weight.
const POSES = {
  look: { head: [0.7, 0.4], look: 20 },
  blink: { blink: 1 },
  bob: { head: [0.9, -1.4], look: -35 },
  preen: { head: [-1.6, -2.4], look: 200 },
  stretch: { phi: 58, bend: -14, fold: 0.15, head: [0.3, 0.3], upright: -0.1 },
  hop: { lift: 1.6, fold: 0.45, phi: 24, bend: 10, head: [0.3, 0.2], upright: -0.1 },
  sleep: { head: [0, -0.2], look: -10, blink: 1, upright: 0, fluff: 0.8 },
};
const NUM = ["fluff", "upright", "look", "phi", "bend", "fold", "lift", "blink"];

// The pose with each named move at its weight (0 to 1).
export function blendPose(weights) {
  const out = { head: [0, 0] };
  for (const n of NUM) out[n] = 0;
  for (const [name, w] of Object.entries(weights)) {
    const p = POSES[name];
    if (!p || !w) continue;
    for (const n of NUM) out[n] += (p[n] ?? 0) * w;
    if (p.head) out.head = [out.head[0] + p.head[0] * w, out.head[1] + p.head[1] * w];
  }
  return out;
}

// The moves of a perched small bird, each on its own timer (critters.js percher).
export const SMALL_MOVES = {
  look: { every: [3, 7], lasts: 2 },
  blink: { every: [2, 5], lasts: 0.3 },
  bob: { every: [4, 9], lasts: 0.8 },
  preen: { every: [8, 14], lasts: 2.6 },
  stretch: { every: [10, 18], lasts: 2 },
  hop: { every: [9, 16], lasts: 2.6 },
};

// The move weights of a percher: `at` gives each move's progress (critters.js doing: 0..1, or -1 for none).
// Returns the pose, and `turned` while the bird has hopped round to face the other way.
export function movePose(at) {
  const on = (n, a, m, b, c) => (at[n] < 0 ? 0 : pulse(at[n], a, m, b, c));
  const h = at.hop;
  const hop =
    h < 0 ? 0 : Math.max(ease(h, 0, 0.05) * (1 - ease(h, 0.05, 0.12)), ease(h, 0.88, 0.93) * (1 - ease(h, 0.93, 1)));
  const pose = blendPose({
    look: on("look", 0, 0.25, 0.75, 1),
    blink: on("blink", 0, 0.3, 0.6, 1),
    bob: on("bob", 0, 0.25, 0.7, 1),
    preen: on("preen", 0, 0.25, 0.75, 1),
    stretch: on("stretch", 0, 0.25, 0.75, 1),
    hop,
  });
  return { pose, turned: h > 0.06 && h < 0.9 };
}

// A bird of `id` standing, feet on the row above gy, its body centre at x. `pose` is blendPose's;
// `sleeping` tucks the head and fluffs. A bird in the air a moment (lift) tucks its legs.
export function perchedSmall(g, id, x, gy, t, pose, { dir = 1, sleeping = false } = {}) {
  const sp = SPECIES[id];
  const gv = groundOf(sp);
  const p = sleeping ? blendPose({ sleep: 1 }) : pose;
  const lift = Math.round(p.lift);
  const cells = birdCells(sp, coloursFor(g, id), {
    ...p,
    fold: p.fold,
    upright: sp.stand.upright + p.upright,
    legs: lift > 0 ? "tuck" : "stand",
    ground: gv,
    breath: Math.sin(t * 2.4),
    blink: p.blink > 0.5,
  });
  paintBird(g, cells, Math.round(x), gy + gv - lift, dir);
}

// Where a standing bird's feet are, so a scene can put them exactly on a perch of its own: `u` the column of
// the feet (from the body centre, facing right) and `v` the height of the lowest foot cell. Pass the row
// `top + v - groundOf(sp)` as perchedSmall's gy (and `top + v` as transitBird's y) for feet on the row above `top`.
export function footOf(g, id) {
  const sp = SPECIES[id];
  const C = coloursFor(g, id);
  const cells = birdCells(sp, C, { upright: sp.stand.upright, legs: "stand", ground: groundOf(sp), breath: 0 });
  const feet = [...cells.values()].filter(([, , c]) => c === C.leg);
  const v = Math.min(...feet.map(([, w]) => w));
  const us = feet.filter(([, w]) => w === v).map(([u]) => u);
  return { u: us.reduce((a, b) => a + b, 0) / us.length, v };
}

// Where a perched bird's body centre is (paintBird's y) when its feet are on the row above `top`.
export const restRow = (id, top) => top + groundOf(SPECIES[id]);

// ---- The standing puffin ----------------------------------------------------------------------------------

// Drawn from a cell template, facing right: K black, W white, G grey face shade, E eye, B bill base,
// O orange bill, R red bill tip, F orange feet. Moves are offsets on it.
const PUFFIN = [
  "..KKK...",
  ".KKWWK..",
  ".KWWEBO.",
  ".KWGWBOR",
  ".KKWWKO.",
  "KKKWWW..",
  "KKKWWW..",
  "KKKWWW..",
  ".KKWWW..",
  "..F..F..",
];
export const HEAD_ROWS = 5;
export const ANCHOR = 3;
export const PUFFIN_HEIGHT = 10;

export function puffinCells(g, pose, sleeping, blinkNow) {
  const [black, white, beak, tip, foot] = g.pal.puffin;
  const edge = mix(white, "#7a828c", 0.55);
  const grey = mix(white, "#000000", 0.26);
  const tone = (ch, r, c) => {
    if (ch === "K")
      return r <= 1 || (r === 5 && c === 0)
        ? mix(black, "#ffffff", 0.2)
        : r === 8
          ? mix(black, "#ffffff", 0.08)
          : black;
    if (ch === "W") return r >= 8 ? mix(white, "#000000", 0.26) : r >= 7 ? mix(white, "#000000", 0.13) : white;
    if (ch === "G") return grey;
    if (ch === "E") return black;
    if (ch === "B") return "#7f93a6";
    if (ch === "O") return beak;
    if (ch === "R") return tip;
    return foot;
  };
  const out = new Map();
  const put = (x, y, c) => out.set(`${x},${y}`, [x, y, c]);
  const sink = sleeping ? 1 : 0;
  const bob = pose.look < -15 ? 1 : 0;
  const preen = pose.look > 120;
  const lookBack = pose.look > 8 && pose.look <= 120;
  const dy = Math.max(sink, bob, preen ? 1 : 0);
  const blink = blinkNow || sleeping || pose.blink > 0.5;
  const rows = PUFFIN.map((line) => line.split(""));
  if (sleeping) for (let r = 5; r < 9; r++) rows[r][6] = "W";
  rows.forEach((line, r) => {
    line.forEach((ch, c) => {
      if (ch === ".") return;
      let x = c;
      let y = r;
      if (r < HEAD_ROWS) {
        y += dy;
        if (lookBack) x = 5 - c;
        if (preen && (ch === "B" || ch === "O" || ch === "R")) {
          x -= 3;
          y += 1;
        }
      }
      put(x, y, ch === "E" && blink ? (sleeping ? grey : white) : tone(ch, r, c));
    });
  });
  // The white's grey edge where it meets the air, on the chest side and the lower belly.
  for (const [x, y, c] of [...out.values()]) {
    if (c !== white && c !== tone("W", 8, 0) && c !== tone("W", 7, 0)) continue;
    const right = !out.has(`${x + 1},${y}`);
    const below = !out.has(`${x},${y + 1}`);
    if (y >= 5 && (right || below) && y < 9) put(x, y, y >= 8 ? mix(edge, "#000000", 0.2) : edge);
  }
  if (pose.phi > 25) {
    const s = Math.min(1, pose.phi / 58);
    const n = Math.round(s * 2) + 1;
    for (let i = 1; i <= n; i++)
      for (let r = 5; r <= 7; r++) put(-i, r - (i - 1), mix(black, "#ffffff", i === n ? 0.18 : 0));
  }
  return [...out.values()];
}

// Paints the template with its feet on the row gy - 1 (x the middle of its body); `eel` hangs three silver
// cells from the bill.
export function puffinStand(g, x, gy, t, pose, { sleeping = false, dir = 1, eel = null } = {}) {
  const lift = Math.round(pose.lift);
  const blinkNow = !sleeping && Math.floor(t * 8) % 41 === 3;
  const cells = puffinCells(g, pose, sleeping, blinkNow);
  const X = (c) => (dir > 0 ? x + c - ANCHOR : x - (c - ANCHOR) - 1);
  const top = gy - PUFFIN_HEIGHT - lift;
  if (!lift) {
    g.ctx.fillStyle = shadowColour(g.pal);
    for (let c = 0; c < 6; c++) g.ctx.fillRect(X(c), gy, 1, 1);
  }
  const bump = !sleeping && lift === 0 ? Math.round(Math.sin(t * 2.4) * 0.4) : 0;
  for (const [cx, cy, col] of cells) {
    g.ctx.fillStyle = col;
    g.ctx.fillRect(X(cx), top + cy + bump, 1, 1);
  }
  const look = pose.look ?? 0;
  const billX = look > 8 && look <= 120 ? -2 : look > 120 ? 4 : 7;
  const billY = 3 + (look < -15 || look > 120 ? 1 : 0) + (look > 120 ? 1 : 0);
  if (eel && !sleeping) {
    g.ctx.fillStyle = eel;
    for (let k = 0; k < 3; k++) g.ctx.fillRect(X(billX), top + billY + 1 + k + bump, 1, 1);
  }
}
