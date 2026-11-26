// The catalogue page. `nursery catalog` serves it in headless Chrome, runs each scene through its
// stages and leaves the findings in window.__result. Reads scene.cast and scene.sprites directly
// from the scene modules (no copied/rewritten source files).

import { rng } from "./js/kit/pixel.js";
import { MAX_STAGE, Nursery, SCENES } from "./js/nursery.js";
import { ANIMAL_BOX, inventory, PLANT_BOX, paintPlant, paintSprite, plantExamples } from "./sprites.js";

const SIM = { seconds: 60, dt: 0.1 };
const params = new URLSearchParams(location.search);
const IDS = params.get("ids") ? params.get("ids").split(",") : SCENES.map((s) => s.id);

// Draws on a clear art canvas and throws when nothing was drawn, so a pose that breaks shows up.
function drawOnce(width, height, draw) {
  const art = document.createElement("canvas");
  art.width = width;
  art.height = height;
  const ctx = art.getContext("2d");
  draw(ctx);
  const data = ctx.getImageData(0, 0, width, height).data;
  for (let i = 3; i < data.length; i += 4) if (data[i] > 0) return;
  throw new Error("nothing was drawn");
}

function plantSprite(scene, plant) {
  drawOnce(PLANT_BOX.w, PLANT_BOX.h, (ctx) => paintPlant(ctx, scene, plant, scene.palettes.light));
}

function animalSprite(scene, draw) {
  drawOnce(ANIMAL_BOX.w, ANIMAL_BOX.h, (ctx) => paintSprite(ctx, draw, scene.palettes.light));
}

function present(item) {
  if (!item || typeof item !== "object") return false;
  return "bird" in item ? item.bird !== null : item.active === true;
}

function recordPresence(nursery, stage, seen) {
  for (const [key, value] of Object.entries(nursery.extra ?? {})) {
    const items = Array.isArray(value) ? value.map((v, i) => [`${key}[${i}]`, v]) : [[key, value]];
    for (const [name, item] of items) {
      if (present(item) && !(name in seen)) seen[name] = stage;
    }
  }
}

// Pixels with any colour above the soil line, so stage 0 can be checked for bare soil.
function aboveSoil(nursery) {
  const data = nursery.gctx.getImageData(0, 0, nursery.cols, nursery.groundY).data;
  let count = 0;
  for (let i = 3; i < data.length; i += 4) if (data[i] > 0) count += 1;
  return count;
}

// A fixed seed for each scene and theme (FNV-1a of their names), so every run is the same.
function seedFor(scene, theme) {
  let h = 2166136261;
  for (const ch of `${scene.id}:${theme}`) h = Math.imul(h ^ ch.codePointAt(0), 16777619);
  return h >>> 0;
}

// The Nursery seeds its random numbers from Math.random(), so it is built with a seeded one.
function seededNursery(scene, theme, options) {
  const random = Math.random;
  Math.random = rng(seedFor(scene, theme));
  try {
    return new Nursery(options);
  } finally {
    Math.random = random;
  }
}

function runStages(scene, theme, seen, soil) {
  document.documentElement.dataset.theme = theme;
  const ground = document.createElement("canvas");
  const water = document.createElement("canvas");
  const options = { ground, water, reducedMotion: false, scene, stage: 0 };
  const nursery = seededNursery(scene, theme, options);
  nursery.destroy(); // the frame loop is stopped: time is stepped by hand below
  const steps = Math.round(SIM.seconds / SIM.dt);
  for (let stage = 0; stage <= MAX_STAGE; stage += 1) {
    nursery.stage = stage;
    for (const plant of nursery.plants) plant.shown = plant.target = stage;
    scene.extras?.onGrow?.(nursery);
    for (let i = 0; i < steps; i += 1) {
      nursery.time += SIM.dt;
      scene.extras?.update?.(nursery, SIM.dt);
      if (seen) recordPresence(nursery, stage, seen);
    }
    nursery.dirty = true;
    nursery.drawGround();
    soil.push(aboveSoil(nursery));
  }
  nursery.destroy();
}

async function main() {
  const result = { viewport: [window.innerWidth, window.innerHeight], scenes: {} };
  for (const scene of SCENES.filter((s) => IDS.includes(s.id))) {
    const id = scene.id;
    const entry = {
      inventory: inventory(scene),
      cast: (scene.cast ?? []).map(({ sprites, ...rest }) => ({ ...rest, sprites: sprites ?? [] })),
      drawn: [],
      errors: [],
      presence: {},
      soil: {},
    };
    for (const [key, { plant }] of Object.entries(plantExamples(scene))) {
      const name = `${id}-${key.replace("/", "-")}`;
      try {
        plantSprite(scene, plant);
        entry.drawn.push(name);
      } catch (error) {
        entry.errors.push(`${name}: ${error}`);
      }
    }
    for (const [stem, draw] of Object.entries(scene.sprites ?? {})) {
      const name = `${id}-${stem}`;
      try {
        animalSprite(scene, draw);
        entry.drawn.push(name);
      } catch (error) {
        entry.errors.push(`${name}: ${error}`);
      }
    }
    for (const theme of ["light", "dark"]) {
      const soil = [];
      runStages(scene, theme, theme === "light" ? entry.presence : null, soil);
      entry.soil[theme] = soil;
    }
    result.scenes[id] = entry;
  }
  window.__result = result;
  window.__status = "done";
}

main().catch((error) => {
  window.__status = `error: ${error?.stack ? error.stack : error}`;
});
