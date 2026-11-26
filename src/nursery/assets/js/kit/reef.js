// The coral reef family: one build for every coral and reef plant, modelled on the Great Barrier
// Reef's bommies (a pillar of massive coral heads stacked like boulders, ledged with tabletop
// Acropora). Every piece is lit from above in four tones laid as areas: each coral head is lit on
// its crown, shaded toward its underside and darkest in the crevice below it, and its polyp texture
// is a scatter of the next tone, never a line. Hard coral never sways; soft coral, sea fans,
// seagrass and anemone tentacles sway with the surge. At night (g.pal.night) the polyps come out:
// a fuzz of pale pixels on every coral crown, as real reefs feed in the dark.
//
// Palette keys: boulder, table, staghorn, softCoral, seaFan (four tones each, lit to darkest), tips
// (the rare blue tips of the Acropora), seagrass (three), anemone ([tentacle lit, tentacle, tip,
// column]), clam ([shell lit, shell, shell dark, mantle, mantle dark, mantle spots]), polyp,
// groundShadow. Members differ in size, colour and growth form: `bommie`, `tableCoral`,
// `staghorn`, `boulderCoral`, `softCoral`, `seaFan`, `seagrass`, `anemone`, `giantClam`.
import { clamp, hash, mix, rect, shadowColour } from "./pixel.js";

const px = (g, colour, x, y) => rect(g, colour, Math.round(x), Math.round(y), 1, 1);

// The surge: a slow to and fro, a little out of step from place to place.
export const surge = (time, x) => Math.sin(time * 0.9 + x * 0.07) * 0.8 + Math.sin(time * 2.1 + x * 0.19) * 0.25;

// A tone 0..3 lit from above for a cell at ny (-1 crown, 1 underside) of a rounded head, with the
// polyp texture: some cells take the next tone down.
function headTone(ny, x, y, seed) {
  const t = ny < -0.5 ? 0 : ny < 0.12 ? 1 : ny < 0.62 ? 2 : 3;
  return t < 3 && hash(x, y, seed) < 0.16 ? t + 1 : t;
}

// A soft shadow on the sand under something `half` wide at x, two rows, the lower one fainter.
export function sandShadow(g, x, base, half) {
  g.ctx.fillStyle = shadowColour(g.pal);
  g.ctx.fillRect(Math.round(x - half), base, Math.round(half * 2) + 1, 1);
  const a = g.ctx.globalAlpha;
  g.ctx.globalAlpha = a * 0.5;
  g.ctx.fillRect(Math.round(x - half + 2), base + 1, Math.max(1, Math.round(half * 2) - 3), 1);
  g.ctx.globalAlpha = a;
}

// Coral heads as a set of round lumps: each [cx, cy, rx, ry] in page px, cy the centre row. Drawn
// from the highest down, so each lower head's lit crown sits in front of the shaded underside of
// the head above, which reads as boulders stacked under light.
function heads(g, list, tones, seed, polyps) {
  const sorted = [...list].sort((a, b) => a[1] - b[1]);
  for (const [cx, cy, rx, ry] of sorted) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y += 1) {
      const ny = (y + 0.5 - cy) / ry;
      if (Math.abs(ny) > 1) continue;
      const half = rx * Math.sqrt(1 - ny * ny);
      for (let x = Math.round(cx - half); x <= Math.round(cx + half); x += 1) {
        const edge = Math.abs(x - cx) / Math.max(half, 0.5);
        const t = Math.min(3, headTone(ny + edge * 0.25, x, y, seed));
        px(g, tones[t], x, y);
        if (polyps && t === 0 && hash(x, y, seed + 9) < 0.18) px(g, g.pal.polyp, x, y - 1);
      }
    }
  }
}

