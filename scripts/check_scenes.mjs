// Offline deterministic scene gate and record writer: imports the real SCENES and FAMILIES, checks
// that cast, sprites and families match one to one, draws every sprite in light and dark (it must
// not throw and must paint), and runs every scene through stages 0..8 at 240 and 90 columns in light
// and dark, recording per run what each animal does, how many steps each drawn thing is drawn in
// and which is drawn before which.

import { clamp, fade, rng, smooth } from "../src/nursery/assets/js/kit/pixel.js";

// A drawing context that only counts what would paint.
function makeCtx(counter) {
  const paints = () => {
    counter.draws += 1;
  };
  const noop = () => {};
  return {
    globalAlpha: 1,
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 1,
    fillRect(_x, _y, w, h) {
      if (w > 0 && h > 0 && this.globalAlpha > 0) counter.draws += 1;
    },
    drawImage: paints,
    fill: paints,
    stroke: paints,
    fillText: paints,
    clearRect: noop,
    save: noop,
    restore: noop,
    translate: noop,
    scale: noop,
    beginPath: noop,
    arc: noop,
    moveTo: noop,
    lineTo: noop,
    closePath: noop,
  };
}

function makeCanvas(counter) {
  const ctx = makeCtx(counter);
  return {
    width: 80,
    height: 60,
    getContext() {
      return ctx;
    },
  };
}

const globalCounter = { draws: 0 };
globalThis.document = {
  documentElement: { dataset: { theme: "light" } },
  createElement(tag) {
    if (tag === "canvas") return makeCanvas(globalCounter);
    return {};
  },
};

const { SCENES } = await import("../src/nursery/assets/js/nursery.js");
const { FAMILIES } = await import("../src/nursery/assets/js/kit/families.js");
const { ANIMAL_BOX } = await import("../src/nursery/assets/js/kit/poses.js");

const familyIds = new Set(FAMILIES.map((f) => f.id));
const errors = [];
const actorMap = {};
const records = {};

const SEED = 1;
const DT = 0.25;
const STEPS_PER_STAGE = 12;

function resolvePath(extra, path) {
  if (!extra) return undefined;
  const idx = path.indexOf("[");
  if (idx === -1) return extra[path];
  const name = path.slice(0, idx);
  const index = Number(path.slice(idx + 1, -1));
  return extra[name]?.[index];
}

