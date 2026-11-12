// The editor's frames, on its EditorSession. Each frame shows as it is now, edits included.
// Click one to show it; its link toggle edits it together with the frame on show, so every
// stroke, erase, move and delete lands on both. "Match" links the frames that draw the same
// pixels where you are working (a walk's frame 0 and 2, not 1 and 3). "Copy changes to…" copies
// what you already changed on this frame to frames you pick, each with what it would change.
import { css, html, LitElement, nothing } from "../ui/lit.js";
import { shared } from "../ui/shared.js";

export class FrameStrip extends LitElement {
  static properties = { session: { attribute: false }, copying: { state: true }, picked: { state: true } };

  static styles = [
    shared,
    css`
      :host {
        display: grid;
        gap: var(--space-2);
        min-width: 0;
      }
      .head {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        flex-wrap: wrap;
      }
      .label {
        display: flex;
        align-items: center;
        gap: 6px;
        color: var(--muted);
        font-size: var(--text-xs);
        font-weight: 650;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }
      .grow {
        flex: 1;
      }
      .frames {
        display: flex;
        align-items: end;
        gap: var(--space-2);
        overflow-x: auto;
      }
      .frame {
        position: relative;
        display: grid;
        gap: 4px;
        justify-items: center;
        padding: 4px 4px 6px;
        border: 1px solid transparent;
        border-radius: var(--radius-md);
        background: none;
        color: var(--muted);
        font: inherit;
        font-size: var(--text-sm);
        cursor: pointer;
      }
      .frame.on-show {
        border-color: var(--accent);
        background: var(--accent-weak);
        color: var(--text);
      }
      .frame.linked {
        border-color: var(--accent);
        border-style: dashed;
        color: var(--text);
      }
      .frame .edited {
        color: var(--danger);
      }
      .link {
        position: absolute;
        top: -8px;
        right: -8px;
        width: 24px;
        height: 24px;
        border: 1px solid var(--border);
        border-radius: 50%;
        background: var(--surface);
        box-shadow: var(--shadow);
      }
      .link[aria-pressed="true"] {
        border-color: var(--accent);
        background: var(--accent);
        color: var(--accent-text);
      }
      .copy {
        display: grid;
        gap: var(--space-2);
        padding: var(--space-3);
        border: 1px solid var(--border);
        border-radius: var(--radius-md);
        background: var(--surface-2);
      }
      .copy label {
        display: flex;
        align-items: center;
        gap: var(--space-2);
      }
      .warn {
        color: var(--warn);
      }
      .row {
        display: flex;
        gap: var(--space-2);
      }
    `,
  ];

  constructor() {
    super();
    this.onChange = () => this.requestUpdate();
    this.picked = new Set();
  }

  willUpdate(changed) {
    if (changed.has("session")) {
      changed.get("session")?.removeEventListener("change", this.onChange);
      this.session?.addEventListener("change", this.onChange);
      this.copying = false;
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.session?.removeEventListener("change", this.onChange);
  }

  render() {
    const s = this.session;
    if (!s) return nothing;
    const job = s.job;
    if (job.frames.length < 2) {
      return html`<div class="label"><n-icon name="layers" size="12"></n-icon>Frames</div>
        <span class="muted">A still: one frame.</span>`;
    }
    const linked = s.targets().length - 1;
    const changed = s.changedCount();
    return html`
      <div class="head">
        <span class="label"><n-icon name="layers" size="12"></n-icon>Frames</span>
        <span class="muted">${linked ? `Editing ${linked + 1} frames together` : "Editing this frame"}</span>
        <span class="grow"></span>
        <button class="btn" title="Link the frames that draw the same pixels where you are working" @click=${() => s.linkMatching()}>
          <n-icon name="scan-search"></n-icon>Match
        </button>
        <button class="btn" ?disabled=${!changed} title="Copy what you changed on this frame to other frames" @click=${this.openCopy}>
          <n-icon name="copy"></n-icon>Copy changes to…
        </button>
      </div>
      <div class="frames">
        ${job.frames.map((f) => {
          const onShow = f === s.f;
          const isLinked = s.linked.has(f);
          return html`<button class="frame ${onShow ? "on-show" : isLinked ? "linked" : ""}" @click=${() => s.setFrame(f)}>
            <n-sprite .image=${s.composed("light", f)} .crop=${s.crop} .rev=${s.rev} fit="56"></n-sprite>
            <span>Frame ${f}${s.frameEdited(f) ? html` <span class="edited">•</span>` : nothing}</span>
            ${onShow
              ? nothing
              : html`<span
                  class="icon-btn link"
                  role="button"
                  aria-pressed=${isLinked}
                  title=${isLinked ? "Edited together with the frame on show: click to unlink" : "Edit together with the frame on show"}
                  @click=${(e) => {
                    e.stopPropagation();
                    s.toggleLinked(f);
                  }}
                  ><n-icon name="link" size="12"></n-icon
                ></span>`}
          </button>`;
        })}
      </div>
      ${this.copying ? this.renderCopy() : nothing}
    `;
  }

  renderCopy() {
    const s = this.session;
    const others = s.job.frames.filter((f) => f !== s.f);
    const toggle = (f) => (e) => {
      const next = new Set(this.picked);
      if (e.target.checked) next.add(f);
      else next.delete(f);
      this.picked = next;
    };
    return html`<div class="copy">
      <span>Copy the ${s.changedCount()} px changed on frame ${s.f} to:</span>
      ${others.map((f) => {
        const { change, over } = s.copyPreview(f);
        return html`<label>
          <input type="checkbox" .checked=${this.picked.has(f)} @change=${toggle(f)} />
          Frame ${f}
          <span class="muted">· ${change ? `changes ${change} px` : "already has them"}</span>
          ${over ? html`<span class="warn">· ${over} over different art</span>` : nothing}
        </label>`;
      })}
      <div class="row">
        <button class="btn primary" ?disabled=${!this.picked.size} @click=${this.applyCopy}>
          <n-icon name="copy"></n-icon>Copy to ${this.picked.size} frame${this.picked.size === 1 ? "" : "s"}
        </button>
        <button class="btn ghost" @click=${() => (this.copying = false)}>Cancel</button>
      </div>
    </div>`;
  }

  // Starts with the frames the fix fits as it is: those that draw the same pixels here.
  openCopy = () => {
    this.picked = new Set(this.session.matchingFrames());
    this.copying = true;
  };

  applyCopy = () => {
    this.session.copyChangesTo([...this.picked]);
    this.copying = false;
  };
}

customElements.define("frame-strip", FrameStrip);
