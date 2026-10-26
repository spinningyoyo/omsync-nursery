// The forest studio (scripts/forest-studio.py): every element of a scene on one page beside the
// live scene, and a pixel editor whose saves become patches for the drawing code.
//
// A render is one sprite drawn in one theme at one frame, into the art-pixel box sprites.js poses
// it in. Its key is "name|theme|frame". A saved edit holds the render it started from (original)
// and the render it asks for (target). Its state follows from what the code draws now: waiting
// (still the original), in code (exactly the target) or differs. The baseline is every render of
// the scene when its first edit was saved; a render that has moved from it without an edit is a
// ripple. With ?check=SCENE,SCENE the page skips the interface and leaves its findings in
// window.__result for `forest-studio.py check`.
import { FAMILIES, hasFamily, roleIn } from "./families.js";
import { Forest, SCENES } from "./js/forest_scene.js";
import { P, SOIL_ROWS } from "./js/forest/pixel.js";
import {
  ANIMAL_BOX,
  PLANT_BOX,
  SPRITES,
  frame,
  inventory,
  paintPlant,
  paintSprite,
  plantExamples,
} from "./sprites.js";

const THEMES = ["light", "dark"];
// The frames each sprite is drawn at: walkers swap legs on whole phases, and painters flap and sway
// with time. A frame that draws the same as an earlier one is dropped.
const FRAMES = [0, 1, 2, 3].map((i) => ({ phase: i, time: i / 4 }));
// The forest-scene skill's size tiers: [name, min width, max width, min height, max height].
const TIERS = [
  ["XS", 1, 5, 1, 3],
  ["S", 7, 11, 5, 10],
  ["M", 12, 17, 7, 12],
  ["L", 17, 23, 12, 17],
  ["XL", 23, 28, 18, 23],
  ["XXL", 28, 31, 24, 38],
];
// Preview sizes in art pixels: the skill's desktop (1200x520) and phone (390x700) frames, and a
// small laptop (960x480).
const SIZES = { desktop: [300, 130], phone: [98, 175], laptop: [240, 120] };
const GROUPS = [
  ["plant", "Plants and landmarks"],
  ["animal", "Animals"],
  ["bird", "Birds"],
  ["effect", "Effects"],
  ["other", "Other sprites"],
];
const PAD = 2; // around a thumbnail's drawing
const MARGIN = 6; // around the editor's drawing, room to add pixels
const MARK = "#ff2bd6"; // changed pixels

const $ = (selector, root = document) => root.querySelector(selector);
const el = (tag, attrs = {}, ...children) => {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === "class") node.className = value;
    else if (key.startsWith("on")) node.addEventListener(key.slice(2), value);
    else if (value !== false && value != null) node.setAttribute(key, value === true ? "" : value);
  }
  node.append(...children.flat().filter((c) => c != null && c !== false));
  return node;
};

function store(key, value) {
  try {
    if (value === undefined) return localStorage.getItem(key);
    localStorage.setItem(key, value);
  } catch {
    return null;
  }
  return value;
}

async function api(method, path, body) {
  const response = await fetch(path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) throw new Error(`${method} ${path}: ${response.status}`);
  return response.status === 204 ? null : response.json();
}

// ---- Pixels ---------------------------------------------------------------------------------

function clone(img) {
  return new ImageData(new Uint8ClampedArray(img.data), img.width, img.height);
}

const copies = (imgs) => Object.fromEntries(Object.entries(imgs).map(([t, i]) => [t, clone(i)]));

function same(a, b) {
  if (!a || !b || a.width !== b.width || a.height !== b.height) return false;
  const x = a.data;
  const y = b.data;
  for (let i = 0; i < x.length; i += 1) if (x[i] !== y[i]) return false;
  return true;
}

// The pixel indexes where two renders of one box differ.
function differences(a, b) {
  const out = [];
  for (let i = 0; i < a.width * a.height; i += 1) {
    const k = i * 4;
    if (
      a.data[k] !== b.data[k] ||
      a.data[k + 1] !== b.data[k + 1] ||
      a.data[k + 2] !== b.data[k + 2] ||
      a.data[k + 3] !== b.data[k + 3]
    ) {
      out.push(i);
    }
  }
  return out;
}

const hex2 = (n) => n.toString(16).padStart(2, "0");

// A pixel's colour as #rrggbb, #rrggbbaa when it is see-through, or null when it is empty.
function colourAt(img, x, y) {
  const k = (y * img.width + x) * 4;
  const [r, g, b, a] = img.data.slice(k, k + 4);
  if (a === 0) return null;
  return `#${hex2(r)}${hex2(g)}${hex2(b)}${a === 255 ? "" : hex2(a)}`;
}

function setColour(img, x, y, colour) {
  const k = (y * img.width + x) * 4;
  if (!colour) {
    img.data.fill(0, k, k + 4);
    return;
  }
  const n = parseInt(colour.slice(1), 16);
  const alpha = colour.length === 9;
  img.data[k] = alpha ? (n >>> 24) & 255 : (n >> 16) & 255;
  img.data[k + 1] = alpha ? (n >> 16) & 255 : (n >> 8) & 255;
  img.data[k + 2] = alpha ? (n >> 8) & 255 : n & 255;
  img.data[k + 3] = alpha ? n & 255 : 255;
}

// The drawn pixels' bounds, or null for an empty render.
function bounds(img) {
  let x0 = img.width;
  let y0 = img.height;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < img.height; y += 1) {
    for (let x = 0; x < img.width; x += 1) {
      if (img.data[(y * img.width + x) * 4 + 3] > 0) {
        x0 = Math.min(x0, x);
        y0 = Math.min(y0, y);
        x1 = Math.max(x1, x);
        y1 = Math.max(y1, y);
      }
    }
  }
  return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

function union(a, b) {
  if (!a) return b;
  if (!b) return a;
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y };
}

function grow(box, by, limit) {
  const x = Math.max(0, box.x - by);
  const y = Math.max(0, box.y - by);
  return {
    x,
    y,
    w: Math.min(limit.w, box.x + box.w + by) - x,
    h: Math.min(limit.h, box.y + box.h + by) - y,
  };
}

// A render as runs of equal pixels, [count, rgba, count, rgba, ...], which keeps patches small and
// exact (a PNG round trip can shift see-through colours).
function encode(img) {
  const words = new Uint32Array(img.data.buffer.slice(0));
  const runs = [];
  for (let i = 0; i < words.length; ) {
    let end = i + 1;
    while (end < words.length && words[end] === words[i]) end += 1;
    runs.push(end - i, words[i]);
    i = end;
  }
  return { w: img.width, h: img.height, runs };
}

function decode({ w, h, runs }) {
  const words = new Uint32Array(w * h);
  let at = 0;
  for (let i = 0; i < runs.length; i += 2) {
    words.fill(runs[i + 1], at, at + runs[i]);
    at += runs[i];
  }
  return new ImageData(new Uint8ClampedArray(words.buffer), w, h);
}

// A render on a canvas, kept while the render lives: the review repaints every frame.
const arts = new WeakMap();

function artOf(img) {
  if (!arts.has(img)) {
    const art = document.createElement("canvas");
    art.width = img.width;
    art.height = img.height;
    art.getContext("2d").putImageData(img, 0, 0);
    arts.set(img, art);
  }
  return arts.get(img);
}

// Draws the crop of a render, zoomed, over the theme's page colour. Edits change a render in
// place, so the editor passes fresh = true to skip the cache.
function drawZoomed(ctx, img, crop, zoom, bg, dx = 0, dy = 0, fresh = false) {
  if (fresh) arts.delete(img);
  const art = artOf(img);
  ctx.fillStyle = bg;
  ctx.fillRect(dx, dy, crop.w * zoom, crop.h * zoom);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(art, crop.x, crop.y, crop.w, crop.h, dx, dy, crop.w * zoom, crop.h * zoom);
}

// Side-by-side panels of renders, each with a caption: the pictures saved with a patch and the
// check's findings. The last panel can mark pixels.
function sheet(panels, crop, bg, marks = []) {
  const zoom = Math.max(6, Math.min(14, Math.floor(360 / Math.max(crop.w, crop.h))));
  const gap = 12;
  const label = 22;
  const canvas = document.createElement("canvas");
  canvas.width = panels.length * (crop.w * zoom + gap) + gap;
  canvas.height = crop.h * zoom + label + gap * 2;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#9aa0a6";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  panels.forEach(([caption, img, dim], i) => {
    const x = gap + i * (crop.w * zoom + gap);
    ctx.fillStyle = "#111";
    ctx.font = "600 14px system-ui, sans-serif";
    ctx.fillText(caption, x, gap + 13);
    ctx.globalAlpha = 1;
    drawZoomed(ctx, img, crop, zoom, bg, x, gap + label, true);
    if (dim) {
      ctx.fillStyle = bg;
      ctx.globalAlpha = 0.6;
      ctx.fillRect(x, gap + label, crop.w * zoom, crop.h * zoom);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = MARK;
      ctx.lineWidth = 2;
      for (const i2 of marks) {
        const px = (i2 % img.width) - crop.x;
        const py = Math.floor(i2 / img.width) - crop.y;
        ctx.strokeRect(x + px * zoom + 1, gap + label + py * zoom + 1, zoom - 2, zoom - 2);
      }
    }
  });
  return canvas.toDataURL("image/png");
}

// ---- Palettes -------------------------------------------------------------------------------

const isHex = (c) => typeof c === "string" && /^#[0-9a-f]{6}$/i.test(c);

// Every colour key of a palette, as "key" or "key[i]", with its value.
function paletteEntries(pal) {
  const out = [];
  for (const [key, value] of Object.entries(pal)) {
    if (Array.isArray(value)) value.forEach((c, i) => isHex(c) && out.push([`${key}[${i}]`, c]));
    else if (isHex(value)) out.push([key, value]);
  }
  return out;
}

function valueAt(pal, path) {
  const match = /^(\w+)(?:\[(\d+)\])?$/.exec(path);
  if (!match) return null;
  const value = pal[match[1]];
  const colour = match[2] === undefined ? value : value?.[Number(match[2])];
  return isHex(colour) ? colour.toLowerCase() : null;
}

