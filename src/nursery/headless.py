"""Headless Chrome for the nursery's tools: one way to open it and one way to wait for a page.

The studio's check and render, the catalogue and `nursery preview` each load a page of their own
and read its answer from a window property. Selenium comes in only when a driver opens, so the
studio can serve without it.
"""

import time
from typing import Any


def new_driver(*, hide_scrollbars: bool = False) -> Any:
    """A headless Chrome at one device pixel per CSS pixel, so canvases and sizes are exact."""
    from selenium import webdriver

    options = webdriver.ChromeOptions()
    options.add_argument("--headless=new")
    options.add_argument("--force-device-scale-factor=1")
    if hide_scrollbars:
        options.add_argument("--hide-scrollbars")
    return webdriver.Chrome(options=options)


def wait_for(driver: Any, expression: str, timeout: float, interval: float = 0.1) -> Any:
    """The first truthy value of a JavaScript expression in the page, or None after `timeout`
    seconds. The page leaves its answer in a window property that the expression reads."""
    deadline = time.monotonic() + timeout
    while True:
        value = driver.execute_script(f"return {expression} || null")
        if value or time.monotonic() >= deadline:
            return value or None
        time.sleep(interval)


def studio_result(query: str) -> dict:
    """Load the studio with a query (check=, render=) in headless Chrome and return what it
    leaves in window.__result."""
    # The server imports catalog, which imports this module, so it is imported when needed.
    from nursery.studio import server

    http_server = server.start(0)
    driver = new_driver()
    try:
        driver.get(f"http://127.0.0.1:{http_server.server_port}/?{query}")
        result = wait_for(driver, "window.__result", timeout=120)
    finally:
        driver.quit()
        http_server.shutdown()
    if result is None:
        raise SystemExit("the studio page never finished (a syntax error in a module?)")
    if "error" in result:
        raise SystemExit(f"the studio page failed: {result['error']}")
    return result
