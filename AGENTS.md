# AGENTS.md

omsync-nursery holds the pixel-art scenes for omsync's sign-in page (`../omsync`) and the Nursery
Studio that draws and edits them. `docs/overview.md` shows the owner-agent workflow and the omsync
contract; `docs/adr/` holds the reasons behind the layout and the stack.

## Rules

- Scene, sprite, palette, saved-edit or studio work: use the `nursery-scene` skill. Before you
  change a scene, read its module and its `docs/scenes/<scene>.md`.
- The modules in `src/nursery/assets/js/` import only each other, so the package stays
  self-contained.
- What omsync reads is the contract in `docs/overview.md`; change it only together with omsync's
  host code.
- `.nursery/` is the owner's working state: read it, and leave its files in place.
- Release only when the owner asks: `uv run nursery release --patch|--minor|--major`. The tag is
  `vX.Y.Z`, the version in `pyproject.toml`. While the major version is 0, use `--minor` for a
  contract change and `--patch` for anything else. omsync takes a release on its own schedule.

## Commands

```sh
uv sync
uv run ruff check . && uv run ruff format --check .
uv run nursery --help
uv run nursery release --patch --dry-run   # or --minor, --major
uv run nursery catalog            # rebuilds docs/scenes/<scene>.md
```
