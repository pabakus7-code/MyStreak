// ---- helpers ----
const pad2 = (n) => String(n).padStart(2, "0");
const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};
const isoToPretty = (iso) => {
  if (!iso) return "never";
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};
const daysBetween = (a, b) => {
  const [y1, m1, d1] = a.split("-").map(Number);
  const [y2, m2, d2] = b.split("-").map(Number);
  const t1 = Date.UTC(y1, m1 - 1, d1);
  const t2 = Date.UTC(y2, m2 - 1, d2);
  return Math.floor((t2 - t1) / 86400000);
};
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

// Safe getter
const $ = (id) => document.getElementById(id);

// ---- elements ----
const streakEl = $("streak");
const lastCheckedEl = $("lastChecked");
const statusEl = $("status");

const checkInBtn = $("checkIn");
const resetBtn = $("reset");

const themeToggle = $("themeToggle");

// Name click-to-edit UI
const nameDisplay = $("nameDisplay");
const nameEditor = $("nameEditor");
const nameInput = $("nameInput");
const nameSave = $("nameSave");

// Milestones UI
const milestoneBarsEl = $("milestoneBars");
const milestoneNextEl = $("milestoneNext");

// Modal + confetti
const milestoneModal = $("milestoneModal");
const milestoneNumber = $("milestoneNumber");
const milestoneClose = $("milestoneClose");
const confettiLayer = $("confettiLayer");

// ---- config ----
const MILESTONES = [1, 5, 10, 30, 50, 100, 500, 1000];

// ---- storage keys ----
const KEYS = {
  count: "streak_count",
  last: "streak_last_checked",
  name: "streak_name",
  theme: "theme",
};

function setStatus(msg) {
  if (statusEl) statusEl.textContent = msg || "";
}

// ---- theme ----
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(KEYS.theme, theme);
  if (themeToggle) themeToggle.textContent = theme === "dark" ? "🌙" : "☀️";
}
function toggleTheme() {
  const cur = localStorage.getItem(KEYS.theme) || "light";
  applyTheme(cur === "dark" ? "light" : "dark");
}

// ---- name editor ----
function openNameEditor() {
  if (!nameEditor || !nameInput) return;
  nameEditor.classList.remove("hidden");
  nameInput.value = (localStorage.getItem(KEYS.name) || nameDisplay?.textContent || "").trim();
  nameInput.focus();
  nameInput.select();
}
function closeNameEditor() {
  if (!nameEditor) return;
  nameEditor.classList.add("hidden");
}
function saveName() {
  const val = (nameInput?.value || "").trim();
  if (!val) {
    setStatus("Type a name first.");
    return;
  }
  localStorage.setItem(KEYS.name, val);
  if (nameDisplay) nameDisplay.textContent = val;
  document.title = val;
  closeNameEditor();
  setStatus("");
}

// ---- milestone UI ----
function buildMilestoneBars() {
  if (!milestoneBarsEl) return;
  milestoneBarsEl.innerHTML = "";

  for (const m of MILESTONES) {
    const wrap = document.createElement("div");
    wrap.className = "mBar";
    wrap.dataset.milestone = String(m);

    const box = document.createElement("div");
    box.className = "mBarBox";

    const fill = document.createElement("div");
    fill.className = "mBarFill";
    fill.style.height = "0%";

    const label = document.createElement("div");
    label.className = "mBarLabel";
    label.textContent = String(m);

    box.appendChild(fill);
    wrap.appendChild(box);
    wrap.appendChild(label);
    milestoneBarsEl.appendChild(wrap);
  }
}

function getNextMilestone(count) {
  return MILESTONES.find((m) => count < m) || null;
}

function getPrevMilestone(count) {
  let prev = 0;
  for (const m of MILESTONES) {
    if (m <= count) prev = m;
  }
  return prev;
}

function updateMilestones(count) {
  if (!milestoneBarsEl) return;

  const next = getNextMilestone(count);
  const prev = getPrevMilestone(count);

  if (milestoneNextEl) {
    if (next === null) milestoneNextEl.textContent = "Next: Completed 🎉";
    else milestoneNextEl.textContent = `Next: ${next} (${next - count} left)`;
  }

  const bars = milestoneBarsEl.querySelectorAll(".mBar");
  bars.forEach((bar) => {
    const m = Number(bar.dataset.milestone || "0");
    const fill = bar.querySelector(".mBarFill");

    // Completed
    if (count >= m) {
      bar.classList.add("mBarDone");
      if (fill) fill.style.height = "100%";
      return;
    }

    bar.classList.remove("mBarDone");

    // Only the next milestone bar fills partially, based on progress since previous milestone
    if (next !== null && m === next) {
      const span = Math.max(1, next - prev);
      const pct = clamp(((count - prev) / span) * 100, 0, 100);
      if (fill) fill.style.height = `${pct}%`;
    } else {
      if (fill) fill.style.height = "0%";
    }
  });
}

