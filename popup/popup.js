async function getActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0] || null;
}

function setStatus(text, ok) {
  const el = document.getElementById("siteStatus");
  if (!el) return;
  el.textContent = text;
  el.classList.toggle("ok", Boolean(ok));
}

function notify(message, level) {
  const el = document.getElementById("statusMessage");
  if (!el) return;
  el.textContent = message;
  el.className = "status-message" + (level ? " " + level : "");
}

async function refreshSiteStatus() {
  const tab = await getActiveTab();
  const ready = Boolean(tab?.url?.startsWith("https://mydesigns.io/"));
  setStatus(ready ? "MD tab ready" : "Open an MD tab", ready);
}

async function loadToggles() {
  const stored = await chrome.storage.local.get({ qaBarEnabled: true, dropperEnabled: true });
  document.getElementById("qaBarEnabled").checked = Boolean(stored.qaBarEnabled);
  document.getElementById("dropperEnabled").checked = Boolean(stored.dropperEnabled);
}

async function initialize() {
  await loadToggles();
  await refreshSiteStatus();

  document.getElementById("qaBarEnabled").addEventListener("change", async (e) => {
    await chrome.storage.local.set({ qaBarEnabled: e.target.checked });
    notify(e.target.checked ? "Quick Actions Bar enabled." : "Quick Actions Bar disabled.");
  });

  document.getElementById("dropperEnabled").addEventListener("change", async (e) => {
    await chrome.storage.local.set({ dropperEnabled: e.target.checked });
    notify(e.target.checked ? "Drag and Drop Upload enabled." : "Drag and Drop Upload disabled.");
  });

  document.getElementById("fullEnable").addEventListener("click", async () => {
    await chrome.storage.local.set({ enhancerEnabled: true, qaBarEnabled: true, dropperEnabled: true });
    await loadToggles();
    notify("All tools enabled.");
  });

  document.getElementById("fullDisable").addEventListener("click", async () => {
    await chrome.storage.local.set({ enhancerEnabled: false, qaBarEnabled: false, dropperEnabled: false });
    await loadToggles();
    notify("All tools disabled.");
  });
}

initialize();
