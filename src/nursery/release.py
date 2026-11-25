"""`nursery release`: check the scenes and release them on the `release` branch.

    uv run nursery release [--patch | --minor | --major] [--dry-run]

A release, in order, stopping at the first problem:

1. Checks the nursery is ready: nothing uncommitted but CHANGELOG.md, every saved pixel edit in
   code, no proposal approved but not built, and every scene drawing without errors.
2. Settles the version. The tag is always vX.Y.Z, and X.Y.Z is the version in pyproject.toml.
   This commit may already carry a v tag: it is reused (no bump flag allowed). If v<version> is
   not a tag yet, that version is released as it is (no bump flag allowed). Otherwise a bump flag
   is required: CHANGELOG.md must hold the section for the next version, and the command writes
   that version into pyproject.toml, refreshes uv.lock, commits the three files as
   `chore: release vX.Y.Z` and tags that commit (annotated). The changelog is written once, for
   the release, so its section lands in the release commit.
3. Moves the `release` branch to the tagged commit, or creates it. The branch only moves forward:
   if it holds work that commit does not, the release stops and nothing is committed or tagged.
4. Pushes the tag and the branch, if the repository has a remote. Otherwise nothing is pushed.

Which flag, while the major version is 0: a contract change (what omsync reads, see
docs/overview.md) bumps the minor (0.1.0 -> 0.2.0); any other change, new scenes and art fixes,
bumps the patch. omsync's version range excludes the new minor version, so omsync's lock refuses a
contract change.
From 1.0.0: --major is a contract change, --minor a new scene, --patch an art fix.

--dry-run runs step 1 and prints what the rest would do, changing nothing.
"""

import re
import subprocess
import tomllib
from dataclasses import dataclass
from pathlib import Path

from nursery.paths import ROOT

BRANCH = "release"


class ReleaseError(SystemExit):
    """A reason not to release, printed as the command's last line."""

    def __init__(self, message: str):
        super().__init__(f"release stopped: {message}")


def run(cmd: list[str], cwd: Path, capture: bool = True) -> str:
    done = subprocess.run(cmd, cwd=cwd, capture_output=capture, text=True, check=False)
    if done.returncode:
        out = (done.stdout or "") + (done.stderr or "")
        raise ReleaseError(f"`{' '.join(cmd)}` failed in {cwd.name}:\n{out.strip()[-2000:]}")
    return (done.stdout or "").strip()


def git(*args: str, cwd: Path = ROOT) -> str:
    return run(["git", *args], cwd)


# ---- 1. Ready? -----------------------------------------------------------------------------------


def readiness() -> list[str]:
    """Problems that stop a release; an empty list means ready. Notes worth knowing are printed."""
    problems = []
    dirty = git("status", "--porcelain", "--", ".", f":!{CHANGELOG.name}")
    if dirty:
        problems.append(f"the nursery has uncommitted changes:\n{dirty}")

    from nursery import brand, catalog
    from nursery.headless import studio_result

    problems += [
        f"{path.relative_to(ROOT)} is not what the mascot's grid builds; run `nursery brand`"
        for path in brand.stale()
    ]
    result = studio_result(f"check={','.join([*catalog.SCENE_IDS, brand.BRAND_ID])}")
    for sid, scene in result["scenes"].items():
        problems += scene_problems(sid, scene)
    return problems


def scene_problems(sid: str, scene: dict) -> list[str]:
    """What stops a release in one scene's check result. Notes worth knowing are printed."""
    problems = [
        f"{sid}: the pixel edit {edit['key']} is {edit['status']}; apply it to the "
        "code, or discard it in the studio's Changes tab"
        for edit in scene["edits"]
        if edit["status"] != "in code"
    ]
    for p in scene.get("proposals", []):
        if p["state"] == "approved":
            problems.append(f"{sid}: proposal {p['name']} is approved but not built")
        elif p["state"] in ("waiting", "changes"):
            print(f"  note: {sid}: proposal {p['name']} is {p['state']}; it is not released")
    problems += [f"{sid}: {error}" for error in scene["errors"]]
    if scene["ripples"]:
        print(f"  note: {sid}: {len(scene['ripples'])} render(s) changed since the edit baseline")
    return problems


# ---- 2. Version ----------------------------------------------------------------------------------

PYPROJECT = ROOT / "pyproject.toml"
LOCKFILE = ROOT / "uv.lock"
CHANGELOG = ROOT / "CHANGELOG.md"
BUMPS = ("major", "minor", "patch")
VERSION_TAG = re.compile(r"v(\d+)\.(\d+)\.(\d+)")
BUMP_HELP = (
    "pass --patch, --minor or --major (while the major version is 0: --minor for a contract "
    "change, --patch for anything else)"
)


