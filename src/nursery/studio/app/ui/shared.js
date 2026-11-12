// Styles every component adopts: buttons, icon buttons, segmented controls, chips, badges,
// panels and pixel canvases. Components add only their own layout on top.
import { css } from "./lit.js";

export const shared = css`
  :host {
    font: var(--text-md) / 1.45 var(--font);
    color: var(--text);
  }

  [hidden] {
    display: none !important;
  }

  .btn {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    height: 30px;
    padding: 0 var(--space-3);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--surface);
    color: var(--text);
    font: inherit;
    font-weight: 500;
    cursor: pointer;
    white-space: nowrap;
  }
  .btn:hover {
    background: var(--surface-hover);
  }
  .btn.primary {
    background: var(--accent);
    border-color: var(--accent);
    color: var(--accent-text);
  }
  .btn.primary:hover {
    filter: brightness(1.05);
  }
  .btn.ghost {
    border-color: transparent;
    background: transparent;
  }
  .btn.ghost:hover {
    background: var(--surface-hover);
  }
  .btn.block {
    width: 100%;
    justify-content: center;
  }

  .icon-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    padding: 0;
    border: 1px solid transparent;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--muted);
    cursor: pointer;
  }
  .icon-btn:hover {
    background: var(--surface-hover);
    color: var(--text);
  }
  .icon-btn[aria-pressed="true"] {
    background: var(--accent-weak);
    color: var(--accent);
  }

  .btn:focus-visible,
  .icon-btn:focus-visible,
  .seg button:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 1px;
  }

  .seg {
    display: inline-flex;
    padding: 2px;
    gap: 2px;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--surface-2);
  }
  .seg button {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 26px;
    padding: 0 10px;
    border: 0;
    border-radius: 4px;
    background: transparent;
    color: var(--muted);
    font: inherit;
    font-weight: 500;
    cursor: pointer;
  }
  .seg button[aria-pressed="true"] {
    background: var(--surface);
    color: var(--text);
    box-shadow: 0 1px 2px rgb(0 0 0 / 0.08);
  }

  .chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 24px;
    padding: 0 8px;
    border: 1px solid var(--border);
    border-radius: 999px;
    background: var(--surface);
    color: var(--muted);
    font-size: var(--text-sm);
    white-space: nowrap;
  }
  button.chip {
    cursor: pointer;
    font-family: inherit;
  }
  button.chip:hover {
    color: var(--text);
    border-color: var(--border-strong);
  }

  .badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    height: 20px;
    padding: 0 7px;
    border-radius: 999px;
    font-size: var(--text-xs);
    font-weight: 600;
    white-space: nowrap;
  }
  .badge.waiting {
    background: var(--warn-weak);
    color: var(--warn);
  }
  .badge.ok {
    background: var(--ok-weak);
    color: var(--ok);
  }
  .badge.bad {
    background: var(--danger-weak);
    color: var(--danger);
  }
  .badge.info {
    background: var(--info-weak);
    color: var(--info);
  }
  .badge.count {
    min-width: 18px;
    height: 18px;
    justify-content: center;
    padding: 0 5px;
    background: var(--accent);
    color: var(--accent-text);
  }

  .muted {
    color: var(--muted);
  }
  .mono {
    font-family: var(--mono);
    font-size: var(--text-sm);
  }
  .eyebrow {
    color: var(--muted);
    font-size: var(--text-xs);
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
  .sample {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    color: var(--info);
    font-size: var(--text-xs);
    font-weight: 600;
  }

  canvas.pixels {
    image-rendering: pixelated;
  }
  .checker {
    background-color: var(--checker-a);
    background-image:
      linear-gradient(45deg, var(--checker-b) 25%, transparent 25%),
      linear-gradient(-45deg, var(--checker-b) 25%, transparent 25%),
      linear-gradient(45deg, transparent 75%, var(--checker-b) 75%),
      linear-gradient(-45deg, transparent 75%, var(--checker-b) 75%);
    background-size: 12px 12px;
    background-position: 0 0, 0 6px, 6px -6px, -6px 0;
  }
  .night {
    background: #0b0c0b;
  }
`;
