// Shared cast runner for scenes: one unified cast list holds both an actor's metadata (label, kind,
// family, sprites, fixed count, layer) and its behaviour (stage arrival, day/night, phone hiding,
// locomotion, crossings, circlers). `runCast(cast, custom)` returns `extras` with `extras.cast`
// derived directly from the same list so behaviour and catalogue/studio metadata cannot drift.
//
// An actor shows at all times and on phones unless it says `when: "day"` or `"night"`, or
// `phone: "hide"`; an unknown value is an error. The list's order is the drawing order: a
// scene's own drawing goes in the list as a drawStep() at the place it is drawn, behind the plants
// when it says `back: true`.

import {
  circlingPair,
  drift,
  enter,
  enterBehind,
  flyBy,
  follow,
  isNight,
  narrow,
  rest,
  settle,
  soarer,
  stride,
  stroll,
  walker,
  wander,
} from "./critters.js";
import { circlerPerch, flyByPerch, goHome } from "./perch.js";
import { rng, seedOf } from "./pixel.js";

const STREAMS = new WeakMap();

// Runs `fn` with `f.rand` temporarily bound to `stream`, isolating an actor's random draws.
export function withRand(f, stream, fn) {
  const prev = f.rand;
  f.rand = stream;
  try {
    return fn();
  } finally {
    f.rand = prev;
  }
}

// Returns a stable per-id random stream for a scene instance, usable from custom hooks too.
export function actorRand(f, id) {
  const bag = f.extra && STREAMS.get(f.extra);
  if (!bag) return f.rand;
  let stream = bag.streams.get(id);
  if (!stream) {
    stream = rng(seedOf(bag.base, id));
    bag.streams.set(id, stream);
  }
  return stream;
}

const WHEN = ["day", "night", "always"];
const PHONE = ["show", "hide"];

// Stops a cast entry whose day/night or phone rule names a value that does not exist.
function gates(spec) {
  if (spec.when !== undefined && !WHEN.includes(spec.when)) {
    throw new Error(`cast entry "${spec.id}": when must be "day", "night" or "always", got ${spec.when}`);
  }
  if (spec.phone !== undefined && !PHONE.includes(spec.phone)) {
    throw new Error(`cast entry "${spec.id}": phone must be "show" or "hide", got ${spec.phone}`);
  }
}

// Evaluates a cast entry's universal gates (stage, day/night, phone width).
export function activeFor(f, { arrives = 0, when = "always", phone = "show" }) {
  if (f.stage < arrives) return false;
  if (when === "day" && isNight(f)) return false;
  if (when === "night" && !isNight(f)) return false;
  if (phone === "hide" && narrow(f)) return false;
  return true;
}

// Reusable interval timer: fires `onFire(f, timer)` whenever `f.time >= timer.next` and schedules
// the next firing `every[0] + rand * every[1]` seconds later.
export function tickTimer(f, timer, every, onFire, active = true) {
  if (!active || f.time < timer.next) return false;
  onFire(f, timer);
  timer.next = f.time + every[0] + f.rand() * every[1];
  return true;
}

function castMeta(spec, defaultPresence = null) {
  if (!spec.label) return null;
  const meta = { label: spec.label, kind: spec.kind ?? "animal" };
  if (spec.family) meta.family = spec.family;
  if (spec.storybook) meta.storybook = true;
  const presence = spec.presence !== undefined ? spec.presence : spec.fixed ? null : defaultPresence;
  if (presence) meta.presence = presence;
  else if (spec.arrives != null) meta.arrives = spec.arrives;
  if (spec.fixed) meta.fixed = spec.fixed;
  if (spec.layer) meta.layer = spec.layer;
  if (spec.sea != null) meta.sea = spec.sea;
  if (spec.sprites) meta.sprites = spec.sprites;
  return meta;
}

