// Keeps an open studio current. When the code on disk changes (a scene, the kit, the studio
// itself), onCode runs; the app reloads the page, or holds the reload while there are unsaved
// edits. When an agent posts or revises a proposal, or a review is saved, onProposals runs with
// every scene's proposals.
import { api } from "./api.js";

export function watch({ onCode, onProposals, every = 1500 }) {
  let version = null;
  let proposals = null;
  const tick = async () => {
    try {
      const now = (await api("GET", "/api/version")).version;
      if (version && now !== version) onCode();
      version = now;
      const all = await api("GET", "/api/proposals");
      const signature = JSON.stringify(all);
      if (proposals && signature !== proposals) onProposals(all);
      proposals = signature;
    } catch {
      // The server is restarting; try again next tick.
    }
  };
  tick();
  return setInterval(tick, every);
}
