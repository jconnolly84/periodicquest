// Periodic Explorer Race v2
// KS3 Y9 – first 20 elements, Explorer + Race modes
// Now with: progressive unlock by period + display difficulty (symbols / names / numbers).

const elements = [
  // number, symbol, name, group (1-8 simplified), period, type, col (position in 8-column layout)
  { number: 1, symbol: "H",  name: "Hydrogen",    group: 1, period: 1, type: "nonmetal",  col: 1 },
  { number: 2, symbol: "He", name: "Helium",      group: 8, period: 1, type: "noblegas",  col: 8 },

  { number: 3, symbol: "Li", name: "Lithium",     group: 1, period: 2, type: "metal",     col: 1 },
  { number: 4, symbol: "Be", name: "Beryllium",   group: 2, period: 2, type: "metal",     col: 2 },
  { number: 5, symbol: "B",  name: "Boron",       group: 3, period: 2, type: "nonmetal",  col: 3 },
  { number: 6, symbol: "C",  name: "Carbon",      group: 4, period: 2, type: "nonmetal",  col: 4 },
  { number: 7, symbol: "N",  name: "Nitrogen",    group: 5, period: 2, type: "nonmetal",  col: 5 },
  { number: 8, symbol: "O",  name: "Oxygen",      group: 6, period: 2, type: "nonmetal",  col: 6 },
  { number: 9, symbol: "F",  name: "Fluorine",    group: 7, period: 2, type: "halogen",   col: 7 },
  { number:10, symbol: "Ne", name: "Neon",        group: 8, period: 2, type: "noblegas",  col: 8 },

  { number:11, symbol: "Na", name: "Sodium",      group: 1, period: 3, type: "metal",     col: 1 },
  { number:12, symbol: "Mg", name: "Magnesium",   group: 2, period: 3, type: "metal",     col: 2 },
  { number:13, symbol: "Al", name: "Aluminium",   group: 3, period: 3, type: "metal",     col: 3 },
  { number:14, symbol: "Si", name: "Silicon",     group: 4, period: 3, type: "nonmetal",  col: 4 },
  { number:15, symbol: "P",  name: "Phosphorus",  group: 5, period: 3, type: "nonmetal",  col: 5 },
  { number:16, symbol: "S",  name: "Sulfur",      group: 6, period: 3, type: "nonmetal",  col: 6 },
  { number:17, symbol: "Cl", name: "Chlorine",    group: 7, period: 3, type: "halogen",   col: 7 },
  { number:18, symbol: "Ar", name: "Argon",       group: 8, period: 3, type: "noblegas",  col: 8 },

  { number:19, symbol: "K",  name: "Potassium",   group: 1, period: 4, type: "metal",     col: 1 },
  { number:20, symbol: "Ca", name: "Calcium",     group: 2, period: 4, type: "metal",     col: 2 }
];

// DOM elements
const menuScreen = document.getElementById("menu-screen");
const gameScreen = document.getElementById("game-screen");
const summaryScreen = document.getElementById("summary-screen");
const missionText = document.getElementById("mission-text");
const missionHint = document.getElementById("mission-hint");
const feedbackEl = document.getElementById("feedback");
const scoreDisplay = document.getElementById("score-display");
const livesDisplay = document.getElementById("lives-display");
const timerDisplay = document.getElementById("timer-display");
const progressDisplay = document.getElementById("progress-display");
const modeLabel = document.getElementById("mode-label");
const racePanel = document.getElementById("race-panel");
const playerCar = document.getElementById("player-car");
const cpuCar = document.getElementById("cpu-car");
const summaryText = document.getElementById("summary-text");
const periodicGrid = document.getElementById("periodic-grid");

const explorerBtn = document.getElementById("explorer-btn");
const raceBtn = document.getElementById("race-btn");
const backToMenuBtn = document.getElementById("back-to-menu");
const playAgainBtn = document.getElementById("play-again");

// Game state
let mode = "explorer"; // 'explorer' | 'race'
let score = 0;
let lives = 3;
let timer = 60;
let timerId = null;

let currentQuestion = null; // { text, hint, correctIds: [], type }
let acceptingAnswers = false;

