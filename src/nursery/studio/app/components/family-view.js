// One family across every scene, in the centre, at one scale: the members side by side so a
// family refresh is judged as a whole (the dogs differ only in size, colour and tail). Storybook
// members stand apart: compared, but keeping their book's look. "No family yet" lists every
// animal and bird that no family names.
import { FAMILIES, hasFamily, roleIn, SCENES, SceneModel } from "../services/scene-model.js";
import { act } from "../ui/action.js";
import { css, html, LitElement, nothing } from "../ui/lit.js";
import { shared } from "../ui/shared.js";

const NONE = "none";

export class FamilyView extends LitElement {
  static properties = { family: {}, lineup: { state: true } };

  static styles = [
    shared,
    css`
      :host {
        display: grid;
        grid-template-rows: auto 1fr;
        min-height: 0;
        background: var(--bg);
      }
      .pick {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
        padding: var(--space-3) var(--space-4);
        border-bottom: 1px solid var(--border);
        background: var(--surface);
      }
      .chip[aria-pressed="true"] {
        border-color: var(--accent);
        background: var(--accent-weak);
        color: var(--text);
      }
      .chip.none {
        border-style: dashed;
      }
      .body {
        overflow: auto;
        padding: var(--space-5);
      }
      h2 {
        margin: 0;
        font-size: 20px;
      }
      .differ {
        margin: 4px 0 var(--space-5);
        color: var(--muted);
      }
      .lineup {
        display: flex;
        flex-wrap: wrap;
        align-items: end;
        gap: var(--space-5);
      }
      .member {
        display: grid;
        gap: var(--space-2);
        justify-items: center;
        padding: 0;
        border: 0;
        background: none;
        color: inherit;
        font: inherit;
        cursor: pointer;
      }
      .member .pair {
        display: flex;
        gap: 4px;
        align-items: end;
      }
      .member .who {
        display: grid;
        justify-items: center;
        font-size: var(--text-sm);
      }
      .member .who .muted {
        font-size: var(--text-xs);
      }
      h3 {
        margin: var(--space-5) 0 var(--space-3);
      }
    `,
  ];

  willUpdate(changed) {
    if (changed.has("family")) this.load(this.family ?? FAMILIES[0].id);
  }

  // The family's members from every scene that has any, drawn by each scene's own code.
  async load(id) {
    const family = FAMILIES.find((f) => f.id === id) ?? null;
    const sids = SCENES.map((s) => s.id).filter((sid) => !family || family.members[sid] || family.storybook?.[sid]);
    const lineup = { id, family, member: [], storybook: [] };
    for (const sid of sids) {
      const model = await SceneModel.load(sid);
      for (const item of model.items()) {
        if (family) {
          for (const job of item.jobs) {
            const role = roleIn(family, sid, job.name);
            if (role) lineup[role].push({ sid, job });
          }
        } else if (item.group === "animals" || item.group === "birds") {
          for (const job of item.jobs) if (!hasFamily(sid, job.name)) lineup.member.push({ sid, job });
        }
      }
    }
    if (this.family === id || (!this.family && id === FAMILIES[0].id)) this.lineup = lineup;
  }

  render() {
    const id = this.family ?? FAMILIES[0].id;
    const label = (sid) => SCENES.find((s) => s.id === sid)?.label ?? sid;
    const member = (
      m,
    ) => html`<button class="member" title="Edit pixels" @click=${() => act(this, "edit", { sid: m.sid, name: m.job.name })}>
      <span class="pair">
        <n-sprite .job=${m.job} zoom="4" theme="light"></n-sprite>
        ${m.job.themes?.includes("dark") ? html`<n-sprite .job=${m.job} zoom="4" theme="dark"></n-sprite>` : nothing}
      </span>
      <span class="who">${m.job.title}<span class="muted">${label(m.sid)}</span></span>
    </button>`;
    const l = this.lineup?.id === id ? this.lineup : null;
    return html`
      <div class="pick">
        ${FAMILIES.map(
          (f) =>
            html`<button class="chip" aria-pressed=${f.id === id} @click=${() => act(this, "family", { family: f.id })}>${f.title}</button>`,
        )}
        <button class="chip none" aria-pressed=${id === NONE} @click=${() => act(this, "family", { family: NONE })}>
          No family yet
        </button>
      </div>
      <div class="body">
        ${
          !l
            ? html`<p class="muted">Drawing every member…</p>`
            : html`
              <h2>${l.family?.title ?? "No family yet"}</h2>
              <p class="differ">
                ${
                  l.family
                    ? `Members may differ in ${l.family.differ}. Every member at 4×, day and night.`
                    : l.member.length
                      ? "Animals and birds no family names. Add each to one in studio/shared/families.js."
                      : "Every animal and bird has a family."
                }
              </p>
              <div class="lineup">${l.member.map(member)}</div>
              ${
                l.storybook.length
                  ? html`<h3 class="eyebrow">Storybook, keeping their book's look</h3>
                    <div class="lineup">${l.storybook.map(member)}</div>`
                  : nothing
              }
            `
        }
      </div>
    `;
  }
}

customElements.define("family-view", FamilyView);
