# AGENTS.md

omsync-nursery is the shared garden for the owner's apps. It holds the pixel-art scenes, the
garden that hosts show around a scene, and the Nursery Studio that draws and edits the scenes.
Start with [docs/README.md](docs/README.md). It maps the documents.
[docs/overview.md](docs/overview.md) shows the owner-agent workflow, the hosts and the host
contract. `docs/adr/` holds the reasons behind the layout and the stack.

## Rules

- Scene, sprite, palette, saved-edit or studio work: use the `nursery-scene` skill. Before you
  change a scene, read its module end to end.
- Art verification work: use the `verify-nursery` skill.
- The modules in `src/nursery/assets/js/` import only each other, so the package stays
  self-contained. A scene imports only `kit/`. Only a host imports `garden/`. `sh scripts/check.sh`
  enforces these rules.
- Behavior that every host needs goes in `garden/`, not in a host. A host keeps only what is its
  own: its storage keys, its mascot, its words and its layout.
- What a host reads is the host contract in `docs/overview.md`. A change to it is a contract
  change for every host in its hosts table. Mark the change in `CHANGELOG.md` as a contract change.
- The nursery owns no mascot or favicon. `ink-studio` owns them. The studio's mark in
  `src/nursery/studio/app/brand/` is exported from `ink-studio`. `ink.toml` lists the files, and
  `ink.sha256` records their content. Never edit them here. `sh scripts/check.sh` fails when a
  file differs from `ink.sha256`.
- `.nursery/` is the owner's working state. Read it, and leave its files in place.
- Tests are end-to-end tests only, in `tests/e2e/`. Do not write unit tests. A test drives the
  real engine, CLI or studio from the outside. Run `uv run pytest` after code changes.

## Commands

```sh
uv sync
git config core.hooksPath .githooks   # once per clone: pre-commit and commit-msg checks
sh scripts/check.sh               # ruff, Biome, import boundaries, scene records, scenes freshness (needs Node)
uv run pytest                     # the end-to-end tests (needs Chrome); -m "not browser" skips Chrome
uv run nursery --help
uv run nursery verify             # check the art against the design rules
uv run nursery release --patch --dry-run   # or --minor, --major
uv run nursery scenes             # rebuilds scenes.json and scenes.css from the scene modules
uv run nursery catalog --out DIR  # writes per-scene markdown tables to DIR
```

## Git

- Commit only when the owner asks.
- Stage explicit paths: `git add <path1> <path2>`. Never run `git add -A` or `git add .` in a
  shared tree. Run `git status` before you commit, and stage only your files.
- Never run commands that destroy work or skip checks: `git reset --hard`, `git checkout .`,
  `git clean -fd`, `git stash`, `git commit --no-verify`.
- Never force-push. If a rebase conflict is in a file that you did not change, stop and ask.
- Write each commit message as `type(scope): imperative summary`. The commit-msg hook enforces it.

## Changelog

- `CHANGELOG.md` follows Keep a Changelog. Write it once, at release: the release commit holds
  the new version's section. A feature commit does not touch it.
- One short sentence for each item, for the person who installs the package. A new scene is its
  name, what it is and how it feels. Never list a scene's animals, plants or effects.
- Start an entry with "Contract change:" when it changes what a host reads. Say at a high level
  what changes for the host.
- Never change a released section.
- Do not list linters, checks, tests or CI.

## Releasing

Release only when the owner asks. The rules and the steps are in the
[Release section of docs/overview.md](docs/overview.md#release). The version tag is `vX.Y.Z`.
Run `uv run nursery release --dry-run` first. Then run the command with `--patch`, `--minor` or
`--major`. Before it, write the new version's section in `CHANGELOG.md` and leave it
uncommitted. The release commit takes it with the version. Each host takes a release on its own
schedule.