// The palette keys a colour can come from in a theme, then from the other theme marked with it
// (night-only sprites draw the dark palette in both). pals is { light, dark }.
function keysFor(pals, theme, colour) {
  if (!colour || colour.length !== 7) return [];
  const own = paletteEntries(pals[theme])
    .filter(([, c]) => c.toLowerCase() === colour)
    .map(([k]) => k);
  if (own.length) return own;
  const other = theme === "light" ? "dark" : "light";
  return paletteEntries(pals[other])
    .filter(([, c]) => c.toLowerCase() === colour)
    .map(([k]) => `${other}:${k}`);
}

// A palette key with its colour in each theme.
const keyed = (path, pals) => ({
  path,
  light: valueAt(pals.light, path),
  dark: valueAt(pals.dark, path),
});

// The palettes a sprite draws with: the scene's, plus what a proposal adds.
const palsOf = (job) => job?.pals ?? S.scene.palettes;

const signed = (n) => (n >= 0 ? `+${n}` : `${n}`);

const describeColour = (pals, theme, colour) => {
  if (!colour) return "empty";
  const keys = keysFor(pals, theme, colour);
  return keys.length ? `${colour} (${keys.join(", ")})` : `${colour} (not a palette colour)`;
};

// ---- Scene model ----------------------------------------------------------------------------

let meta = null;
const S = {
  sid: null,
  scene: null,
  M: null,
  info: null,
  cards: [],
  jobs: new Map(), // sprite name -> job
  edits: new Map(), // render key -> saved edit, its images decoded
  baseline: null, // render key -> image
  proposals: [], // see Proposals below
  proposalEdits: new Map(), // render key -> pixel edit on a proposal frame
  errors: [],
};

const renderKey = (name, theme, f) => `${name}|${theme}|${f}`;

function drawRender(job, theme, f) {
  const canvas = document.createElement("canvas");
  canvas.width = job.box.w;
  canvas.height = job.box.h;
  const ctx = canvas.getContext("2d");
  const pal = palsOf(job)[theme];
  if (job.paint) {
    job.paint(ctx, pal, f);
    return ctx.getImageData(0, 0, job.box.w, job.box.h);
  }
  Object.assign(frame, FRAMES[f]);
  try {
    if (job.plant) paintPlant(ctx, S.M, job.plant, pal);
    else paintSprite(ctx, job.draw, S.M, pal);
  } finally {
    Object.assign(frame, FRAMES[0]);
  }
  return ctx.getImageData(0, 0, job.box.w, job.box.h);
}

// Draws a sprite in both themes at each frame, keeping the frames that differ. A proposal keeps
// every frame, so frame numbers stay times.
function renderJob(job) {
  job.renders = new Map();
  job.frames = [];
  job.error = null;
  try {
    for (let f = 0; f < (job.count ?? FRAMES.length); f += 1) {
      const imgs = THEMES.map((t) => drawRender(job, t, f));
      const seen = job.frames.some((k) =>
        THEMES.every((t, i) => same(job.renders.get(`${t}|${k}`), imgs[i])),
      );
      if (seen && !job.proposal) continue;
      job.frames.push(f);
      THEMES.forEach((t, i) => job.renders.set(`${t}|${f}`, imgs[i]));
    }
  } catch (error) {
    job.error = String(error?.message ?? error);
    if (!job.proposal) S.errors.push(`${job.name}: ${job.error}`);
    return;
  }
  job.same = job.frames.every((f) =>
    same(job.renders.get(`light|${f}`), job.renders.get(`dark|${f}`)),
  );
  job.themes = job.same ? ["light"] : THEMES;
  job.bbox = null;
  for (const img of job.renders.values()) job.bbox = union(job.bbox, bounds(img));
  const main = bounds(job.renders.get("light|0"));
  job.size = main ? [main.w, main.h] : [0, 0];
  // The row under the lowest pixel: where a walker's feet stand (animals.js feet(), groundY + 7),
  // so a pixel's dy from it is the dy a painter's part() takes.
  job.feet = main ? main.y + main.h : job.box.h;
}

function tierOf(w, h) {
  const byW = TIERS.filter(([, a, b]) => w >= a && w <= b).map(([n]) => n);
  const byH = TIERS.filter(([, , , a, b]) => h >= a && h <= b).map(([n]) => n);
  const wT = byW.join("/") || (w > 31 ? "wider than XXL" : "between tiers");
  const hT = byH.join("/") || "between tiers";
  return wT === hT ? wT : `w ${wT}, h ${hT}`;
}

const stripScene = (name, sid = S.sid) => name.replace(`${sid}-`, "");

function buildCards(scene, info) {
  const cards = [];
  const inv = inventory(scene);
  const examples = plantExamples(scene);
  const byKind = new Map();
  for (const [key, { plant }] of Object.entries(examples)) {
    const [kind, species] = key.split("/");
    if (!byKind.has(kind)) {
      const stat = inv[kind];
      const counts = [240, 160, 90].map((c) => stat.counts[c] ?? 0).join(" / ");
      const [a, b] = stat.first;
      const painter = info.painters[kind];
      byKind.set(kind, {
        group: "plant",
        label: kind,
        facts: [
          `${counts} on 240 / 160 / 90 px pages`,
          `${stat.layers.join(", ")} row${stat.layers.length > 1 ? "s" : ""}`,
          `first seen at stage ${a === b ? a : `${a} to ${b}`}`,
        ],
        where: painter?.where ? { ...painter.where, fn: painter.fn } : null,
        jobs: [],
      });
    }
    const name = `${scene.id}-${key.replace("/", "-")}`;
    byKind.get(kind).jobs.push({
      name,
      title: species ?? kind,
      plant,
      box: PLANT_BOX,
    });
  }
  cards.push(...byKind.values());
  const used = new Set();
  for (const element of info.elements) {
    const jobs = element.sprites
      .filter((name) => SPRITES[scene.id][name])
      .map((name) => {
        used.add(name);
        return { name, title: stripScene(name, scene.id), draw: SPRITES[scene.id][name], box: ANIMAL_BOX };
      });
    cards.push({
      group: element.kind,
      label: element.label,
      facts: [element.layer],
      where: element.where ? { ...element.where, fn: element.fn } : null,
      jobs,
    });
  }
  const rest = Object.entries(SPRITES[scene.id]).filter(([name]) => !used.has(name));
  if (rest.length) {
    cards.push({
      group: "other",
      label: "not in the catalogue's element list",
      facts: [],
      where: null,
      jobs: rest.map(([name, draw]) => ({
        name,
        title: stripScene(name, scene.id),
        draw,
        box: ANIMAL_BOX,
      })),
    });
  }
  return cards;
}

async function loadScene(sid) {
  S.sid = sid;
  S.scene = SCENES.find((s) => s.id === sid);
  S.info = meta.scenes.find((s) => s.id === sid);
  S.errors = [];
  S.M = await import(`./copies/${sid}.js`);
  S.cards = buildCards(S.scene, S.info);
  S.jobs = new Map();
  for (const card of S.cards) {
    for (const job of card.jobs) {
      job.card = card;
      renderJob(job);
      S.jobs.set(job.name, job);
    }
  }
  await loadSaved();
}

async function loadSaved() {
  const saved = await api("GET", `/api/scene/${S.sid}`);
  const decoded = (edits) =>
    new Map(
      edits.map((e) => [
        e.key,
        { ...e, originalImg: decode(e.original), targetImg: decode(e.target) },
      ]),
    );
  S.edits = decoded(saved.edits);
  S.proposalEdits = decoded(saved.proposals.flatMap((p) => p.edits));
  S.baseline = saved.baseline
    ? new Map(Object.entries(saved.baseline.renders).map(([k, v]) => [k, decode(v)]))
    : null;
  await loadProposals(saved.proposals);
}

function currentRender(key) {
  const [name, theme, f] = key.split("|");
  return S.jobs.get(name)?.renders?.get(`${theme}|${f}`) ?? null;
}

// waiting, in code, differs, or missing (the code no longer draws that sprite or frame).
function editState(edit) {
  const now = currentRender(edit.key);
  if (!now) return "missing";
  if (same(now, edit.targetImg)) return "in code";
  if (same(now, edit.originalImg)) return "waiting";
  return "differs";
}

function ripples() {
  if (!S.baseline) return [];
  const out = [];
  for (const [key, before] of S.baseline) {
    if (S.edits.has(key)) continue;
    const now = currentRender(key);
    if (now && !same(now, before)) out.push({ key, before, now });
  }
  return out;
}

async function saveBaseline() {
  if (S.baseline) return;
  const renders = {};
  for (const job of S.jobs.values()) {
    if (!job.renders || job.proposal) continue;
    for (const [tf, img] of job.renders) renders[`${job.name}|${tf}`] = encode(img);
  }
  await api("PUT", `/api/baseline/${S.sid}`, { saved: new Date().toISOString(), renders });
}

// ---- Check mode -----------------------------------------------------------------------------

function pixelList(pals, theme, want, got, indexes, feet, limit = 40) {
  return indexes.slice(0, limit).map((i) => {
    const x = i % want.width;
    const y = Math.floor(i / want.width);
    return {
      x,
      y,
      dx: x - 40,
      dy: y - feet,
      want: describeColour(pals, theme, colourAt(want, x, y)),
      got: describeColour(pals, theme, colourAt(got, x, y)),
    };
  });
}

function finding(key, wantLabel, want, got) {
  const [name, theme] = key.split("|");
  const job = S.jobs.get(name);
  const indexes = differences(want, got);
  const crop = grow(union(bounds(want), bounds(got)) ?? { x: 0, y: 0, w: 1, h: 1 }, PAD, job.box);
  const bg = S.scene.palettes[theme].haze;
  return {
    key,
    count: indexes.length,
    pixels: pixelList(palsOf(job), theme, want, got, indexes, job.feet),
    pictures: [
      sheet([[wantLabel, want], ["code now", got], ["differs", got, true]], crop, bg, indexes),
    ],
  };
}

async function runCheck(ids) {
  const out = { scenes: {} };
  for (const sid of ids) {
    await loadScene(sid);
    const edits = [];
    for (const edit of S.edits.values()) {
      const status = editState(edit);
      const item = { key: edit.key, status };
      if (status === "differs") {
        Object.assign(item, finding(edit.key, "edit", edit.targetImg, currentRender(edit.key)));
      }
      edits.push(item);
    }
    const moved = ripples().map((r) => finding(r.key, "baseline", r.before, r.now));
    out.scenes[sid] = { edits, ripples: moved, errors: S.errors };
  }
  window.__result = out;
}

// ---- Live scene -----------------------------------------------------------------------------

let previewSize = SIZES.desktop;

