// Birds coming down to perch, and the sky they come from. A bird crossing the page (flyByPerch) or
// circling in one part of it (circlerPerch) now and then lands on a spot the scene offers on a plant or
// a rock, perches a while on its own moves (critters.js percher), and takes off to fly on or rejoin
// its circle; flyers.js draws it on its visit with visitAt (a bird of prey, soaring.js) or smallVisitAt
// (a small flyer, smallbird.js). A visit is b.visit: { mode ("wait", "land", "perch" or "leave"), t
// and T (seconds into the mode, and its length), spot, dir, p (the percher), ... }.
import { doing, fidget, flyBy, isNight, narrow, percher, soarAt } from "./critters.js";
import { CLEARING, clamp, lerp, smooth } from "./pixel.js";
import { blendPose, movePose, perchedSmall, restRow, SMALL_MOVES, transitBird } from "./smallbird.js";
import {
  bankAt,
  beat,
  frontBird,
  PERCH_MOVES,
  PERCH_ORIGIN,
  paint,
  perchedBird,
  perchPose,
  SIDE_ORIGIN,
  sideBird,
} from "./soaring.js";

// The sky: a gliding bird's slow flap now and then, a vulture's rock, and a circler's place and pose.
const FLAP_EVERY = 26; // seconds between the slow flaps of a gliding bird
export const slowFlap = (time, phase) => beat((time + phase * 4.3) % FLAP_EVERY, FLAP_EVERY - 6, 1.4, 2);
const ROCK_SECONDS = 3; // a vulture's rock from one wing to the other and back
export const rockOf = (time, phase) => Math.sin((2 * Math.PI * (time + phase * 3)) / ROCK_SECONDS) * 0.55;
const isVulture = (kind) => kind.startsWith("vulture");

// Where a circling bird is and how it is posed: `s` is soarer()'s { cx, cy, reach, phase, rate }.
export function circlePose(kind, s, time) {
  const c = soarAt(time, s);
  const calm = smooth(clamp((time - (s.calm ?? -Infinity)) / 1.2, 0, 1));
  if (isVulture(kind)) return { x: c.x, y: c.y, pose: { bank: rockOf(time, s.phase) * calm } };
  const a = time * (s.rate ?? 0.22) + s.phase;
  const flap = slowFlap(time, s.phase);
  return { x: c.x, y: c.y, pose: { ...flap, bank: bankAt(a) * 0.9 * calm * (1 - Math.min(1, Math.abs(flap.f) * 3)) } };
}

// ---- Perching

const LAND_AHEAD = 34; // px before the perch where a bird crossing the page starts down
const PREP = 0.9; // seconds a perched bird takes to open a wing before it leaves
const FADE = 0.45; // seconds to change from the view from below to the side view
const FOOT = 3; // px the body of a landing bird is behind its feet

// The small flyers on a visit (a scene's eagle, or its circling bird, is f.extra.visiting), and how many may
// perch at once.
const SMALL_AT_ONCE = 2;
const smallVisits = (f) => (f.extra.smallVisits ??= []);
function release(f, b) {
  if (f.extra.visiting === b) f.extra.visiting = null;
  const mine = smallVisits(f);
  if (mine.includes(b)) mine.splice(mine.indexOf(b), 1);
}

// Whether a bird may perch now, and where: of `spots` ([{ x, top(time) -> { x, y } }], found by the scene on
// plants that are full grown), those clear of the sign-in card and inside the page, and, for a bird
// crossing the page, far enough ahead of it ({ x, dir }).
function pickSpot(f, spots, ahead = null, small = false) {
  if (narrow(f)) return null;
  if (small ? smallVisits(f).length >= SMALL_AT_ONCE : f.extra.visiting) return null;
  const others = [f.extra.visiting, ...smallVisits(f)].filter((b) => b?.visit);
  const ok = spots.filter((s) => {
    if (others.some((b) => Math.abs(b.visit.spot.x - s.x) < 12)) return false;
    if (Math.abs(s.x - f.cols / 2) < CLEARING + 6 || s.x < 12 || s.x > f.cols - 12) return false;
    if (s.top(f.time).y < 16) return false;
    return !ahead || (s.x - ahead.x) * ahead.dir > LAND_AHEAD + 8;
  });
  return ok.length ? ok[Math.floor(f.rand() * ok.length)] : null;
}

