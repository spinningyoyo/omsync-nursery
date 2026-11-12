---
status: accepted
---

# Sibling repository

## Context

The scenes started inside omsync, as a small part of its sign-in page. The work grew quickly. It
got ten scenes, a studio, a catalogue, headless checks and an agent skill. This work is fun, but
it is not finance. Its commits filled the history of omsync, and its tools did not fit the tools
of omsync.

## Decision

The scenes and their tools are in a separate repository, `omsync-nursery`, next to `omsync`. The
history of the scenes came with them. omsync installs the scenes as a package. It follows the
`release` branch of this repository, and its lock file records the exact commit. The nursery
releases; omsync upgrades when it wants new art.

## Consequences

- Each repository has one concern. The history of omsync is about the finance app.
- The nursery has its own tools and workflow: the studio, the checks, the catalogue and the skill.
- omsync depends on a contract, not on a copy of the files. `docs/overview.md` lists the contract.
  A change to the contract must change the two repositories together.
- A release makes no change in omsync. Art reaches omsync only when omsync upgrades. To see art
  before that, use `scripts/dev-nursery.sh` in omsync.
- The nursery cannot check omsync at release time. omsync's own tests catch a release that breaks
  the contract, at upgrade.