// A Forest of a fixed size instead of the window's.
class Preview extends Forest {
  resize() {
    [this.cols, this.rows] = previewSize;
    for (const canvas of [this.ground, this.water]) {
      canvas.width = this.cols;
      canvas.height = this.rows;
    }
    this.groundY = this.rows - SOIL_ROWS;
    this.wet = new Float32Array(this.cols);
    this.particles = [];
    this.fountain = null;
    this.waterDirty = true;
    this.plant();
    fitPreview();
  }
}

const live = { forest: null, paused: false };

function fitPreview() {
  const f = live.forest;
  const box = $("#stage");
  if (!f || !box) return;
  const zoom = Math.max(1, Math.min(6, Math.floor(box.parentElement.clientWidth / f.cols)));
  for (const canvas of [f.ground, f.water]) {
    canvas.style.width = `${f.cols * zoom}px`;
    canvas.style.height = `${f.rows * zoom}px`;
  }
  box.style.width = `${f.cols * zoom}px`;
  box.style.height = `${f.rows * zoom}px`;
}

function startPreview() {
  const stage = Number($("#stage-range").value);
  if (live.forest) {
    live.forest.setScene(S.scene, stage);
    return;
  }
  live.forest = new Preview({
    ground: $("#ground"),
    water: $("#water"),
    reducedMotion: false,
    scene: S.scene,
    stage,
  });
  fitPreview();
}

function setStage(stage) {
  const f = live.forest;
  const from = f.stage;
  f.stage = stage;
  for (const p of f.plants) p.shown = p.target = stage;
  for (let s = from + 1; s <= stage; s += 1) {
    f.stage = s;
    S.scene.extras?.onGrow?.(f);
  }
  f.stage = stage;
  f.dirty = true;
  $("#stage-value").textContent = stage;
}

// Waters at an art pixel, as a click on the sign-in page would.
function waterAt(col, row) {
  const f = live.forest;
  const box = f.ground.getBoundingClientRect();
  const stage = f.sprinkle(box.left + col * P, box.top + row * P);
  $("#stage-range").value = stage;
  $("#stage-value").textContent = stage;
}

function pause(paused) {
  const f = live.forest;
  live.paused = paused;
  cancelAnimationFrame(f.raf);
  if (!paused) {
    f.last = performance.now();
    f.raf = requestAnimationFrame(f.tick);
  }
  $("#pause").textContent = paused ? "Play" : "Pause";
}

// The animals and effects on the page now, by the name the scene keeps them under.
function onPage() {
  const extra = live.forest?.extra ?? {};
  const names = [];
  const present = (item) =>
    item && typeof item === "object" && ("bird" in item ? item.bird != null : item.active === true);
  for (const [key, value] of Object.entries(extra)) {
    if (Array.isArray(value)) {
      const n = value.filter(present).length;
      if (n) names.push(n > 1 ? `${key} ×${n}` : key);
    } else if (present(value)) {
      names.push(key);
    }
  }
  return names;
}

// ---- Board ----------------------------------------------------------------------------------

// Thumbnails fit a card's sprites to about 40 x size CSS pixels, at one zoom per card so its poses
// compare; with one scale, every sprite in the scene shares the zoom size.
const ui = {
  size: Number(store("studio.size")) || 4,
  oneScale: store("studio.oneScale") === "1",
  animate: false,
  tick: 0,
  thumbs: [],
};

function cardZoom(card) {
  if (ui.oneScale) return ui.size;
  const most = Math.max(...card.jobs.map((j) => (j.bbox ? Math.max(j.bbox.w, j.bbox.h) : 1)));
  return Math.max(1, Math.min(14, Math.floor((40 * ui.size) / (most + PAD * 2))));
}

function where(w) {
  if (!w) return null;
  const file = w.path.split("/").pop();
  const text = `${w.fn ? `${w.fn} · ` : ""}${file}:${w.line}`;
  return el(
    "button",
    {
      class: "where",
      title: `Copy ${w.path}:${w.line}`,
      onclick: (e) => {
        const button = e.currentTarget;
        navigator.clipboard?.writeText(`${w.path}:${w.line}`);
        button.classList.add("copied");
        setTimeout(() => button.classList.remove("copied"), 900);
      },
    },
    text,
  );
}

function stateBadge(job) {
  const states = [...S.edits.values()]
    .filter((e) => e.key.startsWith(`${job.name}|`))
    .map(editState);
  if (!states.length) return null;
  const worst = ["differs", "missing", "waiting", "in code"].find((s) => states.includes(s));
  return el("span", { class: `badge ${worst.replace(" ", "-")}` }, `edit: ${worst}`);
}

function thumb(job, theme, zoom) {
  const crop = grow(job.bbox ?? { x: 0, y: 0, w: 1, h: 1 }, PAD, job.box);
  const canvas = el("canvas", {
    class: "thumb",
    title: `${job.name} · ${theme}${job.same ? " (same in both themes)" : ""} · ${zoom}x · edit`,
  });
  canvas.width = crop.w * zoom;
  canvas.height = crop.h * zoom;
  const t = { canvas, job, theme, crop, zoom };
  ui.thumbs.push(t);
  paintThumb(t);
  const edit = job.scene ? editInScene : openEditor;
  canvas.addEventListener("click", () => edit(job, theme));
  return canvas;
}

function paintThumb({ canvas, job, theme, crop, zoom }) {
  const f = job.frames[ui.animate ? ui.tick % job.frames.length : 0];
  const ctx = canvas.getContext("2d");
  const { palettes } = job.scene ?? S.scene;
  drawZoomed(ctx, job.renders.get(`${theme}|${f}`), crop, zoom, palettes[theme].haze);
}

function poseView(job, zoom) {
  if (job.error) {
    return el(
      "figure",
      { class: "pose" },
      el("figcaption", {}, job.title),
      el("p", { class: "error" }, job.error),
    );
  }
  const [w, h] = job.size;
  const sized = ["animal", "bird"].includes(job.card.group) ? ` · ${tierOf(w, h)}` : "";
  return el(
    "figure",
    { class: "pose", id: `pose-${job.name}` },
    el("div", { class: "thumbs" }, job.themes.map((t) => thumb(job, t, zoom))),
    el(
      "figcaption",
      {},
      el("strong", {}, job.title),
      el("span", {}, ` ${w}×${h}${sized}`),
      job.same ? el("span", { class: "muted" }, " · one look in both themes") : null,
      job.frames.length > 1
        ? el("span", { class: "muted" }, ` · ${job.frames.length} frames`)
        : null,
      stateBadge(job),
    ),
  );
}

function cardView(card, zoom) {
  return el(
    "section",
    { class: "card" },
    el("header", {}, el("h3", {}, card.label), where(card.where)),
    card.facts.length ? el("p", { class: "facts" }, card.facts.join(" · ")) : null,
    el("div", { class: "poses" }, card.jobs.map((job) => poseView(job, zoom ?? cardZoom(card)))),
  );
}

const matches = (card, filter) =>
  !filter ||
  card.label.toLowerCase().includes(filter) ||
  card.jobs.some((j) => j.name.includes(filter));

function renderBoard() {
  ui.thumbs = [];
  const board = $("#board");
  board.replaceChildren();
  const filter = $("#filter").value.trim().toLowerCase();
  if (ui.family) {
    renderFamily(board, filter);
    renderChangesButton();
    return;
  }
  if (S.proposals.length) {
    const clearable = S.proposals.filter((p) => p.review?.verdict === "approve");
    board.append(
      el("h2", {}, "Proposals", el("span", { class: "muted" }, ` ${S.proposals.length}`)),
      el(
        "div",
        { class: "row" },
        clearable.length
          ? el(
              "button",
              { onclick: () => clearProposals(clearable) },
              `Clear approved (${clearable.length})`,
            )
          : null,
        el("button", { onclick: () => clearProposals(S.proposals) }, "Clear all"),
      ),
      proposalCards(),
    );
  }
  for (const [group, title] of GROUPS) {
    const cards = S.cards.filter((c) => c.group === group && matches(c, filter));
    if (!cards.length) continue;
    board.append(
      el("h2", {}, title, el("span", { class: "muted" }, ` ${cards.length}`)),
      el("div", { class: "cards" }, cards.map((card) => cardView(card))),
    );
  }
  if (S.errors.length) {
    board.prepend(el("p", { class: "error" }, `Not drawn: ${S.errors.join("; ")}`));
  }
  renderChangesButton();
}

// ---- Families -------------------------------------------------------------------------------

// A family's members come from every scene, so its board draws them from their own scene's module
// and palette, side by side at one zoom. A scene's cards are drawn once and kept.
const drawnScenes = new Map();

async function sceneCards(sid) {
  if (drawnScenes.has(sid)) return drawnScenes.get(sid);
  const scene = SCENES.find((s) => s.id === sid);
  const M = await import(`./copies/${sid}.js`);
  const cards = buildCards(scene, meta.scenes.find((s) => s.id === sid));
  for (const card of cards) {
    for (const job of card.jobs) {
      Object.assign(job, { card, scene, sid, pals: scene.palettes });
      job.paint = (ctx, pal, f) => {
        Object.assign(frame, FRAMES[f]);
        try {
          if (job.plant) paintPlant(ctx, M, job.plant, pal);
          else paintSprite(ctx, job.draw, M, pal);
        } finally {
          Object.assign(frame, FRAMES[0]);
        }
      };
      renderJob(job);
    }
  }
  drawnScenes.set(sid, cards);
  return cards;
}

// The cards of one scene holding only the sprites `keep` takes, labelled with the scene.
function narrowed(cards, sid, keep) {
  const title = meta.scenes.find((s) => s.id === sid).title;
  return cards
    .map((card) => ({ ...card, label: `${title} · ${card.label}`, jobs: card.jobs.filter(keep) }))
    .filter((card) => card.jobs.length);
}

async function loadFamily(id) {
  const family = FAMILIES.find((f) => f.id === id);
  const sids = meta.scenes.map((s) => s.id);
  const sections = { member: [], storybook: [] };
  for (const sid of sids) {
    if (family && !family.members[sid] && !family.storybook?.[sid]) continue;
    const cards = await sceneCards(sid);
    if (family) {
      for (const role of Object.keys(sections)) {
        sections[role].push(...narrowed(cards, sid, (j) => roleIn(family, sid, j.name) === role));
      }
    } else {
      const creatures = cards.filter((c) => ["animal", "bird"].includes(c.group));
      sections.member.push(...narrowed(creatures, sid, (j) => !hasFamily(sid, j.name)));
    }
  }
  ui.familyView = { family, ...sections };
}

