// The Verify view's state: the runs of `nursery verify`, the run on show, its findings grouped by
// animal and fault, the filters, the finding being replayed, the owner's triage marks, and a run
// started from the studio. verify-panel (the list) and verify-view (the replay) share one session.
// Fires "change" whenever anything changes.
//
// A replay runs the finding's own job again in a fresh, hidden iframe (/verify/replay.html, the
// checker's harness), with the same seed and simulated clock, so it shows the frames the rule saw.
import { api } from "./api.js";
import { SCENES } from "./scene-model.js";

export const RULES = [
  { id: "scale", label: "Scale", says: "Its body is as long as the scale gives for its real size." },
  { id: "pose", label: "Pose", says: "A pose moves its parts and adds none." },
  { id: "gap", label: "Gaps", says: "One piece: no part comes loose." },
  { id: "walk-cadence", label: "Walk pace", says: "Takes 0.5 to 3 strides a second." },
  { id: "grounded", label: "On the ground", says: "Feet within a row of its ground, with a shadow." },
  { id: "perched", label: "Perched", says: "A perched bird's feet rest on solid scenery." },
  { id: "night", label: "Night", says: "No day bird out at night." },
  { id: "no-errors", label: "No errors", says: "Nothing throws or logs an error." },
  { id: "engine-contract", label: "Engine contract", says: "What omsync relies on still works." },
];
export const ruleLabel = (id) => RULES.find((r) => r.id === id)?.label ?? id;

export const VERDICTS = [
  { id: "bug", label: "Real bug", icon: "circle-alert", tone: "danger" },
  { id: "strict", label: "Rule too strict", icon: "ruler", tone: "warn" },
  { id: "ignore", label: "Ignore", icon: "eye", tone: "muted" },
];
export const verdictOf = (id) => VERDICTS.find((v) => v.id === id) ?? null;

export const sceneLabel = (sid) => SCENES.find((s) => s.id === sid)?.label ?? sid;
export const sizeLabel = (size) => (size === "phone" ? "Phone" : "Desktop");
export const themeLabel = (theme) => (theme === "dark" ? "Night" : "Day");

// "bearAt:bear" reads as "bear", with the driver kept for the curious.
export function actorName(actor) {
  if (!actor) return "The page";
  const [driver, member] = actor.split(":");
  return member ? member.replaceAll("-", " ") : driver;
}

// A finding's id, unique in a run: its job and its key in that job.
export const uidOf = (f) => `${f.scene}/${f.theme}/${f.size}/${f.key}`;

const WINDOW = 2; // seconds of page time shown either side of the moment
const POLL = 1000;

export class VerifySession extends EventTarget {
  constructor() {
    super();
    this.runs = [];
    this.fingerprint = null; // today's code, to compare with the run's
    this.run = null; // the findings.json on show
    this.triage = {};
    this.status = null; // a run started from the studio
    this.filters = { rule: null, scene: "all", theme: "all", size: "all", mark: "all" };
    this.open = null; // the group key expanded in the list
    this.selected = null; // the finding uid being replayed
    this.moment = "first"; // first | worst
    this.replays = new Map();
    this.loaded = false;
    this.error = null;
  }

  changed() {
    this.dispatchEvent(new Event("change"));
  }

  async load(id) {
    try {
      const [{ runs, fingerprint }, triage, status] = await Promise.all([
        api("GET", "/api/verify/runs"),
        api("GET", "/api/verify/triage"),
        api("GET", "/api/verify/status"),
      ]);
      this.runs = runs;
      this.fingerprint = fingerprint;
      this.triage = triage;
      this.status = status;
      const want = id ?? this.run?.id ?? runs[0]?.id;
      if (want && want !== this.run?.id) await this.show(want);
      this.error = null;
    } catch (error) {
      this.error = String(error?.message ?? error);
    }
    this.loaded = true;
    if (this.status?.running) this.poll();
    this.changed();
  }

  async show(id) {
    this.run = await api("GET", `/api/verify/run/${id}`);
    this.replays.clear();
    this.selected = null;
    this.open = null;
    this.changed();
  }

  get stale() {
    return Boolean(this.run && this.fingerprint && this.run.fingerprint !== this.fingerprint);
  }

