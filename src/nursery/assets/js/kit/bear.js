// Bears built from parts: the black bear, grizzly and cub on one engine. A heavy body on legs of
// two bones that plant through a four-beat walk (or four drawn poses for the cub's short legs), plantigrade
// hind feet with a heel, clawed fore paws, and a head drawn from hand-made face grids (level, nose
// down, nose up) so it never rotates into mush. Every pose gives the body its own outline (stand,
// forage, the teddy-bear sit, lying with one back line, rearing upright as a pear), filled as one
// smooth shape; the legs and the neck are rooted by where they sit across the body, so they ride
// inside it in every pose and every blend between poses. Four tones lit from above, the far legs in
// their own darker tone. One spec per member (BLACK, GRIZZLY, CUB), drawn by drawBear(spec, pal, plot,
// pose); bearAt (below) places and poses it. Coordinates are the bear's own: x runs from the
// rump (0) toward the nose and h is the height above the ground; `plot(x, h, colour)` paints a
// pixel, so the caller places and mirrors it. On the scale: black bear 1.6 m, len 14; grizzly
// 2.1 m, len 16; cub 0.45 m, len 8. The cub's tree climb (climbAt, climbTotal, drawClimb) is drawn
// here beside the specs.
import {
  blender,
  bone,
  boneAcross,
  dipAlong,
  drawnDips,
  drawnLimb,
  standFeet as feetAt,
  footRest,
  joint,
  pawRows,
  plant,
  profile,
  rowFill,
  shapeCache,
  stepAt,
  straighten,
  walkDips,
} from "./build.js";
import { clamp, frac, lerp, mix, rad, rgba, shadowColour, smooth } from "./pixel.js";
import { blinkAt, breathAt, ease, feet, feetSpan, paintAt, sinceOf, tonesFor } from "./place.js";

// A bear's tones from a scene's bear palette [coat, sheen, muzzle, nose, legs]: H the sheen along
// the back, T the coat, S and U the shade and the darkest underneath, F the far legs, P the muzzle,
// D the nose and eye, C the claws.
export function bearTones(arr, own = {}) {
  const [coat, sheen, muzzle, nose, legs] = arr;
  return {
    H: mix(coat, sheen, 0.7),
    T: coat,
    S: mix(coat, "#000000", 0.2),
    U: mix(coat, "#000000", 0.36),
    F: legs,
    P: muzzle,
    p: mix(muzzle, coat, 0.5),
    D: nose,
    C: mix(muzzle, "#ffffff", 0.2),
    ...own,
  };
}

// The grizzly's tones: the same, with silver tips (G) and legs between the coat and the dark (L).
export function grizzlyTones(arr, own = {}) {
  const [coat, sheen, , , legs] = arr;
  return bearTones(arr, { H: mix(coat, sheen, 0.45), G: mix(sheen, "#ffffff", 0.1), L: mix(coat, legs, 0.6), ...own });
}

// A limb of the member standing: the near foot under its root, the far foot `apart` px away
// (hind far feet forward, fore far feet back), so the four legs stand apart and each shows whole.
//
// ---- The adults' build ---------------------------------------------------------------------------

const ID = (x) => x;

// Where a body point lands: column x of the spine, `f` of the way from the underside (0) to the
// back (1), moved `dx` along the spine and `drop` down, then turned into place.
function worldOf(shape, x, f, dx = 0, drop = 0) {
  const h = lerp(shape.bottom(x), shape.top(x), f) - drop;
  const c = Math.cos(rad(shape.tilt));
  const s = Math.sin(rad(shape.tilt));
  const X = shape.at(x) + dx - shape.pivot[0];
  const H = h - shape.pivot[1];
  return [shape.to[0] + X * c - H * s, shape.to[1] + X * s + H * c];
}

// Where a standing-coordinates point (x, h) sits across the standing body (0 underside, 1 back).
const across = (spec, [x, h]) => {
  const b = profile(spec.bottom)(x);
  return (h - b) / (profile(spec.top)(x) - b);
};

// The parts every pose names: the body's outline and turn, where the hips, shoulders and neck are
// rooted, the feet, the face and how each pair of legs holds.
function base(spec) {
  return {
    at: ID,
    top: profile(spec.top),
    bottom: profile(spec.bottom),
    tilt: 0,
    pivot: [0, 0],
    to: [0, 0],
    hindRoot: [spec.hind.root[0], across(spec, spec.hind.root)],
    foreRoot: [spec.fore.root[0], across(spec, spec.fore.root)],
    neck: [spec.face.neck[0], across(spec, spec.face.neck)],
    face: "level",
    head: [0, 0],
    stand: 1,
    foreStand: 1,
    paws: 0,
    hang: 0,
    sole: 0,
    apart: 1,
    flat: 0,
    doze: 0,
  };
}

const standFeet = (L) => feetAt(L.foot, L.apart);

