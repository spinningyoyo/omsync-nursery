"""Drive the real engine through every scene, theme and page size in headless Chrome and check the
art against the design rules (rules.js). See .claude/skills/verify-nursery/SKILL.md.

    uv run nursery verify [SCENE ...] [--rule NAME ...] [--jobs N] [--doctor] [--triage]

Each run writes .nursery/verify/<run-id>/findings.json, which the studio's Verify view lists and
replays. The owner's triage marks from that view are in .nursery/verify/triage.json.
"""

import argparse
import base64
import functools
import hashlib
import http.server
import json
import queue
import shutil
import sys
import tempfile
import threading
import time
import urllib.parse
from collections.abc import Callable
from pathlib import Path

from nursery.headless import new_driver, wait_for
from nursery.paths import JS_DIR, ROOT, SCENES_JSON, SHARED, STORE

HERE = Path(__file__).resolve().parent
RUNS = STORE / "verify"
TRIAGE = RUNS / "triage.json"
VERDICTS = {"bug": "real bug", "strict": "rule too strict", "ignore": "ignore"}
RULE_NAMES = [
    "scale",
    "pose",
    "gap",
    "walk-cadence",
    "grounded",
    "perched",
    "night",
    "no-errors",
    "engine-contract",
]  # the names in rules.js, in its order


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def serve() -> tuple[http.server.ThreadingHTTPServer, Path]:
    """A temporary site that links the repository's modules, so the page runs the real engine."""
    site = Path(tempfile.mkdtemp())
    (site / "js").symlink_to(JS_DIR)
    (site / "shared").symlink_to(SHARED)
    (site / "verify").symlink_to(HERE)
    (site / "scenes.json").symlink_to(SCENES_JSON)
    server = http.server.ThreadingHTTPServer(
        ("127.0.0.1", 0), functools.partial(Quiet, directory=str(site))
    )
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server, site


def run_job(driver, base: str, job: dict, timeout: float) -> dict:
    query = urllib.parse.quote(json.dumps(job))
    driver.get(f"{base}/verify/page.html?job={query}")
    result = wait_for(driver, "window.result", timeout=timeout)
    if result is None:
        raise SystemExit(f"verify: the page never finished {job}")
    if "error" in result:
        raise SystemExit(f"verify: the page failed on {job}:\n{result['error']}")
    return result


def run_jobs(
    jobs: list[dict],
    workers: int,
    timeout: float = 900,
    progress: Callable[[int, int], None] | None = None,
) -> list[dict]:
    """Run each job in a headless Chrome, `workers` at a time; results come back in job order."""
    server, site = serve()
    base = f"http://127.0.0.1:{server.server_port}"
    todo: queue.Queue = queue.Queue()
    for i, job in enumerate(jobs):
        todo.put((i, job))
    results: list[dict | None] = [None] * len(jobs)
    failures: list[BaseException] = []
    done = [0]
    lock = threading.Lock()

    def worker() -> None:
        driver = new_driver()
        driver.set_script_timeout(timeout)
        driver.set_page_load_timeout(timeout)
        try:
            while not failures:
                try:
                    i, job = todo.get_nowait()
                except queue.Empty:
                    return
                results[i] = run_job(driver, base, job, timeout)
                with lock:
                    done[0] += 1
                    if progress:
                        progress(done[0], len(jobs))
        except BaseException as error:  # noqa: BLE001 - re-raised on the main thread
            failures.append(error)
        finally:
            driver.quit()

    threads = [threading.Thread(target=worker) for _ in range(min(workers, len(jobs)))]
    try:
        for t in threads:
            t.start()
        for t in threads:
            t.join()
    finally:
        server.shutdown()
        shutil.rmtree(site)
    if failures:
        raise failures[0]
    return [r for r in results if r is not None]


def save_evidence(results: list[dict], folder: Path) -> list[dict]:
    """Write each finding's crop (when it has one) and text under `folder`; return the findings."""
    folder.mkdir(parents=True, exist_ok=True)
    findings = []
    counter: dict[str, int] = {}
    for result in results:
        for f in result["findings"]:
            stem = f"{f['rule']}-{f['scene']}-{f['theme']}-{f['size']}"
            counter[stem] = counter.get(stem, 0) + 1
            name = f"{stem}-{counter[stem]}"
            url = result["crops"].get(f.get("crop") or "")
            f["png"] = None
            f["image"] = None
            f["group"] = group_key(f)
            if url:
                (folder / f"{name}.png").write_bytes(base64.b64decode(url.split(",", 1)[1]))
                f["png"] = str((folder / f"{name}.png").relative_to(ROOT))
                f["image"] = f"{name}.png"
            f["txt"] = str((folder / f"{name}.txt").relative_to(ROOT))
            (folder / f"{name}.txt").write_text(describe(f) + "\n", encoding="utf-8")
            findings.append(f)
    return findings


