"""Fixtures for the end-to-end tests.

Every test drives the real thing from outside: the engine in headless Chrome on a page that stands
in for omsync's sign-in page, the `nursery` command as a subprocess, the studio over HTTP and in the
browser. There are no unit tests here.

The code under test is the `nursery` package that Python imports: the page serves its files, and the
command-line tests copy its source into a throwaway git repository.
"""

import contextlib
import http.server
import json
import mimetypes
import os
import re
import shutil
import socket
import subprocess
import sys
import threading
import time
from collections.abc import Iterator
from pathlib import Path
from typing import Any

import pytest

import nursery
from nursery import assets
from nursery.headless import new_driver, wait_for

PACKAGE = Path(nursery.__file__).resolve().parent  # the code under test
ROOT = PACKAGE.parents[1]  # the checkout
HOST_PAGE = Path(__file__).with_name("host.html")
TEMPLATE_VERSION = "0.1.1"  # the version the throwaway repositories start from
SCENE_IDS = [scene["id"] for scene in json.loads(assets.SCENES_JSON.read_text())]

# Where omsync serves the scene files (see docs/overview.md).
VENDOR = "/static/vendor/nursery/"

# A test must not depend on the owner's git settings (signing, hooks, a default branch name).
GIT_ENV = {
    "GIT_CONFIG_GLOBAL": os.devnull,
    "GIT_CONFIG_SYSTEM": os.devnull,
    "GIT_AUTHOR_NAME": "Test",
    "GIT_AUTHOR_EMAIL": "test@example.com",
    "GIT_COMMITTER_NAME": "Test",
    "GIT_COMMITTER_EMAIL": "test@example.com",
}


def pytest_collection_modifyitems(items: list[pytest.Item]) -> None:
    """A test that uses Chrome is a browser test, whatever else it is."""
    browser_fixtures = {"page", "driver", "studio"}
    for item in items:
        if browser_fixtures & set(getattr(item, "fixturenames", ())):
            item.add_marker(pytest.mark.browser)


# ---- A page that stands in for omsync ------------------------------------------------------------


class HostServer(http.server.ThreadingHTTPServer):
    """Serves the host page and the package's scene files at the paths omsync uses."""

    def __init__(self, files: Any):
        super().__init__(("127.0.0.1", 0), HostHandler)
        self.files = files

    @property
    def origin(self) -> str:
        return f"http://127.0.0.1:{self.server_port}"


class HostHandler(http.server.BaseHTTPRequestHandler):
    server: HostServer

    def log_message(self, *args: Any) -> None:
        pass

    def do_GET(self) -> None:
        path = self.path.split("?", 1)[0]
        target = self.server.files(path)
        if target is None or not target.is_file():
            self.send_response(404)
            self.end_headers()
            return
        body = target.read_bytes()
        kind = mimetypes.guess_type(target.name)[0] or "application/octet-stream"
        self.send_response(200)
        self.send_header("Content-Type", kind)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)


def package_files(js: Path, scenes_json: Path, scenes_css: Path) -> Any:
    """The routes of omsync's static setup: the page, the vendor folder, scenes.json, scenes.css."""

    def route(path: str) -> Path | None:
        if path == "/":
            return HOST_PAGE
        if path == "/scenes.json":
            return scenes_json
        if path == "/scenes.css":
            return scenes_css
        if path.startswith(VENDOR):
            target = (js / path.removeprefix(VENDOR)).resolve()
            return target if target.is_relative_to(js.resolve()) else None
        return None

    return route


@contextlib.contextmanager
def serve_host(js: Path, scenes_json: Path, scenes_css: Path) -> Iterator[HostServer]:
    server = HostServer(package_files(js, scenes_json, scenes_css))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    try:
        yield server
    finally:
        server.shutdown()
        server.server_close()


@pytest.fixture(scope="session")
def host_server() -> Iterator[HostServer]:
    with serve_host(assets.JS, assets.SCENES_JSON, assets.SCENES_CSS) as server:
        yield server


@pytest.fixture(scope="session")
def driver() -> Iterator[Any]:
    chrome = new_driver()
    chrome.set_window_size(1280, 800)
    chrome.set_script_timeout(60)
    yield chrome
    chrome.quit()


def console_problems(chrome: Any) -> list[str]:
    """Severe console messages since the last call, not counting the favicon a bare page lacks."""
    return [
        entry["message"]
        for entry in chrome.get_log("browser")
        if entry["level"] == "SEVERE" and "favicon" not in entry["message"]
    ]


class Page:
    """The host page in Chrome. `run` evaluates a script in it, with `host` in scope."""

    def __init__(self, chrome: Any, origin: str):
        self.chrome = chrome
        self.origin = origin

    def open(self, *, clock: str = "fake", seed: int = 1) -> "Page":
        console_problems(self.chrome)  # forget what an earlier test left in the log
        self.chrome.get(f"{self.origin}/?clock={clock}&seed={seed}")
        ready = wait_for(self.chrome, "window.__ready || (window.__errors.length && 'failed')", 15)
        if ready != "failed" and ready is not True:
            raise AssertionError("the host page never finished loading")
        if ready == "failed":
            raise AssertionError(f"the engine failed to load: {self.errors()}")
        return self

    def run(self, script: str, *args: Any) -> Any:
        return self.chrome.execute_script(script, *args)

    def make(
        self, scene: str, *, stage: int = 0, reduced: bool = False, theme: str = "light"
    ) -> int:
        return self.run(
            "return host.make({scene: arguments[0], stage: arguments[1], reduced: arguments[2],"
            " theme: arguments[3]})",
            scene,
            stage,
            reduced,
            theme,
        )

    def advance(self, ms: int) -> None:
        self.run("host.advance(arguments[0])", ms)

    def errors(self) -> list[str]:
        """Errors the page saw, and severe console messages."""
        return [*self.run("return window.__errors"), *console_problems(self.chrome)]