function renderFamily(board, filter) {
  const { family, member, storybook } = ui.familyView;
  const cards = [...member, ...storybook].flatMap((card) => card.jobs);
  const most = Math.max(1, ...cards.map((j) => (j.bbox ? Math.max(j.bbox.w, j.bbox.h) : 1)));
  const fit = Math.max(1, Math.min(14, Math.floor((40 * ui.size) / (most + PAD * 2))));
  const zoom = ui.oneScale ? ui.size : fit;
  const section = (title, list) => {
    const shown = list.filter((card) => matches(card, filter));
    if (!shown.length) return;
    board.append(
      el("h2", {}, title, el("span", { class: "muted" }, ` ${shown.length}`)),
      el("div", { class: "cards" }, shown.map((card) => cardView(card, zoom))),
    );
  };
  if (family) {
    const note = `Members may differ in: ${family.differ}. Same zoom throughout.`;
    board.append(el("p", { class: "facts" }, note));
  } else if (!member.length) {
    board.append(el("p", { class: "muted" }, "Every animal and bird has a family."));
  }
  section(family?.title ?? "No family yet", member);
  section("Storybook: keeps its book's look", storybook);
}

async function showFamily(id) {
  if (!id) {
    ui.family = null;
    ui.familyView = null;
    renderBoard();
    return;
  }
  $("#board").replaceChildren(el("p", { class: "muted" }, "Drawing…"));
  await loadFamily(id === "none" ? null : id);
  ui.family = id;
  renderBoard();
}

// A family's sprites are drawn outside the loaded scene, so editing one goes to its scene first.
async function editInScene(job, theme) {
  $("#family").value = "";
  ui.family = null;
  ui.familyView = null;
  await showScene(job.sid);
  const own = S.jobs.get(job.name);
  if (own) openEditor(own, theme);
}

function renderChangesButton() {
  const states = [...S.edits.values()].map(editState);
  const moved = ripples().length;
  const button = $("#changes");
  const waiting = states.filter((s) => s !== "in code").length;
  const done = S.edits.size ? `${S.edits.size - waiting}/${S.edits.size} in code` : "(none)";
  button.textContent = `Changes ${done}${moved ? ` · ${moved} moved` : ""}`;
  button.classList.toggle("alert", states.includes("differs") || moved > 0);
}

// ---- Changes drawer -------------------------------------------------------------------------

function miniPanels(key, panels) {
  const [name, theme] = key.split("|");
  const job = S.jobs.get(name);
  let crop = null;
  for (const [, img] of panels) if (img) crop = union(crop, bounds(img));
  crop = grow(crop ?? { x: 0, y: 0, w: 1, h: 1 }, PAD, job?.box ?? ANIMAL_BOX);
  const zoom = Math.max(3, Math.min(8, Math.floor(120 / Math.max(crop.w, crop.h))));
  return el(
    "div",
    { class: "minis" },
    panels.map(([caption, img]) => {
      const canvas = el("canvas");
      canvas.width = crop.w * zoom;
      canvas.height = crop.h * zoom;
      if (img) drawZoomed(canvas.getContext("2d"), img, crop, zoom, S.scene.palettes[theme].haze);
      return el("figure", {}, canvas, el("figcaption", {}, caption));
    }),
  );
}

function openChanges() {
  const list = $("#changes-list");
  list.replaceChildren();
  const edits = [...S.edits.values()];
  if (!edits.length) list.append(el("p", { class: "muted" }, "No saved edits in this scene."));
  for (const edit of edits) {
    const state = editState(edit);
    const [name, theme, f] = edit.key.split("|");
    const job = S.jobs.get(name);
    list.append(
      el(
        "article",
        { class: "change" },
        el(
          "header",
          {},
          el("strong", {}, `${stripScene(name)} · ${theme} · frame ${f}`),
          el("span", { class: `badge ${state.replace(" ", "-")}` }, state),
        ),
        el(
          "p",
          { class: "muted" },
          `${edit.pixels.length} px changed · saved ${edit.saved.slice(0, 16).replace("T", " ")}`,
        ),
        miniPanels(edit.key, [
          ["original", edit.originalImg],
          ["edit", edit.targetImg],
          ["code now", currentRender(edit.key)],
        ]),
        el(
          "div",
          { class: "row" },
          job
            ? el(
                "button",
                {
                  onclick: () => {
                    closeChanges();
                    openEditor(job, theme, Number(f));
                  },
                },
                "Open",
              )
            : null,
          el("button", {
            onclick: async () => {
              await api("DELETE", `/api/edit/${S.sid}/${edit.key.replaceAll("|", ".")}`);
              await loadSaved();
              renderBoard();
              openChanges();
            },
          }, "Discard"),
        ),
      ),
    );
  }
  const moved = ripples();
  if (moved.length) {
    list.append(
      el("h3", {}, "Moved without an edit"),
      el(
        "p",
        { class: "muted" },
        "These changed since the first edit was saved. Check that each change is wanted.",
      ),
    );
    for (const r of moved) {
      const n = differences(r.before, r.now).length;
      const [name, theme, f] = r.key.split("|");
      list.append(
        el(
          "article",
          { class: "change" },
          el(
            "header",
            {},
            el("strong", {}, `${stripScene(name)} · ${theme} · frame ${f}`),
            el("span", { class: "badge differs" }, `${n} px`),
          ),
          miniPanels(r.key, [["before", r.before], ["now", r.now]]),
        ),
      );
    }
  }
  if (S.baseline || edits.length) {
    list.append(
      el(
        "div",
        { class: "row end" },
        el("button", {
          class: "primary",
          onclick: async () => {
            if (!confirm("Clear this scene's edits and baseline? The code stays as it is.")) return;
            await api("DELETE", `/api/scene/${S.sid}`);
            await loadSaved();
            renderBoard();
            closeChanges();
          },
        }, "Accept and clear"),
      ),
    );
  }
  $("#drawer").hidden = false;
}

function closeChanges() {
  $("#drawer").hidden = true;
}

// ---- Editor ---------------------------------------------------------------------------------

const ed = {
  job: null,
  f: 0,
  link: true,
  tool: "pencil",
  colour: null, // { path, light, dark }
  frames: new Map(), // frame -> { original: {theme: img}, target: {theme: img} }
  undo: [],
  redo: [],
  crop: null,
  zoom: 16,
  grid: true,
  marks: true,
  showOriginal: false,
  stroke: null,
  hover: null,
};

const editsFor = (job) => (job.proposal ? S.proposalEdits : S.edits);

const frameTitle = (job, f) =>
  job.proposal
    ? `${(f / job.fps).toFixed(2)} s`
    : `phase ${FRAMES[f].phase}, time ${FRAMES[f].time}`;

function editFrame(f) {
  if (!ed.frames.has(f)) {
    const original = {};
    const target = {};
    for (const theme of ed.job.themes) {
      const key = renderKey(ed.job.name, theme, f);
      const saved = editsFor(ed.job).get(key);
      const now = ed.job.renders.get(`${theme}|${f}`);
      if (saved && editState(saved) !== "in code") {
        original[theme] = saved.originalImg;
        target[theme] = clone(saved.targetImg);
      } else {
        original[theme] = now;
        target[theme] = clone(now);
      }
    }
    ed.frames.set(f, { original, target });
  }
  return ed.frames.get(f);
}

function dirty() {
  for (const { original, target } of ed.frames.values()) {
    for (const theme of Object.keys(target)) if (!same(original[theme], target[theme])) return true;
  }
  return false;
}

function openEditor(job, theme = "light", f = job.frames[0]) {
  if (job.error) return;
  ed.job = job;
  ed.f = job.frames.includes(f) ? f : job.frames[0];
  ed.frames = new Map();
  ed.undo = [];
  ed.redo = [];
  ed.focus = theme;
  let crop = job.bbox;
  for (const fr of job.frames) {
    for (const t of job.themes) {
      const saved = editsFor(job).get(renderKey(job.name, t, fr));
      if (saved) crop = union(crop, bounds(saved.targetImg));
    }
  }
  ed.crop = grow(crop ?? { x: 30, y: 30, w: 20, h: 20 }, MARGIN, job.box);
  const room = (window.innerWidth - 340) / job.themes.length - 48;
  const fit = Math.min(room / ed.crop.w, (window.innerHeight - 260) / ed.crop.h);
  ed.zoom = Math.max(6, Math.min(32, Math.floor(fit)));
  editFrame(ed.f);
  if (!ed.colour) pickFirstColour();
  $("#editor-title").textContent = `${job.card.label} · ${job.title}`;
  $("#editor-where").replaceChildren(where(job.card.where) ?? "");
  buildEditorCanvases();
  buildFrameTabs();
  buildPalette();
  $("#editor").hidden = false;
  document.body.classList.add("editing");
  redraw();
}

function closeEditor(force = false) {
  if (!force && dirty() && !confirm("Close without saving these edits?")) return;
  $("#editor").hidden = true;
  document.body.classList.remove("editing");
  ed.job = null;
}

function pickFirstColour() {
  const used = usedColours();
  ed.colour = used[0] ?? null;
}

function buildFrameTabs() {
  const tabs = $("#frames");
  tabs.replaceChildren();
  if (ed.job.frames.length < 2) return;
  ed.job.frames.forEach((f) => {
    tabs.append(
      el("button", {
        class: f === ed.f ? "on" : "",
        title: frameTitle(ed.job, f),
        onclick: () => {
          ed.f = f;
          editFrame(f);
          buildFrameTabs();
          redraw();
        },
      }, `Frame ${f}`),
    );
  });
}

function buildEditorCanvases() {
  const box = $("#canvases");
  box.replaceChildren();
  ed.canvases = {};
  ed.previews = {};
  for (const theme of ed.job.themes) {
    const canvas = el("canvas", { class: "edit" });
    canvas.width = ed.crop.w * ed.zoom;
    canvas.height = ed.crop.h * ed.zoom;
    canvas.addEventListener("pointerdown", (e) => pointerDown(e, theme));
    canvas.addEventListener("pointermove", (e) => pointerMove(e, theme));
    canvas.addEventListener("pointerup", pointerUp);
    canvas.addEventListener("pointerleave", () => {
      ed.hover = null;
      redraw();
    });
    canvas.addEventListener("contextmenu", (e) => e.preventDefault());
    const small = el("canvas", { class: "actual" });
    const big = el("canvas", { class: "actual" });
    ed.canvases[theme] = canvas;
    ed.previews[theme] = [small, big];
    const label = ed.job.same ? "light and dark (they draw the same)" : theme;
    box.append(
      el(
        "div",
        { class: "edit-col" },
        el(
          "div",
          { class: "edit-head" },
          el("strong", {}, label),
          el("span", { class: "previews" }, small, big),
        ),
        canvas,
      ),
    );
  }
}

