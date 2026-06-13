# Ghost Signals

Ghost Signals is a local, receive-only shortwave radio investigation console.

It connects to public Software Defined Radio receivers, captures fresh radio
audio, compares frequencies against the official HFCC broadcast schedule, runs
lightweight signal analysis, and turns interesting captures into persistent
case files.

The interface looks like a spy terminal because that is fun. The evidence
labels are deliberately strict because random radio noise is not automatically
a secret transmission.

## What Am I Supposed To Do?

Start with one of the **Field Missions** in the left panel.

1. Click **Check the Buzzer** to listen for activity around 4.625 MHz.
2. Click **Hunt Unscheduled RF** to sample a utility frequency that is not
   normally represented in the international broadcast schedule.
3. Click **Verify a State Broadcast** to capture a real, currently scheduled
   international broadcaster.
4. Wait while Ghost Signals chooses a reachable public KiwiSDR and records a
   short real-world sample.
5. Read the **Priority Intercept** and the grounded **AI Field Analyst** result.
6. Promote interesting captures into **The Vault** so you can investigate the
   same frequency again later.

Silence, static, and failed captures are valid outcomes. Shortwave propagation
changes with time of day, distance, weather, solar activity, receiver load, and
local interference.

## What Should I Listen For?

You do not need radio experience. Listen for changes and repeatable structure:

| What you hear | What it may indicate | What to do next |
| --- | --- | --- |
| Repeating buzz, hum, or tone | Channel marker, beacon, interference, or idle transmitter | Capture it again later and check whether its rhythm changes |
| Voice under heavy static | Broadcast, amateur operator, aviation, maritime, or utility traffic | Check for repeated station IDs or callsigns; do not assume the speaker's identity |
| Beeps or short/long keyed tones | Morse, FSK, telemetry, or digital signaling | Switch between CW and USB and compare the waveform |
| Rapid electronic bursts | Digital data, encrypted traffic, interference, or receiver artifacts | Log the timing and repetition; Ghost Signals does not decrypt it |
| Ticks at precise intervals | Public time and frequency reference station | Compare 5, 10, and 15 MHz standard-frequency channels |
| Nothing but static | No usable signal reached that receiver at that moment | Try another receiver, frequency, or UTC time |

The interesting result is usually not "we decoded a spy message." It is:

> A real signal appeared at this frequency, from this receiver, at this UTC
> time, with this repeatable pattern, and it did or did not match a known
> broadcast schedule.

That is the beginning of a defensible investigation.

## Five-Minute Tour

### 1. Launch the app

```bash
python3 server.py
```