// Drops the spots that a plant drawn later covers, so a bird never perches on a top that is hidden. A spot is
// { x, order, top(time) }; a plant that may cover is { x, y (its top), order (its place in f.plants, which is the
// drawing order), reach (half its width) }.
export function unhidden(spots, plants, time) {
  return spots.filter((s) => {
    const y = s.top(time).y;
    return !plants.some((q) => q.order > s.order && Math.abs(q.x - s.x) <= q.reach && q.y <= y + 1);
  });
}

// Perch spots on the tops of the full-grown shrubs of `kind` (plants drawn with pixel.js's blob): `box(p)` gives
// the blob's { cx, top, w, h } as its painter draws it at full size. The perch is the first row of the blob that
// is five cells wide, so a small bird's feet land on foliage.
export function blobSpots(f, kind, mature, box) {
  const bushes = f.plants.map((p, order) => ({ p, order })).filter(({ p }) => p.kind === kind);
  const topOf = (b) => {
    for (let y = b.top; y < b.top + b.h; y += 1) {
      const ny = (y + 0.5 - (b.top + b.h / 2)) / (b.h / 2);
      if (Math.round((b.w / 2) * Math.sqrt(Math.max(0, 1 - ny * ny))) >= 2) return { x: b.cx, y };
    }
    return { x: b.cx, y: b.top };
  };
  const spots = bushes
    .filter(({ p }) => p.shown - p.born >= mature)
    .map(({ p, order }) => {
      const at = topOf(box(p));
      return { x: at.x, order, top: () => at };
    });
  const covers = bushes.map(({ p, order }) => {
    const b = box(p);
    return { x: b.cx, order, y: b.top, reach: Math.round(b.w / 2) };
  });
  return unhidden(spots, covers, f.time);
}

// Sends bird `b` to `spot`. A bird crossing the page (`flyer`) starts down when it is LAND_AHEAD short of
// the perch; a circler starts at once, from wherever its circle has got to.
function visitBegin(
  f,
  b,
  spot,
  { flyer, speed = 13, stay = [14, 28], cruise = 30, moves = PERCH_MOVES, restAt = null, drop = 0, small = false },
) {
  const dir = flyer ? b.dir : soarAt(f.time, b).x < spot.x ? 1 : -1;
  const p = percher(f, spot.x, 0, dir, moves);
  b.visit = {
    mode: flyer ? "wait" : "land",
    t: 0,
    T: 0,
    spot,
    dir,
    flyer,
    speed,
    cruise,
    restAt,
    drop,
    p,
    stay: stay[0] + f.rand() * (stay[1] - stay[0]),
  };
  if (!flyer) startLanding(f, b);
  if (small) smallVisits(f).push(b);
  else f.extra.visiting = b;
}

function startLanding(f, b) {
  const v = b.visit;
  const from = v.flyer ? { x: b.x, y: b.y + Math.sin(f.time * 1.2 + b.phase) * 2 } : soarAt(f.time, b);
  v.from = { x: from.x, y: from.y };
  v.mode = "land";
  v.t = 0;
  const gap = Math.abs(v.spot.top(f.time).x - from.x);
  v.T = v.flyer ? clamp((2 * gap) / v.speed, 3.5, 7) : clamp(gap / 9, 4, 8);
}

function endVisit(f, b) {
  const v = b.visit;
  b.visit = null;
  release(f, b);
  if (v?.flyer && v.mode === "leave") {
    const at = visitPos(b, v, f.time, v.spot.top(f.time));
    b.x = at.x;
    b.y = at.y;
    b.calm = f.time;
  } else if (v && !v.flyer) b.calm = f.time;
}

// Where the bird's body is, from how far through its visit it is. A landing bird comes to rest with its
// feet on the perch and its body FOOT px behind them.
function visitPos(b, v, time, top) {
  const rest = v.restAt ? v.restAt(top) : { x: top.x - v.dir * FOOT, y: top.y - 4 };
  if (v.mode === "land") {
    const u = clamp(v.t / v.T, 0, 1);
    if (v.flyer) {
      return { x: lerp(v.from.x, rest.x, 1 - (1 - u) ** 2), y: lerp(v.from.y, rest.y, smooth(u) ** 1.3) };
    }
    const c = soarAt(time, b);
    return { x: lerp(c.x, rest.x, smooth(u)), y: lerp(c.y, rest.y, smooth(u) ** 1.3) };
  }
  if (v.mode === "perch") return rest;
  const air = v.T - PREP;
  const u = clamp((v.t - PREP) / air, 0, 1);
  if (v.flyer) {
    return { x: rest.x + v.dir * ((v.speed * air) / 2) * u * u, y: lerp(rest.y, v.cruise, smooth(u)) };
  }
  const c = soarAt(time, b);
  return { x: lerp(rest.x, c.x, smooth(u)), y: lerp(rest.y, c.y, smooth(u) ** 0.8) };
}

