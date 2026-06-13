const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const state = {
  frequency: 4625,
  mode: "USB",
  band: [100, 30000],
  scanning: false,
  receivers: [],
  selectedReceiver: null,
  selectedReceiverIndex: 0,
  audioContext: null,
  analyser: null,
  audioSource: null,
  demoNodes: [],
  mediaStream: null,
  globeRotation: -0.25,
  globeTilt: -0.25,
  globeZoom: 1,
  dragging: false,
  lastPointer: null,
  spectrumRows: [],
  lastDetection: 0,
  scanTimer: null,
  demoSignal: "carrier",
  countryRings: [],
  hypothesis: null,
  features: {
    classification: "NARROWBAND CARRIER",
    confidence: 87,
    rms: 0,
    zcr: 0,
    centroid: 0,
    peakHz: 0,
  },
  scheduleRows: [],
  activeBroadcasts: [],
  scheduleMatch: null,
  liveCaptureReady: false,
  audioTruth: "demo",
  lastRealCapture: null,
  currentAnalysis: null,
  currentIntercept: null,
  cases: [],
};

const fallbackReceivers = [
  { id: "twente", name: "University of Twente", location: "Enschede, Netherlands", lat: 52.2292, lon: 6.875, url: "http://websdr.ewi.utwente.nl:8901/", range: "0.000–29.160 MHz", coverage: [0, 29.16], type: "WebSDR", reachable: null },
  { id: "utah-1", name: "Northern Utah SDR", location: "Corinne, Utah, USA", lat: 41.6042, lon: -112.292, url: "http://websdr1.sdrutah.org:8901/", range: "0.125–7.509 MHz", coverage: [.125, 7.509], type: "WebSDR", reachable: null },
  { id: "kfs", name: "KFS Pacific Coast", location: "Half Moon Bay, California, USA", lat: 37.3958, lon: -122.375, url: "http://websdr1.kfsdr.com:8901/", range: "3.316–28.682 MHz", coverage: [3.316, 28.682], type: "WebSDR", reachable: null },
  { id: "pardinho", name: "Pardinho WebSDR", location: "Pardinho, São Paulo, Brazil", lat: -23.1042, lon: -48.375, url: "http://appr.org.br:8901/", range: "1.708–29.014 MHz", coverage: [1.708, 29.014], type: "WebSDR", reachable: null },
  { id: "maasbree", name: "Maasbree Low Noise", location: "Maasbree, Netherlands", lat: 51.3729, lon: 6.0458, url: "http://sdr.websdrmaasbree.nl:8901/", range: "1.799–21.609 MHz", coverage: [1.799, 21.609], type: "WebSDR", reachable: null },
  { id: "bordeaux", name: "Bordeaux Ham SDR", location: "Bordeaux, France", lat: 44.6458, lon: -0.5417, url: "http://ham.websdrbordeaux.fr:8000/", range: "3.408–30.024 MHz", coverage: [3.408, 30.024], type: "WebSDR", reachable: null },
  { id: "na5b", name: "NA5B East Coast", location: "Washington, DC area, USA", lat: 38.7708, lon: -77.2083, url: "http://na5b.com:8901/", range: "0.000–29.009 MHz", coverage: [0, 29.009], type: "WebSDR", reachable: null },
  { id: "yaroslavl", name: "RD3MK Yaroslavl", location: "Yaroslavl, Russia", lat: 57.6646, lon: 39.9875, url: "http://websdr.srr-76.ru/", range: "1.799–29.484 MHz", coverage: [1.799, 29.484], type: "WebSDR", reachable: null },
];

const signalPresets = [
  { frequency: 4625, mode: "USB", name: "UVB-76 WATCH", type: "carrier" },
  { frequency: 7038, mode: "CW", name: "CW BEACON CLUSTER", type: "morse" },
  { frequency: 10000, mode: "AM", name: "TIME SIGNAL", type: "pulse" },
  { frequency: 14195, mode: "USB", name: "VOICE ACTIVITY", type: "voice" },
  { frequency: 8992, mode: "USB", name: "AERONAUTICAL NET", type: "voice" },
  { frequency: 5000, mode: "AM", name: "STANDARD FREQUENCY", type: "pulse" },
  { frequency: 11175, mode: "USB", name: "HF UTILITY WATCH", type: "voice" },
  { frequency: 15000, mode: "AM", name: "STANDARD FREQUENCY", type: "pulse" },
];

const watchChannels = [
  { frequency: 4625, mode: "USB", name: "CHANNEL MARKER WATCH", note: "Known unusual-frequency watch" },
  { frequency: 8992, mode: "USB", name: "AERONAUTICAL UTILITY", note: "Long-distance operational voice watch" },
  { frequency: 11175, mode: "USB", name: "HF UTILITY WATCH", note: "May be silent, voice, or encoded audio" },
  { frequency: 5000, mode: "AM", name: "STANDARD FREQUENCY", note: "Public timing and calibration reference" },
  { frequency: 10000, mode: "AM", name: "STANDARD FREQUENCY", note: "Public timing and calibration reference" },
  { frequency: 15000, mode: "AM", name: "STANDARD FREQUENCY", note: "Public timing and calibration reference" },
  { frequency: 7038, mode: "CW", name: "AMATEUR CW WATCH", note: "Morse activity and beacons" },
  { frequency: 14195, mode: "USB", name: "AMATEUR VOICE WATCH", note: "Intercontinental operator activity" },
];

const knownSignalProfiles = [
  {
    frequency: 4625,
    tolerance: 3,
    origin: "Likely western Russia; exact transmitter site is not confirmed",
    content: "Repeating channel marker with occasional short voice messages",
    purpose: "Probable government or military readiness channel",
    confidence: 64,
    evidence: "Exact 4625 kHz match to the widely monitored UVB-76 channel; USB-like narrowband carrier behavior.",
    hypothesis: { lat: 55.75, lon: 37.62, label: "WESTERN RUSSIA HYPOTHESIS" },
  },
  {
    frequency: 5000,
    tolerance: 4,
    origin: "One of several global standard-frequency stations",
    content: "Time ticks, calibration tones, and station identification",
    purpose: "Public time and frequency reference",
    confidence: 73,
    evidence: "5000 kHz is an internationally used standard-frequency channel; pulsed AM behavior supports the match.",
  },
  {
    frequency: 10000,
    tolerance: 4,
    origin: "One of several global standard-frequency stations",
    content: "Time ticks, calibration tones, and station identification",
    purpose: "Public time and frequency reference",
    confidence: 73,
    evidence: "10000 kHz is an internationally used standard-frequency channel; pulsed AM behavior supports the match.",
  },
  {
    frequency: 8992,
    tolerance: 3,
    origin: "Potential long-distance aeronautical network transmitter",
    content: "Likely operational voice traffic, callsigns, or position reports",
    purpose: "Aeronautical coordination or safety communication",
    confidence: 48,
    evidence: "8992 kHz USB is associated with aeronautical HF activity, but a single receiver cannot identify the sender.",
  },
  {
    frequency: 7038,
    tolerance: 5,
    origin: "Likely a regional amateur-radio station",
    content: "Morse callsigns, signal reports, or short operator exchanges",
    purpose: "Amateur-radio contact or beacon activity",
    confidence: 58,
    evidence: "Frequency sits inside the 40-meter amateur band and CW mode strongly supports amateur Morse activity.",
  },
  {
    frequency: 14195,
    tolerance: 8,
    origin: "Potential intercontinental amateur-radio station",
    content: "Voice callsigns, signal reports, and operator conversation",
    purpose: "Long-distance amateur-radio contact",
    confidence: 52,
    evidence: "Frequency sits inside the 20-meter amateur band, where USB voice contacts are common.",
  },
];

function fitCanvas(canvas) {
  const ratio = Math.min(devicePixelRatio || 1, 2);
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(1, Math.floor(rect.width * ratio));
  const height = Math.max(1, Math.floor(rect.height * ratio));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  return { ctx: canvas.getContext("2d"), width, height, ratio };
}

function formatFrequency(khz) {
  return (khz / 1000).toFixed(3);
}

