// Movement shared by the scenes' animals. A walker is { active, scale, x, dir, phase, state,
// timer }; the scene draws it. A bird slot is { next, bird } and holds at most one flyer, which may
// be a flock. A percher stays where it was put and fidgets.
import { NARROW_COLS } from "./pixel.js";

// Dark mode is night in every scene: day birds stay home and night animals come out.
export const isNight = (f) => f.theme === "dark";

// On a phone the sign-in card spans the page, so scenes leave out some of their animals.
export const narrow = (f) => f.cols < NARROW_COLS;

export function walker(f, scale = 1) {
  return {
    active: false,
    scale,
    x: 0,
    dir: f.rand() < 0.5 ? 1 : -1,
    phase: f.rand() * 4,
    state: "walk",
    timer: 3,
  };
}

const SETTLED = 0.5; // share of walkers already on the page when a scene is sown
const MARGIN = 14; // art pixels kept clear of both edges for those

// Brings a walker onto the page from the edge it is facing away from. While a scene is being sown
// (a load, a switch or a resize: f.settling), about half the walkers start somewhere on the page.
export function enter(f, w) {
  if (w.active) return;
  w.active = true;
  if (f.settling && f.rand() < SETTLED) w.x = MARGIN + f.rand() * (f.cols - 2 * MARGIN);
  else w.x = w.dir > 0 ? -12 : f.cols + 12;
}

// Brings a walker in already trailing a leader that is on the page, facing the way it goes, so it
// does not cross the page to catch up.
export function enterBehind(f, w, lead, gap) {
  if (w.active) return;
  w.active = true;
  w.dir = lead.dir;
  w.x = lead.x - lead.dir * gap;
}

// Walks for a while, stops for a while, and turns round at the edges of the page. `lean` ({ dir, odds })
// makes each new walk go `dir` with that chance, for a walker making for one side of the page.
export function wander(f, w, dt, { speed, stride = 7, sit = [2, 5], walk = [3, 8], lean = null }) {
  if (!w.active) return;
  w.timer -= dt;
  if (w.state === "walk") {
    w.x += w.dir * speed * dt;
    w.phase += dt * stride;
    const leaving = (w.x < 4 && w.dir < 0) || (w.x > f.cols - 4 && w.dir > 0);
    if (w.timer <= 0 || leaving) {
      w.state = "sit";
      w.timer = sit[0] + f.rand() * (sit[1] - sit[0]);
    }
  } else if (w.timer <= 0) {
    w.state = "walk";
    const toward = lean ? lean.dir : 1;
    w.dir = w.x < 12 ? 1 : w.x > f.cols - 12 ? -1 : f.rand() < (lean ? lean.odds : 0.5) ? toward : -toward;
    w.timer = walk[0] + f.rand() * (walk[1] - walk[0]);
  }
}

// Crosses the page and, once it is off the far edge, comes back, stepping as it goes.
export function stroll(f, w, dt, speed) {
  if (!w.active) return;
  w.x += w.dir * speed * dt;
  w.phase += dt * Math.max(2, speed * 0.5);
  if (w.x < -22 || w.x > f.cols + 22) w.dir *= -1;
}

// Trails a leader at a distance.
export function follow(w, lead, dt, gap) {
  if (!w.active) return;
  w.dir = lead.dir;
  w.x += (lead.x - lead.dir * gap - w.x) * Math.min(1, dt * 1.5);
}

// Sends one flyer at a time across the page, then waits before the next. `spawn(f)` adds its
// fields, such as its height. `margin` is how far past the edge it flies before it is gone, more
// for a flock that trails behind its leader.
export function flyBy(f, slot, dt, { every, speed, spawn, margin = 14 }) {
  if (slot.bird) {
    slot.bird.x += slot.bird.dir * speed * dt;
    if (slot.bird.x < -margin || slot.bird.x > f.cols + margin) {
      slot.bird = null;
      slot.next = f.time + every[0] + f.rand() * every[1];
    }
  } else if (f.time >= slot.next) {
    const dir = f.rand() < 0.5 ? 1 : -1;
    slot.bird = { dir, x: dir > 0 ? -12 : f.cols + 12, phase: f.rand() * 6, ...spawn(f) };
  }
}

