#!/usr/bin/env python3
"""Tiny local server for the Ghost Signals portfolio prototype."""

from __future__ import annotations

import json
import socket
import subprocess
import tempfile
import time
from concurrent.futures import ThreadPoolExecutor
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse


ROOT = Path(__file__).resolve().parent
PORT = 8087
LIVE_HOME = Path.home() / ".local" / "share" / "ghost-signals"
LIVE_PYTHON = LIVE_HOME / "venv" / "bin" / "python"
KIWI_RECORDER = LIVE_HOME / "kiwiclient" / "kiwirecorder.py"

RECEIVERS = [
    {
        "id": "twente",
        "name": "University of Twente",
        "location": "Enschede, Netherlands",
        "lat": 52.2292,
        "lon": 6.875,
        "url": "http://websdr.ewi.utwente.nl:8901/",
        "range": "0.000–29.160 MHz",
        "coverage": [0.0, 29.16],
        "type": "WebSDR",
    },
    {
        "id": "utah-1",
        "name": "Northern Utah SDR",
        "location": "Corinne, Utah, USA",
        "lat": 41.6042,
        "lon": -112.292,
        "url": "http://websdr1.sdrutah.org:8901/",
        "range": "0.125–7.509 MHz",
        "coverage": [0.125, 7.509],
        "type": "WebSDR",
    },
    {
        "id": "kfs",
        "name": "KFS Pacific Coast",
        "location": "Half Moon Bay, California, USA",
        "lat": 37.3958,
        "lon": -122.375,
        "url": "http://websdr1.kfsdr.com:8901/",
        "range": "3.316–28.682 MHz",
        "coverage": [3.316, 28.682],
        "type": "WebSDR",
    },
    {
        "id": "pardinho",
        "name": "Pardinho WebSDR",
        "location": "Pardinho, São Paulo, Brazil",
        "lat": -23.1042,
        "lon": -48.375,
        "url": "http://appr.org.br:8901/",
        "range": "1.708–29.014 MHz",
        "coverage": [1.708, 29.014],
        "type": "WebSDR",
    },
    {
        "id": "maasbree",
        "name": "Maasbree Low Noise",
        "location": "Maasbree, Netherlands",
        "lat": 51.3729,
        "lon": 6.0458,
        "url": "http://sdr.websdrmaasbree.nl:8901/",
        "range": "1.799–21.609 MHz",
        "coverage": [1.799, 21.609],
        "type": "WebSDR",
    },
    {
        "id": "bordeaux",
        "name": "Bordeaux Ham SDR",
        "location": "Bordeaux, France",
        "lat": 44.6458,
        "lon": -0.5417,
        "url": "http://ham.websdrbordeaux.fr:8000/",
        "range": "3.408–30.024 MHz",
        "coverage": [3.408, 30.024],
        "type": "WebSDR",
    },
    {
        "id": "na5b",
        "name": "NA5B East Coast",
        "location": "Washington, DC area, USA",
        "lat": 38.7708,
        "lon": -77.2083,
        "url": "http://na5b.com:8901/",
        "range": "0.000–29.009 MHz",
        "coverage": [0.0, 29.009],
        "type": "WebSDR",
    },
    {
        "id": "yaroslavl",
        "name": "RD3MK Yaroslavl",
        "location": "Yaroslavl, Russia",
        "lat": 57.6646,
        "lon": 39.9875,
        "url": "http://websdr.srr-76.ru/",
        "range": "1.799–29.484 MHz",
        "coverage": [1.799, 29.484],
        "type": "WebSDR",
    },
    {
        "id": "k1ra-virginia",
        "name": "K1RA Virginia KiwiSDR",
        "location": "Warrenton, Virginia, USA",
        "lat": 38.7424,
        "lon": -77.7979,
        "url": "http://kiwisdr.k1ra.us:8073/",
        "range": "0.010–30.000 MHz",
        "coverage": [0.01, 30.0],
        "type": "KiwiSDR",
    },
    {
        "id": "ka9q-san-diego",
        "name": "KA9Q San Diego KiwiSDR",
        "location": "Sorrento Valley, California, USA",
        "lat": 32.8606,
        "lon": -117.1889,
        "url": "http://kiwisdr.ka9q.net:8073/",
        "range": "0.010–30.000 MHz",
        "coverage": [0.01, 30.0],
        "type": "KiwiSDR",
    },
    {
        "id": "milton-keynes",
        "name": "Milton Keynes KiwiSDR2",
        "location": "Milton Keynes, United Kingdom",
        "lat": 52.06,
        "lon": -0.82,
        "url": "http://uk-milton-keynes-kiwisdr2.proxy.kiwisdr.com:8073/",
        "range": "0.050–30.000 MHz",
        "coverage": [0.05, 30.0],
        "type": "KiwiSDR",
    },
    {
        "id": "vk2mb-sydney",
        "name": "VK2MB Sydney KiwiSDR",
        "location": "Sydney, New South Wales, Australia",
        "lat": -33.8688,
        "lon": 151.2093,
        "url": "http://websdr.mwrs.org.au:8073/",
        "range": "0.010–30.000 MHz",
        "coverage": [0.01, 30.0],
        "type": "KiwiSDR",
    },
    {
        "id": "sdrbris",
        "name": "Brisbane Loop KiwiSDR",
        "location": "Brisbane, Queensland, Australia",
        "lat": -27.4698,
        "lon": 153.0251,
        "url": "http://sdrbris.proxy.kiwisdr.com:8073/",
        "range": "0.010–30.000 MHz",
        "coverage": [0.01, 30.0],
        "type": "KiwiSDR",
    },
    {
        "id": "areg-adelaide",
        "name": "AREG Remote HF Receiver",
        "location": "Adelaide, South Australia",
        "lat": -34.9285,
        "lon": 138.6007,
        "url": "http://kiwisdr.areg.org.au:8073/",
        "range": "0.010–30.000 MHz",
        "coverage": [0.01, 30.0],
        "type": "KiwiSDR",
    },
    {
        "id": "jk1lot-tokyo",
        "name": "JK1LOT Tokyo KiwiSDR",
        "location": "Tokyo, Japan",
        "lat": 35.6762,
        "lon": 139.6503,
        "url": "http://jk1lot.ham-radio-op.net:8073/",
        "range": "0.010–30.000 MHz",
        "coverage": [0.01, 30.0],
        "type": "KiwiSDR",
    },
    {
        "id": "hsinchu",
        "name": "Hsinchu City KiwiSDR2",
        "location": "Hsinchu, Taiwan",
        "lat": 24.8138,
        "lon": 120.9675,
        "url": "http://jjm0311.proxy.kiwisdr.com:8073/",
        "range": "0.010–22.000 MHz",
        "coverage": [0.01, 22.0],
        "type": "KiwiSDR",
    },
    {
        "id": "zs6a-johannesburg",
        "name": "ZS6A Johannesburg KiwiSDR",
        "location": "Johannesburg, South Africa",
        "lat": -26.2041,
        "lon": 28.0473,
        "url": "http://zs6a.proxy.kiwisdr.com:8073/",
        "range": "0.010–30.000 MHz",
        "coverage": [0.01, 30.0],
        "type": "KiwiSDR",
    },
    {
        "id": "ti0rc-costa-rica",
        "name": "TI0RC Costa Rica KiwiSDR",
        "location": "San José, Costa Rica",
        "lat": 9.9281,
        "lon": -84.0907,
        "url": "http://ti0rc.proxy.kiwisdr.com:8073/",
        "range": "0.010–30.000 MHz",
        "coverage": [0.01, 30.0],
        "type": "KiwiSDR",
    },
    {
        "id": "zl2ba-masterton",
        "name": "ZL2BA Masterton KiwiSDR",
        "location": "Masterton, New Zealand",
        "lat": -40.9511,
        "lon": 175.6573,
        "url": "http://zl2ba.proxy.kiwisdr.com:8073/",
        "range": "0.010–30.000 MHz",
        "coverage": [0.01, 30.0],
        "type": "KiwiSDR",
    },
    {
        "id": "va3xa-ottawa",
        "name": "VA3XA Ottawa KiwiSDR",
        "location": "Ottawa, Ontario, Canada",
        "lat": 45.4215,
        "lon": -75.6972,
        "url": "http://21263.proxy.kiwisdr.com:8073/",
        "range": "0.010–30.000 MHz",
        "coverage": [0.01, 30.0],
        "type": "KiwiSDR",
    },
    {
        "id": "sobikow-poland",
        "name": "Sobikow Poland KiwiSDR",
        "location": "Sobikow, Poland",
        "lat": 51.96,
        "lon": 21.09,
        "url": "http://jm55.proxy.kiwisdr.com:8073/",
        "range": "0.030–30.000 MHz",
        "coverage": [0.03, 30.0],
        "type": "KiwiSDR",
    },
    {
        "id": "dx6ran-philippines",
        "name": "DX6RAN Philippines KiwiSDR",
        "location": "Negros Occidental, Philippines",
        "lat": 10.54,
        "lon": 122.84,
        "url": "http://dx6ran.ddns.net:8073/",
        "range": "0.010–30.000 MHz",
        "coverage": [0.01, 30.0],
        "type": "KiwiSDR",
    },
]