function sampleTarget(val) {
  if (!val || typeof val !== "object") return null;
  if ("bird" in val) {
    if (!val.bird) return null;
    const b = val.bird;
    return {
      x: typeof b.x === "number" ? b.x : null,
      y: typeof b.y === "number" ? b.y : null,
      pose: b.visit ? "perched" : "fly",
    };
  }
  if ("active" in val && !val.active) return null;
  return {
    x: typeof val.x === "number" ? val.x : typeof val.cx === "number" ? val.cx : null,
    y: typeof val.y === "number" ? val.y : typeof val.cy === "number" ? val.cy : null,
    pose: val.pose ?? val.state ?? null,
  };
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

function palettesFor(scene, theme) {
  const near = scene.palettes[theme];
  const [far, farthest = far] = scene.fade?.[theme] ?? [0.4, 0.6];
  return { near, far: fade(near, far), farthest: fade(near, farthest) };
}

for (const scene of SCENES) {
  const sid = scene.id;
  actorMap[sid] = scene.extras?.actorIds ?? [];

  for (const key of [
    "id",
    "label",
    "group",
    "tint",
    "backdrop",
    "cast",
    "sprites",
    "plantFamilies",
    "palettes",
    "paint",
    "generate",
    "soil",
    "extras",
  ]) {
    if (scene[key] == null) errors.push(`${sid}: missing required export '${key}'`);
  }

  const spriteKeys = new Set(Object.keys(scene.sprites ?? {}));
  const castSprites = new Set();
  const presencePaths = [];

  for (const entry of scene.cast ?? []) {
    if (!entry.label) errors.push(`${sid}: cast entry missing label`);
    if (!entry.kind) errors.push(`${sid}: cast entry '${entry.label}' missing kind`);
    if (entry.family && !familyIds.has(entry.family)) {
      errors.push(`${sid}: cast entry '${entry.label}' references unknown family '${entry.family}'`);
    }
    for (const p of entry.presence ?? []) {
      if (!presencePaths.includes(p)) presencePaths.push(p);
    }
    for (const stem of entry.sprites ?? []) {
      castSprites.add(stem);
      if (!spriteKeys.has(stem)) {
        errors.push(`${sid}: cast entry '${entry.label}' references missing sprite '${stem}'`);
      }
    }
  }
  for (const stem of spriteKeys) {
    if (!castSprites.has(stem)) {
      errors.push(`${sid}: sprite '${stem}' in SPRITES is not listed in cast`);
    }
  }
  for (const [plant, fam] of Object.entries(scene.plantFamilies ?? {})) {
    if (!familyIds.has(fam)) {
      errors.push(`${sid}: plantFamilies['${plant}'] references unknown family '${fam}'`);
    }
  }

  // Draw and hash every sprite in light and dark palettes at two frames.
  for (const stem of Object.keys(scene.sprites ?? {}).sort()) {
    const spec = scene.sprites[stem];
    const drawFn = typeof spec === "function" ? spec : spec?.draw;
    if (typeof drawFn !== "function") {
      errors.push(`${sid}: sprite '${stem}' has no draw function`);
      continue;
    }
    for (const theme of ["light", "dark"]) {
      let totalDraws = 0;
      for (const frame of [
        { phase: 0, time: 0 },
        { phase: 1, time: 0.5 },
      ]) {
        const counter = { draws: 0 };
        const box = (typeof spec === "object" && spec?.box) || ANIMAL_BOX;
        const g = {
          ctx: makeCtx(counter),
          pal: scene.palettes[theme],
          cols: box.w,
          groundY: box.ground,
          time: frame.time,
          theme,
        };
        try {
          drawFn(g, frame);
        } catch (err) {
          errors.push(`${sid}: sprite '${stem}' (${theme}) threw: ${err.message}`);
        }
        totalDraws += counter.draws;
      }
      if (totalDraws === 0) {
        errors.push(`${sid}: sprite '${stem}' (${theme}) drew 0 pixels`);
      }
    }
  }

  // Deterministic lifecycle simulation across themes and viewport widths.
  const runs = {};
  for (const theme of ["light", "dark"]) {
    const pals = palettesFor(scene, theme);
    for (const cols of [240, 90]) {
      const runKey = `${theme}:${cols}`;
      try {
        const rand = rng(SEED);
        const groundY = 104;
        const plants = scene.generate({ cols, groundY, rand });
        const f = {
          seed: SEED,
          cols,
          groundY,
          stage: 0,
          time: 0,
          theme,
          reduced: false,
          scene,
          plants,
          rand,
          extra: null,
        };
        f.extra = scene.extras.init(f);
        const counter = { draws: 0 };
        const ctx = makeCtx(counter);
        const g = { ctx, pal: pals.near, cols, groundY, time: 0, theme };

        const trackers = Object.fromEntries(
          presencePaths.map((p) => [
            p,
            {
              firstStage: null,
              activeSteps: 0,
              minX: Infinity,
              maxX: -Infinity,
              minY: Infinity,
              maxY: -Infinity,
              poses: new Set(),
              prevX: null,
              speedSum: 0,
              speedN: 0,
            },
          ]),
        );

        const drawnSteps = {};
        const pairs = new Set();
        for (let stage = 0; stage <= 8; stage += 1) {
          f.stage = stage;
          for (const p of plants) p.shown = stage;
          scene.extras.onGrow?.(f);

          for (let step = 0; step < STEPS_PER_STAGE; step += 1) {
            f.time += DT;
            g.time = Math.floor(f.time * 8) / 8;
            scene.extras.update?.(f, DT);

            for (const path of presencePaths) {
              const t = trackers[path];
              const sample = sampleTarget(resolvePath(f.extra, path));
              if (!sample) {
                t.prevX = null;
                continue;
              }
              if (t.firstStage === null) t.firstStage = stage;
              t.activeSteps += 1;
              if (sample.x !== null) {
                if (sample.x < t.minX) t.minX = sample.x;
                if (sample.x > t.maxX) t.maxX = sample.x;
                if (t.prevX !== null) {
                  const dx = Math.abs(sample.x - t.prevX);
                  if (dx > 0.01 && dx < 40) {
                    t.speedSum += dx / DT;
                    t.speedN += 1;
                  }
                }
                t.prevX = sample.x;
              }
              if (sample.y !== null) {
                if (sample.y < t.minY) t.minY = sample.y;
                if (sample.y > t.maxY) t.maxY = sample.y;
              }
              if (sample.pose) t.poses.add(String(sample.pose));
            }

            const order = [];
            const makeTrace = (prefix) => ({
              draw(fn, gr, ...args) {
                order.push(`${prefix}:${fn.name || "anon"}`);
                const saved = gr.trace;
                gr.trace = undefined;
                try {
                  return fn(gr, ...args);
                } finally {
                  gr.trace = saved;
                }
              },
              step(id) {
                order.push(`${prefix}:step:${id}`);
              },
            });

            // 1. Background layer (behind plants)
            g.pal = pals.near;
            g.trace = makeTrace("back");
            scene.extras.drawBack?.(g, f);
            g.trace = undefined;

            // 2. Plants (full forest painted on the final step of each stage to keep check.sh fast)
            const paintPlants = step === STEPS_PER_STAGE - 1;
            if (plants.length > 0) order.push("plants");
            if (paintPlants) {
              for (const p of plants) {
                const mat = scene.mature?.[p.kind] ?? 1;
                const s = smooth(clamp((p.shown - p.born) / mat, 0, 1));
                if (s <= 0) continue;
                g.pal = p.layer < 0 ? pals.farthest : p.layer === 0 ? pals.far : pals.near;
                scene.paint[p.kind](g, p, s, groundY + (p.layer < 1 ? 1 : p.depth));
              }
            }

            // 3. Foreground layer (in front of plants)
            g.pal = pals.near;
            g.trace = makeTrace("front");
            scene.extras.draw?.(g, f);
            g.trace = undefined;

            const seen = [...new Set(order)];
            for (const t of seen) drawnSteps[t] = (drawnSteps[t] ?? 0) + 1;
            const first = new Map();
            const last = new Map();
            order.forEach((t, i) => {
              if (!first.has(t)) first.set(t, i);
              last.set(t, i);
            });
            for (const a of seen) for (const b of seen) if (a !== b && last.get(a) < first.get(b)) pairs.add(`${a} < ${b}`);
          }
        }

        const actors = {};
        for (const path of presencePaths) {
          const t = trackers[path];
          const entry = {
            firstStage: t.firstStage,
            activeSteps: t.activeSteps,
          };
          if (t.minX <= t.maxX) entry.xRange = [round1(t.minX), round1(t.maxX)];
          if (t.minY <= t.maxY) entry.yRange = [round1(t.minY), round1(t.maxY)];
          if (t.speedN > 0) entry.speed = round1(t.speedSum / t.speedN);
          if (t.poses.size > 0) entry.poses = [...t.poses].sort();
          actors[path] = entry;
        }

        runs[runKey] = {
          drawn: Object.fromEntries(Object.entries(drawnSteps).sort()),
          order: [...pairs].sort(),
          actors,
        };
      } catch (err) {
        errors.push(`${sid}: lifecycle (${theme}, cols=${cols}) threw: ${err.message}`);
      }
    }
  }

  records[sid] = { scene: sid, runs };
}

const out = JSON.stringify({ scenes: SCENES.length, actorMap, records, errors });
if (typeof print === "function") print(out);
else console.log(out);