// flyBy() for a bird that may end its crossing on a perch: now and then (`odds`) one picks a spot among
// `spots(f)` ahead of it, glides down to it, perches for `stay` seconds and takes off to fly on.
export function flyByPerch(f, slot, dt, o) {
  if (slot.bird && visitStep(f, slot.bird, dt)) return;
  flyBy(f, slot, dt, o);
  const b = slot.bird;
  if (!b || b.decided) return;
  b.decided = true;
  if (b.visit || (o.only && !o.only(b)) || f.rand() >= (o.odds ?? 0.5)) return;
  const spot = pickSpot(f, o.spots(f), { x: b.x, dir: b.dir }, !!o.small);
  if (!spot) return;
  const top = spot.top(f.time).y;
  const cruise = clamp(top - 22 - f.rand() * 10, 8, 80);
  // A small flyer (`small`: its kind) perches upright, on its own moves, its feet on the spot.
  const own = o.small
    ? {
        small: true,
        moves: SMALL_MOVES,
        drop: o.drop ?? 0,
        restAt: (t) => ({ x: t.x, y: restRow(o.small, t.y + (o.drop ?? 0)) }),
      }
    : {};
  visitBegin(f, b, spot, { flyer: true, speed: o.speed, stay: o.stay, cruise, ...own });
}

// A circling bird that now and then (`every`: [least, spread] seconds, the first after `first`) leaves its circle
// for a perch among `spots(f)`, and returns to it after `stay`. True while it is on a visit.
export function circlerPerch(f, s, dt, o) {
  if (s.visit && visitStep(f, s, dt)) return true;
  s.nextVisit ??= f.time + o.first[0] + f.rand() * o.first[1];
  if (s.visit || f.time < s.nextVisit) return false;
  s.nextVisit = f.time + o.every[0] + f.rand() * o.every[1];
  const spot = pickSpot(f, o.spots(f));
  if (spot) visitBegin(f, s, spot, { flyer: false, stay: o.stay, moves: o.moves });
  return !!s.visit;
}

// A day bird goes home at nightfall: its visit, if it had one, is over.
export function goHome(f, b) {
  if (!b?.visit) return;
  b.visit = null;
  release(f, b);
}

// Moves a visiting bird along (call it every update); it is true while the bird is on a visit. A bird that
// comes down while it is night goes home.
function visitStep(f, b, dt) {
  const v = b.visit;
  if (!v) return false;
  if (isNight(f)) {
    b.visit = null;
    release(f, b);
    return false;
  }
  if (v.mode === "wait") {
    if ((v.spot.top(f.time).x - b.x) * v.dir > LAND_AHEAD) return false; // still crossing the page as usual
    startLanding(f, b);
  }
  v.t += dt;
  if (v.mode === "land" && v.t >= v.T) {
    v.mode = "perch";
    v.t = 0;
  }
  if (v.mode === "perch") {
    fidget(f, v.p);
    if (v.t >= v.stay) {
      v.mode = "leave";
      v.t = 0;
      v.T = PREP + (v.flyer ? 3.6 : 5.5);
    }
  }
  if (v.mode === "leave" && v.t >= v.T) {
    endVisit(f, b);
    return false;
  }
  return true;
}

// The side-on pose of a bird landing or taking off, `k` seconds into the wing work. A landing flares:
// slow, deep beats with the feet reaching forward. A take-off beats hard at first, the feet tucking up.
function landPose(u) {
  const flarePhase = Math.max(0, u - 0.5) / 0.5;
  const f = smooth(clamp((u - 0.5) / 0.12, 0, 1)) * (0.7 + 0.3 * Math.sin(flarePhase * 11));
  return { f, v: 0.35 * Math.cos(flarePhase * 11), feet: smooth(clamp((u - 0.4) / 0.4, 0, 1)) };
}
function leavePose(k, air) {
  const f = Math.cos((2 * Math.PI * k) / 1.1) * (1 - smooth(clamp((k - 1.6) / (air - 1.6), 0, 1)));
  return { f, v: -Math.sin((2 * Math.PI * k) / 1.1) * 0.5, feet: 1 - smooth(clamp(k / 1.5, 0, 1)) };
}

