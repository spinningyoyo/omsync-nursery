// The giraffe built from parts, on the hoofed build (hoof.js, on build.js) extended for a giraffe:
// very long two-bone legs with full thighs and hooves, a short body sloping down from high withers
// to the rump, and a neck of seven segments that bend along its length (so browsing and drinking
// curve it, not tilt a stick). The head, its ossicones, ear and tongue are placed on the neck's end
// in every frame, the short upright mane stands on the neck's crest and the Masai patches are laid
// on the coat in the body's and the neck's own coordinates, so they move with them. The giraffe
// paces (GAIT): each side swings nearly as one. Coordinates are the giraffe's own: x runs from the
// rump (0) toward the nose and h is the height above the ground; `plot(x, h, colour)` paints a
// pixel, so the caller places and mirrors it. Rest poses: stand, browse (the head reaches up into
// the leaves) and drink (the fore legs splay, the neck curves down to the water). animals.js's
// giraffeAt places and poses it; muzzleAt says where the muzzle is.
import { column, curve, dipAlong, footRest, pairMix, plant, profile, shapeCache, standFeet, stepAt } from "./build.js";
import { hoofDips, hoofLeg, hoofRoot, hoofRow, restShape } from "./hoof.js";
import { clamp, frac, hash, lerp, mix, smooth } from "./pixel.js";

const RAD = Math.PI / 180;

// The giraffe paces: the near hind and near fore step almost together, then the far pair, so each
// side swings as one (Muybridge's and film stills' walk, a lateral gait with the pairs a tenth of a
// stride apart). Two feet are always down.
export const GAIT = { at: [0, 0.12, 0.5, 0.62], stance: 0.62 };

// ---- Poses ------------------------------------------------------------------------------------

// The standing feet, the far one a pixel on; drinking moves them nearDx and farDx more.
const feetAt = (L, nearDx = 0, farDx = 0) => {
  const { near, far } = standFeet(L.foot, 1, L.stand);
  return { near: [near[0] + nearDx, 0], far: [far[0] + farDx, 0] };
};

// A pose is where the parts go: the body's lift per column, each hoof's place, how straight the legs
// stand, and the neck as three angles in degrees: its base, its top, and the head's axis.
const SHAPES = {
  stand(spec) {
    return {
      off: () => 0,
      hind: feetAt(spec.hind),
      fore: feetAt(spec.fore),
      neck: [85, 75, 12],
      stand: 1,
      splay: 0,
      back: 0,
    };
  },
  // Browsing: the neck leans forward and the head reaches up into the leaves.
  browse(spec) {
    return { ...SHAPES.stand(spec), neck: [80, 68, 2] };
  },
  // Drinking: the fore legs splay wide, the shoulders sink, the neck curves forward and down until
  // the muzzle is at the water.
  drink(spec) {
    return {
      off: (x) => -4 * smooth(clamp((x - 3) / 8, 0, 1)),
      hind: feetAt(spec.hind),
      fore: feetAt(spec.fore, 2, 1),
      neck: [-20, -85, -90],
      stand: 0,
      splay: 1,
      back: 4,
    };
  },
};
const shapeOf = shapeCache(SHAPES);

// Two poses blended. Splaying the legs, the legs lead and the neck follows; straightening, the neck
// lifts first and the legs close after it, as a giraffe raises its head before it stands square. Not build.js's blender: the splay leads,
// not a fold, and the weight is not eased.
function blend(A, B, u) {
  const v = clamp(u, 0, 1);
  if (v === 0) return A;
  if (v === 1) return B;
  const opening = B.splay > A.splay;
  const closing = B.splay < A.splay;
  const legs = smooth(clamp(opening ? v * 1.6 : v * 1.6 - 0.6, 0, 1));
  const neck = smooth(clamp(closing ? v * 1.6 : opening ? v * 1.6 - 0.6 : v, 0, 1));
  const leg = opening || closing ? legs : smooth(v);
  return {
    off: (x) => lerp(A.off(x), B.off(x), leg),
    hind: pairMix(A.hind, B.hind, leg),
    fore: pairMix(A.fore, B.fore, leg),
    neck: A.neck.map((a, i) => lerp(a, B.neck[i], neck)),
    stand: lerp(A.stand, B.stand, leg),
    splay: lerp(A.splay, B.splay, leg),
    back: lerp(A.back, B.back, neck),
  };
}