const ADULT = {
  stand(spec) {
    return { ...base(spec), hind: standFeet(spec.hind), fore: standFeet(spec.fore) };
  },
  // Foraging: the front of the bear slopes down to the head (spec.forageDip px lower at the
  // shoulders), the nose sniffing just above the soil.
  forage(spec) {
    const b = base(spec);
    const F = spec.len - 1;
    const dip = spec.forageDip ?? 2;
    const off = (x) => Math.round(dip * smooth(clamp((x - F * 0.25) / (F * 0.75), 0, 1)));
    return {
      ...b,
      top: (x) => b.top(x) - off(x),
      bottom: (x) => b.bottom(x) - off(x),
      hind: standFeet(spec.hind),
      fore: standFeet(spec.fore),
      face: "down",
      head: spec.forageHead ?? [1, -2],
    };
  },
  // Sitting (the teddy-bear sit): rump on the ground, the body leaned back (spec.sitTilt) with a
  // full belly, the hind legs out in front with the soles facing forward, the fore paws on the lap.
  sit(spec) {
    const b = base(spec);
    const top = spec.restTop ? profile(spec.restTop) : b.top;
    const px = 2;
    const shape = {
      ...b,
      at: (x) => x * (spec.sitClose ?? 0.8),
      top,
      bottom: (x) => b.bottom(x) - (spec.sitBelly ?? 1) * (spec.bellyAt?.(x) ?? 0),
      tilt: spec.sitTilt ?? 60,
      pivot: [px, b.bottom(px)],
      to: [px, 0],
      flat: 1,
    };
    const hip = worldOf(shape, ...shape.hindRoot);
    const reach = hip[0] + (spec.sitLeg ?? 5);
    const [pawX, pawH] = spec.sitPaw ?? [4, 4];
    return {
      ...shape,
      hind: { near: [reach, 0], far: [reach + 2, 0] },
      fore: { near: [hip[0] + pawX, pawH], far: [hip[0] + pawX - 1, pawH + 1] },
      head: spec.sitHead ?? [0, 0],
      stand: 0,
      foreStand: 0,
      hang: 1,
      sole: 1,
      apart: 0.3,
    };
  },
  // Lying on the belly (sphinx-like): the belly flat on the ground and ONE back line, low at the
  // rump and rising evenly to the shoulders (spec.lie.top), the hind legs folded under with the
  // feet beside the belly, the forelegs flat out in front and the head up over them. Dozing
  // (eyesShut) it lays the chin down on the paws (`doze`).
  lie(spec) {
    const b = base(spec);
    const L = spec.lie;
    // The back stays the back (flat 0): the grizzly's silver tips show along its hump.
    const shape = { ...b, top: profile(L.top), bottom: profile(L.bottom) };
    const hip = worldOf(shape, ...shape.hindRoot);
    const shoulder = worldOf(shape, ...shape.foreRoot);
    return {
      ...shape,
      hind: { near: [hip[0] + L.hindFoot, 0], far: [hip[0] + L.hindFoot + 1, 0] },
      fore: { near: [shoulder[0] + L.reach, 0], far: [shoulder[0] + L.reach - 1, 0] },
      head: L.head,
      doze: L.doze ?? 1,
      stand: 0,
      foreStand: 0,
      paws: 1,
      apart: 0.3,
    };
  },
  // Rearing (standing up): the body upright on its own outline (spec.rear.top and .bottom: the
  // back and the belly), leaning a little forward (spec.rear.tilt) over straight hind legs under the
  // hips, a deep chest, the forearms hanging bent in front of the belly and the head on top, nose up.
  rear(spec) {
    const b = base(spec);
    const R = spec.rear;
    const shape = {
      ...b,
      at: (x) => x * R.close,
      top: profile(R.top),
      bottom: profile(R.bottom),
      tilt: R.tilt,
      pivot: [0, 0],
      to: R.to,
      hindRoot: R.hindRoot,
      foreRoot: R.foreRoot,
      neck: R.neck,
      flat: 1,
    };
    const hip = worldOf(shape, ...shape.hindRoot);
    const shoulder = worldOf(shape, ...shape.foreRoot);
    return {
      ...shape,
      hind: { near: [hip[0] + R.feet[0], 0], far: [hip[0] + R.feet[1], 0] },
      fore: {
        near: [shoulder[0] + R.paw[0], shoulder[1] - R.paw[1]],
        far: [shoulder[0] + R.paw[0] - 1, shoulder[1] - R.paw[1] + 1],
      },
      face: R.face ?? "level",
      head: R.head,
      stand: 1,
      foreStand: 0,
      hang: 1,
      apart: 0,
    };
  },
};

const shapeOf = shapeCache(ADULT);

const blend = blender({
  at: "fn",
  top: "fn",
  bottom: "fn",
  tilt: "num",
  pivot: "pt",
  to: "pt",
  hindRoot: "pt",
  foreRoot: "pt",
  neck: "pt",
  hind: "pair",
  fore: "pair",
  face: "pick",
  head: "pt",
  stand: "num",
  foreStand: "num",
  paws: "num",
  hang: "num",
  sole: "num",
  apart: "num",
  flat: "num",
  doze: "num",
});

// Is the point (px, ph) inside the polygon `pts`? (Even-odd, half-open, so a point on an edge two
// quads share falls in exactly one.)
function inside(pts, px, ph) {
  let hit = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i, i += 1) {
    const [xi, hi] = pts[i];
    const [xj, hj] = pts[j];
    if (hi > ph !== hj > ph && px < ((xj - xi) * (ph - hi)) / (hj - hi) + xi) hit = !hit;
  }
  return hit;
}

// Closes every empty pocket of 4 pixels or fewer that is walled in on all sides (not the gaps
// between legs, which open to the ground), in the colour of the pixel above it.
function pinholes(layer) {
  const NEAR = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  const keys = [...layer.keys()].map((k) => k.split("|").map(Number));
  const xa = Math.min(...keys.map((k) => k[0])) - 1;
  const xb = Math.max(...keys.map((k) => k[0])) + 1;
  const hb = Math.max(...keys.map((k) => k[1])) + 1;
  const outside = new Set([`${xa}|${hb}`]);
  const stack = [[xa, hb]];
  while (stack.length) {
    const [x, h] = stack.pop();
    for (const [dx, dh] of NEAR) {
      const nx = x + dx;
      const nh = h + dh;
      const k = `${nx}|${nh}`;
      if (nx < xa || nx > xb || nh < -1 || nh > hb || layer.has(k) || outside.has(k)) continue;
      outside.add(k);
      stack.push([nx, nh]);
    }
  }
  const seen = new Set();
  for (let x = xa; x <= xb; x += 1)
    for (let h = 0; h <= hb; h += 1) {
      const k = `${x}|${h}`;
      if (layer.has(k) || outside.has(k) || seen.has(k)) continue;
      const pocket = [[x, h]];
      seen.add(k);
      for (let i = 0; i < pocket.length; i += 1)
        for (const [dx, dh] of NEAR) {
          const n = `${pocket[i][0] + dx}|${pocket[i][1] + dh}`;
          if (!layer.has(n) && !outside.has(n) && !seen.has(n)) {
            seen.add(n);
            pocket.push([pocket[i][0] + dx, pocket[i][1] + dh]);
          }
        }
      if (pocket.length > 4 || pocket.some(([, h]) => h <= 3)) continue;
      for (const [px, ph] of pocket)
        layer.set(
          `${px}|${ph}`,
          layer.get(`${px}|${ph + 1}`) ?? layer.get(`${px - 1}|${ph}`) ?? layer.get(`${px + 1}|${ph}`),
        );
    }
}