  // ---- The list ----------------------------------------------------------------------------------

  setFilter(name, value) {
    this.filters = { ...this.filters, [name]: value };
    this.changed();
  }

  // The findings the filters keep, before the rule filter (so the rule chips can count).
  keptByScope() {
    const { scene, theme, size, mark } = this.filters;
    return (this.run?.findings ?? []).filter((f) => {
      if (scene !== "all" && f.scene !== scene) return false;
      if (theme !== "all" && f.theme !== theme) return false;
      if (size !== "all" && f.size !== size) return false;
      const verdict = this.triage[f.group]?.verdict ?? "none";
      if (mark === "open" && verdict !== "none") return false;
      if (mark !== "all" && mark !== "open" && verdict !== mark) return false;
      return true;
    });
  }

  // One group per animal and fault: every scene, theme and width it shows in, its range of
  // measurements, and the owner's mark. Unmarked groups first, then by rule and size.
  groups() {
    const order = Object.fromEntries(RULES.map((r, i) => [r.id, i]));
    const byKey = new Map();
    for (const f of this.keptByScope()) {
      if (this.filters.rule && f.rule !== this.filters.rule) continue;
      let g = byKey.get(f.group);
      if (!g) {
        g = { key: f.group, rule: f.rule, actor: f.actor, says: f.says, unit: f.unit, limit: f.limit, findings: [] };
        byKey.set(f.group, g);
      }
      g.findings.push(f);
    }
    const out = [...byKey.values()];
    for (const g of out) {
      const values = g.findings.map((f) => Number(f.value)).filter((v) => !Number.isNaN(v));
      g.low = values.length ? Math.min(...values) : null;
      g.high = values.length ? Math.max(...values) : null;
      g.scenes = [...new Set(g.findings.map((f) => f.scene))];
      g.frames = g.findings.reduce((n, f) => n + (f.count ?? 1), 0);
      g.mark = this.triage[g.key] ?? null;
      g.findings.sort(
        (a, b) => a.scene.localeCompare(b.scene) || a.theme.localeCompare(b.theme) || a.size.localeCompare(b.size),
      );
    }
    out.sort(
      (a, b) =>
        Boolean(a.mark) - Boolean(b.mark) ||
        order[a.rule] - order[b.rule] ||
        b.findings.length - a.findings.length ||
        String(a.actor).localeCompare(String(b.actor)),
    );
    return out;
  }

  ruleCounts() {
    const counts = {};
    for (const f of this.keptByScope()) counts[f.rule] = (counts[f.rule] ?? 0) + 1;
    return counts;
  }

  toggle(key) {
    this.open = this.open === key ? null : key;
    if (this.open) {
      const first = this.groups().find((g) => g.key === key)?.findings[0];
      if (first) this.select(first);
    }
    this.changed();
  }

  get finding() {
    return this.run?.findings.find((f) => uidOf(f) === this.selected) ?? null;
  }

  get group() {
    const f = this.finding;
    return f ? (this.groups().find((g) => g.key === f.group) ?? null) : null;
  }

  select(f) {
    this.selected = uidOf(f);
    this.open = f.group;
    this.changed();
    this.replay(f);
  }

  setMoment(moment) {
    this.moment = moment;
    this.changed();
    if (this.finding) this.replay(this.finding);
  }

  // ---- Replay ------------------------------------------------------------------------------------

  // When the finding happens: its first frame, or its worst measurement.
  momentOf(f, moment = this.moment) {
    return moment === "worst" && f.worst != null ? f.worst : f.time;
  }

  replayOf(f, moment = this.moment) {
    return this.replays.get(`${uidOf(f)}@${this.momentOf(f, moment)}`) ?? null;
  }

  // Replays have no box to show for a finding about the page (an error, the engine contract).
  replayable(f) {
    return f && f.time != null && !["no-errors", "engine-contract", "scale"].includes(f.rule);
  }