def group_key(f: dict) -> str:
    """What a triage mark is kept under: one rule, one animal, one fault, in any scene or run."""
    return f"{f['rule']}|{f.get('actor') or ''}|{f['says']}"


def code_fingerprint() -> str:
    """A hash of the code a run depends on (the engine, scenes, kit, tags and this checker), so the
    studio can say when a replay no longer shows the code the run checked."""
    digest = hashlib.sha256()
    files = [*sorted(JS_DIR.rglob("*.js")), SHARED / "families.js", *sorted(HERE.glob("*.js"))]
    for path in files:
        digest.update(path.name.encode())
        digest.update(path.read_bytes())
    return digest.hexdigest()[:16]


def read_triage() -> dict:
    try:
        return json.loads(TRIAGE.read_text())
    except (OSError, ValueError):
        return {}


def print_triage() -> int:
    """The owner's marks from the studio's Verify view, by verdict."""
    marks = read_triage()
    if not marks:
        print("No triage marks yet. Mark findings in the studio's Verify view.")
        return 0
    for verdict, label in VERDICTS.items():
        chosen = {k: v for k, v in marks.items() if v.get("verdict") == verdict}
        if not chosen:
            continue
        print(f"{label} ({len(chosen)}):")
        for key, mark in sorted(chosen.items()):
            rule, actor, says = [*key.split("|"), "", ""][:3]
            notes = f": {mark['notes']}" if mark.get("notes") else ""
            print(f"  {rule}: {actor or '(page)'} {says}{notes}")
    return 0


def where(f: dict) -> str:
    if f["scene"] == "kit":
        return "the kit"
    stage = "" if f.get("stage") is None else f" stage {f['stage']}"
    clock = "" if f.get("time") is None else f" t={f['time']}s"
    return f"{f['scene']} {f['theme']} {f['size']} ({f.get('width', '?')} px){stage}{clock}"


def describe(f: dict) -> str:
    """One finding in plain words."""
    who = f"{f['actor']} " if f.get("actor") else ""
    measured = f"{f['value']} {f['unit']}".strip() if f.get("value") is not None else ""
    times = f" ({f['count']} frames)" if f.get("count", 1) > 1 else ""
    detail = f"; {f['detail']}" if f.get("detail") else ""
    return (
        f"{f['rule']}: {where(f)}: {who}{f['says']}: measured {measured}, limit {f['limit']}"
        f"{times}{detail}"
    )


def scope_lines(
    jobs: list[dict], results: list[dict], rules: list[str], seconds: float
) -> list[str]:
    art = [r for r in results if not r["job"].get("kind")]
    frames = sum(r["stats"].get("frames", 0) for r in art)
    draws: dict[str, int] = {}
    unclassified: set[str] = set()
    for r in art:
        for driver, n in r["stats"]["draws"].items():
            draws[driver] = draws.get(driver, 0) + n
        unclassified.update(r["stats"].get("unclassified", {}))
    scenes = sorted({j["scene"] for j in jobs if j["scene"] != "kit"})
    early = next((j["early"] for j in jobs if "early" in j), 30)
    full = next((j["full"] for j in jobs if "full" in j), 150)
    perched = sum(r["stats"].get("perched", 0) for r in art)
    lines = [
        f"Covered: {len(scenes)} scenes ({', '.join(scenes)}), light and dark, page sizes "
        "1200x520 and 390x700, watering stages 1 and 8 "
        f"({early:g} s watched at stage 1, {full:g} s at stage 8), simulated at 8 "
        "frames a second with a fixed clock and seed 1.",
        f"Rules run: {', '.join(rules)}. {len(art)} art runs ({frames} frames, "
        f"{sum(draws.values())} "
        f"animal draws by {len(draws)} drivers) and {len(results) - len(art)} engine and kit runs.",
        f"Perched-bird frames checked: {perched}. Wall time {seconds:.0f} s.",
    ]
    if unclassified:
        lines.append(f"Drivers not in actors.js (unclassified): {', '.join(sorted(unclassified))}.")
    lines.append(
        "Not covered: animals a scene draws without a kit driver (scene-local sprites, plants, "
        "effects), walkers with no stride clock for walk-cadence, stages 2 to 7, and the stage 2 "
        "rules "
        "(whole-body, density, first-watering, food-chain, flyer-mix, wow-event timing, page-edge, "
        "ease-at-rest)."
    )
    return lines


