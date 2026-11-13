// The poses the nursery tools draw: one sample of every plant kind and species, and a sprite for
// every animal, bird and effect, with the scene module copy M (its painters exported) and the
// painter group g. Shared by src/nursery/catalog.py and src/nursery/studio/server.py, whose sites
// serve js/ (the repository's modules) and this file side by side.

import * as animals from "./js/kit/animals.js";
import * as effects from "./js/kit/effects.js";
import { fade, rect, rng } from "./js/kit/pixel.js";
import { MAX_STAGE } from "./js/nursery.js";

export const WIDTHS = [240, 160, 90];
export const PLANT_BOX = { w: 80, h: 90, base: 84 };
export const ANIMAL_BOX = { w: 80, h: 60, ground: 46 };

// The animation frame the sprites are drawn at: walkers and birds take this phase, and painters this
// time. The catalogue keeps frame 0; the studio steps through a few frames to show a walk or a flap.
export const frame = { phase: 0, time: 0 };

function walk(extra = {}) {
  return {
    active: true,
    scale: 1,
    x: 40,
    dir: 1,
    phase: frame.phase,
    state: "walk",
    timer: 1,
    ...extra,
  };
}

// A gibbon holding a branch at (40, 6), at fraction t of its swing: 0 is the body behind the hand,
// 0.5 under it, and 1 ahead of it.
function swinging(t) {
  return { active: true, hx: 40, hy: 6, dir: 1, t, leap: null };
}

function bird(extra = {}) {
  return { dir: 1, x: 40, y: 30, phase: frame.phase, ...extra };
}

function seaFrame(stage, time, whale) {
  return {
    groundY: ANIMAL_BOX.ground,
    cols: ANIMAL_BOX.w,
    stage,
    time,
    reduced: false,
    theme: "light",
    extra: {
      sea: 12,
      whale,
      honu: { x: -50, dir: 1, scale: 1 },
      hatchling: { active: false },
      spray: { drops: [] },
    },
  };
}

