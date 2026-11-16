// The build the hoofed families share, on build.js's engine: the horses (horse.js), the wild cattle
// and sheep (bovid.js), the deer (deer.js) and the giraffe (giraffe.js). The four-beat walk and the
// walk's dip, the hoofed rest shapes (stand, graze, lie, back, sit) and their blend, a long leg of two
// bones (a full thigh behind) and its dark hoof row; and for the animals that roll onto their backs
// (the horses and the bovids) the frame of a draw (its shape, dips, shake and the turn over), the
// rolling, kicking, stamping leg, the leg's tones, the ears, the tail, the body, the haunch, the neck
// and its mane, and the head with its ears (and horns) placed on the neck's end.
//
// Coordinates are the animal's own, as in every family: x runs from the rump (0) toward the nose and
// h is the height above the ground; a point is [x, h]. Legs return cells ([x, h, key]); the painting
// parts take `put(x, h, colour)` and `P(key)`, the family's palette lookup.
//
// A family supplies its standing feet (feet(spec, L)), how far the shoulders dip to graze, its own
// rest shapes beyond these, its specs, its tones and a draw function that composes these parts.
import {
  blender,
  bone,
  coatKey,
  column,
  curve,
  dipAlong,
  foldKnee,
  footRest,
  haunch,
  joint,
  mixPt,
  plant,
  profile,
  rowFill,
  standFeet,
  stepAt,
  straighten,
} from "./build.js";
import { clamp, frac, hash, lerp, smooth } from "./pixel.js";

// Muybridge's horse walk: four beats, each hoof a quarter stride after the one before (near hind,
// near fore, far hind, far fore), a hoof down about two thirds of the stride.
export const GAIT = { at: [0, 0.25, 0.5, 0.75], stance: 0.65 };

// How far the hips and the shoulders dip with the walk (`amp` 0 still, 1 walking), twice a stride,
// in turn, by up to `bob` px. [hind, fore].
export function hoofDips(phase, amp, bob) {
  const wave = 0.5 + 0.5 * Math.cos(4 * Math.PI * phase);
  return [Math.round(amp * wave * bob), Math.round(amp * (1 - wave) * bob)];
}

// ---- Poses ------------------------------------------------------------------------------------

// Standing feet: the far hoof spec.farShift on from the near one (or the leg's own L.farShift).
export const hoofFeet = (spec, L) => standFeet(L.foot, L.farShift ?? spec.farShift, L.stand);

// The hoofed rest shapes on a family's standing feet, feet(spec, L): stand, graze, lie, back and sit.
// Grazing, the body is lifted dip(spec, x) at column x (the shoulders and the back go down).
export function hoofShapes(feet, dip) {
  const SHAPES = {
    stand(spec) {
      return {
        off: () => 0,
        hind: feet(spec, spec.hind),
        fore: feet(spec, spec.fore),
        head: 0,
        stand: 1,
        fold: 0,
        haunch: 0,
        flip: 0,
        footH: 0,
      };
    },
    // Grazing: legs straight, the fore hooves a step forward and apart so the shoulders lean over
    // them, the neck swung down until the muzzle is in the grass; the shoulders and back dip with it.
    graze(spec) {
      const fore = feet(spec, spec.fore);
      return {
        ...SHAPES.stand(spec),
        off: (x) => dip(spec, x),
        fore: { near: [fore.near[0] + 1, 0], far: [fore.far[0] - 1, 0] },
        head: -1,
      };
    },
    // Lying on the chest: the belly a pixel off the ground, the hind hock out behind with the hoof
    // under the belly, the fore knee folded in front of the chest, the neck up.
    lie(spec) {
      const bottom = profile(spec.bottom);
      const hx = spec.hind.root[0];
      const fx = spec.fore.root[0];
      return {
        off: (x) => 1 - bottom(x),
        hind: { near: [hx + 3, 0], far: [hx + 4, 0] },
        fore: { near: [fx - 1, 0], far: [fx - 2, 0] },
        hindJ: { near: [hx - 1.5, 0.5], far: [hx - 0.5, 0.5] },
        foreJ: { near: [fx + 2, 0], far: [fx + 1, 0] },
        head: 0,
        neckUp: 1,
        stand: 0,
        fold: 1,
        haunch: 1,
        flip: 0,
        footH: 0,
      };
    },
    // On the back: the lying body turned over, belly up, the legs straight out of it into the air
    // (they are drawn hanging below the belly and the whole animal is flipped), the head laid on the
    // ground.
    back(spec) {
      const lie = SHAPES.lie(spec);
      return {
        ...lie,
        hind: feet(spec, { ...spec.hind, foot: spec.hind.foot + 1 }),
        fore: feet(spec, { ...spec.fore, foot: spec.fore.foot - 2 }),
        hindJ: null,
        foreJ: null,
        neckUp: 0,
        neckV: spec.neck.back,
        stand: 0.85,
        fold: 0,
        haunch: 0,
        flip: 1,
        footH: -1,
      };
    },
    // Sitting back on the haunches like a dog (Eeyore): the rump on the ground, the fore legs
    // straight, the body tilted up to the shoulders.
    sit(spec) {
      const hx = spec.hind.root[0];
      const bottom = profile(spec.bottom);
      const rear = -(bottom(0) - 0.5);
      return {
        ...SHAPES.stand(spec),
        off: (x) => rear * (1 - smooth(clamp((x - spec.len * 0.12) / (spec.len * 0.5), 0, 1))),
        hind: { near: [hx + 3, 0], far: [hx + 4, 0] },
        hindJ: { near: [hx - 1.5, 0.5], far: [hx - 0.5, 0.5], w: 1 },
        haunch: 1,
        head: spec.sitHead ?? 0,
      };
    },
  };
  return SHAPES;
}

