// Pixel helpers shared by the scenes (nursery.js and the modules beside this one).
// Painting helpers take the painter `g`: { ctx, pal, time, groundY, cols }.

export const P = 4; // CSS pixels per art pixel; the mascot is 128 CSS pixels wide for its 32 cells
export const CELL = 16; // art pixels per grid cell; P * CELL is --landing-cell
export const SOIL_ROWS = CELL;

export const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
export const smooth = (t) => t * t * (3 - 2 * t);
export const lerp = (a, b, t) => a + (b - a) * t; // the value a fraction t of the way from a to b
export const frac = (v) => v - Math.floor(v); // the part of v after its whole number, in [0, 1)
export const TAU = Math.PI * 2; // a whole turn in radians
export const rad = (deg) => (deg * Math.PI) / 180; // degrees to radians

// A "#rrggbb" colour as a CSS rgba() string with opacity a.
export const rgba = (hex, a) => {
  const n = Number.parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a.toFixed(3)})`;
};

// The soft shadow every animal, plant and rock casts on the ground: the scene palette's groundShadow
// (one colour for the whole scene, day and night each), or GROUND_SHADOW when a palette has none.
export const GROUND_SHADOW = "rgba(0, 0, 0, 0.25)";
export const shadowColour = (pal) => pal.groundShadow ?? GROUND_SHADOW;

export function mix(from, to, amount) {
  const a = parseInt(from.slice(1), 16);
  const b = parseInt(to.slice(1), 16);
  const channel = (shift) => {
    const x = (a >> shift) & 255;
    const y = (b >> shift) & 255;
    return Math.round(x + (y - x) * amount);
  };
  return `#${((1 << 24) | (channel(16) << 16) | (channel(8) << 8) | channel(0)).toString(16).slice(1)}`;
}

// A palette pulled toward the page, which reads as distance.
export function fade(palette, amount) {
  const out = {};
  for (const [key, value] of Object.entries(palette)) {
    if (Array.isArray(value)) out[key] = value.map((c) => mix(c, palette.haze, amount));
    else if (typeof value === "string" && value[0] === "#") out[key] = mix(value, palette.haze, amount);
    else out[key] = value;
  }
  return out;
}

