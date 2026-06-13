#!/usr/bin/env python3
"""Install the optional KiwiSDR live-capture runtime outside the workspace."""

from __future__ import annotations

import subprocess
import sys
import venv
from pathlib import Path


HOME = Path.home() / ".local" / "share" / "ghost-signals"
VENV = HOME / "venv"
CLIENT = HOME / "kiwiclient"


def run(*args: str) -> None:
    subprocess.run(args, check=True)


def main() -> None:
    HOME.mkdir(parents=True, exist_ok=True)
    if not (VENV / "bin" / "python").exists():
        venv.create(VENV, with_pip=True)
    python = str(VENV / "bin" / "python")
    run(python, "-m", "pip", "install", "--quiet", "numpy")
    if not CLIENT.exists():
        run("git", "clone", "--depth", "1", "https://github.com/jks-prv/kiwiclient.git", str(CLIENT))
    else:
        run("git", "-C", str(CLIENT), "pull", "--ff-only")
    print(f"Live monitor ready at {HOME}")


if __name__ == "__main__":
    try:
        main()
    except subprocess.CalledProcessError as error:
        print(f"Live monitor setup failed: {error}", file=sys.stderr)
        raise SystemExit(1)
