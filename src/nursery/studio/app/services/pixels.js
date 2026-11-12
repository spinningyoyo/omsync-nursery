// Pixel helpers on ImageData: compare, diff, read and write one pixel, bounds, run-length
// encoding for saved patches, and drawing a crop zoomed. The encoding is read back from saved
// patches and baselines (and by `nursery check`), so it must not change.

export function clone(img) {
  return new ImageData(new Uint8ClampedArray(img.data), img.width, img.height);
}

export function same(a, b) {
  if (!a || !b || a.width !== b.width || a.height !== b.height) return false;
  const x = a.data;
  const y = b.data;
  for (let i = 0; i < x.length; i += 1) if (x[i] !== y[i]) return false;
  return true;
}

// The pixel indexes where two renders of one box differ.
export function differences(a, b) {
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
export function colourAt(img, x, y) {
  if (x < 0 || y < 0 || x >= img.width || y >= img.height) return null;
  const k = (y * img.width + x) * 4;
  const [r, g, b, a] = img.data.slice(k, k + 4);
  if (a === 0) return null;
  return `#${hex2(r)}${hex2(g)}${hex2(b)}${a === 255 ? "" : hex2(a)}`;
}

export function setColour(img, x, y, colour) {
  if (x < 0 || y < 0 || x >= img.width || y >= img.height) return;
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
export function bounds(img) {
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

export function union(a, b) {
  if (!a) return b;
  if (!b) return a;
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y };
}

export function grow(box, by, limit) {
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
export function encode(img) {
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

export function decode({ w, h, runs }) {
  const words = new Uint32Array(w * h);
  let at = 0;
  for (let i = 0; i < runs.length; i += 2) {
    words.fill(runs[i + 1], at, at + runs[i]);
    at += runs[i];
  }
  return new ImageData(new Uint8ClampedArray(words.buffer), w, h);
}

// A render on a canvas, kept while the render lives, since reviews repaint every frame.
const arts = new WeakMap();

export function artOf(img, fresh = false) {
  if (fresh) arts.delete(img);
  if (!arts.has(img)) {
    const art = document.createElement("canvas");
    art.width = img.width;
    art.height = img.height;
    art.getContext("2d").putImageData(img, 0, 0);
    arts.set(img, art);
  }
  return arts.get(img);
}

// Draws the crop of a render, zoomed, over a background colour (none when bg is null).
export function drawZoomed(ctx, img, crop, zoom, bg, dx = 0, dy = 0, fresh = false) {
  const art = artOf(img, fresh);
  if (bg) {
    ctx.fillStyle = bg;
    ctx.fillRect(dx, dy, crop.w * zoom, crop.h * zoom);
  }
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(art, crop.x, crop.y, crop.w, crop.h, dx, dy, crop.w * zoom, crop.h * zoom);
}

const MARK = "#ff2bd6"; // changed pixels in saved pictures

// Side-by-side panels of renders, each with a caption: the pictures saved with a patch and the
// check's findings. A panel marked dim shows marks over its pixels.
export function sheet(panels, crop, bg, marks = []) {
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
