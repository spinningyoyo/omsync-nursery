# 0001: A sibling repository

Status: accepted, 2026-11-08.

## Context

The scenes started inside omsync, as a small part of its sign-in page. The work grew to ten scenes,
a studio, a catalogue, headless checks and an agent skill. Its commits filled the history of
omsync, which is about finance. Its tools did not fit the tools of omsync.

## Decision

The scenes and their tools live in a separate repository, `omsync-nursery`, next to `omsync`. The
history of the scenes moved with them. omsync installs the scenes as a package. It follows the
`release` branch of this repository, and its lock file records the exact commit. The nursery
releases. omsync upgrades when it wants new art.

## Consequences

- Each repository has one concern. The history of omsync stays about the finance app.
- The nursery has its own tools and workflow: the studio, the checks, the catalogue and the skill.
- omsync depends on a contract, not on a copy of the files. [overview.md](../overview.md) lists the
  contract. A change to the contract must change the two repositories together.
- The nursery owns omsync's pixel mascot and favicons. A change to omsync's brand art is made here,
  in the mascot's grid, and reaches omsync through a release.
- A release makes no change in omsync. Art reaches omsync only when omsync upgrades. To see art
  before that, use `scripts/dev-nursery.sh` in omsync.
- The nursery cannot check omsync at release time. omsync's own tests catch a release that breaks
  the contract, when omsync upgrades.