// One bear: adults and cub alike.
export function drawBear(spec, pal, plotOut, pose) {
  const layer = new Map();
  const plot = (x, h, colour) => layer.set(`${x}|${h}`, colour);
  const { phase = 0, amp = 0, headUp = 0, blink = false, breath = 0, bodyX = null } = pose;
  const shape = pose.rest
    ? blend(shapeOf(spec, pose.rest.from), shapeOf(spec, pose.rest.to), pose.rest.u)
    : shapeOf(spec, "stand");
  const last = spec.len - 1;
  const [dropHind, dropFore] = (spec.drawnLegs ? drawnDips : walkDips)(phase, amp, spec.bob);
  const dropAt = dipAlong(dropHind, dropFore, last);
  const standing = shape.stand > 0.5 && shape.tilt < 10;
  const level = Math.abs(shape.tilt) < 1;

  // The body: one quad per spine column, from the underside to the back, its ends half a column
  // either side. Level, a column keeps one height across (so a standing bear has a crisp
  // outline); turned, its ends follow the profile, so the edge runs smooth.
  const body = new Map();
  for (let x = 0; x <= last; x += 1) {
    const drop = dropAt(x);
    const swell = breath && x >= spec.chest[0] && x <= spec.chest[1] ? 1 : 0;
    const ends = [x - 0.5, x + 0.5].map((e) => {
      const at = level ? x : clamp(e, 0, last);
      const t = shape.top(at) + (standing ? 0 : swell) - drop + 0.501;
      const b = shape.bottom(at) - (standing ? swell : 0) - drop - 0.499;
      return [e, b, t];
    });
    const pts = [
      [ends[0][0], ends[0][1]],
      [ends[1][0], ends[1][1]],
      [ends[1][0], ends[1][2]],
      [ends[0][0], ends[0][2]],
    ].map(([e, h]) => {
      const c = Math.cos(rad(shape.tilt));
      const s = Math.sin(rad(shape.tilt));
      const X = shape.at(e) - shape.pivot[0];
      const H = h - shape.pivot[1];
      return [shape.to[0] + X * c - H * s, shape.to[1] + X * s + H * c];
    });
    const xs = pts.map((p) => p[0]);
    const hs = pts.map((p) => p[1]);
    for (let X = Math.floor(Math.min(...xs)); X <= Math.ceil(Math.max(...xs)); X += 1)
      for (let H = Math.max(0, Math.floor(Math.min(...hs))); H <= Math.ceil(Math.max(...hs)); H += 1)
        if (!body.has(`${X}|${H}`) && inside(pts, X, H)) body.set(`${X}|${H}`, x);
  }
  // A turned body can leave a pixel hanging by a corner: drop it.
  if (!level)
    for (const key of [...body.keys()]) {
      const [X, H] = key.split("|").map(Number);
      const links = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ].filter(([dx, dh]) => body.has(`${X + dx}|${H + dh}`)).length;
      if (links <= 1) body.delete(key);
    }
  const columns = new Map();
  for (const key of body.keys()) {
    const [X, H] = key.split("|").map(Number);
    if (!columns.has(X)) columns.set(X, []);
    columns.get(X).push(H);
  }

  // A limb: two tapering bones from the body to the foot, filled row by row, and its paw. The far
  // root sits `apart` px from the near one along the spine, over its own foot.
  const rootOf = (L, far) => {
    const [x, f] = L.fore ? shape.foreRoot : shape.hindRoot;
    const dx = far ? Math.round((L.apart ?? spec.farShift) * shape.apart) : 0;
    return worldOf(shape, x, f, dx, dropAt(x));
  };
  const limb = (L, offset, far) => {
    // A leg under 5 px (spec.drawnLegs) that stands under the body (walking, standing,
    // foraging) is build.js's drawn short leg: rows straight down from its root, stepping through
    // reaching, under, pushed back and lifted a quarter stride apart. Each leg brings its own paw (L.paw.fwd px
    // of toe in front), so the hind feet leave the gap between the legs open. Laid out (sitting, rearing)
    // it keeps the two bones below, like the adults'.
    if (spec.drawnLegs && (L.fore ? shape.foreStand : shape.stand) > 0.5) {
      const R = rootOf(L, far);
      return drawnLimb({ ...spec, paw: L.paw }, L, {
        root: R,
        drop: 0,
        foot: Math.round(footRest(shape, L, far)[0]),
        p: frac(phase + offset),
        amp,
        stand: 1,
        paws: 0,
      });
    }
    const cells = new Map();
    const span = rowFill(cells, { kind: "leg" });
    const paw = L.paw;
    const rest = footRest(shape, L, far);
    const [reach, lift] = stepAt(frac(phase + offset), STANCE, spec.stride, spec.lift);
    const sole = rest[1] + lift * amp;
    const F = [plant(rest[0] + reach * amp, bodyX), sole + paw.h];
    const R = rootOf(L, far);
    // A standing leg is straight; each pair straightens on its own (a reared bear's hind legs are
    // straight under it while its forearms hang bent). The joints bend as the walk takes over.
    const straight = (1 - amp) * (L.fore ? shape.foreStand : shape.stand);
    const bent = joint(R, F, L.a, L.b, L.fore && shape.hang > 0.5 ? -L.bend : L.bend);
    const J = straight ? straighten(R, F, bent, straight) : bent;
    // A leg lying out sideways (sitting, lying) is filled column by column, thick at the thigh.
    const limbBone = (A, B, wA, wB) => {
      if (![A[0], A[1], B[0], B[1]].every(Number.isFinite)) return;
      if (Math.abs(B[0] - A[0]) > Math.abs(B[1] - A[1])) boneAcross(cells, A, B, wA, wB, "leg");
      else bone(span, A, B, wA, wB);
    };
    // Stretched out sitting, the hind leg stays thick to the foot (a full thigh, a stout shin).
    const out = !L.fore && shape.sole > 0.5;
    limbBone(R, J, L.w[0], out ? L.w[0] - 0.5 : L.w[1]);
    limbBone(J, F, out ? L.w[0] - 0.5 : L.w[1], out ? L.w[2] + 1 : L.w[2]);
    // The paw: a fore paw ends in claws; a hind foot is flat, heel and all (plantigrade).
    const fh = Math.round(sole);
    const px = Math.round(F[0] - L.w[2] / 2);
    pawRows(span, px, fh, Math.round(L.w[2]), paw);
    if (L.claws && fh + paw.h - 1 >= 0) {
      const cx = Math.round(px + L.w[2] + paw.fwd);
      cells.set(`${cx}|${fh}`, [cx, fh, "claw"]);
    }
    // Lying, a fore paw lies flat along the ground in front.
    if (L.fore && shape.paws > 0.5)
      for (let x = Math.round(R[0]); x <= px + L.w[2]; x += 1) cells.set(`${x}|0`, [x, 0, "leg"]);
    // Sitting, the hind foot points forward: a plate at the end of the leg, its pale pad facing
    // forward and a little up; the far foot, further out, shows its own darker pad.
    if (!L.fore && shape.sole > 0.5) {
      const sx = Math.round(F[0]);
      const n = Math.max(3, Math.round(L.w[2]) + 1);
      for (let x = sx; x <= sx + 1; x += 1) for (let h = 0; h < n; h += 1) cells.set(`${x}|${h}`, [x, h, "leg"]);
      for (let h = 0; h < n - 1; h += 1) cells.set(`${sx + 1}|${h}`, [sx + 1, h, "pad"]);
      cells.set(`${sx}|${n - 1}`, [sx, n - 1, "pad"]);
    }
    return [...cells.values()];
  };
  const paintLimb = (cells, far, armsOn = false) => {
    const has = new Set(cells.map(([x, h]) => `${x}|${h}`));
    for (const [x, h, kind] of cells) {
      if (kind === "claw") plot(x, h, pal.C);
      else if (kind === "pad") plot(x, h, far ? pal.p : pal.P);
      else {
        let key = far ? "F" : "T";
        // A near leg lit from above: where it lies over the body its top row catches the light and
        // its underside is in shade, so an arm on the belly reads as an arm.
        if (!far && h > 0 && armsOn) {
          if (!has.has(`${x}|${h + 1}`) && body.has(`${x}|${h + 1}`)) key = "H";
          else if (!has.has(`${x}|${h - 1}`) && body.has(`${x}|${h - 1}`)) key = "S";
        }
        plot(x, h, spec.legCoat?.(x, h, far, pal) ?? pal[key]);
      }
    }
  };

  paintLimb(limb(spec.hind, 0.5, true), true);
  paintLimb(limb(spec.fore, 0.75, true), true);

  // The body's tones, lit from above, laid as areas: the lit crown is 2 rows deep over the
  // crests (the rump and the shoulders) standing, and 1 elsewhere.
  for (const [X, hs] of columns) {
    hs.sort((a, b) => a - b);
    const runs = [];
    for (const h of hs) {
      const run = runs[runs.length - 1];
      if (run && h === run[1] + 1) run[1] = h;
      else runs.push([h, h]);
    }
    for (const [b, t] of runs) {
      for (let h = b; h <= t; h += 1) {
        const col = body.get(`${X}|${h}`);
        const lit = spec.litAt && standing ? spec.litAt(col) : spec.lit;
        let key = "T";
        if (h > t - lit && col >= spec.litFrom && t - b >= 3) key = "H";
        else if (h <= b + spec.under - 1 && t - b >= 2) key = "U";
        else if (h < b + (t - b) * 0.45) key = "S";
        plot(X, h, spec.coat?.(X, h, col, key, pal, t - h, shape) ?? pal[key]);
      }
    }
  }

  paintLimb(limb(spec.hind, 0, false), false, shape.sole > 0.5);
  paintLimb(limb(spec.fore, 0.25, false), false, shape.hang > 0.5);

  // The head rides the neck (carried with the body); the face grid for the pose is drawn upright
  // there. Ears are part of the grid.
  const grid = spec.face.grids[shape.face];
  const [gc, gr] = spec.face.grip[shape.face];
  const neck = worldOf(shape, ...shape.neck);
  const sniff = pose.sniff ?? 0;
  const doze = pose.eyesShut ? Math.round(shape.doze) : 0;
  const lift = Math.round(headUp * spec.headUp) - dropFore + sniff - doze;
  const hx = Math.round(neck[0] + shape.head[0] + (pose.look?.[0] ?? 0)) - gc;
  let hh = Math.round(neck[1] + shape.head[1] + (pose.look?.[1] ?? 0)) + gr + lift;
  // The head never goes below 1 px over the soil, so a foraging nose sniffs just above the ground.
  hh += Math.max(0, 1 - (hh - (grid.length - 1)));
  const eyeShut = blink || pose.eyesShut;
  let nose = null;
  const headCells = new Map();
  grid.forEach((line, r) => {
    [...line].forEach((ch, col) => {
      if (ch === ".") return;
      const key = ch === "e" ? (eyeShut ? "T" : "D") : ch;
      const h = hh - r;
      headCells.set(`${hx + col}|${h}`, pal[key]);
      if (ch === "D" && (!nose || hx + col >= nose[0])) nose = [hx + col, h];
    });
  });

  // The neck is part of the body: row by row, from the head's rear edge back to the nearest body
  // pixel, the gap is filled with the coat (lit on the top row, shaded on the throat).
  const rows = new Map();
  for (const key of headCells.keys()) {
    const [x, h] = key.split("|").map(Number);
    rows.set(h, Math.min(rows.get(h) ?? Infinity, x));
  }
  const rowTop = Math.max(...rows.keys());
  const rowLow = Math.min(...rows.keys());
  for (const [h, left] of rows) {
    if (h < 0) continue;
    let reach = null;
    for (let x = left - 1; x >= left - 4; x -= 1) {
      if (body.has(`${x}|${h}`) || headCells.has(`${x}|${h}`)) {
        reach = x;
        break;
      }
    }
    if (reach === null) continue;
    for (let x = reach + 1; x < left; x += 1) {
      const key = h === rowTop ? "H" : h === rowLow ? "S" : "T";
      headCells.set(`${x}|${h}`, spec.coat?.(x, h, spec.len - 2, key, pal, 0, shape) ?? pal[key]);
    }
  }
  for (const [key, colour] of headCells) {
    const [x, h] = key.split("|").map(Number);
    if (h >= 0) plot(x, h, colour);
  }
  pinholes(layer);
  for (const [key, colour] of layer) {
    const [x, h] = key.split("|").map(Number);
    plotOut(x, h, colour);
  }

  // Sniffing the air: faint wisps drift in on the breeze to the raised nose.
  if (pose.scent != null && nose && pal.scent) {
    for (let k = 0; k < 3; k += 1) {
      const u = frac(pose.scent * 0.7 + k / 3);
      const x = nose[0] + 2 + Math.round((1 - u) * 7);
      const h = nose[1] + Math.round(Math.sin(u * 6 + k) * 1.2) + (k - 1);
      const a = 0.75 * Math.sin(Math.PI * u);
      if (a < 0.08) continue;
      plotOut(x, h, rgba(pal.scent, a));
      plotOut(x + 1, h + (k % 2 ? 1 : 0), rgba(pal.scent, a * 0.6));
    }
  }
}

