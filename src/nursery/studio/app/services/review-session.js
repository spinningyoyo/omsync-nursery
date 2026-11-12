// One proposal under review: what the review screen (review-view) plays and its side panel
// (review-panel) decides. Playback time is shared, so "Edit pixels on this frame" opens the frame
// on show. Fires "change" whenever anything changes.
import { frameAtTime, removeProposals, saveReview } from "./review.js";

export class ReviewSession extends EventTarget {
  constructor(model, proposal) {
    super();
    this.model = model;
    this.proposal = proposal;
    const r = proposal.review;
    this.choice = r?.choice ?? proposal.variants.find((v) => !v.error)?.title ?? "";
    this.notes = r?.notes ?? "";
    this.t = 0;
    this.playing = true;
    this.speed = 1;
    this.saving = false;
  }

  changed() {
    this.dispatchEvent(new Event("change"));
  }

  get variants() {
    return this.proposal.variants.filter((j) => !j.error);
  }

  get chosen() {
    return this.variants.find((v) => v.title === this.choice) ?? null;
  }

  // The variant that sets the pace: the first one that moves.
  get lead() {
    return this.proposal.variants.find((j) => j.count > 1) ?? null;
  }

  frameOf(job) {
    return frameAtTime(job, this.t);
  }

  step(by) {
    this.playing = false;
    this.t = Math.max(0, this.t + by / (this.lead?.fps ?? 8));
    this.changed();
  }

  async verdict(verdict) {
    this.saving = true;
    this.changed();
    try {
      await saveReview(this.model, this.proposal, { verdict, choice: this.choice, notes: this.notes.trim() });
      this.proposal = this.model.proposals.find((p) => p.name === this.proposal.name) ?? this.proposal;
    } finally {
      this.saving = false;
      this.changed();
    }
  }

  async removeProposal() {
    await removeProposals(this.model, [this.proposal]);
  }
}
