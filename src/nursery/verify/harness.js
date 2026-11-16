// The verification harness: runs the real engine (nursery.js and the scenes) under a simulated clock
// and seeded random numbers, watches which pixels each animal driver draws (the probe, see the
// header of nursery.js) and hands every frame to the rules (rules.js). One job is one scene, one
// theme and one page size, watered stage by stage.

import { P } from "../js/kit/pixel.js";
import { MAX_STAGE, Nursery, SCENES } from "../js/nursery.js";
import { classify } from "./actors.js";
import { RULES } from "./rules.js";

export const STEP = 1 / 8; // seconds of page time between simulated frames
const ZOOM = 8;
const CROP_PAD = 8;
const MAX_CROPS = 4; // pictures kept per rule in one job; every finding is still listed

// ---- The simulated page: a clock, frames and random numbers the harness owns --------------------

let now = 1000;
const frames = new Map();
let frameId = 0;
performance.now = () => now;
window.requestAnimationFrame = (callback) => {
  frames.set(++frameId, callback);
  return frameId;
};
window.cancelAnimationFrame = (id) => frames.delete(id);

let seed = 1;
Math.random = () => {
  // mulberry32
  seed = (seed + 0x6d2b79f5) >>> 0;
  let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

export const errors = []; // what the page threw or logged, with the page time
let clockNote = () => ({});
window.addEventListener("error", (e) => errors.push({ text: String(e.message), ...clockNote() }));
window.addEventListener("unhandledrejection", (e) => errors.push({ text: String(e.reason), ...clockNote() }));
const consoleError = console.error;
console.error = (...args) => {
  errors.push({ text: args.map(String).join(" "), ...clockNote() });
  consoleError(...args);
};

// Runs one simulated frame. An exception in a frame is a finding, not the end of the run.
export function step(dt = STEP) {
  now += dt * 1000;
  const due = [...frames];
  frames.clear();
  for (const [, callback] of due) {
    try {
      callback(now);
    } catch (error) {
      errors.push({ text: `exception: ${error?.stack ?? error}`, ...clockNote() });
    }
  }
}

export function viewport(width, height) {
  Object.defineProperty(window, "innerWidth", { value: width, configurable: true });
  Object.defineProperty(window, "innerHeight", { value: height, configurable: true });
}

export const SIZES = { wide: [1200, 520], phone: [390, 700] };

// ---- The probe -----------------------------------------------------------------------------------

const rgba = /^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/;
// How opaque a fillStyle is, 0..1: a hex colour is solid, an rgba() has its alpha.
function styleAlpha(style) {
  if (typeof style !== "string") return 1;
  const m = rgba.exec(style);
  return m ? (m[4] === undefined ? 1 : Number(m[4])) : 1;
}

// A drawing context that remembers each rectangle, then draws it.
function recorder(ctx, rec) {
  const state = { style: "#000" };
  return new Proxy(ctx, {
    get(target, prop) {
      if (prop === "fillRect") {
        return (x, y, w, h) => {
          rec.rects.push({
            x,
            y,
            w,
            h,
            alpha: styleAlpha(state.style) * target.globalAlpha,
            style: state.style,
          });
          target.fillRect(x, y, w, h);
        };
      }
      const value = Reflect.get(target, prop);
      return typeof value === "function" ? value.bind(target) : value;
    },
    set(target, prop, value) {
      if (prop === "fillStyle") state.style = value;
      target[prop] = value;
      return true;
    },
  });
}

class Tracer {
  constructor() {
    this.frame = [];
    this.skip = false;
  }

  // The kit's drivers call this in place of drawing: `g.trace.draw(driver, g, ...args)`. The driver
  // then runs on a copy of the painter whose context records, and whose own trace is off, so a
  // driver it calls is part of it.
  draw(driver, g, ...args) {
    const rec = { driver: driver.name, args, rects: [] };
    this.frame.push(rec);
    if (this.skip) return undefined;
    const inner = Object.create(g);
    inner.trace = undefined;
    inner.ctx = recorder(g.ctx, rec);
    return driver(inner, ...args);
  }
}

const isOpaque = (r) => r.alpha >= 0.6;

// What a draw covered: its solid pixels' box, its soft shadow's row, and its lowest solid row.
function measure(rec) {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  let shadowRow = -Infinity;
  let shadowX0 = Infinity;
  let shadowX1 = -Infinity;
  for (const r of rec.rects) {
    if (r.w <= 0 || r.h <= 0) continue;
    if (isOpaque(r)) {
      x0 = Math.min(x0, r.x);
      y0 = Math.min(y0, r.y);
      x1 = Math.max(x1, r.x + r.w - 1);
      y1 = Math.max(y1, r.y + r.h - 1);
    } else if (r.alpha > 0.05 && r.h <= 2) {
      shadowRow = Math.max(shadowRow, r.y + r.h - 1);
      shadowX0 = Math.min(shadowX0, r.x);
      shadowX1 = Math.max(shadowX1, r.x + r.w - 1);
    }
  }
  if (x0 === Infinity) return null;
  // The animal's area: how many pixels its solid parts cover, each pixel once.
  const cells = new Set();
  for (const r of rec.rects) {
    if (!isOpaque(r) || r.w <= 0 || r.h <= 0) continue;
    for (let i = 0; i < r.w; i += 1) for (let j = 0; j < r.h; j += 1) cells.add((r.x + i) * 4096 + (r.y + j));
  }
  return {
    area: cells.size,
    x0,
    y0,
    x1,
    y1,
    w: x1 - x0 + 1,
    h: y1 - y0 + 1,
    footRow: y1,
    shadowRow: shadowRow === -Infinity ? null : shadowRow,
    shadowX: shadowRow === -Infinity ? null : [shadowX0, shadowX1],
  };
}

// The object a driver draws: its first argument that is an object (a walker, a bird, a visit).
const actorOf = (args) => args.find((a) => a && typeof a === "object" && !Array.isArray(a)) ?? null;

// ---- A job ---------------------------------------------------------------------------------------

function cropOf(canvas, box) {
  const x = Math.max(0, box.x0 - CROP_PAD);
  const y = Math.max(0, box.y0 - CROP_PAD);
  const w = Math.min(canvas.width, box.x1 + CROP_PAD + 1) - x;
  const h = Math.min(canvas.height, box.y1 + CROP_PAD + 1) - y;
  const out = document.createElement("canvas");
  out.width = w * ZOOM;
  out.height = h * ZOOM;
  const c = out.getContext("2d");
  c.imageSmoothingEnabled = false;
  c.fillStyle = "#8a8f98";
  c.fillRect(0, 0, out.width, out.height);
  c.drawImage(canvas, x, y, w, h, 0, 0, out.width, out.height);
  c.strokeStyle = "#ff2d95";
  c.lineWidth = 2;
  c.strokeRect(
    (box.x0 - x) * ZOOM - 1,
    (box.y0 - y) * ZOOM - 1,
    (box.x1 - box.x0 + 1) * ZOOM + 2,
    (box.y1 - box.y0 + 1) * ZOOM + 2,
  );
  return out.toDataURL("image/png");
}

// The scenery alone: the same frame again with every traced animal skipped.
function sceneryOf(nursery, tracer) {
  tracer.skip = true;
  const kept = tracer.frame;
  tracer.frame = [];
  nursery.drawGround();
  const { width, height } = nursery.ground;
  const data = nursery.gctx.getImageData(0, 0, width, height).data;
  tracer.skip = false;
  tracer.frame = [];
  nursery.drawGround();
  tracer.frame = kept;
  return {
    width,
    height,
    data,
    // Background layers may draw foliage or rock perches with alpha 0.4 (102/255); threshold at 90.
    opaqueAt: (x, y) => x >= 0 && y >= 0 && x < width && y < height && data[(y * width + x) * 4 + 3] >= 90,
  };
}

export function makeRun(job) {
  const tracer = new Tracer();
  const { scene: sceneId, theme } = job;
  const [width, height] = SIZES[job.size];
  seed = job.seed ?? 1;
  now = 1000;
  frames.clear();
  viewport(width, height);
  document.documentElement.dataset.theme = theme;
  const ground = document.createElement("canvas");
  const water = document.createElement("canvas");
  const scene = SCENES.find((s) => s.id === sceneId);
  const nursery = new Nursery({ ground, water, reducedMotion: false, scene, stage: 0 });
  nursery.trace = tracer;
  const run = {
    job: { ...job, width, height },
    nursery,
    tracer,
    ground,
    findings: new Map(),
    crops: {},
    stats: { frames: 0, draws: {}, kinds: {}, unclassified: {} },
    tracks: new Map(),
    stage: 0,
    // The rules call this to report. `key` says which finding it is, so a fault that repeats on
    // every frame is one finding with a count.
    report(rule, key, finding) {
      const id = `${rule}|${key}`;
      const known = run.findings.get(id);
      run.onReport?.(id, finding);
      if (known) {
        known.count += 1;
        known.last = Math.round(nursery.time * 100) / 100;
        const more = finding.extreme === "min" ? finding.value < known.value : finding.value > known.value;
        if (finding.extreme && more) {
          Object.assign(known, { value: finding.value, detail: finding.detail ?? null });
          Object.assign(known, { worst: known.last, worstStage: run.stage });
        }
        return;
      }
      const at = Math.round(nursery.time * 100) / 100;
      const entry = {
        key: id,
        rule,
        scene: sceneId,
        theme,
        size: job.size,
        width,
        stage: finding.at?.stage ?? run.stage,
        time: finding.at?.time ?? at,
        last: at,
        worst: at,
        worstStage: run.stage,
        count: 1,
        actor: finding.actor ?? null,
        value: finding.value,
        unit: finding.unit ?? "",
        limit: finding.limit,
        says: finding.says,
        detail: finding.detail ?? null,
      };
      if (finding.box && Object.keys(run.crops).filter((k) => k.startsWith(rule)).length < MAX_CROPS) {
        run.crops[id] = cropOf(ground, finding.box);
        entry.crop = id;
      }
      run.findings.set(id, entry);
    },
    scenery: null,
    getScenery() {
      run.scenery ??= sceneryOf(nursery, tracer);
      return run.scenery;
    },
  };
  clockNote = () => ({
    scene: sceneId,
    theme,
    size: job.size,
    stage: run.stage,
    time: Math.round(nursery.time * 100) / 100,
  });
  return run;
}

// Gives the rules this frame's draws, matched to the same animal's draws in the frames before.
function observe(run, rules) {
  const { nursery, tracer } = run;
  const draws = [];
  for (const rec of tracer.frame) {
    const actor = actorOf(rec.args);
    const info = classify(rec.driver, actor, rec.args, run.job.scene);
    const box = measure(rec);
    const draw = { ...info, driver: rec.driver, actor, args: rec.args, box, rects: rec.rects };
    draws.push(draw);
    if (info.role === "unclassified") run.stats.unclassified[rec.driver] = 1;
    const tag = `${rec.driver}:${info.member}`;
    run.stats.draws[rec.driver] = (run.stats.draws[rec.driver] ?? 0) + 1;
    const k = run.stats.kinds[tag] ?? { n: 0, w: [99, 0], h: [99, 0] };
    run.stats.kinds[tag] = k;
    k.n += 1;
    if (box) {
      k.w = [Math.min(k.w[0], box.w), Math.max(k.w[1], box.w)];
      k.h = [Math.min(k.h[0], box.h), Math.max(k.h[1], box.h)];
    }
  }
  // Match each draw to a draw of the same driver and member last frame, the nearest in x.
  const before = run.tracks;
  const after = new Map();
  const taken = new Set();
  draws.forEach((d, i) => {
    let best = null;
    for (const [key, prev] of before) {
      if (taken.has(key) || prev.driver !== d.driver || prev.member !== d.member) continue;
      const dx = Math.abs((prev.actor?.x ?? 0) - (d.actor?.x ?? 0));
      if (dx <= 10 && (!best || dx < best.dx)) best = { key, dx, prev };
    }
    if (best) {
      taken.add(best.key);
      d.id = best.key;
      d.prev = best.prev;
      d.prevSnapshot = best.prev.snapshot;
    } else {
      run.serial = (run.serial ?? 0) + 1;
      d.id = `${d.driver}:${d.member}#${run.serial}`;
    }
    d.snapshot = snapshotOf(d.actor);
    after.set(d.id, d);
    void i;
  });
  run.tracks = after;
  const ctx = { run, nursery, job: run.job, stage: run.stage, time: nursery.time, dt: STEP, draws };
  for (const rule of rules) rule.frame?.(ctx);
}

// The few numbers of an actor a rule compares from one frame to the next.
function snapshotOf(actor) {
  if (!actor) return null;
  return { x: actor.x, c: actor.c, phase: actor.phase, state: actor.state, moving: actor.moving, time: undefined };
}

// Advances `seconds` of page time, a frame each STEP, and shows the rules every frame. It lets the
// browser breathe every few frames (the clock is simulated, so this changes nothing), which keeps
// a studio replay in an iframe from freezing the studio. `hooks.frame(run)` sees every frame and
// returns true to stop the run there.
const BREATHE = 48; // frames between pauses
export async function advance(run, seconds, rules, hooks = {}) {
  const frameCount = Math.round(seconds / STEP);
  for (let i = 0; i < frameCount && !run.stopped; i += 1) {
    run.nursery.dirty = true;
    run.tracer.frame = [];
    run.scenery = null; // the scenery of this frame, drawn again only if a rule asks for it
    step();
    run.stats.frames += 1;
    observe(run, rules);
    if (hooks.frame?.(run)) run.stopped = true;
    if (hooks.frame && i % BREATHE === BREATHE - 1) await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

// Seconds watched at stage 1 and at stage 8.
const WATCH = { early: 30, full: 150 };

// One art job. `hooks` (the studio's replay) may have start(run), called before the first frame,
// and frame(run), called after each frame's rules; frame returning true ends the run there.
export async function run(job, hooks = {}) {
  const rules = RULES.filter((rule) => !job.rules || job.rules.includes(rule.name));
  if (job.kind === "doctor") return doctor();
  if (job.kind === "engine") return engineJob(job, rules);
  if (job.kind === "static")
    return { job, findings: rules.flatMap((rule) => rule.static?.() ?? []), crops: {}, stats: {} };
  const jr = makeRun(job);
  const { nursery } = jr;
  const early = job.early ?? WATCH.early;
  const full = job.full ?? WATCH.full;
  hooks.start?.(jr);
  await advance(jr, 1, rules, hooks);
  // Stage 1 by one click, then stage 8 by one charged watering of the seven stages left.
  if (!jr.stopped) {
    nursery.sprinkle((nursery.cols / 2) * P, (nursery.groundY - 30) * P);
    jr.stage = nursery.stage;
    await advance(jr, early, rules, hooks);
  }
  if (!jr.stopped) {
    nursery.sprinkle((nursery.cols / 2) * P, (nursery.groundY - 30) * P, MAX_STAGE - 1);
    jr.stage = nursery.stage;
    await advance(jr, full, rules, hooks);
  }
  if (jr.stopped) return jr;
  const thrown = errors.splice(0);
  for (const rule of rules) rule.finish?.({ run: jr, job: jr.job, errors: thrown });
  nursery.destroy();
  return summary(jr);
}

function summary(jr) {
  return {
    job: jr.job,
    findings: [...jr.findings.values()],
    crops: jr.crops,
    stats: jr.stats,
  };
}

async function engineJob(job, rules) {
  const out = { job, findings: [], crops: {}, stats: {} };
  for (const rule of rules) {
    if (!rule.engine) continue;
    const found = await rule.engine({ job, step, viewport, SIZES, errors });
    out.findings.push(...found);
  }
  // What the page threw during the engine's own run is a finding of no-errors.
  const thrown = errors.splice(0);
  const seen = new Set();
  const collector = {
    report(rule, key, f) {
      if (seen.has(key)) return;
      seen.add(key);
      out.findings.push({
        rule,
        scene: job.scene,
        theme: "light",
        size: job.size,
        count: 1,
        ...f,
        stage: f.at?.stage ?? null,
        time: f.at?.time ?? null,
      });
    },
  };
  for (const rule of rules) rule.finish?.({ run: collector, job, errors: thrown });
  return out;
}

function doctor() {
  viewport(...SIZES.wide);
  const ground = document.createElement("canvas");
  const water = document.createElement("canvas");
  const nursery = new Nursery({ ground, water, reducedMotion: false, scene: SCENES[0], stage: 0 });
  step();
  const out = { scenes: SCENES.map((s) => s.id), frame: nursery.time > 0, errors: errors.splice(0) };
  nursery.destroy();
  return out;
}