function updateRealityStrip() {
  const strip = $("#reality-strip");
  if (!strip) return;
  strip.className = "reality-strip";
  let mode = "mode-demo";
  let label = "DEMO MODE — SYNTHETIC TRAINING SIGNAL";
  let detail = "Useful for showing the analyzer, but not a real broadcast until a KiwiSDR sample is captured.";

  if (state.audioTruth === "capturing") {
    mode = "mode-scheduled";
    label = "CAPTURING REAL RF AUDIO";
    detail = "Ghost Signals is recording a fresh sample from a public KiwiSDR receiver right now.";
  } else if (state.audioTruth === "real" && state.scheduleMatch) {
    const site = state.scheduleMatch.tx ? `${state.scheduleMatch.tx.name}, ${state.scheduleMatch.tx.country}` : state.scheduleMatch.site;
    mode = "mode-real";
    label = "REAL BROADCAST VERIFIED — LIVE RF + OFFICIAL SCHEDULE";
    detail = `${state.scheduleMatch.name} at ${state.scheduleMatch.f} kHz, transmitted from ${site}; audio captured via ${state.lastRealCapture?.receiver || "KiwiSDR"}.`;
  } else if (state.audioTruth === "real") {
    mode = "mode-real";
    label = "REAL RF CAPTURE — UNSCHEDULED OR UNMATCHED";
    detail = `Fresh audio captured via ${state.lastRealCapture?.receiver || "KiwiSDR"} at ${formatFrequency(state.frequency)} MHz, but no active HFCC match is present.`;
  } else if (state.audioTruth === "tab") {
    mode = "mode-unknown";
    label = "USER-SHARED TAB AUDIO — REALNESS DEPENDS ON THAT TAB";
    detail = "The analyzer is listening to audio you shared from the browser; schedule correlation still applies separately.";
  } else if (state.scheduleMatch) {
    const site = state.scheduleMatch.tx ? `${state.scheduleMatch.tx.name}, ${state.scheduleMatch.tx.country}` : state.scheduleMatch.site;
    mode = "mode-scheduled";
    label = "REAL BROADCAST SCHEDULED NOW — AUDIO NOT YET CAPTURED";
    detail = `HFCC lists ${state.scheduleMatch.name} from ${site} at this frequency. Use Monitor Live or Capture Real SDR Sample to hear it.`;
  }

  strip.classList.add(mode);
  $("#reality-label").textContent = label;
  $("#reality-detail").textContent = detail;
}

function resetYoloBet() {
  $("#yolo-confidence").textContent = "0%";
  $("#yolo-headline").textContent = "Waiting for analyst context";
  $("#yolo-bet").textContent = "This section is intentionally a low-confidence, high-drama interpretation. It is not evidence.";
}

function loadCases() {
  try {
    state.cases = JSON.parse(localStorage.getItem("ghost-signals-cases") || "[]");
  } catch (_) {
    state.cases = [];
  }
  renderCases();
}

function saveCases() {
  localStorage.setItem("ghost-signals-cases", JSON.stringify(state.cases));
  renderCases();
}

function caseKey(frequency, mode) {
  return `${Math.round(frequency)}-${mode}`;
}

function interceptContentHandling(classification) {
  if (classification.includes("VOICE")) return "Speech activity detected; no reliable transcript";
  if (classification.includes("MORSE") || state.mode === "CW") return "Keyed groups detected; meaning unverified";
  if (classification.includes("CARRIER")) return "No message content; channel-marker behavior";
  if (classification.includes("STATIC") || classification.includes("NO SIGNAL")) return "No recoverable message content";
  return "Digital or unknown emission; not deciphered";
}

function nextEvidenceFor(intercept) {
  if (intercept.scheduled) return "Capture from a second receiver and compare the scheduled transmitter path.";
  if (intercept.classification.includes("CARRIER")) return "Wait for a voice interruption or compare reception from another region.";
  if (intercept.classification.includes("VOICE")) return "Capture a longer sample and look for repeated callsigns or identifiers.";
  if (intercept.classification.includes("MORSE") || intercept.mode === "CW") return "Capture repeated keyed groups and test whether the sequence changes.";
  return "Repeat the capture at the same UTC window and compare waveform fingerprints.";
}

function buildIntercept() {
  if (state.audioTruth !== "real" || !state.lastRealCapture) return null;
  const known = knownSignalProfiles.find((profile) => Math.abs(profile.frequency - state.frequency) <= profile.tolerance);
  const classification = state.features.classification;
  const analysis = state.currentAnalysis;
  const scheduled = Boolean(state.scheduleMatch);
  const unusual = !scheduled;
  const now = new Date();
  const priority = known?.frequency === 4625 ? "WATCHLIST" : unusual ? "UNSCHEDULED" : "ROUTINE";
  const why = known?.frequency === 4625
    ? "Known channel-marker frequency captured live; changes or voice interruptions are worth logging."
    : scheduled
      ? "Real RF agrees with an official broadcast schedule, providing a useful control sample."
      : "Fresh RF was captured with no active HFCC broadcast match; attribution remains open.";
  return {
    id: `INT-${String(Date.now()).slice(-6)}`,
    key: caseKey(state.frequency, state.mode),
    frequency: state.frequency,
    mode: state.mode,
    utc: now.toISOString(),
    receiver: state.lastRealCapture.receiver,
    classification,
    confidence: state.features.confidence,
    pattern: known?.frequency === 4625 ? "Repeating channel-marker candidate" : classification.toLowerCase(),
    content: interceptContentHandling(classification),
    why,
    priority,
    scheduled,
    analysis,
    yolo: {
      headline: $("#yolo-headline").textContent,
      confidence: $("#yolo-confidence").textContent,
    },
  };
}

function renderIntercept(intercept) {
  const card = $("#intercept-card");
  const promoteButton = $("#promote-case-button");
  state.currentIntercept = intercept;
  promoteButton.textContent = "PROMOTE TO CASE FILE";
  if (!intercept) {
    card.className = "intercept-card idle";
    $("#intercept-status").textContent = "AWAITING REAL RF";
    $("#intercept-title").textContent = "NO INTERCEPT LOGGED";
    $("#intercept-priority").textContent = "STANDBY";
    $("#intercept-meta").textContent = "Capture a real SDR sample to generate an evidence-based intercept.";
    $("#intercept-pattern").textContent = "Unknown";
    $("#intercept-class").textContent = "Unknown";
    $("#intercept-content").textContent = "Not analyzed";
    $("#intercept-why").textContent = "No real capture yet";
    promoteButton.disabled = true;
    return;
  }
  card.className = `intercept-card ${intercept.priority === "ROUTINE" ? "" : "priority"}`;
  $("#intercept-status").textContent = "REAL CAPTURE LOGGED";
  $("#intercept-title").textContent = `${intercept.id} // ${formatFrequency(intercept.frequency)} MHz`;
  $("#intercept-priority").textContent = intercept.priority;
  $("#intercept-meta").textContent = `REAL RF · ${intercept.mode} · ${intercept.utc.slice(11, 19)} UTC · ${intercept.receiver} · DSP ${intercept.confidence}%`;
  $("#intercept-pattern").textContent = intercept.pattern;
  $("#intercept-class").textContent = intercept.classification;
  $("#intercept-content").textContent = intercept.content;
  $("#intercept-why").textContent = intercept.why;
  promoteButton.disabled = false;
}

function renderCases() {
  const list = $("#case-list");
  $("#case-count").textContent = `${state.cases.length} OPEN`;
  if (!state.cases.length) {
    list.innerHTML = '<p class="empty-case">No cases yet. Promote a real intercept to begin tracking it.</p>';
    return;
  }
  list.innerHTML = state.cases.map((item) => `
    <article class="case-file">
      <header><strong>CASE ${item.number} // ${formatFrequency(item.frequency)} MHz</strong><span>${item.captures.length} CAPTURE${item.captures.length === 1 ? "" : "S"}</span></header>
      <span>${item.title}</span>
      <p><b>CONFIRMED:</b> Real RF captured via ${[...new Set(item.captures.map((capture) => capture.receiver))].join(", ")}. Latest DSP result: ${item.lastClassification.toLowerCase()}.</p>
      <p><b>ANALYST:</b> ${item.assessment}</p>
      <p><b>YOLO:</b> ${item.yoloAssessment || item.captures[0]?.yolo?.headline || "No speculative theory logged"} (${item.yoloConfidence || item.captures[0]?.yolo?.confidence || "0%"}; low confidence)</p>
      <p><b>NEXT:</b> ${item.nextEvidence}</p>
      <div class="case-actions"><button data-open-case="${item.key}">TUNE + CAPTURE AGAIN</button><button data-delete-case="${item.key}">CLOSE</button></div>
    </article>
  `).join("");
  $$("[data-open-case]").forEach((button) => button.addEventListener("click", () => {
    const item = state.cases.find((candidate) => candidate.key === button.dataset.openCase);
    if (!item) return;
    updateFrequency(item.frequency, false);
    setMode(item.mode);
    captureRealSample();
  }));
  $$("[data-delete-case]").forEach((button) => button.addEventListener("click", () => {
    state.cases = state.cases.filter((candidate) => candidate.key !== button.dataset.deleteCase);
    saveCases();
  }));
}

