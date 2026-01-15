// ---------- Helpers ----------
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
const $ = (id) => document.getElementById(id);

// ---------- Elements ----------
const streakEl = $("streak");
const lastCheckedEl = $("lastChecked");
const statusEl = $("status");

const checkInBtn = $("checkIn");
const resetBtn = $("reset");
const themeToggle = $("themeToggle");

// Name editor
const nameDisplay = $("nameDisplay");
const nameEditor = $("nameEditor");
const nameInput = $("nameInput");
const nameSave = $("nameSave");

// Milestones
const msChips = $("msChips");
const msFill = $("msFill");
const msNext = $("msNext");
const msOverlay = $("msOverlay");
const msClose = $("msClose");
const msBig = $("msBig");
const confettiCanvas = $("confetti");

// Reminders
const enableNotifsBtn = $("enableNotifs");
const remindTimeInput = $("remindTime");
const saveReminderBtn = $("saveReminder");
const notifStatusEl = $("notifStatus");

// ---------- Storage Keys ----------
const KEYS = {
  count: "streak_count",
  last: "streak_last_checked",
  name: "streak_name",
  theme: "theme",
  remindTime: "remind_time", // "HH:MM"
  lastMilestoneShown: "last_milestone_shown",
};

// ---------- Config ----------
const MILESTONES = [1, 5, 10, 30, 50, 100, 500, 1000];

// ---------- Status ----------
function setStatus(msg) {
  if (statusEl) statusEl.textContent = msg || "";
}
function setNotifStatus(msg) {
  if (notifStatusEl) notifStatusEl.textContent = msg || "";
}

// ---------- Theme ----------
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(KEYS.theme, theme);
  if (themeToggle) themeToggle.textContent = theme === "dark" ? "🌙" : "☀️";
}
function toggleTheme() {
  const cur = localStorage.getItem(KEYS.theme) || "dark";
  applyTheme(cur === "dark" ? "light" : "dark");
}

// ---------- Name ----------
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
  if (!val) return setStatus("Type a name first.");
  localStorage.setItem(KEYS.name, val);
  if (nameDisplay) nameDisplay.textContent = val;
  document.title = val;
  closeNameEditor();
  setStatus("Name saved ✅");
}

// ---------- Milestones helpers ----------
function getNextMilestone(count) {
  return MILESTONES.find(m => m > count) ?? null;
}
function getPrevMilestone(count) {
  const prev = [...MILESTONES].reverse().find(m => m <= count);
  return prev ?? 0;
}

// Smooth progress BETWEEN milestones (fixes your “1 day fills to 5” issue)
function calcMilestoneProgress(count) {
  const prev = getPrevMilestone(count);
  const next = getNextMilestone(count);

  if (!next) return 100; // past last milestone
  if (count <= prev) return 0;

  const span = next - prev;
  const into = count - prev;
  return Math.max(0, Math.min(100, (into / span) * 100));
}

function renderMilestones(count) {
  if (!msChips || !msFill || !msNext) return;

  // chips
  msChips.innerHTML = "";
  const next = getNextMilestone(count);
  MILESTONES.forEach((m) => {
    const chip = document.createElement("div");
    chip.className = "msChip";
    chip.textContent = String(m);

    if (count >= m) chip.classList.add("hit");
    else if (m === next) chip.classList.add("next");

    msChips.appendChild(chip);
  });

  // next label
  msNext.textContent = next ? `Next: ${next}` : "Next: —";

  // bar fill
  const pct = calcMilestoneProgress(count);
  msFill.style.width = `${pct}%`;
}

// ---------- Confetti (simple canvas burst) ----------
let confettiRAF = null;
function confettiBurst() {
  if (!confettiCanvas) return;

  const ctx = confettiCanvas.getContext("2d");
  const rect = confettiCanvas.getBoundingClientRect();
  confettiCanvas.width = Math.floor(rect.width * devicePixelRatio);
  confettiCanvas.height = Math.floor(rect.height * devicePixelRatio);
  ctx.scale(devicePixelRatio, devicePixelRatio);

  const W = rect.width;
  const H = rect.height;

  const pieces = Array.from({ length: 160 }, () => ({
    x: W / 2,
    y: H / 2,
    vx: (Math.random() - 0.5) * 8,
    vy: (Math.random() - 0.7) * 10,
    g: 0.25 + Math.random() * 0.15,
    s: 4 + Math.random() * 5,
    r: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 0.25,
    life: 80 + Math.random() * 40,
  }));

  let frame = 0;
  if (confettiRAF) cancelAnimationFrame(confettiRAF);

  const tick = () => {
    frame++;
    ctx.clearRect(0, 0, W, H);

    pieces.forEach(p => {
      p.vy += p.g;
      p.x += p.vx;
      p.y += p.vy;
      p.r += p.vr;
      p.life--;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.r);
      ctx.fillStyle = "rgba(139,108,255,0.95)";
      if (Math.random() > 0.5) ctx.fillStyle = "rgba(255,90,90,0.95)";
      ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s);
      ctx.restore();
    });

    const alive = pieces.some(p => p.life > 0 && p.y < H + 40);
    if (alive && frame < 160) confettiRAF = requestAnimationFrame(tick);
  };

  tick();
}

