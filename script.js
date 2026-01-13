// Elements
const streakEl = document.getElementById("streak");
const lastCheckedEl = document.getElementById("lastChecked");
const statusEl = document.getElementById("status");
const checkInBtn = document.getElementById("checkIn");
const resetBtn = document.getElementById("reset");

const themeToggle = document.getElementById("themeToggle");

const nameDisplay = document.getElementById("nameDisplay");
const nameEditor = document.getElementById("nameEditor");
const nameInput = document.getElementById("nameInput");
const nameSave = document.getElementById("nameSave");

// Storage keys
const KEYS = {
  count: "streak_count",
  last: "streak_last_checked",   // YYYY-MM-DD
  name: "streak_name",
  theme: "theme",               // "light" | "dark"
};

// Date helpers
const pad2 = (n) => String(n).padStart(2, "0");
const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
};
const isoToPretty = (iso) => {
  if (!iso) return "never";
  const [y,m,d] = iso.split("-").map(Number);
  return new Date(y, m-1, d).toLocaleDateString(undefined, {year:"numeric", month:"short", day:"numeric"});
};
const daysBetween = (isoA, isoB) => {
  const [y1,m1,d1] = isoA.split("-").map(Number);
  const [y2,m2,d2] = isoB.split("-").map(Number);
  const a = Date.UTC(y1, m1-1, d1);
  const b = Date.UTC(y2, m2-1, d2);
  return Math.floor((b - a) / 86400000);
};

function setStatus(msg){ statusEl.textContent = msg || ""; }

// Theme
function applyTheme(theme){
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(KEYS.theme, theme);
  themeToggle.textContent = theme === "dark" ? "🌙" : "☀️";
}
function toggleTheme(){
  const current = localStorage.getItem(KEYS.theme) || "light";
  applyTheme(current === "dark" ? "light" : "dark");
}

// Name edit UI
function openNameEditor(){
  nameInput.value = localStorage.getItem(KEYS.name) || nameDisplay.textContent || "";
  nameEditor.classList.remove("hidden");
  nameInput.focus();
  nameInput.select();
}
function closeNameEditor(){
  nameEditor.classList.add("hidden");
}
function saveName(){
  const val = (nameInput.value || "").trim();
  if (!val) { setStatus("Type a name first."); return; }
  localStorage.setItem(KEYS.name, val);
  nameDisplay.textContent = val;
  document.title = val;
  closeNameEditor();
  setStatus("Name saved ✅");
}

// Streak logic
function render(){
  const count = Number(localStorage.getItem(KEYS.count) || "0");
  const last = localStorage.getItem(KEYS.last) || "";
  const name = localStorage.getItem(KEYS.name) || "Streak Tracker";
  const theme = localStorage.getItem(KEYS.theme) || "light";

  nameDisplay.textContent = name;
  document.title = name;

  streakEl.textContent = String(count);
  lastCheckedEl.textContent = `Last checked: ${isoToPretty(last)}`;

  applyTheme(theme);

  // prevent spamming
  const today = todayISO();
  if (last === today){
    checkInBtn.disabled = true;
    checkInBtn.textContent = "Checked in ✅";
  } else {
    checkInBtn.disabled = false;
    checkInBtn.textContent = "Check in today";
  }
}

function checkIn(){
  const today = todayISO();
  const last = localStorage.getItem(KEYS.last) || "";
  let count = Number(localStorage.getItem(KEYS.count) || "0");

  // Already checked today
  if (last === today){
    setStatus("Already checked in today ✅");
    render();
    return;
  }

  // First ever check in
  if (!last){
    count = 1;
    localStorage.setItem(KEYS.count, String(count));
    localStorage.setItem(KEYS.last, today);
    setStatus("Started! Nice 👏");
    render();
    return;
  }

  const diff = daysBetween(last, today);

  if (diff === 1){
    count += 1;
    setStatus("Kept the streak going 🔥");
  } else {
    count = 1;
    setStatus("Missed a day — reset to 1 💪");
  }

  localStorage.setItem(KEYS.count, String(count));
  localStorage.setItem(KEYS.last, today);
  render();
}

function resetStreak(){
  localStorage.setItem(KEYS.count, "0");
  localStorage.removeItem(KEYS.last);
  setStatus("Reset done.");
  render();
}

// Events
themeToggle.addEventListener("click", toggleTheme);

checkInBtn.addEventListener("click", checkIn);
resetBtn.addEventListener("click", resetStreak);

nameDisplay.addEventListener("click", openNameEditor);
nameDisplay.addEventListener("keydown", (e) => { if (e.key === "Enter") openNameEditor(); });

nameSave.addEventListener("click", saveName);
nameInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") saveName();
  if (e.key === "Escape") closeNameEditor();
});

// Init
render();