function promoteCurrentIntercept() {
  const intercept = state.currentIntercept;
  if (!intercept) return;
  const existing = state.cases.find((item) => item.key === intercept.key);
  if (existing) {
    existing.captures.unshift(intercept);
    existing.lastClassification = intercept.classification;
    existing.assessment = intercept.analysis?.purpose || "Attribution remains open";
    existing.yoloAssessment = intercept.yolo.headline;
    existing.yoloConfidence = intercept.yolo.confidence;
    existing.nextEvidence = nextEvidenceFor(intercept);
  } else {
    state.cases.unshift({
      key: intercept.key,
      number: String(Date.now()).slice(-4),
      frequency: intercept.frequency,
      mode: intercept.mode,
      title: intercept.priority === "WATCHLIST" ? "WATCHLIST SIGNAL" : intercept.scheduled ? "SCHEDULE-CONFIRMED TRANSMISSION" : "UNSCHEDULED RF ACTIVITY",
      captures: [intercept],
      lastClassification: intercept.classification,
      assessment: intercept.analysis?.purpose || "Attribution remains open",
      yoloAssessment: intercept.yolo.headline,
      yoloConfidence: intercept.yolo.confidence,
      nextEvidence: nextEvidenceFor(intercept),
    });
  }
  saveCases();
  $("#promote-case-button").textContent = "CASE FILE UPDATED";
  addEvent(`Intercept promoted to case file: <b>${formatFrequency(intercept.frequency)} MHz</b>`);
}

function invalidateInterpretation() {
  state.hypothesis = null;
  state.currentAnalysis = null;
  renderIntercept(null);
  $("#origin-guess").textContent = "Analysis pending";
  $("#content-guess").textContent = "Run analysis for the newly selected signal";
  $("#purpose-guess").textContent = "Unknown";
  $("#analyst-confidence").textContent = "0%";
  $("#analyst-confidence-bar").style.width = "0%";
  $("#analyst-evidence").textContent = "Waiting for frequency, mode, receiver geometry, and DSP evidence.";
  resetYoloBet();
}

function updateFrequency(khz, event = true) {
  const nextFrequency = Math.max(state.band[0], Math.min(state.band[1], Number(khz)));
  if (nextFrequency !== state.frequency) {
    invalidateInterpretation();
    if (state.audioTruth === "real" || state.audioTruth === "capturing") {
      state.audioTruth = "demo";
      state.lastRealCapture = null;
      $("#audio-source-label").textContent = "SYNTHETIC FEED";
      $("#real-sample-button").classList.remove("active");
    }
  }
  state.frequency = nextFrequency;
  $("#frequency-slider").value = state.frequency;
  $("#frequency-value").textContent = formatFrequency(state.frequency);
  $("#frequency-tag").textContent = `${formatFrequency(state.frequency)} MHz`;
  $("#signal-frequency").textContent = `${formatFrequency(state.frequency)} MHz`;
  $("#dial-position").style.left = `${((state.frequency - 100) / 29900) * 100}%`;
  updateScheduleMatch();
  updateRealityStrip();
  if (event) addEvent(`Tuned to <b>${formatFrequency(state.frequency)} MHz</b> / ${state.mode}`);
}

function setMode(mode) {
  if (mode !== state.mode && (state.audioTruth === "real" || state.audioTruth === "capturing")) {
    state.audioTruth = "demo";
    state.lastRealCapture = null;
    $("#audio-source-label").textContent = "SYNTHETIC FEED";
    $("#real-sample-button").classList.remove("active");
  }
  state.mode = mode;
  $$("#mode-grid button").forEach((button) => button.classList.toggle("active", button.dataset.mode === mode));
  $("#signal-mode").textContent = mode;
  updateRealityStrip();
}

function setReceiver(receiver, index) {
  if (state.selectedReceiver?.id !== receiver.id) invalidateInterpretation();
  state.selectedReceiver = receiver;
  state.selectedReceiverIndex = index;
  const latDir = receiver.lat >= 0 ? "N" : "S";
  const lonDir = receiver.lon >= 0 ? "E" : "W";
  $("#selected-coordinates").textContent = `${Math.abs(receiver.lat).toFixed(4)} ${latDir} / ${Math.abs(receiver.lon).toFixed(4)} ${lonDir}`;
  $("#signal-location").textContent = `RELAY: ${receiver.location.toUpperCase()}`;
  $$(".receiver-item").forEach((item) => item.classList.toggle("selected", item.dataset.id === receiver.id));
}

function renderWatchChannels() {
  const list = $("#watch-channel-list");
  list.innerHTML = watchChannels.map((channel, index) => `
    <div class="watch-item">
      <div><strong>${formatFrequency(channel.frequency)} MHz · ${channel.name}</strong><span>${channel.mode} · ${channel.note}</span></div>
      <button data-watch-index="${index}">CAPTURE</button>
    </div>
  `).join("");
  $$("[data-watch-index]").forEach((button) => button.addEventListener("click", () => {
    const channel = watchChannels[Number(button.dataset.watchIndex)];
    updateFrequency(channel.frequency, false);
    setMode(channel.mode);
    $("#signal-name").textContent = channel.name;
    addEvent(`Watch frequency selected: <b>${formatFrequency(channel.frequency)} MHz</b>. Activity is not guaranteed.`);
    captureRealSample();
  }));
}

function runFieldMission(mission) {
  if (mission === "watchlist") {
    updateFrequency(4625, false);
    setMode("USB");
    $("#signal-name").textContent = "UVB-76 WATCH";
    addEvent("Mission started: <b>check the 4.625 MHz channel-marker watch</b>");
    captureRealSample();
    return;
  }
  if (mission === "unscheduled") {
    updateFrequency(11175, false);
    setMode("USB");
    $("#signal-name").textContent = "UNSCHEDULED HF UTILITY HUNT";
    addEvent("Mission started: <b>hunt for unscheduled utility RF</b>. Silence is a valid result.");
    captureRealSample();
    return;
  }
  const row = state.activeBroadcasts[0];
  if (row) {
    addEvent("Mission started: <b>verify an active state-linked broadcast</b>");
    monitorScheduledBroadcast(row);
  } else {
    addEvent("No active scheduled broadcast is loaded yet; try again after the schedule finishes loading");
  }
}

function setGlobeZoom(value) {
  state.globeZoom = Math.max(.68, Math.min(1.7, value));
  $("#zoom-reset").textContent = `${state.globeZoom.toFixed(1)}×`;
}

function receiverTuneUrl(receiver) {
  const mhz = state.frequency / 1000;
  const usable = mhz >= receiver.coverage[0] && mhz <= receiver.coverage[1];
  const fallback = Math.max(receiver.coverage[0], Math.min(receiver.coverage[1], mhz));
  if (receiver.type === "KiwiSDR") {
    return `${receiver.url}?f=${(fallback * 1000).toFixed(2)}${state.mode.toLowerCase()}z10`;
  }
  return `${receiver.url}?tune=${Math.round(fallback * 1000)}${state.mode.toLowerCase()}${usable ? "" : "&ghost_fallback=1"}`;
}

function renderReceivers() {
  const list = $("#receiver-list");
  list.innerHTML = state.receivers.map((receiver, index) => `
    <div class="receiver-item ${index === state.selectedReceiverIndex ? "selected" : ""}" data-id="${receiver.id}">
      <i class="receiver-status ${receiver.reachable ? "reachable" : ""}"></i>
      <div>
        <strong>${receiver.name}</strong>
        <span>${receiver.type} · ${receiver.location} · ${receiver.latency_ms ? `${receiver.latency_ms} ms` : receiver.range}</span>
      </div>
      <button data-open="${receiver.id}">OPEN</button>
    </div>
  `).join("");

  $$(".receiver-item").forEach((item) => {
    item.addEventListener("click", (event) => {
      const index = state.receivers.findIndex((receiver) => receiver.id === item.dataset.id);
      setReceiver(state.receivers[index], index);
      if (event.target.matches("[data-open]")) {
        const receiver = state.receivers[index];
        window.open(receiverTuneUrl(receiver), "_blank", "noopener");
        addEvent(`Opened <b>${receiver.name}</b> at ${formatFrequency(state.frequency)} MHz`);
      }
    });
  });
}