// ---------- Milestone modal ----------
function showMilestoneModal(m) {
  if (!msOverlay || !msBig) return;
  msBig.textContent = String(m);

  msOverlay.classList.remove("hidden");
  msOverlay.setAttribute("aria-hidden", "false");

  confettiBurst();
}
function hideMilestoneModal() {
  if (!msOverlay) return;
  msOverlay.classList.add("hidden");
  msOverlay.setAttribute("aria-hidden", "true");
}

// Always closable:
if (msClose) msClose.addEventListener("click", hideMilestoneModal);
if (msOverlay) {
  msOverlay.addEventListener("click", (e) => {
    // click outside modal closes
    if (e.target === msOverlay) hideMilestoneModal();
  });
}
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") hideMilestoneModal();
});

// Only show milestone when YOU REACH it (and only once)
function maybeTriggerMilestone(count) {
  if (!MILESTONES.includes(count)) return;

  const lastShown = Number(localStorage.getItem(KEYS.lastMilestoneShown) || "0");
  if (count <= lastShown) return;

  localStorage.setItem(KEYS.lastMilestoneShown, String(count));
  showMilestoneModal(count);
}

// ---------- Reminders / OneSignal ----------
async function ensureOneSignalReady() {
  if (!window.OneSignalDeferred) return null;
  return new Promise((resolve) => {
    window.OneSignalDeferred.push(function(OneSignal) {
      resolve(OneSignal);
    });
  });
}

async function enableReminders() {
  setNotifStatus("Opening permission prompt…");
  try {
    const OneSignal = await ensureOneSignalReady();
    if (!OneSignal) return setNotifStatus("OneSignal not loaded.");

    const perm = Notification.permission;
    if (perm === "granted") {
      setNotifStatus("Notifications already allowed ✅");
      return;
    }
    if (perm === "denied") {
      setNotifStatus("Notifications are blocked in your browser settings ❌");
      return;
    }

    await OneSignal.Notifications.requestPermission();
    if (Notification.permission === "granted") {
      setNotifStatus("Notifications enabled ✅");
    } else {
      setNotifStatus("Permission not granted.");
    }
  } catch (err) {
    console.error(err);
    setNotifStatus("Couldn’t open prompt (check console).");
  }
}

function saveReminderTime() {
  const val = (remindTimeInput?.value || "").trim();
  if (!val) return setNotifStatus("Pick a time first.");

  localStorage.setItem(KEYS.remindTime, val);
  setNotifStatus(`Saved: ${val} ✅ (You’ll need OneSignal Journeys / Scheduled message to actually send it)`);
}

function loadReminderTime() {
  const t = localStorage.getItem(KEYS.remindTime) || "";
  if (remindTimeInput) remindTimeInput.value = t;
}

// ---------- Streak logic ----------
function render() {
  const count = Number(localStorage.getItem(KEYS.count) || "0");
  const last = localStorage.getItem(KEYS.last) || "";
  const name = localStorage.getItem(KEYS.name) || "Streak Tracker";
  const theme = localStorage.getItem(KEYS.theme) || "dark";

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

  renderMilestones(count);
  loadReminderTime();
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
      // Reset milestone shown so it can pop again properly starting over
      localStorage.setItem(KEYS.lastMilestoneShown, "0");
    }
  }

  localStorage.setItem(KEYS.count, String(count));
  localStorage.setItem(KEYS.last, today);

  render();
  maybeTriggerMilestone(count);
}

function resetStreak() {
  localStorage.setItem(KEYS.count, "0");
  localStorage.removeItem(KEYS.last);
  localStorage.setItem(KEYS.lastMilestoneShown, "0");
  setStatus("Reset done.");
  render();
}

// ---------- Wire events ----------
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

document.addEventListener("click", (e) => {
  if (!nameEditor || nameEditor.classList.contains("hidden")) return;
  const inside = nameEditor.contains(e.target) || (nameDisplay && nameDisplay.contains(e.target));
  if (!inside) closeNameEditor();
});

// reminders
if (enableNotifsBtn) enableNotifsBtn.addEventListener("click", enableReminders);
if (saveReminderBtn) saveReminderBtn.addEventListener("click", saveReminderTime);

// ---------- Init ----------
render();