// ---- The members --------------------------------------------------------------------------------

// The black bear (1.6 m, len 14): rounder, its back low and smooth (the rump no higher than the
// shoulders), a straight face.
export const BLACK = {
  id: "black",
  capsule: true,
  len: 14,
  top: [
    [0, 8.5],
    [1, 9.5],
    [2, 10.2],
    [4, 10.3],
    [6, 10.2],
    [8, 10.5],
    [9.5, 10.8],
    [11, 10.5],
    [12, 9.5],
    [13, 8.5],
  ],
  bottom: [
    [0, 6],
    [1, 5],
    [2, 4.5],
    [3, 4.5],
    [5, 5.5],
    [7, 5.5],
    [9, 4],
    [11.5, 4],
    [12, 5],
    [13, 6],
  ],
  litAt: (x) => (x >= 8 && x <= 11 ? 2 : 1),
  lit: 1,
  litFrom: 1,
  under: 1,
  chest: [8, 11],
  bellyAt: (x) => (x >= 3 && x <= 11 ? Math.sin(((x - 3) / 8) * Math.PI) * 1.2 : 0),
  bob: 0.8,
  hind: { root: [2, 5], a: 2, b: 1.8, bend: -1, foot: 2, apart: 1, w: [4.2, 2.8, 2.2], paw: { h: 1, back: 1, fwd: 0 } },
  fore: {
    root: [10.5, 5],
    a: 2,
    b: 1.8,
    bend: 1,
    foot: 10.5,
    apart: -1,
    w: [3.6, 2.6, 2.2],
    fore: true,
    paw: { h: 1, back: 0, fwd: 1 },
  },
  farShift: 1,
  stride: 4,
  lift: 2.0,
  face: {
    neck: [12, 7.5],
    grip: { level: [1, 3], down: [1, 2], up: [1, 4] },
    grids: {
      level: [".H.....", "THT....", "TTeT...", "TTTTPPD", "STTPPp.", ".SSS..."],
      down: [".H....", "THT...", "TTeT..", "TTTTP.", ".STPPD", "..SpP."],
      up: ["....PD", ".T.PPp", "THTPp.", "TTeT..", "TTTT..", "STTS..", ".SS..."],
    },
  },
  headUp: 1,
  forageHead: [1, -2],
  forageDip: 2,
  sitClose: 0.8,
  sitTilt: 66,
  sitPaw: [3, 4],
  sitBelly: 2,
  sitLeg: 6,
  sitHead: [1, 0],
  // Lying: one back line, low at the rump (4 px) and rising evenly to the shoulders (6.5).
  lie: {
    top: [
      [0, 3],
      [0.8, 4.3],
      [2, 5.2],
      [5, 5.9],
      [9, 6.5],
      [11, 6.6],
      [12.5, 6.2],
      [13, 5.6],
    ],
    bottom: [
      [0, 1],
      [1, 0],
      [13, 0],
    ],
    hindFoot: 2,
    reach: 5,
    head: [2, 1],
    doze: 1,
  },
  // Rearing: the torso upright (its length x 0.7, so about 9 px tall from the hips), leaning a
  // little forward, a wide belly narrowing to the shoulders; the head on top.
  rear: {
    close: 0.8,
    tilt: 86,
    to: [8, 3],
    top: [
      [0, 6.5],
      [2, 7.8],
      [6, 8],
      [10, 7.2],
      [12, 6.2],
      [13, 5.6],
    ],
    bottom: [
      [0, 1.2],
      [2, 0.2],
      [5, -0.3],
      [9, 0.2],
      [11, 0.8],
      [13, 1.4],
    ],
    hindRoot: [2, 0.5],
    feet: [1.5, -1.5],
    foreRoot: [10, 0.3],
    paw: [2.5, 5],
    neck: [12.5, 0.45],
    head: [1, 0],
  },
};