export function rng(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A stable value in [0, 1) for a pixel, so a plant keeps its texture from frame to frame.
export function hash(x, y, seed) {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 2147483647);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export function wind(time, x) {
  return Math.round(Math.sin(time * 1.3 + x * 0.045) * 0.9 + Math.sin(time * 2.9 + x * 0.11) * 0.3);
}

export function between(rand, low, high) {
  return low + Math.floor(rand() * (high - low + 1));
}

export function spread(count, cols, rand) {
  return Array.from({ length: count }, (_, i) => Math.floor(((i + rand()) / count) * cols));
}

// Trees and bushes stay low in the middle of the page, where the sign-in card and its footnote
// sit, and rise toward the sides: a clearing with the forest around it.
export const CLEARING = 56; // art pixels from the centre that stay low
export const CLEARING_EDGE = 40; // art pixels over which they rise to full height
const CLEARING_SCALE = 0.3;
export const NARROW_COLS = 130; // on a phone the card spans the page, so the clearing is less strict

export function clearing(x, cols) {
  const low = cols < NARROW_COLS ? 0.5 : CLEARING_SCALE;
  const away = (Math.abs(x - cols / 2) - CLEARING) / CLEARING_EDGE;
  return low + (1 - low) * smooth(clamp(away, 0, 1));
}

// depth is how many rows below the soil's top edge a plant's base sits. The far rows stand on the
// edge itself; the near row is planted into the soil band.
export function makePlant(rand, kind, x, fields) {
  return {
    kind,
    x,
    seed: Math.floor(rand() * 65536),
    shown: 0,
    target: 0,
    wait: 0,
    layer: 1,
    depth: 1,
    born: 0,
    scale: 1,
    ...fields,
  };
}

// Adds `count` plants of one kind, spread evenly across the page. `layer` is 1 for the near row,
// 0 for the far row and -1 for the farthest. `keep` can veto an x position, and `max` caps how
// many are sown, for a plant that should stay rare.
export function scatter(plants, { rand, cols }, spec) {
  const { kind, count, born, scale = [1, 1], layer = 1, depth = [1, 1], species, keep, max = Infinity } = spec;
  let sown = 0;
  for (const x of spread(count, cols, rand)) {
    if (keep && !keep(x)) continue;
    if (sown >= max) break;
    sown += 1;
    plants.push(
      makePlant(rand, kind, x, {
        layer,
        depth: layer < 1 ? 1 : between(rand, ...depth),
        born: between(rand, ...born),
        scale: scale[0] + rand() * (scale[1] - scale[0]),
        species: species ? species[Math.floor(rand() * species.length)] : undefined,
      }),
    );
  }
}

// A clump of `count` plants of one kind round x, `gap` apart with a little jitter, the tallest near
// the middle, like the Six Pine Trees: plants that grow together are sown together, not one by one.
export function grove(plants, { rand }, spec) {
  const { kind, x, count, gap, born, scale = [1, 1], layer = 1, depth = [1, 1], species } = spec;
  const mid = (count - 1) / 2;
  for (let i = 0; i < count; i += 1) {
    const middle = mid > 0 ? 1 - Math.abs(i - mid) / (mid + 1) : 1;
    plants.push(
      makePlant(rand, kind, Math.round(x + (i - mid) * gap + (rand() - 0.5) * gap * 0.6), {
        layer,
        depth: layer < 1 ? 1 : between(rand, ...depth),
        born: between(rand, ...born),
        scale: scale[0] + (scale[1] - scale[0]) * (0.45 * middle + 0.55 * rand()),
        species: species ? species[Math.floor(rand() * species.length)] : undefined,
      }),
    );
  }
}

// Picks an x for each landmark at random, so that no two overlap and none stands in the middle of
// the page, where the sign-in card sits. A landmark is { key, half, away, inside }: half its width,
// how far its centre keeps from the page's centre (0 lets it stand anywhere), and whether it must
// stay wholly on the page (otherwise up to a third of it may hang off an edge). Returns { key: x }. When
// the page is too narrow for that, the landmarks are allowed closer together, then to overlap.
export function placeLandmarks({ cols, rand }, landmarks, { gap = 6 } = {}) {
  const centre = cols / 2;
  const narrow = cols < NARROW_COLS;
  for (let slack = gap; slack > -60; slack -= 4) {
    const placed = [];
    for (const l of landmarks) {
      const away = narrow ? Math.min(l.away, CLEARING / 2) : l.away;
      const low = l.inside ? l.half : Math.round(-l.half / 3);
      const high = l.inside ? cols - l.half : Math.round(cols + l.half / 3);
      let x = null;
      for (let tries = 0; tries < 60 && x === null; tries += 1) {
        const at = Math.round(low + rand() * (high - low));
        if (Math.abs(at - centre) < away) continue;
        if (placed.some((p) => Math.abs(at - p.x) < l.half + p.half + slack)) continue;
        x = at;
      }
      if (x === null) break;
      placed.push({ ...l, x });
    }
    if (placed.length === landmarks.length) return Object.fromEntries(placed.map((p) => [p.key, p.x]));
  }
  return Object.fromEntries(landmarks.map((l, i) => [l.key, Math.round(((i + 0.5) / landmarks.length) * cols)]));
}

export function sortPlants(plants) {
  plants.sort((a, b) => a.layer - b.layer || a.depth - b.depth || a.x - b.x);
}

export function rect(g, colour, x, y, w, h) {
  g.ctx.fillStyle = colour;
  g.ctx.fillRect(x, y, w, h);
}

// A row of pixels from x0 to x1, coloured per pixel by shade(x, y), merged into runs.
export function row(g, y, x0, x1, shade) {
  let start = x0;
  let colour = shade(x0, y);
  for (let x = x0 + 1; x <= x1; x += 1) {
    const next = shade(x, y);
    if (next !== colour) {
      rect(g, colour, start, y, x - start, 1);
      start = x;
      colour = next;
    }
  }
  rect(g, colour, start, y, x1 + 1 - start, 1);
}

// An ellipse that fills the box (cx - w/2, top, w, h), coloured per pixel by shade(x, y).
export function blob(g, cx, top, w, h, shade) {
  for (let y = top; y < top + h; y += 1) {
    const ny = (y + 0.5 - (top + h / 2)) / (h / 2);
    const half = Math.round((w / 2) * Math.sqrt(Math.max(0, 1 - ny * ny)));
    if (half >= 1) row(g, y, cx - half, cx + half, shade);
  }
}

// Foliage shading: light from the upper left, a dithered edge between tones. Coordinates are
// relative to the box, so a canopy that sways keeps its texture. `extra` may override a pixel.
export function foliage(box, tones, seed, extra) {
  return (x, y) => {
    const u = (x - box.cx) / (box.w / 2 || 1);
    const v = (y - box.top) / (box.h || 1);
    const score = u * 0.55 + v * 0.85 + (hash(x - box.cx, y - box.top, seed) - 0.5) * 0.55;
    const tone = score < 0 ? 0 : score < 0.5 ? 1 : score < 0.95 ? 2 : 3;
    return extra?.(x - box.cx, y - box.top, tone) ?? tones[tone];
  };
}

// A curved stroke that bulges in the middle, for fronds and leaves. It leaves (x0, y0) along
// (dx, dy) for `length` pixels and droops by droop * length at its far end. A width of 1 alternates
// the two colours; a wider stroke is the first colour with the second along its top edge.
export function stroke(g, x0, y0, dx, dy, length, droop, width, colours) {
  const sideways = Math.abs(dx) >= Math.abs(dy);
  for (let i = 0; i <= length; i += 1) {
    const t = i / length;
    const x = Math.round(x0 + dx * i);
    const y = Math.round(y0 + dy * i + droop * t * t * length);
    const w = Math.max(1, Math.round(width * Math.sin(Math.PI * (0.15 + 0.7 * t))));
    if (width === 1) {
      rect(g, colours[i % colours.length], x, y, 1, 1);
    } else if (sideways) {
      rect(g, colours[0], x, y - (w >> 1), 1, w);
      rect(g, colours[1], x, y - (w >> 1), 1, 1);
    } else {
      rect(g, colours[0], x - (w >> 1), y, w, 1);
      rect(g, colours[1], x - (w >> 1), y, 1, 1);
    }
  }
}

// A rectangle in an animal's own coordinates, where it faces right and (0, 0) is its origin.
// `dir` is 1 to face right and -1 to face left.
export function part(g, colour, ox, oy, dir, dx, dy, w, h) {
  rect(g, colour, dir > 0 ? ox + dx : ox - dx - w + 1, oy + dy, w, h);
}

// part() for an animal drawn at scale k. Each edge is scaled and rounded on its own, so the pieces
// of a young or grown animal still meet: rounding the offset and the size apart leaves legs
// floating a pixel off the body.
export function scaledPart(g, ox, oy, dir, k) {
  return (colour, dx, dy, w, h) => {
    const x0 = Math.round(dx * k);
    const y0 = Math.round(dy * k);
    const x1 = Math.round((dx + w) * k);
    const y1 = Math.round((dy + h) * k);
    part(g, colour, ox, oy, dir, x0, y0, Math.max(1, x1 - x0), Math.max(1, y1 - y0));
  };
}

// A one-pixel line from (x0, y0) to (x1, y1), for limbs that change angle as an animal moves.
export function line(g, colour, x0, y0, x1, y1) {
  let x = Math.round(x0);
  let y = Math.round(y0);
  const xEnd = Math.round(x1);
  const yEnd = Math.round(y1);
  const dx = Math.abs(xEnd - x);
  const dy = -Math.abs(yEnd - y);
  const stepX = x < xEnd ? 1 : -1;
  const stepY = y < yEnd ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    rect(g, colour, x, y, 1, 1);
    if (x === xEnd && y === yEnd) return;
    const twice = 2 * err;
    if (twice >= dy) {
      err += dy;
      x += stepX;
    }
    if (twice <= dx) {
      err += dx;
      y += stepY;
    }
  }
}

