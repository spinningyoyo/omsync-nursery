// A scene as the studio sees it, read from the code: every pose drawn in day and night at each
// frame (a "job"), grouped into the scene's elements; the user's saved pixel edits and how each
// stands against the code; sprites that moved without an edit; the agents' proposals and their
// reviews; and what the code draws differently from the last commit.
//
// The rendering, frames, edit states and proposal loading must keep producing what saved edits,
// baselines and `nursery check` expect, so changing them changes those files' meaning.

import { FAMILIES, hasFamily, roleIn } from "/families.js";
import { SCENES as ENGINE_SCENES } from "/js/nursery.js";
import * as poses from "/sprites.js";
import { api } from "./api.js";
import { bounds, decode, encode, same, union } from "./pixels.js";

export { FAMILIES, hasFamily, roleIn };

export const THEMES = ["light", "dark"];
// The frames each sprite is drawn at: walkers swap legs on whole phases, and painters flap and
// sway with time. A frame that draws the same as an earlier one is dropped.
export const FRAMES = [0, 1, 2, 3].map((i) => ({ phase: i, time: i / 4 }));
// The nursery-scene skill's size tiers: [name, min width, max width, min height, max height].
const TIERS = [
  ["XS", 1, 5, 1, 3],
  ["S", 7, 11, 5, 10],
  ["M", 12, 17, 7, 12],
  ["L", 17, 23, 12, 17],
  ["XL", 23, 28, 18, 23],
  ["XXL", 28, 31, 24, 38],
];
export const MASCOT_WIDTH = 32;
// Open scenes keep at most 5 ground animals at once, dense ones 8 (the skill's feel and density).
const OPEN_SCENES = new Set(["desert", "hawaii", "serengeti"]);

export const GROUPS = [
  { id: "landmarks", title: "Landmarks", icon: "mountain" },
  { id: "plants", title: "Plants", icon: "trees" },
  { id: "animals", title: "Animals", icon: "rabbit" },
  { id: "birds", title: "Birds", icon: "bird" },
  { id: "effects", title: "Effects", icon: "wind" },
  { id: "icon", title: "Scene icon", icon: "shapes" },
  { id: "unlisted", title: "Not in the element list", icon: "triangle-alert" },
];
const KIND_GROUP = { animal: "animals", bird: "birds", effect: "effects" };

export function tierOf(w, h) {
  const byW = TIERS.filter(([, a, b]) => w >= a && w <= b).map(([n]) => n);
  const byH = TIERS.filter(([, , , a, b]) => h >= a && h <= b).map(([n]) => n);
  const wT = byW.join("/") || (w > 31 ? "wider than XXL" : "between tiers");
  const hT = byH.join("/") || "between tiers";
  return wT === hT ? wT : `w ${wT}, h ${hT}`;
}

// The scenes in picker order, each with its picker label from scenes.json.
const LABELS = await fetch("/scenes.json").then((r) => r.json());
export const SCENES = LABELS.map(({ id, label }) => ({ ...ENGINE_SCENES.find((s) => s.id === id), label }));
export const sceneById = (sid) => SCENES.find((s) => s.id === sid);
export const strip = (sid, name) => name.replace(`${sid}-`, "");

let metaPromise;
export function meta() {
  metaPromise ??= api("GET", "/api/meta");
  return metaPromise;
}

// ---- Rendering --------------------------------------------------------------------------------

// Draws one job in a theme at a frame, with a pose toolkit (today's /sprites.js, or the last
// commit's through /head/sprites.js) and a scene module copy.
function drawRender(job, kit, M, theme, f) {
  const canvas = document.createElement("canvas");
  canvas.width = job.box.w;
  canvas.height = job.box.h;
  const ctx = canvas.getContext("2d");
  const pal = job.pals[theme];
  if (job.paint) {
    job.paint(ctx, pal, f);
    return ctx.getImageData(0, 0, job.box.w, job.box.h);
  }
  Object.assign(kit.frame, FRAMES[f]);
  try {
    if (job.plant) kit.paintPlant(ctx, M, job.plant, pal);
    else kit.paintSprite(ctx, kit.SPRITES[job.sid][job.name], M, pal);
  } finally {
    Object.assign(kit.frame, FRAMES[0]);
  }
  return ctx.getImageData(0, 0, job.box.w, job.box.h);
}

