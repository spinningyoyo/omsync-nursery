"""The `nursery` command: the studio and the tools around it.

nursery                         open the studio in its own window (same as `nursery studio`)
nursery studio [--port N] [--no-window]
nursery check [SCENE]           compare saved pixel edits with what the code draws
nursery render SCENE PROPOSAL   draw a proposal headless into its .sheet.png
nursery proposals [SCENE]       print each proposal's review and pixel edits
nursery catalog [--only IDS] [--out DIR]  rebuild docs/scenes/<id>.md from the code
nursery brand [--check]         build the mascot, the favicons and the studio's mark from the grid
nursery release [--patch|--minor|--major] [--dry-run]
                                check the scenes and release them as a new version tag
nursery preview scene|sheet ... render scenes or a sprite sheet headless (see the skill)
"""

import argparse
import sys

DEFAULT_PORT = 8767


def parser() -> argparse.ArgumentParser:
    root = argparse.ArgumentParser(
        prog="nursery",
        description="The Nursery Studio and its tools.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__.split("\n\n", 1)[1],
    )
    commands = root.add_subparsers(dest="command")

    studio = commands.add_parser("studio", help="open the studio (the default)")
    studio.add_argument("--port", type=int, default=DEFAULT_PORT)
    studio.add_argument("--no-window", action="store_true", help="serve only; open nothing")

    check = commands.add_parser("check", help="compare saved pixel edits with the code")
    check.add_argument("scene", nargs="?", help="one scene (default: every scene with edits)")

    render = commands.add_parser("render", help="draw a proposal headless into its sheet")
    render.add_argument("scene")
    render.add_argument("proposal")

    proposals = commands.add_parser("proposals", help="print reviews and pixel edits")
    proposals.add_argument("scene", nargs="?")

    brand = commands.add_parser("brand", help="build the mascot and the favicons from its grid")
    brand.add_argument("--check", action="store_true", help="list stale files; change nothing")

    release = commands.add_parser(
        "release", help="check the scenes and release them on the release branch"
    )
    bump = release.add_mutually_exclusive_group()
    bump.add_argument("--patch", dest="bump", action="store_const", const="patch")
    bump.add_argument("--minor", dest="bump", action="store_const", const="minor")
    bump.add_argument("--major", dest="bump", action="store_const", const="major")
    release.add_argument("--dry-run", action="store_true", help="check and say what would happen")

    commands.add_parser(
        "catalog", help="rebuild docs/scenes/<id>.md, one file per scene", add_help=False
    )
    commands.add_parser("preview", help="render scenes or a sprite sheet", add_help=False)
    return root


def run_studio_command(args: argparse.Namespace) -> None:
    """The commands that need the studio's module, and so Selenium."""
    from nursery.studio import server

    if args.command in (None, "studio"):
        port = getattr(args, "port", DEFAULT_PORT)
        server.serve(port, window=not getattr(args, "no_window", False))
    elif args.command == "check":
        sys.exit(server.check(args.scene))
    elif args.command == "render":
        sys.exit(server.render(args.scene, args.proposal))
    elif args.command == "proposals":
        server.list_proposals(args.scene)


def main(argv: list[str] | None = None) -> None:
    argv = sys.argv[1:] if argv is None else argv
    try:
        # catalog and preview keep their own arguments.
        if argv[:1] == ["catalog"]:
            from nursery import catalog

            catalog.main(argv[1:])
            return
        if argv[:1] == ["preview"]:
            from nursery.preview import render

            render.main(argv[1:])
            return

        args = parser().parse_args(argv)
        if args.command == "brand":
            from nursery import brand

            sys.exit(brand.main(["--check"] if args.check else []))
        if args.command == "release":
            from nursery.release import release

            sys.exit(release(args.bump, args.dry_run))
        run_studio_command(args)
    except ModuleNotFoundError as error:
        if error.name == "selenium" or (error.name or "").startswith("selenium."):
            raise SystemExit(
                "nursery: the studio and its tools need this repository's dev dependencies. "
                "Run them from a checkout: uv sync, then uv run nursery."
            ) from None
        raise