Open [http://localhost:8087](http://localhost:8087).

On macOS, you can also double-click `Start Ghost Signals.command`.

### 2. Enable direct real-audio capture

Run this once:

```bash
python3 scripts/setup_live_monitor.py
```

The setup script installs the optional KiwiSDR capture runtime under:

```text
~/.local/share/ghost-signals/
```

It does not place third-party dependencies inside this repository.

### 3. Run a Field Mission

The easiest first mission is **Check the Buzzer**.

Ghost Signals will:

- Tune to 4.625 MHz USB
- Select a reachable KiwiSDR
- Capture approximately six seconds of fresh RF audio
- Play the sample
- Analyze its waveform
- Generate a Priority Intercept
- Produce a grounded assessment and a clearly separated speculative YOLO theory

### 4. Save an interesting result

Click **Promote to Case File**.

The case is stored in browser local storage. Repeated captures on the same
frequency and mode update the same case, allowing you to compare receivers and
results over time.

## Truth Labels

The large banner above the waterfall tells you what kind of evidence is
currently on screen.

| Label | Meaning |
| --- | --- |
| `DEMO MODE - SYNTHETIC TRAINING SIGNAL` | Generated audio used to demonstrate the interface. It is not a real transmission. |
| `REAL BROADCAST SCHEDULED NOW - AUDIO NOT YET CAPTURED` | The official HFCC schedule lists a broadcast, but Ghost Signals has not captured audio yet. |
| `CAPTURING REAL RF AUDIO` | A public KiwiSDR is currently recording a fresh sample. |
| `REAL RF CAPTURE - UNSCHEDULED OR UNMATCHED` | Real audio was captured, but no active HFCC broadcast matched the frequency. |
| `REAL BROADCAST VERIFIED - LIVE RF + OFFICIAL SCHEDULE` | Real audio was captured and the selected frequency matches an active official broadcast listing. |
| `USER-SHARED TAB AUDIO` | The analyzer is listening to audio manually shared from another browser tab. |

These distinctions matter. A schedule match is evidence that a broadcaster is
expected to transmit. A real capture is evidence that a receiver delivered
audio. Neither proves the identity of every sound inside that audio.

## Field Missions

### Check the Buzzer

Tunes to the well-known 4.625 MHz channel-marker watch frequency.

Possible outcomes:

- A repeating marker-like sound
- Voice activity
- Weak noise
- No usable signal at the selected receiver

Ghost Signals treats this as a watchlist frequency, not proof of a particular
operator or purpose.

### Hunt Unscheduled RF

Tunes to an HF utility watch frequency without relying on the international
broadcast schedule.

Possible outcomes include silence, voice, digital audio, interference, or an
unidentified carrier. "Unscheduled" means there is no nearby active HFCC
broadcast entry. It does not mean illegal, military, or secret.

### Verify a State Broadcast

Selects an active state-linked international broadcaster from the current HFCC
schedule, chooses a receiver, and attempts a live capture.

This is the most verifiable mission because the app can compare:

- Listed frequency
- UTC transmission window
- Broadcaster
- Transmitter site
- Language
- Power
- Target zones
- Fresh received audio

## Watch Frequencies

The Watch Frequencies panel provides one-click real-capture attempts.

It includes:

- The 4.625 MHz unusual-signal watch
- Long-distance aeronautical and HF utility watch frequencies
- Public 5, 10, and 15 MHz standard-frequency references
- Amateur CW and voice activity channels

A watch frequency is a place worth checking, not a promise that a signal is
active or that a specific organization is transmitting.

## Priority Intercepts

A Priority Intercept is generated only after a successful real RF capture.

Each intercept records:

- Frequency and demodulation mode
- UTC capture time
- Public receiver used
- DSP classification and confidence
- Observed pattern
- Content-handling status
- Why the result may be worth investigating

Intercepts are labeled:

- `WATCHLIST`: a known unusual-signal watch frequency
- `UNSCHEDULED`: no active nearby HFCC broadcast match
- `ROUTINE`: real capture consistent with a known scheduled broadcast

## The Vault

The Vault turns a one-off capture into an investigation.

Each persistent case file contains:

- Confirmed real-capture facts
- Receivers used
- Latest DSP result
- Grounded analyst assessment
- Explicitly low-confidence YOLO theory
- The next piece of evidence worth collecting

Use **Tune + Capture Again** to revisit the same frequency and mode.

Case files are stored locally in the browser. They are not uploaded anywhere.

## Analyst Outputs

### AI Field Analyst

The grounded analyst uses deterministic local heuristics and available
metadata. It is not a remote LLM and it does not secretly identify transmitters.

Evidence may include:

- Frequency
- Demodulation mode
- Current HFCC schedule matches
- Known public signal profiles
- Receiver location
- RMS energy
- Zero-crossing rate
- Spectral centroid
- Dominant frequency

Its confidence score represents the strength of the available match, not a
scientific probability.

### YOLO Bet

The YOLO panel intentionally generates a dramatic, low-confidence hypothesis.

It is there because speculative interpretation is fun. It is visibly separated
from evidence and must not be treated as attribution, intelligence, or fact.

## Globe

The globe shows curated public WebSDR and KiwiSDR receiver locations.

- Drag to rotate
- Use the mouse wheel to zoom
- Use `-`, `+`, or the zoom reset button for precise zoom
- Select a receiver from the right panel to move the relay marker

The relay location is the receiver, not necessarily the transmitter.

Reliable transmitter geolocation generally requires synchronized observations
from multiple receivers and techniques such as time difference of arrival.

## Interface Guide

### Spectrum Scan

The autonomous scanner cycles through demonstration presets so the interface is
never visually empty. Its generated audio is always labeled synthetic.

Use Field Missions or Watch Frequencies when you want real RF.

### Waterfall

The waterfall displays frequency-domain energy over time. Stable vertical
features suggest persistent tones or carriers; changing textures may indicate
voice, keyed signals, digital emissions, or noise.

### Waveform Analysis

Ghost Signals calculates:

- RMS energy
- Zero-crossing rate
- Spectral centroid
- Dominant frequency bin

These inexpensive features support broad classifications such as carrier,
voice activity, possible Morse/FSK, static, or no signal.

### Official Schedule Correlator

The correlator compares the selected frequency against the current HFCC
operational schedule and UTC time window.

The bundled schedule can be refreshed with:

```bash
python3 scripts/update_hfcc.py
```

## Architecture

Ghost Signals intentionally uses a small, dependency-light architecture.

```text
Browser UI
  |
  |-- Canvas globe, waterfall, and waveform
  |-- Web Audio API playback and analysis
  |-- Local heuristic analyst and case-file storage
  |
Python HTTP server
  |
  |-- Static files
  |-- Public receiver reachability probes
  |-- KiwiSDR live-sample endpoint
  |
Optional KiwiClient runtime
  |
  `-- Fresh receive-only WAV capture from public KiwiSDRs
```

### Local API

`GET /api/receivers`

Returns curated receivers, current TCP reachability, and live-capture runtime
status.

`GET /api/live-sample`

Example:

```text
/api/live-sample?receiver=k1ra-virginia&frequency=10000&mode=am&seconds=6
```

Returns a fresh WAV sample when the selected public KiwiSDR is available.

## Project Structure

```text
.
|-- index.html                  Main interface
|-- styles.css                  Visual system and responsive layout
|-- app.js                      UI, DSP, missions, analyst, globe, and Vault
|-- server.py                   Local server and live-capture API
|-- assets/
|   |-- countries.geojson      Natural Earth country geometry
|   `-- hfcc-a26.json          Bundled HFCC operational schedule
|-- scripts/
|   |-- setup_live_monitor.py  Installs optional KiwiClient runtime
|   `-- update_hfcc.py         Refreshes the HFCC schedule
`-- Start Ghost Signals.command
```

## Requirements

- Python 3.9 or newer
- A modern desktop browser
- Internet access for receiver probing and real KiwiSDR captures
- `git` for the optional live-monitor setup

No Node.js build step is required.

## Troubleshooting

### The app only shows synthetic audio

Run:

```bash
python3 scripts/setup_live_monitor.py
```

Then restart `python3 server.py` and reload the browser.

### A real capture fails

Public receivers may be offline, busy, rate-limited, or unable to receive the
selected frequency. Ghost Signals automatically attempts fallback KiwiSDRs, but
not every capture will succeed.

### A real capture contains only static

That is normal. Try:

- A different Watch Frequency
- A scheduled broadcast
- Another receiver
- A different UTC time
- AM for broadcasts, USB for many utility/voice channels, or CW for Morse

### The app identifies something incorrectly

The DSP classifier is intentionally lightweight. Treat it as a clue generator,
not a decoder or attribution system.

## What Ghost Signals Cannot Determine

From a short capture and one receiver, Ghost Signals cannot reliably determine:

- The exact transmitter location
- Who is operating an unidentified station
- Whether a signal is military, diplomatic, or clandestine
- The meaning of encrypted or encoded traffic
- Whether an unusual sound is intentional or interference
- The strategic significance of a transmission

The app should make uncertainty interesting without disguising it.

## Responsible Use

Ghost Signals is receive-only. It does not transmit, bypass access controls,
defeat encryption, or access private systems.

It uses a curated set of operator-published public WebSDR and KiwiSDR
endpoints. Respect receiver operators, local law, service terms, capacity, and
privacy. Do not use this project to target private individuals, expose personal
communications, or interfere with radio services.

The legality of receiving, recording, decoding, or disclosing radio
communications varies by jurisdiction and service. Users are responsible for
understanding the rules that apply to them.

## Data Sources And Credits

- [HFCC operational schedules](https://new.hfcc.org/data/a26/)
- [Natural Earth public-domain map data](https://www.naturalearthdata.com/)
- [KiwiClient](https://github.com/jks-prv/kiwiclient)
- Public WebSDR and KiwiSDR receiver operators

## Current Status

This is a portfolio prototype, not a production intelligence platform.

Working features include:

- Accurate interactive globe with receiver reachability
- Mouse-wheel and button zoom
- One-click Field Missions
- Eight real-RF Watch Frequencies
- Direct public KiwiSDR audio capture with receiver fallback
- Synthetic training mode with explicit labeling
- Real-vs-scheduled-vs-demo truth banner
- Live spectrum waterfall and waveform
- Lightweight DSP classification
- HFCC schedule correlation
- Grounded analyst brief
- Explicitly speculative YOLO interpretation
- Priority Intercepts
- Persistent Vault case files

The best way to use Ghost Signals is simple: pick a mission, capture something
real, and decide whether the evidence is interesting enough to revisit.