// Draws a job in both themes at each frame, keeping the frames that differ. A proposal keeps every
// frame, so frame numbers stay times.
export function renderJob(job, kit = poses, M = job.M) {
  job.renders = new Map();
  job.frames = [];
  job.error = null;
  try {
    for (let f = 0; f < (job.count ?? FRAMES.length); f += 1) {
      const imgs = THEMES.map((t) => drawRender(job, kit, M, t, f));
      const seen = job.frames.some((k) => THEMES.every((t, i) => same(job.renders.get(`${t}|${k}`), imgs[i])));
      if (seen && !job.proposal) continue;
      job.frames.push(f);
      THEMES.forEach((t, i) => {
        job.renders.set(`${t}|${f}`, imgs[i]);
      });
    }
  } catch (error) {
    job.error = String(error?.message ?? error);
    return job;
  }
  job.same = job.frames.every((f) => same(job.renders.get(`light|${f}`), job.renders.get(`dark|${f}`)));
  job.themes = job.same ? ["light"] : THEMES;
  job.bbox = null;
  for (const img of job.renders.values()) job.bbox = union(job.bbox, bounds(img));
  const main = bounds(job.renders.get("light|0"));
  job.size = main ? [main.w, main.h] : [0, 0];
  // The row under the lowest pixel: where a walker's feet stand, so a pixel's dy from it is the
  // dy a painter's part() takes.
  job.feet = main ? main.y + main.h : job.box.h;
  return job;
}

export const renderKey = (name, theme, f) => `${name}|${theme}|${f}`;

// The scene's icon as a sprite: its character grid, one pixel per cell.
function iconJob(scene) {
  const { grid, colours } = scene.icon;
  return {
    name: `${scene.id}-icon`,
    title: "icon",
    sid: scene.id,
    box: { w: grid[0].length, h: grid.length },
    pals: scene.palettes,
    icon: true,
    paint: (ctx) => {
      grid.forEach((line, y) => {
        [...line].forEach((ch, x) => {
          if (!colours[ch]) return;
          ctx.fillStyle = colours[ch];
          ctx.fillRect(x, y, 1, 1);
        });
      });
    },
  };
}

// ---- The model --------------------------------------------------------------------------------

const models = new Map();

// One of the three places that single out the mascot's pseudo-scene (the others: server.py's
// scene_dir and check, and the "brand" flag of its job in edits.js and editor-view.js). Its id
// comes from brand.py; brand-model.js is imported here, not at the top, because it extends
// SceneModel.
async function buildModel(sid) {
  const { BrandModel, brandId } = await import("./brand-model.js");
  return new (sid === (await brandId()) ? BrandModel : SceneModel)(sid).build();
}

export class SceneModel {
  // The scene's model, built once and kept; refresh() reloads its saved work.
  static async load(sid) {
    if (!models.has(sid)) models.set(sid, buildModel(sid));
    return models.get(sid);
  }

  // Forgets every built model: the code changed.
  static forget() {
    models.clear();
  }

  constructor(sid) {
    this.sid = sid;
    this.scene = sceneById(sid);
    this.errors = [];
  }

  async build() {
    const info = (await meta()).scenes.find((s) => s.id === this.sid);
    this.info = info;
    this.M = await import(`/copies/${this.sid}.js`);
    this.groups = this.buildGroups(info);
    this.jobs = new Map();
    for (const group of this.groups) {
      for (const item of group.items) {
        for (const job of item.jobs) {
          Object.assign(job, { item, M: this.M, sid: this.sid, pals: job.pals ?? this.scene.palettes });
          renderJob(job);
          if (job.error) this.errors.push(`${job.name}: ${job.error}`);
          this.jobs.set(job.name, job);
        }
      }
    }
    for (const item of this.items()) {
      const first = item.jobs.find((j) => !j.error);
      if (first && item.group !== "plants" && item.group !== "landmarks") {
        const [w, h] = first.size;
        item.facts.push(`${w}×${h} px, ${tierOf(w, h)}`);
      }
    }
    await this.refresh();
    return this;
  }