  async replay(f) {
    if (!this.replayable(f)) return;
    const at = this.momentOf(f);
    const key = `${uidOf(f)}@${at}`;
    if (this.replays.has(key)) return;
    const entry = { state: "running", progress: 0, at, from: Math.max(0, at - WINDOW), to: at + WINDOW };
    this.replays.set(key, entry);
    this.changed();
    const frame = document.createElement("iframe");
    frame.setAttribute("aria-hidden", "true");
    frame.style.cssText = "position:fixed;left:-10000px;top:0;width:1200px;height:700px;border:0;visibility:hidden";
    try {
      const page = await new Promise((resolve, reject) => {
        frame.addEventListener("load", () => resolve(frame.contentWindow), { once: true });
        frame.addEventListener("error", reject, { once: true });
        frame.src = "/verify/replay.html";
        document.body.append(frame);
      });
      for (let i = 0; i < 200 && !page.replayReady; i += 1) await new Promise((r) => setTimeout(r, 25));
      if (!page.replayReady) throw new Error("the replay page did not load");
      const job = {
        scene: f.scene,
        theme: f.theme,
        size: f.size,
        rules: this.run.rules,
        early: this.run.early,
        full: this.run.full,
        seed: this.run.seed ?? 1,
      };
      const out = await page.replay({
        job,
        target: f.key,
        from: entry.from,
        to: entry.to,
        onProgress: (t) => {
          entry.progress = t;
          this.changed();
        },
      });
      // Copy the pictures out of the iframe's page before it goes.
      entry.frames = out.frames.map((fr) => ({
        ...fr,
        image: new ImageData(new Uint8ClampedArray(fr.image.data), fr.image.width, fr.image.height),
      }));
      entry.width = out.width;
      entry.height = out.height;
      entry.hits = out.hits;
      entry.track = trackOf(entry.frames);
      // Open on the failing frame nearest the moment where the animal is on the page (a walker
      // can fail while it is still coming in from beside the page).
      const seen = (fr) => fr.hit?.box && onPage(fr.hit.box, entry.width, entry.height);
      const nearest = (keep) =>
        entry.frames.reduce(
          (best, fr, i) =>
            keep(fr) && (best < 0 || Math.abs(fr.t - at) < Math.abs(entry.frames[best].t - at)) ? i : best,
          -1,
        );
      const visible = nearest(seen);
      entry.index =
        visible >= 0
          ? visible
          : Math.max(
              0,
              nearest((fr) => fr.hit),
            );
      entry.state = "ready";
    } catch (error) {
      entry.state = "failed";
      entry.error = String(error?.message ?? error);
    } finally {
      frame.remove();
    }
    this.changed();
  }

  // ---- Triage ------------------------------------------------------------------------------------

  async mark(key, verdict, notes) {
    const body = { key, verdict, notes, run: this.run?.id };
    await api("PUT", "/api/verify/triage", body);
    if (verdict) this.triage = { ...this.triage, [key]: { verdict, notes, run: this.run?.id } };
    else {
      const { [key]: _, ...rest } = this.triage;
      this.triage = rest;
    }
    this.changed();
  }

  // ---- A run from the studio ---------------------------------------------------------------------

  async start(scenes = []) {
    try {
      await api("PUT", "/api/verify/start", { scenes });
    } catch (error) {
      this.error = String(error?.message ?? error);
    }
    this.status = { running: true, done: 0, total: 0, scenes };
    this.changed();
    this.poll();
  }

  poll() {
    if (this.polling) return;
    this.polling = setInterval(async () => {
      let status;
      try {
        status = await api("GET", "/api/verify/status");
      } catch {
        return;
      }
      this.status = status;
      if (!status.running) {
        clearInterval(this.polling);
        this.polling = null;
        await this.load(status.run ?? undefined);
        if (status.run) await this.show(status.run);
      }
      this.changed();
    }, POLL);
  }
}

// Whether any of a box lies on the page.
export const onPage = (b, width, height) => b.x1 >= 0 && b.x0 < width && b.y1 >= 0 && b.y0 < height;

// The track ids the finding's animal had in the replay: the draws whose box is the box the rule
// reported, so frames where the rule passed still show the same animal.
function trackOf(frames) {
  const ids = new Set();
  for (const fr of frames) {
    const box = fr.hit?.box;
    if (!box) continue;
    const d = fr.draws.find(
      (x) => x.box.x0 === box.x0 && x.box.y0 === box.y0 && x.box.x1 === box.x1 && x.box.y1 === box.y1,
    );
    if (d) ids.add(d.id);
  }
  return ids;
}