// The Masai patches: a coat of jagged cells. A point's nearest cell centres give how far it is from
// the edge between two patches; near an edge it is the pale coat showing through.
function seam(u, v, seed) {
  const iu = Math.floor(u);
  const iv = Math.floor(v);
  let d1 = 9;
  let d2 = 9;
  for (let dv = -1; dv <= 1; dv += 1) {
    for (let du = -1; du <= 1; du += 1) {
      const cu = iu + du + 0.15 + hash(iu + du, iv + dv, seed) * 0.7;
      const cv = iv + dv + 0.15 + hash(iu + du, iv + dv, seed + 7) * 0.7;
      const d = Math.hypot(u - cu, v - cv);
      if (d < d1) {
        d2 = d1;
        d1 = d;
      } else if (d < d2) d2 = d;
    }
  }
  return d2 - d1;
}
const SEAM = 0.3;

// The neck's seven segments from the withers, each turned a little more than the one before, so the
// whole neck bends along its length: where each joint is, and the head's angle at the end.
function neckOf(spec, shape, rock, lift, dropFore) {
  const [a0, a1, ah] = shape.neck;
  const N = spec.neck;
  const pts = [[N.base[0] - shape.back, N.base[1] + shape.off(N.base[0]) - dropFore]];
  for (let i = 0; i < N.segs; i += 1) {
    const u = i / (N.segs - 1);
    const ang = (lerp(a0, a1, u) + rock * (0.4 + u) + lift * u * 0.8) * RAD;
    const q = pts[i];
    pts.push([q[0] + (N.len / N.segs) * Math.cos(ang), q[1] + (N.len / N.segs) * Math.sin(ang)]);
  }
  return { pts, headAng: (ah + rock * 1.4 + lift) * RAD };
}

// Where the muzzle's tip is in a still rest pose ("stand", "browse" or "drink"), as [x from the rump,
// h above the hooves]: the scene asks it whether a browsing head would reach a tree's leaves.
export function muzzleAt(spec, name) {
  const { pts, headAng } = neckOf(spec, shapeOf(spec, name), 0, 0, 0);
  const E = pts[spec.neck.segs];
  return [E[0] + Math.cos(headAng) * spec.head.len, E[1] + Math.sin(headAng) * spec.head.len];
}

// ---- The giraffe ------------------------------------------------------------------------------

