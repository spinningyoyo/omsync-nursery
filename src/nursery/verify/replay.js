// A finding played again, for the studio's Verify view. It runs the finding's job exactly as
// `nursery verify` ran it (same scene, theme, width, rules, seed and simulated clock, so the same
// frames), and keeps the frames from `from` to `to` seconds of page time: the picture, every
// animal's box, and what the rule reported on that frame for the finding, if anything.
//
// The studio loads replay.html in a fresh iframe for each replay (the harness takes over the page's
// clock and random numbers) and calls window.replay(...).

import { run } from "./harness.js";

export async function replay({ job, target, from, to, onProgress }) {
  const frames = [];
  let hits = 0;
  let pending = null; // what the rule reported for the target during this frame
  let lastNote = -1;
  const out = await run(job, {
    start(jr) {
      jr.onReport = (id, finding) => {
        if (id !== target) return;
        pending = {
          value: finding.value,
          unit: finding.unit ?? "",
          limit: finding.limit,
          says: finding.says,
          detail: finding.detail ?? null,
          box: finding.box ?? null,
          guide: finding.guide ?? null,
        };
      };
    },
    frame(jr) {
      const t = jr.nursery.time;
      const hit = pending;
      pending = null;
      if (onProgress && Math.floor(t) !== lastNote) {
        lastNote = Math.floor(t);
        onProgress(t);
      }
      if (t < from - 1e-6) return false;
      if (hit) hits += 1;
      const { ground } = jr;
      frames.push({
        t: Math.round(t * 1000) / 1000,
        stage: jr.stage,
        image: ground.getContext("2d").getImageData(0, 0, ground.width, ground.height),
        draws: [...jr.tracks.values()]
          .filter((d) => d.box)
          .map((d) => ({
            id: d.id,
            label: `${d.driver}:${d.member}`,
            box: d.box,
            state: d.actor?.pose ?? d.actor?.state ?? d.state ?? null,
            c: typeof d.actor?.c === "number" ? d.actor.c : null,
          })),
        hit,
      });
      return t >= to - 1e-6;
    },
  });
  if (out.stopped) out.nursery.destroy(); // a run that went to its end was destroyed already
  const first = frames[0]?.image;
  return { frames, hits, width: first?.width ?? 0, height: first?.height ?? 0 };
}

window.replay = replay;
window.replayReady = true;