async function loadReceivers() {
  state.receivers = fallbackReceivers;
  setReceiver(state.receivers[0], 0);
  renderReceivers();
  try {
    const response = await fetch("/api/receivers", { cache: "no-store" });
    if (!response.ok) throw new Error("Receiver status unavailable");
    const payload = await response.json();
    state.receivers = payload.receivers;
    state.liveCaptureReady = Boolean(payload.live_capture_ready);
    const reachable = state.receivers.filter((receiver) => receiver.reachable).length;
    $("#receiver-count").textContent = reachable;
    $("#receiver-refresh").textContent = `${reachable}/${state.receivers.length} LIVE`;
    $("#real-sample-status").textContent = state.liveCaptureReady
      ? "6 seconds from selected KiwiSDR"
      : "Run scripts/setup_live_monitor.py";
    setReceiver(state.receivers[0], 0);
    renderReceivers();
    updateRealityStrip();
    addEvent(`Reachability sweep complete: <b>${reachable} public receivers online</b>`);
  } catch (error) {
    $("#receiver-refresh").textContent = "CURATED";
    addEvent("Using curated receiver list; live status check unavailable");
  }
}

async function loadGeography() {
  try {
    const response = await fetch("assets/countries.geojson");
    if (!response.ok) throw new Error("Natural Earth data unavailable");
    const collection = await response.json();
    state.countryRings = collection.features.flatMap((feature) => {
      const geometry = feature.geometry;
      if (!geometry) return [];
      if (geometry.type === "Polygon") return geometry.coordinates;
      if (geometry.type === "MultiPolygon") return geometry.coordinates.flat();
      return [];
    }).filter((ring) => ring.length > 2);
    addEvent(`Natural Earth geometry loaded: <b>${collection.features.length} countries</b>`);
  } catch (error) {
    addEvent(`Map geometry unavailable: <b>${error.message}</b>`);
  }
}

function hfccDate(value) {
  if (!value || value.length !== 6) return null;
  return Date.UTC(2000 + Number(value.slice(4, 6)), Number(value.slice(2, 4)) - 1, Number(value.slice(0, 2)));
}

function isScheduleActive(row, now = new Date()) {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const firstDate = hfccDate(row.fd);
  const lastDate = hfccDate(row.td);
  if ((firstDate && today < firstDate) || (lastDate && today > lastDate)) return false;
  const dayCode = String(now.getUTCDay() + 1);
  if (row.d && !row.d.includes(dayCode)) return false;
  const minutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  const parseTime = (value) => value === "2400" ? 1440 : Number(value.slice(0, 2)) * 60 + Number(value.slice(2));
  const start = parseTime(row.s);
  const end = parseTime(row.e);
  return start <= end ? minutes >= start && minutes < end : minutes >= start || minutes < end;
}

function distanceKm(a, b) {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLon = (b.lon - a.lon) * rad;
  const q = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(q), Math.sqrt(1 - q));
}

function closestReceiverTo(transmitter) {
  const choices = state.receivers.filter((receiver) => receiver.reachable !== false && receiver.type === "KiwiSDR");
  return choices.sort((a, b) => distanceKm(transmitter, a) - distanceKm(transmitter, b))[0] || state.receivers[0];
}

function describeSchedule(row) {
  const transmitter = row.tx ? `${row.tx.name}, ${row.tx.country}` : row.site;
  return `${row.name} · ${row.l || "language unknown"} · ${transmitter} · ${row.p} kW`;
}

function updateScheduleMatch() {
  if (!state.scheduleRows.length) return;
  const matches = state.scheduleRows
    .filter((row) => isScheduleActive(row) && Math.abs(row.f - state.frequency) <= 5)
    .sort((a, b) => Math.abs(a.f - state.frequency) - Math.abs(b.f - state.frequency));
  state.scheduleMatch = matches[0] || null;
  const card = $("#schedule-match");
  if (state.scheduleMatch) {
    card.classList.add("confirmed");
    card.innerHTML = `
      <span>REAL BROADCAST ACTIVE NOW // HFCC SCHEDULE CONFIRMED</span>
      <strong>${describeSchedule(state.scheduleMatch)}</strong>
      <p>${state.scheduleMatch.f} kHz · ${state.scheduleMatch.s}–${state.scheduleMatch.e} UTC · target zones ${state.scheduleMatch.z || "not listed"}</p>
    `;
  } else {
    card.classList.remove("confirmed");
    card.innerHTML = `
      <span>SELECTED FREQUENCY</span>
      <strong>No active official schedule match within ±5 kHz</strong>
      <p>Unscheduled signals may still be genuine utility, amateur, military, or clandestine transmissions.</p>
    `;
  }
  updateRealityStrip();
}

function monitorScheduledBroadcast(row) {
  updateFrequency(row.f, false);
  setMode(row.m === "N" ? "AM" : "AM");
  state.scheduleMatch = row;
  if (row.tx) {
    const receiver = closestReceiverTo(row.tx);
    const index = state.receivers.indexOf(receiver);
    setReceiver(receiver, index);
    state.hypothesis = { lat: row.tx.lat, lon: row.tx.lon, label: "SCHEDULED TRANSMITTER" };
    renderReceivers();
    addEvent(`Starting in-app live monitor: <b>${row.name}</b> via ${receiver.name}`);
    captureRealSample();
  }
  runSignalInterpretation();
  updateScheduleMatch();
}

function renderActiveBroadcasts() {
  const list = $("#schedule-list");
  const rows = state.activeBroadcasts.slice(0, 14);
  list.innerHTML = rows.map((row, index) => `
    <div class="schedule-item">
      <div>
        <strong>${row.name} · ${(row.f / 1000).toFixed(3)} MHz</strong>
        <span>${row.l || "Language unknown"} · ${row.tx?.name || row.site} · ${row.p} kW · until ${row.e} UTC</span>
      </div>
      <button data-schedule-index="${index}">MONITOR REAL RF</button>
    </div>
  `).join("");
  $$(".schedule-item button").forEach((button) => button.addEventListener("click", () => {
    monitorScheduledBroadcast(rows[Number(button.dataset.scheduleIndex)]);
  }));
}

async function loadSchedule() {
  try {
    const response = await fetch("assets/hfcc-a26.json");
    if (!response.ok) throw new Error("HFCC schedule unavailable");
    const payload = await response.json();
    state.scheduleRows = payload.rows;
    state.activeBroadcasts = state.scheduleRows
      .filter((row) => row.state && row.tx && isScheduleActive(row))
      .sort((a, b) => a.f - b.f);
    $("#schedule-status").textContent = `${payload.season} / LIVE UTC`;
    $("#live-broadcast-count").textContent = `${state.activeBroadcasts.length} FOUND`;
    renderActiveBroadcasts();
    updateScheduleMatch();
    updateRealityStrip();
    addEvent(`Official ${payload.season} schedule loaded: <b>${state.activeBroadcasts.length} state-linked broadcasts active now</b>`);
  } catch (error) {
    $("#schedule-status").textContent = "UNAVAILABLE";
    addEvent(`Official schedule unavailable: <b>${error.message}</b>`);
  }
}

function addEvent(message) {
  const now = new Date();
  const time = now.toISOString().slice(11, 19);
  const event = document.createElement("div");
  event.className = "event";
  event.innerHTML = `<time>${time}</time><span>${message}</span>`;
  const log = $("#event-log");
  log.prepend(event);
  while (log.children.length > 16) log.lastElementChild.remove();
}

function beginScan() {
  state.scanning = !state.scanning;
  $("#scan-button").classList.toggle("scanning", state.scanning);
  $("#scan-button-label").textContent = state.scanning ? "HALT SPECTRUM SCAN" : "BEGIN SPECTRUM SCAN";
  $("#scan-state").textContent = state.scanning ? "SCANNING" : "STANDBY";
  $("#mission-status").textContent = state.scanning ? "AUTONOMOUS SCAN ACTIVE" : "PASSIVE RECEIVE MODE";
  clearInterval(state.scanTimer);

  if (state.scanning) {
    addEvent(`Autonomous scan started across <b>${formatFrequency(state.band[0])}–${formatFrequency(state.band[1])} MHz</b>`);
    let presetIndex = 0;
    state.scanTimer = setInterval(() => {
      const valid = signalPresets.filter((preset) => preset.frequency >= state.band[0] && preset.frequency <= state.band[1]);
      const preset = valid[presetIndex % valid.length] || signalPresets[presetIndex % signalPresets.length];
      presetIndex += 1;
      selectSignal(preset);
    }, 3600);
  } else {
    addEvent("Autonomous scan halted by operator");
  }
}

