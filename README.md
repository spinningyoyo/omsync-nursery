# omsync-nursery

omsync-nursery is the shared garden for the owner's apps. It holds the pixel-art scenes that grow
on a host page, and the garden around them: the scene picker, the watering, and day and night. It
also holds the Nursery Studio, where you draw the scenes. A host installs this repository as a
Python package and serves the scene files from it. Each host brings its own mascot. The nursery
owns no mascot or favicon. The studio and the `nursery` command run from a checkout of this
repository.

> Pull requests are by invitation only. Open an issue first. See [CONTRIBUTING.md](CONTRIBUTING.md).

## Getting started

You need [uv](https://docs.astral.sh/uv/), [Node.js](https://nodejs.org/) and Chrome (or another
Chromium browser). The checks run the scene modules in Node. The previews and the tests drive
headless Chrome.

```sh
git clone https://github.com/spinningyoyo/omsync-nursery
cd omsync-nursery
uv sync
git config core.hooksPath .githooks   # once for each clone: it runs the checks before each commit
uv run nursery                        # open the studio
```

The studio opens in its own Chrome window. If no Chromium browser is installed, it opens a tab in
your normal browser. Use `uv run nursery studio --no-window` to start the server only.
The studio is a local tool. Do not expose its port to a network.
[docs/overview.md](docs/overview.md) shows how to edit pixels and review art in the studio.

## Development

```sh
sh scripts/check.sh                 # ruff, Biome, import boundaries and scenes files
uv run pytest                       # the end-to-end tests
uv run nursery scenes               # build scenes.json and scenes.css from the scene modules
uv run nursery catalog --out DIR    # write per-scene markdown tables to DIR
uv run nursery verify               # check the art against the design rules
uv run nursery release --dry-run    # check a release and change nothing
uv run nursery --help               # every command
```

The tests are end-to-end tests only. They are in `tests/e2e/`. GitHub Actions runs the checks and
the tests on each push.

## Using it from a host

A host names this repository by its git URL and the `release` branch in its `pyproject.toml`,
and gives a version range in its dependencies:

```toml
[tool.uv.sources]
omsync-nursery = { git = "https://github.com/spinningyoyo/omsync-nursery", branch = "release" }
```

The host's `uv.lock` records the exact commit. The host reads the scene files through
`nursery.assets`. [docs/overview.md](docs/overview.md) lists the hosts and describes the host
contract and the release rules.

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) first. [AGENTS.md](AGENTS.md) has the rules for agents and
for people who work in the repository. [docs/README.md](docs/README.md) is the index of the
documents.

## Licence

omsync-nursery is licensed under the [AGPL-3.0-only](LICENSE). Copyright (C) 2026 spinningyoyo.

The studio includes third-party files under their own licences: Lit (BSD-3-Clause) and Lucide
(ISC). [VENDOR.md](src/nursery/studio/app/vendor/VENDOR.md) lists them and links the licence texts.