// A sprite drawn from a character grid, facing right as written, with grid cell (cx, cy) at (ox,
// oy) and scaled by k. Each character is a key of `colours`; any other character, such as ".", is
// left clear.
export function sprite(g, grid, colours, ox, oy, dir, cx = 0, cy = 0, k = 1) {
  const px = scaledPart(g, ox, oy, dir, k);
  grid.forEach((line, y) => {
    for (let x = 0; x < line.length; ) {
      const ch = line[x];
      let end = x + 1;
      while (end < line.length && line[end] === ch) end += 1;
      if (colours[ch]) px(colours[ch], x - cx, y - cy, end - x, 1);
      x = end;
    }
  });
}

// The picker's icon: a small character grid drawn as an inline SVG, one rect per run.
export function iconSvg(grid, colours) {
  let rects = "";
  grid.forEach((line, y) => {
    for (let x = 0; x < line.length; ) {
      const ch = line[x];
      let end = x;
      while (end < line.length && line[end] === ch) end += 1;
      if (colours[ch]) rects += `<rect x="${x}" y="${y}" width="${end - x}" height="1" fill="${colours[ch]}"/>`;
      x = end;
    }
  });
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${grid[0].length} ${grid.length}"` +
    ' width="36" height="36" shape-rendering="crispEdges" aria-hidden="true" focusable="false">' +
    `${rects}</svg>`
  );
}
