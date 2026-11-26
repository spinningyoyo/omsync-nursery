"""Deterministic offline gate and golden-record verifier for nursery scenes.

Runs `scripts/check_scenes.mjs` in Node to verify:
  - every sprite in every scene draws without throwing and paints > 0 pixels (light & dark)
  - every cast entry, sprite key, and family reference matches 1-to-1
  - every scene's generate/init/onGrow/update/drawBack/draw lifecycle runs stages 0..8 cleanly
  - per run (light and dark, 240 and 90 columns) what each animal does, how many steps each
    drawn thing is drawn in, and which is drawn before which, match the committed records in
    `scripts/scene_records/<scene>.json`

Usage:
  python3 scripts/check_scenes.py           # verify (used by scripts/check.sh)
  python3 scripts/check_scenes.py --record  # update golden records after intentional changes
"""

from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
SCENES_DIR = ROOT / "src" / "nursery" / "assets" / "js" / "scenes"
RECORDS_DIR = ROOT / "scripts" / "scene_records"
SCRIPT = ROOT / "scripts" / "check_scenes.mjs"


def js_command() -> list[str]:
    # Node only: another engine rounds some maths differently, so the records would not match.
    if node := shutil.which("node"):
        return [node, str(SCRIPT)]
    raise RuntimeError("check_scenes: needs Node.js (`node`); see README.md")


def run_engine() -> tuple[list[str], dict[str, list[str]], dict[str, Any], int]:
    proc = subprocess.run(js_command(), cwd=ROOT, capture_output=True, text=True, check=False)
    if proc.returncode != 0:
        return [f"check_scenes.mjs exited {proc.returncode}: {proc.stderr.strip()}"], {}, {}, 0
    payload = json.loads(proc.stdout)
    return payload["errors"], payload["actorMap"], payload["records"], payload["scenes"]


def check_structure(actor_map: dict[str, list[str]]) -> list[str]:
    errors: list[str] = []
    scenes_build = (ROOT / "src" / "nursery" / "scenes_build.py").read_text(encoding="utf-8")
    if re.search(r"^\s*import re\b", scenes_build, re.MULTILINE):
        errors.append("src/nursery/scenes_build.py must not use `re` to parse JavaScript")

    for sid, actor_ids in sorted(actor_map.items()):
        path = SCENES_DIR / f"{sid}.js"
        text = path.read_text(encoding="utf-8")
        if "cast: extras.cast" not in text:
            errors.append(f"{sid}.js: must export `cast: extras.cast` (single unified cast list)")

        for aid in actor_ids:
            patterns = (
                (rf"\bflyBy\([^)]*\bx\.{aid}\b", "duplicate flyBy"),
                (rf"\bflyByPerch\([^)]*\bx\.{aid}\b", "duplicate flyByPerch"),
                (rf"\bdrift\([^)]*\bx\.{aid}\b", "duplicate drift"),
                (rf"\benter\([^)]*\bx\.{aid}\b", "duplicate enter"),
                (rf"\bwander\([^)]*\bx\.{aid}\b", "duplicate wander"),
                (rf"\bx\.{aid}\.active\s*=", "duplicate active assignment"),
            )
            for pat, reason in patterns:
                if re.search(pat, text):
                    errors.append(f"{sid}.js: actor '{aid}' is owned by runCast ({reason})")
    return errors


def diff_actors(expected: dict[str, Any], actual: dict[str, Any]) -> list[str]:
    details: list[str] = []
    for path in sorted(set(expected) | set(actual)):
        if path not in expected:
            details.append(f"actor '{path}' added")
        elif path not in actual:
            details.append(f"actor '{path}' removed")
        elif expected[path] != actual[path]:
            changes = [
                f"{field} {expected[path].get(field)} -> {actual[path].get(field)}"
                for field in sorted(set(expected[path]) | set(actual[path]))
                if expected[path].get(field) != actual[path].get(field)
            ]
            details.append(f"actor '{path}': {', '.join(changes)}")
    return details