// Animal and effect sprites: each takes the scene module copy M and the painter group g.
export const SPRITES = {
  meadow: {
    "meadow-bobcat": (_M, g) => animals.felidAt(g, walk({ kind: "bobcat" }), 0),
    "meadow-bobcat-sitting": (_M, g) => animals.felidAt(g, walk({ kind: "bobcat", state: "sit", pose: "sit" }), 0),
    "meadow-bobcat-arching": (_M, g) => animals.felidAt(g, walk({ kind: "bobcat", state: "sit", pose: "arch" }), 0),
    "meadow-bobcat-lying": (_M, g) => animals.felidAt(g, walk({ kind: "bobcat", state: "sit", pose: "lie" }), 0),
    "meadow-bobcat-stretching": (_M, g) => animals.felidAt(g, walk({ kind: "bobcat", state: "sit", pose: "bow" }), 0),
    "meadow-rabbit": (_M, g) => animals.hareAt(g, walk()),
    "meadow-fox": (_M, g) => animals.canidAt(g, walk({ kind: "red" })),
    "meadow-fox-pounce": (_M, g) => animals.canidAt(g, walk({ kind: "red", state: "pounce", lift: 6 })),
    "meadow-elk": (_M, g) => animals.cervidAt(g, walk({ kind: "elk", sex: "m", scale: 1.1 })),
    "meadow-elk-sitting": (_M, g) => animals.cervidAt(g, walk({ kind: "elk", sex: "m", scale: 1.1, state: "sit" })),
    "meadow-eagle-side": (_M, g) => animals.raptorAt(g, bird({ kind: "eagleSide", pal: "eagle" })),
    "meadow-eagle-side-flapping": (_M, g) =>
      animals.raptorAt(g, bird({ kind: "eagleSide", pal: "eagle" }), { bank: true }),
    "meadow-jay": (_M, g) => animals.flyerAt(g, bird(), 0, "jay"),
    "meadow-eagle": (_M, g) => animals.raptorAt(g, bird({ kind: "eagle" })),
    "meadow-eagle-flapping": (_M, g) => animals.raptorAt(g, bird({ kind: "eagle" }), { bank: true }),
    "meadow-butterfly": (M, g) => M.butterflyAt(g, { homeX: 40, homeY: 30, phase: 0, speed: 0, colour: 4 }, 0),
    "meadow-bear": (_M, g) => animals.bearAt(g, walk()),
    "meadow-bear-rearing": (_M, g) => animals.bearAt(g, walk({ state: "rear" })),
    "meadow-bear-cub": (_M, g) => animals.bearAt(g, walk({ scale: 0.55, cub: true })),
    "meadow-kingfisher": (_M, g) => animals.kingfisherAt(g, bird(), 0),
    "meadow-petal": (_M, g) => {
      for (const [x, y] of [
        [6, 6],
        [12, 10],
        [18, 4],
        [25, 12],
        [31, 7],
        [36, 15],
      ]) {
        rect(g, g.pal.petal, x, y, 1, 1);
      }
    },
    // The firefall shows only at night, so its sprite is El Capitan's face in the dark palette.
    "meadow-firefall": (M, g) =>
      M.default.paint.elcap(
        { ...g, pal: fade(M.default.palettes.dark, 0.55) },
        { x: 40, scale: 0.6, seed: 7, flare: 1 },
        1,
        ANIMAL_BOX.ground,
      ),
  },
  rainforest: {
    "rainforest-clouded-leopard": (_M, g) => animals.felidAt(g, walk({ kind: "clouded" }), 0),
    "rainforest-clouded-leopard-sitting": (_M, g) =>
      animals.felidAt(g, walk({ kind: "clouded", state: "sit", pose: "sit" }), 0),
    "rainforest-clouded-leopard-arching": (_M, g) =>
      animals.felidAt(g, walk({ kind: "clouded", state: "sit", pose: "arch" }), 0),
    "rainforest-clouded-leopard-lying": (_M, g) =>
      animals.felidAt(g, walk({ kind: "clouded", state: "sit", pose: "lie" }), 0),
    "rainforest-clouded-leopard-stretching": (_M, g) =>
      animals.felidAt(g, walk({ kind: "clouded", state: "sit", pose: "bow" }), 0),
    "rainforest-kingfisher": (_M, g) => animals.kingfisherAt(g, bird(), 0),
    "rainforest-hornbill": (M, g) => M.hornbillAt(g, bird(), 0),
    "rainforest-hornbill-up": (M, g) => M.hornbillAt(g, bird(), 0.4),
    "rainforest-serpent": (_M, g) => animals.raptorAt(g, bird({ kind: "serpent" })),
    "rainforest-serpent-bank": (_M, g) => animals.raptorAt(g, bird({ kind: "serpent" }), { bank: true }),
    "rainforest-monkey": (M, g) => M.monkeyAt(g, walk(), 0),
    "rainforest-monkey-sitting": (M, g) => M.monkeyAt(g, walk({ state: "sit" }), 0),
    "rainforest-elephant": (_M, g) => animals.elephantAt(g, walk({ kind: "asian" }), 0),
    "rainforest-elephant-calf": (_M, g) => animals.elephantAt(g, walk({ kind: "asian", scale: 0.55 }), 0),
    "rainforest-langur": (M, g) => M.langurAt(g, { x: 40, y: 20, dir: 1, phase: 0, moves: {} }, 0),
    "rainforest-langur-reaching": (M, g) =>
      M.langurAt(g, { x: 40, y: 20, dir: 1, phase: 0, moves: { reach: { until: 1, lasts: 1 } } }, 0),
    "rainforest-otter": (M, g) => M.otterAt(g, walk()),
    "rainforest-otter-lookout": (M, g) => M.otterAt(g, walk({ state: "sit", lookout: true })),
    "rainforest-firefly": (M, g) => M.fireflyAt(g, { homeX: 40, homeY: 30, phase: 0, speed: 0, reach: 8 }, 0.714, null),
    "rainforest-gibbon-behind": (M, g) => M.gibbonAt(g, swinging(0), g.pal),
    "rainforest-gibbon": (M, g) => M.gibbonAt(g, swinging(0.5), g.pal),
    "rainforest-gibbon-ahead": (M, g) => M.gibbonAt(g, swinging(1), g.pal),
    "rainforest-mist": (_M, g) => effects.mistAt(g, { x0: 90, y: 30, w: 40, h: 6, speed: 0 }, 0, 80),
  },
  hawaii: {
    "hawaii-cat": (_M, g) => animals.felidAt(g, walk({ kind: "housecat", pal: "housecat-calico" }), 0),
    "hawaii-cat-sitting": (_M, g) =>
      animals.felidAt(g, walk({ kind: "housecat", pal: "housecat-calico", state: "sit", pose: "sit" }), 0),
    "hawaii-cat-arching": (_M, g) =>
      animals.felidAt(g, walk({ kind: "housecat", pal: "housecat-calico", state: "sit", pose: "arch" }), 0),
    "hawaii-cat-lying": (_M, g) =>
      animals.felidAt(g, walk({ kind: "housecat", pal: "housecat-calico", state: "sit", pose: "lie" }), 0),
    "hawaii-cat-stretching": (_M, g) =>
      animals.felidAt(g, walk({ kind: "housecat", pal: "housecat-calico", state: "sit", pose: "bow" }), 0),
    "hawaii-cat-white": (_M, g) =>
      animals.felidAt(g, walk({ kind: "housecat", pal: "housecat-white", state: "sit", pose: "sit" }), 0),
    "hawaii-cat-silver-tabby": (_M, g) =>
      animals.felidAt(g, walk({ kind: "housecat", pal: "housecat-silver-tabby", state: "sit", pose: "sit" }), 0),
    "hawaii-cat-orange-white": (_M, g) =>
      animals.felidAt(g, walk({ kind: "housecat", pal: "housecat-orange-white", state: "sit", pose: "sit" }), 0),
    "hawaii-cat-siamese": (_M, g) =>
      animals.felidAt(g, walk({ kind: "housecat", pal: "housecat-siamese", state: "sit", pose: "sit" }), 0),
    "hawaii-cat-black": (_M, g) =>
      animals.felidAt(g, walk({ kind: "housecat", pal: "housecat-black", state: "sit", pose: "sit" }), 0),
    "hawaii-cat-ginger": (_M, g) =>
      animals.felidAt(g, walk({ kind: "housecat", pal: "housecat-ginger", state: "sit", pose: "sit" }), 0),
    "hawaii-cat-calico": (_M, g) =>
      animals.felidAt(g, walk({ kind: "housecat", pal: "housecat-calico", state: "sit", pose: "sit" }), 0),
    "hawaii-cat-grey": (_M, g) =>
      animals.felidAt(g, walk({ kind: "housecat", pal: "housecat-grey", state: "sit", pose: "sit" }), 0),
    "hawaii-cat-tortie": (_M, g) =>
      animals.felidAt(g, walk({ kind: "housecat", pal: "housecat-tortie", state: "sit", pose: "sit" }), 0),
    "hawaii-cat-tuxedo": (_M, g) =>
      animals.felidAt(g, walk({ kind: "housecat", pal: "housecat-tuxedo", state: "sit", pose: "sit" }), 0),
    "hawaii-cat-brown-tabby": (_M, g) =>
      animals.felidAt(g, walk({ kind: "housecat", pal: "housecat-brown-tabby", state: "sit", pose: "sit" }), 0),
    "hawaii-tropicbird": (M, g) => M.tropicbirdAt(g, bird(), 0),
    "hawaii-iiwi": (_M, g) => animals.flyerAt(g, bird(), 0, "iiwi"),
    "hawaii-crab": (_M, g) => animals.crabAt(g, walk({ lane: 0 }), g.groundY + 5),
    "hawaii-honu": (M, g) => M.honuAt(g, { x: 40, dir: 1, scale: 1 }, 0, 8, 44),
    "hawaii-honu-hatchling": (M, g) => M.honuAt(g, { x: 40, dir: 1, scale: 0.5 }, 0, 8, 44),
    "hawaii-seal": (M, g) => M.sealAt(g, walk(), 0),
    "hawaii-seal-pup": (M, g) => M.sealAt(g, walk({ scale: 0.55 }), 0),
    "hawaii-moa": (M, g) => M.moaAt(g, walk(), 0),
    "hawaii-moa-pecking": (M, g) => M.moaAt(g, walk({ state: "sit" }), 0),
    "hawaii-puaa": (M, g) => M.puaaAt(g, walk(), 0),
    "hawaii-puaa-rooting": (M, g) => M.puaaAt(g, walk({ state: "sit" }), 0),
    "hawaii-sea": (M, g) => {
      g.time = 0;
      M.default.extras.drawBack(g, seaFrame(0, 0, { start: 99, x: 0 }));
    },
    "hawaii-spray": (_M, g) => {
      for (const [x, y] of [
        [6, 44],
        [9, 42],
        [12, 45],
        [15, 41],
        [18, 44],
        [21, 43],
      ]) {
        rect(g, g.pal.sea[3], x, y, 1, 1);
      }
    },
    "hawaii-whale": (M, g) => {
      g.time = 1;
      M.default.extras.drawBack(g, seaFrame(7, 1, { start: 0.5, x: 40 }));
    },
  },
  desert: {
    "desert-bobcat": (_M, g) => animals.felidAt(g, walk({ kind: "bobcat", pal: "bobcatDesert" }), 0),
    "desert-bobcat-sitting": (_M, g) =>
      animals.felidAt(g, walk({ kind: "bobcat", pal: "bobcatDesert", state: "sit", pose: "sit" }), 0),
    "desert-bobcat-arching": (_M, g) =>
      animals.felidAt(g, walk({ kind: "bobcat", pal: "bobcatDesert", state: "sit", pose: "arch" }), 0),
    "desert-bobcat-lying": (_M, g) =>
      animals.felidAt(g, walk({ kind: "bobcat", pal: "bobcatDesert", state: "sit", pose: "lie" }), 0),
    "desert-bobcat-stretching": (_M, g) =>
      animals.felidAt(g, walk({ kind: "bobcat", pal: "bobcatDesert", state: "sit", pose: "bow" }), 0),
    "desert-hawk": (M, g) => M.hawkAt(g, { x: 40, y: 20, dir: 1, bank: false, stoop: null }),
    "desert-hawk-bank": (M, g) => M.hawkAt(g, { x: 40, y: 20, dir: 1, bank: true, stoop: null }),
    "desert-hawk-stoop": (M, g) => M.hawkAt(g, { x: 40, y: 20, dir: 1, stoop: { t: 0 } }),
    "desert-hawk-up": (M, g) => M.hawkAt(g, { x: 40, y: 20, dir: 1, stoop: { t: 1.1 } }),
    "desert-hawk-level": (M, g) => M.hawkAt(g, { x: 40, y: 20, dir: 1, stoop: { t: 1.2 } }),
    "desert-hawk-down": (M, g) => M.hawkAt(g, { x: 40, y: 20, dir: 1, stoop: { t: 1.3 } }),
    "desert-vulture": (M, g) => M.vulturesAt(g, bird({ members: [{ back: 0, up: 0, phase: 0 }] }), 0),
    "desert-vulture-tilt": (M, g) => M.vulturesAt(g, bird({ members: [{ back: 0, up: 0, phase: 0 }] }), 0.8),
    "desert-roadrunner": (M, g) => M.roadrunnerAt(g, walk()),
    "desert-roadrunner-standing": (M, g) => M.roadrunnerAt(g, walk({ state: "sit" })),
    "desert-rabbit": (_M, g) => animals.hareAt(g, walk({ kind: "jackrabbit" })),
    "desert-snake": (M, g) => M.snakeAt(g, walk()),
    "desert-tortoise": (_M, g) => animals.tortoiseAt(g, walk(), g.groundY + 6),
    "desert-tortoise-resting": (_M, g) => animals.tortoiseAt(g, walk({ state: "sit" }), g.groundY + 6),
    "desert-coyote": (_M, g) => animals.canidAt(g, walk({ kind: "coyote" })),
    "desert-coyote-howl": (_M, g) => animals.canidAt(g, walk({ kind: "coyote", state: "howl" })),
    "desert-coyote-pup": (_M, g) => animals.canidAt(g, walk({ kind: "coyote", scale: 0.6 })),
    "desert-coyote-pup-sitting": (_M, g) => animals.canidAt(g, walk({ kind: "coyote", scale: 0.6, state: "sit" })),
    "desert-coyote-pup-howl": (_M, g) => animals.canidAt(g, walk({ kind: "coyote", scale: 0.6, state: "howl" })),
    "desert-bighorn": (_M, g) => animals.sheepAt(g, walk({ state: "sit" })),
    "desert-bighorn-look": (_M, g) => animals.sheepAt(g, walk({ state: "sit" }), { look: true }),
    "desert-owl": (M, g) => {
      g.pal = M.default.palettes.dark;
      animals.owlAt(g, bird({ pose: "perch", tufts: true }), 0);
    },
    "desert-meteors": (M, g) => {
      g.pal = M.default.palettes.dark;
      // A burst round a radiant: short streaks near it, longer ones farther out.
      const rays = [
        [0, 1, 8],
        [0.8, 0.5, 14],
        [-0.8, 0.5, 10],
        [0.6, -0.5, 18],
        [-0.6, -0.5, 12],
      ];
      for (const [dx, dy, dist] of rays) {
        const m = { x: 40 + dx * dist, y: 28 + dy * dist, dx, dy, speed: 30 };
        M.meteorAt(g, { ...m, length: 3 + dist * 0.6, age: 0.3, life: 0.6, linger: 1, keep: 0.8 });
      }
    },
    "desert-tumbleweed": (M, g) => M.tumbleAt(g, bird(), 0),
    "desert-sky": (M, g) => {
      const extra = M.default.extras.init({
        rand: rng(3),
        cols: ANIMAL_BOX.w,
        groundY: ANIMAL_BOX.ground,
      });
      M.skyAt(g, { cols: ANIMAL_BOX.w, groundY: ANIMAL_BOX.ground, extra }, 0);
    },
  },
  smokies: {
    "smokies-bobcat": (_M, g) => animals.felidAt(g, walk({ kind: "bobcat" }), 0),
    "smokies-bobcat-sitting": (_M, g) => animals.felidAt(g, walk({ kind: "bobcat", state: "sit", pose: "sit" }), 0),
    "smokies-bobcat-arching": (_M, g) => animals.felidAt(g, walk({ kind: "bobcat", state: "sit", pose: "arch" }), 0),
    "smokies-bobcat-lying": (_M, g) => animals.felidAt(g, walk({ kind: "bobcat", state: "sit", pose: "lie" }), 0),
    "smokies-bobcat-stretching": (_M, g) => animals.felidAt(g, walk({ kind: "bobcat", state: "sit", pose: "bow" }), 0),
    "smokies-eagle-side": (_M, g) => animals.raptorAt(g, bird({ kind: "eagleSide", pal: "eagle" })),
    "smokies-eagle-side-flapping": (_M, g) =>
      animals.raptorAt(g, bird({ kind: "eagleSide", pal: "eagle" }), { bank: true }),
    "smokies-eagle": (_M, g) => animals.raptorAt(g, bird({ kind: "eagle" })),
    "smokies-eagle-flapping": (_M, g) => animals.raptorAt(g, bird({ kind: "eagle" }), { bank: true }),
    "smokies-cardinal": (_M, g) => animals.flyerAt(g, bird(), 0, "cardinal"),
    "smokies-swift": (_M, g) => animals.flyerAt(g, bird(), 0, "swift"),
    "smokies-turkey": (M, g) => M.turkeyAt(g, walk(), 0),
    "smokies-groundhog": (M, g) => M.groundhogAt(g, walk(), 0),
    "smokies-groundhog-sitting": (M, g) => M.groundhogAt(g, walk({ state: "sit" }), 0),
    "smokies-deer": (_M, g) => animals.cervidAt(g, walk({ kind: "whitetail", sex: "f" })),
    "smokies-deer-antlered": (_M, g) => animals.cervidAt(g, walk({ kind: "whitetail", sex: "m" })),
    "smokies-deer-flag": (_M, g) => animals.cervidAt(g, walk({ kind: "whitetail", sex: "f", state: "run" })),
    "smokies-elk": (_M, g) => animals.cervidAt(g, walk({ kind: "elk", sex: "m" })),
    "smokies-elk-bugle": (_M, g) => animals.cervidAt(g, walk({ kind: "elk", sex: "m", state: "bugle", puff: 0 })),
    "smokies-bear": (_M, g) => animals.bearAt(g, walk()),
    "smokies-bear-rearing": (_M, g) => animals.bearAt(g, walk({ state: "rear" })),
    "smokies-bear-cub": (_M, g) => animals.bearAt(g, walk({ scale: 0.55, cub: true })),
    "smokies-owl": (M, g) => {
      g.pal = M.default.palettes.dark;
      animals.owlAt(g, bird({ pose: "perch" }), 0);
    },
    "smokies-sky": (M, g) => {
      g.pal = M.default.palettes.dark;
      const f = { rand: rng(3), cols: ANIMAL_BOX.w, groundY: ANIMAL_BOX.ground, theme: "dark" };
      M.default.extras.drawBack(g, { ...f, extra: M.default.extras.init(f) });
    },
    "smokies-mist": (_M, g) => effects.mistAt(g, { x0: 90, y: 30, w: 40, h: 6, speed: 0 }, 0, 80),
    "smokies-leaf": (_M, g) => {
      [g.pal.red, g.pal.orange, g.pal.yellow, g.pal.copper].forEach((tones, i) => {
        for (let k = 0; k < 3; k += 1) {
          rect(g, tones[1 + ((i + k) % 2)], 5 + i * 18 + k * 5, 6 + ((k * 7 + i * 3) % 11), k % 2 ? 2 : 1, 1);
        }
      });
    },
  },
  serengeti: {
    "serengeti-cheetah": (_M, g) => animals.felidAt(g, walk({ kind: "cheetah" }), 0),
    "serengeti-cheetah-sitting": (_M, g) => animals.felidAt(g, walk({ kind: "cheetah", state: "sit", pose: "sit" }), 0),
    "serengeti-cheetah-lying": (_M, g) => animals.felidAt(g, walk({ kind: "cheetah", state: "sit", pose: "lie" }), 0),
    "serengeti-cheetah-stretching": (_M, g) =>
      animals.felidAt(g, walk({ kind: "cheetah", state: "sit", pose: "bow" }), 0),
    "serengeti-zebra": (M, g) => M.zebraAt(g, walk(), 0),
    "serengeti-zebra-foal": (M, g) => M.zebraAt(g, walk({ scale: 0.6 }), 0),
    "serengeti-giraffe": (M, g) => M.giraffeAt(g, walk(), 0),
    "serengeti-secretary": (M, g) => M.secretaryAt(g, walk(), 0),
    "serengeti-elephant": (_M, g) => animals.elephantAt(g, walk({ kind: "african" }), 0),
    "serengeti-elephant-calf": (_M, g) => animals.elephantAt(g, walk({ kind: "african", scale: 0.5 }), 0),
    "serengeti-lion": (M, g) => M.lionAt(g, walk(), ANIMAL_BOX.ground + 7, 0),
    "serengeti-lion-sitting": (M, g) => M.lionAt(g, walk({ state: "sit" }), ANIMAL_BOX.ground + 7, 0),
    "serengeti-lion-lying": (M, g) => M.lionAt(g, walk({ state: "sit", pose: "lie" }), ANIMAL_BOX.ground + 7, 0),
    "serengeti-lion-stretching": (M, g) => M.lionAt(g, walk({ state: "sit", pose: "bow" }), ANIMAL_BOX.ground + 7, 0),
    "serengeti-lion-raised": (M, g) => M.lionAt(g, walk({ state: "stand", roar: 0.1 }), ANIMAL_BOX.ground + 7, 0),
    "serengeti-lion-roaring": (M, g) => M.lionAt(g, walk({ state: "stand", roar: 0.5 }), ANIMAL_BOX.ground + 7, 0),
    "serengeti-cub": (M, g) => M.cubAt(g, walk(), 0),
    "serengeti-cub-sitting": (M, g) => M.cubAt(g, walk({ state: "sit" }), 0),
    "serengeti-cub-looking-up": (M, g) => M.cubAt(g, walk({ pose: "sitUp" }), 0),
    "serengeti-cub-bounding": (M, g) => M.cubAt(g, walk({ pose: "bound" }), 0),
    "serengeti-vulture": (_M, g) => animals.raptorAt(g, bird({ kind: "vulture" })),
    "serengeti-vulture-tilt": (_M, g) => animals.raptorAt(g, bird({ kind: "vulture" }), { bank: true }),
    "serengeti-roller": (M, g) => M.rollerAt(g, bird(), 0),
    "serengeti-roller-up": (M, g) => M.rollerAt(g, bird(), 0.3),
    "serengeti-flamingo": (_M, g) => animals.flamingoAt(g, bird(), 0),
    "serengeti-flamingo-up": (_M, g) => animals.flamingoAt(g, bird(), 0.5),
    "serengeti-sun": (M, g) => M.sunAt(g, { cols: ANIMAL_BOX.w, groundY: ANIMAL_BOX.ground }),
    "serengeti-haze": (_M, g) => effects.mistAt(g, { x0: 90, y: 30, w: 40, h: 6, speed: 0 }, 0, 80),
    "serengeti-dust": (_M, g) => {
      const motes = [
        [6, 30],
        [11, 24],
        [17, 34],
        [23, 27],
        [30, 20],
        [36, 31],
        [44, 26],
        [52, 22],
        [59, 33],
      ];
      for (const [x, y] of motes) rect(g, g.pal.dust[(x + y) % 2], x, y, 1, 1);
    },
  },
  iceland: {
    "iceland-cat": (_M, g) => animals.felidAt(g, walk({ kind: "housecat", pal: "housecat-brown-tabby" }), 0),
    "iceland-cat-sitting": (_M, g) =>
      animals.felidAt(g, walk({ kind: "housecat", pal: "housecat-brown-tabby", state: "sit", pose: "sit" }), 0),
    "iceland-cat-arching": (_M, g) =>
      animals.felidAt(g, walk({ kind: "housecat", pal: "housecat-brown-tabby", state: "sit", pose: "arch" }), 0),
    "iceland-cat-lying": (_M, g) =>
      animals.felidAt(g, walk({ kind: "housecat", pal: "housecat-brown-tabby", state: "sit", pose: "lie" }), 0),
    "iceland-cat-stretching": (_M, g) =>
      animals.felidAt(g, walk({ kind: "housecat", pal: "housecat-brown-tabby", state: "sit", pose: "bow" }), 0),
    "iceland-cat-white": (_M, g) =>
      animals.felidAt(g, walk({ kind: "housecat", pal: "housecat-white", state: "sit", pose: "sit" }), 0),
    "iceland-cat-silver-tabby": (_M, g) =>
      animals.felidAt(g, walk({ kind: "housecat", pal: "housecat-silver-tabby", state: "sit", pose: "sit" }), 0),
    "iceland-cat-orange-white": (_M, g) =>
      animals.felidAt(g, walk({ kind: "housecat", pal: "housecat-orange-white", state: "sit", pose: "sit" }), 0),
    "iceland-cat-siamese": (_M, g) =>
      animals.felidAt(g, walk({ kind: "housecat", pal: "housecat-siamese", state: "sit", pose: "sit" }), 0),
    "iceland-cat-black": (_M, g) =>
      animals.felidAt(g, walk({ kind: "housecat", pal: "housecat-black", state: "sit", pose: "sit" }), 0),
    "iceland-cat-ginger": (_M, g) =>
      animals.felidAt(g, walk({ kind: "housecat", pal: "housecat-ginger", state: "sit", pose: "sit" }), 0),
    "iceland-cat-calico": (_M, g) =>
      animals.felidAt(g, walk({ kind: "housecat", pal: "housecat-calico", state: "sit", pose: "sit" }), 0),
    "iceland-cat-grey": (_M, g) =>
      animals.felidAt(g, walk({ kind: "housecat", pal: "housecat-grey", state: "sit", pose: "sit" }), 0),
    "iceland-cat-tortie": (_M, g) =>
      animals.felidAt(g, walk({ kind: "housecat", pal: "housecat-tortie", state: "sit", pose: "sit" }), 0),
    "iceland-cat-tuxedo": (_M, g) =>
      animals.felidAt(g, walk({ kind: "housecat", pal: "housecat-tuxedo", state: "sit", pose: "sit" }), 0),
    "iceland-cat-brown-tabby": (_M, g) =>
      animals.felidAt(g, walk({ kind: "housecat", pal: "housecat-brown-tabby", state: "sit", pose: "sit" }), 0),
    "iceland-fjord": (M, g) => {
      M.default.extras.drawBack(g, {
        groundY: ANIMAL_BOX.ground,
        cols: ANIMAL_BOX.w,
        stage: 4,
        time: 0,
        reduced: false,
        theme: "light",
        extra: { fjord: 16 },
      });
    },
    "iceland-night": (M, g) => {
      g.pal = M.default.palettes.dark;
      M.default.extras.drawBack(g, {
        groundY: ANIMAL_BOX.ground,
        cols: ANIMAL_BOX.w,
        stage: 0,
        time: 0,
        reduced: false,
        theme: "dark",
        extra: M.default.extras.init({
          rand: rng(3),
          cols: ANIMAL_BOX.w,
          groundY: ANIMAL_BOX.ground,
        }),
      });
    },
    "iceland-mist": (_M, g) => effects.mistAt(g, { x0: 90, y: 30, w: 40, h: 6, speed: 0 }, 0, 80),
    "iceland-fox": (_M, g) => animals.canidAt(g, walk({ kind: "arctic" })),
    "iceland-fox-winter": (M, g) => {
      g.pal = M.default.palettes.dark;
      animals.canidAt(g, walk({ kind: "arctic", state: "sit" }));
    },
    "iceland-fox-pup": (_M, g) => animals.canidAt(g, walk({ kind: "arctic", scale: 0.6 })),
    "iceland-fox-pup-sitting": (_M, g) => animals.canidAt(g, walk({ kind: "arctic", scale: 0.6, state: "sit" })),
    "iceland-owl": (_M, g) => animals.owlAt(g, bird(), 0.5),
    "iceland-swan": (_M, g) => animals.swanAt(g, walk(), 0),
    "iceland-swan-feeding": (_M, g) => animals.swanAt(g, walk({ state: "sit" }), 0),
    "iceland-swan-flying": (_M, g) => animals.swanAt(g, bird({ pose: "fly" }), 0),
    "iceland-puffin": (M, g) =>
      M.flockAt(
        g,
        bird({
          members: [
            { back: 0, up: 0, phase: 0 },
            { back: 9, up: -2, phase: 1 },
            { back: 19, up: 2, phase: 2 },
          ],
        }),
        0,
      ),
    "iceland-puffin-nesting": (M, g) => M.nesterAt(g, { x: 40, y: 40, dir: 1, moves: {}, carrying: 99 }, 0, false),
    "iceland-puffin-asleep": (M, g) => {
      g.pal = M.default.palettes.dark;
      M.nesterAt(g, { x: 40, y: 40, dir: 1, moves: {}, carrying: -1 }, 0, true);
    },
    "iceland-hind": (_M, g) => animals.cervidAt(g, walk({ kind: "reindeer", sex: "f", scale: 0.9 })),
    "iceland-stag": (_M, g) => animals.cervidAt(g, walk({ kind: "reindeer", sex: "m" })),
  },
  yellowstone: {
    "yellowstone-cougar": (_M, g) => animals.felidAt(g, walk({ kind: "cougar" }), 0),
    "yellowstone-cougar-sitting": (_M, g) => animals.felidAt(g, walk({ kind: "cougar", state: "sit", pose: "sit" }), 0),
    "yellowstone-cougar-lying": (_M, g) => animals.felidAt(g, walk({ kind: "cougar", state: "sit", pose: "lie" }), 0),
    "yellowstone-cougar-stretching": (_M, g) =>
      animals.felidAt(g, walk({ kind: "cougar", state: "sit", pose: "bow" }), 0),
    "yellowstone-bison": (M, g) => M.bisonAt(g, walk({ scale: 1 })),
    "yellowstone-bison-grazing": (M, g) => M.bisonAt(g, walk({ scale: 1, state: "sit" })),
    "yellowstone-bison-calf": (M, g) => M.bisonAt(g, walk({ scale: 0.55 })),
    "yellowstone-wolf": (_M, g) => animals.canidAt(g, walk({ kind: "wolf" })),
    "yellowstone-wolf-sitting": (_M, g) => animals.canidAt(g, walk({ kind: "wolf", state: "sit" })),
    "yellowstone-wolf-yearling": (_M, g) => animals.canidAt(g, walk({ kind: "wolf", scale: 0.9 })),
    "yellowstone-wolf-yearling-sitting": (_M, g) =>
      animals.canidAt(g, walk({ kind: "wolf", scale: 0.9, state: "sit" })),
    "yellowstone-pronghorn": (_M, g) => animals.cervidAt(g, walk({ kind: "pronghorn", sex: "m" })),
    "yellowstone-bighorn": (_M, g) => animals.sheepAt(g, walk({ state: "sit" })),
    "yellowstone-bighorn-look": (_M, g) => animals.sheepAt(g, walk({ state: "sit" }), { look: true }),
    "yellowstone-grizzly": (_M, g) => animals.bearAt(g, walk({ kind: "grizzly" })),
    "yellowstone-elk": (_M, g) => animals.cervidAt(g, walk({ kind: "elk", sex: "m" })),
    "yellowstone-elk-cow": (_M, g) => animals.cervidAt(g, walk({ kind: "elk", sex: "f", scale: 0.9 })),
    "yellowstone-eagle-side": (_M, g) => animals.raptorAt(g, bird({ kind: "eagleSide", pal: "eagle" })),
    "yellowstone-eagle-side-flapping": (_M, g) =>
      animals.raptorAt(g, bird({ kind: "eagleSide", pal: "eagle" }), { bank: true }),
    "yellowstone-bluebird": (_M, g) => animals.flyerAt(g, bird(), 0, "bluebird"),
    "yellowstone-eagle": (_M, g) => animals.raptorAt(g, bird({ kind: "eagle" })),
    "yellowstone-eagle-flapping": (_M, g) => animals.raptorAt(g, bird({ kind: "eagle" }), { bank: true }),
    "yellowstone-swan": (_M, g) => animals.swanAt(g, bird({ pose: "fly" }), 0),
    "yellowstone-swan-flapping": (_M, g) => animals.swanAt(g, bird({ pose: "fly" }), 0.5),
    "yellowstone-geyser": (M, g) => M.columnAt(g, { x: 40, top: ANIMAL_BOX.ground }, 2.5, 6, 1),
    "yellowstone-steam": (M, g) => M.steamAt(g, { x: 40, scale: 1 }, 1.5, false),
    "yellowstone-steam-night": (M, g) => {
      g.pal = M.default.palettes.dark;
      M.steamAt(g, { x: 40, scale: 1 }, 1.5, true);
    },
    "yellowstone-surge": (M, g) => {
      g.pal = M.default.palettes.dark;
      M.steamAt(g, { x: 40, scale: 1 }, 1.5, true, 2);
    },
    "yellowstone-fluff": (_M, g) => {
      for (const [x, y] of [
        [8, 8],
        [14, 12],
        [21, 6],
        [27, 14],
        [33, 9],
        [38, 16],
        [44, 11],
      ]) {
        rect(g, g.pal.fluff, x, y, 1, 1);
      }
    },
    "yellowstone-stars": (M, g) => {
      g.pal = M.default.palettes.dark;
      // The cone and spring are the plants init looks up; the cone's depth is CONE_DEPTH.
      const plants = [
        { kind: "geyserCone", x: 40, depth: 15 },
        { kind: "hotSpring", x: 40 },
      ];
      const { stars } = M.default.extras.init({
        rand: rng(3),
        cols: ANIMAL_BOX.w,
        groundY: ANIMAL_BOX.ground,
        plants,
      });
      M.default.extras.drawBack(g, { theme: "dark", extra: { stars } });
    },
  },
  hundredacre: {
    "hundredacre-birds": (M, g) => {
      const points = [
        [10, 20],
        [26, 14],
        [40, 24],
      ];
      const birds = points.map(([x, y], i) => ({ x, y, speed: 0, phase: i }));
      M.birdsAt(g, { cols: ANIMAL_BOX.w, extra: { birds } });
    },
    "hundredacre-sky": (M, g) => {
      // The moon sits at a fifth of the ground height, so a 60 px box needs a taller ground to keep
      // the whole disc on the canvas.
      g.pal = M.default.palettes.dark;
      const groundY = 100;
      const extra = M.default.extras.init({ rand: rng(3), cols: ANIMAL_BOX.w, groundY });
      M.skyAt(g, { cols: ANIMAL_BOX.w, groundY, extra });
    },
    "hundredacre-firefly": (M, g) => {
      g.pal = M.default.palettes.dark;
      const points = [
        [8, 30],
        [15, 22],
        [23, 34],
        [31, 18],
        [40, 28],
        [48, 36],
        [56, 24],
        [64, 32],
      ];
      const motes = points.map(([x, y], i) => ({ x, y, phase: i }));
      M.firefliesAt(g, { time: 0, extra: { motes } });
    },
    "hundredacre-owl": (_M, g) => animals.owlAt(g, bird(), 0.5),
    "hundredacre-owl-wings-down": (_M, g) => animals.owlAt(g, bird(), 0),
    "hundredacre-kessie": (_M, g) => animals.flyerAt(g, bird(), 0, "kessie"),
    "hundredacre-balloon": (M, g) => M.balloonAt(g, bird(), 0),
    "hundredacre-bees": (M, g) => M.beesAt(g, bird(), 0),
    "hundredacre-pooh": (M, g) => M.poohAt(g, walk({ lift: 0 }), 0),
    "hundredacre-pooh-sitting": (M, g) => M.poohAt(g, walk({ state: "sit", phase: 1, lift: 0 }), 0),
    "hundredacre-pooh-balloon": (M, g) => M.poohAt(g, walk({ lift: 8, held: 2 }), 0),
    "hundredacre-piglet": (M, g) => M.pigletAt(g, walk({ lift: 0 })),
    "hundredacre-piglet-balloon": (M, g) => M.pigletAt(g, walk({ lift: 8, held: 2 })),
    "hundredacre-eeyore": (M, g) => M.eeyoreAt(g, walk()),
    "hundredacre-eeyore-sitting": (M, g) => M.eeyoreAt(g, walk({ state: "sit" })),
    "hundredacre-rabbit": (M, g) => M.rabbitAt(g, walk()),
    "hundredacre-tigger": (M, g) => M.tiggerAt(g, walk(), 0),
    "hundredacre-tigger-sitting": (M, g) => M.tiggerAt(g, walk({ state: "sit", phase: 1 }), 0),
    "hundredacre-roo": (M, g) => M.rooAt(g, walk({ state: "sit" })),
  },
  wonderland: {
    "wonderland-rabbit": (M, g) => M.rabbitAt(g, walk()),
    "wonderland-caterpillar": (M, g) => M.caterpillarAt(g, { x: 40, top: 46 }, 0),
    "wonderland-hat": (M, g) => M.hatAt(g, { x: 52, seatRow: 46 }, 0),
    "wonderland-hare": (M, g) => M.hareAt(g, { seats: [40, 40], seatRow: 46 }, false),
    "wonderland-hare-sipping": (M, g) => M.hareAt(g, { seats: [40, 40], seatRow: 46 }, true),
    "wonderland-dodo": (M, g) => M.dodoAt(g, walk()),
    "wonderland-soldier": (M, g) => M.soldierAt(g, walk({ suit: "spade" })),
    "wonderland-soldier-red": (M, g) => M.soldierAt(g, walk({ suit: "heart" })),
    "wonderland-pigeon": (_M, g) => animals.flyerAt(g, bird(), 0, "pigeon"),
    "wonderland-lory": (_M, g) => animals.flyerAt(g, bird(), 0, "lory"),
    "wonderland-vulture": (M, g) => M.vultureAt(g, bird(), 0),
    "wonderland-vulture-open": (M, g) => M.vultureAt(g, bird(), Math.PI / 4),
    "wonderland-bread": (M, g) => M.breadAt(g, { homeX: 40, homeY: 30, phase: 0, speed: 0 }, 0),
    "wonderland-croquet": (M, g) => {
      M.soldierAt(g, walk({ suit: "heart", x: 30 }));
      M.croquetAt(g, walk({ x: 30 }), 1.3);
    },
    "wonderland-flock": (M, g) => M.flockAt(g, bird(), 0),
    "wonderland-cat": (M, g) => M.catAt(g, { x: 36, row: 44 }, 1),
    "wonderland-grin": (M, g) => M.grinAt(g, { x: 40, y: 30 }),
    "wonderland-ring": (M, g) => M.ringAt(g, { x: 36, y: 30, age: 1 }),
    "wonderland-bubble": (M, g) => M.bubbleAt(g, { x: 40, y: 30, phase: 0 }),
    "wonderland-cloud": (M, g) => M.cloudAt(g, { x: 30, y: 24, w: 40 }),
    "wonderland-sky": (M, g) => {
      g.pal = M.default.palettes.dark;
      const extra = M.default.extras.init({
        rand: rng(3),
        cols: ANIMAL_BOX.w,
        groundY: ANIMAL_BOX.ground,
        plants: [],
      });
      M.nightAt(g, { cols: ANIMAL_BOX.w, extra });
    },
  },
};

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
export function paintPlant(ctx, M, plant, pal) {
  const g = { ctx, pal, time: frame.time, groundY: PLANT_BOX.base, cols: 240 };
  const p = { ...plant, x: PLANT_BOX.w / 2, shown: MAX_STAGE, target: MAX_STAGE };
  M.default.paint[plant.kind](g, p, 1, PLANT_BOX.base);
}

// Paints one of SPRITES in an ANIMAL_BOX: walkers stand on its ground row at x = 40.
export function paintSprite(ctx, draw, M, pal) {
  const g = { ctx, pal, time: frame.time, groundY: ANIMAL_BOX.ground, cols: ANIMAL_BOX.w };
  draw(M, g);
}