@dataclass
class Plan:
    version: str
    tag: str
    tagged: bool  # this commit already has the tag
    bump: bool  # pyproject.toml and uv.lock change, in a new commit that gets the tag


def project_version() -> str:
    return tomllib.loads(PYPROJECT.read_text(encoding="utf-8"))["project"]["version"]


def next_version(version: str, bump: str) -> str:
    major, minor, patch = (int(n) for n in version.split("."))
    if bump == "major":
        return f"{major + 1}.0.0"
    if bump == "minor":
        return f"{major}.{minor + 1}.0"
    return f"{major}.{minor}.{patch + 1}"


def plan_version(bump: str | None) -> Plan:
    """What step 2 does for this commit and flag, or a ReleaseError. Changes nothing."""
    version = project_version()
    here = [
        t
        for t in git("tag", "--points-at", "HEAD", "--list", "v*").split()
        if VERSION_TAG.fullmatch(t)
    ]
    if here:
        tag = max(here, key=lambda t: tuple(int(n) for n in VERSION_TAG.fullmatch(t).groups()))
        if bump:
            raise ReleaseError(f"this commit is already released as {tag}")
        if tag != f"v{version}":
            raise ReleaseError(f"this commit has the tag {tag}, but pyproject.toml says {version}")
        return Plan(version, tag, tagged=True, bump=False)
    if not git("tag", "--list", f"v{version}"):
        if bump:
            raise ReleaseError(f"v{version} is not released yet; release it without a bump flag")
        return Plan(version, f"v{version}", tagged=False, bump=False)
    if not bump:
        raise ReleaseError(f"v{version} is already released; {BUMP_HELP}")
    new = next_version(version, bump)
    if git("tag", "--list", f"v{new}"):
        raise ReleaseError(f"v{new} exists already, on another commit")
    return Plan(new, f"v{new}", tagged=False, bump=True)


def write_version(version: str) -> None:
    """Put the version on the [project] version line of pyproject.toml."""
    text = PYPROJECT.read_text(encoding="utf-8")
    pattern = re.compile(r'(?ms)(^\[project\]\s.*?^version\s*=\s*")[^"]*(")')
    new, count = pattern.subn(rf"\g<1>{version}\g<2>", text, count=1)
    if count != 1:
        raise ReleaseError("pyproject.toml has no version line in its [project] table")
    PYPROJECT.write_text(new, encoding="utf-8")


def put_back_version_files(sha: str) -> None:
    """Restore pyproject.toml and uv.lock, in the index and on disk, to what commit `sha` holds."""
    subprocess.run(
        ["git", "checkout", "-q", sha, "--", "pyproject.toml", "uv.lock"], cwd=ROOT, check=False
    )


def changelog_problem(plan: Plan) -> str | None:
    """Why CHANGELOG.md stops this release, or None. A bump needs the new version's section; a
    release with no bump makes no commit, so the changelog must be committed already."""
    if plan.bump:
        text = CHANGELOG.read_text(encoding="utf-8") if CHANGELOG.is_file() else ""
        if not re.search(rf"(?m)^## \[{re.escape(plan.version)}\]", text):
            return f"CHANGELOG.md has no section for {plan.version}; write it before the release"
        return None
    if git("status", "--porcelain", "--", CHANGELOG.name):
        return "CHANGELOG.md has uncommitted changes, and a release with no bump makes no commit"
    return None


def unstage_changelog(sha: str) -> None:
    """Take CHANGELOG.md out of the index as `sha` has it, and leave the written file on disk."""
    subprocess.run(["git", "reset", "-q", sha, "--", CHANGELOG.name], cwd=ROOT, check=False)


def commit_version(plan: Plan) -> None:
    """Commit the new version with its lock file and the changelog. On failure the version files
    are put back, and the changelog stays on disk, uncommitted."""
    files = ("pyproject.toml", "uv.lock", CHANGELOG.name)
    try:
        write_version(plan.version)
        run(["uv", "lock", "-q"], ROOT)
        git("add", *files)
        git("commit", "-q", "-m", f"chore: release {plan.tag}", "--", *files)
    except BaseException:
        put_back_version_files("HEAD")
        unstage_changelog("HEAD")
        raise


def create_tag(tag: str) -> None:
    git("tag", "-a", tag, "-m", f"omsync-nursery {tag.removeprefix('v')}")