  items() {
    return this.groups.flatMap((g) => g.items);
  }

  // The scene's elements by group. A plant kind seen only in the far row, or at most twice on
  // the widest page, is a landmark. Poses with no element in the catalogue are listed apart.
  buildGroups(info) {
    const scene = this.scene;
    const sid = this.sid;
    const inv = poses.inventory(scene);
    const groups = Object.fromEntries(GROUPS.map((g) => [g.id, []]));
    const byKind = new Map();
    for (const [key, { plant }] of Object.entries(poses.plantExamples(scene))) {
      const [kind, species] = key.split("/");
      if (!byKind.has(kind)) {
        const stat = inv[kind];
        const farOnly = stat.layers.length === 1 && stat.layers[0] === "far";
        const group = farOnly || (stat.counts[240] ?? 0) <= 2 ? "landmarks" : "plants";
        const painter = info.painters[kind];
        const counts = [240, 160, 90].map((c) => stat.counts[c] ?? 0).join(" / ");
        const [a, b] = stat.first;
        const item = {
          id: `plant:${kind}`,
          label: kind,
          group,
          where: painter?.where ? { ...painter.where, fn: painter.fn } : null,
          facts: [
            `${stat.layers.join(", ")} row`,
            `${counts} on 240 / 160 / 90 px pages`,
            `first seen at stage ${a === b ? a : `${a} to ${b}`}`,
          ],
          family: null,
          jobs: [],
        };
        byKind.set(kind, item);
        groups[group].push(item);
      }
      byKind.get(kind).jobs.push({
        name: `${sid}-${key.replace("/", "-")}`,
        title: species ?? kind,
        plant,
        box: poses.PLANT_BOX,
      });
    }
    const used = new Set();
    for (const element of info.elements) {
      const jobs = element.sprites
        .filter((name) => poses.SPRITES[sid][name])
        .map((name) => {
          used.add(name);
          return { name, title: strip(sid, name), box: poses.ANIMAL_BOX };
        });
      const group = KIND_GROUP[element.kind] ?? "effects";
      groups[group].push({
        id: `el:${element.label}`,
        label: element.label,
        group,
        where: element.where ? { ...element.where, fn: element.fn } : null,
        facts: [element.layer],
        family: jobs[0] ? familyOf(sid, jobs[0].name) : null,
        jobs,
      });
    }
    groups.icon.push({
      id: "icon",
      label: "Scene icon",
      group: "icon",
      where: { path: info.path, line: null },
      facts: ["the picker's pixel icon"],
      family: null,
      jobs: [iconJob(scene)],
    });
    const rest = Object.keys(poses.SPRITES[sid]).filter((name) => !used.has(name));
    if (rest.length) {
      groups.unlisted.push({
        id: "unlisted",
        label: "Poses with no element",
        group: "unlisted",
        where: null,
        facts: ["in sprites.js but not in the catalogue's element list"],
        family: null,
        jobs: rest.map((name) => ({ name, title: strip(sid, name), box: poses.ANIMAL_BOX })),
      });
    }
    return GROUPS.map((g) => ({ ...g, items: groups[g.id] })).filter((g) => g.items.length);
  }

  // ---- Saved work ---------------------------------------------------------------------------

  async refresh() {
    const saved = await api("GET", `/api/scene/${this.sid}`);
    const decoded = (edits) =>
      new Map(edits.map((e) => [e.key, { ...e, originalImg: decode(e.original), targetImg: decode(e.target) }]));
    this.edits = decoded(saved.edits);
    this.proposalEdits = decoded(saved.proposals.flatMap((p) => p.edits));
    this.baseline = saved.baseline
      ? new Map(Object.entries(saved.baseline.renders).map(([k, v]) => [k, decode(v)]))
      : null;
    await this.loadProposals(saved.proposals);
    return this;
  }

  currentRender(key) {
    const [name, theme, f] = key.split("|");
    return this.jobs.get(name)?.renders?.get(`${theme}|${f}`) ?? null;
  }