// The shape cache's finish: on its back, the animal turns over about the middle of its deepest column.
export function flipCentre(shape, spec, name) {
  if (name === "back") {
    const top = profile(spec.top);
    const bottom = profile(spec.bottom);
    let hi = 0;
    for (let x = 0; x < spec.len; x += 1) hi = Math.max(hi, top(x) - bottom(x) + 1);
    shape.flipC = (1 + hi) / 2;
  }
  return shape;
}

// Two poses blended. Going down to lie, the fore end leads (the animal drops to its knees first);
// getting up, the hind end leads, as it rises rump first. Rolling onto the back is no fold. The
// neck's turn on the back (neckV) eases in and out with its own weight.
export const blend = blender(
  {
    off: "fn",
    hind: "pair",
    fore: "pair",
    hindJ: "fold",
    foreJ: "fold",
    head: "num",
    neckUp: "num",
    stand: "num",
    fold: "num",
    haunch: "num",
    flip: "num",
    footH: "num",
  },
  {
    lead: { hind: ["hind", "hindJ"], fore: ["fore", "foreJ"], together: (A, B) => A.flip === B.flip },
    more: (A, B, v) => ({
      neckV:
        A.neckV || B.neckV
          ? mixPt(A.neckV ?? [0, 0], B.neckV ?? [0, 0], A.neckV && B.neckV ? v : A.neckV ? 1 - v : v)
          : null,
      neckVw: lerp(A.neckV ? 1 : 0, B.neckV ? 1 : 0, v),
      flipC: B.flipC ?? A.flipC,
    }),
  },
);

// The pose's shape: its rest shape (from shapeOf), or two blended by `mix` (by default the hoofed
// blend) while pose.rest moves from one to the other.
export function restShape(spec, shapeOf, pose, mix = blend) {
  return pose.rest
    ? mix(shapeOf(spec, pose.rest.from), shapeOf(spec, pose.rest.to), pose.rest.u, spec.len - 1)
    : shapeOf(spec, "stand");
}

// ---- Legs -------------------------------------------------------------------------------------

// Where a leg leaves the body: its root moved dx along and dipped with the walk.
export function hoofRoot(L, shape, dx, dropHind, dropFore) {
  return [L.root[0] + dx, L.root[1] + shape.off(L.root[0]) - (L.fore ? dropFore : dropHind)];
}

// A long leg from the root R to the foot F: the knee or the hock bent by the joint, straightened
// `straight` of the way, folded to the shape's resting joint; two bones (the hind one's upper a full
// thigh) filled row by row, on the `ground` or not, no row narrower than `min`, rows keyed `key` (see
// build.js's bone). Returns { cells, J }: the cells Map and the joint.
export function hoofLeg(shape, L, far, R, F, straight, { ground = true, min = 1, key } = {}) {
  const cells = new Map();
  const span = rowFill(cells, { ground });
  const J = foldKnee(shape, L, far, straighten(R, F, joint(R, F, L.a, L.b, L.bend), straight));
  bone(span, R, J, L.w[0], L.w[1], { centre: true, thigh: !L.fore, min, key });
  bone(span, J, F, L.w[1], L.w[2], { centre: true, min, key });
  return { cells, J };
}

