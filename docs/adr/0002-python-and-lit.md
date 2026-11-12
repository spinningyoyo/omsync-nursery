# 0002: Python and Lit

Status: accepted, 2026-11-08.

## Context

The scene code must be browser JavaScript, because omsync runs it on its sign-in page. The tools
around the scenes need a command, a small local server and headless checks. The studio needs a page
with many panels and a pixel editor.

## Decision

- **Python** for the package, the `nursery` command, the studio server and the headless tools.
  omsync also uses Python with uv and ruff, so one toolchain serves both repositories. The
  maintainer knows Python best, so the tools stay easy to change. The server is the standard
  library `http.server`, because it only sends files and reads and writes some JSON.
- **Lit** for the studio page. Lit is one small file, kept in this repository
  ([`vendor/`](../../src/nursery/studio/app/vendor/VENDOR.md)). It needs no build step and no
  network. Its components are standard web components. The difficult work, such as pixels, frames
  and undo, is in plain JavaScript services, so Lit only arranges the panels.
- **No framework that needs a build step.** React, Svelte and similar frameworks need one, and the
  studio has none.

## Consequences

- One `uv sync` installs all tools. The studio has no npm and no bundler.
- A change to a studio file shows after a reload. The studio reloads itself.
- The headless tools need Chrome, through Selenium.
- A switch to a framework with a build step needs a new decision.