// A tabletop Acropora plate: a flat top (lit, with polyp texture), a front edge, an underside in
// shade, a dark shadow cast on whatever is under it, and a short thick stalk. (x, y) is the plate's
// top row centre; `stalk` the rows down to its foot (0 for one that grows from a ledge).
function plate(g, x, y, w, stalk, seed, night) {
  const [lit, base, shade, dark] = g.pal.table;
  const half = Math.max(2, Math.round(w / 2));
  if (stalk > 0) {
    rect(g, shade, x - 1, y + 2, 2, stalk);
    rect(g, dark, x, y + 2, 1, stalk);
    rect(g, dark, x - 2, y + 2 + stalk - 1, 4, 1);
  }
  for (let dx = -half + 1; dx <= half - 1; dx += 1) {
    const tip = hash(x + dx, y, seed) < 0.12;
    px(g, tip ? g.pal.tips : hash(x + dx, y, seed + 1) < 0.2 ? base : lit, x + dx, y);
    if (night && hash(x + dx, y, seed + 7) < 0.25) px(g, g.pal.polyp, x + dx, y - 1);
  }
  for (let dx = -half; dx <= half; dx += 1) px(g, hash(x + dx, y + 1, seed) < 0.15 ? shade : base, x + dx, y + 1);
  rect(g, shade, x - half + 1, y + 2, half * 2 - 1, 1);
  g.ctx.fillStyle = dark;
  const a = g.ctx.globalAlpha;
  g.ctx.globalAlpha = a * 0.55;
  g.ctx.fillRect(x - half + 2, y + 3, Math.max(1, half * 2 - 3), 1);
  g.ctx.globalAlpha = a;
}

// A branching sprig of staghorn: a main stem that leans out and forks twice, every branch tapering
// to a paler tip, some tips the rare blue. Rooted at (x, base), `h` rows tall, leaning `lean`.
function sprig(g, x, base, h, lean, seed, night) {
  const [lit, mid, shade] = g.pal.staghorn;
  const branch = (x0, y0, dx, len, depth, s) => {
    let bx = x0;
    let by = y0;
    for (let i = 0; i < len; i += 1) {
      by -= 1;
      if (i % 2 === 1) bx += dx;
      const top = i >= len - 1;
      const c = top ? (hash(s, depth, seed) < 0.18 ? g.pal.tips : lit) : i < len / 2 ? shade : mid;
      px(g, c, bx, by);
      if (i % 2 === 1 && dx) px(g, i < len / 2 ? shade : mid, bx - dx, by);
      if (top && night) px(g, g.pal.polyp, bx, by - 1);
      if (depth > 0 && i === Math.floor(len * 0.45)) {
        branch(
          bx,
          by,
          dx === 0 ? (hash(s, i, seed) < 0.5 ? -1 : 1) : -dx,
          Math.max(2, Math.round(len * 0.6)),
          depth - 1,
          s + 1,
        );
      }
    }
  };
  branch(x, base, lean, h, 2, seed);
}

// ---- The bommie ----------------------------------------------------------------------------------

// Where the bommie's parts are, for the animals that use them: its coral heads, the den at its foot
// (the octopus's home: a dark hollow under the lowest heads, on side `side`), the tables (their top
// rows, for the turtle's cleaning station above one) and its height. k is scale times growth.
export function bommieGeom(p, s, base) {
  const k = p.scale * s;
  const side = p.seed % 2 ? 1 : -1;
  const H = Math.round(42 * k);
  // The pillar's half width up its height: broad at the foot, waisted, swelling again under the
  // crown, like a real bommie undercut by the swell.
  const profile = (f) => 12.5 - 3 * Math.sin(Math.min(1, f / 0.8) * Math.PI) - (f > 0.8 ? (f - 0.8) * 20 : 0);
  const list = [];
  for (let r = 0; r < 9; r += 1) {
    const f = r / 8.6;
    const w = profile(f);
    const count = w > 10 ? 3 : 2;
    for (let j = 0; j < count; j += 1) {
      const at = (-1 + (2 * (j + 0.5)) / count) * (w - 4) + (hash(r, j, p.seed) - 0.5) * 3;
      const rx = 3.9 + hash(j, r, p.seed + 1) * 2;
      list.push([
        p.x + Math.round(at * k),
        base - Math.round((3.5 + f * 35 + (hash(r, j, p.seed + 2) - 0.5) * 2) * k),
        Math.max(1.5, rx * k),
        Math.max(1.2, rx * (0.74 + hash(r, j, p.seed + 3) * 0.18) * k),
      ]);
    }
  }
  const tables = [
    { x: p.x - side * Math.round(12 * k), y: base - Math.round(16 * k), w: Math.round(15 * k) },
    { x: p.x + side * Math.round(11 * k), y: base - Math.round(27 * k), w: Math.round(13 * k) },
    { x: p.x - side * Math.round(3 * k), y: base - Math.round(39 * k), w: Math.round(18 * k) },
  ];
  const den = {
    x: p.x + side * Math.round(8 * k),
    y: base - 1,
    w: Math.max(3, Math.round(7 * k)),
    h: Math.max(2, Math.round(5 * k)),
  };
  return { side, list, tables, den, H, top: base - H, k };
}