// The hoof: a dark row (K) at the foot F, spec.hoof pixels wide; on the `ground`, none below it.
export function hoofRow(cells, spec, L, F, ground = true) {
  const fh = Math.round(F[1]);
  if (ground && fh < 0) return;
  const hx = Math.round(F[0] - L.w[2] / 2 + 0.5);
  for (let x = hx; x < hx + spec.hoof; x += 1) cells.set(`${x}|${fh}`, [x, fh, "K"]);
}

// ---- Rolling animals: the frame of a draw --------------------------------------------------------

// Turning over: the animal is squashed through its middle and comes out the other way up, the lit
// side going with the back. `put(x, h, colour)` plots through the turn (into `painted`, if given);
// `inv` says the animal is upside down.
export function flipper(shape, plot, painted = null) {
  let kFlip = 1 - 2 * shape.flip;
  if (Math.abs(kFlip) < 0.45) kFlip = shape.flip < 0.5 ? 0.45 : -0.45;
  const FC = shape.flipC ?? 0;
  const put = (x, h, c) => {
    const m = shape.flip > 0 ? Math.round(FC + kFlip * (h - FC)) : h;
    if (m >= 0) {
      painted?.add(`${x}|${m}`);
      plot(x, m, c);
    }
  };
  return { put, inv: kFlip < 0 };
}

// What a rolling animal's draw works from: its shape (shapeOf's rest shapes, blended), the walk's dips
// (dropHind, dropFore, dropAt), the body's shudder sideways (sx, from pose.shake), the palette lookup
// P, and `put` through the turn over (into `painted`, if given), `putBody` shaken, `inv` upside down.
export function hoofFrame(spec, shapeOf, pal, plot, pose, painted = null) {
  const shape = restShape(spec, shapeOf, pose);
  const [dropHind, dropFore] = hoofDips(pose.phase ?? 0, pose.amp ?? 0, spec.bob);
  const sx = Math.round(pose.shake ?? 0);
  const { put, inv } = flipper(shape, plot, painted);
  return {
    shape,
    dropHind,
    dropFore,
    dropAt: dipAlong(dropHind, dropFore, spec.len - 1),
    sx,
    P: (key) => pal[key] ?? key,
    put,
    putBody: (x, h, c) => put(x + sx, h, c),
    inv,
  };
}

// A rolling animal's leg, its step `offset` into the stride: planted by pose.bodyX, waving (pose.kick)
// when rolled over, its root dipped and shaken with the frame `f`; `stamp` (0 to 1) lifts the foot
// and bends the leg. Returns { cells, F }: the leg's cells (no hoof yet) and the foot.
export function hoofLimb(spec, f, pose, L, offset, far, stamp = 0) {
  const { shape } = f;
  const amp = pose.amp ?? 0;
  const [reach, lift] = stepAt(frac((pose.phase ?? 0) + offset), GAIT.stance, spec.stride, spec.lift);
  const kick = (pose.kick ?? 0) * (L.fore ? -1 : 1) * (far ? -1 : 1);
  const fx = plant(footRest(shape, L, far)[0] + reach * amp + kick * 1.6, pose.bodyX ?? null);
  const R = hoofRoot(L, shape, (far ? (L.farShift ?? spec.farShift) : 0) + f.sx, f.dropHind, f.dropFore);
  const F = [
    fx,
    stamp * 2.4 +
      lift * amp +
      (shape.footH ? R[1] + shape.footH * (L.a + L.b) * 0.95 * (1 - Math.abs(kick) * 0.12) : 0) +
      Math.abs(kick) * 0.4,
  ];
  const straight = (1 - amp) * shape.stand * (1 - stamp);
  const { cells } = hoofLeg(shape, L, far, R, F, straight, { ground: false, min: L.min ?? 1 });
  return { cells, F };
}

// ---- Rolling animals: the parts ------------------------------------------------------------------

// A leg's cells painted: the thigh, the hoof (K) and the leg in the spec's coats or its tones.
export function paintHoofLimb(spec, pal, put, cells, far) {
  const lowest = Math.min(...cells.map((c) => c[1]));
  for (const [x, h, key] of cells) {
    if (key === "thigh") put(x, h, spec.thighCoat ? spec.thighCoat(x, h, far, pal) : far ? pal.l : pal.S);
    else if (key === "K") put(x, h, far ? pal.kS : pal.kT);
    else put(x, h, spec.legCoat ? spec.legCoat(x, h, far, pal, h - lowest) : far ? pal.l : pal.L);
  }
}

