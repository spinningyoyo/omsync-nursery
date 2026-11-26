// Actor classification for `nursery verify`, derived from each family module's descriptor.
import { DRIVERS } from "../js/kit/families.js";

export { DRIVERS };

// States in which a walker's feet are off the ground on purpose: a pounce, a bound, a leap, a climb.
export function airborne(a) {
  if (!a) return false;
  return (
    (a.lift ?? 0) > 0 ||
    Boolean(a.climb) ||
    ["pounce", "run", "leap", "jump", "bound", "hop", "fly"].includes(a.state) ||
    // a roll in the dust (zebra) or a wallow (bison) rocks the body on its back
    ["bound", "pounce", "fly", "flap", "up", "roll", "wallow"].includes(a.pose)
  );
}

export function classify(driver, actor, args, scene) {
  const entry = DRIVERS[driver];
  if (!entry) return { family: null, role: "unclassified", member: driver, day: false };
  const rest = args.filter((a) => typeof a !== "object" || a === null);
  const member = entry.member(actor ?? {}, rest.length ? rest : args);
  const role = typeof entry.role === "function" ? entry.role(actor, args) : entry.role;
  const young = (actor?.scale ?? 1) < 0.8 || Boolean(actor?.cub) || member === "pup" || member === "cub";
  return {
    family: entry.family,
    role,
    member,
    young,
    day: typeof entry.day === "function" ? Boolean(entry.day(actor, args, scene)) : Boolean(entry.day),
    state: actor?.state ?? actor?.visit?.mode ?? null,
  };
}