// The grizzly (2.1 m, len 16): bigger and heavier, the shoulder hump its crest (13 px against the
// black bear's 11), a silver-tipped back, long claws, stouter legs, and a dished face.
export const GRIZZLY = {
  ...BLACK,
  id: "grizzly",
  len: 16,
  top: [
    [0, 8],
    [1, 10],
    [1.5, 11],
    [3, 11],
    [5.5, 10.5],
    [8, 11.5],
    [9.5, 12.5],
    [11, 13],
    [12.5, 12.5],
    [14, 11],
    [15, 9.5],
  ],
  bottom: [
    [0, 6.5],
    [1, 5.5],
    [2.5, 4.5],
    [5.5, 5],
    [9.5, 4],
    [11.5, 4],
    [14, 5.5],
    [15, 7],
  ],
  restTop: [
    [0, 8],
    [1, 10],
    [2.5, 11],
    [15, 11],
  ],
  litAt: (x) => ((x >= 2 && x <= 3) || (x >= 9 && x <= 13) ? 2 : 1),
  chest: [10, 13],
  bellyAt: (x) => (x >= 3 && x <= 13 ? Math.sin(((x - 3) / 10) * Math.PI) * 1.4 : 0),
  hind: {
    ...BLACK.hind,
    root: [3, 5],
    a: 2.3,
    b: 2,
    foot: 3,
    apart: 1.2,
    w: [4.6, 3.2, 2.4],
    paw: { h: 1, back: 1, fwd: 0 },
  },
  fore: {
    ...BLACK.fore,
    root: [12, 4.5],
    a: 2.3,
    b: 2,
    foot: 12,
    apart: -1.2,
    w: [4.0, 3.0, 2.4],
    claws: true,
    paw: { h: 1, back: 0, fwd: 1 },
  },
  stride: 5,
  lift: 2.0,
  coat: (_X, _h, col, key, pal, depth, shape) => {
    if (col >= 10 && col <= 14 && key === "H" && depth <= 1 && shape.flat < 0.5) return pal.G;
    return null;
  },
  legCoat: (_x, _h, far, pal) => (far ? null : pal.L),
  face: {
    neck: [14, 9],
    grip: { level: [1, 3], down: [1, 2], up: [1, 4] },
    grids: {
      level: ["..H.....", ".THH....", "TTTeT...", "TTTTTPPD", "STTTPPp.", ".SSS...."],
      down: ["..H....", ".THH...", "TTTeT..", "TTTTTP.", ".STTPPD", "..SSpP."],
      up: [".....PD", "..T.PPp", ".THHPp.", "TTTeT..", "TTTTT..", "STTTS..", ".SSS..."],
    },
  },
  forageDip: 2.2,
  sitClose: 0.75,
  sitPaw: [4, 4.5],
  sitLeg: 7,
  // Lying: one back line from a low rump (4) to the hump over the shoulders (7.5).
  lie: {
    top: [
      [0, 3.2],
      [0.8, 4.6],
      [2, 5.5],
      [6, 6.4],
      [10, 7.3],
      [12, 7.7],
      [13.5, 7.5],
      [15, 6.4],
    ],
    bottom: [
      [0, 1],
      [1, 0],
      [15, 0],
    ],
    hindFoot: 2,
    reach: 6,
    head: [2, 1],
    doze: 1,
  },
  rear: {
    close: 0.78,
    tilt: 86,
    to: [9, 3],
    top: [
      [0, 7.5],
      [2, 9],
      [7, 9.3],
      [10, 9],
      [12, 9],
      [13.5, 8],
      [15, 6.6],
    ],
    bottom: [
      [0, 1.2],
      [2, 0.2],
      [6, -0.3],
      [10, 0.2],
      [13, 1],
      [15, 1.6],
    ],
    hindRoot: [2.5, 0.5],
    feet: [1.5, -1.5],
    foreRoot: [11.5, 0.3],
    paw: [3, 5.5],
    neck: [14.5, 0.45],
    head: [1, 0],
  },
};