def diff_record(sid: str, expected: dict[str, Any], actual: dict[str, Any]) -> list[str]:
    diffs: list[str] = []
    exp_runs = expected.get("runs", {})
    act_runs = actual.get("runs", {})
    for run_key in sorted(set(exp_runs) | set(act_runs)):
        er = exp_runs.get(run_key)
        ar = act_runs.get(run_key)
        if er is None or ar is None:
            diffs.append(f"{sid} [{run_key}]: run added or removed")
            continue
        details = []
        drawn_e, drawn_a = er.get("drawn", {}), ar.get("drawn", {})
        details.extend(
            f"{name} drawn in {drawn_e.get(name, 0)} -> {drawn_a.get(name, 0)} steps"
            for name in sorted(set(drawn_e) | set(drawn_a))
            if drawn_e.get(name, 0) != drawn_a.get(name, 0)
        )
        order_e, order_a = set(er.get("order", [])), set(ar.get("order", []))
        for pair in sorted(order_e - order_a):
            a, b = pair.split(" < ")
            if f"{b} < {a}" in order_a:
                details.append(f"order flipped: was {a} before {b}, now {b} before {a}")
        details.extend(diff_actors(er.get("actors", {}), ar.get("actors", {})))
        diffs.extend(f"{sid} [{run_key}]: {d}" for d in details)
    return diffs


def check_records(records: dict[str, Any]) -> list[str]:
    if not RECORDS_DIR.is_dir():
        return [
            "missing scripts/scene_records/ — run "
            "`python3 scripts/check_scenes.py --record` to create baseline"
        ]

    expected_files = {p.stem for p in RECORDS_DIR.glob("*.json")}
    errors = [
        f"stale scene record scripts/scene_records/{sid}.json"
        for sid in sorted(expected_files - set(records))
    ]
    for sid, actual in sorted(records.items()):
        path = RECORDS_DIR / f"{sid}.json"
        if not path.is_file():
            errors.append(
                f"{sid}: missing golden record {path.relative_to(ROOT)} "
                "(run `python3 scripts/check_scenes.py --record`)"
            )
            continue
        expected = json.loads(path.read_text(encoding="utf-8"))
        errors.extend(diff_record(sid, expected, actual))
    return errors


def write_records(records: dict[str, Any]) -> None:
    RECORDS_DIR.mkdir(parents=True, exist_ok=True)
    for path in sorted(RECORDS_DIR.glob("*.json")):
        if path.stem not in records:
            path.unlink()
    for sid, rec in sorted(records.items()):
        path = RECORDS_DIR / f"{sid}.json"
        path.write_text(json.dumps(rec, indent=2) + "\n", encoding="utf-8")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Verify or record deterministic scene baselines.")
    parser.add_argument(
        "--record",
        action="store_true",
        help="write golden records to scripts/scene_records/<scene>.json",
    )
    args = parser.parse_args(argv)

    runtime_errors, actor_map, records, count = run_engine()
    structural_errors = check_structure(actor_map) if actor_map else []
    base_errors = runtime_errors + structural_errors
    if base_errors:
        for err in base_errors:
            print(f"ERROR: {err}", file=sys.stderr)
        print(f"check_scenes: {len(base_errors)} error(s) found", file=sys.stderr)
        return 1

    if args.record:
        write_records(records)
        print(f"recorded {count} deterministic scene baselines in scripts/scene_records/")
        return 0

    record_errors = check_records(records)
    if record_errors:
        for err in record_errors:
            print(f"REGRESSION: {err}", file=sys.stderr)
        print(
            f"check_scenes: {len(record_errors)} behaviour/render diff(s) found. "
            "If intentional (not a refactor), run: python3 scripts/check_scenes.py --record",
            file=sys.stderr,
        )
        return 1

    print(
        f"scene gate passed: {count} scenes, behaviour matches the records, "
        "cast unified, 0 runtime errors"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
