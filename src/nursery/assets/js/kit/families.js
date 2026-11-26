// The family descriptors, gathered from every family module. Studio, verify and the catalogue
// derive their family list, body specs, real lengths, predator tags and driver map from here
// instead of keeping parallel registries.

import { FAMILY as bear } from "./bear.js";
import { FAMILY as beast } from "./beast.js";
import { FAMILY as bovid } from "./bovid.js";
import { FAMILY as broadleaf } from "./broadleaf.js";
import { FAMILY as canid } from "./canid.js";
import { FAMILY as cast } from "./cast.js";
import { FAMILY as conifer } from "./conifer.js";
import { FAMILY as deer } from "./deer.js";
import { FAMILY as desert } from "./desert.js";
import { FAMILY as elephant } from "./elephant.js";
import { FAMILY as felid } from "./felid.js";
import { FAMILIES as fishFamilies } from "./fish.js";
import { FAMILIES as flyerFamilies } from "./flyers.js";
import { FAMILY as giraffe } from "./giraffe.js";
import { FAMILY as groundbird } from "./groundbird.js";
import { FAMILY as horse } from "./horse.js";
import { FAMILY as insect } from "./insect.js";
import { FAMILY as longneck } from "./longneck.js";
import { FAMILY as octopus } from "./octopus.js";
import { FAMILY as palms } from "./palms.js";
import { FAMILY as pig } from "./pig.js";
import { FAMILY as primate } from "./primate.js";
import { FAMILY as reef } from "./reef.js";
import { FAMILY as shell } from "./shell.js";
import { FAMILY as swimmer } from "./swimmer.js";
import { FAMILY as widecanopy } from "./widecanopy.js";
import { FAMILY as wonderland } from "./wonderland.js";

const [fish, rays] = fishFamilies;
const [soaring, smallFlyers, owls] = flyerFamilies;

// All family descriptors (those with a `label` appear in the Studio Families view).
const ALL_FAMILIES = [
  bear,
  canid,
  felid,
  deer,
  horse,
  giraffe,
  bovid,
  elephant,
  pig,
  beast,
  primate,
  swimmer,
  fish,
  rays,
  octopus,
  shell,
  insect,
  wonderland,
  soaring,
  smallFlyers,
  longneck,
  owls,
  groundbird,
  broadleaf,
  conifer,
  widecanopy,
  palms,
  desert,
  reef,
  cast,
];

// Canonical family order, matching the Studio Families view.
export const FAMILIES = ALL_FAMILIES.filter((f) => f.title);

// The scale (the nursery-scene skill's Size rule): px = a x metres^k, within tolerance.
export const SCALE = { a: 11.3, k: 0.39, tolerance: 0.15, least: 2 };

export function scaleOf(metres) {
  const target = SCALE.a * metres ** SCALE.k;
  const room = Math.max(target * SCALE.tolerance, SCALE.least);
  return { target, low: target - room, high: target + room };
}

// Derived maps keyed by "family/member", and driver classification keyed by driver function name.
export const SPECS = {};
export const REAL_LENGTH = {};
export const PREDATORS = new Set();
export const DRIVERS = {};

for (const family of ALL_FAMILIES) {
  for (const [member, info] of Object.entries(family.members ?? {})) {
    const key = `${family.id}/${member}`;
    if (info.spec) SPECS[key] = info.spec;
    if (info.realLength != null) REAL_LENGTH[key] = info.realLength;
    if (info.predator) PREDATORS.add(key);
  }
  for (const [name, entry] of Object.entries(family.drivers ?? {})) {
    DRIVERS[name] = { family: family.id, ...entry };
  }
}