function cellAt(e) {
  const rect = e.currentTarget.getBoundingClientRect();
  const x = ed.crop.x + Math.floor(((e.clientX - rect.left) / rect.width) * ed.crop.w);
  const y = ed.crop.y + Math.floor(((e.clientY - rect.top) / rect.height) * ed.crop.h);
  return { x, y };
}

function snapshot() {
  const { target } = editFrame(ed.f);
  return { f: ed.f, target: copies(target) };
}

function restore(snap) {
  ed.f = snap.f;
  editFrame(snap.f).target = snap.target;
  buildFrameTabs();
}

function pointerDown(e, theme) {
  e.preventDefault();
  ed.focus = theme;
  const cell = cellAt(e);
  const tool = e.altKey ? "picker" : e.button === 2 ? "eraser" : ed.tool;
  if (tool === "picker") {
    pick(theme, cell);
    return;
  }
  e.currentTarget.setPointerCapture(e.pointerId);
  ed.undo.push(snapshot());
  ed.redo = [];
  ed.stroke = { tool, theme, last: cell };
  apply(cell);
  redraw();
}

function pointerMove(e, theme) {
  const cell = cellAt(e);
  ed.hover = { theme, ...cell };
  if (ed.stroke) {
    // Fill the cells between two pointer events, so a fast drag leaves no gaps.
    const { last } = ed.stroke;
    const steps = Math.max(Math.abs(cell.x - last.x), Math.abs(cell.y - last.y));
    for (let i = 1; i <= steps; i += 1) {
      apply({
        x: Math.round(last.x + ((cell.x - last.x) * i) / steps),
        y: Math.round(last.y + ((cell.y - last.y) * i) / steps),
      });
    }
    ed.stroke.last = cell;
  }
  redraw();
}

function pointerUp() {
  if (!ed.stroke) return;
  ed.stroke = null;
  // A stroke that changed nothing leaves no undo step.
  const top = ed.undo.at(-1);
  const { target } = editFrame(top.f);
  if (Object.keys(target).every((t) => same(target[t], top.target[t]))) ed.undo.pop();
  buildPalette();
  updateStatus();
}

function apply({ x, y }) {
  const { crop } = ed;
  if (x < crop.x || y < crop.y || x >= crop.x + crop.w || y >= crop.y + crop.h) return;
  const { target } = editFrame(ed.f);
  const themes = ed.link ? Object.keys(target) : [ed.stroke.theme];
  for (const theme of themes) {
    let colour = null;
    if (ed.stroke.tool === "pencil") {
      if (!ed.colour) return;
      colour = ed.colour[theme] ?? ed.colour.light;
    }
    setColour(target[theme], x, y, colour);
  }
}

// Takes the colour under the pointer. A palette colour brings its key, so the other theme paints
// with that key's colour there; any other colour pairs with what the other theme has at that pixel.
function pick(theme, { x, y }) {
  const { target } = editFrame(ed.f);
  const colour = colourAt(target[theme], x, y);
  if (!colour) {
    ed.tool = "eraser";
    syncTools();
    return;
  }
  const pals = palsOf(ed.job);
  const key = keysFor(pals, theme, colour).find((k) => !k.includes(":"));
  if (key) ed.colour = keyed(key, pals);
  else {
    ed.colour = { path: null };
    for (const t of Object.keys(target)) ed.colour[t] = colourAt(target[t], x, y) ?? colour;
  }
  if (!ed.colour.light) ed.colour.light = colour;
  ed.tool = "pencil";
  syncTools();
  buildPalette();
}

function usedColours() {
  const { target } = editFrame(ed.f);
  const out = [];
  const seen = new Set();
  for (const [theme, img] of Object.entries(target)) {
    for (let y = 0; y < img.height; y += 1) {
      for (let x = 0; x < img.width; x += 1) {
        const colour = colourAt(img, x, y);
        if (!colour) continue;
        const key = keysFor(palsOf(ed.job), theme, colour).find((k) => !k.includes(":"));
        const id = key ?? `${theme}:${colour}`;
        if (seen.has(id)) continue;
        seen.add(id);
        out.push(
          key
            ? keyed(key, palsOf(ed.job))
            : { path: null, light: colour, dark: colour, raw: theme },
        );
      }
    }
  }
  return out.sort((a, b) => (a.path ?? "~").localeCompare(b.path ?? "~"));
}

function swatch(c) {
  const on =
    ed.colour &&
    ed.colour.path === c.path &&
    ed.colour.light === c.light &&
    ed.colour.dark === c.dark;
  const title = c.path
    ? `${c.path}: ${c.light ?? "—"} light, ${c.dark ?? "—"} dark`
    : `${c.light} (not a palette colour)`;
  return el(
    "button",
    {
      class: `swatch${on ? " on" : ""}${c.path ? "" : " raw"}`,
      title,
      onclick: () => {
        ed.colour = { ...c };
        ed.tool = "pencil";
        syncTools();
        buildPalette();
      },
    },
    el("i", { style: `background:${c.light ?? "transparent"}` }),
    el("i", { style: `background:${c.dark ?? "transparent"}` }),
  );
}

function buildPalette() {
  const box = $("#palette");
  box.replaceChildren();
  const used = usedColours();
  box.append(el("h4", {}, "In this sprite"), el("div", { class: "swatches" }, used.map(swatch)));
  const pals = palsOf(ed.job);
  const light = paletteEntries(pals.light);
  const groups = new Map();
  for (const [path] of light) {
    const name = path.replace(/\[\d+\]$/, "");
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name).push(keyed(path, pals));
  }
  box.append(el("h4", {}, "Scene palette"));
  for (const [name, list] of groups) {
    box.append(
      el(
        "div",
        { class: "key-row" },
        el("span", {}, name),
        el("div", { class: "swatches" }, list.map(swatch)),
      ),
    );
  }
  const c = ed.colour;
  $("#current").replaceChildren(
    c ? swatch(c) : "",
    el("span", {}, c ? (c.path ? c.path : `${c.light} (raw)`) : "no colour"),
  );
}

function syncTools() {
  for (const button of document.querySelectorAll("[data-tool]")) {
    button.classList.toggle("on", button.dataset.tool === ed.tool);
  }
}

function redraw() {
  if (!ed.job) return;
  const { original, target } = editFrame(ed.f);
  const { crop, zoom } = ed;
  for (const theme of Object.keys(target)) {
    const canvas = ed.canvases[theme];
    const ctx = canvas.getContext("2d");
    const shown = ed.showOriginal ? original[theme] : target[theme];
    const bg = S.scene.palettes[theme].haze;
    drawZoomed(ctx, shown, crop, zoom, bg, 0, 0, true);
    const ink = theme === "dark" ? "rgba(255,255,255," : "rgba(0,0,0,";
    if (ed.grid && zoom >= 8) {
      ctx.fillStyle = `${ink}0.08)`;
      for (let x = 1; x < crop.w; x += 1) ctx.fillRect(x * zoom, 0, 1, crop.h * zoom);
      for (let y = 1; y < crop.h; y += 1) ctx.fillRect(0, y * zoom, crop.w * zoom, 1);
    }
    // The feet row and the column the sprite is posed at (x 40).
    ctx.fillStyle = `${ink}0.28)`;
    const gy = ed.job.feet - crop.y;
    if (gy >= 0 && gy <= crop.h) {
      for (let x = 0; x < crop.w * zoom; x += 6) ctx.fillRect(x, gy * zoom, 3, 1);
    }
    const ax = 40 - crop.x;
    if (ax >= 0 && ax < crop.w) {
      for (let y = 0; y < crop.h * zoom; y += 6) ctx.fillRect(ax * zoom, y, 1, 3);
    }
    if (ed.marks && !ed.showOriginal) {
      ctx.strokeStyle = MARK;
      ctx.lineWidth = Math.max(1, Math.floor(zoom / 8));
      for (const i of differences(original[theme], target[theme])) {
        const x = (i % shown.width) - crop.x;
        const y = Math.floor(i / shown.width) - crop.y;
        const inset = ctx.lineWidth / 2 + 1;
        ctx.strokeRect(x * zoom + inset, y * zoom + inset, zoom - inset * 2, zoom - inset * 2);
      }
    }
    if (ed.hover) {
      ctx.strokeStyle = theme === "dark" ? "#fff" : "#000";
      ctx.lineWidth = 1;
      const hx = (ed.hover.x - crop.x) * zoom + 0.5;
      const hy = (ed.hover.y - crop.y) * zoom + 0.5;
      ctx.strokeRect(hx, hy, zoom - 1, zoom - 1);
    }
    const [small, big] = ed.previews[theme];
    for (const [preview, scale] of [[small, 1], [big, 3]]) {
      preview.width = crop.w * scale;
      preview.height = crop.h * scale;
      drawZoomed(preview.getContext("2d"), shown, crop, scale, bg, 0, 0, true);
    }
  }
  updateStatus();
}

function updateStatus() {
  const { original, target } = editFrame(ed.f);
  let changed = 0;
  for (const t of Object.keys(target)) changed += differences(original[t], target[t]).length;
  let hover = "";
  if (ed.hover) {
    const { theme, x, y } = ed.hover;
    const now = colourAt(target[theme], x, y);
    const was = colourAt(original[theme], x, y);
    hover =
      `x ${x}, y ${y} · dx ${signed(x - 40)}, dy ${signed(y - ed.job.feet)} · ` +
      `${theme}: ${describeColour(palsOf(ed.job), theme, now)}` +
      (now !== was ? ` · was ${describeColour(palsOf(ed.job), theme, was)}` : "");
  }
  $("#status").textContent = `${changed} px changed in this frame${hover ? ` · ${hover}` : ""}`;
}