// The signature landmark: a bommie, a pillar of massive coral heads with tabletop Acropora on its
// ledges, staghorn on its crown, a sea fan on its flank and a dark den at its foot.
export function bommie(g, p, s, base) {
  const geo = bommieGeom(p, s, base);
  const { k, side } = geo;
  const night = !!g.pal.night;
  sandShadow(g, p.x, base, Math.round(17 * k));
  const tones = g.pal.boulder;
  heads(g, geo.list, tones, p.seed, night);
  // The den: a hollow cut into the foot of the pillar, dark inside, its roof in shade.
  const { den } = geo;
  for (let r = 0; r <= den.h; r += 1) {
    const half = Math.round((den.w / 2) * Math.sqrt(Math.max(0, 1 - (r / (den.h + 0.5)) ** 2)));
    for (let dx = -half; dx <= half; dx += 1) {
      px(g, r === den.h || Math.abs(dx) === half ? tones[3] : g.pal.deep, den.x + dx, base - 1 - r);
    }
  }
  if (s < 0.4) return;
  // A sea fan on the flank away from the den, across the current.
  if (s > 0.6) fan(g, p.x - side * Math.round(15 * k), base - Math.round(8 * k), Math.round(9 * k), -side);
  for (const t of geo.tables) plate(g, t.x, t.y, t.w, 0, p.seed, night);
  // Staghorn on the crown.
  for (let i = -1; i <= 1; i += 1) {
    sprig(
      g,
      p.x + Math.round((i * 4 + 1) * k),
      geo.top + Math.round(3 * k),
      Math.max(2, Math.round((6 - Math.abs(i)) * k)),
      i,
      p.seed + i,
      night,
    );
  }
}

// ---- Standalone corals ---------------------------------------------------------------------------

// Tabletop Acropora on the sand: one plate on a stalk, a bigger one with a second tier beside it.
export function tableCoral(g, p, s, base) {
  const k = p.scale * s;
  const w = Math.max(4, Math.round((12 + (p.seed % 6)) * k));
  const stalk = Math.max(1, Math.round(4 * k));
  sandShadow(g, p.x, base, Math.round(w / 2) - 1);
  if (w > 14)
    plate(
      g,
      p.x + Math.round(w * 0.3),
      base - 3 - Math.round(stalk * 0.6),
      Math.round(w * 0.6),
      Math.round(stalk * 0.6),
      p.seed + 1,
      !!g.pal.night,
    );
  plate(g, p.x, base - 3 - stalk, w, stalk, p.seed, !!g.pal.night);
}

// A staghorn thicket: three to five sprigs from one foot, the middle tallest.
export function staghorn(g, p, s, base) {
  const k = p.scale * s;
  const h = Math.max(2, Math.round((8 + (p.seed % 4)) * k));
  const n = 3 + (p.seed % 3);
  sandShadow(g, p.x, base, Math.round(n * 1.5));
  for (let i = 0; i < n; i += 1) {
    const off = i - (n - 1) / 2;
    const tall = Math.max(2, Math.round(h * (1 - Math.abs(off) * 0.18)));
    sprig(g, p.x + Math.round(off * 2.4), base, tall, Math.sign(Math.round(off)), p.seed + i * 13, !!g.pal.night);
  }
}

// A massive Porites boulder: two to four heads in a low mound, wider than tall.
export function boulderCoral(g, p, s, base) {
  const k = p.scale * s;
  const w = (6 + (p.seed % 5)) * k;
  sandShadow(g, p.x, base, Math.round(w));
  const list = [[p.x, base - Math.round(w * 0.42), w, Math.max(1.5, w * 0.5)]];
  if (w > 6)
    list.push([p.x + Math.round(w * 0.45) * (p.seed % 2 ? 1 : -1), base - Math.round(w * 0.95), w * 0.55, w * 0.38]);
  const tones = p.tint ? g.pal.boulder.map((c) => mix(c, p.tint, 0.35)) : g.pal.boulder;
  heads(g, list, tones, p.seed, !!g.pal.night);
}

