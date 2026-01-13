const els = {
  streak: document.getElementById("streak"),
  lastChecked: document.getElementById("lastChecked"),
  status: document.getElementById("status"),
  addDay: document.getElementById("addDay"),
  reset: document.getElementById("reset"),
  streakName: document.getElementById("streakName"),
  saveName: document.getElementById("saveName"),
  themeToggle: document.getElementById("themeToggle"),
};

const KEYS = {
  count: "streak_count",
  last: "streak_last_checked",     // YYYY-MM-DD
  name: "streak_name",
  theme: "theme_pref",             // "dark" | "light" | "auto"
};

function pad2(n){ return String(n).padStart(2, "0"); }
function todayISO(){
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
}
function isoToPretty(iso){
  if (!iso) return "never";
  const [y,m,d] = iso.split("-").map(Number);
  const dt = new Date(y, m-1, d);
  return dt.toLocaleDateString(undefined, { year:"numeric", month:"short", day:"numeric" });
}
function daysBetween(isoA, isoB){
  // difference in whole days between two YYYY-MM-DD dates (isoB - isoA)
  const [y1,m1,d1] = isoA.split("-").map(Number);
  const [y2,m2,d2] = isoB.split("-").map(Number);
  const a = Date.UTC(y1, m1-1, d1);
  const b = Date.UTC(y2, m2-1, d2);
  return Math.floor((b - a) / 86400000);
}

function load(){
  const count = Number(localStorage.getItem(KEYS.count) ?? "0");
  const last = localStorage.getItem(KEYS.last) || "";
  const name = localStorage.getItem(KEYS.name) || "My Streak Tracker";
  const theme = localStorage.getItem(KEYS.theme) || "auto";

  els.streak.textContent = String(count);
  els.lastChecked.textContent = `Last checked: ${isoToPretty(last)}`;
  els.streakName.value = name;

  applyTheme(theme);
  updateTitle(name);

  els.status.textContent = "";
}

function saveCount(n){
  localStorage.setItem(KEYS.count, String(n));
  els.streak.textContent = String(n);
}

function saveLast(iso){
  if (iso) localStorage.setItem(KEYS.last, iso);
  else localStorage.removeItem(KEYS.last);
  els.lastChecked.textContent = `Last checked: ${isoToPretty(iso)}`;
}

function updateTitle(name){
  // Page title + visible header
  document.title = name;
  document.querySelector(".title").textContent = name;
}

function setStatus(msg){
  els.status.textContent = msg;
}

function checkIn(){
  const now = todayISO();
  const last = localStorage.getItem(KEYS.last) || "";
  const current = Number(localStorage.getItem(KEYS.count) ?? "0");

  if (last === now){
    setStatus("Already checked in today ✅");
    return;
  }

  if (!last){
    // first ever check-in
    saveCount(1);
    saveLast(now);
    setStatus("Started! Nice 👏");
    return;
  }

  const diff = daysBetween(last, now);

  if (diff === 1){
    // consecutive day
    saveCount(current + 1);
    saveLast(now);
    setStatus("Kept the streak going 🔥");
  } else {
    // missed days
    saveCount(1);
    saveLast(now);
    setStatus("You missed a day, so it reset — new streak started 💪");
  }
}

function resetAll(){
  saveCount(0);
  saveLast("");
  setStatus("Reset done.");
}

function saveName(){
  const name = (els.streakName.value || "").trim();
  if (!name){
    setStatus("Type a name first (example: Days free of smoking).");
    return;
  }
  localStorage.setItem(KEYS.name, name);
  updateTitle(name);
  setStatus("Name saved ✅");
}

/* Theme */
function systemPrefersDark(){
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyTheme(pref){
  // pref: "dark" | "light" | "auto"
  if (pref === "auto"){
    const theme = systemPrefersDark() ? "dark" : "light";
    document.documentElement.dataset.theme = theme;
  } else {
    document.documentElement.dataset.theme = pref;
  }
  localStorage.setItem(KEYS.theme, pref);

  // update icon
  const actual = document.documentElement.dataset.theme;
  els.themeToggle.textContent = actual === "dark" ? "🌙" : "☀️";
}

function toggleTheme(){
  const pref = localStorage.getItem(KEYS.theme) || "auto";
  // cycle: auto -> dark -> light -> auto
  const next = pref === "auto" ? "dark" : (pref === "dark" ? "light" : "auto");
  applyTheme(next);
  setStatus(next === "auto" ? "Theme: auto (system)" : `Theme: ${next}`);
}

/* Events */
els.addDay.addEventListener("click", checkIn);
els.reset.addEventListener("click", resetAll);
els.saveName.addEventListener("click", saveName);
els.streakName.addEventListener("keydown", (e) => {
  if (e.key === "Enter") saveName();
});
els.themeToggle.addEventListener("click", toggleTheme);

// React to system theme changes if on auto
if (window.matchMedia){
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    const pref = localStorage.getItem(KEYS.theme) || "auto";
    if (pref === "auto") applyTheme("auto");
  });
}

load();