function selectSignal(signal) {
  updateFrequency(signal.frequency, false);
  setMode(signal.mode);
  state.demoSignal = signal.type;
  $("#signal-name").textContent = signal.name;
  const candidates = state.receivers.filter((receiver) => signal.frequency / 1000 >= receiver.coverage[0] && signal.frequency / 1000 <= receiver.coverage[1]);
  const receiver = candidates[Math.floor(Math.random() * candidates.length)] || state.receivers[0];
  const index = state.receivers.indexOf(receiver);
  setReceiver(receiver, index);
  renderReceivers();
  configureDemoSignal(signal.type);
  addEvent(`Candidate detected: <b>${signal.name}</b> at ${formatFrequency(signal.frequency)} MHz`);
  setTimeout(runSignalInterpretation, 250);
}

function globePoint(lat, lon, radius, cx, cy) {
  const phi = lat * Math.PI / 180;
  const lambda = lon * Math.PI / 180 + state.globeRotation;
  const x0 = Math.cos(phi) * Math.sin(lambda);
  const z0 = Math.cos(phi) * Math.cos(lambda);
  const y0 = -Math.sin(phi);
  const ct = Math.cos(state.globeTilt);
  const st = Math.sin(state.globeTilt);
  const y = y0 * ct - z0 * st;
  const z = y0 * st + z0 * ct;
  return { x: cx + x0 * radius, y: cy + y * radius, z };
}

