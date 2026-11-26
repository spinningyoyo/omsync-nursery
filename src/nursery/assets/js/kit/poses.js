// Lightweight pose-sample builders used by each scene's declarative `cast` entries, so Studio and
// `nursery catalog` draw every sprite directly from the scene module without a central sprites.js.

import { felidAt } from "./felid.js";
import { drawPerch, SPECIES as OWL_SPECIES, owlTones } from "./owl.js";
import { rect } from "./pixel.js";
import { frontBird, PERCH_ORIGIN, paint, perchedBird, perchPose, SIDE_ORIGIN, sideBird, stoopPose } from "./soaring.js";

export const ANIMAL_BOX = { w: 80, h: 60, ground: 46 };
export const PLANT_BOX = { w: 80, h: 90, base: 84 };

export function walk(frame, extra = {}) {
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

export function bird(frame, extra = {}) {
  return { dir: 1, x: 40, y: 30, phase: frame.phase, ...extra };
}

export function butterfly(extra = {}) {
  return { homeX: 40, homeY: 30, phase: 0, speed: 0, colour: 4, cycle: 18, at: 0, ...extra };
}

export function swinging(t) {
  return { active: true, hx: 40, hy: 16, dir: 1, t, leap: null, count: 0, call: null };
}

export function owlPerched(darkPal, g, species, pose) {
  g.pal = darkPal;
  const t = owlTones(g.pal.owl);
  g.ctx.fillStyle = "#4a3a2c";
  g.ctx.fillRect(31, 40, 19, 1);
  drawPerch(g, 40, 40, 1, t, OWL_SPECIES[species], pose);
}

const SOAR_AT = [40, 30];
const soarSide = (kind, pose) => (g) => paint(g, sideBird(g, kind, pose), ...SOAR_AT, 1, SIDE_ORIGIN);
const soarFront = (kind, pose) => (g) => paint(g, frontBird(g, kind, pose), 40, 24);
const soarPerched =
  (kind, moves = {}) =>
  (g) => {
    rect(g, "#7a6a58", 34, SOAR_AT[1], 13, 2);
    rect(g, "#5a4a3a", 34, SOAR_AT[1] + 1, 13, 1);
    const p = perchPose({ look: -1, blink: -1, preen: -1, stretch: -1, ...moves }, 0);
    paint(g, perchedBird(g, kind, p), 40, SOAR_AT[1], 1, PERCH_ORIGIN);
  };

export function soarSprites(
  prefix,
  kind,
  { side = false, below = true, vulture = false, stoop = false, perch = true } = {},
) {
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
    out[`${prefix}-stoop`] = soarFront(kind, stoopPose(0.7));
    out[`${prefix}-pullout`] = soarFront(kind, stoopPose(1.45));
  }
  if (perch) {
    out[`${prefix}-landing`] = soarSide(kind, { f: 0.85, v: 0.2, feet: 1 });
    out[`${prefix}-takeoff`] = soarSide(kind, { f: -0.6, v: -0.4, feet: 0.8 });
    out[`${prefix}-perched`] = soarPerched(kind);
    out[`${prefix}-perched-preening`] = soarPerched(kind, { preen: 0.5 });
    out[`${prefix}-perched-stretching`] = soarPerched(kind, { stretch: 0.5 });
  }
  return out;
}

export const HOUSECAT_COATS = [
  "white",
  "silver-tabby",
  "orange-white",
  "siamese",
  "black",
  "ginger",
  "calico",
  "grey",
  "tortie",
  "tuxedo",
  "brown-tabby",
];

export function housecatSprites(defaultCoat, includeCoats = true) {
  const base = { kind: "housecat", pal: `housecat-${defaultCoat}` };
  const out = {
    cat: (g, frame) => felidAt(g, walk(frame, base), 0),
  };
  for (const [name, pose] of [
    ["sitting", "sit"],
    ["arching", "arch"],
    ["lying", "lie"],
    ["stretching", "bow"],
    ["loafing", "loaf"],
    ["curled", "curl"],
    ["dozing", "doze"],
    ["grooming", "groom"],
  ]) {
    out[`cat-${name}`] = (g, frame) => felidAt(g, walk(frame, { ...base, state: "sit", pose }), 0);
  }
  if (includeCoats) {
    for (const coat of HOUSECAT_COATS) {
      out[`cat-${coat}`] = (g, frame) =>
        felidAt(g, walk(frame, { kind: "housecat", pal: `housecat-${coat}`, state: "sit", pose: "sit" }), 0);
    }
  }
  return out;
}
