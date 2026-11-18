"""`nursery release`: check the nursery, tag a version and move the `release` branch.

Each test runs the command as a subprocess in its own throwaway git repository (the `repo` fixture),
which has no remote unless the test adds a local one. The real checkout is never touched. The
command draws every scene in headless Chrome before it releases, so each run takes some seconds.
"""

import subprocess
from pathlib import Path

import pytest
from conftest import git, nursery_cli

pytestmark = pytest.mark.browser

GRID = Path("src/nursery/assets/brand/mascot-grid.txt")


def release(repo: Path, *flags: str) -> subprocess.CompletedProcess:
    return nursery_cli(repo, "release", *flags)


def state(repo: Path) -> dict[str, str]:
    """Everything a release can change in the repository."""
    return {
        "head": git(repo, "rev-parse", "HEAD"),
        "checked out": git(repo, "branch", "--show-current"),
        "branches": git(repo, "for-each-ref", "--format=%(refname) %(objectname)", "refs/heads"),
        "tags": git(repo, "for-each-ref", "--format=%(refname) %(objectname)", "refs/tags"),
        "status": git(repo, "status", "--porcelain"),
        "pyproject.toml": (repo / "pyproject.toml").read_text(encoding="utf-8"),
        "uv.lock": (repo / "uv.lock").read_text(encoding="utf-8"),
    }


def commit(repo: Path, subject: str = "feat: more art") -> None:
    git(repo, "commit", "--allow-empty", "-q", "-m", subject)


def released(repo: Path, tag: str = "v0.1.1") -> None:
    """The repository as it is after a release of the version in pyproject.toml, by hand."""
    git(repo, "tag", "-a", tag, "-m", "released")


def stops(done: subprocess.CompletedProcess, why: str) -> None:
    assert done.returncode != 0, done.stdout
    assert done.stderr.startswith("release stopped:"), done.stderr[:1500]
    assert why in done.stderr, done.stderr


def version_in(repo: Path) -> str:
    line = next(
        line
        for line in (repo / "pyproject.toml").read_text(encoding="utf-8").splitlines()
        if line.startswith("version")
    )
    return line.split('"')[1]


# ---- A release ----------------------------------------------------------------------------------


def test_a_dry_run_says_what_a_release_would_do_and_changes_nothing(repo: Path) -> None:
    before = state(repo)
    done = release(repo, "--dry-run")
    assert done.returncode == 0, done.stderr
    assert "1. Checking the nursery is ready" in done.stdout
    assert "2. Would tag this commit v0.1.1 (the version in pyproject.toml, no bump)" in done.stdout
    assert "3. Would create the release branch at the tagged commit" in done.stdout
    assert "4. This repository has no remote; nothing would be pushed" in done.stdout
    assert state(repo) == before


def test_a_dry_run_of_a_bump_names_the_new_version(repo: Path) -> None:
    released(repo)
    commit(repo)
    git(repo, "branch", "release", "HEAD~1")
    before = state(repo)
    done = release(repo, "--patch", "--dry-run")
    assert done.returncode == 0, done.stderr
    assert (
        "2. Would change the version from 0.1.1 to 0.1.2 in pyproject.toml and uv.lock, commit "
        "them "
        "as 'chore: release v0.1.2', and tag that commit v0.1.2"
    ) in done.stdout
    assert "3. Would move the release branch forward to the tagged commit" in done.stdout
    assert state(repo) == before


def test_the_first_release_tags_the_version_in_pyproject_as_it_is(repo: Path) -> None:
    head = git(repo, "rev-parse", "HEAD")
    done = release(repo)
    assert done.returncode == 0, done.stderr
    assert "2. Tagged v0.1.1" in done.stdout
    assert "3. Created the release branch" in done.stdout
    assert "4. This repository has no remote; nothing is pushed" in done.stdout
    assert "Released v0.1.1 on release." in done.stdout
    assert git(repo, "rev-parse", "HEAD") == head  # no new commit
    assert git(repo, "rev-parse", "refs/heads/release") == head
    assert git(repo, "cat-file", "-t", "v0.1.1") == "tag"  # annotated
    assert git(repo, "rev-parse", "v0.1.1^{commit}") == head
    assert (
        git(repo, "tag", "-l", "--format=%(contents:subject)", "v0.1.1") == "omsync-nursery 0.1.1"
    )
    assert version_in(repo) == "0.1.1"
    assert git(repo, "status", "--porcelain") == ""


@pytest.mark.parametrize(
    ("flag", "version"), [("--patch", "0.1.2"), ("--minor", "0.2.0"), ("--major", "1.0.0")]
)
def test_a_bump_commits_the_new_version_tags_it_and_moves_the_release_branch(
    repo: Path, flag: str, version: str
) -> None:
    released(repo)
    git(repo, "branch", "release")
    commit(repo)
    work = git(repo, "rev-parse", "HEAD")

    done = release(repo, flag)
    assert done.returncode == 0, done.stderr
    assert f"2. Committed the version and tagged v{version}" in done.stdout
    assert "3. Moved the release branch" in done.stdout
    assert f"Released v{version} on release." in done.stdout

    head = git(repo, "rev-parse", "HEAD")
    assert git(repo, "log", "-1", "--format=%s", "HEAD") == f"chore: release v{version}"
    assert git(repo, "rev-parse", "HEAD~1") == work
    assert (
        git(repo, "show", "--stat", "--format=", "HEAD").count("|") == 2
    )  # two files, nothing else
    assert version_in(repo) == version
    assert f'name = "omsync-nursery"\nversion = "{version}"' in (repo / "uv.lock").read_text(
        encoding="utf-8"
    )
    assert git(repo, "cat-file", "-t", f"v{version}") == "tag"
    assert git(repo, "rev-parse", f"v{version}^{{commit}}") == head
    assert git(repo, "rev-parse", "refs/heads/release") == head
    assert git(repo, "status", "--porcelain") == ""
    assert git(repo, "branch", "--show-current") == "main"