function drawGlobe() {
  const canvas = $("#globe-canvas");
  const { ctx, width, height, ratio } = fitCanvas(canvas);
  ctx.clearRect(0, 0, width, height);
  const cx = width * .5;
  const cy = height * .52;
  const radius = Math.min(width, height) * .34 * state.globeZoom;

  const glow = ctx.createRadialGradient(cx - radius * .25, cy - radius * .3, radius * .05, cx, cy, radius * 1.28);
  glow.addColorStop(0, "rgba(67, 127, 112, .18)");
  glow.addColorStop(.7, "rgba(16, 41, 38, .12)");
  glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 1.3, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = "rgba(7, 18, 19, .58)";
  ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);

  ctx.lineWidth = ratio * .45;
  ctx.strokeStyle = "rgba(115, 183, 166, .13)";
  for (let lat = -60; lat <= 60; lat += 20) {
    ctx.beginPath();
    for (let lon = -180; lon <= 180; lon += 4) {
      const p = globePoint(lat, lon, radius, cx, cy);
      if (p.z > 0) lon === -180 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
  }
  for (let lon = -180; lon < 180; lon += 20) {
    ctx.beginPath();
    let started = false;
    for (let lat = -90; lat <= 90; lat += 3) {
      const p = globePoint(lat, lon, radius, cx, cy);
      if (p.z > 0) {
        started ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y);
        started = true;
      }
    }
    ctx.stroke();
  }

  ctx.fillStyle = "rgba(102, 158, 145, .16)";
  ctx.strokeStyle = "rgba(153, 222, 205, .31)";
  ctx.lineWidth = ratio * .48;
  state.countryRings.forEach((ring) => {
    let allVisible = true;
    let drawing = false;
    ctx.beginPath();
    ring.forEach(([lon, lat]) => {
      const p = globePoint(lat, lon, radius, cx, cy);
      if (p.z > 0) {
        drawing ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y);
        drawing = true;
      } else {
        drawing = false;
        allVisible = false;
      }
    });
    if (allVisible) {
      ctx.closePath();
      ctx.fill();
    }
    ctx.stroke();
  });
  ctx.restore();

  ctx.strokeStyle = "rgba(154, 218, 202, .28)";
  ctx.lineWidth = ratio * .7;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();

  if (state.selectedReceiver) {
    const target = globePoint(state.selectedReceiver.lat, state.selectedReceiver.lon, radius, cx, cy);
    if (target.z > 0) {
      ctx.strokeStyle = "rgba(95, 255, 196, .5)";
      ctx.lineWidth = ratio;
      ctx.setLineDash([ratio * 3, ratio * 4]);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.quadraticCurveTo((cx + target.x) / 2, Math.min(cy, target.y) - radius * .28, target.x, target.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  if (state.hypothesis) {
    const origin = globePoint(state.hypothesis.lat, state.hypothesis.lon, radius, cx, cy);
    if (origin.z > 0) {
      const pulse = 5 + Math.sin(performance.now() / 220) * 2;
      ctx.fillStyle = "#ff9d57";
      ctx.shadowColor = "#ff9d57";
      ctx.shadowBlur = 13 * ratio;
      ctx.beginPath();
      ctx.arc(origin.x, origin.y, pulse * ratio, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "rgba(255, 157, 87, .9)";
      ctx.font = `${6 * ratio}px monospace`;
      ctx.fillText(state.hypothesis.label, origin.x + 10 * ratio, origin.y - 7 * ratio);
    }
  }

  state.receivers.forEach((receiver, index) => {
    const p = globePoint(receiver.lat, receiver.lon, radius, cx, cy);
    if (p.z <= 0) return;
    const selected = index === state.selectedReceiverIndex;
    const pulse = selected ? 5 + Math.sin(performance.now() / 260) * 2 : 2.2;
    ctx.fillStyle = receiver.reachable === false ? "#71817b" : "#d9ff57";
    ctx.shadowColor = receiver.reachable === false ? "transparent" : "#d9ff57";
    ctx.shadowBlur = selected ? 14 * ratio : 5 * ratio;
    ctx.beginPath();
    ctx.arc(p.x, p.y, pulse * ratio, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    if (selected) {
      ctx.strokeStyle = "rgba(217,255,87,.4)";
      ctx.beginPath();
      ctx.arc(p.x, p.y, 11 * ratio, 0, Math.PI * 2);
      ctx.stroke();
    }
  });

  if (!state.dragging) state.globeRotation += .00055;
  requestAnimationFrame(drawGlobe);
}

function drawSpectrum() {
  const canvas = $("#spectrum-canvas");
  const { ctx, width, height, ratio } = fitCanvas(canvas);
  const analyser = state.analyser;
  const bins = analyser ? analyser.frequencyBinCount : 512;
  const data = new Uint8Array(bins);
  if (analyser) analyser.getByteFrequencyData(data);
  else for (let i = 0; i < bins; i++) data[i] = Math.max(0, 25 + Math.random() * 35 - i * .015);

  ctx.fillStyle = "rgba(6, 11, 13, .38)";
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "rgba(112, 174, 160, .08)";
  ctx.lineWidth = ratio * .5;
  for (let x = 0; x < width; x += 44 * ratio) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
  }

  const topHeight = height * .45;
  ctx.beginPath();
  for (let x = 0; x < width; x += 2 * ratio) {
    const index = Math.floor((x / width) * bins * .72);
    const value = data[index] / 255;
    const y = topHeight - value * topHeight * .92;
    x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.lineTo(width, topHeight);
  ctx.lineTo(0, topHeight);
  const fill = ctx.createLinearGradient(0, 0, 0, topHeight);
  fill.addColorStop(0, "rgba(217,255,87,.25)");
  fill.addColorStop(1, "rgba(95,255,196,.01)");
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = "rgba(217,255,87,.75)";
  ctx.stroke();

  if (performance.now() % 65 < 18) {
    const row = document.createElement("canvas");
    row.width = Math.max(1, Math.floor(width / (2 * ratio)));
    row.height = 1;
    const rowCtx = row.getContext("2d");
    const image = rowCtx.createImageData(row.width, 1);
    for (let x = 0; x < row.width; x++) {
      const value = data[Math.floor((x / row.width) * bins * .72)] / 255;
      image.data[x * 4] = 40 + value * 185;
      image.data[x * 4 + 1] = 85 + value * 170;
      image.data[x * 4 + 2] = 82 + value * 40;
      image.data[x * 4 + 3] = 160;
    }
    rowCtx.putImageData(image, 0, 0);
    state.spectrumRows.unshift(row);
    state.spectrumRows = state.spectrumRows.slice(0, Math.floor((height - topHeight) / ratio));
  }
  state.spectrumRows.forEach((row, index) => {
    ctx.drawImage(row, 0, topHeight + index * ratio, width, ratio);
  });
  requestAnimationFrame(drawSpectrum);
}

function drawWaveform() {
  const canvas = $("#waveform-canvas");
  const { ctx, width, height, ratio } = fitCanvas(canvas);
  const analyser = state.analyser;
  const data = new Uint8Array(analyser ? analyser.fftSize : 1024);
  if (analyser) analyser.getByteTimeDomainData(data);
  else for (let i = 0; i < data.length; i++) data[i] = 128 + Math.sin(i / 13) * 10 + (Math.random() - .5) * 12;

  ctx.clearRect(0, 0, width, height);
  ctx.strokeStyle = "rgba(113, 170, 157, .11)";
  ctx.lineWidth = ratio * .5;
  for (let y = 0; y <= height; y += height / 4) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke(); }
  ctx.strokeStyle = "#d9ff57";
  ctx.lineWidth = ratio;
  ctx.shadowColor = "#d9ff57";
  ctx.shadowBlur = 5 * ratio;
  ctx.beginPath();
  data.forEach((sample, index) => {
    const x = index / (data.length - 1) * width;
    const y = sample / 255 * height;
    index ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  });
  ctx.stroke();
  ctx.shadowBlur = 0;

  analyzeSignal(data);
  requestAnimationFrame(drawWaveform);
}

function isAmateurBand(mhz) {
  return [
    [1.8, 2.0], [3.5, 4.0], [7.0, 7.3], [10.1, 10.15],
    [14.0, 14.35], [18.068, 18.168], [21.0, 21.45],
    [24.89, 24.99], [28.0, 29.7],
  ].some(([low, high]) => mhz >= low && mhz <= high);
}

function broadcasterAngle(name = "") {
  const lower = name.toLowerCase();
  if (lower.includes("united states") || lower.includes("usagm")) return "information access / soft-power pressure against censorship";
  if (lower.includes("china")) return "state narrative projection and overseas influence";
  if (lower.includes("bbc")) return "public-service news projection with diplomatic side effects";
  if (lower.includes("turkish")) return "regional influence and diaspora messaging";
  if (lower.includes("korean")) return "national culture, news, and strategic messaging";
  if (lower.includes("france")) return "francophone influence and international news framing";
  if (lower.includes("romania")) return "national external service and diaspora connection";
  if (lower.includes("japan") || lower.includes("nhk")) return "public diplomacy and regional news presence";
  return "international narrative projection";
}

function buildYoloBet(result, scheduled, known, receiver) {
  const mhz = state.frequency / 1000;
  const classification = state.features.classification;
  const base = {
    headline: "Wild hypothesis unavailable",
    body: "There is not enough context yet for even a playful guess.",
    confidence: 4,
  };

  if (scheduled) {
    const target = scheduled.z ? `CIRAF target zones ${scheduled.z}` : "a listed overseas target region";
    return {
      headline: "High-stakes bet: this is narrative warfare wearing a broadcast schedule",
      body: `YOLO read: ${scheduled.name} is using ${scheduled.p} kW from ${scheduled.tx?.name || scheduled.site} to push ${broadcasterAngle(scheduled.name)} toward ${target}. The actual content could be ordinary news, but the strategic purpose is audience access and influence.`,
      confidence: 18,
    };
  }

  if (known?.frequency === 4625) {
    return {
      headline: "High-stakes bet: channel marker for a military readiness net",
      body: "YOLO read: the buzzer-style carrier is less about the sound itself and more about proving the channel is alive, occupied, and ready for short command traffic. Could be mundane legacy infrastructure. Could be a command net heartbeat.",
      confidence: 14,
    };
  }

  if (known?.frequency === 5000 || known?.frequency === 10000) {
    return {
      headline: "High-stakes bet: the boring signal that keeps other systems honest",
      body: "YOLO read: this is probably not dramatic content at all; it is a timing/calibration reference that ships, aircraft, labs, and radio operators quietly depend on when clocks and receivers need a sanity check.",
      confidence: 20,
    };
  }

  if (isAmateurBand(mhz)) {
    return {
      headline: "High-stakes bet: civilian operators mapping propagation in real time",
      body: `YOLO read: this is likely not state activity. It is probably operators trading callsigns or reports, but those tiny contacts still reveal which long-distance radio paths are open right now near ${receiver?.location || "the selected receiver"}.`,
      confidence: 16,
    };
  }

  if (classification.includes("VOICE")) {
    return {
      headline: "High-stakes bet: utility voice traffic hiding in plain sight",
      body: "YOLO read: if it is not scheduled, voice on HF can be aviation, maritime, emergency, diplomatic, or field operations. The content is probably procedural: callsigns, locations, check-ins, weather, routing, or status.",
      confidence: 12,
    };
  }

  if (classification.includes("MORSE") || state.mode === "CW") {
    return {
      headline: "High-stakes bet: identifier, beacon, or compact operational message",
      body: "YOLO read: keyed traffic often means the sender wants range and simplicity more than richness. It may be amateur radio, but the spooky version is a beacon or compact utility identifier punching through bad propagation.",
      confidence: 11,
    };
  }

  if (classification.includes("CARRIER")) {
    return {
      headline: "High-stakes bet: someone is holding the door open",
      body: "YOLO read: a plain carrier can be an idle transmitter, a jammer warming up, a calibration tone, or a channel marker. The safest guess is technical housekeeping; the fun guess is deliberate channel occupation.",
      confidence: 9,
    };
  }

  return base;
}

function writeYoloBet(bet) {
  $("#yolo-confidence").textContent = `${bet.confidence}%`;
  $("#yolo-headline").textContent = bet.headline;
  $("#yolo-bet").textContent = bet.body;
}

function runSignalInterpretation() {
  const mhz = state.frequency / 1000;
  const receiver = state.selectedReceiver || state.receivers[0];
  const classification = state.features.classification;
  const scheduled = state.scheduleMatch && Math.abs(state.scheduleMatch.f - state.frequency) <= 5 ? state.scheduleMatch : null;
  const known = knownSignalProfiles.find((profile) => Math.abs(profile.frequency - state.frequency) <= profile.tolerance);
  let result;

  if (scheduled) {
    const site = scheduled.tx ? `${scheduled.tx.name}, ${scheduled.tx.country}` : scheduled.site;
    result = {
      origin: `Schedule-confirmed transmitter: ${site}`,
      content: `${scheduled.name} programming in ${scheduled.l || "an unlisted language"}`,
      purpose: scheduled.state ? "State-funded or state-operated international broadcasting" : "Scheduled international broadcasting",
      confidence: 94,
      evidence: `Official HFCC A26 entry: ${scheduled.f} kHz, ${scheduled.s}–${scheduled.e} UTC, ${scheduled.p} kW, azimuth ${scheduled.a}°, target zones ${scheduled.z || "not listed"}. Reception still depends on propagation.`,
      hypothesis: scheduled.tx ? { lat: scheduled.tx.lat, lon: scheduled.tx.lon, label: "SCHEDULED TRANSMITTER" } : null,
    };
  } else if (known) {
    result = { ...known };
  } else {
    let origin;
    let originEvidence;
    if (mhz < 3) {
      origin = `Likely regional to ${receiver?.location || "the selected receiver"}`;
      originEvidence = "Low-frequency groundwave and nighttime skywave usually favor regional paths";
    } else if (mhz < 10) {
      origin = `Broad regional or nighttime path into ${receiver?.location || "the selected receiver"}`;
      originEvidence = "This HF range can support both regional and intercontinental nighttime propagation";
    } else if (mhz < 18) {
      origin = `Potential intercontinental path into ${receiver?.location || "the selected receiver"}`;
      originEvidence = "Mid-HF frequencies commonly support one or more ionospheric hops";
    } else {
      origin = `Likely daylight-path station within one or two hops of ${receiver?.location || "the selected receiver"}`;
      originEvidence = "Upper-HF propagation is strongly daylight and solar-condition dependent";
    }

    let content = "Unknown signal content";
    let purpose = "Unknown communications or emission source";
    let classEvidence = `${classification.toLowerCase()} detected`;
    let confidence = 35;

    if (isAmateurBand(mhz)) {
      content = state.mode === "CW"
        ? "Likely callsigns, signal reports, or a short Morse exchange"
        : "Likely amateur operator conversation, callsigns, and signal reports";
      purpose = "Amateur-radio contact, contesting, or experimentation";
      classEvidence += "; frequency falls inside an amateur allocation";
      confidence = 53;
    } else if (classification.includes("VOICE")) {
      content = state.mode === "AM"
        ? "Possible spoken broadcast, news, music, or station identification"
        : "Possible operational voice traffic or operator conversation";
      purpose = state.mode === "AM" ? "Broadcasting or public information" : "Two-way operational communication";
      confidence = 46;
    } else if (classification.includes("MORSE") || state.mode === "CW") {
      content = "Likely keyed identifiers, callsigns, telemetry, or short coded groups";
      purpose = "Beaconing, amateur contact, or utility signaling";
      confidence = 49;
    } else if (classification.includes("CARRIER")) {
      content = "Steady marker, beacon, idle channel, or calibration tone";
      purpose = "Channel occupancy, station identification, or technical reference";
      confidence = 43;
    } else if (classification.includes("STATIC")) {
      content = "No reliable message content detected";
      purpose = "Atmospheric noise, local interference, or weak/hidden transmission";
      confidence = 29;
    }

    result = {
      origin,
      content,
      purpose,
      confidence,
      evidence: `${originEvidence}; ${classEvidence}; ${state.mode} at ${formatFrequency(state.frequency)} MHz. Origin remains unconstrained without TDoA.`,
    };
  }

  state.hypothesis = result.hypothesis || null;
  state.currentAnalysis = result;
  $("#origin-guess").textContent = result.origin;
  $("#content-guess").textContent = result.content;
  $("#purpose-guess").textContent = result.purpose;
  $("#analyst-confidence").textContent = `${result.confidence}%`;
  $("#analyst-confidence-bar").style.width = `${result.confidence}%`;
  $("#analyst-evidence").textContent = result.evidence;
  writeYoloBet(buildYoloBet(result, scheduled, known, receiver));
  addEvent(`Analyst brief generated: <b>${result.purpose}</b> (${result.confidence}% confidence)`);
  if (state.audioTruth === "real") renderIntercept(buildIntercept());
  return result;
}

function analyzeSignal(timeData) {
  if (!state.analyser) return;
  let energy = 0;
  let crossings = 0;
  let previous = timeData[0] - 128;
  for (const sample of timeData) {
    const centered = (sample - 128) / 128;
    energy += centered * centered;
    if ((centered >= 0) !== (previous >= 0)) crossings += 1;
    previous = centered;
  }
  const rms = Math.sqrt(energy / timeData.length);
  const zcr = crossings / timeData.length;
  const spectrum = new Uint8Array(state.analyser.frequencyBinCount);
  state.analyser.getByteFrequencyData(spectrum);
  let weighted = 0;
  let total = 0;
  let peak = 0;
  let peakBin = 0;
  spectrum.forEach((value, index) => {
    weighted += index * value;
    total += value;
    if (value > peak) { peak = value; peakBin = index; }
  });
  const nyquist = state.audioContext.sampleRate / 2;
  const centroid = total ? (weighted / total) / spectrum.length * nyquist : 0;
  const peakHz = peakBin / spectrum.length * nyquist;

  $("#rms-value").textContent = rms.toFixed(3);
  $("#zero-cross-value").textContent = zcr.toFixed(3);
  $("#centroid-value").textContent = `${Math.round(centroid)} Hz`;
  $("#peak-value").textContent = `${Math.round(peakHz)} Hz`;

  let label = "BROADBAND STATIC";
  let subtitle = "High entropy / diffuse spectrum";
  let confidence = 58;
  if (rms < .025) {
    label = "NO SIGNAL";
    subtitle = "Below analysis threshold";
    confidence = 96;
  } else if (peak > 205 && centroid < 1800) {
    label = "NARROWBAND CARRIER";
    subtitle = "Stable tonal peak / low entropy";
    confidence = Math.min(97, Math.round(65 + peak / 9));
  } else if (zcr > .16 && rms > .08) {
    label = "POSSIBLE MORSE / FSK";
    subtitle = "Rapid keyed transitions detected";
    confidence = Math.min(94, Math.round(54 + zcr * 180));
  } else if (rms > .045 && centroid > 500 && centroid < 4200) {
    label = "VOICE ACTIVITY";
    subtitle = "Speech-band energy pattern";
    confidence = Math.min(91, Math.round(57 + rms * 210));
  }

  $("#classification-label").textContent = label;
  $("#classification-subtitle").textContent = subtitle;
  $("#confidence-value").textContent = `${confidence}%`;
  $("#confidence-bar").style.width = `${confidence}%`;
  state.features = { classification: label, confidence, rms, zcr, centroid, peakHz };

  const now = performance.now();
  if (confidence > 82 && now - state.lastDetection > 9000) {
    state.lastDetection = now;
    addEvent(`DSP classified <b>${label}</b> with ${confidence}% confidence`);
  }
}

async function ensureAudio() {
  if (state.audioContext) {
    await state.audioContext.resume();
    return;
  }
  state.audioContext = new AudioContext();
  state.analyser = state.audioContext.createAnalyser();
  state.analyser.fftSize = 2048;
  state.analyser.smoothingTimeConstant = .78;
  $("#sample-rate").textContent = `${Math.round(state.audioContext.sampleRate / 1000)} kHz`;
}

function stopAudioSource() {
  state.demoNodes.forEach((node) => {
    try { node.stop?.(); } catch (_) {}
    try { node.disconnect?.(); } catch (_) {}
  });
  state.demoNodes = [];
  if (state.mediaStream) {
    state.mediaStream.getTracks().forEach((track) => track.stop());
    state.mediaStream = null;
  }
  if (state.audioSource) {
    try { state.audioSource.stop?.(); } catch (_) {}
    try { state.audioSource.disconnect(); } catch (_) {}
    state.audioSource = null;
  }
}

async function startDemoAudio() {
  await ensureAudio();
  stopAudioSource();
  state.audioTruth = "demo";
  state.lastRealCapture = null;
  updateRealityStrip();

  const ctx = state.audioContext;
  const master = ctx.createGain();
  master.gain.value = .2;
  master.connect(state.analyser);
  master.connect(ctx.destination);

  const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const noiseData = noiseBuffer.getChannelData(0);
  for (let i = 0; i < noiseData.length; i++) noiseData[i] = (Math.random() * 2 - 1) * .38;
  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer;
  noise.loop = true;
  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = "bandpass";
  noiseFilter.frequency.value = 1500;
  noiseFilter.Q.value = .45;
  const noiseGain = ctx.createGain();
  noiseGain.gain.value = .18;
  noise.connect(noiseFilter).connect(noiseGain).connect(master);
  noise.start();

  const carrier = ctx.createOscillator();
  carrier.frequency.value = 860;
  carrier.type = "sine";
  const carrierGain = ctx.createGain();
  carrierGain.gain.value = .24;
  carrier.connect(carrierGain).connect(master);
  carrier.start();

  const wobble = ctx.createOscillator();
  wobble.frequency.value = .12;
  const wobbleGain = ctx.createGain();
  wobbleGain.gain.value = 18;
  wobble.connect(wobbleGain).connect(carrier.frequency);
  wobble.start();

  state.demoNodes = [master, noise, noiseFilter, noiseGain, carrier, carrierGain, wobble, wobbleGain];
  state.audioSource = master;
  configureDemoSignal(state.demoSignal);
  $("#audio-source-label").textContent = "SYNTHETIC FEED";
  $("#demo-audio-button").classList.add("active");
  $("#capture-audio-button").classList.remove("active");
  $("#real-sample-button").classList.remove("active");
  updateRealityStrip();
  addEvent("Generated radio feed connected to DSP pipeline");
}

function configureDemoSignal(type) {
  if (!state.audioContext || state.demoNodes.length === 0) return;
  const carrier = state.demoNodes[4];
  const carrierGain = state.demoNodes[5];
  const now = state.audioContext.currentTime;
  carrier.frequency.cancelScheduledValues(now);
  carrierGain.gain.cancelScheduledValues(now);
  carrier.frequency.setValueAtTime(type === "voice" ? 420 : type === "morse" ? 720 : 860, now);
  carrierGain.gain.setValueAtTime(.22, now);
  if (type === "morse") {
    const pattern = [1,0,1,0,1,0,0,1,1,1,0,1,1,1,0,1,1,1,0,0,1,0,1,0,1];
    pattern.forEach((on, index) => carrierGain.gain.setValueAtTime(on ? .38 : .005, now + index * .09));
  } else if (type === "pulse") {
    for (let i = 0; i < 18; i++) {
      carrierGain.gain.setValueAtTime(i % 2 ? .03 : .38, now + i * .18);
    }
  } else if (type === "voice") {
    for (let i = 0; i < 32; i++) {
      carrier.frequency.linearRampToValueAtTime(250 + Math.random() * 950, now + i * .065);
      carrierGain.gain.linearRampToValueAtTime(.08 + Math.random() * .28, now + i * .065);
    }
  }
}

async function captureTabAudio() {
  await ensureAudio();
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
    if (stream.getAudioTracks().length === 0) {
      stream.getTracks().forEach((track) => track.stop());
      throw new Error("No audio track was shared");
    }
    stopAudioSource();
    state.mediaStream = stream;
    state.audioSource = state.audioContext.createMediaStreamSource(stream);
    state.audioSource.connect(state.analyser);
    state.audioTruth = "tab";
    state.lastRealCapture = null;
    $("#audio-source-label").textContent = "LIVE TAB CAPTURE";
    $("#demo-audio-button").classList.remove("active");
    $("#capture-audio-button").classList.add("active");
    $("#real-sample-button").classList.remove("active");
    updateRealityStrip();
    addEvent("Live tab audio attached to DSP pipeline");
    stream.getVideoTracks()[0].addEventListener("ended", startDemoAudio, { once: true });
  } catch (error) {
    addEvent(`Tab capture unavailable: <b>${error.message}</b>`);
  }
}

async function captureRealSample() {
  await ensureAudio();
  if (!state.liveCaptureReady) {
    addEvent("Real capture runtime is not installed; run <b>python3 scripts/setup_live_monitor.py</b>");
    return;
  }
  if (state.scheduleMatch && state.mode !== "AM") setMode("AM");
  let receiver = state.selectedReceiver;
  if (!receiver || receiver.type !== "KiwiSDR" || receiver.reachable === false) {
    receiver = state.scheduleMatch?.tx
      ? closestReceiverTo(state.scheduleMatch.tx)
      : state.receivers.find((item) => item.type === "KiwiSDR" && item.reachable);
    if (receiver) {
      setReceiver(receiver, state.receivers.indexOf(receiver));
      renderReceivers();
    }
  }
  if (!receiver) {
    addEvent("No reachable KiwiSDR is available for real audio capture");
    return;
  }

  const candidates = [
    receiver,
    ...["k1ra-virginia", "ka9q-san-diego", "milton-keynes"]
      .map((id) => state.receivers.find((item) => item.id === id && item.reachable))
      .filter(Boolean),
    ...state.receivers.filter((item) => item.type === "KiwiSDR" && item.reachable && item.id !== receiver.id),
  ].filter((item, index, all) => all.findIndex((candidate) => candidate.id === item.id) === index).slice(0, 4);
  const button = $("#real-sample-button");
  const status = $("#real-sample-status");
  button.classList.add("active");
  state.audioTruth = "capturing";
  $("#audio-source-label").textContent = "CAPTURING REAL RF";
  updateRealityStrip();
  let audio;
  let successfulReceiver;
  let lastError;
  try {
    for (let index = 0; index < candidates.length; index += 1) {
      const candidate = candidates[index];
      status.textContent = `Trying ${candidate.name} (${index + 1}/${candidates.length})…`;
      addEvent(`Capturing real audio from <b>${candidate.name}</b> at ${formatFrequency(state.frequency)} MHz`);
      try {
        const params = new URLSearchParams({
          receiver: candidate.id,
          frequency: state.frequency,
          mode: state.mode.toLowerCase(),
          seconds: "6",
        });
        const response = await fetch(`/api/live-sample?${params}`);
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Live capture failed");
        }
        audio = await state.audioContext.decodeAudioData(await response.arrayBuffer());
        successfulReceiver = candidate;
        break;
      } catch (error) {
        lastError = error;
        addEvent(`Receiver fallback: <b>${candidate.name}</b> failed`);
      }
    }
    if (!audio || !successfulReceiver) throw lastError || new Error("All reachable KiwiSDRs failed");
    stopAudioSource();
    const source = state.audioContext.createBufferSource();
    source.buffer = audio;
    source.connect(state.analyser);
    source.connect(state.audioContext.destination);
    source.start();
    state.audioSource = source;
    state.audioTruth = "real";
    state.lastRealCapture = {
      receiver: successfulReceiver.name,
      frequency: state.frequency,
      seconds: audio.duration,
      scheduled: Boolean(state.scheduleMatch),
    };
    setReceiver(successfulReceiver, state.receivers.indexOf(successfulReceiver));
    renderReceivers();
    $("#audio-source-label").textContent = "REAL KIWI SDR AUDIO";
    $("#demo-audio-button").classList.remove("active");
    $("#capture-audio-button").classList.remove("active");
    button.classList.add("active");
    status.textContent = `${audio.duration.toFixed(1)} sec captured from ${successfulReceiver.name}`;
    updateRealityStrip();
    addEvent(`Real RF sample playing from <b>${successfulReceiver.name}</b>`);
    setTimeout(() => {
      runSignalInterpretation();
      renderIntercept(buildIntercept());
    }, 1200);
  } catch (error) {
    state.audioTruth = "demo";
    state.lastRealCapture = null;
    button.classList.remove("active");
    status.textContent = error.message;
    $("#audio-source-label").textContent = "LIVE CAPTURE FAILED";
    updateRealityStrip();
    addEvent(`Real RF capture failed: <b>${error.message}</b>`);
  }
}

function wireControls() {
  $("#frequency-slider").addEventListener("input", (event) => updateFrequency(event.target.value, false));
  $("#frequency-slider").addEventListener("change", (event) => updateFrequency(event.target.value));
  $$(".step-controls button").forEach((button) => button.addEventListener("click", () => updateFrequency(state.frequency + Number(button.dataset.step))));
  $$("#mode-grid button").forEach((button) => button.addEventListener("click", () => {
    setMode(button.dataset.mode);
    addEvent(`Demodulation changed to <b>${state.mode}</b>`);
  }));
  $$("#band-list button").forEach((button) => button.addEventListener("click", () => {
    $$("#band-list button").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    state.band = [Number(button.dataset.min), Number(button.dataset.max)];
    updateFrequency(Math.max(state.band[0], Math.min(state.band[1], state.frequency)), false);
    addEvent(`Scan region set to <b>${button.querySelector("b").textContent}</b>`);
  }));
  $("#scan-button").addEventListener("click", () => {
    if (!state.scanning) startDemoAudio();
    beginScan();
  });
  $("#demo-audio-button").addEventListener("click", startDemoAudio);
  $("#capture-audio-button").addEventListener("click", captureTabAudio);
  $("#real-sample-button").addEventListener("click", captureRealSample);
  $("#analyst-button").addEventListener("click", runSignalInterpretation);
  $("#promote-case-button").addEventListener("click", promoteCurrentIntercept);
  $("#clear-log").addEventListener("click", () => { $("#event-log").innerHTML = ""; });
  $$("[data-mission]").forEach((button) => button.addEventListener("click", () => runFieldMission(button.dataset.mission)));
  $("#zoom-out").addEventListener("click", () => setGlobeZoom(state.globeZoom - .15));
  $("#zoom-in").addEventListener("click", () => setGlobeZoom(state.globeZoom + .15));
  $("#zoom-reset").addEventListener("click", () => setGlobeZoom(1));

  const modal = $("#about-modal");
  $("#about-button").addEventListener("click", () => { modal.hidden = false; });
  $("#modal-close").addEventListener("click", () => { modal.hidden = true; });
  modal.addEventListener("click", (event) => { if (event.target === modal) modal.hidden = true; });

  const globe = $("#globe-canvas");
  globe.addEventListener("pointerdown", (event) => {
    state.dragging = true;
    state.lastPointer = [event.clientX, event.clientY];
    globe.setPointerCapture(event.pointerId);
  });
  globe.addEventListener("pointermove", (event) => {
    if (!state.dragging) return;
    const dx = event.clientX - state.lastPointer[0];
    const dy = event.clientY - state.lastPointer[1];
    state.globeRotation += dx * .008;
    state.globeTilt = Math.max(-1.1, Math.min(1.1, state.globeTilt + dy * .006));
    state.lastPointer = [event.clientX, event.clientY];
  });
  globe.addEventListener("pointerup", () => { state.dragging = false; });
  globe.addEventListener("wheel", (event) => {
    event.preventDefault();
    setGlobeZoom(state.globeZoom + (event.deltaY < 0 ? .1 : -.1));
  }, { passive: false });
}

function updateClock() {
  $("#utc-clock").textContent = `${new Date().toISOString().slice(11, 19)} UTC`;
}

function init() {
  wireControls();
  loadCases();
  renderWatchChannels();
  updateFrequency(4625, false);
  setMode("USB");
  updateClock();
  setInterval(updateClock, 1000);
  addEvent("Ghost Signals interface initialized");
  addEvent("Click <b>BEGIN SPECTRUM SCAN</b> to activate audio");
  updateRealityStrip();
  loadGeography();
  loadReceivers();
  loadSchedule();
  drawGlobe();
  drawSpectrum();
  drawWaveform();
}

init();
