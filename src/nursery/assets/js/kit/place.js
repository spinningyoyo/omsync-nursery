// Placing an animal drawn from parts: what every driver in animals.js does round its pose. A family's
// build draws in its own units, facing right, through plot(dx, h, colour) (dx forward of the animal's
// origin, h rows above its feet); paintAt lays those cells on the page facing `dir`, under a soft ground
// shadow. The timers here (sinceOf, ease, blinkAt, breathAt) are the shared parts of a pose.

// Seconds since a's state last changed (a.since, see settle in critters.js); `none` when it has no record.
export const sinceOf = (a, time, none = 100) => (a.since == null ? none : time - a.since);

// The share of a walk left in the legs: it grows over `seconds` as a walk starts and shrinks as it stops.
export const ease = (moving, since, seconds) =>
  moving ? Math.min(1, since / seconds) : Math.max(0, 1 - since / seconds);

// Whether the eyes are shut: for `share` of every `every` seconds, out of step by `offset` seconds.
export const blinkAt = (time, offset, every, share = 0.04) => ((time + offset) / every) % 1 < share;

// The chest's breath, 1 or 0, at `rate` radians a second; always 0 while `still` is false.
export const breathAt = (time, rate = 2.2, still = true) => (still && Math.sin(time * rate) > 0.2 ? 1 : 0);

// A family's tones, made once by make() for each `owner` (a palette, or one of its colour arrays) and
// `key` (the family, and its variant when the tones differ by one).
const made = new WeakMap();
export function tonesFor(owner, key, make) {
  let byKey = made.get(owner);
  if (!byKey) {
    byKey = new Map();
    made.set(owner, byKey);
  }
  if (!byKey.has(key)) byKey.set(key, make());
  return byKey.get(key);
}

// A shadow span measured from the drawn cells: the columns of those within two rows of the ground,
// one wider each side, or null when none are.
export function feetSpan(cells) {
  let lo = Infinity;
  let hi = -Infinity;
  for (const [dx, h] of cells) {
    if (h > 1) continue;
    lo = Math.min(lo, dx);
    hi = Math.max(hi, dx);
  }
  return lo <= hi ? [lo - 1, hi + 1] : null;
}

// The painter for an animal whose origin is column x and whose feet stand on row fy - 1, facing `dir`,
// `lift` rows off the ground. A cell with no colour is left out.
export const plotter =
  (g, x, fy, dir, lift = 0) =>
  (dx, h, colour) => {
    if (!colour) return;
    g.ctx.fillStyle = colour;
    g.ctx.fillRect(dir > 0 ? x + dx : x - dx, fy - 1 - h - lift, 1, 1);
  };

// Draws an animal: draw(plot) paints its cells (see plotter), over its shadow on row fy. `shadow` is
// null or { colour, span, rows }: span is the columns it covers, [a, b] in the animal's own units, or a
// function of the drawn cells ([dx, h, colour], see feetSpan) that returns them; rows are fainter rows
// below it, each [inset, alpha] (that many columns shorter at each end, at that opacity).
export function paintAt(g, x, fy, dir, draw, shadow = null, lift = 0) {
  const plot = plotter(g, x, fy, dir, lift);
  if (!shadow) return draw(plot);
  if (typeof shadow.span !== "function") {
    groundRows(g, x, fy, dir, shadow, shadow.span);
    return draw(plot);
  }
  const cells = [];
  const out = draw((dx, h, colour) => cells.push([dx, h, colour]));
  groundRows(g, x, fy, dir, shadow, shadow.span(cells));
  for (const [dx, h, colour] of cells) plot(dx, h, colour);
  return out;
}

function groundRows(g, x, fy, dir, { colour, rows = [] }, span) {
  if (!span) return;
  const ctx = g.ctx;
  const row = (a, b, y) => ctx.fillRect(dir > 0 ? x + a : x - b, y, b - a + 1, 1);
  ctx.fillStyle = colour;
  row(span[0], span[1], fy);
  const alpha = ctx.globalAlpha;
  rows.forEach(([inset, a], i) => {
    ctx.globalAlpha = alpha * a;
    row(span[0] + inset, span[1] - inset, fy + 1 + i);
  });
  ctx.globalAlpha = alpha;
}
