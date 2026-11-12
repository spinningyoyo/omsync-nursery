// A proposal's review: your choice and notes, saved beside the proposal for the agent to read
// with `nursery proposals`, and removing proposals.
import { api } from "./api.js";

// The frame a job shows at review time t: a proposal loops its length; a sprite of today's scene
// steps through its frames four times a second.
export function frameAtTime(job, t) {
  if (job.proposal) return job.count > 1 ? Math.floor((t % job.seconds) * job.fps) % job.count : 0;
  return job.frames[Math.floor(t * 4) % job.frames.length];
}

export async function saveReview(model, proposal, { verdict, choice, notes }) {
  await api("PUT", `/api/review/${model.sid}/${proposal.name}`, {
    verdict,
    choice,
    notes,
    revision: proposal.spec?.revision ?? 1,
    mtime: proposal.info.mtime,
    reviewed: new Date().toISOString(),
  });
  await model.refresh();
}

// Removes proposals with their reviews and pixel edits. The code stays as it is.
export async function removeProposals(model, proposals) {
  for (const p of proposals) await api("DELETE", `/api/proposal/${model.sid}/${p.name}`);
  await model.refresh();
}