# ---- 3. Branch -----------------------------------------------------------------------------------


def branch_state() -> str:
    """How the release branch stands: "missing", "same" (at this commit), "behind" (this commit
    is ahead of it) or "diverged" (it holds work this commit does not)."""
    ref = f"refs/heads/{BRANCH}"
    found = subprocess.run(
        ["git", "rev-parse", "-q", "--verify", ref], cwd=ROOT, capture_output=True, check=False
    )
    if found.returncode:
        return "missing"
    if git("rev-parse", ref) == git("rev-parse", "HEAD"):
        return "same"
    ancestor = subprocess.run(
        ["git", "merge-base", "--is-ancestor", ref, "HEAD"], cwd=ROOT, check=False
    )
    return "diverged" if ancestor.returncode else "behind"


def move_branch(state: str) -> None:
    """Create the branch, or move it forward; the old value guards against a branch that moved."""
    ref = f"refs/heads/{BRANCH}"
    if state == "missing":
        git("update-ref", ref, "HEAD", "")
    else:
        git("update-ref", ref, "HEAD", git("rev-parse", ref))


# ---- 4. Push -------------------------------------------------------------------------------------


def push_remote() -> str | None:
    """The remote to push to (origin when there is one), or None when the repository has none."""
    remotes = git("remote").split()
    if not remotes:
        return None
    return "origin" if "origin" in remotes else remotes[0]


def describe(plan: Plan, state: str, remote: str | None) -> None:
    """Print what steps 2 to 4 would do, without doing any of it."""
    tag = plan.tag
    if plan.tagged:
        print(f"2. Would reuse the tag {tag} on this commit")
    elif plan.bump:
        old = project_version()
        print(
            f"2. Would change the version from {old} to {plan.version} in pyproject.toml and "
            f"uv.lock, commit them with CHANGELOG.md as 'chore: release {tag}', and tag that "
            f"commit {tag}"
        )
    else:
        print(f"2. Would tag this commit {tag} (the version in pyproject.toml, no bump)")
    if state == "same":
        print(f"3. The {BRANCH} branch is already at this commit; would do nothing")
    elif state == "missing":
        print(f"3. Would create the {BRANCH} branch at the tagged commit")
    else:
        print(f"3. Would move the {BRANCH} branch forward to the tagged commit")
    if remote:
        print(f"4. Would push {tag} and {BRANCH} to {remote}")
    else:
        print("4. This repository has no remote; nothing would be pushed")


def tag_commit(plan: Plan) -> None:
    """Step 2: commit the new version when there is one, and tag the result."""
    before = git("rev-parse", "HEAD")
    if plan.bump:
        commit_version(plan)
    try:
        create_tag(plan.tag)
    except ReleaseError:
        if plan.bump:  # move the branch back, restore the version files, unstage the changelog
            git("reset", "-q", "--soft", before)
            put_back_version_files(before)
            unstage_changelog(before)
        raise
    print(f"2. {'Committed the version and tagged' if plan.bump else 'Tagged'} {plan.tag}")


def release(bump: str | None, dry_run: bool) -> int:
    print("1. Checking the nursery is ready")
    problems = readiness()
    if problems:
        raise ReleaseError("\n- " + "\n- ".join(problems))
    plan = plan_version(bump)
    state = branch_state()
    if state == "diverged":
        raise ReleaseError(
            f"the {BRANCH} branch holds work that this commit does not; "
            "it only moves forward, so it is left alone"
        )
    problem = changelog_problem(plan)
    if problem:
        raise ReleaseError(problem)
    if plan.bump and state == "same":
        state = "behind"  # the version commit puts this commit ahead of the branch
    remote = push_remote()
    tag = plan.tag
    if dry_run:
        describe(plan, state, remote)
        return 0
    if plan.tagged:
        print(f"2. Reusing tag {tag}")
    else:
        tag_commit(plan)
        state = branch_state() if plan.bump else state
    if state == "same":
        print(f"3. The {BRANCH} branch is already at this commit; nothing to move")
    else:
        move_branch(state)
        print(f"3. {'Created' if state == 'missing' else 'Moved'} the {BRANCH} branch")
    if remote:
        git("push", remote, f"refs/tags/{tag}", f"refs/heads/{BRANCH}")
        print(f"4. Pushed {tag} and {BRANCH} to {remote}")
    else:
        print("4. This repository has no remote; nothing is pushed")
    print(f"Released {tag} on {BRANCH}.")
    return 0