// One giraffe from a spec, in its own units: x runs from the rump (0) toward the nose, h is the
// height above the ground. `plot(x, h, colour)` paints one pixel. Pose fields: phase, amp (the walk),
// sway (the tail), blink, breath, bodyX (plants the hooves while the body steps on), rest ({ from,
// to, u }), head (degrees the head lifts), chew (the jaw open), tongue (0 to 1, how far it reaches),
// ear (0 to 1, the flick) and leaf (a leaf in the lips).
export function drawGiraffe(spec, pal, put, pose) {
  const plot = (x, h, c) => {
    if (h >= 0) put(x, h, c);
  };
  const { phase = 0, amp = 0, sway = 0, blink = false, breath = 0, bodyX = null } = pose;
  const last = spec.len - 1;
  const shape = restShape(spec, shapeOf, pose, blend);
  // The walk dips the hips and the shoulders in turn.
  const [dropHind, dropFore] = hoofDips(phase, amp, spec.bob);
  const dropAt = dipAlong(dropHind, dropFore, last);
  const top = profile(spec.top);
  const bottom = profile(spec.bottom);

  // A leg: two tapering bones from the body to the hoof, filled row by row so each row reaches the
  // row above; the hind leg's upper bone is a full thigh.
  const limb = (L, offset, far) => {
    const [reach, lift] = stepAt(frac(phase + offset), GAIT.stance, spec.stride, spec.lift);
    const F = [plant(footRest(shape, L, far)[0] + reach * amp, bodyX), lift * amp];
    const R = hoofRoot(L, shape, far ? 1 : 0, dropHind, dropFore);
    // The fore leg's upper half is the arm, patched like the thigh.
    const key = L.fore ? (t) => (t < 0.5 ? "arm" : undefined) : undefined;
    const { cells, J } = hoofLeg(shape, L, far, R, F, (1 - amp) * shape.stand, { key });
    // The wrist or the hock shows as a darker knob.
    const jx = Math.round(J[0]);
    const jh = Math.round(J[1]);
    if (jh >= 2) cells.set(`${jx}|${jh}`, [jx, jh, "knee"]);
    hoofRow(cells, spec, L, F);
    return { cells: [...cells.values()], R };
  };
  const paintLimb = ({ cells, R }, far) => {
    for (const [x, h, key] of cells) {
      if (key === "K") plot(x, h, pal.K);
      else if (key === "knee") plot(x, h, far ? pal.f : pal.t);
      else if (key === "thigh" || key === "arm") {
        const patch = seam((x - R[0]) / 3.6, (h - R[1]) / 3.4, 11) > SEAM;
        plot(x, h, far ? (patch ? pal.f : pal.F) : patch ? pal.s : pal.S);
      } else plot(x, h, far ? pal.l : pal.L);
    }
  };

  const [nh, nf, fh, ff] = GAIT.at;
  paintLimb(limb(spec.hind, fh, true), true);
  paintLimb(limb(spec.fore, ff, true), true);

  // The tail hangs from the rump and swings from the hips; its dark tuft is the last three pixels.
  const tail = spec.tail;
  const base = shape.off(0) - dropHind;
  const t0 = [tail[0][0], tail[0][1] + base];
  const t1 = [tail[1][0], tail[1][1] + base];
  const t2 = [tail[2][0] + sway * 1.6, tail[2][1] + base];
  curve(t0, t1, t2, 30, (x, h, t) => {
    if (t > 0.86) plot(x, Math.max(0, h), pal.K);
    else if (t > 0.78) plot(x - 1, Math.max(0, h), pal.K);
    else plot(x, Math.max(0, h), pal.t);
  });

  // The body, column by column: lit along the back, shaded low, darkest beneath; the patches are laid
  // on it in its own columns and rows, so they travel with it.
  for (let x = 0; x < spec.len; x += 1) {
    const [b, t] = column(spec, top, bottom, x, shape.off(x), dropAt(x), breath, true);
    for (let h = b; h <= t; h += 1) {
      let key = "T";
      if (h > t - 1) key = "H";
      else if (h <= b) key = "U";
      else if (h < b + (t - b) * 0.4) key = "S";
      const patch = key !== "H" && seam(x / 5.4, (h - b) / 4.2, 3) > SEAM;
      plot(x, h, patch ? pal[key.toLowerCase()] : pal[key]);
    }
  }

  paintLimb(limb(spec.hind, nh, false), false);
  paintLimb(limb(spec.fore, nf, false), false);

  // The neck: seven segments from the withers, each turned a little more than the one before, so the
  // whole neck bends along its length. The walk rocks it gently, the head leading.
  const rock = amp * 2.4 * Math.sin(2 * Math.PI * phase + 0.6);
  const lift = pose.head ?? 0;
  const N = spec.neck;
  const segs = N.segs;
  const { pts, headAng } = neckOf(spec, shape, rock, lift, dropFore);
  const E = pts[segs];
  const widthAt = (u) => lerp(N.w[0], N.w[1], u);
  // The nearest point on the neck's centre line: how far along it (0 to 1), and which side.
  const along = (x, h) => {
    let best = null;
    let run = 0;
    for (let i = 0; i < segs; i += 1) {
      const P = pts[i];
      const Q = pts[i + 1];
      const sx = Q[0] - P[0];
      const sh = Q[1] - P[1];
      const sl = Math.hypot(sx, sh);
      const t = clamp(((x - P[0]) * sx + (h - P[1]) * sh) / (sl * sl), 0, 1);
      const px = P[0] + sx * t;
      const ph = P[1] + sh * t;
      const dist = Math.hypot(x - px, h - ph);
      if (!best || dist < best.dist) {
        const cross = (sx * (h - P[1]) - sh * (x - P[0])) / sl; // + toward the crest
        best = { dist, s: (run + sl * t) / N.len, across: cross, ux: sx / sl, uh: sh / sl };
      }
      run += sl;
    }
    return best;
  };
  const xs = pts.map((p) => p[0]);
  const hs = pts.map((p) => p[1]);
  const x0 = Math.floor(Math.min(...xs) - 5);
  const x1 = Math.ceil(Math.max(...xs) + 5);
  const h0 = Math.floor(Math.min(...hs) - 5);
  const h1 = Math.ceil(Math.max(...hs) + 5);
  for (let x = x0; x <= x1; x += 1) {
    for (let h = Math.max(0, h0); h <= h1; h += 1) {
      const n = along(x, h);
      const half = widthAt(n.s) / 2;
      if (n.dist > half + 1.7) continue;
      const out = Math.abs(n.across);
      if (out > half) {
        // The mane: a short upright band one pixel deep along the whole crest, joined to the neck.
        if (n.across > 0 && out <= half + 1.15 && n.s > 0.02 && n.s < 1.02) plot(x, h, pal.M);
        continue;
      }
      const c = n.across / half;
      let key = "T";
      if (c > 0.45) key = "H";
      else if (c < -0.8) key = "U";
      else if (c < -0.3) key = "S";
      const patch = key !== "H" && seam((n.s * N.len) / 3.8, (n.across + half) / 3.2, 5) > SEAM;
      plot(x, h, patch ? pal[key.toLowerCase()] : pal[key]);
    }
  }

  // The head on the neck's end: a tapering wedge with a pale muzzle, an eye, a nostril; the
  // ossicones and the ear stand on it, so they turn with it.
  const hx = Math.cos(headAng);
  const hh = Math.sin(headAng);
  const lx = -hh; // the head's upper side
  const lh = hx;
  const H = spec.head;
  const at = (s, c) => [E[0] + hx * s + lx * c, E[1] + hh * s + lh * c];
  const headHalf = (s) => lerp(H.w[0], H.w[1], clamp(s / H.len, 0, 1)) / 2;
  const [cx0, cx1] = [Math.floor(E[0] - 7), Math.ceil(E[0] + 8)];
  const [ch0, ch1] = [Math.floor(E[1] - 8), Math.ceil(E[1] + 8)];
  for (let x = cx0; x <= cx1; x += 1) {
    for (let h = Math.max(0, ch0); h <= ch1; h += 1) {
      const rx = x - E[0];
      const rh = h - E[1];
      const s = rx * hx + rh * hh;
      const c = rx * lx + rh * lh;
      if (s < -0.4 || s > H.len) continue;
      const half = headHalf(s);
      if (Math.abs(c) > half) continue;
      let colour = c > half * 0.35 ? pal.H : c < -half * 0.5 ? pal.S : pal.T;
      if (s > H.len - H.muzzle) colour = s > H.len - 1.2 ? pal.Q : pal.P;
      plot(x, h, colour);
    }
  }
  const eye = at(H.eye[0], H.eye[1]);
  plot(Math.round(eye[0]), Math.round(eye[1]), blink ? pal.T : pal.N);
  const nose = at(H.len - 0.9, 0.2);
  plot(Math.round(nose[0]), Math.round(nose[1]), pal.N);
  // The jaw: while it chews the mouth line shows and the chin drops a pixel.
  if (pose.chew) {
    const m = at(H.len - 1.2, -0.45);
    plot(Math.round(m[0]), Math.round(m[1]), pal.N);
    const chin = at(H.len - 1.0, -headHalf(H.len - 1) - 0.5);
    plot(Math.round(chin[0]), Math.round(chin[1]), pal.P);
  }
  // The tongue reaches out of the lips along the head's line, curling up to the leaves.
  if (pose.tongue > 0.05) {
    const tl = pose.tongue * 2.8;
    for (let k = 0; k <= tl; k += 0.5) {
      const curl = 0.18 * k * k * (pose.tongueCurl ?? 1);
      const q = at(H.len + k, -0.25 + curl);
      plot(Math.round(q[0]), Math.round(q[1]), pal.G);
    }
  }
  if (pose.leaf) {
    const q = at(H.len + 0.4, -0.5);
    plot(Math.round(q[0]), Math.round(q[1]), pal.leaf);
  }
  // Ossicones: two short horns from the crown, tipped with dark tufts; the far one is shorter and
  // darker. The ear sticks out behind them and flicks back and down.
  const horn = (s, c, ang, len, colour, tuft) => {
    const a = headAng + ang * RAD;
    const o = at(s, c);
    for (let k = 0; k <= len; k += 0.5)
      plot(Math.round(o[0] + Math.cos(a) * k), Math.round(o[1] + Math.sin(a) * k), colour);
    const tip = len + 0.6;
    const kx = Math.round(o[0] + Math.cos(a) * tip);
    const kh = Math.round(o[1] + Math.sin(a) * tip);
    plot(kx, kh, tuft);
    plot(kx + 1, kh, tuft);
  };
  horn(1.0, headHalf(1.0) - 0.1, 80, 1.5, pal.F, pal.M);
  horn(2.0, headHalf(2.0) - 0.1, 84, 2.2, pal.O, pal.K);
  const earAng = (152 + 38 * (pose.ear ?? 0)) * RAD + headAng;
  const eo = at(0.3, headHalf(0.3) - 0.5);
  for (let k = 0; k <= 2.9; k += 0.5) {
    plot(
      Math.round(eo[0] + Math.cos(earAng) * k),
      Math.round(eo[1] + Math.sin(earAng) * k),
      k > 2.2 ? pal.K : k > 1.2 ? pal.S : pal.T,
    );
  }
}