// ---- The cub, on the adults' build --------------------------------------------------------------

// A spring cub a few months old (about 0.45 m, len 8: 11.3 x 0.45^0.39 = 8.2): BLACK's design at cub
// size and in its colours, with a cub's proportions as values only. A rounder, level back (no
// shoulder crest yet), a deeper body for its length, legs 3 px (so they are drawn, not bent), a head
// that is big for the body, a lit round ear, a short muzzle. Same face grid layout as BLACK's (lit
// ear, lit crown, eye, tan muzzle and nose, shaded throat), one muzzle pixel instead of two.
export const CUB = {
  id: "cub",
  len: 8,
  top: [
    [0, 5],
    [1, 6.2],
    [2, 6.8],
    [5, 6.9],
    [6.5, 6.6],
    [7, 6],
  ],
  bottom: [
    [0, 4.2],
    [1, 3.4],
    [2, 3],
    [6, 3],
    [7, 3.6],
  ],
  lit: 1,
  litFrom: 1,
  under: 1,
  chest: [5, 7],
  bellyAt: (x) => (x >= 1 && x <= 6 ? Math.sin(((x - 1) / 5) * Math.PI) : 0),
  bob: 1,
  drawnLegs: true,
  reach: 1, // a drawn leg reaches 1 px at the foot
  pawReach: 2,
  hind: { root: [1, 3], a: 1.6, b: 1.4, bend: -1, foot: 1, apart: 1, w: [3, 2, 2], paw: { h: 1, back: 0, fwd: 0 } },
  fore: {
    root: [6, 3],
    a: 1.6,
    b: 1.4,
    bend: 1,
    foot: 6,
    apart: -1,
    w: [3, 2, 2],
    fore: true,
    paw: { h: 1, back: 0, fwd: 1 },
  },
  farShift: 1,
  stride: 3,
  lift: 1,
  face: {
    neck: [7, 4.6],
    grip: { level: [1, 3], down: [1, 2], up: [1, 4] },
    grids: {
      level: [".H...", "THT..", "TTeT.", "STTPD", ".SPp."],
      down: [".H...", "THT..", "TTeT.", "STTP.", ".SpD."],
      up: ["...PD", ".H.Pp", "THTP.", "TTeT.", "STTS.", ".SS.."],
    },
  },
  headUp: 1,
  forageHead: [1, -1],
  forageDip: 1,
  sitClose: 0.8,
  sitTilt: 62,
  sitPaw: [2, 3],
  sitBelly: 1,
  sitLeg: 3,
  sitHead: [0, 0],
  // Rearing at the trunk (the climb's lead-in): upright, the hips over the feet, so its last frame
  // stands where drawClimb's first frame does (columns 2 to 6, 7 px short of the bark).
  rear: {
    close: 0.8,
    tilt: 86,
    to: [6, 2.5],
    top: [
      [0, 4],
      [2, 4.8],
      [5, 4.8],
      [7, 4],
    ],
    bottom: [
      [0, 0.8],
      [2, 0],
      [5, 0],
      [7, 0.8],
    ],
    hindRoot: [1.5, 0.5],
    feet: [1, -1],
    foreRoot: [5.5, 0.3],
    paw: [1.5, 3],
    neck: [7, 0.45],
    face: "up",
    head: [0, 0],
  },
};