// A leather coral (Sarcophyton): a short stalk and a wavy cap whose fuzz of polyps sways.
export function softCoral(g, p, s, base) {
  const [lit, mid, shade, dark] = g.pal.softCoral;
  const k = p.scale * s;
  const stalk = Math.max(1, Math.round(4 * k));
  const half = Math.max(2, Math.round(5 * k));
  const sway = Math.round(surge(g.time, p.x) * 0.8);
  sandShadow(g, p.x, base, half - 1);
  rect(g, shade, p.x - 1, base - stalk, 3, stalk);
  rect(g, dark, p.x + 1, base - stalk, 1, stalk);
  const top = base - stalk - 2;
  for (let dx = -half; dx <= half; dx += 1) {
    const lip = Math.abs(dx) === half ? 1 : 0;
    px(g, dark, p.x + dx, top + 2 - lip);
    px(g, mid, p.x + dx, top + 1 - lip);
    const fuzz = hash(p.x + dx, 0, p.seed) < (g.pal.night ? 0.2 : 0.65);
    px(g, fuzz ? lit : mid, p.x + dx + (Math.abs(dx) < half ? sway : 0), top - lip);
  }
}

// A sea fan: a lattice of branches spread flat across the current from a short trunk, tips paler.
function fan(g, x, base, h, lean) {
  const [lit, mid, shade, dark] = g.pal.seaFan;
  const sway = surge(g.time, x) * 0.6;
  rect(g, dark, x, base - 2, 1, 2);
  for (let r = 2; r < h; r += 1) {
    const f = r / h;
    const half = Math.round(Math.sin(Math.min(1, f * 1.3) * Math.PI * 0.62) * h * 0.55);
    const off = Math.round(sway * f + lean * f * 1.2);
    for (let dx = -half; dx <= half; dx += 1) {
      const lattice = (dx + r) % 3 === 0 || (dx - r) % 4 === 0 || dx === 0;
      if (!lattice) continue;
      const c = f > 0.8 ? lit : f > 0.5 ? mid : f > 0.25 ? shade : dark;
      px(g, c, x + dx + off, base - r);
    }
  }
}
export function seaFan(g, p, s, base) {
  const h = Math.max(3, Math.round((10 + (p.seed % 4)) * p.scale * s));
  sandShadow(g, p.x, base, 2);
  fan(g, p.x, base, h, 0);
}

// A patch of seagrass: thin blades, the taller ones bending with the surge from their tips.
export function seagrass(g, p, s, base) {
  const [lit, mid, dark] = g.pal.seagrass;
  const n = 5 + (p.seed % 5);
  for (let i = 0; i < n; i += 1) {
    const bx = p.x + Math.round((i - n / 2) * 1.4);
    const h = Math.max(1, Math.round((3 + hash(i, 1, p.seed) * 4) * p.scale * s));
    for (let r = 0; r < h; r += 1) {
      const bend = Math.round(surge(g.time, bx) * (r / Math.max(h, 1)) * 1.4);
      px(g, r === h - 1 ? lit : r < 2 ? dark : mid, bx + bend, base - 1 - r);
    }
  }
}

// A magnificent sea anemone: a coloured column and a mat of tentacles that sways as one with the
// surge, tips paler. The clownfish live in it. `anemoneTop` is the top of its mat, for them.
export function anemoneTop(p, s, base) {
  return {
    x: p.x,
    y: base - 1 - Math.max(2, Math.round(6 * p.scale * s)),
    half: Math.max(2, Math.round(6 * p.scale * s)),
  };
}
export function anemone(g, p, s, base) {
  const [lit, mid, tip, column] = g.pal.anemone;
  const top = anemoneTop(p, s, base);
  const half = top.half;
  sandShadow(g, p.x, base, half - 1);
  // The column: a fold of colour under the mat, its lit rim on top.
  const colRows = Math.max(1, Math.round(2 * p.scale * s));
  rect(g, mix(column, "#000000", 0.3), p.x - half + 2, base - colRows, half * 2 - 3, colRows);
  rect(g, column, p.x - half + 1, base - colRows, half * 2 - 1, 1);
  // Tentacles: finger-like, each its own height, swaying as one with the surge, tips paler. A
  // shorter one between two tall ones leaves water showing between them.
  const sway = surge(g.time, p.x);
  const b = base - colRows;
  for (let dx = -half; dx <= half; dx += 1) {
    const edge = Math.abs(dx) / half;
    const tall = (dx + p.seed) % 2 === 0;
    const h = Math.max(1, Math.round((tall ? 5 - edge * 2 : 3 - edge) * p.scale * s));
    for (let r = 0; r < h; r += 1) {
      const lean = Math.round(sway * (r / h) * (1 + edge) + Math.sign(dx) * edge * (r / h) * 1.5);
      px(g, r === h - 1 ? tip : r >= h - 3 ? lit : mid, p.x + dx + lean, b - 1 - r);
    }
  }
}