// Standard ground walker: owns init, stage/phone arrival, wander/stroll, coupled settle/rest/stride
// and gated drawing.
export function walkerActor(spec) {
  const {
    id,
    arrives = 0,
    when = "always",
    phone = "show",
    scale = 1,
    props = {},
    move = null,
    poses = null,
    settleFn = settle,
    strideSpec = null,
    step = null,
    draw,
  } = spec;
  gates(spec);
  return {
    id,
    back: Boolean(spec.back || spec.layer?.includes("drawBack")),
    meta: castMeta(spec, [id]),
    init(f) {
      const extra = typeof props === "function" ? props(f) : props;
      return { ...walker(f, scale), ...extra };
    },
    onGrow(f, w) {
      if (activeFor(f, { arrives, phone })) enter(f, w);
    },
    update(f, w, dt) {
      if (!w.active) return;
      if (when !== "always" && !activeFor(f, { arrives, when, phone })) return;
      const x0 = w.x;
      if (move?.stroll != null) stroll(f, w, dt, move.stroll);
      else if (move) wander(f, w, dt, move);
      if (poses) {
        const list = typeof poses === "function" ? poses(w) : poses;
        rest(f, w, list);
      } else if (settleFn) {
        settleFn(f, w);
      }
      if (strideSpec) stride(w, x0, dt, strideSpec[0], strideSpec[1]);
      if (step) step(f, w, dt, x0);
    },
    draw(g, f, w) {
      if (!w.active) return;
      if (when !== "always" && !activeFor(f, { arrives, when, phone })) return;
      draw(g, w, f);
    },
  };
}

// A follower that trails a leader walker (e.g., cub behind bear, calf behind bison/elephant,
// foal behind zebra, pup behind seal/fox/coyote).
export function followerActor(spec) {
  const {
    id,
    lead: leadId,
    gap = 16,
    arrives = 0,
    when = "always",
    phone = "show",
    scale = 0.6,
    props = {},
    poses = null,
    settleFn = settle,
    strideSpec = null,
    step = null,
    draw,
  } = spec;
  gates(spec);
  return {
    id,
    back: Boolean(spec.back || spec.layer?.includes("drawBack")),
    meta: castMeta(spec, [id]),
    init(f) {
      const extra = typeof props === "function" ? props(f) : props;
      return { ...walker(f, scale), ...extra };
    },
    onGrow(f, w) {
      const lead = f.extra[leadId];
      if (lead?.active && activeFor(f, { arrives, phone })) enterBehind(f, w, lead, gap);
    },
    update(f, w, dt) {
      const lead = f.extra[leadId];
      if (!w.active || !lead?.active) return;
      if (when !== "always" && !activeFor(f, { arrives, when, phone })) return;
      const x0 = w.x;
      follow(w, lead, dt, gap);
      w.phase = lead.phase;
      w.state = lead.state;
      w.timer = lead.timer;
      if (poses) rest(f, w, typeof poses === "function" ? poses(w, lead) : poses);
      else if (settleFn) settleFn(f, w, lead);
      if (strideSpec) stride(w, x0, dt, strideSpec[0], strideSpec[1]);
      if (step) step(f, w, dt, x0, lead);
    },
    draw(g, f, w) {
      if (!w.active) return;
      if (when !== "always" && !activeFor(f, { arrives, when, phone })) return;
      draw(g, w, f);
    },
  };
}

// Crossing actor (flyBy, flyByPerch, drift, or underwater swimmer crossing): enforces stage +
// day/night + phone gates for both update and draw, and releases perched day birds at dusk.
export function crossingActor(spec) {
  const {
    id,
    arrives = 0,
    when = "always",
    phone = "show",
    first = 0,
    mode = "fly", // "fly" | "perch" | "drift"
    every,
    speed,
    spawn,
    margin,
    spots = null,
    small,
    odds,
    stay,
    drop,
    clearOnOff = false,
    onUpdate = null,
    draw,
  } = spec;
  gates(spec);
  return {
    id,
    back: Boolean(spec.back || spec.layer?.includes("drawBack")),
    meta: castMeta(spec, [id]),
    init(f) {
      const next = typeof first === "function" ? first(f) : first;
      return { next, bird: null, when };
    },
    update(f, slot, dt) {
      if (activeFor(f, { arrives, when, phone })) {
        // Only the options the declaration gives: the kit's own defaults (flyBy, drift, flyByPerch)
        // decide the rest, as they did before the runner.
        const given = spots ? { margin, spots, small, odds, stay, drop } : { margin };
        const opts = { every, speed, spawn: () => spawn(f) };
        for (const [k, v] of Object.entries(given)) if (v !== undefined) opts[k] = v;
        if (mode === "perch") flyByPerch(f, slot, dt, opts);
        else if (mode === "drift") drift(f, slot, dt, opts);
        else flyBy(f, slot, dt, opts);
        if (onUpdate) onUpdate(f, slot, dt);
      } else if (slot.bird?.visit) {
        // A perched bird goes home; clearOnOff "perched" also takes it off the page.
        goHome(f, slot.bird);
        if (clearOnOff) slot.bird = null;
      } else if (clearOnOff === true) {
        slot.bird = null;
      }
    },
    draw(g, f, slot) {
      if (!slot.bird) return;
      if (!activeFor(f, { arrives, when, phone })) return;
      draw(g, slot.bird, f, slot);
    },
  };
}

