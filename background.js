const DEFAULT_SETTINGS = {
  enhancerEnabled: true,
  qaBarEnabled: true,
  dropperEnabled: true,
  globalThemeEnabled: false,
  globalThemeMode: "gradient",
  globalThemeSolidColor: "#1f4ed8",
  globalThemeGradientColor: "#7c3aed",
  globalThemeBrightness: 100,
  globalThemePreset: "bluePurple",
  globalThemeCustomPresets: [],
  clipboardItems: []
};
const THEME_DEFAULT_MIGRATION_KEY = "lddThemeDefaultMigrationDoneV1";

async function ensureDefaults() {
  const current = await chrome.storage.local.get({
    ...DEFAULT_SETTINGS,
    [THEME_DEFAULT_MIGRATION_KEY]: false
  });
  const patch = {};

  for (const [key, defaultValue] of Object.entries(DEFAULT_SETTINGS)) {
    if (typeof current[key] === "undefined") {
      patch[key] = defaultValue;
    }
  }

  if (!current[THEME_DEFAULT_MIGRATION_KEY]) {
    patch.globalThemeEnabled = false;
    patch[THEME_DEFAULT_MIGRATION_KEY] = true;
  }

  if (Object.keys(patch).length > 0) {
    await chrome.storage.local.set(patch);
  }
}

chrome.runtime.onInstalled.addListener((details) => {
  ensureDefaults();
  if (details.reason === "install") {
    chrome.tabs.create({ url: chrome.runtime.getURL("popup/welcome.html") });
  }
});

chrome.runtime.onStartup.addListener(() => {
  ensureDefaults();
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "ldd/openResizer") {
    chrome.windows.create({
      url: chrome.runtime.getURL("popup/resizer.html"),
      type: "popup",
      width: 430,
      height: 640,
      focused: true
    });
    sendResponse({ ok: true });
  }
  if (message?.type === "ldd/openPdfGen") {
    chrome.tabs.create({ url: "https://lddpdf.netlify.app/" });
    sendResponse({ ok: true });
  }
  return false;
});