// ---- The Masai giraffe -------------------------------------------------------------------------

// From side-on photos of Masai giraffes in the Serengeti (Giles Laurent's, on Wikimedia Commons):
// the withers are the highest point of a short body that slopes down to the rump; the legs are as
// long as the body is deep twice over, thin, with a pale lower leg and a dark knob at the wrist and
// the hock; the neck is as long as the legs, thin, and leans forward at about 70 degrees; the head
// is small and long-muzzled, with two ossicones, ears out sideways and a short dark mane down the
// crest; the tail hangs to the hocks with a black tuft. The Masai patches are big, jagged, dark
// brown on tan, with thin pale seams, running down the neck and over the thighs.
export const GIRAFFE = {
  len: 16,
  top: [
    [0, 16],
    [3, 16.5],
    [7, 18.5],
    [11, 20.5],
    [13, 21],
    [15, 20],
  ],
  bottom: [
    [0, 14],
    [1, 12],
    [5, 12],
    [12, 12],
    [15, 13],
  ],
  chest: [12, 15],
  bob: 1,
  hind: { root: [2.5, 14.5], a: 6, b: 8.7, bend: -1, foot: 2, w: [4.2, 1.6, 1], stand: [0, 3] },
  fore: { root: [13, 14], a: 6.8, b: 7.2, bend: 1, foot: 15, w: [3, 1.6, 1], stand: [0, -5], fore: true },
  stride: 5,
  lift: 1.2,
  hoof: 2,
  tail: [
    [0, 16],
    [-0.8, 11],
    [-0.2, 5],
  ],
  neck: { base: [10.5, 19], len: 13.4, segs: 7, w: [5.2, 2.6] },
  head: { len: 6.2, w: [3.6, 2.2], muzzle: 2.4, eye: [2.2, 0.6] },
};