// Circling bird(s) in the sky (single soarer or circlingPair, with optional perch visits).
export function circlerActor(spec) {
  const {
    id,
    arrives = 0,
    when = "always",
    phone = "show",
    cy,
    phase, // where in its circle it starts; random when left out
    pair = null, // { rate, gap }
    perch = null, // { spots, stay, every }
    draw,
  } = spec;
  gates(spec);
  const defaultPresence = pair ? [`${id}[0]`, `${id}[1]`] : [id];
  return {
    id,
    back: Boolean(spec.back || spec.layer?.includes("drawBack")),
    meta: castMeta(spec, defaultPresence),
    init(f) {
      const y = typeof cy === "function" ? cy(f) : cy;
      if (pair) return circlingPair(f, y, pair).map((s) => ({ ...s, when }));
      return { ...soarer(f, y, phase), when };
    },
    update(f, state, dt) {
      const on = activeFor(f, { arrives, when, phone });
      const items = Array.isArray(state) ? state : [state];
      for (const s of items) {
        s.active = on;
        if (perch) {
          if (on) circlerPerch(f, s, dt, perch);
          else if (s.visit) goHome(f, s);
        }
      }
    },
    draw(g, f, state) {
      const items = Array.isArray(state) ? state : [state];
      for (const s of items) {
        if (s.active) draw(g, s, f);
      }
    },
  };
}

// A scene's own drawing, placed in the cast list where it is drawn: `draw(g, f)`, behind the plants
// when `back` is true. It has no state, gates or metadata of its own.
export function drawStep(id, draw, { back = false } = {}) {
  return { id, step: true, back, draw: (g, f) => draw(g, f) };
}

// Composes a single unified cast list (runnable actors + bespoke metadata entries) with
// scene-specific hooks into a standard `extras` object, exposing `extras.cast`.
// Each actor gets an independent random stream seeded from (f.seed, actor.id), so adding or
// reordering actors never shifts another actor's randomness.
export function runCast(entries, custom = {}) {
  for (const hook of ["draw", "drawBack", "drawBefore"]) {
    if (custom[hook]) throw new Error(`runCast: put the scene's own ${hook} in the cast list as a drawStep()`);
  }
  const actors = entries.filter((e) => typeof e.init === "function");
  const drawn = entries.filter((e) => typeof e.init === "function" || e.step);
  const back = drawn.filter((e) => e.back);
  const front = drawn.filter((e) => !e.back);
  const paint = (e, g, f) => {
    if (!e.step) return e.draw?.(g, f, f.extra[e.id]);
    g.trace?.step?.(e.id);
    return e.draw(g, f);
  };
  const cast = entries
    .filter((e) => !e.step)
    .map((e) => ("meta" in e ? e.meta : castMeta(e)))
    .filter(Boolean);
  return {
    cast,
    actorIds: actors.map((a) => a.id),
    init(f) {
      const base = f.seed ?? Math.floor(f.rand() * 2 ** 32);
      const streams = new Map();
      const streamFor = (key) => {
        let s = streams.get(key);
        if (!s) {
          s = rng(seedOf(base, key));
          streams.set(key, s);
        }
        return s;
      };
      const state = {};
      for (const a of actors) {
        state[a.id] = withRand(f, streamFor(a.id), () => a.init(f));
      }
      const out = custom.init
        ? { ...state, ...withRand(f, streamFor("__custom__"), () => custom.init(f, state)) }
        : state;
      STREAMS.set(out, { base, streams });
      return out;
    },
    onGrow(f) {
      for (const a of actors) {
        if (a.onGrow) withRand(f, actorRand(f, a.id), () => a.onGrow(f, f.extra[a.id]));
      }
      if (custom.onGrow) withRand(f, actorRand(f, "__custom__"), () => custom.onGrow(f));
    },
    busy(f) {
      return custom.busy ? custom.busy(f) : false;
    },
    update(f, dt) {
      for (const a of actors) {
        if (a.update) withRand(f, actorRand(f, a.id), () => a.update(f, f.extra[a.id], dt));
      }
      if (custom.update) withRand(f, actorRand(f, "__custom__"), () => custom.update(f, dt));
    },
    ...(back.length
      ? {
          drawBack(g, f) {
            for (const e of back) paint(e, g, f);
          },
        }
      : {}),
    draw(g, f) {
      for (const e of front) paint(e, g, f);
    },
  };
}