// ---- The cub's climb ----------------------------------------------------------------------------

export const STANCE = 0.65;

const RISE_IN = 0.7; // seconds the cub takes to rear up at the trunk, and to drop back
const SETTLE = 0.3; // seconds its paws take to take hold of the bark, and to let go

// The climb at `c.t` seconds in: c = { t, lead, up, hold, down, tail, height }. While it rears at the
// trunk (and drops back at the end) the answer is a rest pose for drawBear: { rest }. While it is on
// the bark it is the numbers drawClimb takes.
export function climbAt(c) {
  const climbStart = c.lead;
  const holdEnd = climbStart + c.up + c.hold;
  const off = holdEnd + c.down + SETTLE;
  if (c.t < c.lead - SETTLE) return { rest: { from: "stand", to: "rear", u: c.t / RISE_IN } };
  if (c.t >= off) return { rest: { from: "rear", to: "stand", u: (c.t - off) / RISE_IN } };
  const n = Math.max(1, Math.round(c.height / 2));
  const k = c.t - climbStart;
  let s = 0;
  if (k > 0 && k < c.up) s = (n * k) / c.up;
  else if (k >= c.up && k < c.up + c.hold) s = n;
  else if (k >= c.up + c.hold && k < c.up + c.hold + c.down) s = n - (n * (k - c.up - c.hold)) / c.down;
  const e = smooth(clamp(Math.min(c.t - (c.lead - SETTLE), off - c.t) / SETTLE, 0, 1));
  const looking = k > c.up && k < c.up + c.hold;
  return {
    s,
    e,
    rise: c.height / n,
    dx: -Math.round(2 * (1 - e)),
    look: [0, looking && Math.sin(k * 2.2) > 0.3 ? 1 : 0],
    blink: frac(c.t / 2.7) < 0.05,
    breath: Math.sin(c.t * 3) > 0.2,
  };
}

export const climbTotal = (c) => c.lead + c.up + c.hold + c.down + c.tail;

const bodyRise = (s, rise) => rise * (Math.floor(s + 1e-9) + smooth(frac(s + 1e-9)));
// Where a limb's grip is on the bark, as a height above the cub's start: it holds, then reaches up in
// the first three quarters of its own half stride.
function gripAt(base, parity, s, step) {
  const j = Math.floor(s + 1e-9);
  const q = frac(s + 1e-9);
  const done = Math.floor((j + 1 - parity) / 2);
  const active = j % 2 === parity ? smooth(clamp(q / 0.75, 0, 1)) : 0;
  return base + step * (done + active);
}

const mixPt = (a, b, u) => [lerp(a[0], b[0], u), lerp(a[1], b[1], u)];

// The climbing cub, built from parts by hand (the body stands upright against the bark, belly to the
// trunk, the head looking up it). Columns are the cub's own: the bark's face is column 7. `dx` slides
// the whole cub (it settles in against the trunk), `e` (0 to 1) is how far the paws have taken hold.
// The whole cub is lifted by the body's rise.
const CLIMB_BODY = [
  [8, 3, 6], // [row, first column, last column], rump at the bottom
  [7, 2, 6],
  [6, 2, 6],
  [5, 2, 6],
  [4, 2, 6],
  [3, 2, 5],
  [2, 3, 5],
];

export function drawClimb(pal, plotAt, { s, e, rise, dx, look, blink, breath }) {
  const lift = Math.round(bodyRise(s, rise));
  const plot = (x, h, colour) => plotAt(x, h + lift, colour);
  const step = rise * 2;
  const mark = (x, h, w, colour) => {
    for (let k = 0; k < w; k += 1) plot(Math.round(x) + k - (w - 1) + dx, Math.round(h), colour);
  };
  const stroke = (A, B, wA, wB, colour) => {
    const n = Math.max(1, Math.ceil(Math.hypot(B[0] - A[0], B[1] - A[1]) * 2));
    for (let i = 0; i <= n; i += 1) {
      const t = i / n;
      mark(lerp(A[0], B[0], t), lerp(A[1], B[1], t), Math.round(lerp(wA, wB, t)), colour);
    }
  };
  // Where each paw is: the grips on the bark, or hanging at the chest while it settles.
  const grips = {
    foreNear: [8, gripAt(9, 0, s, step) - lift],
    foreFar: [8, gripAt(8, 1, s, step) - lift],
    hindNear: [7, gripAt(1, 1, s, step) - lift],
    hindFar: [7, gripAt(0, 0, s, step) - lift],
  };
  const hang = { foreNear: [7, 5], foreFar: [6, 5], hindNear: [6, 0], hindFar: [5, 0] };
  const at = (k) => mixPt(hang[k], grips[k], e);
  const limb = (R, key, bend, a, b, wA, colour, claws) => {
    const P = at(key);
    const F = [P[0], P[1] + 1];
    const J = joint(R, F, a, b, bend);
    stroke(R, J, wA, 2, colour);
    stroke(J, F, 2, 2, colour);
    if (claws) plot(Math.round(F[0]) + 1 + dx, Math.round(F[1]), pal.C);
  };
  const shoulder = [5, 7];
  const hip = [5, 3];
  limb(hip, "hindFar", -1, 2, 2, 3, pal.F, false);
  limb(shoulder, "foreFar", 1, 2.2, 2.2, 2, pal.F, true);
  // The body: columns lit on top, shaded below, darkest underneath.
  const bob = breath ? 1 : 0;
  const cols = new Map();
  for (const [h, a, b] of CLIMB_BODY) for (let x = a; x <= b; x += 1) cols.set(x, [...(cols.get(x) ?? []), h]);
  for (const [x, hs] of cols) {
    hs.sort((p, q) => p - q);
    const lo = hs[0];
    const hi = hs[hs.length - 1];
    for (const h of hs) {
      let key = "T";
      if (h === hi) key = "H";
      else if (h === lo) key = "U";
      else if (h < lo + (hi - lo) * 0.45) key = "S";
      plot(x + dx, h + 1, pal[key]);
    }
  }
  // The head, looking up the trunk: the cub's own 'up' face, over the shoulders.
  const top = 12 + bob + look[1];
  CUB.face.grids.up.forEach((line, r) => {
    [...line].forEach((ch, c) => {
      if (ch === ".") return;
      plot(4 + c + dx + look[0], top - r, pal[ch === "e" ? (blink ? "T" : "D") : ch]);
    });
  });
  // The near limbs are a shade lighter than the body they cross, so each reads.
  limb(hip, "hindNear", -1, 2, 2, 3, pal.H, false);
  limb(shoulder, "foreNear", 1, 2.2, 2.2, 2, pal.H, true);
}

