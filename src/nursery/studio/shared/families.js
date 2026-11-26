// Studio's family view, derived entirely from kit/families.js and each scene's declared cast and
// plantFamilies. Nothing is hand-kept here.
import { FAMILIES as KIT_FAMILIES, PREDATORS, REAL_LENGTH, SCALE, scaleOf } from "./js/kit/families.js";
import { SCENES } from "./js/nursery.js";

export { PREDATORS, REAL_LENGTH, SCALE, scaleOf };

function buildFamilies() {
  const byId = new Map(KIT_FAMILIES.map((family) => [family.id, { ...family, members: {}, storybook: {} }]));
  const add = (bucket, sid, stem) => {
    bucket[sid] ??= [];
    if (!bucket[sid].includes(stem)) bucket[sid].push(stem);
  };
  for (const scene of SCENES) {
    for (const entry of scene.cast ?? []) {
      const target = byId.get(entry.family);
      if (!target) continue;
      const bucket = entry.storybook ? target.storybook : target.members;
      for (const stem of entry.sprites ?? []) add(bucket, scene.id, stem);
    }
    for (const [stem, fid] of Object.entries(scene.plantFamilies ?? {})) {
      const target = byId.get(fid);
      if (target) add(target.members, scene.id, stem);
    }
  }
  return [...byId.values()].map(({ storybook, ...rest }) =>
    Object.keys(storybook).length ? { ...rest, storybook } : rest,
  );
}

export const FAMILIES = buildFamilies();

const listed = (names, stem) => (names ?? []).some((name) => stem === name || stem.startsWith(`${name}-`));

// Whether a scene's sprite belongs to the family, as "member", "storybook", or null.
export function roleIn(family, sid, name) {
  const stem = name.slice(sid.length + 1);
  if (listed(family.members[sid], stem)) return "member";
  return listed(family.storybook?.[sid], stem) ? "storybook" : null;
}

// Whether any family lists a scene's sprite.
export const hasFamily = (sid, name) => FAMILIES.some((family) => roleIn(family, sid, name));

// Open scenes keep at most 5 ground animals and one flyer at a time; every other scene is dense.
export const OPEN_SCENES = new Set(SCENES.filter((s) => s.density === "open").map((s) => s.id));
