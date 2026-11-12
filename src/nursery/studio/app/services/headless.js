// The studio's headless modes, which `nursery check` and `nursery render` drive in headless
// Chrome and read back from window.__result. Their output is parsed by the CLI, so
// its shape must not change.
//   ?check=SCENE,SCENE  each saved edit's state against the code, sprites that moved, and each
//                       proposal's state (nursery release reads these)
//   ?render=SCENE/NAME  a proposal's variants and a sheet of their frames
import { describeColour } from "./palette.js";
import { bounds, colourAt, differences, drawZoomed, grow, sheet, union } from "./pixels.js";
import { SceneModel, tierOf } from "./scene-model.js";

const PAD = 2;

function pixelList(job, theme, want, got, indexes, limit = 40) {
  return indexes.slice(0, limit).map((i) => {
    const x = i % want.width;
    const y = Math.floor(i / want.width);
    return {
      x,
      y,
      dx: x - 40,
      dy: y - job.feet,
      want: describeColour(job.pals, theme, colourAt(want, x, y)),
      got: describeColour(job.pals, theme, colourAt(got, x, y)),
    };
  });
}

function finding(model, key, wantLabel, want, got) {
  const [name, theme] = key.split("|");
  const job = model.jobs.get(name);
  const indexes = differences(want, got);
  const crop = grow(union(bounds(want), bounds(got)) ?? { x: 0, y: 0, w: 1, h: 1 }, PAD, job.box);
  const bg = model.scene.palettes[theme].haze;
  return {
    key,
    count: indexes.length,
    pixels: pixelList(job, theme, want, got, indexes),
    pictures: [
      sheet(
        [
          [wantLabel, want],
          ["code now", got],
          ["differs", got, true],
        ],
        crop,
        bg,
        indexes,
      ),
    ],
  };
}

async function runCheck(ids) {
  const out = { scenes: {} };
  for (const sid of ids) {
    const model = await SceneModel.load(sid);
    const edits = [];
    for (const edit of model.edits.values()) {
      const status = model.editState(edit);
      const item = { key: edit.key, status };
      if (status === "differs") {
        Object.assign(item, finding(model, edit.key, "edit", edit.targetImg, model.currentRender(edit.key)));
      }
      edits.push(item);
    }
    const moved = model.ripples().map((r) => finding(model, r.key, "baseline", r.before, r.now));
    const proposals = model.proposals.map((p) => ({ name: p.name, state: p.state, error: p.error ?? null }));
    out.scenes[sid] = { edits, ripples: moved, proposals, errors: model.errors };
  }
  return out;
}

// A sheet of a proposal for the agent who wrote it: each variant's frames in light and dark,
// after today's sprite it replaces.
function proposalSheet(model, p) {
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
      drawZoomed(ctx, r.job.renders.get(`${r.theme}|${f}`), r.crop, r.zoom, model.scene.palettes[r.theme].haze, x, y);
    });
    y += r.crop.h * r.zoom + gap * 2;
  }
  return canvas.toDataURL("image/png");
}

async function runRender(target) {
  const [sid, name] = target.split("/");
  const model = await SceneModel.load(sid);
  const p = model.proposals.find((x) => x.name === name);
  if (!p) throw new Error(`no proposal ${name} in ${sid}`);
  if (p.error) return { errors: [p.error] };
  return {
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
    sheet: proposalSheet(model, p),
  };
}

// Runs the mode the URL asks for, if any. Returns true when the page is headless.
export async function runHeadless(params) {
  if (!params.has("check") && !params.has("render")) return false;
  try {
    window.__result = params.has("check")
      ? await runCheck(params.get("check").split(","))
      : await runRender(params.get("render"));
  } catch (error) {
    window.__result = { error: String(error?.stack ?? error) };
  }
  return true;
}