// ---- milestone celebration ----
function openMilestoneModal(milestone) {
  if (!milestoneModal || !milestoneNumber) return;
  milestoneNumber.textContent = String(milestone);
  milestoneModal.classList.remove("hidden");
}

function closeMilestoneModal() {
  if (!milestoneModal) return;
  milestoneModal.classList.add("hidden");
}

function burstConfetti() {
  if (!confettiLayer) return;

  const pieces = 120;
  const colors = [
    "rgba(124,92,255,0.95)",
    "rgba(255,77,77,0.90)",
    "rgba(46,213,115,0.90)",
    "rgba(255,206,86,0.95)",
    "rgba(0,206,255,0.90)",
  ];

  const w = window.innerWidth;
  const h = window.innerHeight;

  for (let i = 0; i < pieces; i++) {
    const c = document.createElement("div");
    c.className = "confetti";

    const x = Math.random() * w;
    const startY = -20 - Math.random() * 60;

    c.style.left = `${x}px`;
    c.style.top = `${startY}px`;
    c.style.background = colors[Math.floor(Math.random() * colors.length)];
    c.style.transform = `translateY(0) rotate(${Math.random() * 180}deg)`;
    c.style.animationDuration = `${850 + Math.random() * 650}ms`;

    // slightly different fall distance by setting CSS var via translate in keyframes style alternative:
    // easiest: randomize final translate using marginTop-ish hack
    // We'll just let animation do its thing; remove after.
    confettiLayer.appendChild(c);

    setTimeout(() => c.remove(), 1400);
  }
}

// ---- streak logic ----
function render() {
  const count = Number(localStorage.getItem(KEYS.count) || "0");
  const last = localStorage.getItem(KEYS.last) || "";
  const name = localStorage.getItem(KEYS.name) || "Streak Tracker";
  const theme = localStorage.getItem(KEYS.theme) || "light";

  if (nameDisplay) nameDisplay.textContent = name;
  document.title = name;

  if (streakEl) streakEl.textContent = String(count);
  if (lastCheckedEl) lastCheckedEl.textContent = `Last checked: ${isoToPretty(last)}`;

  applyTheme(theme);

  // lock check-in to once/day
  const today = todayISO();
  if (checkInBtn) {
    if (last === today) {
      checkInBtn.disabled = true;
      checkInBtn.textContent = "Checked in ✅";
    } else {
      checkInBtn.disabled = false;
      checkInBtn.textContent = "Check in today";
    }
  }

  updateMilestones(count);
}

function checkIn() {
  const today = todayISO();
  const last = localStorage.getItem(KEYS.last) || "";
  let count = Number(localStorage.getItem(KEYS.count) || "0");

  if (last === today) {
    setStatus("Already checked in today ✅");
    render();
    return;
  }

  const before = count;

  if (!last) {
    count = 1;
    setStatus("Started! Nice 👏");
  } else {
    const diff = daysBetween(last, today);
    if (diff === 1) {
      count += 1;
      setStatus("Kept the streak going 🔥");
    } else {
      count = 1;
      setStatus("Missed a day — reset to 1 💪");
    }
  }

  localStorage.setItem(KEYS.count, String(count));
  localStorage.setItem(KEYS.last, today);

  // Milestone celebration only if you HIT it exactly on this check-in
  const hitMilestone = MILESTONES.includes(count) && count !== before;
  render();

  if (hitMilestone) {
    burstConfetti();
    openMilestoneModal(count);
  }
}

function resetStreak() {
  localStorage.setItem(KEYS.count, "0");
  localStorage.removeItem(KEYS.last);
  setStatus("Reset done.");
  render();
}

// ---- wire events ----
if (themeToggle) themeToggle.addEventListener("click", toggleTheme);
if (checkInBtn) checkInBtn.addEventListener("click", checkIn);
if (resetBtn) resetBtn.addEventListener("click", resetStreak);

if (nameDisplay) {
  nameDisplay.addEventListener("click", openNameEditor);
  nameDisplay.addEventListener("keydown", (e) => {
    if (e.key === "Enter") openNameEditor();
  });
}
if (nameSave) nameSave.addEventListener("click", saveName);
if (nameInput) {
  nameInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") saveName();
    if (e.key === "Escape") closeNameEditor();
  });
}

// Click outside editor closes it
document.addEventListener("click", (e) => {
  if (!nameEditor || nameEditor.classList.contains("hidden")) return;
  const clickedInside =
    nameEditor.contains(e.target) || (nameDisplay && nameDisplay.contains(e.target));
  if (!clickedInside) closeNameEditor();
});

// Modal close
if (milestoneClose) milestoneClose.addEventListener("click", closeMilestoneModal);
if (milestoneModal) {
  milestoneModal.addEventListener("click", (e) => {
    if (e.target === milestoneModal) closeMilestoneModal();
  });
}
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeMilestoneModal();
});

// ---- init ----
buildMilestoneBars();
render();