def probe_receiver(receiver: dict) -> dict:
    parsed = urlparse(receiver["url"])
    host = parsed.hostname
    port = parsed.port or (443 if parsed.scheme == "https" else 80)
    started = time.monotonic()
    reachable = False
    try:
        with socket.create_connection((host, port), timeout=0.45):
            reachable = True
    except OSError:
        pass
    elapsed = round((time.monotonic() - started) * 1000)
    return {**receiver, "reachable": reachable, "latency_ms": elapsed if reachable else None}


def probe_receivers() -> list:
    with ThreadPoolExecutor(max_workers=16) as executor:
        return list(executor.map(probe_receiver, RECEIVERS))


def live_monitor_ready() -> bool:
    return LIVE_PYTHON.exists() and KIWI_RECORDER.exists()


def capture_live_sample(receiver: dict, frequency: float, mode: str, seconds: int) -> bytes:
    parsed = urlparse(receiver["url"])
    host = parsed.hostname
    port = parsed.port or 8073
    with tempfile.TemporaryDirectory(prefix="ghost-signals-") as directory:
        filename = Path(directory) / "capture"
        command = [
            str(LIVE_PYTHON),
            str(KIWI_RECORDER),
            "-s", host,
            "-p", str(port),
            "-f", str(frequency),
            "-m", mode,
            f"--tlimit={seconds}",
            f"--fn={filename}",
            "--user=Ghost Signals live monitor",
            "--connect-timeout=3",
            "--connect-retries=0",
            "--busy-timeout=1",
            "--busy-retries=0",
            "--log=error",
        ]
        subprocess.run(command, check=True, timeout=seconds + 6, capture_output=True)
        outputs = list(Path(directory).glob("capture*.wav"))
        if not outputs:
            raise RuntimeError("KiwiSDR returned no audio")
        return outputs[0].read_bytes()


class GhostSignalsHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_GET(self):
        request = urlparse(self.path)
        if request.path == "/api/receivers":
            payload = {
                "checked_at": int(time.time()),
                "receivers": probe_receivers(),
                "live_capture_ready": live_monitor_ready(),
            }
            body = json.dumps(payload).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Cache-Control", "no-store")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        if request.path == "/api/live-sample":
            params = parse_qs(request.query)
            receiver_id = params.get("receiver", [""])[0]
            receiver = next((item for item in RECEIVERS if item["id"] == receiver_id and item["type"] == "KiwiSDR"), None)
            try:
                if not live_monitor_ready():
                    raise RuntimeError("Live monitor runtime is not installed")
                if not receiver:
                    raise ValueError("Select a KiwiSDR receiver")
                frequency = max(10.0, min(30000.0, float(params.get("frequency", ["4625"])[0])))
                mode = params.get("mode", ["am"])[0].lower()
                if mode not in {"am", "usb", "lsb", "cw"}:
                    mode = "am"
                seconds = max(3, min(12, int(params.get("seconds", ["6"])[0])))
                body = capture_live_sample(receiver, frequency, mode, seconds)
                self.send_response(200)
                self.send_header("Content-Type", "audio/wav")
                self.send_header("Cache-Control", "no-store")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)
            except Exception as error:
                body = json.dumps({"error": str(error)}).encode("utf-8")
                self.send_response(503)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)
            return
        super().do_GET()

    def log_message(self, fmt, *args):
        print(f"[ghost-signals] {self.address_string()} {fmt % args}")


class GhostSignalsServer(ThreadingHTTPServer):
    allow_reuse_address = True
    daemon_threads = True


if __name__ == "__main__":
    print(f"Ghost Signals running at http://localhost:{PORT}")
    GhostSignalsServer(("127.0.0.1", PORT), GhostSignalsHandler).serve_forever()