// Progressive unlock: which periods are visible
let currentMaxPeriod = 2; // Explorer starts with periods 1–2 only

// Race state
const RACE_DURATION = 60; // seconds
const RACE_QUESTIONS = 20;
let playerProgress = 0; // 0-100
let cpuProgress = 0;    // 0-100

// Utility

function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function sample(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function resetFeedback() {
  feedbackEl.textContent = "";
  feedbackEl.classList.remove("correct", "wrong");
}

// Board view (difficulty layer)

function setBoardView(view) {
  // view: 'all' | 'symbols-only' | 'names-only' | 'numbers-only' | 'minimal'
  periodicGrid.dataset.view = view;
}

// Build periodic grid

function createGrid(maxPeriod = currentMaxPeriod) {
  periodicGrid.innerHTML = "";
  const visibleElements = elements.filter(e => e.period <= maxPeriod);

  visibleElements.forEach(el => {
    const div = document.createElement("div");
    div.classList.add("element-tile", el.type);
    div.dataset.number = el.number;
    div.dataset.symbol = el.symbol;
    div.dataset.name = el.name;
    div.dataset.group = el.group;
    div.dataset.period = el.period;
    div.dataset.type = el.type;

    // Place in grid using period/col
    div.style.gridRow = el.period;
    div.style.gridColumn = el.col;

    div.innerHTML = `
      <div class="number">${el.number}</div>
      <div class="symbol">${el.symbol}</div>
      <div class="name">${el.name}</div>
    `;

    div.addEventListener("click", onElementClick);
    periodicGrid.appendChild(div);
  });
}

function updateProgressLabel() {
  if (mode === "explorer") {
    progressDisplay.classList.remove("hidden");
    progressDisplay.textContent = `Unlocked: Periods 1–${currentMaxPeriod}`;
  } else {
    progressDisplay.classList.remove("hidden");
    progressDisplay.textContent = "Full table: Periods 1–4";
  }
}

// Question generation

function makeExplorerQuestion() {
  const qType = sample(["symbolToName", "nameToSymbol", "type", "group", "period", "numberToSymbol"]);
  const pool = elements.filter(e => e.period <= currentMaxPeriod);

  let target, text, hint, correctIds;

  if (qType === "symbolToName") {
    target = sample(pool);
    text = `Click the element with the <strong>symbol ${target.symbol}</strong>.`;
    hint = `You will only see the <em>names</em> – match the symbol to the correct name.`;
    correctIds = [target.number];
    setBoardView("names-only");
  } else if (qType === "nameToSymbol") {
    target = sample(pool);
    text = `Click the element called <strong>${target.name}</strong>.`;
    hint = `You will only see the <em>symbols</em> – match the name to the correct symbol.`;
    correctIds = [target.number];
    setBoardView("symbols-only");
  } else if (qType === "numberToSymbol") {
    target = sample(pool);
    text = `Click the element with <strong>atomic number ${target.number}</strong>.`;
    hint = `Only symbols are visible – think: which symbol has that atomic number?`;
    correctIds = [target.number];
    setBoardView("symbols-only");
  } else if (qType === "type") {
    const typeOpts = ["metal", "nonmetal", "halogen", "noblegas"];
    const chosenType = sample(typeOpts);
    const matches = pool.filter(e => e.type === chosenType);
    text = `Click any <strong>${readableType(chosenType)}</strong>.`;
    hint = `Use the colours and legend to help you. Numbers are hidden.`;
    correctIds = matches.map(e => e.number);
    setBoardView("minimal");
  } else if (qType === "group") {
    const groupNum = sample([1, 2, 3, 4, 5, 6, 7, 8]);
    const matches = pool.filter(e => e.group === groupNum);
    text = `Click an element in <strong>Group ${groupNum}</strong>.`;
    hint = `Vertical columns. Numbers are hidden – use positions.`;
    correctIds = matches.map(e => e.number);
    setBoardView("minimal");
  } else { // period
    const periodChoices = pool.map(e => e.period);
    const periodNum = sample([...new Set(periodChoices)]);
    const matches = pool.filter(e => e.period === periodNum);
    text = `Click an element in <strong>Period ${periodNum}</strong>.`;
    hint = `Rows go across. Numbers are hidden – use positions.`;
    correctIds = matches.map(e => e.number);
    setBoardView("minimal");
  }

  return { text, hint, correctIds, type: "explorer" };
}

function makeRaceQuestion() {
  const qType = sample(["symbolToName", "nameToSymbol", "numberToSymbol"]);
  const pool = elements; // full table (first 20) for race
  let target, text, hint, correctIds;

  if (qType === "symbolToName") {
    target = sample(pool);
    text = `Race Q: Click the element with <strong>symbol ${target.symbol}</strong>.`;
    hint = "";
    correctIds = [target.number];
    setBoardView("names-only");
  } else if (qType === "nameToSymbol") {
    target = sample(pool);
    text = `Race Q: Click <strong>${target.name}</strong>.`;
    hint = "";
    correctIds = [target.number];
    setBoardView("symbols-only");
  } else {
    target = sample(pool);
    text = `Race Q: Click the element with <strong>atomic number ${target.number}</strong>.`;
    hint = "";
    correctIds = [target.number];
    // Randomly hide either names or symbols to mix challenge
    const views = ["symbols-only", "names-only"];
    setBoardView(sample(views));
  }

  return { text, hint, correctIds, type: "race" };
}

function readableType(type) {
  switch (type) {
    case "noblegas": return "noble gas";
    case "nonmetal": return "non-metal";
    default: return type;
  }
}

// Mode management

function startExplorerMode() {
  mode = "explorer";
  score = 0;
  lives = 3;
  stopTimer();

  currentMaxPeriod = 2; // start with Periods 1–2 only
  createGrid();
  setBoardView("all");
  updateProgressLabel();

  modeLabel.textContent = "Mode: Explorer";
  scoreDisplay.textContent = "Score: 0";
  livesDisplay.classList.remove("hidden");
  livesDisplay.textContent = "Lives: 3";
  timerDisplay.classList.add("hidden");
  racePanel.classList.add("hidden");
  summaryScreen.classList.add("hidden");
  resetFeedback();
  nextQuestion();
}

function startRaceMode() {
  mode = "race";
  score = 0;
  lives = 3;
  timer = RACE_DURATION;
  playerProgress = 0;
  cpuProgress = 0;

  // Full (within our 20-element set)
  currentMaxPeriod = 4;
  createGrid(currentMaxPeriod);
  setBoardView("all");
  updateProgressLabel();

  modeLabel.textContent = "Mode: Race";
  scoreDisplay.textContent = "Score: 0";
  livesDisplay.classList.add("hidden");
  timerDisplay.classList.remove("hidden");
  timerDisplay.textContent = `Time: ${timer}`;
  racePanel.classList.remove("hidden");
  summaryScreen.classList.add("hidden");
  resetFeedback();
  updateRaceTrack();
  nextQuestion();

  stopTimer();
  timerId = setInterval(() => {
    timer--;
    if (timer < 0) timer = 0;
    timerDisplay.textContent = `Time: ${timer}`;

    // Rival car creeps forward each second
    const cpuStep = 100 / RACE_DURATION;
    cpuProgress = Math.min(100, cpuProgress + cpuStep);
    updateRaceTrack();

    if (timer <= 0) {
      endRace();
    }
  }, 1000);
}

function stopTimer() {
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }
}