function patchFor(theme, f, original, target) {
  const job = ed.job;
  const key = renderKey(job.name, theme, f);
  const indexes = differences(original, target);
  const pixels = indexes.map((i) => {
    const x = i % original.width;
    const y = Math.floor(i / original.width);
    const before = colourAt(original, x, y);
    const after = colourAt(target, x, y);
    return {
      x,
      y,
      dx: x - 40,
      dy: y - job.feet,
      before,
      beforeKeys: keysFor(palsOf(job), theme, before),
      after,
      afterKeys: keysFor(palsOf(job), theme, after),
    };
  });
  const crop = grow(union(bounds(original), bounds(target)) ?? ed.crop, PAD, job.box);
  const bg = S.scene.palettes[theme].haze;
  const w = job.card.where;
  return {
    key,
    scene: S.sid,
    sprite: job.name,
    element: job.card.label,
    pose: job.title,
    theme,
    sameInBothThemes: job.same,
    frame: f,
    frameAt: job.proposal ? { time: f / job.fps } : FRAMES[f],
    ...(job.proposal
      ? {
          proposal: `.forest-studio/${S.sid}/proposals/${job.proposal}.js`,
          variant: job.title,
        }
      : {
          drawnBy: w ? `${w.fn ? `${w.fn} at ` : ""}${w.path}:${w.line}` : null,
          pose_in_sprites_js: `scripts/forest/sprites.js SPRITES.${S.sid}["${job.name}"]`,
        }),
    box: { w: job.box.w, h: job.box.h },
    anchor: { x: 40, feet: job.feet },
    note:
      "x and y are art pixels in the sprite's box. dx is x - 40, the x a sprite is posed at. " +
      "dy is y - feet, the row under the original's lowest pixel, where a walker's feet " +
      "stand, so dx and dy are the offsets a painter's part() takes. Keys name the palette " +
      "entries a colour matches; an empty after is an erased pixel.",
    linkedThemes: ed.link && !job.same,
    pixels,
    original: encode(original),
    target: encode(target),
    picture: sheet(
      [["original", original], ["edit", target], ["changed", target, true]],
      crop,
      bg,
      indexes,
    ),
    saved: new Date().toISOString(),
  };
}

async function save() {
  if (!ed.job) return;
  const job = ed.job;
  const edits = editsFor(job);
  const writes = [];
  for (const [f, { original, target }] of ed.frames) {
    for (const theme of Object.keys(target)) {
      const key = renderKey(ed.job.name, theme, f);
      if (!same(original[theme], target[theme])) {
        writes.push(["PUT", key, patchFor(theme, f, original[theme], target[theme])]);
      } else if (edits.has(key) && editState(edits.get(key)) !== "in code") {
        writes.push(["DELETE", key]);
      }
    }
  }
  if (!job.proposal && writes.some(([method]) => method === "PUT")) await saveBaseline();
  const route = job.proposal ? `proposal-edit/${S.sid}/${job.proposal}` : `edit/${S.sid}`;
  for (const [method, key, body] of writes) {
    await api(method, `/api/${route}/${key.replaceAll("|", ".")}`, body);
  }
  closeEditor(true);
  await loadSaved();
  await watchProposals(true);
  renderBoard();
  if (rv.proposal) openReview(rv.proposal.name);
  const puts = writes.filter(([method]) => method === "PUT").length;
  const folder = job.proposal ? `proposals/${job.proposal}.edits` : "edits";
  flash(puts ? `Saved ${puts} edit(s) to .forest-studio/${S.sid}/${folder}/` : "Nothing to save");
}

function flash(text) {
  const note = $("#flash");
  note.textContent = text;
  note.hidden = false;
  clearTimeout(note.timer);
  note.timer = setTimeout(() => (note.hidden = true), 3500);
}

function undo(from, to) {
  const snap = from.pop();
  if (!snap) return;
  const f = ed.f;
  ed.f = snap.f;
  to.push(snapshot());
  ed.f = f;
  restore(snap);
  buildPalette();
  redraw();
}

function editorKeys(e) {
  if (!ed.job) {
    if (e.key === "Escape" && rv.proposal) closeReview();
    return;
  }
  const mod = e.metaKey || e.ctrlKey;
  if (e.key === "Escape") closeEditor();
  else if (mod && e.key.toLowerCase() === "z") {
    e.preventDefault();
    if (e.shiftKey) undo(ed.redo, ed.undo);
    else undo(ed.undo, ed.redo);
  } else if (mod && e.key.toLowerCase() === "s") {
    e.preventDefault();
    save();
  } else if (mod) {
    return;
  } else if (e.key === "b" || e.key === "p") {
    ed.tool = "pencil";
    syncTools();
  } else if (e.key === "e") {
    ed.tool = "eraser";
    syncTools();
  } else if (e.key === "i") {
    ed.tool = "picker";
    syncTools();
  } else if (e.key === "g") {
    ed.grid = !ed.grid;
    redraw();
  } else if (e.key === "o" && !ed.showOriginal) {
    ed.showOriginal = true;
    redraw();
  }
}

// ---- Proposals ------------------------------------------------------------------------------
//
// An agent proposes art as a module in .forest-studio/<scene>/proposals/<name>.js (the forest-scene
// skill documents its shape). Each variant becomes a job like a sprite's, drawn at every frame of
// its length, so the review and the pixel editor treat it the same way. The review is saved
// beside the proposal as <name>.review.json, with the proposal's mtime it answered, so a revised
// proposal shows as waiting for review again.

const merged = (base, extra) => (extra ? { ...base, ...extra } : base);
const safeName = (name) => String(name).replace(/[^\w-]/g, "_");

async function loadProposals(list) {
  for (const job of [...S.jobs.values()]) if (job.proposal) S.jobs.delete(job.name);
  S.proposals = [];
  for (const info of list) {
    const proposal = { name: info.name, info, review: info.review, variants: [], now: null };
    S.proposals.push(proposal);
    try {
      const spec = (await import(`/proposals/${S.sid}/${info.name}.js?v=${info.mtime}`)).default;
      if (!spec?.variants?.length) throw new Error("no default export with variants");
      proposal.spec = spec;
      if (spec.replaces) {
        proposal.now = S.jobs.get(spec.replaces) ?? null;
        if (!proposal.now) proposal.warning = `replaces ${spec.replaces}, which is not a sprite`;
      }
      const box = { ...ANIMAL_BOX, ...spec.box };
      spec.variants.forEach((v, i) => {
        const seconds = v.seconds ?? spec.seconds ?? 0;
        const fps = v.fps ?? spec.fps ?? 8;
        const title = safeName(v.name ?? String.fromCharCode(65 + i));
        const pals = {};
        for (const t of THEMES) {
          pals[t] = merged(merged(S.scene.palettes[t], spec.palettes?.[t]), v.palettes?.[t]);
        }
        const job = {
          name: `${info.name}--${title}`,
          title,
          proposal: info.name,
          variant: v,
          box,
          pals,
          seconds,
          fps,
          count: seconds > 0 ? Math.max(1, Math.round(seconds * fps)) : 1,
          card: { label: spec.title ?? info.name, where: null },
          paint: (ctx, pal, f) =>
            v.draw({ ctx, pal, time: f / fps, groundY: box.ground, cols: box.w }, f / fps),
        };
        renderJob(job);
        proposal.variants.push(job);
        S.jobs.set(job.name, job);
      });
    } catch (error) {
      proposal.error = String(error?.message ?? error);
    }
  }
}

function proposalState(p) {
  const r = p.review;
  if (!r) return "to review";
  if (r.mtime < p.info.mtime) return "revised";
  return r.verdict === "approve" ? `approved ${r.choice}` : "changes asked";
}

const stateClass = (state) =>
  state.startsWith("approved") ? "in-code" : state === "changes asked" ? "differs" : "waiting";

function proposalCards() {
  return el(
    "div",
    { class: "cards" },
    S.proposals.map((p) => {
      const state = proposalState(p);
      const spec = p.spec ?? {};
      const thumbs = p.variants.map((job) => {
        if (job.error) return el("p", { class: "error" }, `${job.title}: ${job.error}`);
        const crop = grow(job.bbox ?? { x: 0, y: 0, w: 1, h: 1 }, PAD, job.box);
        const zoom = Math.max(1, Math.min(8, Math.floor(110 / Math.max(crop.w, crop.h))));
        const canvas = el("canvas", { class: "thumb", title: "Review" });
        canvas.width = crop.w * zoom;
        canvas.height = crop.h * zoom;
        const bg = S.scene.palettes.light.haze;
        drawZoomed(canvas.getContext("2d"), job.renders.get("light|0"), crop, zoom, bg);
        canvas.addEventListener("click", () => openReview(p.name));
        const motion = job.count > 1 ? ` · ${job.seconds} s` : "";
        const caption = el("figcaption", {}, el("strong", {}, job.title), motion);
        return el("figure", { class: "pose" }, canvas, caption);
      });
      return el(
        "section",
        { class: "card proposal" },
        el(
          "header",
          {},
          el("h3", {}, spec.title ?? p.name),
          el("span", { class: `badge ${stateClass(state)}` }, state),
        ),
        el(
          "p",
          { class: "facts" },
          `${p.name}.js · revision ${spec.revision ?? 1}` +
            (spec.replaces ? ` · replaces ${stripScene(spec.replaces)}` : ""),
        ),
        p.error ? el("p", { class: "error" }, p.error) : el("div", { class: "poses" }, thumbs),
        el(
          "div",
          { class: "row" },
          el("button", { class: "primary", onclick: () => openReview(p.name) }, "Review"),
          el("button", { onclick: () => clearProposals([p]) }, "Remove"),
        ),
      );
    }),
  );
}

// Removes proposals with their reviews and pixel edits, once the user agrees. The code stays as it
// is, so an approved proposal that is not built yet is lost.
async function clearProposals(list) {
  const one = list[0];
  const what = list.length === 1 ? `"${one.spec?.title ?? one.name}"` : `${list.length} proposals`;
  const question =
    `Remove ${what}, with reviews and pixel edits? The scene's code stays as it is, ` +
    "so anything approved but not built yet is lost.";
  if (!confirm(question)) return;
  for (const p of list) await api("DELETE", `/api/proposal/${S.sid}/${p.name}`);
  await loadSaved();
  renderBoard();
  watched = "";
  await watchProposals(true);
}

// ---- Review ---------------------------------------------------------------------------------

const rv = { proposal: null, playing: true, t: 0, speed: 1, last: 0, raf: 0, scene: 0, cells: [] };

// The frame a job shows at review time t: a proposal loops its length; a sprite of today's scene
// steps through its frames four times a second.
function frameAtTime(job, t) {
  if (job.proposal) return job.count > 1 ? Math.floor((t % job.seconds) * job.fps) % job.count : 0;
  return job.frames[Math.floor(t * 4) % job.frames.length];
}

