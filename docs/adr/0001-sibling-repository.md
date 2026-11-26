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
- Each host depends on a contract, not on a copy of the files. [overview.md](../overview.md) lists
  the contract and the hosts. A change to the contract must change each host's host code when that
  host takes the release.
- The nursery owns no mascot or favicon. `ink-studio` owns them, and each host brings its own
  mascot to the garden.
- A release makes no change in a host. Art reaches a host only when that host upgrades.
- The nursery cannot check a host at release time. Each host's own tests catch a release that
  breaks the contract, when that host upgrades.