function updateRaceTrack() {
  playerCar.style.width = `${playerProgress}%`;
  cpuCar.style.width = `${cpuProgress}%`;
}

// Unlocking more of the table in Explorer

function checkUnlocks() {
  let unlocked = false;
  if (score >= 30 && currentMaxPeriod < 3) {
    currentMaxPeriod = 3; // unlock Period 3 (Na–Ar)
    unlocked = true;
  }
  if (score >= 70 && currentMaxPeriod < 4) {
    currentMaxPeriod = 4; // unlock Period 4 (K–Ca)
    unlocked = true;
  }
  if (unlocked) {
    createGrid();
    updateProgressLabel();
    missionHint.innerHTML = "⭐ New elements unlocked! Scroll the table and keep exploring.";
  }
}

// Question flow

function nextQuestion() {
  resetFeedback();

  if (mode === "explorer") {
    currentQuestion = makeExplorerQuestion();
  } else {
    currentQuestion = makeRaceQuestion();
  }

  missionText.innerHTML = currentQuestion.text;
  missionHint.innerHTML = currentQuestion.hint || "";
  acceptingAnswers = true;
}

function onElementClick(event) {
  const tile = event.currentTarget;
  if (!acceptingAnswers || !currentQuestion) return;

  const num = parseInt(tile.dataset.number, 10);
  const isCorrect = currentQuestion.correctIds.includes(num);

  tile.classList.remove("correct-pulse", "wrong-pulse");

  if (isCorrect) {
    score += mode === "race" ? 15 : 10;
    scoreDisplay.textContent = `Score: ${score}`;
    feedbackEl.textContent = mode === "race" ? "Speedy! Correct." : "Nice! That's correct.";
    feedbackEl.classList.add("correct");
    feedbackEl.classList.remove("wrong");
    tile.classList.add("correct-pulse");

    if (mode === "explorer") {
      checkUnlocks();
    }

    if (mode === "race") {
      const step = 100 / RACE_QUESTIONS;
      playerProgress = Math.min(100, playerProgress + step);
      updateRaceTrack();

      // If player reaches the end before timer, finish race
      if (playerProgress >= 100) {
        endRace();
        return;
      }
    }

    acceptingAnswers = false;
    setTimeout(() => {
      nextQuestion();
    }, 600);
  } else {
    if (mode === "explorer") {
      lives--;
      livesDisplay.textContent = `Lives: ${lives}`;
      feedbackEl.textContent = "Not quite – try again!";
      feedbackEl.classList.add("wrong");
      feedbackEl.classList.remove("correct");
      tile.classList.add("wrong-pulse");

      if (lives <= 0) {
        endExplorer();
      }
    } else {
      feedbackEl.textContent = "Careful – wrong element!";
      feedbackEl.classList.add("wrong");
      feedbackEl.classList.remove("correct");
      tile.classList.add("wrong-pulse");
      // Race: small penalty
      score = Math.max(0, score - 5);
      scoreDisplay.textContent = `Score: ${score}`;
    }
  }
}

