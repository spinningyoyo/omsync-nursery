// The poses the nursery tools draw: one sample of every plant kind and species, and a sprite for
// every animal, bird and effect, with the scene module copy M (its painters exported) and the
// painter group g. Shared by src/nursery/catalog.py and src/nursery/studio/server.py, whose sites
// serve js/ (the repository's modules) and this file side by side.

import * as animals from "./js/kit/animals.js";
import * as effects from "./js/kit/effects.js";
import * as fish from "./js/kit/fish.js";
import * as flyers from "./js/kit/flyers.js";
import * as insect from "./js/kit/insect.js";
import * as octopus from "./js/kit/octopus.js";
import * as owl from "./js/kit/owl.js";
import { fade, rect, rng } from "./js/kit/pixel.js";
import { meadowFlower, meadowFlowerHead } from "./js/kit/plants.js";
import * as smallbird from "./js/kit/smallbird.js";
import * as soaring from "./js/kit/soaring.js";
import { MAX_STAGE } from "./js/nursery.js";

export const WIDTHS = [240, 160, 90];
export const PLANT_BOX = { w: 80, h: 90, base: 84 };
export const ANIMAL_BOX = { w: 80, h: 60, ground: 46 };

// The animation frame the sprites are drawn at: walkers and birds take this phase, and painters this
// time. The catalogue keeps frame 0; the studio steps through a few frames to show a walk or a flap.
export const frame = { phase: 0, time: 0 };

// A meadow butterfly in flight, its round starting at time 0.
function butterfly(extra = {}) {
  return { homeX: 40, homeY: 30, phase: 0, speed: 0, colour: 4, cycle: 18, at: 0, ...extra };
}

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
  return { active: true, hx: 40, hy: 16, dir: 1, t, leap: null, count: 0, call: null };
}

// A perched owl in the pose given, on a short branch.
function owlPerched(M, g, species, pose) {
  g.pal = M.default.palettes.dark;
  const t = owl.owlTones(g.pal.owl);
  g.ctx.fillStyle = "#4a3a2c";
  g.ctx.fillRect(31, 40, 19, 1);
  owl.drawPerch(g, 40, 40, 1, t, owl.SPECIES[species], pose);
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
      haulOut: { state: "idle" },
      spray: { drops: [] },
    },
  };
}

// The soaring birds (kit/soaring.js): a side-on eagle, one seen from below, and a perched one. Each takes
// the bird's kind, as flyers.js names it, and draws on a small perch where it stands.
const SOAR_AT = [40, 30];
const soarSide = (kind, pose) => (_M, g) =>
  soaring.paint(g, soaring.sideBird(g, kind, pose), ...SOAR_AT, 1, soaring.SIDE_ORIGIN);
const soarFront = (kind, pose) => (_M, g) => soaring.paint(g, soaring.frontBird(g, kind, pose), 40, 24);
const soarPerched =
  (kind, moves = {}) =>
  (_M, g) => {
    rect(g, "#7a6a58", 34, SOAR_AT[1], 13, 2);
    rect(g, "#5a4a3a", 34, SOAR_AT[1] + 1, 13, 1);
    const p = soaring.perchPose({ look: -1, blink: -1, preen: -1, stretch: -1, ...moves }, 0);
    soaring.paint(g, soaring.perchedBird(g, kind, p), 40, SOAR_AT[1], 1, soaring.PERCH_ORIGIN);
  };
// The sprites of one soaring bird: seen from below (glide, bank, flapping or rocking) or side-on, landing,
// taking off, and perched (still, preening, stretching a wing). `from` is "below" or "side".
function soarSprites(prefix, kind, { side = false, below = true, vulture = false, stoop = false }) {
  const out = {};
  if (side) {
    out[`${prefix}-side`] = soarSide(kind, {});
    out[`${prefix}-side-flapping`] = soarSide(kind, { f: 0.9, v: 0.3 });
  }
  if (below) {
    out[prefix] = soarFront(kind, {});
    if (vulture) out[`${prefix}-rocking`] = soarFront(kind, { bank: 0.55 });
    else {
      out[`${prefix}-bank`] = soarFront(kind, { bank: 0.9 });
      out[`${prefix}-flapping`] = soarFront(kind, { f: 0.9, v: 0.3 });
    }
  }
  if (stoop) {
    out[`${prefix}-stoop`] = soarFront(kind, soaring.stoopPose(0.7));
    out[`${prefix}-pullout`] = soarFront(kind, soaring.stoopPose(1.45));
  }
  out[`${prefix}-landing`] = soarSide(kind, { f: 0.85, v: 0.2, feet: 1 });
  out[`${prefix}-takeoff`] = soarSide(kind, { f: -0.6, v: -0.4, feet: 0.8 });
  out[`${prefix}-perched`] = soarPerched(kind);
  out[`${prefix}-perched-preening`] = soarPerched(kind, { preen: 0.5 });
  out[`${prefix}-perched-stretching`] = soarPerched(kind, { stretch: 0.5 });
  return out;
}