def doctor() -> int:
    """Read-only: Chrome starts, the engine loads and draws a frame."""
    out = run_jobs([{"kind": "doctor"}], 1, timeout=120)[0]
    print(f"Chrome and the engine load: {len(out['scenes'])} scenes ({', '.join(out['scenes'])}).")
    if out["errors"] or not out["frame"]:
        print(f"errors: {out['errors']}")
        return 1
    return 0


def main(argv: list[str]) -> int:  # noqa: C901 - one flat argument-to-jobs pipeline
    parser = argparse.ArgumentParser(prog="nursery verify", description=__doc__.split("\n\n")[0])
    parser.add_argument("scenes", nargs="*", help="scene ids (default: every scene)")
    parser.add_argument("--rule", action="append", default=[], help="a rule name (default: all)")
    parser.add_argument("--jobs", type=int, default=10, help="Chrome windows at once")
    parser.add_argument(
        "--doctor", action="store_true", help="check that Chrome and the engine load"
    )
    parser.add_argument("--early", type=float, help="seconds watched at stage 1 (default 30)")
    parser.add_argument("--full", type=float, help="seconds watched at stage 8 (default 150)")
    parser.add_argument(
        "--triage", action="store_true", help="print the marks saved in the studio's Verify view"
    )
    parser.add_argument("--progress", action="store_true", help=argparse.SUPPRESS)  # the studio's
    args = parser.parse_args(argv)
    if args.doctor:
        return doctor()
    if args.triage:
        return print_triage()
    ids = [s["id"] for s in json.loads(SCENES_JSON.read_text())]
    unknown = [s for s in args.scenes if s not in ids]
    if unknown:
        raise SystemExit(
            f"nursery verify: no scene {', '.join(unknown)}; the scenes are {', '.join(ids)}"
        )
    scenes = args.scenes or ids
    names = RULE_NAMES
    bad = [r for r in args.rule if r not in names]
    if bad:
        raise SystemExit(
            f"nursery verify: no rule {', '.join(bad)}; the rules are {', '.join(names)}"
        )
    rules = args.rule or names
    wants_art = any(r not in ("engine-contract", "scale") for r in rules)
    wants_engine = any(r in ("engine-contract", "no-errors") for r in rules)
    jobs: list[dict] = []
    options = {k: v for k, v in (("early", args.early), ("full", args.full)) if v is not None}
    base = {"rules": rules, **options}
    for scene in scenes:
        for size in ("wide", "phone"):
            if wants_art:
                jobs += [
                    {**base, "scene": scene, "theme": t, "size": size} for t in ("light", "dark")
                ]
            if wants_engine:
                jobs.append({**base, "kind": "engine", "scene": scene, "size": size})
    if "scale" in rules:
        jobs.append({**base, "kind": "static", "scene": "kit", "size": "wide"})
    started = time.monotonic()
    stamp = time.strftime("%Y-%m-%dT%H:%M:%S")
    fingerprint = code_fingerprint()

    def progress(done: int, total: int) -> None:
        print(f"verify-progress: {done}/{total}", file=sys.stderr, flush=True)

    results = run_jobs(jobs, args.jobs, progress=progress if args.progress else None)
    seconds = time.monotonic() - started
    folder = RUNS / time.strftime("%Y%m%d-%H%M%S")
    findings = save_evidence(results, folder)
    record = {
        "id": folder.name,
        "started": stamp,
        "seconds": round(seconds, 1),
        "scenes": scenes,
        "rules": rules,
        "early": args.early if args.early is not None else 30,
        "full": args.full if args.full is not None else 150,
        "seed": 1,
        "fingerprint": fingerprint,
        "scope": scope_lines(jobs, results, rules, seconds),
        "findings": findings,
    }
    (folder / "findings.json").write_text(json.dumps(record, indent=1) + "\n", encoding="utf-8")
    if args.progress:
        print(f"verify-run: {folder.name}", file=sys.stderr, flush=True)
    for f in findings:
        print(describe(f) + (f"  [{f['png']}]" if f.get("png") else ""))
    print()
    for line in scope_lines(jobs, results, rules, seconds):
        print(line)
    by_rule: dict[str, int] = {}
    for f in findings:
        by_rule[f["rule"]] = by_rule.get(f["rule"], 0) + 1
    if findings:
        counts = ", ".join(f"{r}: {n}" for r, n in sorted(by_rule.items()))
        print(f"FINDINGS: {len(findings)} ({counts}). Evidence in {folder.relative_to(ROOT)}/")
        return 1
    print("All rules pass.")
    return 0
