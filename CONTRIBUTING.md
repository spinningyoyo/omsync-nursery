# Contributing to omsync-nursery

This guide saves time for you and for the maintainer. omsync-nursery is a small project with one
maintainer. Please read this guide before you open an issue or a pull request.

## Philosophy

A scene is art. It follows the design rules in
[the nursery-scene skill](.claude/skills/nursery-scene/SKILL.md). Shared drawing goes in the kit,
one design for each family, so each scene stays short.

The package contract in [docs/overview.md](docs/overview.md) is what omsync reads. It changes only
together with omsync, and only for a strong reason.

## Contribution gate

Issues are welcome. Pull requests are by invitation only.

1. Open an issue.
2. Wait until the maintainer says yes.
3. Then open a pull request.

The maintainer closes a pull request that has no invitation. The maintainer closes spam without a
reply.

## Quality bar for issues

Keep an issue short, concrete and worth reading.

- Write it on one screen.
- Write it in your own voice. Do not use an LLM to write the text.
- State the bug or the idea.
- Explain why it matters.
- Say if you want to build it.

For a bug, give the scene, the stage, the theme (light or dark) and the width of the page.

## Before you open a pull request

Run these commands. Both must pass.

```sh
sh scripts/check.sh
uv run pytest
```

Then follow these rules:

- Do not edit `CHANGELOG.md`. The maintainer writes it.
- Write each commit message as `type(scope): imperative summary`, for example
  `fix(desert): keep the hawk above the rocks`. The commit-msg hook checks it. Run
  `git config core.hooksPath .githooks` once to turn the hook on.
- Write no unit tests. The tests are end-to-end tests in `tests/e2e/`. Change an end-to-end test
  only when your change alters the behavior that it covers.

## Art contributions

A scene must follow [the nursery-scene skill](.claude/skills/nursery-scene/SKILL.md). Read these
parts first:

- **Accuracy.** Use the species of that place, in the right season.
- **Families.** An animal or a tree joins a family. Members share one design.
- **Size tiers.** Each animal fits its tier.

Show new art as a proposal in the studio before you build it. [docs/overview.md](docs/overview.md)
describes the workflow.

## Licence

Your contribution is licensed under the [AGPL-3.0-only](LICENSE), the same as the project.
