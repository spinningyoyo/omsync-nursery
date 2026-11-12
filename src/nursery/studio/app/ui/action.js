// Components never change studio state themselves: they send an action up to <nursery-app>,
// which owns the state and passes it back down as properties.
export function act(host, type, detail = {}) {
  host.dispatchEvent(
    new CustomEvent("studio-action", { detail: { type, ...detail }, bubbles: true, composed: true }),
  );
}