// An ear (the near one, or the far one behind the head) grown from the head placed at `anchor`
// ([x, h, anchor column, anchor row, head]), flicking (pose.ear) and swinging loose (pose.flop).
export function hoofEar(spec, pose, anchor, near, put, P) {
  if (!spec.ear || !anchor[4].ear) return;
  const [ex, eh, ac, ar, head] = anchor;
  const E = spec.ear;
  const flick = clamp((pose.ear ?? 0) * (near ? 1 : 0.7), 0, 1);
  const swing = (pose.flop ?? 0) * (near ? 1 : -0.8);
  const angle = lerp(E.rest, E.flick, flick) + swing * 0.25 + (near ? 0 : (E.far ?? 0));
  const [bc, br] = head.ear;
  const bx = ex - ac + bc + (near ? 0 : (E.farDx ?? 0));
  const bh = eh + ar - br;
  const len = E.len + (near ? 0 : -0.4);
  for (let i = 0; i <= 12; i += 1) {
    const t = i / 12;
    const droop = E.droop ? E.droop * t * t : 0;
    const px = bx + Math.cos(angle) * len * t;
    const ph = bh + Math.sin(angle) * len * t - droop * len;
    const w = lerp(E.w, 0.8, t);
    for (let dx = -1; dx <= 1; dx += 1) {
      for (let dh = -1; dh <= 1; dh += 1) {
        if (Math.hypot(dx, dh) > w * 0.5 + 0.2) continue;
        const key = near
          ? E.inner && (E.innerAll || t < 0.5) && Math.abs(dh) < 1 && dx === 0 && w > 1.5
            ? E.inner
            : E.near
          : E.far;
        put(Math.round(px) + dx, Math.round(ph) + dh, P(key));
      }
    }
  }
}

// The tail hangs from the rump and sways with the step; its tuft is a pixel wider. Lying, it lies
// along the ground behind the rump.
export function hoofTail(spec, shape, dropHind, sway, put, P) {
  const tail = spec.tail;
  const t0 = [tail.points[0][0], tail.points[0][1] + shape.off(0) - dropHind];
  const t1 = [tail.points[1][0], tail.points[1][1] + shape.off(0) - dropHind];
  const t2 = [tail.points[2][0] + sway * tail.sway, tail.points[2][1] + shape.off(0) - dropHind];
  if (shape.fold > 0.6 || shape.flip > 0.5) {
    t1[0] -= 0.5;
    t2[0] -= 1;
    t2[1] = Math.max(t2[1] - 4, 1);
  }
  curve(t0, t1, t2, 24, (x, h, t) => {
    const wide = tail.tuftFrom !== undefined && t >= tail.tuftFrom ? tail.w + 1 : tail.w;
    for (let k = 0; k < wide; k += 1) put(x - k, Math.max(0, h), P(tail.colour(t, k)));
  });
}

// The body, column by column: lit along the back (turned over, the lit side goes with the back),
// shaded low, darkest beneath, in the spec's coat.
export function hoofBody(spec, pal, shape, dropAt, breath, inv, put) {
  const top = profile(spec.top);
  const bottom = profile(spec.bottom);
  const standing = shape.fold < 0.5 && shape.flip < 0.5;
  for (let x = 0; x < spec.len; x += 1) {
    const [b, t] = column(spec, top, bottom, x, shape.off(x), dropAt(x), breath, standing);
    for (let h = b; h <= t; h += 1) {
      const dh = inv ? t - h : h - b;
      const key = coatKey(spec, x, dh, t - b);
      put(x, h, spec.coat ? spec.coat(x, dh, t - b, key, pal) : pal[key]);
    }
  }
}

// Lying, a round haunch over the folded hind leg.
export function hoofHaunch(spec, pal, shape, sx, put) {
  if (!(shape.haunch > 0.6 && shape.flip < 0.5)) return;
  const [rx, ry] = spec.haunch;
  const cx = spec.hind.root[0] + 0.5 + sx;
  haunch(cx, ry, rx, ry, 0, (x, h, key) =>
    put(x, h, spec.thighCoat ? spec.thighCoat(x - sx, h, false, pal, key) : pal[key]),
  );
}