// The members of a flock as offsets behind and beside its leader: a loose, staggered line that
// trails back `gap` pixels per bird, each with its own wingbeat.
// Where a bird that circles in one part of the sky is at `time`: it loops round (cx, cy), `reach` wide,
// and banks at each end, like the rainforest's serpent eagle. It never crosses the whole page. `phase`
// puts it on its loop, so two birds can circle near each other.
// A flyby that drifts instead of running level, like an owl's: it speeds up a little as it sinks and
// slows as it climbs, on two slow waves. `spawn` gives its mean height `y`; its other options are
// flyBy's.
export function drift(f, slot, dt, { every, speed, spawn, margin = 14 }) {
  const b = slot.bird;
  if (b) {
    b.age += dt;
    b.x += b.dir * speed * (1 + 0.2 * Math.cos(b.age * 0.9)) * dt;
    b.y = b.base + 5 * Math.sin(b.age * 0.9) + 3 * Math.sin(b.age * 0.37 + 1);
    if (b.x < -margin || b.x > f.cols + margin) {
      slot.bird = null;
      slot.next = f.time + every[0] + f.rand() * every[1];
    }
  } else if (f.time >= slot.next) {
    const dir = f.rand() < 0.5 ? 1 : -1;
    const start = { dir, x: dir > 0 ? -12 : f.cols + 12, phase: f.rand() * 6, age: 0, ...spawn(f) };
    slot.bird = { ...start, base: start.y };
  }
}

export function soarAt(time, s) {
  const a = time * (s.rate ?? 0.22) + s.phase;
  return {
    x: s.cx + Math.cos(a) * s.reach,
    y: s.cy + Math.sin(a * 2) * 4,
    dir: Math.sin(a) > 0 ? -1 : 1,
    bank: Math.abs(Math.sin(a)) < 0.3,
  };
}

// A new circling slot in the sky above the page's middle: `cy` rows down, `reach` at most a fifth wide.
export function soarer(f, cy, phase = f.rand() * 6) {
  return { active: false, cx: f.cols * (0.3 + f.rand() * 0.4), cy, reach: Math.max(30, f.cols * 0.2), phase };
}

export function flock(f, size, gap, rise = 3) {
  return Array.from({ length: size }, (_, i) => ({
    back: i * gap + (i ? Math.round(f.rand() * 3) : 0),
    up: i === 0 ? 0 : Math.round((i % 2 ? -1 : 1) * rise * (0.5 + f.rand() * 0.5)),
    phase: f.rand() * 6,
  }));
}

// An animal that stays put on a perch (a rock, a branch, a cliff top) and fidgets: each of its
// moves, such as { blink: { every: [2, 5], lasts: 0.2 } }, comes round on its own timer.
export function percher(f, x, y, dir, moves) {
  const timers = {};
  for (const [name, m] of Object.entries(moves)) {
    timers[name] = { ...m, next: f.time + m.every[0] + f.rand() * (m.every[1] - m.every[0]), until: -1 };
  }
  return { x, y, dir, phase: f.rand() * 6, moves: timers };
}

// Starts any move whose turn has come. Moves never overlap: one waits while another is playing.
export function fidget(f, p) {
  const busy = Object.values(p.moves).some((m) => f.time < m.until);
  for (const m of Object.values(p.moves)) {
    if (f.time < m.next) continue;
    if (busy) {
      m.next = f.time + 0.5;
      continue;
    }
    m.until = f.time + m.lasts;
    m.next = m.until + m.every[0] + f.rand() * (m.every[1] - m.every[0]);
    return;
  }
}

// How far through a move a percher is, from 0 to 1, or -1 when it is not doing it.
export function doing(p, name, time) {
  const m = p.moves[name];
  if (!m || time >= m.until) return -1;
  return 1 - (m.until - time) / m.lasts;
}