function reviewColumn(job, label, zoom, crop, choosable) {
  const p = rv.proposal;
  const v = job.variant;
  const canvases = (job.themes ?? []).map((theme) => {
    const canvas = el("canvas", { class: "thumb", title: theme });
    canvas.width = crop.w * zoom;
    canvas.height = crop.h * zoom;
    rv.cells.push({ canvas, job, theme, crop, zoom });
    return canvas;
  });
  const edits = [...S.proposalEdits.keys()].filter((k) => k.startsWith(`${job.name}|`));
  const [w, h] = job.size ?? [0, 0];
  const length = job.proposal
    ? job.count > 1
      ? `${job.count} frames, ${job.seconds} s`
      : "still"
    : `${job.frames.length} frame${job.frames.length > 1 ? "s" : ""}`;
  return el(
    "div",
    { class: "review-col" },
    el(
      "header",
      {},
      choosable
        ? el(
            "label",
            {},
            el("input", {
              type: "radio",
              name: "choice",
              value: job.title,
              checked: p.review?.choice === job.title,
            }),
            el("strong", {}, ` ${label}`),
          )
        : el("strong", {}, label),
    ),
    v?.notes ? el("p", { class: "muted" }, v.notes) : null,
    job.error ? el("p", { class: "error" }, job.error) : el("div", { class: "thumbs" }, canvases),
    el("p", { class: "facts" }, `${w}×${h} · ${tierOf(w, h)} · ${length}`),
    job.proposal && !job.error
      ? el(
          "div",
          { class: "row" },
          el(
            "button",
            { onclick: () => openEditor(job, "light", frameAtTime(job, rv.t)) },
            "Edit pixels",
          ),
          edits.length ? el("span", { class: "muted" }, `${edits.length} edit(s) saved`) : null,
        )
      : null,
  );
}

function openReview(name) {
  const p = S.proposals.find((x) => x.name === name);
  if (!p) return;
  rv.proposal = p;
  rv.cells = [];
  const spec = p.spec ?? {};
  $("#review-title").textContent = spec.title ?? p.name;
  $("#review-meta").textContent =
    `${p.name}.js · revision ${spec.revision ?? 1}` + (spec.author ? ` · ${spec.author}` : "");
  const state = proposalState(p);
  $("#review-state").className = `badge ${stateClass(state)}`;
  $("#review-state").textContent = state;
  $("#review-notes").replaceChildren(
    ...(spec.notes ? [el("p", {}, spec.notes)] : []),
    ...[p.warning, p.error].filter(Boolean).map((t) => el("p", { class: "error" }, t)),
  );
  const ok = p.variants.filter((j) => !j.error);
  const jobs = [...(p.now ? [p.now] : []), ...ok];
  // One crop and zoom for every column when the boxes match, so sizes compare.
  let crop = null;
  const box = jobs.at(-1)?.box;
  for (const job of jobs) {
    if (job.box.w === box.w && job.box.h === box.h) crop = union(crop, job.bbox);
  }
  crop = grow(crop ?? { x: 0, y: 0, w: 1, h: 1 }, PAD, (ok[0] ?? jobs[0])?.box ?? ANIMAL_BOX);
  const room = Math.max(160, (window.innerWidth - 80) / Math.max(1, jobs.length) / 2 - 24);
  const zoom = Math.max(2, Math.min(12, Math.floor(Math.min(room / crop.w, 260 / crop.h))));
  $("#review-columns").replaceChildren(
    ...(p.now ? [reviewColumn(p.now, `Now · ${stripScene(p.now.name)}`, zoom, crop, false)] : []),
    ...p.variants.map((job) => reviewColumn(job, `Variant ${job.title}`, zoom, crop, true)),
  );
  rv.scene = Math.min(rv.scene, Math.max(0, ok.length - 1));
  $("#review-scene-pick").replaceChildren(
    ...ok.map((job, i) =>
      el(
        "button",
        {
          class: i === rv.scene ? "on" : "",
          onclick: () => {
            rv.scene = i;
            openReview(p.name);
          },
        },
        `Variant ${job.title}${job.variant.scene ? "" : " (centred)"}`,
      ),
    ),
  );
  const none = !!p.review && !p.review.choice;
  const choice = el("input", { type: "radio", name: "choice", value: "", checked: none });
  $("#review-none").replaceChildren(el("label", {}, choice, " None of these"));
  $("#review-input").value = p.review?.notes ?? "";
  const approved = p.review?.verdict === "approve";
  const verdict = approved ? `approved ${p.review.choice}` : "asked for changes";
  $("#review-saved").textContent = p.review
    ? `You ${verdict} on ${p.review.reviewed.slice(0, 16).replace("T", " ")}` +
      (p.review.mtime < p.info.mtime ? "; the agent has revised it since." : ".")
    : "Not reviewed yet.";
  $("#review").hidden = false;
  document.body.classList.add("editing");
  cancelAnimationFrame(rv.raf);
  rv.last = performance.now();
  rv.raf = requestAnimationFrame(reviewTick);
}

function closeReview() {
  cancelAnimationFrame(rv.raf);
  rv.proposal = null;
  $("#review").hidden = true;
  document.body.classList.remove("editing");
}

function reviewTick(now) {
  rv.raf = requestAnimationFrame(reviewTick);
  const dt = Math.min(0.1, (now - rv.last) / 1000);
  rv.last = now;
  if (rv.playing) rv.t += dt * rv.speed;
  for (const cell of rv.cells) {
    const f = frameAtTime(cell.job, rv.t);
    const img = cell.job.renders.get(`${cell.theme}|${f}`);
    if (img && img !== cell.shown) {
      const bg = S.scene.palettes[cell.theme].haze;
      drawZoomed(cell.canvas.getContext("2d"), img, cell.crop, cell.zoom, bg);
      cell.shown = img;
    }
  }
  const lead = rv.proposal.variants.find((j) => j.count > 1);
  $("#review-time").textContent = lead
    ? `${(rv.t % lead.seconds).toFixed(2)} s · frame ${frameAtTime(lead, rv.t) + 1}/${lead.count}`
    : "still";
  paintReviewScene();
}

// The chosen variant over the live scene: its scene() in the scene's own coordinates, or its
// sprite centred with its box's ground on the soil line.
function paintReviewScene() {
  const f = live.forest;
  const job = rv.proposal.variants.filter((j) => !j.error)[rv.scene];
  const canvas = $("#review-stage");
  if (!f || !job) return;
  if (canvas.width !== f.cols || canvas.height !== f.rows) {
    canvas.width = f.cols;
    canvas.height = f.rows;
    const zoom = Math.max(1, Math.min(5, Math.floor((window.innerWidth - 80) / f.cols)));
    canvas.style.width = `${f.cols * zoom}px`;
    canvas.style.height = `${f.rows * zoom}px`;
  }
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, f.cols, f.rows);
  ctx.drawImage(f.ground, 0, 0);
  ctx.drawImage(f.water, 0, 0);
  const v = job.variant;
  const seconds = v.sceneSeconds ?? job.seconds;
  const t = seconds > 0 ? Math.floor((rv.t % seconds) * job.fps) / job.fps : 0;
  const spec = rv.proposal.spec;
  const pal = merged(merged(f.pal.near, spec.palettes?.[f.theme]), v.palettes?.[f.theme]);
  try {
    if (v.scene) {
      v.scene({ ctx, pal, time: t, groundY: f.groundY, cols: f.cols }, t, f);
    } else {
      ctx.save();
      ctx.translate(Math.round(f.cols / 2) - 40, f.groundY - job.box.ground);
      v.draw({ ctx, pal, time: t, groundY: job.box.ground, cols: job.box.w }, t);
      ctx.restore();
    }
    $("#review-scene-error").textContent = "";
  } catch (error) {
    $("#review-scene-error").textContent = `scene(): ${error?.message ?? error}`;
  }
}

function step(by) {
  rv.playing = false;
  $("#review-play").textContent = "Play";
  const lead = rv.proposal.variants.find((j) => j.count > 1);
  rv.t = Math.max(0, rv.t + by / (lead?.fps ?? 8));
}

async function saveReview(verdict) {
  const p = rv.proposal;
  const choice = document.querySelector('#review input[name="choice"]:checked')?.value ?? "";
  if (verdict === "approve" && !choice) {
    alert("Choose the variant to approve.");
    return;
  }
  await api("PUT", `/api/review/${S.sid}/${p.name}`, {
    verdict,
    choice,
    notes: $("#review-input").value.trim(),
    revision: p.spec?.revision ?? 1,
    mtime: p.info.mtime,
    reviewed: new Date().toISOString(),
  });
  await loadSaved();
  await watchProposals(true);
  renderBoard();
  openReview(p.name);
  flash(`Review saved to .forest-studio/${S.sid}/proposals/${p.name}.review.json`);
}

// Notices proposals and reviews written by anyone, for every scene, and reloads this scene's.
let watched = "";

async function watchProposals(quiet = false) {
  let all;
  try {
    all = await api("GET", "/api/proposals");
  } catch {
    return;
  }
  for (const option of $("#scene").options) {
    const waiting = (all[option.value] ?? []).filter((p) => !p.review || p.review.mtime < p.mtime);
    const title = meta.scenes.find((s) => s.id === option.value).title;
    option.textContent = waiting.length ? `${title} · ${waiting.length} to review` : title;
  }
  const signature = JSON.stringify(all[S.sid] ?? []);
  if (signature === watched) return;
  const first = !watched;
  if (ed.job) return; // reload once the editor closes
  watched = signature;
  if (first || quiet) return;
  await loadSaved();
  renderBoard();
  if (rv.proposal) openReview(rv.proposal.name);
  flash("Proposals updated");
}

// ---- Events ---------------------------------------------------------------------------------

// The running scene's timers: an object in its extra with a numeric `next` (a fly-by, a stoop, an
// eruption) fires when the time reaches it; one with `turn` and `until` (the desert's showers)
// moves to its next turn at `until`. Setting either to now fires it once its conditions hold
// (the stage, night, the animal on the page).
function timers() {
  const out = [];
  const visit = (label, obj) => {
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) return;
    if ("turn" in obj && typeof obj.until === "number") out.push({ label, obj, field: "until" });
    else if (typeof obj.next === "number") out.push({ label, obj, field: "next" });
  };
  for (const [key, value] of Object.entries(live.forest?.extra ?? {})) {
    if (!Array.isArray(value)) visit(key, value);
    else value.forEach((item, i) => visit(value.length > 1 ? `${key} ${i + 1}` : key, item));
  }
  return out;
}