// Bears

// Built from parts (bear.js): the black bear, the grizzly (kind "grizzly") and the cub (`cub` true).
// A bear walks with its feet planted, eases to a stop and rests in the pose rest() picked as it
// stopped (bearPoses: foraging with its head down and its whole front sloping to the ground, sitting
// up on its rump, lying, or reared up to sniff the air, or just standing and looking about); standing
// it breathes, blinks and now and then lifts its head. State "rear" is the sniff the scene times: it
// rears up (the nose lifting in bursts, faint wisps of air drifting in to it) and eases back down by
// the end of b.timer, the seconds it has left. b.since (settle, critters.js) is when its state
// changed; b.pose names a pose to show on demand (with since and timer set). A cub whose b.climb is
// { t, lead, up, hold, down, tail, height } (seconds into the climb, and the tree's height in px) is
// on a trunk: x is where the cub stood, and the bark is 7 px in front of it. Its palette is the
// scene's array under b.pal or "bear" ([coat, sheen, muzzle, nose, legs]) with the scene's groundShadow
// and bearScent beside it.
const BEAR_SPECS = { black: BLACK, grizzly: GRIZZLY };
const BEAR_EASE = 0.3; // seconds a walk takes to start or stop
const BEAR_POSE = 0.7; // seconds it takes to go down to a pose or come up from it
const BEAR_POSES = new Set(["stand", "forage", "sit", "lie", "rear"]);

// The poses a bear rests in as it stops (for rest(), critters.js): the cub does not lie or rear.
export const bearPoses = (b) =>
  b.cub ? ["stand", "forage", "sit"] : ["forage", "forage", "stand", "sit", "lie", "rear"];

export function bearAt(g, b, time = 0) {
  if (g.trace) return g.trace.draw(bearAt, g, b, time);
  const spec = b.cub ? CUB : (BEAR_SPECS[b.kind] ?? BLACK);
  const colours = g.pal[b.pal ?? "bear"];
  const grizzly = b.kind === "grizzly";
  const pal = tonesFor(colours, grizzly ? "grizzly" : "bear", () => (grizzly ? grizzlyTones : bearTones)(colours));
  pal.scent = g.pal.bearScent;
  const since = sinceOf(b, time);
  const walking = b.state === "walk";
  const left = b.timer ?? 100;
  const bodyX = b.x * b.dir;
  let pose = {
    phase: bodyX / (spec.stride / STANCE),
    bodyX,
    amp: ease(walking, since, BEAR_EASE),
    breath: breathAt(time, 2.2, !walking),
    blink: blinkAt(time, b.phase ?? 0, 3.2),
  };
  let climbing = null;
  if (b.climb) {
    const c = climbAt(b.climb);
    if (c.rest) pose = { ...pose, bodyX: null, amp: 0, phase: 0, rest: c.rest, breath: 0 };
    else climbing = c;
  } else if (!walking) {
    const name = b.state === "rear" ? "rear" : BEAR_POSES.has(b.pose) ? b.pose : "stand";
    const u = Math.max(0, Math.min(1, (since - BEAR_EASE * 0.8) / BEAR_POSE, left / BEAR_POSE));
    if (name !== "stand") pose.rest = { from: "stand", to: name, u };
    const held = u >= 1;
    const burst = (t) => (t * 1.1) % 1 < 0.55 && Math.floor(t * 7) % 2 === 0;
    if (name === "rear" && held && left > 0.3) {
      pose.scent = since;
      pose.blink = false;
      pose.sniff = burst(time) ? 1 : 0;
    } else if (name === "forage" && held) pose.sniff = burst(time) ? -1 : 0;
    else if (name === "lie" && held && left > 0.8) pose.eyesShut = ((time + (b.phase ?? 0)) / 6) % 1 > 0.3;
    // Now and then it lifts its head to look about.
    else if (name === "stand" && since > 1 && since < 1.6) pose.headUp = 1;
  }
  paintAt(
    g,
    Math.round(b.x),
    feet(g, b),
    b.dir,
    (plot) => (climbing ? drawClimb(pal, plot, climbing) : drawBear(spec, pal, plot, pose)),
    climbing ? null : { colour: shadowColour(g.pal), span: feetSpan },
  );
}

export const FAMILY = {
  id: "bears",
  title: "Bears",
  group: "Animals",
  differ: "size, colour, hump",
  members: {
    bear: { spec: BLACK, realLength: 1.6, predator: true },
    grizzly: { spec: GRIZZLY, realLength: 2.1, predator: true },
  },
  drivers: {
    bearAt: {
      role: "walker",
      member: (a) => (a.cub ? "bear-cub" : a.kind === "grizzly" ? "grizzly" : "bear"),
    },
  },
};