// Draws a bird on its visit: gliding down, perched, or taking off.
export function visitAt(g, kind, b, time) {
  if (g.trace) return g.trace.draw(visitAt, g, kind, b, time);
  const v = b.visit;
  const top = v.spot.top(g.time); // the painter's clock, so the feet stay on the plant as it sways
  const at = visitPos(b, v, time, top);
  const side = (pose, alpha = 1) => paint(g, sideBird(g, kind, pose), at.x, at.y, v.dir, SIDE_ORIGIN, alpha);
  const front = (alpha) => {
    const c = circlePose(kind, b, time);
    paint(g, frontBird(g, kind, c.pose), at.x, at.y, 1, [0, 0], alpha);
  };
  const perched = (hold, slide, alpha = 1) => {
    const pose = perchPose(
      {
        look: doing(v.p, "look", time),
        blink: doing(v.p, "blink", time),
        preen: doing(v.p, "preen", time),
        stretch: doing(v.p, "stretch", time),
        hold,
      },
      time,
    );
    paint(g, perchedBird(g, kind, pose), top.x + slide * v.dir * FOOT, top.y, v.dir, PERCH_ORIGIN, alpha);
  };
  if (v.mode === "land") {
    const u = clamp(v.t / v.T, 0, 1);
    if (!v.flyer && v.t < FADE) {
      const k = smooth(v.t / FADE);
      front(1 - k);
      side(landPose(u), k);
    } else side(landPose(u));
  } else if (v.mode === "perch") {
    const settle = smooth(clamp(v.t / 0.9, 0, 1));
    const arrive = smooth(clamp(v.t / 0.3, 0, 1));
    if (arrive < 1) side(landPose(1), 1 - arrive);
    perched(1 - settle, -(1 - settle), arrive);
  } else {
    const air = v.T - PREP;
    const k = v.t - PREP;
    const lift = smooth(clamp((v.t - PREP * 0.6) / (PREP * 0.4), 0, 1));
    if (v.t < PREP) {
      const open = smooth(clamp(v.t / (PREP * 0.7), 0, 1));
      perched(open, -open, 1 - lift);
      if (lift > 0) side(leavePose(0, air), lift);
    } else if (!v.flyer && k > air - FADE) {
      const m = smooth((k - (air - FADE)) / FADE);
      side(leavePose(k, air), 1 - m);
      front(m);
    } else side(leavePose(k, air));
  }
}

// A small flyer on its visit (smallbird.js): it slows, rears upright and brings its feet down as it lands, then
// perches in its pose (looking about, blinking, bobbing, preening, stretching a wing, hopping round to face the
// other way), and as it leaves it opens its wings and beats away.
export function smallVisitAt(g, kind, b, time) {
  if (g.trace) return g.trace.draw(smallVisitAt, g, kind, b, time);
  const v = b.visit;
  const top = v.spot.top(g.time); // the painter's clock, so the feet stay on the plant as it sways
  const at = visitPos(b, v, time, top);
  const phase = b.phase ?? 0;
  if (v.mode === "land") {
    const u = clamp(v.t / v.T, 0, 1);
    transitBird(g, kind, at.x, at.y, v.dir, time, smooth(clamp((u - 0.45) / 0.55, 0, 1)), phase);
  } else if (v.mode === "perch") {
    const moves = movePose({
      look: doing(v.p, "look", time),
      blink: doing(v.p, "blink", time),
      bob: doing(v.p, "bob", time),
      preen: doing(v.p, "preen", time),
      stretch: doing(v.p, "stretch", time),
      hop: doing(v.p, "hop", time),
    });
    perchedSmall(g, kind, at.x, top.y + v.drop, time, moves.pose, { dir: moves.turned ? -v.dir : v.dir });
  } else {
    const open = smooth(clamp(v.t / PREP, 0, 1));
    const k = v.t < PREP ? 1 - open * 0.9 : 0;
    if (v.t < PREP * 0.5)
      perchedSmall(g, kind, at.x, top.y + v.drop, time, blendPose({ stretch: open * 2 }), { dir: v.dir });
    else transitBird(g, kind, at.x, at.y, v.dir, time, k, phase);
  }
}
