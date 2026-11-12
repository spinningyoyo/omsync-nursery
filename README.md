# omsync-nursery

The pixel-art scenes that grow on the sign-in page of omsync, and the Nursery Studio that you use
to draw them. Start with [docs/overview.md](docs/overview.md). It shows how the owner and the
agent work together, and what omsync uses from this repository.

## Set up

```sh
uv sync
git config core.hooksPath .githooks   # do this one time for each clone: it checks commit messages
```

## Commands

```sh
uv run nursery                    # open the studio in its own window
uv run nursery check [SCENE]      # compare your saved pixel edits with the code
uv run nursery render SCENE NAME  # draw a proposal into its sheet
uv run nursery proposals [SCENE]  # show each review and the pixel edits on proposals
uv run nursery catalog            # make docs/scenes/<scene>.md again from the code
uv run nursery brand [--check]    # build the mascot, the favicons and the studio's mark from the grid
uv run nursery preview ...        # draw scenes or a sprite sheet to images
uv run nursery release [--patch|--minor|--major] [--dry-run]  # check the scenes, tag vX.Y.Z, move the release branch
```

The studio opens in a Chrome window without tabs. If no Chromium browser is installed, it opens in
a normal browser tab. Use `--no-window` to start the server only. Run the command from this
checkout, because the studio draws the scenes from the files in it.

## Where things are

- `src/nursery/assets/`: the files that omsync installs. `js/nursery.js` is the engine, and its
  header tells what a scene must supply. `js/scenes/` has one module for each scene. `js/kit/` has
  the shared drawing code. `scenes.json` and `css/scenes.css` give the scene names and colours.
  `brand/` has the grid of omsync's mascot and the mascot and favicon files built from it.
- `src/nursery/`: the `nursery` command. `studio/` is the studio (a Python server, and Lit
  components in `studio/app/`).
- `docs/scenes/`: one catalogue file for each scene. Do not edit them. `nursery catalog` writes
  them.
- `docs/adr/`: the decisions, and the reasons for them.
- `.claude/skills/nursery-scene/`: the skill that agents use for scene work.

## License

AGPL-3.0. See [LICENSE](LICENSE).