  // waiting, in code, differs, or missing (the code no longer draws that sprite or frame).
  editState(edit) {
    const now = this.currentRender(edit.key);
    if (!now) return "missing";
    if (same(now, edit.targetImg)) return "in code";
    if (same(now, edit.originalImg)) return "waiting";
    return "differs";
  }

  // Renders that changed since the first edit was saved, without an edit of their own.
  ripples() {
    if (!this.baseline) return [];
    const out = [];
    for (const [key, before] of this.baseline) {
      if (this.edits.has(key)) continue;
      const now = this.currentRender(key);
      if (now && !same(now, before)) out.push({ key, before, now });
    }
    return out;
  }

  async saveBaseline() {
    if (this.baseline) return;
    const renders = {};
    for (const job of this.jobs.values()) {
      if (!job.renders || job.proposal) continue;
      for (const [tf, img] of job.renders) renders[`${job.name}|${tf}`] = encode(img);
    }
    await api("PUT", `/api/baseline/${this.sid}`, { saved: new Date().toISOString(), renders });
  }

  // What the code draws differently from the last commit: [{job, theme, f, before, now}]. Art
  // changed straight in code, without a proposal, shows up here. Empty when the scene is new.
  async headChanges() {
    if (this.head) return this.head;
    let kit;
    let M;
    try {
      [kit, M] = await Promise.all([import("/head/sprites.js"), import(`/head/copies/${this.sid}.js`)]);
    } catch {
      this.head = [];
      return this.head;
    }
    const out = [];
    for (const job of this.jobs.values()) {
      if (job.proposal || job.icon || job.error) continue;
      const old = renderJob({ ...job, renders: null }, kit, M);
      if (old.error) continue;
      for (const f of job.frames) {
        for (const theme of job.themes) {
          const before = old.renders.get(`${theme}|${f}`);
          const now = job.renders.get(`${theme}|${f}`);
          if (before && now && !same(before, now)) out.push({ job, theme, f, before, now });
        }
      }
    }
    this.head = out;
    return out;
  }

  // ---- Proposals -------------------------------------------------------------------------------

  async loadProposals(list) {
    for (const job of [...this.jobs.values()]) if (job.proposal) this.jobs.delete(job.name);
    this.proposals = [];
    for (const info of list) {
      const proposal = { name: info.name, sid: this.sid, info, review: info.review, variants: [], now: null };
      this.proposals.push(proposal);
      try {
        const spec = (await import(`/proposals/${this.sid}/${info.name}.js?v=${info.mtime}`)).default;
        if (!spec?.variants?.length) throw new Error("no default export with variants");
        proposal.spec = spec;
        if (spec.replaces) {
          proposal.now = this.jobs.get(spec.replaces) ?? null;
          if (!proposal.now) proposal.warning = `replaces ${spec.replaces}, which is not a sprite`;
        }
        const box = { ...poses.ANIMAL_BOX, ...spec.box };
        spec.variants.forEach((v, i) => {
          const seconds = v.seconds ?? spec.seconds ?? 0;
          const fps = v.fps ?? spec.fps ?? 8;
          const title = String(v.name ?? String.fromCharCode(65 + i)).replace(/[^\w-]/g, "_");
          const pals = {};
          for (const t of THEMES) pals[t] = { ...this.scene.palettes[t], ...spec.palettes?.[t], ...v.palettes?.[t] };
          const job = {
            name: `${info.name}--${title}`,
            title,
            sid: this.sid,
            proposal: info.name,
            variant: v,
            box,
            pals,
            seconds,
            fps,
            count: seconds > 0 ? Math.max(1, Math.round(seconds * fps)) : 1,
            item: { label: spec.title ?? info.name, where: null },
            paint: (ctx, pal, f) => v.draw({ ctx, pal, time: f / fps, groundY: box.ground, cols: box.w }, f / fps),
          };
          renderJob(job);
          proposal.variants.push(job);
          this.jobs.set(job.name, job);
        });
      } catch (error) {
        proposal.error = String(error?.message ?? error);
      }
      proposal.state = proposalState(proposal);
    }
  }

  // ---- Rules -------------------------------------------------------------------------------------

