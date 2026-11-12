// omsync's pixel mascot is not a scene, but it is edited like a sprite: a pseudo-scene with one
// job, the grid of assets/brand/mascot-grid.txt. Saved edits land in .nursery/brand/edits/ and are
// applied to the grid (see studio-edits.md); `nursery brand` rebuilds every file from it.
//
// brand.py owns everything about the mascot: its id, the grid file, the day and night colours
// and which cell is outline, eye, body or outside. The studio fetches that from /api/brand and
// draws it; it holds no copy of the grid's path, the colours or the exterior rule.
import { renderJob, SceneModel, THEMES } from "./scene-model.js";

// The mascot as brand.py describes it now: { id, grid, palettes, haze, kinds }.
export const fetchBrand = () => fetch("/api/brand").then((r) => r.json());

// The mascot's id never changes while the studio is open, so it is asked once.
let idOnce;
export const brandId = () => {
  idOnce ??= fetchBrand().then((brand) => brand.id);
  return idOnce;
};

export class BrandModel extends SceneModel {
  async build() {
    const { palettes, haze, grid, kinds } = await fetchBrand();
    // Only the studio's own code reads this scene; "haze" is the backdrop of the pictures it saves.
    this.scene = {
      id: this.sid,
      label: "Brand",
      palettes: Object.fromEntries(THEMES.map((t) => [t, { ...palettes[t], haze: haze[t] }])),
    };
    const job = {
      name: "brand-mascot",
      title: "mascot",
      sid: this.sid,
      box: { w: kinds[0].length, h: kinds.length },
      pals: palettes,
      brand: true,
      item: { label: "Mascot", where: { path: grid, line: null } },
      paint: (ctx, pal) => {
        kinds.forEach((row, y) => {
          row.forEach((kind, x) => {
            if (!kind) return;
            ctx.fillStyle = pal[kind];
            ctx.fillRect(x, y, 1, 1);
          });
        });
      },
    };
    renderJob(job);
    this.groups = [];
    this.jobs = new Map([[job.name, job]]);
    if (job.error) this.errors.push(`${job.name}: ${job.error}`);
    await this.refresh();
    return this;
  }

  // The mascot has no other sprites for a change to ripple into.
  async saveBaseline() {}
}
