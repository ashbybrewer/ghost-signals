#!/usr/bin/env python3
"""Download and compact the current official HFCC shortwave schedule."""

from __future__ import annotations

import io
import json
import re
import urllib.request
import zipfile
from pathlib import Path


SOURCE = "https://new.hfcc.org/data/a26/a26allx2.zip"
ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "assets" / "hfcc-a26.json"
STATE_LINKED_CODES = {
    "AGM", "BBC", "CRI", "KBS", "NHK", "RFI", "RRO", "RUS", "TRT",
}


def coordinate(value: str) -> float:
    value = value.strip()
    if not value:
        return 0.0
    match = re.fullmatch(r"(\d+)([NSEW])(\d+)", value)
    if not match:
        return 0.0
    degrees, direction, minutes = match.groups()
    degrees = int(degrees)
    minutes = int(minutes)
    result = degrees + minutes / 60
    return -result if direction in "SW" else result


def reference_table(text: str) -> dict[str, str]:
    return {
        line[:3].strip(): line[4:].strip()
        for line in text.splitlines()
        if line and not line.startswith(";")
    }


def sites_table(text: str) -> dict[str, dict]:
    sites = {}
    for line in text.splitlines():
        if not line or line.startswith(";"):
            continue
        code = line[:3].strip()
        sites[code] = {
            "name": line[4:34].strip(),
            "country": line[35:38].strip(),
            "lat": coordinate(line[39:44]),
            "lon": coordinate(line[45:51]),
        }
    return sites


def schedule_rows(text: str, sites: dict, broadcasters: dict) -> list[dict]:
    rows = []
    for line in text.splitlines():
        if not line or line.startswith(";"):
            continue
        try:
            site_code = line[47:50].strip()
            broadcaster_code = line[117:120].strip()
            row = {
                "f": int(line[1:5]),
                "s": line[6:10].strip(),
                "e": line[11:15].strip(),
                "z": line[16:46].strip(),
                "site": site_code,
                "p": int(line[51:55].strip() or 0),
                "a": int(line[56:63].strip() or 0),
                "d": line[72:79].strip(),
                "fd": line[80:86].strip(),
                "td": line[87:93].strip(),
                "m": line[94:95].strip(),
                "l": line[102:112].strip(),
                "adm": line[113:116].strip(),
                "b": broadcaster_code,
                "name": broadcasters.get(broadcaster_code, broadcaster_code),
                "state": broadcaster_code in STATE_LINKED_CODES,
            }
            if site_code in sites:
                row["tx"] = sites[site_code]
            rows.append(row)
        except (ValueError, IndexError):
            continue
    return rows


def main() -> None:
    with urllib.request.urlopen(SOURCE, timeout=30) as response:
        package = response.read()
    with zipfile.ZipFile(io.BytesIO(package)) as archive:
        schedule = archive.read("A26all00.TXT").decode("latin-1")
        sites = sites_table(archive.read("site.txt").decode("latin-1"))
        broadcasters = reference_table(archive.read("broadcas.txt").decode("latin-1"))

    payload = {
        "season": "A26",
        "source": SOURCE,
        "rows": schedule_rows(schedule, sites, broadcasters),
    }
    OUTPUT.parent.mkdir(exist_ok=True)
    OUTPUT.write_text(json.dumps(payload, separators=(",", ":"), ensure_ascii=True))
    print(f"Wrote {len(payload['rows'])} schedule rows to {OUTPUT}")


if __name__ == "__main__":
    main()