// A giant clam (Tridacna gigas) set in the sand: a heavy fluted shell, its gape lined with the
// mantle, blue-green with paler spots. p.shut (0 open .. 1 shut) closes it, as a real clam snaps
// shut when a shadow passes over.
export function giantClam(g, p, s, base) {
  const [sLit, sMid, sDark, mantle, mDark, spot] = g.pal.clam;
  const k = p.scale * s;
  const half = Math.max(3, Math.round(6 * k));
  const h = Math.max(2, Math.round(4 * k));
  const open = 1 - clamp(p.shut ?? 0, 0, 1);
  sandShadow(g, p.x, base, half);
  for (let dx = -half; dx <= half; dx += 1) {
    const e = Math.abs(dx) / half;
    const top = Math.round(h * Math.sqrt(1 - e * e * 0.85));
    const flute = (dx + half) % 3 === 0;
    for (let r = 0; r < top; r += 1) {
      const c = r === top - 1 ? sLit : flute || r < 1 ? sDark : sMid;
      px(g, c, p.x + dx, base - 1 - r);
    }
    // The gape: the mantle bulges out of the shell's lips when it is open.
    if (open > 0.15 && Math.abs(dx) < half - 1) {
      const lip = base - 1 - top;
      const bulge = open > 0.6 && Math.abs(dx) < half - 2 ? 1 : 0;
      const c = hash(dx, 3, p.seed) < 0.25 ? spot : Math.abs(dx) < half * 0.4 ? mantle : mDark;
      px(g, c, p.x + dx, lip + 1);
      if (bulge) px(g, c === spot ? mantle : c, p.x + dx, lip);
    }
  }
}

// ---- The healthy reef's other growth forms -------------------------------------------------------
// Each takes its colour from a palette list by p.hue (an index), as the same coral grows in several
// colour morphs on a real reef; the colour comes from the algae in its tissue, so it stays muted by
// the water and the brightest tone is kept to tips, polyps and crowns.
const morph = (list, p) => list[(p.hue ?? p.seed) % list.length];

// Stylophora: a compact bush of short, blunt branches with flattened tips, in cream, pink, blue or
// green. Wider than tall.
export function stylophora(g, p, s, base) {
  const [lit, mid, shade] = morph(g.pal.stylophora, p);
  const k = p.scale * s;
  const half = Math.max(2, Math.round(7 * k));
  const h = Math.max(2, Math.round(8 * k));
  sandShadow(g, p.x, base, half);
  for (let dx = -half; dx <= half; dx += 1) {
    const e = Math.abs(dx) / (half + 0.5);
    const top = Math.max(1, Math.round(h * Math.sqrt(1 - e * e)));
    const branch = (dx + p.seed) % 2 === 0;
    const reach = branch ? top : Math.max(1, top - 2);
    for (let r = 0; r < reach; r += 1) {
      px(g, r >= reach - 1 ? lit : r < reach / 2 ? shade : mid, p.x + dx, base - 1 - r);
    }
  }
}

// Goniopora: a low dome whose long flower-like polyps stay out by day, a fuzz that sways with the
// surge, in green or lilac over a darker skeleton.
export function goniopora(g, p, s, base) {
  const [polyp, dome, shade, dark] = morph(g.pal.goniopora, p);
  const k = p.scale * s;
  const w = Math.max(2, 6.5 * k);
  sandShadow(g, p.x, base, Math.round(w));
  heads(g, [[p.x, base - Math.round(w * 0.45), w, Math.max(1.4, w * 0.5)]], [dome, dome, shade, dark], p.seed, false);
  const sway = Math.round(surge(g.time, p.x) * 0.7);
  const top = base - Math.round(w * 0.95);
  for (let dx = -Math.round(w); dx <= Math.round(w); dx += 1) {
    const e = Math.abs(dx) / (w + 0.5);
    const y = top + Math.round(w * 0.5 * (1 - Math.sqrt(Math.max(0, 1 - e * e))));
    if (hash(dx, 1, p.seed) < 0.75) px(g, polyp, p.x + dx + (e < 0.8 ? sway : 0), y - 1);
    if (hash(dx, 2, p.seed) < 0.35) px(g, polyp, p.x + dx + sway, y - 2);
  }
}