// Animal and effect sprites: each takes the scene module copy M and the painter group g.
export const SPRITES = {
  meadow: {
    ...soarSprites("meadow-eagle", "golden", { side: true }),
    "meadow-bobcat": (_M, g) => animals.felidAt(g, walk({ kind: "bobcat" }), 0),
    "meadow-bobcat-sitting": (_M, g) => animals.felidAt(g, walk({ kind: "bobcat", state: "sit", pose: "sit" }), 0),
    "meadow-bobcat-arching": (_M, g) => animals.felidAt(g, walk({ kind: "bobcat", state: "sit", pose: "arch" }), 0),
    "meadow-bobcat-lying": (_M, g) => animals.felidAt(g, walk({ kind: "bobcat", state: "sit", pose: "lie" }), 0),
    "meadow-bobcat-stretching": (_M, g) => animals.felidAt(g, walk({ kind: "bobcat", state: "sit", pose: "bow" }), 0),
    "meadow-rabbit": (_M, g) => animals.hareAt(g, walk()),
    "meadow-rabbit-sitting-up": (_M, g) => animals.hareAt(g, walk({ state: "sit", pose: "tall" }), 0),
    "meadow-rabbit-grazing": (_M, g) => animals.hareAt(g, walk({ state: "sit", pose: "graze" }), 0),
    "meadow-rabbit-washing": (_M, g) => animals.hareAt(g, walk({ state: "sit", pose: "groom" }), 0),
    "meadow-rabbit-loafing": (_M, g) => animals.hareAt(g, walk({ state: "sit", pose: "loaf" }), 0),
    "meadow-rabbit-lying": (_M, g) => animals.hareAt(g, walk({ state: "sit", pose: "lie" }), 0),
    "meadow-fox": (_M, g) => animals.canidAt(g, walk({ kind: "red" })),
    "meadow-fox-pounce": (_M, g) => animals.canidAt(g, walk({ kind: "red", state: "pounce", lift: 6 })),
    "meadow-elk": (_M, g) => animals.cervidAt(g, walk({ kind: "elk", sex: "m", scale: 1.1 })),
    "meadow-elk-sitting": (_M, g) => animals.cervidAt(g, walk({ kind: "elk", sex: "m", scale: 1.1, state: "sit" })),
    "meadow-elk-lying": (_M, g) =>
      animals.cervidAt(g, walk({ kind: "elk", sex: "m", scale: 1.1, state: "sit", pose: "lie" })),
    "meadow-jay": (_M, g) => flyers.flyerAt(g, bird(), 0, "jay"),
    "meadow-jay-perched": (_M, g) => smallbird.perchedSmall(g, "jay", 40, 40, 0, smallbird.blendPose({})),
    "meadow-butterfly": (_M, g) => insect.butterflyAt(g, butterfly(), 0),
    "meadow-butterfly-settled": (_M, g) => {
      // Resting on a flower, the wings half open: 2.5 s into its round.
      const flower = { x: 40, seed: 2, scale: 1.2 };
      g.time = 0;
      meadowFlower(g, flower, 1, 44);
      insect.butterflyAt(g, butterfly({ at: -2.5, n: 0 }), 0, meadowFlowerHead(g, flower, 1, 44));
    },
    "meadow-bear": (_M, g) => animals.bearAt(g, walk()),
    "meadow-bear-foraging": (_M, g) =>
      animals.bearAt(g, walk({ state: "sit", pose: "forage", since: 0, timer: 30 }), 5),
    "meadow-bear-rearing": (_M, g) => animals.bearAt(g, walk({ state: "rear", since: 0, timer: 30 }), 5),
    "meadow-bear-sitting": (_M, g) => animals.bearAt(g, walk({ state: "sit", pose: "sit", since: 0, timer: 30 }), 5),
    "meadow-bear-lying": (_M, g) => animals.bearAt(g, walk({ state: "sit", pose: "lie", since: 0, timer: 30 }), 5),
    "meadow-bear-cub": (_M, g) => animals.bearAt(g, walk({ scale: 0.55, cub: true })),
    "meadow-bear-cub-sitting": (_M, g) =>
      animals.bearAt(g, walk({ scale: 0.55, cub: true, state: "sit", pose: "sit", since: 0, timer: 30 }), 5),
    "meadow-kingfisher": (_M, g) => flyers.kingfisherAt(g, bird(), 0),
    "meadow-kingfisher-perched": (_M, g) => smallbird.perchedSmall(g, "kingfisher", 40, 40, 0, smallbird.blendPose({})),
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
    ...soarSprites("rainforest-serpent", "serpent", {}),
    "rainforest-clouded-leopard": (_M, g) => animals.felidAt(g, walk({ kind: "clouded" }), 0),
    "rainforest-clouded-leopard-sitting": (_M, g) =>
      animals.felidAt(g, walk({ kind: "clouded", state: "sit", pose: "sit" }), 0),
    "rainforest-clouded-leopard-arching": (_M, g) =>
      animals.felidAt(g, walk({ kind: "clouded", state: "sit", pose: "arch" }), 0),
    "rainforest-clouded-leopard-lying": (_M, g) =>
      animals.felidAt(g, walk({ kind: "clouded", state: "sit", pose: "lie" }), 0),
    "rainforest-clouded-leopard-stretching": (_M, g) =>
      animals.felidAt(g, walk({ kind: "clouded", state: "sit", pose: "bow" }), 0),
    "rainforest-kingfisher": (_M, g) => flyers.kingfisherAt(g, bird(), 0),
    "rainforest-kingfisher-perched": (_M, g) =>
      smallbird.perchedSmall(g, "kingfisher", 40, 40, 0, smallbird.blendPose({})),
    "rainforest-hornbill": (M, g) => M.hornbillAt(g, bird(), 0),
    "rainforest-hornbill-up": (M, g) => M.hornbillAt(g, bird(), 0.4),
    "rainforest-hornbill-perched": (_M, g) => smallbird.perchedSmall(g, "hornbill", 40, 40, 0, smallbird.blendPose({})),
    "rainforest-monkey": (_M, g) => animals.macaqueAt(g, walk(), 0),
    "rainforest-monkey-sitting": (_M, g) => animals.macaqueAt(g, walk({ state: "sit", pose: "sit" }), 0),
    "rainforest-monkey-yawning": (_M, g) => animals.macaqueAt(g, walk({ state: "sit", act: "yawn", actAt: 0.8 }), 0),
    "rainforest-elephant": (_M, g) => animals.elephantAt(g, walk({ kind: "asian" }), 0),
    "rainforest-elephant-calf": (_M, g) => animals.elephantAt(g, walk({ kind: "asian", scale: 0.55 }), 0),
    "rainforest-langur": (_M, g) => animals.langurAt(g, { x: 40, y: 34, dir: 1, phase: 0, moves: {} }, 0),
    "rainforest-langur-reaching": (_M, g) =>
      animals.langurAt(g, { x: 40, y: 34, dir: 1, phase: 0, moves: { reach: { until: 2.3, lasts: 2.9 } } }, 0),
    "rainforest-langur-eating": (_M, g) =>
      animals.langurAt(g, { x: 40, y: 34, dir: 1, phase: 0, moves: { reach: { until: 1.4, lasts: 2.9 } } }, 0),
    "rainforest-langur-leaping": (_M, g) =>
      animals.langurAt(
        g,
        { x: 27, y: 34, dir: 1, phase: 0, moves: {}, perches: [27, 53], hop: { from: 27, to: 53, start: -2.6 } },
        0,
      ),
    "rainforest-otter": (_M, g) => animals.otterAt(g, walk({ c: 0.6 + frame.phase * 0.25 }), 0),
    "rainforest-otter-standing": (_M, g) =>
      animals.otterAt(g, walk({ state: "sit", pose: "stand", still: 1.7, timer: 3 }), 1.7),
    "rainforest-firefly": (M, g) => M.fireflyAt(g, { homeX: 40, homeY: 30, phase: 0, speed: 0, reach: 8 }, 0.75),
    "rainforest-firefly-rising": (M, g) => M.fireflyAt(g, { homeX: 40, homeY: 30, phase: 0, speed: 0, reach: 8 }, 0.3),
    "rainforest-firefly-tree": (_M, g) => {
      // A crown's fireflies in the middle of a flash that has drawn together.
      const tree = { cx: 40, half: 24, top: 8, bottom: 34 };
      const flies = Array.from({ length: 12 }, (_, i) => ({ u: (i % 6) / 2.5 - 1, v: (i % 4) / 3, phase: i }));
      insect.treeFireflies(g, flies, tree, 6.4, g.pal.fire);
    },
    "rainforest-gibbon-behind": (_M, g) => animals.gibbonAt(g, swinging(0), g.pal),
    "rainforest-gibbon": (_M, g) => animals.gibbonAt(g, swinging(0.5), g.pal),
    "rainforest-gibbon-ahead": (_M, g) => animals.gibbonAt(g, swinging(1), g.pal),
    "rainforest-gibbon-calling": (_M, g) => animals.gibbonAt(g, { ...swinging(0), hx: 34, call: 3.0 }, g.pal, 3.0),
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
    "hawaii-cat-loafing": (_M, g) =>
      animals.felidAt(g, walk({ kind: "housecat", pal: "housecat-calico", state: "sit", pose: "loaf" }), 0),
    "hawaii-cat-curled": (_M, g) =>
      animals.felidAt(g, walk({ kind: "housecat", pal: "housecat-calico", state: "sit", pose: "curl" }), 0),
    "hawaii-cat-dozing": (_M, g) =>
      animals.felidAt(g, walk({ kind: "housecat", pal: "housecat-calico", state: "sit", pose: "doze" }), 0),
    "hawaii-cat-grooming": (_M, g) =>
      animals.felidAt(g, walk({ kind: "housecat", pal: "housecat-calico", state: "sit", pose: "groom" }), 0),
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
    "hawaii-tropicbird-perched": (_M, g) => smallbird.perchedSmall(g, "tropicbird", 40, 40, 0, smallbird.blendPose({})),
    "hawaii-iiwi": (_M, g) => flyers.flyerAt(g, bird(), 0, "iiwi"),
    "hawaii-iiwi-perched": (_M, g) => smallbird.perchedSmall(g, "iiwi", 40, 40, 0, smallbird.blendPose({})),
    "hawaii-crab": (_M, g) => animals.crabAt(g, walk({ lane: 0 }), g.groundY + 5),
    "hawaii-crab-crouching": (_M, g) => animals.crabAt(g, walk({ state: "sit", pose: "crouch" }), g.groundY + 5, 0),
    "hawaii-crab-threatening": (_M, g) => animals.crabAt(g, walk({ state: "sit", pose: "threat" }), g.groundY + 5, 0.1),
    "hawaii-honu": (M, g) => M.honuAt(g, { x: 40, dir: 1, scale: 1 }, 0, 8, 44),
    "hawaii-honu-crawling": (_M, g) =>
      animals.honuAshoreAt(g, { x: 40, dir: 1, mode: "crawl", age: 0.9 }, g.groundY + 6),
    "hawaii-honu-basking": (_M, g) => animals.honuAshoreAt(g, { x: 40, dir: 1, mode: "bask", age: 7.2 }, g.groundY + 6),
    "hawaii-honu-hatchling": (M, g) => M.honuAt(g, { x: 40, dir: 1, scale: 0.5 }, 0, 8, 44),
    "hawaii-seal": (_M, g) => animals.sealAt(g, walk({ c: 0.2 + frame.phase * 0.25 }), 0),
    "hawaii-seal-head-up": (_M, g) => animals.sealAt(g, walk({ state: "sit", pose: "lie", still: 2.6, timer: 5 }), 2.6),
    "hawaii-seal-rolling": (_M, g) =>
      animals.sealAt(g, walk({ state: "sit", pose: "roll", still: 3.6, timer: 6 }), 3.6),
    "hawaii-seal-pup": (_M, g) => animals.sealAt(g, walk({ scale: 0.55, c: 0.2 + frame.phase * 0.25 }), 0),
    "hawaii-moa": (M, g) => M.moaAt(g, walk({ c: frame.phase * 0.25, amp: 1 }), 0),
    "hawaii-moa-pecking": (M, g) => M.moaAt(g, walk({ state: "sit", pose: "peck", since: 0, timer: 6, amp: 0 }), 0.5),
    "hawaii-moa-scratching": (M, g) =>
      M.moaAt(g, walk({ state: "sit", pose: "scratch", since: 0, timer: 6, amp: 0 }), 1.6),
    "hawaii-moa-preening": (M, g) => M.moaAt(g, walk({ state: "sit", pose: "preen", since: 0, timer: 6, amp: 0 }), 1.5),
    "hawaii-moa-flapping": (M, g) => M.moaAt(g, walk({ state: "sit", pose: "flap", since: 0, timer: 6, amp: 0 }), 1.3),
    "hawaii-puaa": (_M, g) => animals.puaaAt(g, walk(), 0),
    "hawaii-puaa-rooting": (_M, g) => animals.puaaAt(g, walk({ state: "sit", pose: "root", since: 0, timer: 6 }), 3.2),
    "hawaii-puaa-wallowing": (_M, g) =>
      animals.puaaAt(g, walk({ state: "sit", pose: "wallow", since: 0, timer: 14 }), 5.4),
    "hawaii-puaa-shaking": (_M, g) =>
      animals.puaaAt(g, walk({ state: "sit", pose: "wallow", since: 0, timer: 14 }), 9.6),
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
      M.default.extras.drawBack(g, seaFrame(7, 1, { start: 0.2, x: 40, dir: 1, dive: false }));
    },
    "hawaii-whale-surfacing": (M, g) => {
      g.time = 1.6;
      M.default.extras.drawBack(g, seaFrame(7, 1.6, { start: 0, x: 40, dir: 1, dive: false }));
    },
    "hawaii-whale-fluke": (M, g) => {
      g.time = 2.4;
      M.default.extras.drawBack(g, seaFrame(7, 2.4, { start: 0, x: 40, dir: 1, dive: true }));
    },
  },
  desert: {
    ...soarSprites("desert-vulture", "vulture", { vulture: true }),
    ...soarSprites("desert-hawk", "hawk", { stoop: true }),
    "desert-bobcat": (_M, g) => animals.felidAt(g, walk({ kind: "bobcat", pal: "bobcatDesert" }), 0),
    "desert-bobcat-sitting": (_M, g) =>
      animals.felidAt(g, walk({ kind: "bobcat", pal: "bobcatDesert", state: "sit", pose: "sit" }), 0),
    "desert-bobcat-arching": (_M, g) =>
      animals.felidAt(g, walk({ kind: "bobcat", pal: "bobcatDesert", state: "sit", pose: "arch" }), 0),
    "desert-bobcat-lying": (_M, g) =>
      animals.felidAt(g, walk({ kind: "bobcat", pal: "bobcatDesert", state: "sit", pose: "lie" }), 0),
    "desert-bobcat-stretching": (_M, g) =>
      animals.felidAt(g, walk({ kind: "bobcat", pal: "bobcatDesert", state: "sit", pose: "bow" }), 0),
    "desert-roadrunner": (M, g) => M.roadrunnerAt(g, walk({ c: frame.phase * 0.25, amp: 1 }), 0),
    "desert-roadrunner-standing": (M, g) => M.roadrunnerAt(g, walk({ state: "sit", amp: 0 }), 0),
    "desert-roadrunner-pumping": (M, g) =>
      M.roadrunnerAt(g, walk({ state: "sit", pose: "pump", since: 0, timer: 6, amp: 0 }), 1.0),
    "desert-roadrunner-preening": (M, g) =>
      M.roadrunnerAt(g, walk({ state: "sit", pose: "preen", since: 0, timer: 6, amp: 0 }), 2.0),
    "desert-roadrunner-stretching": (M, g) =>
      M.roadrunnerAt(g, walk({ state: "sit", pose: "stretch", since: 0, timer: 6, amp: 0 }), 1.5),
    "desert-rabbit": (_M, g) => animals.hareAt(g, walk({ kind: "jackrabbit" })),
    "desert-rabbit-looking-out": (_M, g) =>
      animals.hareAt(g, walk({ kind: "jackrabbit", state: "sit", pose: "tall" }), 0),
    "desert-rabbit-freezing": (_M, g) => animals.hareAt(g, walk({ kind: "jackrabbit", state: "sit", frozen: 1.5 }), 0),
    "desert-snake": (_M, g) => animals.snakeAt(g, walk(), 0),
    "desert-snake-coiled": (_M, g) => animals.snakeAt(g, walk({ state: "sit", pose: "coil", since: 0, timer: 30 }), 5),
    "desert-snake-rearing": (_M, g) => animals.snakeAt(g, walk({ state: "sit", pose: "rear", since: 0, timer: 30 }), 5),
    "desert-tortoise": (_M, g) => animals.tortoiseAt(g, walk(), g.groundY + 6),
    "desert-tortoise-resting": (_M, g) =>
      animals.tortoiseAt(g, walk({ state: "sit", pose: "tuck", since: 0, timer: 30 }), g.groundY + 6, 4),
    "desert-tortoise-grazing": (_M, g) =>
      animals.tortoiseAt(g, walk({ state: "sit", pose: "graze", since: 0, timer: 30 }), g.groundY + 6, 2),
    "desert-tortoise-looking": (_M, g) =>
      animals.tortoiseAt(g, walk({ state: "sit", pose: "look", since: 0, timer: 30 }), g.groundY + 6, 2),
    "desert-coyote": (_M, g) => animals.canidAt(g, walk({ kind: "coyote" })),
    "desert-coyote-howl": (_M, g) => animals.canidAt(g, walk({ kind: "coyote", state: "howl" })),
    "desert-coyote-pup": (_M, g) => animals.canidAt(g, walk({ kind: "coyote", scale: 0.6 })),
    "desert-coyote-pup-sitting": (_M, g) => animals.canidAt(g, walk({ kind: "coyote", scale: 0.6, state: "sit" })),
    "desert-coyote-pup-howl": (_M, g) => animals.canidAt(g, walk({ kind: "coyote", scale: 0.6, state: "howl" })),
    "desert-bighorn": (_M, g) => animals.bighornAt(g, walk({ state: "sit" })),
    "desert-bighorn-look": (_M, g) => animals.bighornAt(g, walk({ state: "sit", act: "look", actAt: 2.5 })),
    "desert-bighorn-grazing": (_M, g) => animals.bighornAt(g, walk({ state: "sit", act: "graze", actAt: 1.8 })),
    "desert-bighorn-lying": (_M, g) => animals.bighornAt(g, walk({ state: "sit", act: "lie", actAt: 3 })),
    "desert-owl": (M, g) => owlPerched(M, g, "horned", { s: 0 }),
    "desert-owl-swivel": (M, g) => owlPerched(M, g, "horned", { s: 0.9 }),
    "desert-owl-fluff": (M, g) => owlPerched(M, g, "horned", { fluff: 1, shiver: 1 }),
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
    ...soarSprites("smokies-eagle", "golden", { side: true }),
    "smokies-bobcat": (_M, g) => animals.felidAt(g, walk({ kind: "bobcat" }), 0),
    "smokies-bobcat-sitting": (_M, g) => animals.felidAt(g, walk({ kind: "bobcat", state: "sit", pose: "sit" }), 0),
    "smokies-bobcat-arching": (_M, g) => animals.felidAt(g, walk({ kind: "bobcat", state: "sit", pose: "arch" }), 0),
    "smokies-bobcat-lying": (_M, g) => animals.felidAt(g, walk({ kind: "bobcat", state: "sit", pose: "lie" }), 0),
    "smokies-bobcat-stretching": (_M, g) => animals.felidAt(g, walk({ kind: "bobcat", state: "sit", pose: "bow" }), 0),
    "smokies-cardinal": (_M, g) => flyers.flyerAt(g, bird(), 0, "cardinal"),
    "smokies-cardinal-perched": (_M, g) => smallbird.perchedSmall(g, "cardinal", 40, 40, 0, smallbird.blendPose({})),
    "smokies-swift": (_M, g) => flyers.flyerAt(g, bird(), 0, "swift"),
    "smokies-turkey": (M, g) => M.turkeyAt(g, walk({ c: frame.phase * 0.25, amp: 1 }), 0),
    "smokies-turkey-displaying": (M, g) =>
      M.turkeyAt(
        g,
        walk({ state: "sit", pose: "display", since: 0, timer: 8, c: 0.3 + frame.phase * 0.1, amp: 1 }),
        3.2,
      ),
    "smokies-turkey-preening": (M, g) =>
      M.turkeyAt(g, walk({ state: "sit", pose: "preen", since: 0, timer: 6, amp: 0 }), 1.5),
    "smokies-groundhog": (_M, g) => animals.hareAt(g, walk({ kind: "groundhog" }), 0),
    "smokies-groundhog-sitting": (_M, g) => animals.hareAt(g, walk({ kind: "groundhog", state: "sit" }), 0),
    "smokies-groundhog-eating": (_M, g) =>
      animals.hareAt(g, walk({ kind: "groundhog", state: "sit", pose: "hunch" }), 0),
    "smokies-groundhog-sprawling": (_M, g) =>
      animals.hareAt(g, walk({ kind: "groundhog", state: "sit", pose: "sprawl" }), 0),
    "smokies-deer": (_M, g) => animals.cervidAt(g, walk({ kind: "whitetail", sex: "f" })),
    "smokies-deer-antlered": (_M, g) => animals.cervidAt(g, walk({ kind: "whitetail", sex: "m" })),
    "smokies-deer-flag": (_M, g) => animals.cervidAt(g, walk({ kind: "whitetail", sex: "f", state: "run" })),
    "smokies-deer-grazing": (_M, g) => animals.cervidAt(g, walk({ kind: "whitetail", sex: "f", state: "sit" })),
    "smokies-deer-lying": (_M, g) =>
      animals.cervidAt(g, walk({ kind: "whitetail", sex: "m", state: "sit", pose: "lie" })),
    "smokies-deer-listening": (_M, g) =>
      animals.cervidAt(g, walk({ kind: "whitetail", sex: "f", state: "sit", hearSince: 0, hearUntil: 5 }), 1),
    "smokies-elk": (_M, g) => animals.cervidAt(g, walk({ kind: "elk", sex: "m" })),
    "smokies-elk-bugle": (_M, g) => animals.cervidAt(g, walk({ kind: "elk", sex: "m", state: "bugle", actAt: 1.2 })),
    "smokies-bear": (_M, g) => animals.bearAt(g, walk()),
    "smokies-bear-foraging": (_M, g) =>
      animals.bearAt(g, walk({ state: "sit", pose: "forage", since: 0, timer: 30 }), 5),
    "smokies-bear-rearing": (_M, g) => animals.bearAt(g, walk({ state: "rear", since: 0, timer: 30 }), 5),
    "smokies-bear-sitting": (_M, g) => animals.bearAt(g, walk({ state: "sit", pose: "sit", since: 0, timer: 30 }), 5),
    "smokies-bear-lying": (_M, g) => animals.bearAt(g, walk({ state: "sit", pose: "lie", since: 0, timer: 30 }), 5),
    "smokies-bear-cub": (_M, g) => animals.bearAt(g, walk({ scale: 0.55, cub: true })),
    "smokies-bear-cub-sitting": (_M, g) =>
      animals.bearAt(g, walk({ scale: 0.55, cub: true, state: "sit", pose: "sit", since: 0, timer: 30 }), 5),
    "smokies-bear-cub-climbing": (_M, g) => {
      const y = g.groundY + 7;
      rect(g, g.pal.trunk[0], 47, y - 40, 2, 40);
      rect(g, g.pal.trunk[1], 49, y - 40, 2, 40);
      animals.bearAt(
        g,
        walk({ cub: true, climb: { lead: 1, up: 2.4, hold: 2.3, down: 2.4, tail: 1, t: 3.4, height: 12 } }),
        5,
      );
    },
    "smokies-owl": (M, g) => owlPerched(M, g, "barred", { s: 0 }),
    "smokies-owl-swivel": (M, g) => owlPerched(M, g, "barred", { s: -0.9 }),
    "smokies-owl-fluff": (M, g) => owlPerched(M, g, "barred", { fluff: 1, shiver: 1 }),
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
    ...soarSprites("serengeti-vulture", "vultureAf", { vulture: true }),
    "serengeti-cheetah": (_M, g) => animals.felidAt(g, walk({ kind: "cheetah" }), 0),
    "serengeti-cheetah-sitting": (_M, g) => animals.felidAt(g, walk({ kind: "cheetah", state: "sit", pose: "sit" }), 0),
    "serengeti-cheetah-lying": (_M, g) => animals.felidAt(g, walk({ kind: "cheetah", state: "sit", pose: "lie" }), 0),
    "serengeti-cheetah-stretching": (_M, g) =>
      animals.felidAt(g, walk({ kind: "cheetah", state: "sit", pose: "bow" }), 0),
    "serengeti-zebra": (_M, g) => animals.zebraAt(g, walk(), 0),
    "serengeti-zebra-foal": (_M, g) => animals.zebraAt(g, walk({ scale: 0.6 }), 0),
    "serengeti-zebra-grazing": (_M, g) =>
      animals.zebraAt(g, walk({ state: "sit", pose: "graze", since: 0, timer: 5 }), 2.5),
    "serengeti-zebra-lying": (_M, g) => animals.zebraAt(g, walk({ state: "sit", pose: "lie", since: 0, timer: 3 }), 3),
    "serengeti-zebra-rolling": (_M, g) =>
      animals.zebraAt(g, walk({ state: "sit", pose: "roll", since: 0, timer: 5 }), 3.2),
    "serengeti-zebra-foal-lying": (_M, g) =>
      animals.zebraAt(g, walk({ scale: 0.6, state: "sit", pose: "lie", since: 0, timer: 3.5 }), 3),
    "serengeti-giraffe": (_M, g) => animals.giraffeAt(g, walk(), 0),
    "serengeti-giraffe-browsing": (M, g) => {
      M.default.paint.acacia(g, { x: 78, scale: 1.3, seed: 2, depth: 7 }, 1, ANIMAL_BOX.ground);
      animals.giraffeAt(g, walk({ state: "sit", pose: "browse", since: 0, timer: 4 }), 3);
    },
    "serengeti-giraffe-drinking": (_M, g) =>
      animals.giraffeAt(g, walk({ state: "sit", pose: "drink", since: 0, timer: 4 }), 3),
    "serengeti-secretary": (M, g) => M.secretaryAt(g, walk({ c: frame.phase * 0.25, amp: 1 }), 0),
    "serengeti-secretary-stamping": (M, g) =>
      M.secretaryAt(g, walk({ state: "sit", pose: "stamp", since: 0, timer: 8, amp: 0 }), 2.3),
    "serengeti-secretary-eating": (M, g) =>
      M.secretaryAt(g, walk({ state: "sit", pose: "stamp", since: 0, timer: 8, amp: 0 }), 4.8),
    "serengeti-secretary-preening": (M, g) =>
      M.secretaryAt(g, walk({ state: "sit", pose: "preen", since: 0, timer: 6, amp: 0 }), 1.5),
    "serengeti-secretary-stretching": (M, g) =>
      M.secretaryAt(g, walk({ state: "sit", pose: "stretch", since: 0, timer: 6, amp: 0 }), 1.5),
    "serengeti-elephant": (_M, g) => animals.elephantAt(g, walk({ kind: "african" }), 0),
    "serengeti-elephant-calf": (_M, g) => animals.elephantAt(g, walk({ kind: "african", scale: 0.5 }), 0),
    "serengeti-elephant-trumpeting": (_M, g) =>
      animals.elephantAt(g, walk({ kind: "african", state: "sit", act: "trumpet", actAt: 1.2 }), 0),
    "serengeti-elephant-curling": (_M, g) =>
      animals.elephantAt(g, walk({ kind: "african", state: "sit", act: "curl", actAt: 1.1 }), 0),
    "serengeti-elephant-dust-bath": (_M, g) =>
      animals.elephantAt(g, walk({ kind: "african", state: "sit", act: "dust", actAt: 2.2 }), 0),
    "serengeti-elephant-calf-lying": (_M, g) =>
      animals.elephantAt(g, walk({ kind: "african", scale: 0.5, state: "sit", pose: "lie" }), 0),
    "serengeti-lion": (M, g) => M.lionAt(g, walk(), ANIMAL_BOX.ground + 7, 0),
    "serengeti-lion-sitting": (M, g) => M.lionAt(g, walk({ state: "sit" }), ANIMAL_BOX.ground + 7, 0),
    "serengeti-lion-lying": (M, g) => M.lionAt(g, walk({ state: "sit", pose: "lie" }), ANIMAL_BOX.ground + 7, 0),
    "serengeti-lion-stretching": (M, g) => M.lionAt(g, walk({ state: "sit", pose: "bow" }), ANIMAL_BOX.ground + 7, 0),
    "serengeti-lion-raised": (M, g) => M.lionAt(g, walk({ state: "stand", roar: 0.1 }), ANIMAL_BOX.ground + 7, 0),
    "serengeti-lion-roaring": (M, g) => M.lionAt(g, walk({ state: "stand", roar: 0.5 }), ANIMAL_BOX.ground + 7, 0),
    "serengeti-cub": (M, g) => M.cubAt(g, walk({ moving: true, c: frame.phase * 0.25, amp: 1 }), 0),
    "serengeti-cub-sitting": (M, g) => M.cubAt(g, walk({ state: "sit", still: 5 }), 0),
    "serengeti-cub-looking-up": (M, g) => M.cubAt(g, walk({ state: "sit", pose: "sitUp", still: 5, look: 1 }), 0),
    "serengeti-cub-pounce": (M, g) => M.cubAt(g, walk({ state: "sit", pose: "pounce", still: 5, poseAt: -1.7 }), 0),
    "serengeti-cub-bounding": (M, g) => M.cubAt(g, walk({ pose: "bound", bd: 0.3 + frame.phase * 0.25 }), 0),
    "serengeti-roller": (M, g) => M.rollerAt(g, bird(), 0),
    "serengeti-roller-up": (M, g) => M.rollerAt(g, bird(), 0.3),
    "serengeti-roller-perched": (_M, g) => smallbird.perchedSmall(g, "roller", 40, 40, 0, smallbird.blendPose({})),
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
    "iceland-cat-loafing": (_M, g) =>
      animals.felidAt(g, walk({ kind: "housecat", pal: "housecat-brown-tabby", state: "sit", pose: "loaf" }), 0),
    "iceland-cat-curled": (_M, g) =>
      animals.felidAt(g, walk({ kind: "housecat", pal: "housecat-brown-tabby", state: "sit", pose: "curl" }), 0),
    "iceland-cat-dozing": (_M, g) =>
      animals.felidAt(g, walk({ kind: "housecat", pal: "housecat-brown-tabby", state: "sit", pose: "doze" }), 0),
    "iceland-cat-grooming": (_M, g) =>
      animals.felidAt(g, walk({ kind: "housecat", pal: "housecat-brown-tabby", state: "sit", pose: "groom" }), 0),
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
    "iceland-owl": (_M, g) => flyers.owlFlyAt(g, bird(), 0.4, "shortEared"),
    "iceland-owl-glide": (_M, g) => flyers.owlFlyAt(g, bird(), 2.2, "shortEared"),
    "iceland-swan": (_M, g) => animals.swanAt(g, walk(), 0),
    "iceland-swan-feeding": (_M, g) => animals.swanAt(g, walk({ state: "sit", since: -2, timer: 20 }), 0),
    "iceland-swan-looking": (_M, g) => animals.swanAt(g, walk({ state: "sit", pose: "look", since: -2, timer: 20 }), 0),
    "iceland-swan-preening": (_M, g) =>
      animals.swanAt(g, walk({ state: "sit", pose: "preen", since: -2, timer: 20 }), 0),
    "iceland-swan-flapping": (_M, g) =>
      animals.swanAt(g, walk({ state: "sit", pose: "flap", since: -1.4, timer: 20 }), 0),
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
    "iceland-puffin-nesting": (_M, g) =>
      flyers.nesterAt(g, { x: 40, y: 40, dir: 1, moves: {}, carrying: 99 }, 0, false),
    "iceland-puffin-preening": (_M, g) =>
      flyers.nesterAt(
        g,
        { x: 40, y: 40, dir: 1, moves: { preen: { until: 1.25, lasts: 2.4 } }, carrying: -1 },
        0,
        false,
      ),
    "iceland-puffin-stretching": (_M, g) =>
      flyers.nesterAt(
        g,
        { x: 40, y: 40, dir: 1, moves: { stretch: { until: 0.8, lasts: 1.6 } }, carrying: -1 },
        0,
        false,
      ),
    "iceland-puffin-asleep": (M, g) => {
      g.pal = M.default.palettes.dark;
      flyers.nesterAt(g, { x: 40, y: 40, dir: 1, moves: {}, carrying: -1 }, 0, true);
    },
    "iceland-hind": (_M, g) => animals.cervidAt(g, walk({ kind: "reindeer", sex: "f", scale: 0.9 })),
    "iceland-stag": (_M, g) => animals.cervidAt(g, walk({ kind: "reindeer", sex: "m" })),
    "iceland-stag-grazing": (_M, g) => animals.cervidAt(g, walk({ kind: "reindeer", sex: "m", state: "sit" })),
    "iceland-stag-lying": (_M, g) =>
      animals.cervidAt(g, walk({ kind: "reindeer", sex: "m", state: "sit", pose: "lie" })),
  },
  yellowstone: {
    ...soarSprites("yellowstone-eagle", "bald", { side: true }),
    "yellowstone-cougar": (_M, g) => animals.felidAt(g, walk({ kind: "cougar" }), 0),
    "yellowstone-cougar-sitting": (_M, g) => animals.felidAt(g, walk({ kind: "cougar", state: "sit", pose: "sit" }), 0),
    "yellowstone-cougar-lying": (_M, g) => animals.felidAt(g, walk({ kind: "cougar", state: "sit", pose: "lie" }), 0),
    "yellowstone-cougar-stretching": (_M, g) =>
      animals.felidAt(g, walk({ kind: "cougar", state: "sit", pose: "bow" }), 0),
    "yellowstone-bison": (_M, g) => animals.bisonAt(g, walk({ scale: 1 }), 0),
    "yellowstone-bison-grazing": (_M, g) =>
      animals.bisonAt(g, walk({ state: "sit", pose: "graze", since: 0, timer: 5 }), 2.5),
    "yellowstone-bison-wallowing": (_M, g) =>
      animals.bisonAt(g, walk({ state: "sit", pose: "wallow", since: 0, timer: 10 }), 4),
    "yellowstone-bison-calf": (_M, g) => animals.bisonAt(g, walk({ scale: 0.55 }), 0),
    "yellowstone-bison-calf-lying": (_M, g) =>
      animals.bisonAt(g, walk({ scale: 0.55, state: "sit", pose: "lie", since: 0, timer: 6 }), 3),
    "yellowstone-wolf": (_M, g) => animals.canidAt(g, walk({ kind: "wolf" })),
    "yellowstone-wolf-sitting": (_M, g) => animals.canidAt(g, walk({ kind: "wolf", state: "sit" })),
    "yellowstone-wolf-lying": (_M, g) => animals.canidAt(g, walk({ kind: "wolf", state: "sit", pose: "lie" })),
    "yellowstone-wolf-bow": (_M, g) =>
      animals.canidAt(g, walk({ kind: "wolf", state: "sit", pose: "sit", bows: true, stopEnd: 10 }), 9.3),
    "yellowstone-wolf-howl": (_M, g) => animals.canidAt(g, walk({ kind: "wolf", state: "howl", actAt: 1.4 })),
    "yellowstone-wolf-yearling": (_M, g) => animals.canidAt(g, walk({ kind: "wolf", scale: 0.9 })),
    "yellowstone-wolf-yearling-sitting": (_M, g) =>
      animals.canidAt(g, walk({ kind: "wolf", scale: 0.9, state: "sit" })),
    "yellowstone-wolf-yearling-howl": (_M, g) =>
      animals.canidAt(g, walk({ kind: "wolf", scale: 0.9, state: "howl", actAt: 1.4 })),
    "yellowstone-pronghorn": (_M, g) => animals.cervidAt(g, walk({ kind: "pronghorn", sex: "m" })),
    "yellowstone-bighorn": (_M, g) => animals.bighornAt(g, walk({ state: "sit" })),
    "yellowstone-bighorn-look": (_M, g) => animals.bighornAt(g, walk({ state: "sit", act: "look", actAt: 2.5 })),
    "yellowstone-bighorn-grazing": (_M, g) => animals.bighornAt(g, walk({ state: "sit", act: "graze", actAt: 1.8 })),
    "yellowstone-bighorn-lying": (_M, g) => animals.bighornAt(g, walk({ state: "sit", act: "lie", actAt: 3 })),
    "yellowstone-grizzly": (_M, g) => animals.bearAt(g, walk({ kind: "grizzly" })),
    "yellowstone-grizzly-foraging": (_M, g) =>
      animals.bearAt(g, walk({ kind: "grizzly", state: "sit", pose: "forage", since: 0, timer: 30 }), 5),
    "yellowstone-grizzly-rearing": (_M, g) =>
      animals.bearAt(g, walk({ kind: "grizzly", state: "rear", since: 0, timer: 30 }), 5),
    "yellowstone-grizzly-sitting": (_M, g) =>
      animals.bearAt(g, walk({ kind: "grizzly", state: "sit", pose: "sit", since: 0, timer: 30 }), 5),
    "yellowstone-grizzly-lying": (_M, g) =>
      animals.bearAt(g, walk({ kind: "grizzly", state: "sit", pose: "lie", since: 0, timer: 30 }), 5),
    "yellowstone-elk": (_M, g) => animals.cervidAt(g, walk({ kind: "elk", sex: "m" })),
    "yellowstone-elk-cow": (_M, g) => animals.cervidAt(g, walk({ kind: "elk", sex: "f", scale: 0.9 })),
    "yellowstone-elk-cow-grazing": (_M, g) =>
      animals.cervidAt(g, walk({ kind: "elk", sex: "f", scale: 0.9, state: "sit" })),
    "yellowstone-elk-lying": (_M, g) => animals.cervidAt(g, walk({ kind: "elk", sex: "m", state: "sit", pose: "lie" })),
    "yellowstone-bluebird": (_M, g) => flyers.flyerAt(g, bird(), 0, "bluebird"),
    "yellowstone-bluebird-perched": (_M, g) =>
      smallbird.perchedSmall(g, "bluebird", 40, 40, 0, smallbird.blendPose({})),
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
      M.firefliesAt(g, { time: 1, extra: { motes } });
    },
    "hundredacre-owl": (_M, g) => flyers.owlFlyAt(g, bird(), 0.4, "horned"),
    "hundredacre-owl-glide": (_M, g) => flyers.owlFlyAt(g, bird(), 2.2, "horned"),
    "hundredacre-owl-perched": (M, g) => owlPerched(M, g, "horned", { s: 0 }),
    "hundredacre-owl-swivel": (M, g) => owlPerched(M, g, "horned", { s: 0.9 }),
    "hundredacre-kessie": (_M, g) => flyers.flyerAt(g, bird(), 0, "kessie"),
    "hundredacre-kessie-perched": (M, g) => {
      g.pal = M.default.palettes.light;
      g.ctx.fillStyle = "#6b4a2a";
      g.ctx.fillRect(31, 40, 19, 1);
      smallbird.perchedSmall(g, "kessie", 40, 40, 0, smallbird.blendPose({}));
    },
    "hundredacre-balloon": (M, g) => M.balloonAt(g, bird(), 0),
    "hundredacre-bees": (_M, g) => animals.swarmAt(g, bird(), 0),
    "hundredacre-pooh": (_M, g) => animals.poohAt(g, walk({ step: frame.phase * 0.25 }), 0),
    "hundredacre-pooh-sitting": (_M, g) => animals.poohAt(g, walk({ state: "sit", pose: "sit" }), 2.5),
    "hundredacre-pooh-balloon": (_M, g) => animals.poohAt(g, walk({ state: "stand", lift: 8, held: 2 }), 0),
    "hundredacre-piglet": (_M, g) => animals.pigletAt(g, walk({ step: frame.phase * 0.25 }), 0),
    "hundredacre-piglet-sitting": (_M, g) => animals.pigletAt(g, walk({ state: "sit", pose: "sit" }), 0),
    "hundredacre-piglet-balloon": (_M, g) => animals.pigletAt(g, walk({ state: "stand", lift: 8, held: 2 }), 0),
    "hundredacre-eeyore": (_M, g) => animals.eeyoreAt(g, walk(), 0),
    "hundredacre-eeyore-standing": (_M, g) => animals.eeyoreAt(g, walk({ state: "sit", since: 0, timer: 6 }), 1),
    "hundredacre-eeyore-sitting": (_M, g) =>
      animals.eeyoreAt(g, walk({ state: "sit", pose: "sit", since: 0, timer: 6 }), 3.5),
    "hundredacre-rabbit": (_M, g) => animals.rabbitAt(g, walk({ step: frame.phase * 0.25 }), 0),
    "hundredacre-rabbit-relaxed": (_M, g) => animals.rabbitAt(g, walk({ state: "sit", pose: "sit" }), 3.4),
    "hundredacre-tigger": (_M, g) => animals.tiggerAt(g, walk({ step: frame.phase * 0.25 }), 0),
    "hundredacre-tigger-sitting": (_M, g) => animals.tiggerAt(g, walk({ state: "sit", pose: "sit" }), 0),
    "hundredacre-roo": (_M, g) => animals.rooAt(g, walk({ step: frame.phase * 0.25 }), 0),
    "hundredacre-roo-sitting": (_M, g) => animals.rooAt(g, walk({ state: "sit", pose: "sit" }), 0),
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
    "wonderland-pigeon": (_M, g) => flyers.flyerAt(g, bird(), 0, "pigeon"),
    "wonderland-lory": (_M, g) => flyers.flyerAt(g, bird(), 0, "lory"),
    "wonderland-vulture": (M, g) => M.vultureAt(g, bird(), 0),
    "wonderland-vulture-open": (M, g) => M.vultureAt(g, bird(), Math.PI / 4),
    "wonderland-vulture-perched": (M, g) =>
      M.vultureAt(
        g,
        {
          ...bird(),
          x: 40,
          y: 30,
          visit: {
            mode: "perch",
            t: 1,
            T: 0,
            dir: 1,
            spot: { top: () => ({ x: 40, y: 46 }) },
            p: { phase: 0, moves: {} },
          },
        },
        0,
      ),
    "wonderland-vulture-landing": (M, g) =>
      M.vultureAt(
        g,
        {
          ...bird(),
          x: 40,
          y: 20,
          visit: {
            mode: "land",
            t: 0.92,
            T: 1,
            dir: 1,
            spot: { top: () => ({ x: 40, y: 46 }) },
            p: { phase: 0, moves: {} },
          },
        },
        0,
      ),
    "wonderland-bread": (M, g) => M.breadAt(g, { homeX: 40, homeY: 30, phase: 0, speed: 0 }, 0),
    "wonderland-tea-party": (M, g) => {
      M.teaPartyAt(g, { x: 40, w: 28, seatRow: 46, seats: [26, 54] }, 2.0, 2.0);
    },
    "wonderland-flock": (M, g) => M.flockAt(g, bird(), 0),
    "wonderland-cat": (M, g) => M.catAt(g, { x: 36, row: 44 }, 1),
    "wonderland-grin": (M, g) => M.grinAt(g, { x: 40, y: 30 }),
    "wonderland-ring": (M, g) => M.ringAt(g, { x: 36, y: 30, age: 1 }),
    "wonderland-bubble": (M, g) => M.bubbleAt(g, { x: 40, y: 30, phase: 0 }),
    "wonderland-sparkle": (M, g) => {
      for (let i = 0; i < 5; i += 1) M.sparkleAt(g, i, 2.5, ANIMAL_BOX.w, ANIMAL_BOX.ground - 12);
    },
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
  village: {
    ...soarSprites("village-eagle", "golden", { side: true, below: false }),
    ...soarSprites("village-buzzard", "hawk", {}),
    "village-cat": (_M, g) => animals.felidAt(g, walk({ kind: "housecat", pal: "housecat-ginger" }), 0),
    ...Object.fromEntries(
      [
        ["sitting", "sit"],
        ["arching", "arch"],
        ["lying", "lie"],
        ["stretching", "bow"],
        ["loafing", "loaf"],
        ["curled", "curl"],
        ["dozing", "doze"],
        ["grooming", "groom"],
      ].map(([name, pose]) => [
        `village-cat-${name}`,
        (_M, g) => animals.felidAt(g, walk({ kind: "housecat", pal: "housecat-ginger", state: "sit", pose }), 0),
      ]),
    ),
    "village-cat-stalking": (_M, g) =>
      animals.felidAt(
        g,
        walk({ kind: "housecat", pal: "housecat-silver-tabby", ...animals.catPlayAt(1, 40)[0], since: -10 }),
        0,
      ),
    "village-cat-leaping": (_M, g) =>
      animals.felidAt(
        g,
        walk({ kind: "housecat", pal: "housecat-silver-tabby", ...animals.catPlayAt(3.3, 30)[0], since: -10 }),
        0,
      ),
    "village-cat-swatting": (_M, g) =>
      animals.felidAt(
        g,
        walk({
          kind: "housecat",
          pal: "housecat-tuxedo",
          state: "sit",
          pose: "swat",
          rest: { from: "swat", to: "swat", u: 1 },
        }),
        0,
      ),
    "village-rooster": (_M, g) => animals.groundBirdAt(g, walk({ c: frame.phase * 0.25, amp: 1 }), "moa", 0),
    "village-rooster-pecking": (_M, g) =>
      animals.groundBirdAt(g, walk({ state: "sit", pose: "peck", since: 0, timer: 6, amp: 0 }), "moa", 0.5),
    "village-rooster-scratching": (_M, g) =>
      animals.groundBirdAt(g, walk({ state: "sit", pose: "scratch", since: 0, timer: 6, amp: 0 }), "moa", 1.2),
    "village-rooster-flapping": (_M, g) =>
      animals.groundBirdAt(g, walk({ state: "sit", pose: "flap", since: 0, timer: 6, amp: 0 }), "moa", 1.3),
    "village-rooster-crowing": (_M, g) =>
      animals.groundBirdAt(g, walk({ state: "sit", pose: "crow", since: 0, timer: 6, amp: 0 }), "moa", 2),
    "village-hen": (_M, g) => animals.groundBirdAt(g, walk({ c: frame.phase * 0.25, amp: 1 }), "hen", 0),
    "village-hen-pecking": (_M, g) =>
      animals.groundBirdAt(g, walk({ state: "sit", pose: "peck", since: 0, timer: 6, amp: 0 }), "hen", 0.5),
    "village-hen-scratching": (_M, g) =>
      animals.groundBirdAt(g, walk({ state: "sit", pose: "scratch", since: 0, timer: 6, amp: 0 }), "hen", 1.2),
    "village-sparrow-perched": (_M, g) => smallbird.perchedSmall(g, "sparrow", 40, 40, 0, smallbird.blendPose({})),
    "village-swallow": (_M, g) => flyers.flyerAt(g, bird(), 0, "swallow"),
    "village-crow": (_M, g) => flyers.flyerAt(g, bird(), 0, "crow"),
    "village-butterfly": (_M, g) => insect.butterflyAt(g, butterfly({ colour: 0 }), 0),
    "village-firefly": (_M, g) => insect.fireflyAt(g, 40, 30, 0.75, 0, g.pal.glow),
  },
  greatbarrier: {
    "greatbarrier-mantle": (_M, g) =>
      octopus.octopusAt(g, walk({ mode: "crawl", c: frame.time / 0.9, m: 1, phase: 1 }), g.groundY, frame.time),
    "greatbarrier-mantle-sitting": (_M, g) =>
      octopus.octopusAt(g, walk({ mode: "sit", phase: 1 }), g.groundY, frame.time),
    "greatbarrier-mantle-camouflaged": (_M, g) =>
      octopus.octopusAt(g, walk({ mode: "sit", camo: 1, phase: 1 }), g.groundY, frame.time),
    "greatbarrier-mantle-reaching": (_M, g) =>
      octopus.octopusAt(g, walk({ mode: "sit", rest: "reach", phase: 1 }), g.groundY, frame.time),
    "greatbarrier-mantle-in-den": (_M, g) =>
      octopus.octopusAt(g, walk({ mode: "den", phase: 1 }), g.groundY, frame.time),
    "greatbarrier-mantle-jetting": (_M, g) => {
      octopus.inkAt(g, { x: 30, y: 38, age: 0.8 });
      octopus.octopusAt(g, walk({ mode: "jet", flash: 1, lift: 8, phase: 1 }), g.groundY, frame.time);
    },
    "greatbarrier-clownfish": (_M, g) => fish.fishAt(g, "clownfish", bird(), frame.time),
    "greatbarrier-chromis": (_M, g) => fish.fishAt(g, "chromis", bird(), frame.time),
    "greatbarrier-anthias": (_M, g) => fish.fishAt(g, "anthias", bird(), frame.time),
    "greatbarrier-wrasse": (_M, g) => fish.fishAt(g, "wrasse", bird(), frame.time),
    "greatbarrier-parrotfish": (_M, g) => fish.fishAt(g, "parrotfish", bird({ y: 38 }), frame.time, g.groundY),
    "greatbarrier-trevally": (_M, g) => fish.fishAt(g, "trevally", bird(), frame.time),
    "greatbarrier-blacktip": (_M, g) => fish.fishAt(g, "blacktip", bird(), frame.time),
    "greatbarrier-epaulette": (_M, g) =>
      fish.epauletteAt(g, walk({ c: frame.time / 0.7, m: 1 }), g.groundY, frame.time),
    "greatbarrier-turtle": (_M, g) => animals.honuShellAt(g, { x: 40, dir: 1 }, 34, frame.time),
    "greatbarrier-manta": (_M, g) => {
      fish.mantaShadow(g, 40, g.groundY);
      fish.mantaAt(g, bird({ y: 24 }), frame.time);
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