// The neck: a thick bone from the withers to the head, lit along its crest. Its end swings with the
// head's attitude, and the mane stands up from the crest, so it leans, lifts and dips with the neck.
// A neck with `reach` runs on past the head in its own dark (dM: the bison's beard), behind what is
// already `painted`. Returns the neck's end, where the head goes.
export function hoofNeck(spec, pal, shape, attitude, sx, dropFore, put, P, painted = null) {
  const N = spec.neck;
  const [bx, bh] = N.base;
  const B = [bx + sx, bh + shape.off(bx) - dropFore];
  const dir = attitude < 0 ? mixPt(N.level, N.low, -attitude) : mixPt(N.level, N.high, attitude);
  const up = shape.neckUp ?? 0;
  let v = mixPt(dir, N.lying ?? N.level, attitude < 0 ? 0 : up);
  if (shape.neckV) v = mixPt(v, shape.neckV, shape.neckVw ?? 1);
  const E = [B[0] + v[0], B[1] + v[1]];
  const len = Math.hypot(v[0], v[1]);
  const ux = v[0] / len;
  const uh = v[1] / len;
  const maneH = N.mane ?? 0;
  for (let x = Math.floor(Math.min(B[0], E[0]) - 4); x <= Math.ceil(Math.max(B[0], E[0]) + 4); x += 1) {
    for (let h = Math.floor(Math.min(B[1], E[1]) - 5); h <= Math.ceil(Math.max(B[1], E[1]) + 5); h += 1) {
      const rx = x - B[0];
      const rh = h - B[1];
      const along = (rx * ux + rh * uh) / len;
      if (along < -0.15 || along > 1.05 + (N.reach ?? 0) / len) continue;
      const across = -rx * uh + rh * ux; // + toward the crest
      const half = lerp(N.w[0], N.w[1], clamp(along, 0, 1)) / 2;
      const spike =
        maneH && along < (N.maneTo ?? 0.9) && along > 0.05
          ? N.maneSolid
            ? maneH
            : maneH * (0.55 + hash(Math.round(along * len), 0, 3) * 0.75)
          : 0;
      if (across < -half || across > half + spike) continue;
      if (N.reach && along > 1.05 && painted.has(`${x + sx}|${h}`)) continue;
      const crest = across > half;
      const key = crest ? "mane" : N.reach && along > 1.05 ? "dM" : N.colour(along, across / half, along * len, pal);
      put(x, h, crest ? P(N.maneKey ? N.maneKey(Math.round(along * len)) : "kT") : P(key));
    }
  }
  return E;
}

// Which head the attitude shows: lowered to graze, raised, or level.
export const headFor = (attitude) => (attitude <= -0.5 ? "low" : attitude >= 0.6 ? "high" : "level");

// The head's grid placed with its anchor at the neck's end (anchor = [x, h, column, row, head]); the
// eye shut to the spec's lid while it blinks.
export function hoofHead(spec, anchor, blink, put, P) {
  const [ex, eh, ac, ar, head] = anchor;
  head.grid.forEach((line, r) => {
    [...line].forEach((ch, c) => {
      if (ch === ".") return;
      const key = ch === "e" && blink ? spec.lid : ch;
      put(ex + c - ac, eh + ar - r, P(key));
    });
  });
}

// The front of a rolling animal: the neck from the frame `f`, then the head on its end with its ears
// (the far one hidden while it is upside down). `pick(head, pose)` may swap the head the attitude
// shows; `horn(anchor, near)` draws a horn behind the far ear's layer and over the near one's.
export function hoofFront(spec, pal, pose, f, { painted = null, pick = (head) => head, horn = null } = {}) {
  const { shape, putBody, P } = f;
  const attitude = clamp(shape.head + (pose.head ?? 0), -1, 1);
  const E = hoofNeck(spec, pal, shape, attitude, f.sx, f.dropFore, putBody, P, painted);
  const head = pick(spec.heads[headFor(attitude)], pose);
  const anchor = [Math.round(E[0]), Math.round(E[1]), head.anchor[0], head.anchor[1], head];
  if (shape.flip < 0.5) hoofEar(spec, pose, anchor, false, putBody, P);
  horn?.(anchor, false);
  hoofHead(spec, anchor, pose.blink, putBody, P);
  hoofEar(spec, pose, anchor, true, putBody, P);
  horn?.(anchor, true);
}