@pytest.fixture
def page(driver: Any, host_server: HostServer) -> Page:
    return Page(driver, host_server.origin).open()


# ---- The command line, on a throwaway copy of the nursery ----------------------------------------


@pytest.fixture(scope="session")
def nursery_template(tmp_path_factory: pytest.TempPathFactory) -> Path:
    """A git repository holding the code under test, committed on `main`, with no remote.

    It has what the commands need to run (the package, pyproject.toml, uv.lock, .gitignore, and the
    README.md and LICENSE that pyproject.toml names for the build) and is never the real checkout,
    so a test cannot change the owner's files or their git history.
    """
    repo = tmp_path_factory.mktemp("template") / "nursery"
    repo.mkdir()
    shutil.copytree(
        PACKAGE, repo / "src" / "nursery", ignore=shutil.ignore_patterns("__pycache__", "*.pyc")
    )
    for name in (
        "pyproject.toml",
        "uv.lock",
        ".gitignore",
        ".python-version",
        "README.md",
        "LICENSE",
    ):
        if (ROOT / name).is_file():
            shutil.copy2(ROOT / name, repo / name)
    pin_version(repo, TEMPLATE_VERSION)
    git(repo, "init", "-q", "-b", "main")
    git(repo, "add", "-A")
    git(repo, "commit", "-q", "-m", "chore: start")
    return repo


def pin_version(repo: Path, version: str) -> None:
    """Make the copy's own version `version` in pyproject.toml and uv.lock.

    The release tests name versions, so they start from a fixed one, whatever the real checkout
    has been released as.
    """
    pyproject = repo / "pyproject.toml"
    pyproject.write_text(
        re.sub(r'(?m)^version = ".*"$', f'version = "{version}"', pyproject.read_text(), count=1)
    )
    lock = repo / "uv.lock"
    lock.write_text(
        re.sub(
            r'(name = "omsync-nursery"\nversion = )"[^"]*"',
            rf'\g<1>"{version}"',
            lock.read_text(),
            count=1,
        )
    )


@pytest.fixture
def repo(nursery_template: Path, tmp_path: Path) -> Path:
    """A fresh copy of the template that a test may change in any way."""
    target = tmp_path / "nursery"
    shutil.copytree(nursery_template, target, symlinks=True)
    return target


def git(repo: Path, *args: str, check: bool = True) -> str:
    done = subprocess.run(
        ["git", *args],
        cwd=repo,
        env={**os.environ, **GIT_ENV},
        capture_output=True,
        text=True,
        check=False,
    )
    if check and done.returncode:
        raise AssertionError(f"git {' '.join(args)} failed: {done.stderr}")
    return done.stdout.strip()


def cli_environment(repo: Path | None) -> dict[str, str]:
    """The environment of a `nursery` subprocess. With a repo, it runs that copy's code."""
    env = {**os.environ, **GIT_ENV, "PYTHONDONTWRITEBYTECODE": "1"}
    if repo is not None:
        env["PYTHONPATH"] = os.pathsep.join([str(repo / "src"), *sys.path[1:]])
    return env


def nursery_cli(repo: Path, *args: str, timeout: float = 300) -> subprocess.CompletedProcess:
    """Run `nursery ...` as a subprocess in a throwaway repository, as its owner would.

    The command is the copy's own, so its tools find the files of that copy.
    """
    return subprocess.run(
        [sys.executable, "-m", "nursery", *args],
        cwd=repo,
        env=cli_environment(repo),
        capture_output=True,
        text=True,
        timeout=timeout,
        check=False,
    )


# ---- The studio ----------------------------------------------------------------------------------


def free_port() -> int:
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]


@pytest.fixture(scope="module")
def studio(nursery_template: Path, tmp_path_factory: pytest.TempPathFactory) -> Iterator[str]:
    """`nursery studio --no-window` on a free port, in a copy of the nursery. Gives its URL."""
    repo = tmp_path_factory.mktemp("studio") / "nursery"
    shutil.copytree(nursery_template, repo, symlinks=True)
    port = free_port()
    process = subprocess.Popen(
        [sys.executable, "-m", "nursery", "studio", "--no-window", "--port", str(port)],
        cwd=repo,
        env=cli_environment(repo),
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )
    url = f"http://127.0.0.1:{port}"
    try:
        deadline = time.monotonic() + 30
        while time.monotonic() < deadline:
            if process.poll() is not None:
                raise AssertionError(f"the studio stopped: {process.stdout.read()}")
            with contextlib.suppress(OSError), socket.create_connection(("127.0.0.1", port), 0.2):
                break
            time.sleep(0.1)
        else:
            raise AssertionError("the studio never started listening")
        yield url
    finally:
        process.terminate()
        try:
            process.wait(10)
        except subprocess.TimeoutExpired:
            process.kill()
