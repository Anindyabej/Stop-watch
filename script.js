// State variables
let startTime = 0;
let elapsedTime = 0;
let timerInterval = null;
let isRunning = false;

let laps = [];
let lastLapTime = 0;

// DOM Elements
const hoursEl = document.getElementById("hours");
const minutesEl = document.getElementById("minutes");
const secondsEl = document.getElementById("seconds");
const millisecondsEl = document.getElementById("milliseconds");
const progressBarEl = document.getElementById("progress-bar");

const statusIndicatorEl = document.getElementById("status-indicator");
const statusTextEl = document.getElementById("status-text");

const startBtn = document.getElementById("btn-start");
const startLabel = document.getElementById("start-label");
const lapBtn = document.getElementById("btn-lap");
const resetBtn = document.getElementById("btn-reset");

const lapsBodyEl = document.getElementById("laps-body");
const statFastestEl = document.getElementById("stat-fastest");
const statSlowestEl = document.getElementById("stat-slowest");
const statAverageEl = document.getElementById("stat-average");

// Format milliseconds into hours, minutes, seconds, hundredths
function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const totalMinutes = Math.floor(totalSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);

  const displayHours = String(hours).padStart(2, "0");
  const displayMinutes = String(totalMinutes % 60).padStart(2, "0");
  const displaySeconds = String(totalSeconds % 60).padStart(2, "0");
  const displayMs = String(Math.floor((ms % 1000) / 10)).padStart(2, "0");

  return {
    hours: displayHours,
    minutes: displayMinutes,
    seconds: displaySeconds,
    milliseconds: displayMs,
    formatted: `${displayHours}:${displayMinutes}:${displaySeconds}.${displayMs}`,
    short: `${displayMinutes}:${displaySeconds}.${displayMs}`
  };
}

// Update the DOM digits
function updateDisplay(ms) {
  const t = formatTime(ms);
  hoursEl.textContent = t.hours;
  minutesEl.textContent = t.minutes;
  secondsEl.textContent = t.seconds;
  millisecondsEl.textContent = t.milliseconds;

  // 60-second cycle visual bar
  const cycleMs = ms % 60000;
  const progressPercent = (cycleMs / 60000) * 100;
  progressBarEl.style.width = `${progressPercent}%`;
}

// Start / Pause Toggle
function watchStart() {
  if (!isRunning) {
    // Start or Resume
    isRunning = true;
    startTime = performance.now() - elapsedTime;
    timerInterval = setInterval(() => {
      elapsedTime = performance.now() - startTime;
      updateDisplay(elapsedTime);
    }, 10); // 10ms for 100Hz smooth UI update

    // UI Updates
    statusIndicatorEl.className = "status-indicator running";
    statusTextEl.textContent = "Running";
    startLabel.textContent = "Pause";
    startBtn.classList.add("paused-state");
    lapBtn.disabled = false;
  } else {
    // Pause
    watchStop();
  }
}

// Stop / Pause
function watchStop() {
  if (isRunning) {
    isRunning = false;
    clearInterval(timerInterval);

    statusIndicatorEl.className = "status-indicator paused";
    statusTextEl.textContent = "Paused";
    startLabel.textContent = "Resume";
    startBtn.classList.remove("paused-state");
  }
}

// Reset
function watchReset() {
  watchStop();
  elapsedTime = 0;
  lastLapTime = 0;
  laps = [];

  updateDisplay(0);
  renderLaps();
  updateStats();

  statusIndicatorEl.className = "status-indicator";
  statusTextEl.textContent = "Ready";
  startLabel.textContent = "Start";
  lapBtn.disabled = true;
  progressBarEl.style.width = "0%";
}

// Record Lap
function watchLap() {
  if (!isRunning && elapsedTime === 0) return;

  const currentLapTime = elapsedTime - lastLapTime;
  lastLapTime = elapsedTime;

  laps.unshift({
    lapNumber: laps.length + 1,
    splitTime: currentLapTime,
    overallTime: elapsedTime
  });

  renderLaps();
  updateStats();
}

// Render Lap list
function renderLaps() {
  if (laps.length === 0) {
    lapsBodyEl.innerHTML = `
      <tr class="empty-row">
        <td colspan="3">Press "Lap" while running to record intervals</td>
      </tr>
    `;
    return;
  }

  // Find min/max if more than 1 lap
  let minSplit = Infinity;
  let maxSplit = -Infinity;

  if (laps.length > 1) {
    laps.forEach(l => {
      if (l.splitTime < minSplit) minSplit = l.splitTime;
      if (l.splitTime > maxSplit) maxSplit = l.splitTime;
    });
  }

  lapsBodyEl.innerHTML = laps.map(lap => {
    let rowClass = "";
    if (laps.length > 1) {
      if (lap.splitTime === minSplit) rowClass = "fastest-lap";
      else if (lap.splitTime === maxSplit) rowClass = "slowest-lap";
    }

    const split = formatTime(lap.splitTime).short;
    const total = formatTime(lap.overallTime).formatted;

    return `
      <tr class="${rowClass}">
        <td>#${String(lap.lapNumber).padStart(2, "0")}</td>
        <td>+${split}</td>
        <td>${total}</td>
      </tr>
    `;
  }).join("");
}

// Update Analytics Cards
function updateStats() {
  if (laps.length === 0) {
    statFastestEl.textContent = "--:--.--";
    statSlowestEl.textContent = "--:--.--";
    statAverageEl.textContent = "--:--.--";
    return;
  }

  const splitTimes = laps.map(l => l.splitTime);
  const fastest = Math.min(...splitTimes);
  const slowest = Math.max(...splitTimes);
  const average = splitTimes.reduce((acc, curr) => acc + curr, 0) / splitTimes.length;

  statFastestEl.textContent = formatTime(fastest).short;
  statSlowestEl.textContent = formatTime(slowest).short;
  statAverageEl.textContent = formatTime(average).short;
}

// Clear recorded splits
function clearLaps() {
  laps = [];
  lastLapTime = elapsedTime;
  renderLaps();
  updateStats();
}

// Copy splits to clipboard
function copyLaps() {
  if (laps.length === 0) return;

  let text = "Lap,Split,Overall\n";
  laps.slice().reverse().forEach(l => {
    text += `#${l.lapNumber},${formatTime(l.splitTime).short},${formatTime(l.overallTime).formatted}\n`;
  });

  navigator.clipboard.writeText(text).then(() => {
    const prevText = statusTextEl.textContent;
    statusTextEl.textContent = "Copied CSV!";
    setTimeout(() => {
      statusTextEl.textContent = prevText;
    }, 1500);
  });
}

// Keyboard shortcuts (Space = Start/Stop, L = Lap, R = Reset)
window.addEventListener("keydown", (e) => {
  if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;

  if (e.code === "Space") {
    e.preventDefault();
    watchStart();
  } else if (e.key.toLowerCase() === "l") {
    if (!lapBtn.disabled) watchLap();
  } else if (e.key.toLowerCase() === "r") {
    watchReset();
  }
});