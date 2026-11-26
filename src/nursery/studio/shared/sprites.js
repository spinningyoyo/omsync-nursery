// Scene inventory and sprite-painting helpers shared by Nursery Studio and `nursery catalog`.
// Each scene module declares its own `sprites` map and `paint` map; this file holds no scene table.

import { rng } from "./js/kit/pixel.js";
import { ANIMAL_BOX, PLANT_BOX } from "./js/kit/poses.js";
import { MAX_STAGE } from "./js/nursery.js";

export { ANIMAL_BOX, PLANT_BOX };
export const WIDTHS = [240, 160, 90];

// The animation frame the sprites are drawn at: walkers and birds take this phase, and painters this
// time. The catalogue keeps frame 0; the studio steps through a few frames to show a walk or a flap.
export const frame = { phase: 0, time: 0 };

export function layerName(layer) {
  return layer < 0 ? "far" : layer === 0 ? "middle" : "near";
}

export function firstVisible(born) {
  for (let stage = 0; stage <= MAX_STAGE; stage += 1) if (stage > born) return stage;
  return MAX_STAGE + 1;
}

function newStat() {
  return { counts: {}, layers: [], first: [Infinity, -Infinity], species: {} };
}

function tally(stat, cols, plant) {
  const first = firstVisible(plant.born);
  stat.counts[cols] = (stat.counts[cols] ?? 0) + 1;
  const layer = layerName(plant.layer);
  if (!stat.layers.includes(layer)) stat.layers.push(layer);
  stat.first = [Math.min(stat.first[0], first), Math.max(stat.first[1], first)];
}

// Counts per kind and species at each width, from generate() with a fixed seed.
export function inventory(scene) {
  const kinds = {};
  for (const cols of WIDTHS) {
    for (const plant of scene.generate({ cols, rand: rng(12345) })) {
      kinds[plant.kind] ??= newStat();
      tally(kinds[plant.kind], cols, plant);
      if (plant.species) {
        kinds[plant.kind].species[plant.species] ??= newStat();
        tally(kinds[plant.kind].species[plant.species], cols, plant);
      }
    }
  }
  return kinds;
}

function keysOf(plant) {
  return plant.species ? [plant.kind, `${plant.kind}/${plant.species}`] : [plant.kind];
}

// One example per kind and per species: the largest one at the widest page that has it.
export function plantExamples(scene) {
  const examples = {};
  for (const cols of WIDTHS) {
    const best = {};
    for (const plant of scene.generate({ cols, rand: rng(12345) })) {
      for (const key of keysOf(plant)) {
        if (!best[key] || plant.scale > best[key].scale) best[key] = plant;
      }
    }
    for (const [key, plant] of Object.entries(best)) {
      if (!examples[key]) examples[key] = { plant, cols };
    }
  }
  return examples;
}

// Paints a plant example at full size, standing on PLANT_BOX's base row.
export function paintPlant(ctx, scene, plant, pal) {
  const g = { ctx, pal, time: frame.time, groundY: PLANT_BOX.base, cols: 240 };
  const p = { ...plant, x: PLANT_BOX.w / 2, shown: MAX_STAGE, target: MAX_STAGE };
  scene.paint[plant.kind](g, p, 1, PLANT_BOX.base);
}

// Paints one sprite draw function in an ANIMAL_BOX: walkers stand on its ground row at x = 40.
export function paintSprite(ctx, draw, pal) {
  const g = { ctx, pal, time: frame.time, groundY: ANIMAL_BOX.ground, cols: ANIMAL_BOX.w };
  draw(g, frame);
}
