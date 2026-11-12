// The running scene's timers: an object in its extra with a numeric `next` (a fly-by, a stoop,
// an eruption) fires when the time reaches it; one with `turn` and `until` (the desert's showers)
// moves to its next turn at `until`. Setting either to now fires it once its conditions hold (the
// stage, night, the animal on the page).
export function timers(engine) {
  const out = [];
  const visit = (label, obj) => {
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) return;
    if ("turn" in obj && typeof obj.until === "number") out.push({ label, obj, field: "until" });
    else if (typeof obj.next === "number") out.push({ label, obj, field: "next" });
  };
  for (const [key, value] of Object.entries(engine?.extra ?? {})) {
    if (!Array.isArray(value)) visit(key, value);
    else value.forEach((item, i) => visit(value.length > 1 ? `${key} ${i + 1}` : key, item));
  }
  return out;
}

// How long until a timer fires: "due", "12 s", or "waits" when it waits on something else.
export function until(engine, timer) {
  const wait = timer.obj[timer.field] - engine.time;
  return !Number.isFinite(wait) ? "waits" : wait <= 0 ? "due" : `${Math.ceil(wait)} s`;
}

export function fire(engine, label) {
  const timer = timers(engine).find((t) => t.label === label);
  if (timer) timer.obj[timer.field] = engine.time;
}

// The animals and effects on the page now, by the name the scene keeps them under.
export function onPage(engine) {
  const names = [];
  const present = (item) =>
    item && typeof item === "object" && ("bird" in item ? item.bird != null : item.active === true);
  for (const [key, value] of Object.entries(engine?.extra ?? {})) {
    if (Array.isArray(value)) {
      const n = value.filter(present).length;
      if (n) names.push(n > 1 ? `${key} ×${n}` : key);
    } else if (present(value)) {
      names.push(key);
    }
  }
  return names;
}
