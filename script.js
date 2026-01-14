// ---------------- helpers ----------------
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

// ---------------- elements ----------------
const streakEl = $("streak");
const lastCheckedEl = $("lastChecked");
const statusEl = $("status");

const checkInBtn = $("checkIn");
const resetBtn = $("reset");

const themeToggle = $("themeToggle");

// Name edit
const nameDisplay = $("nameDisplay");
const nameEditor = $("nameEditor");
const nameInput = $("nameInput");
const nameSave = $("nameSave");

// Reminders UI
const enableNotifsBtn = $("enableNotifs");
const remindTimeInput = $("remindTime");       // <input type="time">
const saveRemindTimeBtn = $("saveRemindTime");
const repeat30Chk = $("repeat30");
const notifStatusEl = $("notifStatus");
const nextReminderEl = $("nextReminder");

// ---------------- storage keys ----------------
const KEYS = {
  count: "streak_count",
  last: "streak_last_checked",
  name: "streak_name",
  theme: "theme",
  remindTime: "remind_time",     // "HH:MM"
  repeat30: "repeat_30_open_tab" // "1" or "0"
};

let repeat30Timer = null;

function setStatus(msg) {
  if (statusEl) statusEl.textContent = msg || "";
}
function setNotifStatus(msg) {
  if (notifStatusEl) notifStatusEl.textContent = msg || "";
}
function setNextReminder(msg) {
  if (nextReminderEl) nextReminderEl.textContent = msg || "";
}

// ---------------- theme ----------------
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(KEYS.theme, theme);
  if (themeToggle) themeToggle.textContent = theme === "dark" ? "🌙" : "☀️";
}
function toggleTheme() {
  const cur = localStorage.getItem(KEYS.theme) || "light";
  applyTheme(cur === "dark" ? "light" : "dark");
}

// ---------------- name editor ----------------
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
  closeNameEditor();                 // ✅ save button disappears because editor hides
  setStatus("Name saved ✅");
}

// ---------------- streak logic ----------------
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

  // reminders UI state
  const savedTime = localStorage.getItem(KEYS.remindTime) || "";
  if (remindTimeInput) remindTimeInput.value = savedTime;
  if (repeat30Chk) repeat30Chk.checked = (localStorage.getItem(KEYS.repeat30) || "0") === "1";

  updateNextReminderText();
  updateReminderButtonText();
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
    }
  }

  localStorage.setItem(KEYS.count, String(count));
  localStorage.setItem(KEYS.last, today);
  render();
}

function resetStreak() {
  localStorage.setItem(KEYS.count, "0");
  localStorage.removeItem(KEYS.last);
  setStatus("Reset done ✅");
  render();
}

// ---------------- OneSignal / reminders ----------------
function onesignalReady(fn) {
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  OneSignalDeferred.push(async function(OneSignal) {
    try {
      await fn(OneSignal);
    } catch (e) {
      console.error(e);
      setNotifStatus("OneSignal error. Check console.");
    }
  });
}

function updateReminderButtonText() {
  onesignalReady(async (OneSignal) => {
    const perm = OneSignal.Notifications.permission; // 'default' | 'granted' | 'denied'
    const optedIn = OneSignal.User?.PushSubscription?.optedIn;

    if (!enableNotifsBtn) return;

    if (perm === "denied") {
      enableNotifsBtn.textContent = "Notifications blocked ❌";
      enableNotifsBtn.disabled = true;
      setNotifStatus("Your browser blocked notifications. You must allow them in site settings.");
      return;
    }

    if (perm === "granted" && optedIn) {
      enableNotifsBtn.textContent = "Reminders enabled ✅";
      enableNotifsBtn.disabled = true;
      setNotifStatus("You’re already subscribed. Reminders are ready ✅");
    } else {
      enableNotifsBtn.textContent = "Enable reminders";
      enableNotifsBtn.disabled = false;
      setNotifStatus("");
    }
  });
}

async function enableReminders() {
  setNotifStatus("Opening permission prompt…");

  onesignalReady(async (OneSignal) => {
    const perm = OneSignal.Notifications.permission;

    if (perm === "denied") {
      setNotifStatus("Notifications are blocked in your browser settings ❌");
      return;
    }

    // If already allowed, don't “hang” — just show success
    if (perm === "granted") {
      // ensure subscription is opted in
      await OneSignal.User.PushSubscription.optIn();
      setNotifStatus("Already allowed ✅ Reminders enabled.");
      updateReminderButtonText();
      return;
    }

    // Ask permission (this should trigger the browser popup)
    await OneSignal.Notifications.requestPermission();

    // After permission, opt-in
    if (OneSignal.Notifications.permission === "granted") {
      await OneSignal.User.PushSubscription.optIn();
      setNotifStatus("Enabled ✅");
    } else {
      setNotifStatus("Not enabled (permission not granted).");
    }

    updateReminderButtonText();
  });
}

function updateNextReminderText() {
  const t = localStorage.getItem(KEYS.remindTime) || "";
  if (!t) {
    setNextReminder("Next reminder: (pick a time)");
    return;
  }

  const [hh, mm] = t.split(":").map(Number);
  const now = new Date();
  const next = new Date();
  next.setHours(hh, mm, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);

  const pretty = next.toLocaleString(undefined, {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  setNextReminder(`Next reminder: ${pretty}`);
}

function saveReminderTime() {
  if (!remindTimeInput) return;
  const val = (remindTimeInput.value || "").trim(); // "HH:MM" or ""
  if (!val) {
    setNotifStatus("Pick a time first.");
    return;
  }
  localStorage.setItem(KEYS.remindTime, val);
  setNotifStatus("Reminder time saved ✅");
  updateNextReminderText();
}

function setRepeatEvery30(checked) {
  localStorage.setItem(KEYS.repeat30, checked ? "1" : "0");

  // stop old timer
  if (repeat30Timer) {
    clearInterval(repeat30Timer);
    repeat30Timer = null;
  }

  if (!checked) return;

  // This only works while the tab is open (browser limitation).
  // We'll use the browser Notifications API (requires permission granted).
  if (!("Notification" in window)) {
    setNotifStatus("This browser doesn’t support notifications.");
    return;
  }

  if (Notification.permission !== "granted") {
    setNotifStatus("To repeat every 30 mins, enable notifications first.");
    return;
  }

  repeat30Timer = setInterval(() => {
    const title = localStorage.getItem(KEYS.name) || "Streak Reminder";
    new Notification(title, { body: "Quick reminder to check in ✅" });
  }, 30 * 60 * 1000);

  setNotifStatus("30-min repeats ON (while tab is open) ✅");
}

// ---------------- events ----------------
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
  const clickedInside =
    nameEditor.contains(e.target) || (nameDisplay && nameDisplay.contains(e.target));
  if (!clickedInside) closeNameEditor();
});

// reminders events
if (enableNotifsBtn) enableNotifsBtn.addEventListener("click", enableReminders);
if (saveRemindTimeBtn) saveRemindTimeBtn.addEventListener("click", saveReminderTime);
if (repeat30Chk) repeat30Chk.addEventListener("change", (e) => setRepeatEvery30(e.target.checked));

// ---------------- init ----------------
render();

// Update button state once OneSignal is ready
updateReminderButtonText();

// If repeat30 was on, re-enable it (only if permission already granted)
if ((localStorage.getItem(KEYS.repeat30) || "0") === "1") {
  if ("Notification" in window && Notification.permission === "granted") {
    setRepeatEvery30(true);
  }
}
