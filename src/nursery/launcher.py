"""Opens the studio in its own app window: Chrome (or another Chromium browser) with --app shows
the page without tabs or an address bar. Without one, it opens a normal browser tab."""

import shutil
import subprocess
import sys
import webbrowser
from pathlib import Path

MAC_APPS = ("Google Chrome", "Chromium", "Microsoft Edge", "Brave Browser")
COMMANDS = ("google-chrome", "google-chrome-stable", "chromium", "chromium-browser", "msedge")
WINDOW = "1600,1000"


def chromium() -> str | None:
    """The first Chromium browser found on this machine, as a path to run."""
    if sys.platform == "darwin":
        for root in (Path("/Applications"), Path.home() / "Applications"):
            for app in MAC_APPS:
                binary = root / f"{app}.app" / "Contents" / "MacOS" / app
                if binary.is_file():
                    return str(binary)
    for command in COMMANDS:
        if found := shutil.which(command):
            return found
    return None


def open_app(url: str) -> None:
    """Opens url in an app window, or in a browser tab when no Chromium browser is installed."""
    browser = chromium()
    if browser is None:
        webbrowser.open(url)
        return
    subprocess.Popen(
        [browser, f"--app={url}", f"--window-size={WINDOW}"],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        start_new_session=True,
    )
