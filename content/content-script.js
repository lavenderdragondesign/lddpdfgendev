(() => {
  try {
    document.documentElement.setAttribute("data-ldd-content-script-loaded", "1");
    document.documentElement.setAttribute("data-ldd-content-script-build", "20260317-vision");
  } catch (_error) {
    // Ignore DOM marker failures.
  }
  const THEME_STYLE_ID = "ldd-global-theme-style";
  const THEME_OVERLAY_ID = "ldd-global-theme-overlay";
  const extensionRuntime =
    typeof chrome !== "undefined" && chrome?.runtime && typeof chrome.runtime.getURL === "function"
      ? chrome.runtime
      : null;
  const extensionStorage =
    typeof chrome !== "undefined" && chrome?.storage?.local && typeof chrome.storage.local.get === "function"
      ? chrome.storage.local
      : null;
  const DEFAULT_SETTINGS = {
    enhancerEnabled: true,
    qaBarEnabled: true,
    dropperEnabled: true,
    visionAIPresetsEnabled: true,
    globalThemeEnabled: false,
    globalThemeMode: "gradient",
    globalThemeSolidColor: "#1f4ed8",
    globalThemeGradientColor: "#7c3aed",
    globalThemeBrightness: 100,
    globalThemePreset: "bluePurple",
    globalThemeCustomPresets: []
  };

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function normalizeHexColor(value, fallback) {
    if (typeof value !== "string") return fallback;
    const trimmed = value.trim();
    if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed;
    if (/^#[0-9a-fA-F]{3}$/.test(trimmed)) {
      return `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`;
    }
    return fallback;
  }

  function rgbaFromHex(hexColor, alpha) {
    const safe = normalizeHexColor(hexColor, "#1f4ed8");
    const int = Number.parseInt(safe.slice(1), 16);
    const r = (int >> 16) & 255;
    const g = (int >> 8) & 255;
    const b = int & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  function adjustHexBrightness(hexColor, brightnessPercent) {
    const safe = normalizeHexColor(hexColor, "#1f4ed8");
    const int = Number.parseInt(safe.slice(1), 16);
    const factor = clamp(Number.parseFloat(brightnessPercent) || 100, 70, 130) / 100;
    const toHex = (channel) => clamp(Math.round(channel * factor), 0, 255).toString(16).padStart(2, "0");
    const r = toHex((int >> 16) & 255);
    const g = toHex((int >> 8) & 255);
    const b = toHex(int & 255);
    return `#${r}${g}${b}`;
  }

  function applyGlobalTheme(settings) {
    const enabled = Boolean(settings.globalThemeEnabled);
    const existing = document.getElementById(THEME_STYLE_ID);
    const existingOverlay = document.getElementById(THEME_OVERLAY_ID);

    if (!enabled) {
      existing?.remove();
      existingOverlay?.remove();
      return;
    }

    const mode = settings.globalThemeMode === "solid" ? "solid" : "gradient";
    const brightness = clamp(Number.parseFloat(settings.globalThemeBrightness) || 100, 70, 130);
    const solid = adjustHexBrightness(settings.globalThemeSolidColor, brightness);
    const gradient = adjustHexBrightness(settings.globalThemeGradientColor, brightness);
    const accentGradient =
      mode === "solid"
        ? `linear-gradient(135deg, ${solid} 0%, ${solid} 100%)`
        : `linear-gradient(135deg, ${solid} 0%, ${gradient} 100%)`;
    const pageBackground =
      mode === "solid"
        ? `linear-gradient(180deg, #ffffff 0%, ${rgbaFromHex(solid, 0.14)} 100%)`
        : `linear-gradient(165deg, #ffffff 0%, ${rgbaFromHex(solid, 0.13)} 42%, ${rgbaFromHex(gradient, 0.15)} 100%)`;
    const surfaceBackground =
      mode === "solid"
        ? `linear-gradient(180deg, rgba(255,255,255,0.98) 0%, ${rgbaFromHex(solid, 0.08)} 100%)`
        : `linear-gradient(180deg, rgba(255,255,255,0.98) 0%, ${rgbaFromHex(solid, 0.07)} 45%, ${rgbaFromHex(gradient, 0.09)} 100%)`;
    const borderTint = rgbaFromHex(solid, 0.26);
    const softBorderTint = rgbaFromHex(solid, 0.18);
    const focusTint = rgbaFromHex(gradient, 0.3);
    const buttonBorder = rgbaFromHex(gradient, 0.52);
    const shadowSoft = rgbaFromHex(solid, 0.18);
    const shadowStrong = rgbaFromHex(gradient, 0.28);

    const style = existing || document.createElement("style");
    style.id = THEME_STYLE_ID;
    style.textContent = `
      :root {
        --ldd-theme-solid: ${solid};
        --ldd-theme-gradient: ${gradient};
        --ldd-theme-accent: ${accentGradient};
        --ldd-theme-page: ${pageBackground};
        --ldd-theme-surface: ${surfaceBackground};
        --ldd-theme-border: ${borderTint};
        --ldd-theme-border-soft: ${softBorderTint};
        --ldd-theme-focus: ${focusTint};
        --ldd-theme-shadow-soft: 0 10px 28px ${shadowSoft};
        --ldd-theme-shadow-strong: 0 16px 40px ${shadowStrong};
      }

      html {
        background: var(--ldd-theme-page) fixed !important;
      }

      body {
        background: var(--ldd-theme-page) !important;
        color: #2b3854 !important;
      }

      body :where(
        .bg-white,
        [class*="bg-white"],
        [class*="bg-slate-"],
        [class*="bg-gray-"],
        [class*="bg-zinc-"],
        [class*="bg-neutral-"],
        [class*="card"],
        [class*="panel"],
        [role="dialog"]
      ):not(#ldd-enhancer-root):not(#ldd-enhancer-root *):not([id^="ldd-"]):not([class*="ldd-"]) {
        background: var(--ldd-theme-surface) !important;
        border-color: var(--ldd-theme-border-soft) !important;
        box-shadow: var(--ldd-theme-shadow-soft) !important;
      }

      body :where(
        header,
        [class*="topbar"],
        [class*="navbar"],
        [class*="border-b"]
      ):not(#ldd-enhancer-root):not(#ldd-enhancer-root *):not([id^="ldd-"]):not([class*="ldd-"]) {
        background-image: var(--ldd-theme-accent) !important;
        border-color: transparent !important;
        color: rgba(255, 255, 255, 0.95) !important;
      }

      body :where(
        header *,
        [class*="topbar"] *,
        [class*="navbar"] *
      ):not(#ldd-enhancer-root):not(#ldd-enhancer-root *):not([id^="ldd-"]):not([class*="ldd-"]) {
        color: inherit !important;
      }

      body :where(
        [class*="border-"],
        .border
      ):not(#ldd-enhancer-root):not(#ldd-enhancer-root *):not([id^="ldd-"]):not([class*="ldd-"]) {
        border-color: var(--ldd-theme-border-soft) !important;
      }

      body :where(
        button,
        [role="button"],
        .btn,
        a[class*="btn"]
      ):not(#ldd-enhancer-root):not(#ldd-enhancer-root *):not([id^="ldd-"]):not([class*="ldd-"]) {
        border-radius: 12px !important;
      }

      body :where(
        button[class*="bg-"],
        a[class*="bg-"],
        button[class*="primary"],
        .btn.primary,
        [data-variant="primary"]
      ):not(#ldd-enhancer-root):not(#ldd-enhancer-root *):not([id^="ldd-"]):not([class*="ldd-"]) {
        background-image: var(--ldd-theme-accent) !important;
        border-color: ${buttonBorder} !important;
        color: #ffffff !important;
      }

      body :where(
        input,
        textarea,
        select
      ):not(#ldd-enhancer-root):not(#ldd-enhancer-root *):not([id^="ldd-"]):not([class*="ldd-"]) {
        background: rgba(255, 255, 255, 0.98) !important;
        border: 1px solid var(--ldd-theme-border) !important;
        border-radius: 12px !important;
        color: #2b3854 !important;
      }

      body :where(input, textarea):not(#ldd-enhancer-root):not(#ldd-enhancer-root *):not([id^="ldd-"]):not([class*="ldd-"])::placeholder {
        color: #8a95ad !important;
      }

      body :where(
        input:focus,
        textarea:focus,
        select:focus
      ):not(#ldd-enhancer-root):not(#ldd-enhancer-root *):not([id^="ldd-"]):not([class*="ldd-"]) {
        border-color: ${gradient} !important;
        box-shadow: 0 0 0 3px var(--ldd-theme-focus) !important;
        outline: none !important;
      }

      body :where(
        [class*="shadow"],
        .shadow
      ):not(#ldd-enhancer-root):not(#ldd-enhancer-root *):not([id^="ldd-"]):not([class*="ldd-"]) {
        box-shadow: var(--ldd-theme-shadow-strong) !important;
      }

      body *:not(#ldd-enhancer-root):not(#ldd-enhancer-root *)::-webkit-scrollbar {
        width: 10px;
        height: 10px;
      }

      body *:not(#ldd-enhancer-root):not(#ldd-enhancer-root *)::-webkit-scrollbar-thumb {
        background: var(--ldd-theme-accent);
        border-radius: 999px;
      }
    `;

    if (!existing) {
      document.documentElement.appendChild(style);
    }
    existingOverlay?.remove();
  }

  function isListingsPage() {
    const host = (window.location.hostname || "").toLowerCase();
    const path = (window.location.pathname || "").replace(/\/+$/, "");
    const validHost = host.includes("mydesigns.io");
    return validHost && path.includes("/app/list");
  }

  function applyFeatureSettings(settings) {
    const listingsPage = isListingsPage();
    applyGlobalTheme(settings);

    if (settings.enhancerEnabled && listingsPage) {
      window.LDDEnhancer?.enable?.();
    } else {
      window.LDDEnhancer?.disable?.();
    }

    if (settings.qaBarEnabled && listingsPage) {
      window.LDDQaBar?.enable?.();
    } else {
      window.LDDQaBar?.disable?.();
    }

    if (settings.dropperEnabled && listingsPage) {
      window.LDDDropper?.enable?.();
    } else {
      window.LDDDropper?.disable?.();
    }

    visionPresetsEnabled = Boolean(settings.visionAIPresetsEnabled ?? true);
    if (!visionPresetsEnabled) {
      document.getElementById(VISION_PRESET_BLOCK_ID)?.remove();
      visionMountedRoot = null;
    }
  }

  async function loadAndApplySettings() {
    try {
      if (!extensionStorage) {
        applyFeatureSettings(DEFAULT_SETTINGS);
        return;
      }
      const settings = await extensionStorage.get(DEFAULT_SETTINGS);
      applyFeatureSettings(settings);
    } catch (_error) {
      applyFeatureSettings(DEFAULT_SETTINGS);
    }
  }

  function findPasteTarget() {
    const selectors = [
      'textarea[placeholder*="emojis"]',
      'textarea[placeholder*="keyword"]',
      'textarea[placeholder*="title"]',
      'textarea',
      'input[type="text"]'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element && typeof element.focus === "function") return element;
    }

    return null;
  }

  function pasteIntoPage(text) {
    const target = findPasteTarget();
    if (!target) return false;

    target.focus();
    target.value = text;
    target.dispatchEvent(new Event("input", { bubbles: true }));
    target.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }

  const VISION_PRESET_STYLE_ID = "ldd-vision-preset-style";
  const VISION_PRESET_BLOCK_ID = "ldd-vision-preset-block";
  const VISION_PRESET_TYPES = ["PNG", "SVG", "TUMBLER WRAP", "MUG WRAP"];
  const VISION_PRESET_LOGO_URL =
    extensionRuntime?.getURL?.("assets/logo.png") ||
    "https://raw.githubusercontent.com/lavenderdragondesign/lddupscalermodels/main/download%20(21).png";
  const VISION_RUN_INTERVAL_MS = 1100;
  const VISION_RUN_DEBOUNCE_MS = 200;

  let visionRunScheduled = false;
  let visionMountedRoot = null;
  let visionWriteInProgress = false;
  let visionPresetsEnabled = true;

  function norm(value) {
    return String(value || "").replace(/\s+/g, " ").trim().toLowerCase();
  }

  function isElementVisible(el) {
    if (!el) return false;
    const s = window.getComputedStyle(el);
    return s.display !== "none" && s.visibility !== "hidden" &&
      (el.offsetParent !== null || el.getClientRects().length > 0);
  }

  function setInputValue(input, value) {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
    if (setter) setter.call(input, value); else input.value = value;
    input.dispatchEvent(new Event("input",  { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function findVisionModalRoot() {
    const all = Array.from(document.querySelectorAll("div,form")).filter((n) => {
      const t = norm(n.textContent || "");
      return t.includes("vision ai") &&
        t.includes("generate listing data based on your design") &&
        t.includes("select product type");
    });
    if (!all.length) return null;
    let best = all[0], bestDepth = Infinity;
    for (const c of all) {
      let d = 0, n = c; while (n) { d++; n = n.parentElement; }
      if (d < bestDepth) { bestDepth = d; best = c; }
    }
    return best;
  }

  function findVisionCustomTypeInput(root) {
    const scope = root || document;
    const inp = scope.querySelector('input[maxlength="150"]');
    return (inp && isElementVisible(inp)) ? inp : null;
  }

  function ensureVisionPresetStyle() {
    if (document.getElementById(VISION_PRESET_STYLE_ID)) return;
    const s = document.createElement("style");
    s.id = VISION_PRESET_STYLE_ID;
    s.textContent =
      "#" + VISION_PRESET_BLOCK_ID + "{display:flex;align-items:center;gap:5px;margin-bottom:6px;}" +
      "#" + VISION_PRESET_BLOCK_ID + " .ldd-logo{width:14px;height:14px;border-radius:3px;object-fit:cover;flex-shrink:0;}" +
      "#" + VISION_PRESET_BLOCK_ID + " .ldd-chips{display:flex;gap:4px;flex-wrap:wrap;}" +
      "#" + VISION_PRESET_BLOCK_ID + " .ldd-chip{display:inline-flex;align-items:center;gap:4px;padding:3px 6px 3px 10px;" +
        "border:1px solid #cbd5e1;border-radius:999px;background:#fff;color:#475569;font-size:11px;" +
        "font-weight:600;cursor:pointer;user-select:none;white-space:nowrap;line-height:1.4;font-family:inherit;}" +
      "#" + VISION_PRESET_BLOCK_ID + " .ldd-chip:hover{border-color:#6366f1;color:#4338ca;background:#eef2ff;}" +
      "#" + VISION_PRESET_BLOCK_ID + " .ldd-chip.checked{background:#6366f1;border-color:#6366f1;color:#fff;}" +
      "#" + VISION_PRESET_BLOCK_ID + " .ldd-chip-del{display:inline-flex;align-items:center;justify-content:center;" +
        "width:13px;height:13px;border-radius:50%;border:none;background:transparent;color:inherit;" +
        "font-size:10px;line-height:1;cursor:pointer;padding:0;opacity:0.55;flex-shrink:0;}" +
      "#" + VISION_PRESET_BLOCK_ID + " .ldd-chip-del:hover{opacity:1;background:rgba(0,0,0,0.12);}" +
      "#" + VISION_PRESET_BLOCK_ID + " .ldd-chip.checked .ldd-chip-del:hover{background:rgba(255,255,255,0.25);}" +
      "#" + VISION_PRESET_BLOCK_ID + " .ldd-add-row{display:inline-flex;align-items:center;gap:3px;flex-shrink:0;}" +
      "#" + VISION_PRESET_BLOCK_ID + " .ldd-add-input{height:24px;padding:0 7px;border:1px solid #cbd5e1;border-radius:999px;" +
        "font-size:11px;font-family:inherit;color:#334155;background:#fff;width:90px;outline:none;}" +
      "#" + VISION_PRESET_BLOCK_ID + " .ldd-add-input:focus{border-color:#6366f1;}" +
      "#" + VISION_PRESET_BLOCK_ID + " .ldd-add-btn{display:inline-flex;align-items:center;justify-content:center;" +
        "height:24px;width:24px;border:1px solid #cbd5e1;border-radius:50%;background:#fff;color:#6366f1;" +
        "font-size:15px;line-height:1;cursor:pointer;flex-shrink:0;font-weight:700;}" +
      "#" + VISION_PRESET_BLOCK_ID + " .ldd-add-btn:hover{border-color:#6366f1;background:#eef2ff;}" +
      "#" + VISION_PRESET_BLOCK_ID + " .ldd-chip-toggle{display:inline-flex;align-items:center;padding:2px 5px;" +
        "border:1px solid #e2e8f0;border-radius:6px;background:transparent;color:#94a3b8;font-size:11px;" +
        "cursor:pointer;user-select:none;line-height:1;margin-left:2px;flex-shrink:0;}" +
      "#" + VISION_PRESET_BLOCK_ID + " .ldd-chip-toggle:hover{border-color:#6366f1;color:#6366f1;background:#eef2ff;}";
    document.head.appendChild(s);
  }

  function buildVisionPresetBlock(root) {
    const block = document.createElement("div");
    block.id = VISION_PRESET_BLOCK_ID;

    const logo = document.createElement("img");
    logo.className = "ldd-logo";
    logo.src = VISION_PRESET_LOGO_URL;
    logo.alt = ""; logo.setAttribute("aria-hidden", "true");
    block.appendChild(logo);

    const chips = document.createElement("div");
    chips.className = "ldd-chips";
    block.appendChild(chips);

    // Inline add row
    const addRow = document.createElement("div");
    addRow.className = "ldd-add-row";
    const addInput = document.createElement("input");
    addInput.type = "text"; addInput.className = "ldd-add-input";
    addInput.placeholder = "Add type…"; addInput.maxLength = 40;
    const addBtn = document.createElement("button");
    addBtn.type = "button"; addBtn.className = "ldd-add-btn"; addBtn.title = "Add type"; addBtn.textContent = "+";
    addRow.appendChild(addInput); addRow.appendChild(addBtn);
    block.appendChild(addRow);

    // Collapse toggle
    const collapseBtn = document.createElement("button");
    collapseBtn.type = "button"; collapseBtn.className = "ldd-chip-toggle";
    collapseBtn.title = "Hide quick types"; collapseBtn.textContent = "▾";
    block.appendChild(collapseBtn);

    function syncInputField() {
      if (visionWriteInProgress) return;
      visionWriteInProgress = true;
      try {
        const sel = Array.from(chips.querySelectorAll(".ldd-chip[data-checked='1']"))
          .map((b) => b.dataset.type).filter(Boolean);
        const inp = findVisionCustomTypeInput(root);
        if (inp) setInputValue(inp, sel.join(", "));
      } finally { visionWriteInProgress = false; }
    }

    function makeChip(typeValue) {
      const chip = document.createElement("div");
      chip.className = "ldd-chip";
      chip.dataset.type = typeValue; chip.dataset.checked = "0";
      chip.setAttribute("role", "button"); chip.setAttribute("tabindex", "0");

      const label = document.createElement("span");
      label.textContent = typeValue;
      chip.appendChild(label);

      const del = document.createElement("button");
      del.type = "button"; del.className = "ldd-chip-del"; del.title = "Remove"; del.textContent = "×";
      chip.appendChild(del);

      function toggleChip() {
        const on = chip.dataset.checked === "1";
        chip.dataset.checked = on ? "0" : "1";
        chip.classList.toggle("checked", !on);
        syncInputField();
      }

      chip.addEventListener("click", (e) => {
        e.preventDefault(); e.stopPropagation();
        if (e.target === del) return; // del handles itself
        toggleChip();
      });
      chip.addEventListener("keydown", (e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); toggleChip(); } });

      del.addEventListener("click", (e) => {
        e.preventDefault(); e.stopPropagation();
        chip.remove();
        const remaining = Array.from(chips.querySelectorAll(".ldd-chip"))
          .map((b) => b.dataset.type).filter(Boolean);
        chrome.storage.local.set({ visionAIPresetCustomTypes: remaining });
        syncInputField();
      });

      return chip;
    }

    function renderChips(types) {
      chips.innerHTML = "";
      types.forEach((t) => chips.appendChild(makeChip(t)));
    }

    function addType() {
      const val = addInput.value.trim().toUpperCase();
      if (!val) return;
      // don't add duplicates
      const existing = Array.from(chips.querySelectorAll(".ldd-chip")).map((b) => b.dataset.type);
      if (existing.includes(val)) { addInput.value = ""; return; }
      chips.appendChild(makeChip(val));
      addInput.value = "";
      const updated = [...existing, val];
      chrome.storage.local.set({ visionAIPresetCustomTypes: updated });
    }

    addBtn.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); addType(); });
    addInput.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); addType(); } });
    addInput.addEventListener("click", (e) => e.stopPropagation());
    addRow.addEventListener("click", (e) => e.stopPropagation());
    addRow.addEventListener("mousedown", (e) => e.stopPropagation());

    // Collapse logic
    function applyCollapsed(collapsed) {
      chips.style.display = collapsed ? "none" : "";
      addRow.style.display = collapsed ? "none" : "";
      collapseBtn.textContent = collapsed ? "▸" : "▾";
      collapseBtn.title = collapsed ? "Show quick types" : "Hide quick types";
    }
    collapseBtn.addEventListener("click", (e) => {
      e.preventDefault(); e.stopPropagation();
      const collapsed = chips.style.display === "none";
      applyCollapsed(!collapsed);
      chrome.storage.local.set({ visionAIPresetsCollapsed: !collapsed });
    });

    // Load types + collapsed state from storage
    chrome.storage.local.get({ visionAIPresetCustomTypes: null, visionAIPresetsCollapsed: false }, (r) => {
      const types = Array.isArray(r.visionAIPresetCustomTypes) ? r.visionAIPresetCustomTypes : [...VISION_PRESET_TYPES];
      renderChips(types);
      applyCollapsed(Boolean(r.visionAIPresetsCollapsed));
    });

    return block;
  }

  function mountVisionPresetBlock(root) {
    if (!root || !isElementVisible(root)) return;
    if (document.getElementById(VISION_PRESET_BLOCK_ID)?.isConnected) return;
    const inp = findVisionCustomTypeInput(root);
    if (!inp) return;
    ensureVisionPresetStyle();
    inp.parentElement.insertAdjacentElement("beforebegin", buildVisionPresetBlock(root));
  }

  function runVisionPreset() {
    if (!visionPresetsEnabled) return;
    const root = findVisionModalRoot();
    if (!root) {
      if (visionMountedRoot) {
        document.getElementById(VISION_PRESET_BLOCK_ID)?.remove();
        visionMountedRoot = null;
        visionWriteInProgress = false;
      }
      return;
    }
    if (root !== visionMountedRoot) {
      document.getElementById(VISION_PRESET_BLOCK_ID)?.remove();
      visionMountedRoot = root;
    }
    mountVisionPresetBlock(root);
  }

  function queueVisionPresetRun(delay) {
    if (visionRunScheduled) return;
    visionRunScheduled = true;
    window.setTimeout(() => { visionRunScheduled = false; runVisionPreset(); },
      delay != null ? delay : VISION_RUN_DEBOUNCE_MS);
  }

    window.setInterval(() => queueVisionPresetRun(0), VISION_RUN_INTERVAL_MS);
  const visionPresetObserver = new MutationObserver(() => queueVisionPresetRun());
  visionPresetObserver.observe(document.body || document.documentElement, { childList: true, subtree: true });
  queueVisionPresetRun(0);
  loadAndApplySettings();

  // The SPA may not have fully rendered on first load. Poll every 1200ms for
  // up to 24s and re-apply settings until the enhancer is actually mounted.
  // Using 1200ms (longer than bindEvents takes) prevents concurrent enable()
  // calls that would race and tear out each other's DOM roots.
  let _startupTicks = 0;
  const _startupPoll = window.setInterval(() => {
    _startupTicks++;
    if (window.LDDEnhancer?.isOpen !== undefined && document.getElementById("ldd-enhancer-root")) {
      window.clearInterval(_startupPoll);
      return;
    }
    loadAndApplySettings();
    if (_startupTicks >= 20) window.clearInterval(_startupPoll);
  }, 1200);

  let lastKnownLocation = window.location.href || "";
  window.setInterval(() => {
    const currentLocation = window.location.href || "";
    if (currentLocation === lastKnownLocation) return;
    lastKnownLocation = currentLocation;
    loadAndApplySettings();
  }, 250);

  if (typeof chrome !== "undefined" && chrome?.storage?.onChanged?.addListener) {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== "local") return;
      if (!changes.enhancerEnabled && !changes.qaBarEnabled && !changes.dropperEnabled &&
          !changes.visionAIPresetsEnabled &&
          !changes.globalThemeEnabled && !changes.globalThemeMode &&
          !changes.globalThemeSolidColor && !changes.globalThemeGradientColor &&
          !changes.globalThemeBrightness) return;
      extensionStorage?.get(DEFAULT_SETTINGS).then((settings) => applyFeatureSettings(settings));
    });
  }

  if (typeof chrome !== "undefined" && chrome?.runtime?.onMessage?.addListener) {
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message?.type === "ldd/paste" && typeof message.text === "string") {
        const ok = pasteIntoPage(message.text);
        sendResponse({ ok });
        return true;
      }
      if (message?.type === "ldd/ping") {
        sendResponse({ ok: true, url: window.location.href });
        return true;
      }
      return false;
    });
  }

  // ── Keyboard shortcuts + cheatsheet card ─────────────────────────────────


})();