function endExplorer() {
  acceptingAnswers = false;
  summaryScreen.classList.remove("hidden");
  const level = score >= 80 ? "Element Expert" :
                score >= 50 ? "Rising Chemist" :
                score >= 20 ? "Table Trainee" : "Starter Scientist";
  summaryText.innerHTML = `Explorer mode over!<br>Final score: <strong>${score}</strong><br>Title unlocked: <strong>${level}</strong>.`;
}

function endRace() {
  acceptingAnswers = false;
  stopTimer();

  summaryScreen.classList.remove("hidden");
  let result;
  if (playerProgress > cpuProgress) {
    result = "You won the race! 🏁";
  } else if (playerProgress === cpuProgress) {
    result = "It's a draw – photo finish!";
  } else {
    result = "The rival car won this time. Try again!";
  }
  summaryText.innerHTML = `${result}<br>Score: <strong>${score}</strong><br>Your car reached <strong>${Math.round(playerProgress)}%</strong> of the track.`;
}

// Screen switches

function showMenu() {
  gameScreen.classList.add("hidden");
  menuScreen.classList.remove("hidden");
  summaryScreen.classList.add("hidden");
  stopTimer();
}

function showGame() {
  menuScreen.classList.add("hidden");
  gameScreen.classList.remove("hidden");
}

// Event listeners

explorerBtn.addEventListener("click", () => {
  showGame();
  startExplorerMode();
});

raceBtn.addEventListener("click", () => {
  showGame();
  startRaceMode();
});

backToMenuBtn.addEventListener("click", showMenu);

playAgainBtn.addEventListener("click", () => {
  if (mode === "explorer") {
    startExplorerMode();
  } else {
    startRaceMode();
  }
});

// Init
currentMaxPeriod = 2;
createGrid(currentMaxPeriod);
setBoardView("all");
showMenu();