  // The scene against the nursery-scene skill's design rules, as far as the code shows them.
  // Rules that need an eye on the running scene say so instead of guessing. `live` is the running
  // scene's timer names, when the scene view is running it.
  rules(live = null) {
    const items = (group) => this.groups.find((g) => g.id === group)?.items ?? [];
    const names = (list) => list.map((i) => i.label).join(", ");
    const creatures = [...items("animals"), ...items("birds")];
    const out = [];
    const landmarks = items("landmarks");
    out.push(
      landmarks.length
        ? { rule: "A signature landmark", state: "ok", detail: names(landmarks) }
        : { rule: "A signature landmark", state: "warn", detail: "No plant kind stands alone like a landmark" },
    );
    if (live?.timers) {
      out.push(
        live.timers.length
          ? { rule: "A timed wow event", state: "ok", detail: live.timers.join(", ") }
          : { rule: "A timed wow event", state: "warn", detail: "The running scene has no timed event" },
      );
    } else {
      out.push({ rule: "A timed wow event", state: "eye", detail: "Open the scene view to read its timers" });
    }
    const limit = OPEN_SCENES.has(this.sid) ? 5 : 8;
    const kind = OPEN_SCENES.has(this.sid) ? "open" : "dense";
    out.push({
      rule: `At most ${limit} ground animals at once (${kind} scene)`,
      state: "eye",
      detail: `${items("animals").length} kinds in the scene; count them in the On the page row`,
    });
    const wide = creatures.filter((i) => i.jobs.some((j) => j.size?.[0] > MASCOT_WIDTH));
    out.push(
      wide.length
        ? {
            rule: `No animal wider than the mascot (${MASCOT_WIDTH} px)`,
            state: "bad",
            detail: wide.map((i) => `${i.label} ${Math.max(...i.jobs.map((j) => j.size[0]))} px`).join(", "),
          }
        : {
            rule: `No animal wider than the mascot (${MASCOT_WIDTH} px)`,
            state: "ok",
            detail: `${creatures.length} checked`,
          },
    );
    const orphans = creatures.flatMap((i) => i.jobs).filter((j) => !hasFamily(this.sid, j.name));
    out.push(
      orphans.length
        ? { rule: "Every animal belongs to a family", state: "warn", detail: orphans.map((j) => j.title).join(", ") }
        : { rule: "Every animal belongs to a family", state: "ok", detail: `${creatures.length} checked` },
    );
    const effects = items("effects");
    out.push(
      effects.length
        ? { rule: "A constant ambient layer", state: "ok", detail: names(effects) }
        : { rule: "A constant ambient layer", state: "warn", detail: "No effects" },
    );
    out.push({
      rule: "Slow, medium and fast flybys, and a circler",
      state: "eye",
      detail: `Birds: ${names(items("birds")) || "none"}. Speeds show only in motion`,
    });
    out.push({ rule: "A predator, and more prey than predators", state: "eye", detail: names(items("animals")) });
    out.push({ rule: "Every walker has an idle pose, legs down", state: "eye", detail: "Watch a walker stop" });
    return out;
  }
}

function familyOf(sid, sprite) {
  const family = FAMILIES.find((f) => roleIn(f, sid, sprite));
  return family ? { id: family.id, title: family.title } : null;
}

// A proposal's state: waiting (new, or revised since your review), changes asked, approved, or
// built (approved, and the code now draws the chosen variant where the sprite it replaces was).
export function proposalState(p) {
  const r = p.review;
  if (!r || r.mtime < p.info.mtime) return "waiting";
  if (r.verdict !== "approve") return "changes";
  const chosen = p.variants.find((v) => v.title === r.choice);
  if (
    p.now &&
    chosen?.renders &&
    THEMES.every((t) => same(p.now.renders?.get(`${t}|0`), chosen.renders.get(`${t}|0`)))
  ) {
    return "built";
  }
  return "approved";
}

export const STATES = {
  waiting: { label: "Waiting for you", tone: "waiting", icon: "clock" },
  changes: { label: "Changes asked", tone: "info", icon: "message-square" },
  approved: { label: "Approved, not built", tone: "ok", icon: "check" },
  built: { label: "Built", tone: "ok", icon: "circle-check" },
};