function renderEvents() {
  const f = live.forest;
  const box = $("#events");
  if (!f) return;
  const list = timers();
  const signature = list.map((t) => t.label).join();
  if (box.dataset.signature !== signature) {
    box.dataset.signature = signature;
    box.replaceChildren(
      el("strong", {}, "Trigger"),
      ...list.map((t) =>
        el(
          "button",
          {
            "data-label": t.label,
            title: "Fire now (it waits for its stage, night, or its animal)",
            onclick: () => {
              const item = timers().find((x) => x.label === t.label);
              if (item) item.obj[item.field] = live.forest.time;
            },
          },
          t.label,
        ),
      ),
    );
  }
  for (const t of list) {
    const wait = t.obj[t.field] - f.time;
    const when = !Number.isFinite(wait) ? "waits" : wait <= 0 ? "due" : `${Math.ceil(wait)} s`;
    const button = box.querySelector(`[data-label="${t.label}"]`);
    if (button) button.textContent = `${t.label} · ${when}`;
  }
}

// ---- Render mode ----------------------------------------------------------------------------

// A sheet of a proposal for the agent who wrote it: each variant's frames in light and dark,
// after today's sprite it replaces.
function proposalSheet(p) {
  const rows = [];
  for (const job of [...(p.now ? [p.now] : []), ...p.variants.filter((j) => !j.error)]) {
    const crop = grow(job.bbox ?? { x: 0, y: 0, w: 1, h: 1 }, PAD, job.box);
    const zoom = Math.max(2, Math.min(10, Math.floor(140 / Math.max(crop.w, crop.h))));
    for (const theme of job.themes) {
      const label = `${job.proposal ? `Variant ${job.title}` : "Now"} · ${theme}`;
      rows.push({ job, theme, crop, zoom, label, frames: job.frames.slice(0, 24) });
    }
  }
  const gap = 8;
  const labelW = 150;
  const widths = rows.map((r) => labelW + r.frames.length * (r.crop.w * r.zoom + gap));
  const width = Math.max(...widths, 200);
  const height = rows.reduce((sum, r) => sum + r.crop.h * r.zoom + gap * 2, gap);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#9aa0a6";
  ctx.fillRect(0, 0, width, height);
  let y = gap;
  for (const r of rows) {
    ctx.fillStyle = "#111";
    ctx.font = "600 13px system-ui, sans-serif";
    ctx.fillText(r.label, gap, y + 14);
    r.frames.forEach((f, i) => {
      const x = labelW + i * (r.crop.w * r.zoom + gap);
      const img = r.job.renders.get(`${r.theme}|${f}`);
      drawZoomed(ctx, img, r.crop, r.zoom, S.scene.palettes[r.theme].haze, x, y);
    });
    y += r.crop.h * r.zoom + gap * 2;
  }
  return canvas.toDataURL("image/png");
}

async function runRender(target) {
  const [sid, name] = target.split("/");
  await loadScene(sid);
  const p = S.proposals.find((x) => x.name === name);
  if (!p) throw new Error(`no proposal ${name} in ${sid}`);
  if (p.error) {
    window.__result = { errors: [p.error] };
    return;
  }
  window.__result = {
    errors: [
      ...(p.warning ? [p.warning] : []),
      ...p.variants.filter((j) => j.error).map((j) => `${j.title}: ${j.error}`),
    ],
    variants: p.variants
      .filter((j) => !j.error)
      .map((j) => ({
        name: j.title,
        frames: j.count,
        seconds: j.seconds,
        size: j.size,
        tier: tierOf(...j.size),
        sameInBothThemes: j.same,
      })),
    sheet: proposalSheet(p),
  };
}

// ---- Page -----------------------------------------------------------------------------------

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  store("studio.theme", theme);
  $("#theme").textContent = theme === "dark" ? "Light" : "Dark";
}

async function showScene(sid) {
  $("#board").replaceChildren(el("p", { class: "muted" }, "Drawing…"));
  try {
    await loadScene(sid);
  } catch (error) {
    $("#board").replaceChildren(el("p", { class: "error" }, `Could not load ${sid}: ${error}`));
    console.error(error);
    return;
  }
  location.hash = sid;
  store("studio.scene", sid);
  $("#scene").value = sid;
  $("#scene-where").replaceChildren(where({ path: S.info.path, line: 1 }));
  renderBoard();
  startPreview();
  watched = "";
  await watchProposals(true);
}

function wire() {
  const select = $("#scene");
  for (const s of meta.scenes) select.append(el("option", { value: s.id }, s.title));
  select.addEventListener("change", () => {
    $("#family").value = "";
    ui.family = null;
    ui.familyView = null;
    showScene(select.value);
  });
  const family = $("#family");
  family.append(el("option", { value: "" }, "All families"));
  for (const group of new Set(FAMILIES.map((f) => f.group))) {
    const members = FAMILIES.filter((f) => f.group === group);
    family.append(
      el("optgroup", { label: group }, members.map((f) => el("option", { value: f.id }, f.title))),
    );
  }
  family.append(el("option", { value: "none" }, "No family yet"));
  family.addEventListener("change", () => showFamily(family.value));
  $("#theme").addEventListener("click", () =>
    applyTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark"),
  );
  $("#reload").addEventListener("click", () => location.reload());
  const size = $("#zoom");
  size.value = ui.size;
  size.addEventListener("input", () => {
    ui.size = Number(size.value);
    store("studio.size", ui.size);
    renderBoard();
  });
  const oneScale = $("#one-scale");
  oneScale.checked = ui.oneScale;
  oneScale.addEventListener("change", () => {
    ui.oneScale = oneScale.checked;
    store("studio.oneScale", ui.oneScale ? "1" : "0");
    renderBoard();
  });
  $("#animate").addEventListener("change", (e) => {
    ui.animate = e.target.checked;
    for (const t of ui.thumbs) paintThumb(t);
  });
  $("#filter").addEventListener("input", renderBoard);
  setInterval(() => {
    if (!ui.animate) return;
    ui.tick += 1;
    for (const t of ui.thumbs) paintThumb(t);
  }, 300);

  const range = $("#stage-range");
  range.addEventListener("input", () => setStage(Number(range.value)));
  $("#water-btn").addEventListener("click", () => {
    const f = live.forest;
    waterAt(Math.floor(f.cols / 2), f.groundY - 20);
  });
  $("#water").addEventListener("click", (e) => {
    const f = live.forest;
    const box = f.water.getBoundingClientRect();
    const col = ((e.clientX - box.left) / box.width) * f.cols;
    waterAt(col, ((e.clientY - box.top) / box.height) * f.rows);
  });
  $("#replant").addEventListener("click", () => live.forest.setScene(S.scene, live.forest.stage));
  $("#pause").addEventListener("click", () => pause(!live.paused));
  const frameSize = $("#size");
  frameSize.addEventListener("change", () => {
    previewSize = SIZES[frameSize.value];
    live.forest.resize();
  });
  window.addEventListener("resize", fitPreview);
  setInterval(() => {
    const names = onPage();
    $("#on-page").textContent = names.length ? names.join(", ") : "none yet";
    renderEvents();
  }, 500);
  setInterval(() => watchProposals(), 2500);

  $("#review-close").addEventListener("click", closeReview);
  $("#review-play").addEventListener("click", (e) => {
    rv.playing = !rv.playing;
    e.target.textContent = rv.playing ? "Pause" : "Play";
  });
  $("#review-back").addEventListener("click", () => step(-1));
  $("#review-forward").addEventListener("click", () => step(1));
  $("#review-restart").addEventListener("click", () => (rv.t = 0));
  $("#review-speed").addEventListener("change", (e) => (rv.speed = Number(e.target.value)));
  $("#review-theme").addEventListener("click", () =>
    applyTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark"),
  );
  $("#review-approve").addEventListener("click", () => saveReview("approve"));
  $("#review-changes").addEventListener("click", () => saveReview("changes"));

  $("#changes").addEventListener("click", openChanges);
  $("#drawer-close").addEventListener("click", closeChanges);

  for (const button of document.querySelectorAll("[data-tool]")) {
    button.addEventListener("click", () => {
      ed.tool = button.dataset.tool;
      syncTools();
    });
  }
  $("#link").addEventListener("change", (e) => (ed.link = e.target.checked));
  $("#grid").addEventListener("change", (e) => {
    ed.grid = e.target.checked;
    redraw();
  });
  $("#marks").addEventListener("change", (e) => {
    ed.marks = e.target.checked;
    redraw();
  });
  const original = $("#original");
  const hold = (on) => () => {
    ed.showOriginal = on;
    redraw();
  };
  original.addEventListener("pointerdown", hold(true));
  original.addEventListener("pointerup", hold(false));
  original.addEventListener("pointerleave", hold(false));
  $("#undo").addEventListener("click", () => undo(ed.undo, ed.redo));
  $("#redo").addEventListener("click", () => undo(ed.redo, ed.undo));
  $("#reset").addEventListener("click", () => {
    ed.undo.push(snapshot());
    const state = editFrame(ed.f);
    state.target = copies(state.original);
    buildPalette();
    redraw();
  });
  $("#save").addEventListener("click", save);
  $("#close").addEventListener("click", () => closeEditor());
  document.addEventListener("keydown", editorKeys);
  document.addEventListener("keyup", (e) => {
    if (e.key === "o" && ed.showOriginal) {
      ed.showOriginal = false;
      redraw();
    }
  });
}

async function main() {
  meta = await api("GET", "/api/meta");
  const params = new URLSearchParams(location.search);
  if (params.has("check")) {
    await runCheck(params.get("check").split(","));
    return;
  }
  if (params.has("render")) {
    await runRender(params.get("render"));
    return;
  }
  const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  applyTheme(store("studio.theme") ?? (dark ? "dark" : "light"));
  wire();
  const wanted = location.hash.slice(1) || store("studio.scene");
  await showScene(meta.scenes.some((s) => s.id === wanted) ? wanted : meta.scenes[0].id);
}

main().catch((error) => {
  console.error(error);
  const params = new URLSearchParams(location.search);
  if (params.has("check") || params.has("render")) {
    window.__result = { error: String(error?.stack ?? error) };
  } else {
    document.body.prepend(el("p", { class: "error" }, `The studio failed: ${error}`));
  }
});