// A mushroom coral (Fungia) lying loose on the sand: a flat oval disc, its radial ridges in the
// shade tone, its mouth a darker slit in the middle.
export function mushroom(g, p, s, base) {
  const [lit, mid, shade] = morph(g.pal.mushroom, p);
  const half = Math.max(2, Math.round(4.5 * p.scale * s));
  sandShadow(g, p.x, base, half);
  for (let dx = -half; dx <= half; dx += 1) {
    const edge = Math.abs(dx) === half;
    px(g, edge ? shade : dx % 2 ? mid : shade, p.x + dx, base - 1);
    if (!edge) px(g, dx === 0 ? shade : Math.abs(dx) % 2 ? lit : mid, p.x + dx, base - 2);
  }
}

// Organ pipe coral (Tubipora): a clump of upright red tubes, each tipped with its green polyps.
export function organPipe(g, p, s, base) {
  const [lit, mid, shade, polyp] = g.pal.organPipe;
  const k = p.scale * s;
  const half = Math.max(1, Math.round(4 * k));
  sandShadow(g, p.x, base, half);
  for (let dx = -half; dx <= half; dx += 1) {
    const h = Math.max(1, Math.round((6 - Math.abs(dx) * 0.6 + hash(dx, 3, p.seed) * 2) * k));
    for (let r = 0; r < h; r += 1) px(g, r === h - 1 ? lit : dx % 2 ? shade : mid, p.x + dx, base - 1 - r);
    if (hash(dx, 4, p.seed) < 0.7) px(g, polyp, p.x + dx, base - 1 - h);
  }
}

// A bushy (corymbose) Acropora: a rounded cushion of short upright branchlets on a short foot, each
// tipped paler, in purple or green.
export function acroporaBush(g, p, s, base) {
  const [tip, lit, mid, shade] = morph(g.pal.bush, p);
  const k = p.scale * s;
  const half = Math.max(2, Math.round(9 * k));
  const h = Math.max(2, Math.round(7 * k));
  sandShadow(g, p.x, base, half - 1);
  rect(g, shade, p.x - 1, base - 2, 3, 2);
  for (let dx = -half; dx <= half; dx += 1) {
    const e = Math.abs(dx) / (half + 0.5);
    const top = Math.max(1, Math.round(h * (1 - e * e * 0.7)));
    const gap = hash(dx, 5, p.seed) < 0.25 ? 1 : 0;
    for (let r = 1; r < top - gap; r += 1) px(g, r < top * 0.45 ? shade : mid, p.x + dx, base - 1 - r);
    px(g, lit, p.x + dx, base - top + gap);
    if ((dx + p.seed) % 2 === 0) px(g, tip, p.x + dx, base - top + gap - 1);
  }
}

// A soft tree coral (Litophyton): a pale, fleshy trunk forking into branches that end in tight
// bunches of polyps, pink or yellow, the whole tree swaying from its foot.
export function softTree(g, p, s, base) {
  const [crown, lit, trunk, shade] = morph(g.pal.softTree, p);
  const k = p.scale * s;
  const h = Math.max(3, Math.round(14 * k));
  sandShadow(g, p.x, base, 2);
  const sway = surge(g.time, p.x);
  for (let r = 0; r < h; r += 1) {
    const off = Math.round(sway * (r / h) * 1.5);
    px(g, r < 2 ? shade : trunk, p.x + off, base - 1 - r);
    if (r === Math.round(h * 0.45) || r === Math.round(h * 0.7)) {
      const side = r === Math.round(h * 0.45) ? -1 : 1;
      for (let i = 1; i <= 2; i += 1) px(g, trunk, p.x + off + side * i, base - 1 - r - i);
    }
  }
  // Polyp bunches: round clusters at the branch ends and the top, lit on top.
  const off = Math.round(sway * 1.5);
  for (const [bx, by, r] of [
    [-2, Math.round(h * 0.45) + 3, 1.6],
    [2, Math.round(h * 0.7) + 3, 1.6],
    [0, h + 1, 2.1],
  ]) {
    const cx = p.x + bx + off;
    const cy = base - 1 - by;
    for (let dy = -Math.ceil(r); dy <= Math.ceil(r); dy += 1) {
      const half = Math.round(Math.sqrt(Math.max(0, r * r - dy * dy)));
      for (let dx = -half; dx <= half; dx += 1) px(g, dy < 0 ? crown : dy === 0 ? lit : shade, cx + dx, cy + dy);
    }
  }
}

export const FAMILY = {
  id: "corals",
  title: "Corals and reef plants",
  group: "Trees",
  differ: "growth form (pillar, table, branching, boulder, soft, fan, blades), size, colour",
};