// The coat's tones from the scene's giraffe palette [fur, patch, dark, muzzle], lit from above:
// H the back, T base, S flank, U beneath; the same four on the patches in lower case; L the pale
// lower leg, l the far leg, F and f the far thigh and its patches; K hooves and tuft, M the mane,
// O the ossicones, N eye and nose, P the muzzle, G the tongue.
export function giraffeTones([fur, patch, dark, muzzle]) {
  const p = mix(patch, dark, 0.38);
  return {
    H: mix(fur, muzzle, 0.45),
    T: fur,
    S: mix(fur, patch, 0.55),
    U: mix(patch, dark, 0.4),
    h: mix(p, fur, 0.2),
    t: p,
    s: mix(p, dark, 0.3),
    u: mix(p, dark, 0.6),
    L: mix(fur, muzzle, 0.25),
    Q: mix(patch, dark, 0.5),
    l: mix(patch, dark, 0.5),
    F: mix(patch, dark, 0.35),
    f: mix(p, dark, 0.6),
    K: mix(dark, "#000000", 0.4),
    M: mix(dark, "#000000", 0.25),
    O: mix(fur, dark, 0.4),
    N: mix(dark, "#000000", 0.55),
    P: mix(fur, muzzle, 0.3),
    G: mix("#a04a6a", dark, 0.3),
    D: dark,
  };
}