def test_a_second_release_of_the_same_commit_reuses_the_tag(repo: Path) -> None:
    assert release(repo).returncode == 0
    before = state(repo)
    done = release(repo)
    assert done.returncode == 0, done.stderr
    assert "2. Reusing tag v0.1.1" in done.stdout
    assert "3. The release branch is already at this commit; nothing to move" in done.stdout
    assert state(repo) == before


def test_a_release_branch_at_the_commit_still_moves_on_a_bump(repo: Path) -> None:
    released(repo)
    commit(repo)
    git(repo, "branch", "release")  # already at the commit that the version commit will follow
    assert release(repo, "--patch").returncode == 0
    assert git(repo, "rev-parse", "refs/heads/release") == git(repo, "rev-parse", "HEAD")
    assert git(repo, "rev-parse", "v0.1.2^{commit}") == git(repo, "rev-parse", "HEAD")


def test_a_release_pushes_the_tag_and_the_branch_to_a_remote(repo: Path, tmp_path: Path) -> None:
    remote = tmp_path / "remote.git"
    git(repo, "init", "-q", "--bare", str(remote))
    git(repo, "remote", "add", "origin", str(remote))
    done = release(repo)
    assert done.returncode == 0, done.stderr
    assert "4. Pushed v0.1.1 and release to origin" in done.stdout
    head = git(repo, "rev-parse", "HEAD")
    assert git(remote, "rev-parse", "refs/heads/release") == head
    assert git(remote, "rev-parse", "refs/tags/v0.1.1^{commit}") == head
    dry = release(repo, "--dry-run")
    assert "4. Would push v0.1.1 and release to origin" in dry.stdout


# ---- Reasons not to release --------------------------------------------------------------------


def test_changes_that_are_not_committed_stop_the_release(repo: Path) -> None:
    (repo / "notes.txt").write_text("not committed", encoding="utf-8")
    before = state(repo)
    stops(release(repo), "the nursery has uncommitted changes")
    assert state(repo) == before


def test_a_brand_file_that_the_grid_does_not_build_stops_the_release(repo: Path) -> None:
    grid = repo / GRID
    text = grid.read_text(encoding="utf-8")
    grid.write_text(text.replace("#", ".", 1), encoding="utf-8")
    git(repo, "commit", "-q", "-am", "feat: change the mascot")
    before = state(repo)
    stops(release(repo), "mascot.svg is not what the mascot's grid builds; run `nursery brand`")
    assert state(repo) == before


@pytest.mark.parametrize(
    ("flags", "setup", "why"),
    [
        ((), "released", "v0.1.1 is already released; pass --patch, --minor or --major"),
        (("--patch",), "unreleased", "v0.1.1 is not released yet; release it without a bump flag"),
        (("--patch",), "tagged here", "this commit is already released as v0.1.1"),
        (("--patch",), "taken", "v0.1.2 exists already, on another commit"),
        ((), "wrong tag", "this commit has the tag v0.1.9, but pyproject.toml says 0.1.1"),
    ],
)
def test_a_flag_that_does_not_fit_the_version_state_stops_the_release(
    repo: Path, flags: tuple[str, ...], setup: str, why: str
) -> None:
    if setup in ("released", "taken"):
        released(repo)
    if setup == "taken":
        git(repo, "tag", "-a", "v0.1.2", "-m", "elsewhere")
    if setup in ("released", "taken"):
        commit(repo)
    if setup == "tagged here":
        released(repo)
    if setup == "wrong tag":
        released(repo, "v0.1.9")
    before = state(repo)
    stops(release(repo, *flags), why)
    assert state(repo) == before


@pytest.mark.parametrize("flags", [(), ("--patch",)])
def test_a_release_branch_with_other_work_stops_the_release_with_nothing_left_behind(
    repo: Path, flags: tuple[str, ...]
) -> None:
    if flags:
        released(repo)
    git(repo, "switch", "-q", "-c", "release")
    commit(repo, "feat: only on the release branch")
    git(repo, "switch", "-q", "main")
    commit(repo)
    before = state(repo)
    stops(release(repo, *flags), "the release branch holds work that this commit does not")
    assert state(repo) == before
    assert version_in(repo) == "0.1.1"


@pytest.mark.parametrize("flags", [(), ("--patch",)])
def test_a_tag_that_cannot_be_made_leaves_the_repository_as_it_was(
    repo: Path, flags: tuple[str, ...]
) -> None:
    tag = "v0.1.2" if flags else "v0.1.1"
    if flags:
        released(repo)
        git(repo, "branch", "release")
        commit(repo)
    # A lock file on the tag's name makes `git tag` fail after the version commit is made.
    lock = repo / ".git" / "refs" / "tags" / f"{tag}.lock"
    lock.parent.mkdir(parents=True, exist_ok=True)
    lock.write_text("", encoding="utf-8")
    before = state(repo)
    done = release(repo, *flags)
    stops(done, "`git tag -a")
    assert state(repo) == before
    assert git(repo, "tag", "-l", tag) == ""
    assert version_in(repo) == "0.1.1"
