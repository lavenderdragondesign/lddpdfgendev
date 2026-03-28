(() => {
  const ROOT_ID = "ldd-enhancer-root";
  const STYLE_ID = "ldd-enhancer-style";
  const PANEL_ID = "ldd-enhancer-panel";
  const DOCK_ID = "ldd-enhancer-dock";
  const NOTICE_ID = "ldd-enhancer-notice";
  const CLIPBOARD_KEY = "clipboardItems";
  const THEME_CUSTOM_PRESETS_KEY = "globalThemeCustomPresets";
  const DEFAULT_PRODUCT_TYPES = ["PNG", "SVG", "Tumbler Wrap", "Mug Wrap"];
  const MAX_THEME_CUSTOM_PRESETS = 16;
  const LOGO_URL = chrome.runtime.getURL("assets/logo.png");

  const links = {
    etsy: "https://www.etsy.com/shop/LavenderDragonDesign",
    bmac: "https://buymeacoffee.com/lavenderdragondesign"
  };

  const defaultProfit = {
    salePrice: 10,
    shippingPriceCustomer: 0,
    itemQuantity: 1,
    discountValue: 0,
    discountType: "flat",
    costPerItem: 5,
    actualShippingCost: 0,
    listingFee: 0.2,
    transactionFeePercent: 6.5,
    advertisingCost: 0,
    advertisingType: "percent",
    miscCost: 0,
    miscType: "flat",
    goalValue: 5
  };

  const THEME_DEFAULTS = {
    globalThemeEnabled: false,
    globalThemeMode: "gradient",
    globalThemeSolidColor: "#1f4ed8",
    globalThemeGradientColor: "#7c3aed",
    globalThemeBrightness: 100,
    globalThemePreset: "bluePurple"
  };

  const THEME_PRESETS = [
    { id: "greenWhite", label: "Green + White", solid: "#22c55e", gradient: "#10b981", mode: "gradient" },
    { id: "blue", label: "Blue", solid: "#3b82f6", gradient: "#60a5fa", mode: "gradient" },
    { id: "bluePurple", label: "Blue -> Purple", solid: "#3b82f6", gradient: "#a855f7", mode: "gradient" },
    { id: "purpleWhite", label: "Purple + White", solid: "#a855f7", gradient: "#ede9fe", mode: "gradient" },
    { id: "red", label: "Red", solid: "#ef4444", gradient: "#fb7185", mode: "gradient" },
    { id: "pink", label: "Pink", solid: "#ec4899", gradient: "#f472b6", mode: "gradient" },
    { id: "off", label: "Off (Default)", solid: "#94a3b8", gradient: "#cbd5e1", mode: "solid", off: true }
  ];

  const state = {
    enabled: false,
    keywords: [],
    clipboardItems: [],
    clipboardSearch: "",
    clipboardEditingId: null,
    panelOpen: false,
    theme: { ...THEME_DEFAULTS },
    themeCustomPresets: []
  };
  let teardownPanelInteractions = null;
  let pageGuardIntervalId = null;
  let lastKnownUrl = window.location.href || "";

  function isListingsPage() {
    const origin = window.location.origin || "";
    const pathname = (window.location.pathname || "").replace(/\/+$/, "");
    return origin === "https://mydesigns.io" && pathname === "/app/listings";
  }

  function startPageGuard() {
    if (pageGuardIntervalId !== null) return;
    lastKnownUrl = window.location.href || "";
    pageGuardIntervalId = window.setInterval(() => {
      const currentUrl = window.location.href || "";
      if (currentUrl === lastKnownUrl) return;
      lastKnownUrl = currentUrl;
      if (!isListingsPage()) disable();
    }, 250);
  }

  function stopPageGuard() {
    if (pageGuardIntervalId === null) return;
    window.clearInterval(pageGuardIntervalId);
    pageGuardIntervalId = null;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function uid() {
    return Math.random().toString(36).slice(2, 10);
  }

  function norm(value) {
    return (value || "").replace(/\s+/g, " ").trim().toLowerCase();
  }

  function fmtMoney(value) {
    return `$${value.toFixed(2)}`;
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

  function normalizeThemeBrightness(value, fallback = THEME_DEFAULTS.globalThemeBrightness) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) return clamp(fallback, 70, 130);
    return clamp(parsed, 70, 130);
  }

  function normalizeThemeSettings(raw) {
    return {
      globalThemeEnabled: Boolean(raw.globalThemeEnabled),
      globalThemeMode: raw.globalThemeMode === "solid" ? "solid" : "gradient",
      globalThemeSolidColor: normalizeHexColor(raw.globalThemeSolidColor, THEME_DEFAULTS.globalThemeSolidColor),
      globalThemeGradientColor: normalizeHexColor(raw.globalThemeGradientColor, THEME_DEFAULTS.globalThemeGradientColor),
      globalThemeBrightness: normalizeThemeBrightness(raw.globalThemeBrightness),
      globalThemePreset: typeof raw.globalThemePreset === "string" ? raw.globalThemePreset : THEME_DEFAULTS.globalThemePreset
    };
  }

  function sanitizeThemePresetName(value) {
    const cleaned = String(value || "").replace(/\s+/g, " ").trim();
    return cleaned ? cleaned.slice(0, 24) : "My Preset";
  }

  function makeCustomPresetId() {
    return `user-${Date.now().toString(36)}-${uid().slice(0, 4)}`;
  }

  function normalizeCustomThemePreset(raw, index = 0) {
    if (!raw || typeof raw !== "object") return null;
    const id = typeof raw.id === "string" && raw.id.trim() ? raw.id.trim() : `user-legacy-${index}`;
    return {
      id,
      label: sanitizeThemePresetName(raw.label),
      solid: normalizeHexColor(raw.solid, THEME_DEFAULTS.globalThemeSolidColor),
      gradient: normalizeHexColor(raw.gradient, THEME_DEFAULTS.globalThemeGradientColor),
      mode: raw.mode === "solid" ? "solid" : "gradient",
      brightness: normalizeThemeBrightness(raw.brightness),
      custom: true
    };
  }

  function normalizeCustomThemePresets(rawList) {
    if (!Array.isArray(rawList)) return [];
    const seen = new Set();
    const list = [];
    rawList.forEach((raw, index) => {
      const normalized = normalizeCustomThemePreset(raw, index);
      if (!normalized || seen.has(normalized.id)) return;
      seen.add(normalized.id);
      list.push(normalized);
    });
    return list.slice(0, MAX_THEME_CUSTOM_PRESETS);
  }

  function allThemePresets() {
    return [...THEME_PRESETS, ...state.themeCustomPresets];
  }

  function notify(message, isError = false) {
    const notice = document.getElementById(NOTICE_ID);
    if (!notice) return;
    notice.textContent = message || "";
    notice.style.color = isError ? "#c9362b" : "#6c7892";
  }

  function findPasteTarget() {
    const selectors = [
      'textarea[placeholder*="emojis"]',
      "textarea",
      'input[type="text"]'
    ];
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element && typeof element.focus === "function") return element;
    }
    return null;
  }

  function pasteToMyDesigns(text) {
    const target = findPasteTarget();
    if (!target || !text?.trim()) return false;
    target.focus();
    target.value = text;
    target.dispatchEvent(new Event("input", { bubbles: true }));
    target.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }

  async function copyText(text) {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch (_error) {
      const helper = document.createElement("textarea");
      helper.value = text;
      helper.style.position = "fixed";
      helper.style.left = "-10000px";
      document.body.appendChild(helper);
      helper.select();
      document.execCommand("copy");
      document.body.removeChild(helper);
    }
  }

  async function pickScreenColor(fallback) {
    if (typeof window.EyeDropper !== "function") {
      notify("Screen color picker is not available in this browser.", true);
      return null;
    }
    try {
      const picker = new window.EyeDropper();
      const picked = await picker.open();
      return normalizeHexColor(picked?.sRGBHex, fallback);
    } catch (_error) {
      return null;
    }
  }

  function openExternal(url) {
    try {
      window.open(url, "_blank", "noopener,noreferrer");
      return true;
    } catch (_error) {
      return false;
    }
  }

  function buildInstructions(mainKeyword, productType, customType) {
    const type = customType.trim() || productType;
    return `This is a ${mainKeyword} ${type}. Use ${mainKeyword} and ${mainKeyword} ${type} in the title and tags. Use ${type} no more than 3 times. Use relevant keywords and keep the wording natural for Etsy SEO.`;
  }

  function generateKeywordList(subject) {
    const cleaned = subject.trim().toLowerCase();
    if (!cleaned) return [];
    const words = cleaned.split(/\s+/).filter(Boolean);
    const lead = words[0] || cleaned;
    const tail = words.slice(1).join(" ");
    return Array.from(
      new Set(
        [
          cleaned,
          `${cleaned} png`,
          `${cleaned} svg`,
          `${cleaned} shirt design`,
          `${cleaned} instant download`,
          `${cleaned} printable`,
          `${lead} ${tail} clipart`.trim(),
          `${cleaned} commercial use`,
          `${cleaned} pod design`,
          `${cleaned} gift idea`,
          `${cleaned} vintage style`,
          `${cleaned} trendy design`
        ].filter(Boolean)
      )
    );
  }

  function calcProfit(input) {
    const discounted =
      input.discountType === "percent"
        ? input.salePrice * (1 - input.discountValue / 100)
        : Math.max(0, input.salePrice - input.discountValue);
    const proceeds = discounted * input.itemQuantity + input.shippingPriceCustomer * input.itemQuantity;
    const txFee = proceeds * (input.transactionFeePercent / 100);
    const payFee = proceeds * 0.03 + 0.25;
    const adFee = input.advertisingType === "percent" ? proceeds * (input.advertisingCost / 100) : input.advertisingCost * input.itemQuantity;
    const miscFee = input.miscType === "percent" ? proceeds * (input.miscCost / 100) : input.miscCost * input.itemQuantity;
    const totalCosts = input.costPerItem * input.itemQuantity + input.actualShippingCost * input.itemQuantity + input.listingFee + txFee + payFee + adFee + miscFee;
    const netProfit = proceeds - totalCosts;

    let suggested = input.salePrice;
    for (let i = 0; i < 800; i += 1) {
      const disc2 = input.discountType === "percent" ? suggested * (1 - input.discountValue / 100) : Math.max(0, suggested - input.discountValue);
      const p2 = disc2 * input.itemQuantity + input.shippingPriceCustomer * input.itemQuantity;
      const c2 = input.costPerItem * input.itemQuantity + input.actualShippingCost * input.itemQuantity + input.listingFee + p2 * (input.transactionFeePercent / 100) + p2 * 0.03 + 0.25 + (input.advertisingType === "percent" ? p2 * (input.advertisingCost / 100) : input.advertisingCost * input.itemQuantity) + (input.miscType === "percent" ? p2 * (input.miscCost / 100) : input.miscCost * input.itemQuantity);
      if (p2 - c2 >= input.goalValue) break;
      suggested += 0.1;
    }

    return {
      suggested,
      proceeds,
      totalCosts,
      netProfit,
      roi: totalCosts > 0 ? (netProfit / totalCosts) * 100 : 0,
      margin: proceeds > 0 ? (netProfit / proceeds) * 100 : 0
    };
  }

  async function readClipboardItems() {
    try {
      const data = await chrome.storage.local.get({ [CLIPBOARD_KEY]: [] });
      const items = Array.isArray(data[CLIPBOARD_KEY]) ? data[CLIPBOARD_KEY] : [];
      return items.map((item) => ({
        id: item.id || uid(),
        name: item.name || "Untitled",
        content: item.content || "",
        pinned: Boolean(item.pinned),
        createdAt: Number(item.createdAt || Date.now())
      }));
    } catch (_error) {
      return [];
    }
  }

  async function writeClipboardItems(items) {
    state.clipboardItems = items;
    try {
      await chrome.storage.local.set({ [CLIPBOARD_KEY]: items });
    } catch (_error) {
      // Ignore storage errors.
    }
  }

  async function readThemeSettings() {
    try {
      const raw = await chrome.storage.local.get(THEME_DEFAULTS);
      return normalizeThemeSettings(raw);
    } catch (_error) {
      return { ...THEME_DEFAULTS };
    }
  }

  async function writeThemeSettings(nextTheme) {
    state.theme = normalizeThemeSettings(nextTheme);
    try {
      await chrome.storage.local.set(state.theme);
    } catch (_error) {
      // Ignore storage errors.
    }
  }

  async function readCustomThemePresets() {
    try {
      const raw = await chrome.storage.local.get({ [THEME_CUSTOM_PRESETS_KEY]: [] });
      return normalizeCustomThemePresets(raw[THEME_CUSTOM_PRESETS_KEY]);
    } catch (_error) {
      return [];
    }
  }

  async function writeCustomThemePresets(nextPresets) {
    state.themeCustomPresets = normalizeCustomThemePresets(nextPresets);
    try {
      await chrome.storage.local.set({ [THEME_CUSTOM_PRESETS_KEY]: state.themeCustomPresets });
    } catch (_error) {
      // Ignore storage errors.
    }
  }

  function filteredClipboard() {
    const query = norm(state.clipboardSearch);
    const filtered = state.clipboardItems.filter((item) => !query || norm(item.name).includes(query) || norm(item.content).includes(query));
    const pinned = filtered.filter((item) => item.pinned).sort((a, b) => b.createdAt - a.createdAt);
    const regular = filtered.filter((item) => !item.pinned).sort((a, b) => b.createdAt - a.createdAt);
    return [...pinned, ...regular];
  }

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #${ROOT_ID}{--surface:#f8faff;--surface-strong:#fff;--surface-soft:#eef2f9;--line:#cad4ea;--text:#1e2a40;--muted:#6f7c97;--accent:#6d5efc;--accent-strong:#4f7cff;--accent-soft:rgba(109,94,252,.14);--shadow:0 16px 46px rgba(26,38,67,.18);--radius:14px;position:fixed;inset:0;z-index:2147483645;pointer-events:none;font-family:'Inter','Segoe UI',system-ui,sans-serif}
      #${ROOT_ID} .enhancer-panel.floating{position:fixed;top:60px;right:60px;transform:translateX(calc(100% + 60px));width:340px;height:calc(100vh - 60px);max-height:900px;display:grid;grid-template-columns:48px 1fr;border:1px solid var(--line);border-radius:16px;background:var(--surface);box-shadow:var(--shadow);overflow:hidden;pointer-events:none;min-width:260px;min-height:200px;max-width:calc(100vw - 80px);opacity:0;transition:transform .45s cubic-bezier(.4,0,.2,1),opacity .35s ease;z-index:0;resize:both}
      #${ROOT_ID} .enhancer-panel.floating.open{transform:translateX(0);opacity:1;pointer-events:auto}
      #${ROOT_ID} .enhancer-panel-inner{overflow:hidden;border-radius:20px;display:contents}
      #${ROOT_ID} .enhancer-sidebar.open .enhancer-sidebar-icons{max-height:0 !important;opacity:0 !important;pointer-events:none}
      #${ROOT_ID} .ldd-resize-handle{position:absolute;z-index:10;background:transparent}
      #${ROOT_ID} .ldd-resize-handle.nw{top:-4px;left:-4px;width:16px;height:16px;cursor:nw-resize}
      #${ROOT_ID} .ldd-resize-handle.ne{top:-4px;right:-4px;width:16px;height:16px;cursor:ne-resize}
      #${ROOT_ID} .ldd-resize-handle.sw{bottom:-4px;left:-4px;width:16px;height:16px;cursor:sw-resize}
      #${ROOT_ID} .ldd-resize-handle.se{bottom:-4px;right:-4px;width:16px;height:16px;cursor:se-resize}
      #${ROOT_ID} .enhancer-sidebar{position:fixed;right:0;top:50%;transform:translateY(-50%);display:flex;flex-direction:column;align-items:center;gap:2px;padding:8px 6px;background:var(--surface-strong);border:1px solid var(--line);border-right:none;border-radius:14px 0 0 14px;box-shadow:-4px 0 20px rgba(26,38,67,.12);pointer-events:auto;z-index:2;transition:z-index 0s .45s,opacity .3s ease}
      #${ROOT_ID} .enhancer-sidebar.open{z-index:0;opacity:0;pointer-events:none;transition:opacity .2s ease}
      #${ROOT_ID} .enhancer-bubble{display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer;padding:4px 2px 8px;border-bottom:1px solid var(--line);margin-bottom:6px;width:100%}
      #${ROOT_ID} .enhancer-bubble-logo{width:28px;height:28px;border-radius:8px;object-fit:cover;box-shadow:0 2px 6px rgba(26,38,67,.18)}
      #${ROOT_ID} .enhancer-bubble-label{font-size:8px;font-weight:800;color:#111;letter-spacing:.03em;text-transform:uppercase;white-space:nowrap;line-height:1}
      #${ROOT_ID} .enhancer-bubble-action{font-size:7.5px;font-weight:700;color:#111;white-space:nowrap;line-height:1;display:flex;align-items:center;gap:2px;text-transform:uppercase;letter-spacing:.04em}
      #${ROOT_ID} #ldd-bubble-arrow{transition:transform .3s ease;flex-shrink:0}
      #${ROOT_ID} .enhancer-sidebar-icons{display:flex;flex-direction:column;align-items:center;gap:2px;overflow:hidden;max-height:0;opacity:0;transition:max-height .35s ease,opacity .25s ease}
      #${ROOT_ID} .enhancer-sidebar.open .enhancer-sidebar-icons{max-height:500px;opacity:1}
      #${ROOT_ID} .enhancer-sidebar-btn{width:36px;height:36px;border:0;border-radius:10px;background:transparent;color:var(--muted);font-size:15px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .15s,color .15s}
      #${ROOT_ID} .enhancer-sidebar-btn:hover{background:var(--accent-soft);color:var(--accent)}
      #${ROOT_ID} .enhancer-sidebar-btn.active{background:var(--accent-soft);color:var(--accent)}
      #${ROOT_ID} .enhancer-icons{display:flex;flex-direction:column;gap:10px;align-items:center;padding:14px 8px;border-right:1px solid var(--line);background:var(--surface-strong)}
      #${ROOT_ID} .enhancer-icon{width:38px;height:38px;border:0;border-radius:12px;background:transparent;color:var(--muted);font-size:16px;cursor:pointer}
      #${ROOT_ID} .enhancer-icon.active{background:var(--accent-soft);color:var(--accent)}
      #${ROOT_ID} .enhancer-content-scroll{padding:16px;overflow-y:auto;overflow-x:hidden;min-height:0;flex:1}
      #${ROOT_ID} .enhancer-header-row{display:flex;align-items:center;justify-content:space-between;padding-bottom:12px;margin-bottom:12px;border-bottom:1px solid var(--line);cursor:move}
      #${ROOT_ID} .enhancer-kicker{font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
      #${ROOT_ID} .enhancer-header-row h2,#${ROOT_ID} .section-heading h3,#${ROOT_ID} .sub-card h4{margin:0}
      #${ROOT_ID} .ghost-btn,#${ROOT_ID} .field,#${ROOT_ID} .primary-btn,#${ROOT_ID} .secondary-btn,#${ROOT_ID} .keyword-chip,#${ROOT_ID} .link-btn{border-radius:var(--radius);border:1px solid var(--line)}
      #${ROOT_ID} .ghost-btn{display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;background:#fff;color:var(--muted);font-size:16px;cursor:pointer}
      #${ROOT_ID} .enhancer-section{display:none;flex-direction:column;gap:12px}
      #${ROOT_ID} .enhancer-section.active{display:flex}
      #${ROOT_ID} .section-heading{display:flex;gap:10px;align-items:center}
      #${ROOT_ID} .section-icon{width:32px;height:32px;border-radius:10px;background:var(--accent-soft);color:var(--accent);display:grid;place-items:center}
      #${ROOT_ID} .muted.compact{margin:3px 0 0;font-size:12px;color:var(--muted)}
      #${ROOT_ID} .legal-note{font-size:11px;line-height:1.45;color:var(--muted);padding:10px 12px;border:1px dashed var(--line);border-radius:12px;background:#fff}
      #${ROOT_ID} .theme-enable-row,#${ROOT_ID} .theme-mode-row{display:flex;align-items:center;justify-content:space-between;gap:10px}
      #${ROOT_ID} .theme-enable-row span,#${ROOT_ID} .theme-mode-row span,#${ROOT_ID} .theme-label{font-size:11px;font-weight:700;color:var(--muted)}
      #${ROOT_ID} .theme-mode-buttons{display:flex;gap:6px}
      #${ROOT_ID} .theme-mode-btn{padding:6px 10px;border:1px solid var(--line);border-radius:10px;background:#fff;color:var(--text);font-size:12px;cursor:pointer}
      #${ROOT_ID} .theme-mode-btn.active{background:linear-gradient(135deg,var(--accent-soft),rgba(79,124,255,.22));border-color:rgba(79,124,255,.34);color:var(--accent)}
      #${ROOT_ID} .theme-color-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
      #${ROOT_ID} .theme-color-head{display:flex;align-items:center;justify-content:space-between;gap:8px}
      #${ROOT_ID} .theme-pick-btn{padding:4px 8px;font-size:11px;line-height:1;border-radius:9px}
      #${ROOT_ID} .theme-color-input{height:36px;min-height:36px;padding:3px;border-radius:10px;cursor:pointer}
      #${ROOT_ID} .theme-brightness-row{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:10px}
      #${ROOT_ID} .theme-brightness-slider{width:100%}
      #${ROOT_ID} .theme-brightness-value{font-size:12px;color:var(--text);min-width:42px;text-align:right}
      #${ROOT_ID} .theme-preview{height:34px;border-radius:10px;border:1px solid var(--line)}
      #${ROOT_ID} .theme-presets-tools{display:flex;gap:8px;margin:8px 0 10px}
      #${ROOT_ID} .theme-presets-tools .field{min-height:34px}
      #${ROOT_ID} .theme-presets-tools .small-btn{white-space:nowrap}
      #${ROOT_ID} .theme-presets{display:grid;grid-template-columns:1fr 1fr;gap:8px}
      #${ROOT_ID} .theme-preset{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 10px;border:1px solid var(--line);border-radius:12px;background:#fff;color:var(--text);font-size:12px;font-weight:700;cursor:pointer}
      #${ROOT_ID} .theme-preset.active{outline:2px solid rgba(79,124,255,.28);border-color:rgba(79,124,255,.4)}
      #${ROOT_ID} .theme-preset-label{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:125px}
      #${ROOT_ID} .theme-preset-actions{display:flex;align-items:center;gap:6px}
      #${ROOT_ID} .theme-preset-delete{border:1px solid var(--line);background:#fff;color:var(--muted);border-radius:7px;width:20px;height:20px;line-height:1;cursor:pointer;padding:0;font-size:12px}
      #${ROOT_ID} .theme-preset-delete:hover{color:#ef4444;border-color:rgba(239,68,68,.35)}
      #${ROOT_ID} .theme-swatch{width:34px;height:14px;border-radius:999px;border:1px solid rgba(0,0,0,.12)}
      #${ROOT_ID} .sub-card{padding:14px;border:1px solid var(--line);border-radius:14px;background:var(--surface-strong)}
      #${ROOT_ID} .field-stack{display:flex;flex-direction:column;gap:9px}
      #${ROOT_ID} label{font-size:11px;font-weight:600;color:var(--muted)}
      #${ROOT_ID} .field{width:100%;min-height:34px;padding:8px 11px;background:#fff;color:var(--text);font-size:13px}
      #${ROOT_ID} .field:focus{outline:none;border-color:var(--accent)}
      #${ROOT_ID} .area{min-height:90px;resize:vertical}
      #${ROOT_ID} .button-row{display:flex;gap:8px;flex-wrap:wrap}
      #${ROOT_ID} .primary-btn{padding:10px 16px;background:linear-gradient(135deg,var(--accent),var(--accent-strong));color:#fff;border:none;font-size:13px;font-weight:700;cursor:pointer}
      #${ROOT_ID} .secondary-btn,#${ROOT_ID} .keyword-chip,#${ROOT_ID} .link-btn{padding:8px 12px;background:#fff;color:var(--text);font-size:13px;cursor:pointer}
      #${ROOT_ID} .small-btn{padding:6px 10px;font-size:12px}
      #${ROOT_ID} .grid-two{display:grid;grid-template-columns:1fr 1fr;gap:10px}
      #${ROOT_ID} .keyword-grid{display:flex;flex-wrap:wrap;gap:7px}
      #${ROOT_ID} .result-line{display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:1px solid var(--line);font-size:13px}
      #${ROOT_ID} .result-line:last-child{border-bottom:0}
      #${ROOT_ID} .empty-state{font-size:13px;color:var(--muted);text-align:center}
      #${ROOT_ID} .clipboard-toolbar{display:flex;align-items:center;gap:8px}
      #${ROOT_ID} .clipboard-search-wrap{flex:1;position:relative;display:flex;align-items:center}
      #${ROOT_ID} .clipboard-search-icon{position:absolute;left:9px;color:var(--muted);pointer-events:none}
      #${ROOT_ID} .clipboard-search{width:100%;border:1px solid var(--line);border-radius:var(--radius);padding:7px 32px 7px 30px;font-size:13px}
      #${ROOT_ID} .clipboard-clear{position:absolute;right:8px;border:0;background:none;color:var(--muted);cursor:pointer}
      #${ROOT_ID} .clipboard-list{display:flex;flex-direction:column;gap:8px}
      #${ROOT_ID} .clipboard-card{border:1px solid var(--line);border-radius:14px;background:#fff;overflow:hidden;border-left:3px solid transparent}
      #${ROOT_ID} .clipboard-card.pinned{border-left-color:var(--accent)}
      #${ROOT_ID} .clipboard-card-top{padding:10px 12px 6px;cursor:pointer}
      #${ROOT_ID} .clipboard-card-meta{display:flex;gap:6px;align-items:center}
      #${ROOT_ID} .clipboard-card-name{font-size:13px;font-weight:600}
      #${ROOT_ID} .clipboard-card-preview{margin:4px 0 0;font-size:11px;color:var(--muted);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
      #${ROOT_ID} .clipboard-card-actions{display:flex;border-top:1px solid var(--line);background:var(--surface-soft)}
      #${ROOT_ID} .clip-action-btn{flex:1;border:0;background:none;padding:7px 4px;font-size:11px;font-weight:600;color:var(--muted);border-right:1px solid var(--line);cursor:pointer}
      #${ROOT_ID} .clip-action-btn:last-child{border-right:none}
      #${ROOT_ID} .copy-btn.copied{color:#22c55e}
      #${ROOT_ID} .pin-btn.active{color:var(--accent)}
      #${ROOT_ID} .delete-btn:hover{color:#ef4444}
      #${NOTICE_ID}{margin-top:10px;font-size:11px;color:var(--muted);min-height:18px}
      #ldd-icon-tip{position:fixed;background:#fff;border:1px solid var(--line);border-radius:10px;padding:7px 13px 7px 10px;font-size:12px;font-weight:600;color:var(--text);white-space:nowrap;box-shadow:0 4px 20px rgba(26,38,67,.18);pointer-events:none;opacity:0;transition:opacity .12s;z-index:2147483646;display:flex;align-items:center;gap:8px}
      #ldd-save-modal{position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;pointer-events:auto}
      #ldd-save-modal-backdrop{position:absolute;inset:0;background:rgba(26,38,67,.35);backdrop-filter:blur(2px)}
      #ldd-save-modal-box{position:relative;background:#fff;border:1px solid #cad4ea;border-radius:16px;padding:24px 22px 20px;box-shadow:0 20px 50px rgba(26,38,67,.22);max-width:300px;width:90%;display:flex;flex-direction:column;gap:14px;z-index:1}
      #ldd-save-modal-title{font-size:15px;font-weight:800;color:#1e2a40;margin:0}
      #ldd-save-modal-body{font-size:12px;color:#6f7c97;line-height:1.5;margin:0}
      #ldd-save-modal-btns{display:flex;gap:8px}
      #ldd-save-modal-btns button{flex:1;padding:9px 0;border-radius:10px;font-size:12px;font-weight:700;cursor:pointer;border:1px solid var(--line)}
      #ldd-modal-open-pm{background:var(--accent);color:#fff;border-color:var(--accent)}
      #ldd-modal-open-pm:hover{background:var(--accent-strong)}
      #ldd-modal-stay{background:#fff;color:var(--text)}
      #ldd-modal-stay:hover{background:var(--surface-soft)}
      #ldd-icon-tip.visible{opacity:1}
      #ldd-icon-tip .tip-icon{font-size:15px;line-height:1}
      #ldd-icon-tip .tip-text{display:flex;flex-direction:column;gap:1px}
      #ldd-icon-tip .tip-name{font-size:12px;font-weight:700;color:var(--text)}
      #ldd-icon-tip .tip-desc{font-size:10px;font-weight:500;color:var(--muted)}
      #${ROOT_ID} .clip-edit-body{padding:10px 12px;display:flex;flex-direction:column;gap:8px}
      #${ROOT_ID} .clip-edit-name{font-size:13px;font-weight:600;min-height:34px}
      #${ROOT_ID} .clip-edit-content{min-height:100px;resize:vertical;font-size:13px}
      #${ROOT_ID} .clip-save-btn{color:var(--accent);font-weight:700}
      #${ROOT_ID} .clipboard-card.editing{border-color:var(--accent);border-left-color:var(--accent)}
      #${ROOT_ID} .qa-settings-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px 14px}
      #${ROOT_ID} .qa-settings-grid .settings-toggle-row{padding:2px 0}
      #${ROOT_ID} .legal-section-title{margin:0 0 8px;font-size:12px;font-weight:700;color:var(--text)}
      #${ROOT_ID} .legal-note code{font-size:10px;background:var(--surface-soft);padding:1px 4px;border-radius:4px;border:1px solid var(--line)}
      #${ROOT_ID} .settings-toggle-row{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:2px 0}
      #${ROOT_ID} .settings-toggle-label{font-size:11px;font-weight:600;color:var(--text)}
      #${ROOT_ID} .settings-switch{position:relative;display:inline-block;width:30px;height:17px;flex-shrink:0}
      #${ROOT_ID} .settings-switch input{opacity:0;width:0;height:0}
      #${ROOT_ID} .settings-slider{position:absolute;cursor:pointer;inset:0;background:#d1d5e0;border-radius:999px;transition:.2s}
      #${ROOT_ID} .settings-slider:before{content:"";position:absolute;height:12px;width:12px;left:2px;bottom:2px;background:#fff;border-radius:50%;transition:.2s;box-shadow:0 1px 3px rgba(0,0,0,.2)}
      #${ROOT_ID} .settings-switch input:checked+.settings-slider{background:var(--accent)}
      #${ROOT_ID} .settings-switch input:checked+.settings-slider:before{transform:translateX(13px)}
    `;
    document.documentElement.appendChild(style);
  }

  function removeStyle() {
    document.getElementById(STYLE_ID)?.remove();
  }

  function createRoot() {
    document.getElementById(ROOT_ID)?.remove();
    const root = document.createElement("div");
    root.id = ROOT_ID;
    root.innerHTML = `
      <div id="ldd-icon-tip"><span class="tip-icon"></span><span class="tip-text"><span class="tip-name"></span><span class="tip-desc"></span></span></div>
      <div id="${DOCK_ID}" class="enhancer-sidebar">
        <div class="enhancer-bubble" id="ldd-sidebar-bubble">
          <img src="${LOGO_URL}" alt="LDD" class="enhancer-bubble-logo" />
          <span class="enhancer-bubble-label">MD Enhancer</span>
          <span class="enhancer-bubble-action" id="ldd-bubble-action">
            <svg id="ldd-bubble-arrow" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
            <span id="ldd-bubble-action-text">Open</span>
          </span>
        </div>
        <div class="enhancer-sidebar-icons">
          <button class="enhancer-sidebar-btn active" data-tab="welcome" type="button" title="Welcome">🏠</button>
          <button class="enhancer-sidebar-btn" data-tab="instructions" type="button" title="Custom Instructions">✨</button>
          <button class="enhancer-sidebar-btn" data-tab="keywords" type="button" title="Keywords">🔎</button>
          <button class="enhancer-sidebar-btn" data-tab="profit" type="button" title="Profit Calculator">$</button>
          <button class="enhancer-sidebar-btn" data-tab="clipboard" type="button" title="Prompt Manager">📋</button>
          <button class="enhancer-sidebar-btn" data-tab="theme" type="button" title="Theme">🎨</button>
          <button class="enhancer-sidebar-btn" data-tab="resizer" type="button" title="Quick Resizer">⇗</button>
          <button class="enhancer-sidebar-btn" data-tab="compressor" type="button" title="Image Compressor">🗜️</button>
          <button class="enhancer-sidebar-btn" data-tab="pdfgen" type="button" title="PDF Generator">📄</button>
          <button class="enhancer-sidebar-btn" data-tab="legal" type="button" title="Legal">⚖️</button>
          <button class="enhancer-sidebar-btn" data-tab="settings" type="button" title="Settings">⚙️</button>
        </div>
      </div>
      <aside id="${PANEL_ID}" class="enhancer-panel floating">
        <div class="enhancer-icons">
          <button class="enhancer-icon active" data-tab="welcome" data-desc="Get started with MD Enhancer" data-label="Welcome" type="button" title="Welcome">🏠</button>
          <button class="enhancer-icon" data-tab="instructions" data-desc="Generate AI listing instructions" data-label="Instructions" type="button" title="Custom Instructions">✨</button>
          <button class="enhancer-icon" data-tab="keywords" data-desc="Build Etsy SEO keyword lists" data-label="Keywords" type="button" title="Keywords">🔎</button>
          <button class="enhancer-icon" data-tab="profit" data-desc="Calculate profit & margins" data-label="Profit Calc" type="button" title="Profit Calculator">$</button>
          <button class="enhancer-icon" data-tab="clipboard" data-desc="Save and reuse your generated prompts" data-label="Prompt Manager" type="button" title="Prompt Manager">📋</button>
          <button class="enhancer-icon" data-tab="theme" data-desc="Customize the page color theme" data-label="Theme" type="button" title="Theme">🎨</button>
          <button class="enhancer-icon" data-tab="resizer" data-desc="Resize images quickly" data-label="Resizer" type="button" title="Quick Resizer">⇗</button>
          <button class="enhancer-icon" data-tab="compressor" data-desc="Compress & optimize images" data-label="Compressor" type="button" title="Image Compressor">🗜️</button>
          <button class="enhancer-icon" data-tab="pdfgen" data-desc="Make a custom branded PDF from your original MD Download.pdf · 🚧 Under construction" data-label="PDF Gen" type="button" title="PDF Generator">📄</button>
          <button class="enhancer-icon" data-tab="legal" data-desc="Privacy policy & legal notices" data-label="Legal" type="button" title="Legal">⚖️</button>
          <button class="enhancer-icon" data-tab="settings" data-desc="Toggle tools & preferences" data-label="Settings" type="button" title="Settings">⚙️</button>
        </div>
        <div class="enhancer-content-scroll">
          <div class="enhancer-header-row">
            <div style="display:flex;align-items:center;gap:8px;">
              <img src="${LOGO_URL}" alt="LDD" style="width:28px;height:28px;border-radius:8px;object-fit:cover;flex-shrink:0;" />
              <div><div class="enhancer-kicker">LavenderDragonDesign</div><h2>MD Enhancer</h2><div style="font-size:9px;color:var(--muted);margin-top:2px;">↕ Drag header to move · ↔ Resize from corner</div></div>
            </div>
            <button class="ghost-btn" data-action="close" type="button" aria-label="Close MD Enhancer">X</button>
          </div>

          <section class="enhancer-section active" data-panel="welcome">
            <div class="section-heading"><div class="section-icon">🏠</div><div><h3>Welcome!</h3><p class="muted compact">Click any tool icon to get started.</p></div></div>
            <button id="ldd-welcome-dismiss" class="secondary-btn" style="width:100%;margin-bottom:10px;font-size:11px;">Don't show again</button>
            <div class="sub-card field-stack" style="gap:8px;">
              <div style="font-size:11px;font-weight:700;color:#1e2a40;margin-bottom:2px;">Your Tools</div>
              ${[
                ["✨","Custom Instructions","Generate AI prompts for your listings, then paste or save them."],
                ["🔎","Keywords","Build Etsy SEO keyword lists from your design subject."],
                ["$","Profit Calculator","Calculate profit, margins, fees and ad costs per sale."],
                ["📋","Prompt Manager","Save, search and reuse your generated prompts."],
                ["🎨","Theme","Customize the MyDesigns page color theme."],
                ["⇗","Resizer","Quickly resize images to common POD dimensions."],
                ["🗜️","Compressor","Compress & optimize PNG files for upload."],
                ["📄","PDF Gen","Make a custom branded PDF from your original MD Download.pdf. 🚧 Under construction — but you can still open and use it!"],
                ["⚖️","Legal","Privacy policy, legal notices & disclaimer."],
                ["⚙️","Settings","Toggle tools, buttons and preferences."],
              ].map(([icon,name,desc]) => `
              <div style="display:flex;align-items:flex-start;gap:8px;padding:6px 0;border-bottom:1px solid #f0f3f8;">
                <span style="font-size:16px;flex-shrink:0;width:22px;text-align:center;">${icon}</span>
                <div>
                  <div style="font-size:12px;font-weight:700;color:#1e2a40;">${name}</div>
                  <div style="font-size:11px;color:#6f7c97;line-height:1.4;">${desc}</div>
                </div>
              </div>`).join("")}
            </div>
            <div style="margin-top:12px;padding:10px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;font-size:10px;color:#94a3b8;line-height:1.6;text-align:center;">
              This is an independent browser extension and is not affiliated with, endorsed by, or sponsored by MyDesigns.io. MyDesigns.io owns all related trademarks and copyrights. LavenderDragonDesign claims no ownership of any MyDesigns.io intellectual property. Use at your own discretion.
            </div>
          </section>

          <section class="enhancer-section" data-panel="instructions">
            <div class="section-heading"><div class="section-icon">✨</div><div><h3>Custom Instructions</h3></div></div>
            <div style="background:#fff8e1;border:1px solid #fbbf24;border-radius:8px;padding:7px 10px;font-size:11px;font-weight:600;color:#92400e;margin-bottom:8px;">
              ⚠️ Open the Custom Instructions box on the listing before clicking Paste.
            </div>
            <div style="font-size:11px;font-weight:600;color:#1e2a40;line-height:1.6;margin-bottom:8px;">
              1. Enter a keyword &amp; select product type<br/>
              2. Hit <strong>Generate</strong> to create your prompt<br/>
              3. <strong>Paste to Custom Instructions</strong> — auto-pastes into the open CI box<br/>
              4. <strong>Save to Prompt Manager</strong> — saves your prompt for reuse
            </div>
            <div class="sub-card"><div class="field-stack">
              <label>Main Keyword</label><input id="ldd-main-keyword" class="field" placeholder="e.g. Easter goose parade" />
              <label>Product Type</label>
              <select id="ldd-product-type" class="field"></select>
              <label>Custom Type (optional)</label><input id="ldd-custom-type" class="field" placeholder="e.g. Wall Art" />
              <div class="button-row">
                <button id="ldd-gen-inst" class="primary-btn" type="button">Generate</button>
                <button id="ldd-copy-inst" class="secondary-btn" type="button">Copy</button>
                <button id="ldd-paste-inst" class="secondary-btn" type="button">Paste to Custom Instructions</button>
                <button id="ldd-save-inst" class="secondary-btn" type="button">📋 Save to Prompt Manager</button>
              </div>
            </div></div>
            <div class="sub-card"><div class="field-stack"><label>Output</label><textarea id="ldd-inst-out" class="field area"></textarea></div></div>
          </section>

          <section class="enhancer-section" data-panel="keywords">
            <div class="section-heading"><div class="section-icon">🔎</div><div><h3>Keywords</h3><p class="muted compact">Quick keyword helper for Etsy listings.</p></div></div>
            <div class="sub-card field-stack"><label>Main Design Subject</label><input id="ldd-keyword-subject" class="field" placeholder="e.g. retro floral goose" /><button id="ldd-gen-keywords" class="primary-btn" type="button">Generate Keywords</button></div>
            <div class="sub-card"><h4>Results</h4><div id="ldd-keyword-results" class="keyword-grid"></div></div>
          </section>

          <section class="enhancer-section" data-panel="profit">
            <div class="section-heading"><div class="section-icon">$</div><div><h3>Profit Calculator</h3></div></div>
            <div class="sub-card field-stack">
              <div class="grid-two">
                <div class="field-stack"><label>Sale Price</label><input id="ldd-sale-price" class="field" type="number" value="${defaultProfit.salePrice}" /></div>
                <div class="field-stack"><label>Shipping Charged</label><input id="ldd-ship-charge" class="field" type="number" value="${defaultProfit.shippingPriceCustomer}" /></div>
                <div class="field-stack"><label>Quantity</label><input id="ldd-qty" class="field" type="number" value="${defaultProfit.itemQuantity}" /></div>
                <div class="field-stack"><label>Discount</label><input id="ldd-discount" class="field" type="number" value="${defaultProfit.discountValue}" /></div>
                <div class="field-stack"><label>Cost Per Item</label><input id="ldd-cost" class="field" type="number" value="${defaultProfit.costPerItem}" /></div>
                <div class="field-stack"><label>Actual Shipping</label><input id="ldd-actual-ship" class="field" type="number" value="${defaultProfit.actualShippingCost}" /></div>
                <div class="field-stack"><label>Listing Fee</label><input id="ldd-listing-fee" class="field" type="number" value="${defaultProfit.listingFee}" /></div>
                <div class="field-stack"><label>Transaction %</label><input id="ldd-trans-fee" class="field" type="number" value="${defaultProfit.transactionFeePercent}" /></div>
                <div class="field-stack"><label>Ad Cost</label><input id="ldd-ad-cost" class="field" type="number" value="${defaultProfit.advertisingCost}" /></div>
                <div class="field-stack"><label>Misc Cost</label><input id="ldd-misc-cost" class="field" type="number" value="${defaultProfit.miscCost}" /></div>
              </div>
              <div class="grid-two">
                <div class="field-stack"><label>Discount Type</label><select id="ldd-discount-type" class="field"><option value="flat">Flat</option><option value="percent">Percent</option></select></div>
                <div class="field-stack"><label>Ad Type</label><select id="ldd-ad-type" class="field"><option value="percent">Percent</option><option value="flat">Flat</option></select></div>
                <div class="field-stack"><label>Misc Type</label><select id="ldd-misc-type" class="field"><option value="flat">Flat</option><option value="percent">Percent</option></select></div>
                <div class="field-stack"><label>Goal Profit</label><input id="ldd-goal" class="field" type="number" value="${defaultProfit.goalValue}" /></div>
              </div>
              <button id="ldd-calc" class="primary-btn" type="button">Calculate</button>
            </div>
            <div class="sub-card" id="ldd-profit-results"></div>
          </section>

          <section class="enhancer-section" data-panel="clipboard">
            <div class="section-heading"><div class="section-icon">📋</div><div><h3>Prompt Manager</h3><p class="muted compact">Save, search and reuse your generated prompts.</p></div></div>
            <div class="clipboard-toolbar"><div class="clipboard-search-wrap"><span class="clipboard-search-icon">⌕</span><input id="ldd-clip-search" class="clipboard-search" placeholder="Search prompts..." /><button id="ldd-clip-clear" class="clipboard-clear" type="button">×</button></div><button id="ldd-clip-new" class="primary-btn small-btn" type="button">+</button></div>
            <div id="ldd-clip-list" class="clipboard-list"></div>
          </section>

          <section class="enhancer-section" data-panel="theme">
            <div class="section-heading"><div class="section-icon">🎨</div><div><h3>Theme</h3><p class="muted compact">Full-page global theme presets + custom colors.</p></div></div>
            <div class="sub-card field-stack">
              <label class="theme-enable-row"><span>Enable Global Theme</span><input id="ldd-theme-enabled" type="checkbox" /></label>
              <div class="theme-mode-row"><span>Mode</span><div class="theme-mode-buttons"><button id="ldd-theme-mode-solid" class="theme-mode-btn" type="button">Solid</button><button id="ldd-theme-mode-gradient" class="theme-mode-btn" type="button">Gradient</button></div></div>
              <div class="theme-color-grid">
                <label>
                  <div class="theme-color-head"><span class="theme-label">Solid Color</span><button id="ldd-theme-pick-solid" class="secondary-btn theme-pick-btn" type="button">Pick</button></div>
                  <input id="ldd-theme-solid" class="field theme-color-input" type="color" />
                </label>
                <label>
                  <div class="theme-color-head"><span class="theme-label">Gradient Color</span><button id="ldd-theme-pick-gradient" class="secondary-btn theme-pick-btn" type="button">Pick</button></div>
                  <input id="ldd-theme-gradient" class="field theme-color-input" type="color" />
                </label>
              </div>
              <div class="theme-brightness-row"><span class="theme-label">Brightness</span><input id="ldd-theme-brightness" class="theme-brightness-slider" type="range" min="70" max="130" step="1" /><strong id="ldd-theme-brightness-value" class="theme-brightness-value">100%</strong></div>
              <div><div class="theme-label">Preview</div><div id="ldd-theme-preview" class="theme-preview"></div></div>
            </div>
            <div class="sub-card">
              <h4>Presets</h4>
              <div class="theme-presets-tools">
                <input id="ldd-theme-preset-name" class="field" maxlength="24" placeholder="Preset name" />
                <button id="ldd-theme-save-preset" class="secondary-btn small-btn" type="button">Save</button>
              </div>
              <div id="ldd-theme-presets" class="theme-presets"></div>
            </div>
          </section>

          <section class="enhancer-section" data-panel="legal">
            <div class="section-heading"><div class="section-icon">⚖️</div><div><h3>Legal</h3><p class="muted compact">Policies, disclaimers &amp; intellectual property.</p></div></div>

            <div class="sub-card field-stack">
              <h4 class="legal-section-title">🔒 Privacy Policy</h4>
              <p class="legal-note">LDD MyDesigns Enhancer does not collect, transmit, or store any personal data on external servers. All data — including clipboard items, theme preferences, and tool settings — is stored exclusively in your browser's local extension storage (<code>chrome.storage.local</code>) and never leaves your device. We do not use analytics, tracking pixels, or any third-party data services. No account, login, or personal information is required to use this extension.</p>
            </div>

            <div class="sub-card field-stack">
              <h4 class="legal-section-title">🚫 Data Collection</h4>
              <p class="legal-note">This extension collects <strong>no user data whatsoever</strong>. We do not collect browsing history, keystrokes, form inputs, identifiers, or any usage metrics. There are no cookies, no telemetry, and no network calls made by this extension to any external service. Your data stays on your device — always.</p>
            </div>

            <div class="sub-card field-stack">
              <h4 class="legal-section-title">⚠️ Liability Disclaimer</h4>
              <p class="legal-note">LDD MyDesigns Enhancer is provided "as is" without warranty of any kind, express or implied. LavenderDragonDesign (LDD) shall not be held liable for any direct, indirect, incidental, or consequential damages arising from the use or inability to use this extension, including but not limited to loss of data, loss of profits, or business interruption. Use of this extension is entirely at your own risk. LDD does not guarantee that the extension will be error-free or uninterrupted, and reserves the right to modify or discontinue the extension at any time without notice.</p>
            </div>

            <div class="sub-card field-stack">
              <h4 class="legal-section-title">™ Trademarks &amp; Copyrights</h4>
              <p class="legal-note"><strong>MyDesigns®</strong> is a registered trademark of its respective owner. This extension is an independent tool and is not affiliated with, endorsed by, or sponsored by MyDesigns or its parent company. All MyDesigns trademarks, logos, service marks, and trade names are the sole property of their respective owners.</p>
              <p class="legal-note">The LDD Enhancer extension, including its source code, design, and original content, is Copyright © LavenderDragonDesign. All rights reserved. Unauthorized reproduction, redistribution, or modification of this extension or its components is prohibited without express written permission from LavenderDragonDesign.</p>
              <p class="legal-note">All other third-party trademarks, product names, and company names or logos referenced within this extension are the property of their respective owners and are used for identification purposes only.</p>
            </div>
          </section>

          <section class="enhancer-section" data-panel="settings">
            <div class="section-heading"><div class="section-icon">⚙️</div><div><h3>Settings</h3><p class="muted compact">Manage tools, toggles &amp; links.</p></div></div>
            <div class="sub-card field-stack">
              <div class="settings-toggle-row">
                <span class="settings-toggle-label">QA Bar Tooltips</span>
                <label class="settings-switch"><input id="ldd-settings-tooltips" type="checkbox" /><span class="settings-slider"></span></label>
              </div>
              <div class="settings-toggle-row">
                <span class="settings-toggle-label">Quick Actions Bar</span>
                <label class="settings-switch"><input id="ldd-settings-qa" type="checkbox" /><span class="settings-slider"></span></label>
              </div>
              <div class="settings-toggle-row">
                <span class="settings-toggle-label">Drag and Drop Upload</span>
                <label class="settings-switch"><input id="ldd-settings-dropper" type="checkbox" /><span class="settings-slider"></span></label>
              </div>
              <div class="settings-toggle-row" id="ldd-settings-dnd-mode-row" style="display:none !important;visibility:hidden !important;height:0 !important;overflow:hidden !important;">
                <span class="settings-toggle-label">DnD: Upload to Single Listing</span>
                <label class="settings-switch"><input id="ldd-settings-dnd-mode" type="checkbox" /><span class="settings-slider"></span></label>
              </div>
            </div>
            <div class="sub-card field-stack">
              <label style="font-size:12px;font-weight:700;color:var(--text);margin-bottom:4px">QA Bar Button Visibility</label>
              <div class="qa-settings-grid">
                <div class="settings-toggle-row"><span class="settings-toggle-label" style="font-size:12px">Image Mockups</span><label class="settings-switch"><input id="ldd-qa-show-imageMockups" type="checkbox" /><span class="settings-slider"></span></label></div>
                <div class="settings-toggle-row"><span class="settings-toggle-label" style="font-size:12px">Video Mockups</span><label class="settings-switch"><input id="ldd-qa-show-videoMockups" type="checkbox" /><span class="settings-slider"></span></label></div>
                <div class="settings-toggle-row"><span class="settings-toggle-label" style="font-size:12px">Vision AI</span><label class="settings-switch"><input id="ldd-qa-show-visionAI" type="checkbox" /><span class="settings-slider"></span></label></div>
                <div class="settings-toggle-row"><span class="settings-toggle-label" style="font-size:12px">Vision AI Quick Types</span><label class="settings-switch"><input id="ldd-qa-show-visionAIPresets" type="checkbox" /><span class="settings-slider"></span></label></div>
                <div class="settings-toggle-row"><span class="settings-toggle-label" style="font-size:12px">Remove BG</span><label class="settings-switch"><input id="ldd-qa-show-removeBG" type="checkbox" /><span class="settings-slider"></span></label></div>
                <div class="settings-toggle-row"><span class="settings-toggle-label" style="font-size:12px">Upscale</span><label class="settings-switch"><input id="ldd-qa-show-upscale" type="checkbox" /><span class="settings-slider"></span></label></div>
                <div class="settings-toggle-row"><span class="settings-toggle-label" style="font-size:12px">Vectorize</span><label class="settings-switch"><input id="ldd-qa-show-vectorize" type="checkbox" /><span class="settings-slider"></span></label></div>
                <div class="settings-toggle-row"><span class="settings-toggle-label" style="font-size:12px">Canvas</span><label class="settings-switch"><input id="ldd-qa-show-canvas" type="checkbox" /><span class="settings-slider"></span></label></div>
                <div class="settings-toggle-row"><span class="settings-toggle-label" style="font-size:12px">Dream AI</span><label class="settings-switch"><input id="ldd-qa-show-dreamAI" type="checkbox" /><span class="settings-slider"></span></label></div>
                <div class="settings-toggle-row"><span class="settings-toggle-label" style="font-size:12px">Color Overlay</span><label class="settings-switch"><input id="ldd-qa-show-colorOverlay" type="checkbox" /><span class="settings-slider"></span></label></div>
                <div class="settings-toggle-row"><span class="settings-toggle-label" style="font-size:12px">Edit in Bulk</span><label class="settings-switch"><input id="ldd-qa-show-editInBulk" type="checkbox" /><span class="settings-slider"></span></label></div>
                <div class="settings-toggle-row"><span class="settings-toggle-label" style="font-size:12px">Compressor</span><label class="settings-switch"><input id="ldd-qa-show-compressor" type="checkbox" /><span class="settings-slider"></span></label></div>
                <div class="settings-toggle-row"><span class="settings-toggle-label" style="font-size:12px">Resizer</span><label class="settings-switch"><input id="ldd-qa-show-resizer" type="checkbox" /><span class="settings-slider"></span></label></div>
                <div class="settings-toggle-row"><span class="settings-toggle-label" style="font-size:12px">Download Files</span><label class="settings-switch"><input id="ldd-qa-show-download" type="checkbox" /><span class="settings-slider"></span></label></div>
                <div class="settings-toggle-row"><span class="settings-toggle-label" style="font-size:12px">Delete Listing</span><label class="settings-switch"><input id="ldd-qa-show-deleteListing" type="checkbox" /><span class="settings-slider"></span></label></div>
              </div>
            </div>
            <div class="sub-card field-stack">
              <label style="font-size:12px;font-weight:700;color:var(--text);margin-bottom:4px">Card Quick Actions</label>
              <div class="settings-toggle-row"><span class="settings-toggle-label" style="font-size:12px">Download / Rename buttons</span><label class="settings-switch"><input id="ldd-settings-card-actions" type="checkbox" /><span class="settings-slider"></span></label></div>
            </div>
            <div class="button-row">
              <button id="ldd-settings-full-enable" class="primary-btn" type="button" style="flex:1">Full Enable</button>
              <button id="ldd-settings-full-disable" class="secondary-btn" type="button" style="flex:1">Full Disable</button>
            </div>
            <div class="sub-card field-stack">
              <button id="ldd-link-etsy" class="link-btn" type="button">↗ Etsy Shop</button>
              <button id="ldd-link-bmac" class="link-btn" type="button">↗ Buy Me a Coffee</button>
            </div>
          </section>

          <div id="${NOTICE_ID}"></div>
        </div>
      </aside>
    `;
    document.documentElement.appendChild(root);
    return root;
  }

  function switchTab(tab) {
    document.querySelectorAll(`#${ROOT_ID} .enhancer-icon`).forEach((node) => {
      node.classList.toggle("active", node.dataset.tab === tab);
    });
    document.querySelectorAll(`#${ROOT_ID} .enhancer-section`).forEach((node) => {
      node.classList.toggle("active", node.dataset.panel === tab);
    });
    document.querySelectorAll(`#${ROOT_ID} .enhancer-sidebar-btn`).forEach((node) => {
      node.classList.toggle("active", node.dataset.tab === tab);
    });
  }

  function positionPanelOnRight(panel) {
    if (!panel) return;
    const width = panel.offsetWidth || Number.parseFloat(panel.style.width) || 374;
    const rightLeft = Math.max(14, window.innerWidth - width - 96);
    panel.style.left = `${rightLeft}px`;
    if (!panel.style.top) panel.style.top = "66px";
  }

  function togglePanel(show) {
    if (show && !isListingsPage()) {
      disable();
      return;
    }
    const panel = document.getElementById(PANEL_ID);
    const dock = document.getElementById(DOCK_ID);
    if (!panel) return;
    state.panelOpen = Boolean(show);
    if (show) {
      // Convert to left-based so drag works freely after open
      if (!panel.style.left) {
        const rect = panel.getBoundingClientRect();
        const approxLeft = window.innerWidth - 60 - (panel.offsetWidth || 374);
        panel.style.left = `${Math.max(14, approxLeft)}px`;
        panel.style.right = "auto";
      }
      panel.classList.add("open");
      dock?.classList.add("open");
    } else {
      panel.classList.remove("open");
      dock?.classList.remove("open");
    }
    window.dispatchEvent(new CustomEvent("ldd-enhancer-state", { detail: { open: state.panelOpen } }));
  }

  function keepPanelInViewport(panel) {
    if (!panel) return;

    const minWidth = 320;
    const minHeight = 320;
    const maxWidth = Math.max(minWidth, window.innerWidth - 28);
    const maxHeight = Math.max(minHeight, window.innerHeight - 28);

    let width = panel.offsetWidth;
    let height = panel.offsetHeight;
    if (width > maxWidth) {
      width = maxWidth;
      panel.style.width = `${width}px`;
    }
    if (height > maxHeight) {
      height = maxHeight;
      panel.style.height = `${height}px`;
    }

    const rect = panel.getBoundingClientRect();
    const maxLeft = Math.max(14, window.innerWidth - rect.width - 14);
    const maxTop = Math.max(14, window.innerHeight - rect.height - 14);

    panel.style.left = `${clamp(rect.left, 14, maxLeft)}px`;
    panel.style.top = `${clamp(rect.top, 14, maxTop)}px`;
  }

  function setupPanelInteractions(root) {
    const panel = root.querySelector(`#${PANEL_ID}`);
    const header = root.querySelector(".enhancer-header-row");
    if (!panel || !header) return null;

    // Clip inner content but allow handles outside
    panel.style.overflow = "hidden";
    panel.style.borderRadius = "20px";

    // Add 4-corner resize handles
    ["nw","ne","sw","se"].forEach(dir => {
      const h = document.createElement("div");
      h.className = `ldd-resize-handle ${dir}`;
      panel.appendChild(h);

      let startX, startY, startW, startH, startLeft, startTop;
      h.addEventListener("mousedown", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const rect = panel.getBoundingClientRect();
        startX = e.clientX; startY = e.clientY;
        startW = rect.width; startH = rect.height;
        startLeft = rect.left; startTop = rect.top;

        const onMove = (e) => {
          const dx = e.clientX - startX;
          const dy = e.clientY - startY;
          if (dir.includes("e")) panel.style.width = `${Math.max(300, startW + dx)}px`;
          if (dir.includes("s")) panel.style.height = `${Math.max(260, startH + dy)}px`;
          if (dir.includes("w")) {
            const newW = Math.max(300, startW - dx);
            panel.style.width = `${newW}px`;
            panel.style.left = `${startLeft + (startW - newW)}px`;
            panel.style.right = "auto";
          }
          if (dir.includes("n")) {
            const newH = Math.max(260, startH - dy);
            panel.style.height = `${newH}px`;
            panel.style.top = `${startTop + (startH - newH)}px`;
          }
        };
        const onUp = () => {
          document.removeEventListener("mousemove", onMove);
          document.removeEventListener("mouseup", onUp);
        };
        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup", onUp);
      });
    });

    keepPanelInViewport(panel);

    root.querySelector('[data-action="close"]')?.addEventListener("click", () => {
      togglePanel(false);
      const actionText = root.querySelector("#ldd-bubble-action-text");
      const arrow = root.querySelector("#ldd-bubble-arrow");
      if (actionText) actionText.textContent = "Click to Open";
      if (arrow) arrow.style.transform = "rotate(0deg)";
    });

    let dragState = null;
    const onMouseMove = (event) => {
      if (!dragState) return;
      const maxLeft = Math.max(14, window.innerWidth - panel.offsetWidth - 14);
      const maxTop = Math.max(14, window.innerHeight - panel.offsetHeight - 14);
      panel.style.left = `${clamp(event.clientX - dragState.offsetX, 14, maxLeft)}px`;
      panel.style.top = `${clamp(event.clientY - dragState.offsetY, 14, maxTop)}px`;
    };

    const stopDragging = () => {
      dragState = null;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", stopDragging);
      keepPanelInViewport(panel);
    };

    const startDragging = (event) => {
      if (event.button !== 0) return;
      if (event.target.closest("button, input, textarea, select, a")) return;

      const rect = panel.getBoundingClientRect();
      panel.style.transition = "none";
      panel.style.transform = "none";
      panel.style.left = `${rect.left}px`;
      panel.style.top = `${rect.top}px`;
      panel.style.right = "auto";
      dragState = {
        offsetX: event.clientX - rect.left,
        offsetY: event.clientY - rect.top
      };
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", stopDragging);
      event.preventDefault();
    };

    const onWindowResize = () => {
      keepPanelInViewport(panel);
    };

    header.addEventListener("mousedown", startDragging);
    window.addEventListener("resize", onWindowResize);
    panel.addEventListener("mouseup", () => keepPanelInViewport(panel));

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(() => keepPanelInViewport(panel));
      observer.observe(panel);
      return () => {
        observer.disconnect();
        header.removeEventListener("mousedown", startDragging);
        window.removeEventListener("resize", onWindowResize);
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", stopDragging);
      };
    }

    return () => {
      header.removeEventListener("mousedown", startDragging);
      window.removeEventListener("resize", onWindowResize);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", stopDragging);
    };
  }

  function renderKeywords() {
    const target = document.getElementById("ldd-keyword-results");
    if (!target) return;
    target.innerHTML = "";
    if (!state.keywords.length) {
      target.innerHTML = '<div class="empty-state">Generate keywords above.</div>';
      return;
    }
    state.keywords.forEach((keyword) => {
      const button = document.createElement("button");
      button.className = "keyword-chip";
      button.type = "button";
      button.textContent = keyword;
      button.addEventListener("click", async () => {
        await copyText(keyword);
        notify(`Copied: ${keyword}`);
      });
      target.appendChild(button);
    });
  }

  function readProfitFields() {
    const num = (id) => Number.parseFloat(document.getElementById(id)?.value || "0");
    return {
      salePrice: num("ldd-sale-price"),
      shippingPriceCustomer: num("ldd-ship-charge"),
      itemQuantity: Math.max(1, num("ldd-qty")),
      discountValue: num("ldd-discount"),
      discountType: document.getElementById("ldd-discount-type")?.value || "flat",
      costPerItem: num("ldd-cost"),
      actualShippingCost: num("ldd-actual-ship"),
      listingFee: num("ldd-listing-fee"),
      transactionFeePercent: num("ldd-trans-fee"),
      advertisingCost: num("ldd-ad-cost"),
      advertisingType: document.getElementById("ldd-ad-type")?.value || "percent",
      miscCost: num("ldd-misc-cost"),
      miscType: document.getElementById("ldd-misc-type")?.value || "flat",
      goalValue: num("ldd-goal")
    };
  }

  function renderProfit() {
    const target = document.getElementById("ldd-profit-results");
    if (!target) return;
    const result = calcProfit(readProfitFields());
    const rows = [
      ["Suggested Price", fmtMoney(result.suggested)],
      ["Proceeds", fmtMoney(result.proceeds)],
      ["Total Costs", fmtMoney(result.totalCosts)],
      ["Net Profit", fmtMoney(result.netProfit)],
      ["Return", `${result.roi.toFixed(2)}%`],
      ["Margin", `${result.margin.toFixed(2)}%`]
    ];
    target.innerHTML = "";
    rows.forEach(([label, value]) => {
      const row = document.createElement("div");
      row.className = "result-line";
      row.innerHTML = `<span>${label}</span><strong>${value}</strong>`;
      target.appendChild(row);
    });
  }

  function renderClipboard() {
    const target = document.getElementById("ldd-clip-list");
    if (!target) return;
    const items = filteredClipboard();
    target.innerHTML = "";

    if (!items.length) {
      target.innerHTML = '<div class="clipboard-empty"><p>No saved prompts yet.</p></div>';
      return;
    }

    items.forEach((item) => {
      const card = document.createElement("div");

      // ── EDIT MODE ──────────────────────────────────────────────────────────
      if (item.id === state.clipboardEditingId) {
        card.className = `clipboard-card editing ${item.pinned ? "pinned" : ""}`.trim();
        card.innerHTML = `
          <div class="clip-edit-body">
            <input class="field clip-edit-name" maxlength="80" placeholder="Prompt name…" value="${item.name.replace(/"/g, "&quot;")}" />
            <textarea class="field area clip-edit-content" placeholder="Prompt content…">${item.content}</textarea>
          </div>
          <div class="clipboard-card-actions">
            <button class="clip-action-btn clip-save-btn" data-action="save-edit" data-id="${item.id}" type="button">💾 Save</button>
            <button class="clip-action-btn" data-action="cancel-edit" data-id="${item.id}" type="button">Cancel</button>
          </div>
        `;
        target.appendChild(card);

        card.querySelector("[data-action='save-edit']")?.addEventListener("click", async () => {
          const nameEl = card.querySelector(".clip-edit-name");
          const contentEl = card.querySelector(".clip-edit-content");
          const newName = (nameEl?.value || "").trim() || "Untitled";
          const newContent = (contentEl?.value || "").trim();
          const idx = state.clipboardItems.findIndex((x) => x.id === item.id);
          if (idx !== -1) {
            state.clipboardItems[idx].name = newName;
            state.clipboardItems[idx].content = newContent;
            await writeClipboardItems(state.clipboardItems);
          }
          state.clipboardEditingId = null;
          renderClipboard();
          notify("Prompt saved.");
        });

        card.querySelector("[data-action='cancel-edit']")?.addEventListener("click", () => {
          // If the item was brand new and has no content, remove it on cancel
          if (!item.content && item.name === "New Prompt") {
            state.clipboardItems = state.clipboardItems.filter((x) => x.id !== item.id);
            writeClipboardItems(state.clipboardItems);
          }
          state.clipboardEditingId = null;
          renderClipboard();
        });

        // Auto-focus name field
        setTimeout(() => card.querySelector(".clip-edit-name")?.focus(), 30);
        return;
      }

      // ── READ MODE ──────────────────────────────────────────────────────────
      const preview = item.content.length > 90 ? `${item.content.slice(0, 90)}...` : item.content;
      card.className = `clipboard-card ${item.pinned ? "pinned" : ""}`.trim();
      card.innerHTML = `
        <div class="clipboard-card-top"><div class="clipboard-card-meta">${item.pinned ? '<span class="pin-dot">📌</span>' : ""}<span class="clipboard-card-name">${item.name}</span></div><p class="clipboard-card-preview">${preview || '<em style="color:var(--muted)">No content</em>'}</p></div>
        <div class="clipboard-card-actions">
          <button class="clip-action-btn copy-btn" data-action="copy" data-id="${item.id}" type="button">Copy</button>
          <button class="clip-action-btn" data-action="paste" data-id="${item.id}" type="button">Paste →</button>
          <button class="clip-action-btn" data-action="edit" data-id="${item.id}" type="button">✏️ Edit</button>
          <button class="clip-action-btn pin-btn ${item.pinned ? "active" : ""}" data-action="pin" data-id="${item.id}" type="button">${item.pinned ? "Unpin" : "Pin"}</button>
          <button class="clip-action-btn delete-btn" data-action="delete" data-id="${item.id}" type="button">Delete</button>
        </div>
      `;
      target.appendChild(card);

      card.querySelector("[data-action='copy']")?.addEventListener("click", async (e) => {
        const btn = e.currentTarget;
        const found = state.clipboardItems.find((x) => x.id === btn.dataset.id);
        if (!found) return;
        await copyText(found.content);
        btn.textContent = "Copied!";
        btn.classList.add("copied");
        setTimeout(() => { btn.textContent = "Copy"; btn.classList.remove("copied"); }, 400);
      });

      card.querySelector("[data-action='paste']")?.addEventListener("click", (e) => {
        const found = state.clipboardItems.find((x) => x.id === e.currentTarget.dataset.id);
        if (!found) return;
        const ok = pasteToMyDesigns(found.content);
        notify(ok ? "Pasted into page field." : "No field found to paste.", !ok);
      });

      card.querySelector("[data-action='edit']")?.addEventListener("click", (e) => {
        state.clipboardEditingId = e.currentTarget.dataset.id;
        renderClipboard();
      });

      card.querySelector("[data-action='pin']")?.addEventListener("click", async (e) => {
        const found = state.clipboardItems.find((x) => x.id === e.currentTarget.dataset.id);
        if (!found) return;
        found.pinned = !found.pinned;
        await writeClipboardItems(state.clipboardItems);
        renderClipboard();
      });

      card.querySelector("[data-action='delete']")?.addEventListener("click", async (e) => {
        state.clipboardItems = state.clipboardItems.filter((x) => x.id !== e.currentTarget.dataset.id);
        await writeClipboardItems(state.clipboardItems);
        renderClipboard();
      });
    });
  }

  function renderThemePresets(root) {
    const container = root.querySelector("#ldd-theme-presets");
    if (!container) return;
    container.innerHTML = "";

    allThemePresets().forEach((preset) => {
      const button = document.createElement("button");
      button.className = "theme-preset";
      button.type = "button";
      button.dataset.preset = preset.id;
      const label = document.createElement("span");
      label.className = "theme-preset-label";
      label.textContent = preset.label;

      const actions = document.createElement("span");
      actions.className = "theme-preset-actions";

      const swatch = document.createElement("span");
      swatch.className = "theme-swatch";
      swatch.style.background = `linear-gradient(90deg, ${preset.solid}, ${preset.gradient})`;
      actions.appendChild(swatch);

      if (preset.custom) {
        const deleteBtn = document.createElement("button");
        deleteBtn.className = "theme-preset-delete";
        deleteBtn.type = "button";
        deleteBtn.title = `Delete ${preset.label}`;
        deleteBtn.textContent = "x";
        deleteBtn.addEventListener("click", async (event) => {
          event.preventDefault();
          event.stopPropagation();
          const nextPresets = state.themeCustomPresets.filter((candidate) => candidate.id !== preset.id);
          await writeCustomThemePresets(nextPresets);
          if (state.theme.globalThemePreset === preset.id) {
            await writeThemeSettings({
              ...state.theme,
              globalThemePreset: "custom"
            });
          }
          renderThemePresets(root);
          syncThemeControls(root);
          notify(`Removed preset: ${preset.label}`);
        });
        actions.appendChild(deleteBtn);
      }

      button.appendChild(label);
      button.appendChild(actions);
      button.addEventListener("click", async () => {
        if (preset.off) {
          await writeThemeSettings({
            ...state.theme,
            globalThemeEnabled: false,
            globalThemePreset: preset.id
          });
        } else {
          await writeThemeSettings({
            ...state.theme,
            globalThemeEnabled: true,
            globalThemeMode: preset.mode,
            globalThemeSolidColor: preset.solid,
            globalThemeGradientColor: preset.gradient,
            globalThemeBrightness: normalizeThemeBrightness(
              preset.brightness,
              THEME_DEFAULTS.globalThemeBrightness
            ),
            globalThemePreset: preset.id
          });
        }
        syncThemeControls(root);
        notify(`Theme: ${preset.label}`);
      });
      container.appendChild(button);
    });
  }

  function syncThemeControls(root) {
    const enabled = root.querySelector("#ldd-theme-enabled");
    const solidBtn = root.querySelector("#ldd-theme-mode-solid");
    const gradientBtn = root.querySelector("#ldd-theme-mode-gradient");
    const solidInput = root.querySelector("#ldd-theme-solid");
    const gradientInput = root.querySelector("#ldd-theme-gradient");
    const solidPick = root.querySelector("#ldd-theme-pick-solid");
    const gradientPick = root.querySelector("#ldd-theme-pick-gradient");
    const brightnessInput = root.querySelector("#ldd-theme-brightness");
    const brightnessValue = root.querySelector("#ldd-theme-brightness-value");
    const preview = root.querySelector("#ldd-theme-preview");

    if (
      !enabled ||
      !solidBtn ||
      !gradientBtn ||
      !solidInput ||
      !gradientInput ||
      !brightnessInput ||
      !brightnessValue ||
      !preview
    ) {
      return;
    }

    enabled.checked = Boolean(state.theme.globalThemeEnabled);
    solidInput.value = normalizeHexColor(state.theme.globalThemeSolidColor, THEME_DEFAULTS.globalThemeSolidColor);
    gradientInput.value = normalizeHexColor(
      state.theme.globalThemeGradientColor,
      THEME_DEFAULTS.globalThemeGradientColor
    );
    brightnessInput.value = String(normalizeThemeBrightness(state.theme.globalThemeBrightness));
    brightnessValue.textContent = `${brightnessInput.value}%`;
    const isSolid = state.theme.globalThemeMode === "solid";
    solidBtn.classList.toggle("active", isSolid);
    gradientBtn.classList.toggle("active", !isSolid);
    gradientInput.disabled = isSolid;
    gradientInput.style.opacity = isSolid ? "0.45" : "1";
    if (gradientPick) {
      gradientPick.disabled = isSolid;
      gradientPick.style.opacity = isSolid ? "0.5" : "1";
      gradientPick.style.pointerEvents = isSolid ? "none" : "auto";
    }
    if (solidPick) {
      solidPick.disabled = false;
    }

    preview.style.background = isSolid
      ? solidInput.value
      : `linear-gradient(135deg, ${solidInput.value}, ${gradientInput.value})`;
    preview.style.filter = `brightness(${Number(brightnessInput.value || "100") / 100})`;

    root.querySelectorAll(".theme-preset").forEach((button) => {
      button.classList.toggle("active", button.dataset.preset === state.theme.globalThemePreset);
    });
  }

  async function bindEvents(root) {
    teardownPanelInteractions?.();
    teardownPanelInteractions = setupPanelInteractions(root);
    root.querySelector(`#${DOCK_ID}`)?.addEventListener("click", () => togglePanel(true));

    // Bubble toggles panel open/close
    root.querySelector("#ldd-sidebar-bubble")?.addEventListener("click", (e) => {
      e.stopPropagation();
      const opening = !state.panelOpen;
      togglePanel(opening);
      const actionText = root.querySelector("#ldd-bubble-action-text");
      const arrow = root.querySelector("#ldd-bubble-arrow");
      if (actionText) actionText.textContent = opening ? "Click to Close" : "Click to Open";
      if (arrow) arrow.style.transform = opening ? "rotate(180deg)" : "rotate(0deg)";
    });

    // Sidebar icon buttons — open panel + switch tab
    root.querySelectorAll(".enhancer-sidebar-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const tab = btn.dataset.tab;
        if (!state.panelOpen) togglePanel(true);
        if (tab) {
          switchTab(tab);
          root.querySelectorAll(".enhancer-sidebar-btn").forEach(b => b.classList.toggle("active", b === btn));
        }
      });
    });
    state.theme = await readThemeSettings();
    state.themeCustomPresets = await readCustomThemePresets();
    renderThemePresets(root);
    syncThemeControls(root);

    root.querySelector("#ldd-theme-enabled")?.addEventListener("change", async (event) => {
      await writeThemeSettings({
        ...state.theme,
        globalThemeEnabled: Boolean(event.target.checked),
        globalThemePreset: state.theme.globalThemePreset || "custom"
      });
      syncThemeControls(root);
      notify(event.target.checked ? "Global theme enabled." : "Global theme disabled.");
    });

    root.querySelector("#ldd-theme-mode-solid")?.addEventListener("click", async () => {
      await writeThemeSettings({
        ...state.theme,
        globalThemeMode: "solid",
        globalThemePreset: "custom"
      });
      syncThemeControls(root);
      notify("Theme mode: solid.");
    });

    root.querySelector("#ldd-theme-mode-gradient")?.addEventListener("click", async () => {
      await writeThemeSettings({
        ...state.theme,
        globalThemeMode: "gradient",
        globalThemePreset: "custom"
      });
      syncThemeControls(root);
      notify("Theme mode: gradient.");
    });

    root.querySelector("#ldd-theme-solid")?.addEventListener("input", async (event) => {
      await writeThemeSettings({
        ...state.theme,
        globalThemeSolidColor: normalizeHexColor(event.target.value, THEME_DEFAULTS.globalThemeSolidColor),
        globalThemePreset: "custom"
      });
      syncThemeControls(root);
    });

    root.querySelector("#ldd-theme-gradient")?.addEventListener("input", async (event) => {
      await writeThemeSettings({
        ...state.theme,
        globalThemeGradientColor: normalizeHexColor(event.target.value, THEME_DEFAULTS.globalThemeGradientColor),
        globalThemePreset: "custom"
      });
      syncThemeControls(root);
    });

    root.querySelector("#ldd-theme-brightness")?.addEventListener("input", async (event) => {
      await writeThemeSettings({
        ...state.theme,
        globalThemeBrightness: normalizeThemeBrightness(event.target.value),
        globalThemePreset: "custom"
      });
      syncThemeControls(root);
    });

    root.querySelector("#ldd-theme-pick-solid")?.addEventListener("click", async () => {
      const picked = await pickScreenColor(state.theme.globalThemeSolidColor);
      if (!picked) return;
      await writeThemeSettings({
        ...state.theme,
        globalThemeSolidColor: picked,
        globalThemePreset: "custom"
      });
      syncThemeControls(root);
      notify(`Solid color: ${picked}`);
    });

    root.querySelector("#ldd-theme-pick-gradient")?.addEventListener("click", async () => {
      const picked = await pickScreenColor(state.theme.globalThemeGradientColor);
      if (!picked) return;
      await writeThemeSettings({
        ...state.theme,
        globalThemeGradientColor: picked,
        globalThemePreset: "custom"
      });
      syncThemeControls(root);
      notify(`Gradient color: ${picked}`);
    });

    root.querySelector("#ldd-theme-save-preset")?.addEventListener("click", async () => {
      const nameInput = root.querySelector("#ldd-theme-preset-name");
      const label = sanitizeThemePresetName(nameInput?.value);
      const existing = state.themeCustomPresets.find((preset) => norm(preset.label) === norm(label));
      const presetId = existing?.id || makeCustomPresetId();
      const nextPreset = {
        id: presetId,
        label,
        solid: normalizeHexColor(state.theme.globalThemeSolidColor, THEME_DEFAULTS.globalThemeSolidColor),
        gradient: normalizeHexColor(state.theme.globalThemeGradientColor, THEME_DEFAULTS.globalThemeGradientColor),
        mode: state.theme.globalThemeMode === "solid" ? "solid" : "gradient",
        brightness: normalizeThemeBrightness(state.theme.globalThemeBrightness),
        custom: true
      };

      const nextPresets = existing
        ? state.themeCustomPresets.map((preset) => (preset.id === existing.id ? nextPreset : preset))
        : [nextPreset, ...state.themeCustomPresets].slice(0, MAX_THEME_CUSTOM_PRESETS);

      await writeCustomThemePresets(nextPresets);
      await writeThemeSettings({
        ...state.theme,
        globalThemePreset: nextPreset.id
      });
      if (nameInput) nameInput.value = "";
      renderThemePresets(root);
      syncThemeControls(root);
      notify(existing ? `Updated preset: ${label}` : `Saved preset: ${label}`);
    });
    root.querySelector("#ldd-theme-preset-name")?.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      root.querySelector("#ldd-theme-save-preset")?.click();
    });

    root.querySelectorAll(".enhancer-icon").forEach((node) => node.addEventListener("click", () => {
      if (node.dataset.tab === "resizer") {
        window.LDDResizer?.toggle();
        return;
      }
      if (node.dataset.tab === "compressor") {
        window.LDDCompressor?.toggle();
        return;
      }
      if (node.dataset.tab === "pdfgen") {
        chrome.runtime.sendMessage({ type: "ldd/openPdfGen" });
        return;
      }
      switchTab(node.dataset.tab);
      // Sync sidebar active state
      root.querySelectorAll(".enhancer-sidebar-btn").forEach(b => b.classList.toggle("active", b.dataset.tab === node.dataset.tab));
    }));

    // ── Icon hover tooltip ────────────────────────────────────────────────
    const iconTip = document.getElementById("ldd-icon-tip");
    if (iconTip) {
      root.querySelectorAll(".enhancer-icon").forEach((btn) => {
        btn.addEventListener("mouseenter", () => {
          const label = btn.dataset.label || btn.title || "";
          const desc = btn.dataset.desc || "";
          if (!label && !desc) return;
          iconTip.querySelector(".tip-icon").textContent = btn.textContent.trim();
          iconTip.querySelector(".tip-name").textContent = label;
          iconTip.querySelector(".tip-desc").textContent = desc;
          const rect = btn.getBoundingClientRect();
          iconTip.style.left = `${rect.right + 10}px`;
          iconTip.style.top = `${Math.round(rect.top + rect.height / 2 - 20)}px`;
          iconTip.classList.add("visible");
        });
        btn.addEventListener("mouseleave", () => iconTip.classList.remove("visible"));
      });
    }

    // ── Product Type dropdown ─────────────────────────────────────────────
    (() => {
      const select = root.querySelector("#ldd-product-type");
      if (!select) return;
      select.innerHTML = "";
      DEFAULT_PRODUCT_TYPES.forEach(t => {
        const opt = document.createElement("option");
        opt.value = t; opt.textContent = t;
        select.appendChild(opt);
      });
    })();

    root.querySelector("#ldd-gen-inst")?.addEventListener("click", () => {
      const keyword = root.querySelector("#ldd-main-keyword")?.value.trim();
      if (!keyword) {
        notify("Add a main keyword first.", true);
        return;
      }
      root.querySelector("#ldd-inst-out").value = buildInstructions(
        keyword,
        root.querySelector("#ldd-product-type")?.value || "PNG",
        root.querySelector("#ldd-custom-type")?.value || ""
      );
      notify("Instructions generated.");
    });

    root.querySelector("#ldd-copy-inst")?.addEventListener("click", async () => {
      await copyText(root.querySelector("#ldd-inst-out")?.value || "");
      notify("Instructions copied.");
    });

    root.querySelector("#ldd-paste-inst")?.addEventListener("click", () => {
      const ok = pasteToMyDesigns(root.querySelector("#ldd-inst-out")?.value || "");
      notify(ok ? "Pasted into page field." : "No field found to paste.", !ok);
    });

    root.querySelector("#ldd-save-inst")?.addEventListener("click", async () => {
      const content = (root.querySelector("#ldd-inst-out")?.value || "").trim();
      if (!content) {
        notify("Generate instructions first.", true);
        return;
      }
      const mainKeyword = root.querySelector("#ldd-main-keyword")?.value.trim() || "Untitled";
      const type = root.querySelector("#ldd-custom-type")?.value.trim() || root.querySelector("#ldd-product-type")?.value || "PNG";
      state.clipboardItems.unshift({ id: uid(), name: `${mainKeyword} ${type}`.trim(), content, pinned: false, createdAt: Date.now() });
      await writeClipboardItems(state.clipboardItems);
      renderClipboard();
      notify("Saved to Prompt Manager.");

      // Show modal
      const existing = document.getElementById("ldd-save-modal");
      if (existing) existing.remove();
      const modal = document.createElement("div");
      modal.id = "ldd-save-modal";
      modal.style.cssText = "position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;pointer-events:auto;font-family:'Inter','Segoe UI',system-ui,sans-serif;";
      modal.innerHTML = `
        <div id="ldd-save-modal-backdrop" style="position:absolute;inset:0;background:rgba(26,38,67,.35);backdrop-filter:blur(2px);"></div>
        <div style="position:relative;background:#ffffff;border:1px solid #cad4ea;border-radius:16px;padding:24px 22px 20px;box-shadow:0 20px 50px rgba(26,38,67,.22);max-width:300px;width:90%;display:flex;flex-direction:column;gap:14px;z-index:1;">
          <p style="font-size:15px;font-weight:800;color:#1e2a40;margin:0;">✅ Saved to Prompt Manager</p>
          <p style="font-size:12px;color:#6f7c97;line-height:1.5;margin:0;">Your prompt has been saved. Would you like to open the Prompt Manager now or continue editing?</p>
          <div style="display:flex;gap:8px;">
            <button id="ldd-modal-open-pm" style="flex:1;padding:9px 0;border-radius:10px;font-size:12px;font-weight:700;cursor:pointer;border:none;background:#6d5efc;color:#ffffff;">Open Prompt Manager</button>
            <button id="ldd-modal-stay" style="flex:1;padding:9px 0;border-radius:10px;font-size:12px;font-weight:700;cursor:pointer;border:1px solid #cad4ea;background:#ffffff;color:#1e2a40;">Continue</button>
          </div>
        </div>`;
      document.body.appendChild(modal);

      const closeModal = () => modal.remove();
      modal.querySelector("#ldd-save-modal-backdrop").addEventListener("click", closeModal);
      modal.querySelector("#ldd-modal-stay").addEventListener("click", closeModal);
      modal.querySelector("#ldd-modal-open-pm").addEventListener("click", () => {
        closeModal();
        switchTab("clipboard");
      });
    });



    root.querySelector("#ldd-gen-keywords")?.addEventListener("click", () => {
      state.keywords = generateKeywordList(root.querySelector("#ldd-keyword-subject")?.value || "");
      renderKeywords();
      notify(state.keywords.length ? "Keywords generated." : "Add a subject first.", !state.keywords.length);
    });

    root.querySelector("#ldd-calc")?.addEventListener("click", () => {
      renderProfit();
      notify("Profit calculated.");
    });

    root.querySelector("#ldd-clip-search")?.addEventListener("input", (event) => {
      state.clipboardSearch = event.target.value;
      renderClipboard();
    });

    root.querySelector("#ldd-clip-clear")?.addEventListener("click", () => {
      state.clipboardSearch = "";
      const input = root.querySelector("#ldd-clip-search");
      if (input) input.value = "";
      renderClipboard();
    });

    root.querySelector("#ldd-clip-new")?.addEventListener("click", async () => {
      const newItem = { id: uid(), name: "New Prompt", content: "", pinned: false, createdAt: Date.now() };
      state.clipboardItems.unshift(newItem);
      await writeClipboardItems(state.clipboardItems);
      state.clipboardEditingId = newItem.id;
      renderClipboard();
    });

    root.querySelector("#ldd-link-etsy")?.addEventListener("click", () => openExternal(links.etsy));
    root.querySelector("#ldd-link-bmac")?.addEventListener("click", () => openExternal(links.bmac));

    root.querySelector("#ldd-welcome-dismiss")?.addEventListener("click", () => {
      chrome.storage.local.set({ lddWelcomeDismissed: true });
      root.querySelectorAll("[data-tab='welcome']").forEach(el => el.style.display = "none");
      switchTab("instructions");
    });

    async function syncSettingsToggles() {
      const stored = await chrome.storage.local.get({ qaBarEnabled: true, dropperEnabled: true, lddDropSingleListing: true, qaTooltipsEnabled: true, cardActionsEnabled: true, qaShow_download: true });
      const qaEl          = root.querySelector("#ldd-settings-qa");
      const dropEl        = root.querySelector("#ldd-settings-dropper");
      const dndEl         = root.querySelector("#ldd-settings-dnd-mode");
      const tipsEl        = root.querySelector("#ldd-settings-tooltips");
      const cardActionsEl = root.querySelector("#ldd-settings-card-actions");
      const dlQaEl        = root.querySelector("#ldd-qa-show-download");
      if (qaEl)          qaEl.checked          = Boolean(stored.qaBarEnabled);
      if (dropEl)        dropEl.checked        = Boolean(stored.dropperEnabled);
      if (dndEl)         dndEl.checked         = Boolean(stored.dropperEnabled);
      if (tipsEl)        tipsEl.checked        = Boolean(stored.qaTooltipsEnabled);
      if (cardActionsEl) cardActionsEl.checked = Boolean(stored.cardActionsEnabled);
      if (dlQaEl)        dlQaEl.checked        = Boolean(stored.qaShow_download);
    }
    await syncSettingsToggles();

    root.querySelector("#ldd-settings-tooltips")?.addEventListener("change", async (e) => {
      await chrome.storage.local.set({ qaTooltipsEnabled: e.target.checked });
      notify(e.target.checked ? "QA bar tooltips enabled." : "QA bar tooltips disabled.");
    });

    root.querySelector("#ldd-settings-qa")?.addEventListener("change", async (event) => {
      await chrome.storage.local.set({ qaBarEnabled: event.target.checked });
      notify(event.target.checked ? "Quick Actions Bar enabled." : "Quick Actions Bar disabled.");
    });

    root.querySelector("#ldd-settings-dropper")?.addEventListener("change", async (event) => {
      const enabled = Boolean(event.target.checked);
      await chrome.storage.local.set({ dropperEnabled: enabled });
      const hiddenDndModeEl = root.querySelector("#ldd-settings-dnd-mode");
      if (hiddenDndModeEl) hiddenDndModeEl.checked = enabled;
      notify(enabled ? "Drag and Drop Upload enabled." : "Drag and Drop Upload disabled.");
    });

    root.querySelector("#ldd-settings-card-actions")?.addEventListener("change", async (event) => {
      const enabled = Boolean(event.target.checked);
      await chrome.storage.local.set({ cardActionsEnabled: enabled });
      window.dispatchEvent(new CustomEvent("ldd-card-actions-toggle", { detail: { enabled } }));
      notify(enabled ? "Card Quick Actions enabled." : "Card Quick Actions disabled.");
    });

    root.querySelector("#ldd-qa-show-download")?.addEventListener("change", async (event) => {
      await chrome.storage.local.set({ qaShow_download: event.target.checked });
      notify(event.target.checked ? "Download Files button enabled." : "Download Files button disabled.");
    });

    // Keep the legacy hidden DnD mode setting visually synced with the main DnD toggle,
    // but let the toolbar mode switch remain the real user-facing selector.
    const dndModeEl = root.querySelector("#ldd-settings-dnd-mode");
    if (dndModeEl) {
      const { dropperEnabled } = await chrome.storage.local.get({ dropperEnabled: true });
      dndModeEl.checked = Boolean(dropperEnabled);
      dndModeEl.disabled = true;
    }

    root.querySelector("#ldd-settings-full-enable")?.addEventListener("click", async () => {
      await chrome.storage.local.set({ enhancerEnabled: true, qaBarEnabled: true, dropperEnabled: true, lddDropSingleListing: true });
      await syncSettingsToggles();
      notify("All tools enabled.");
    });

    root.querySelector("#ldd-settings-full-disable")?.addEventListener("click", async () => {
      await chrome.storage.local.set({ enhancerEnabled: false, qaBarEnabled: false, dropperEnabled: false });
      await syncSettingsToggles();
      notify("All tools disabled.");
    });

    // ── QA Bar Button Visibility ──────────────────────────────────────────
    const QA_BTN_KEYS = [
      "imageMockups","videoMockups","visionAI","removeBG","upscale","vectorize",
      "canvas","dreamAI","colorOverlay","editInBulk","compressor","resizer","deleteListing",
      "visionAIPresets"
    ];
    const qaDefaults = Object.fromEntries(QA_BTN_KEYS.map((k) =>
      k === "visionAIPresets" ? ["visionAIPresetsEnabled", true] : [`qaShow_${k}`, true]
    ));

    async function syncQaBtnToggles() {
      const stored = await chrome.storage.local.get(qaDefaults);
      QA_BTN_KEYS.forEach((k) => {
        const el = root.querySelector(`#ldd-qa-show-${k}`);
        const storageKey = k === "visionAIPresets" ? "visionAIPresetsEnabled" : `qaShow_${k}`;
        if (el) el.checked = Boolean(stored[storageKey]);
      });
    }
    await syncQaBtnToggles();

    QA_BTN_KEYS.forEach((k) => {
      root.querySelector(`#ldd-qa-show-${k}`)?.addEventListener("change", async (e) => {
        const storageKey = k === "visionAIPresets" ? "visionAIPresetsEnabled" : `qaShow_${k}`;
        await chrome.storage.local.set({ [storageKey]: e.target.checked });
        notify(`QA bar: ${k} ${e.target.checked ? "shown" : "hidden"}.`);
      });
    });

    state.clipboardItems = await readClipboardItems();
    renderKeywords();
    renderProfit();
    renderClipboard();
    togglePanel(false);
    notify("MD Enhancer ready (minimized).");
  }

  let _enabling = false;

  async function enable() {
    if (!isListingsPage()) {
      disable();
      return;
    }
    // Guard against both "already enabled" and "enable() already in flight".
    // Without the _enabling flag, the startup poll can fire a second enable()
    // call while the first is still awaiting bindEvents. The second call passes
    // the state.enabled check (flag not set yet), calls createRoot() which
    // tears out the first call's root mid-execution, and the first call
    // finishes wiring events on a detached node — UI mounts then vanishes.
    if (state.enabled || _enabling) return;
    _enabling = true;
    startPageGuard();
    try {
      injectStyle();
      const root = createRoot();
      // Check if welcome was dismissed — switch straight to CI if so
      chrome.storage.local.get({ lddWelcomeDismissed: false }, (r) => {
        if (r.lddWelcomeDismissed) {
          switchTab("instructions");
          // Hide the home icon from sidebar and inner icons
          root.querySelectorAll("[data-tab='welcome']").forEach(el => el.style.display = "none");
        }
      });
      await bindEvents(root);
      window.addEventListener("ldd-enhancer-toggle", handleToggleEvent);
      window.addEventListener("ldd-enhancer-open", handleOpenEvent);
      window.addEventListener("ldd-enhancer-close", handleCloseEvent);
      window.addEventListener("ldd-enhancer-request-state", handleRequestStateEvent);
      state.enabled = true;
      window.dispatchEvent(new CustomEvent("ldd-enhancer-state", { detail: { open: state.panelOpen } }));
    } catch (_err) {
      state.enabled = false;
      stopPageGuard();
      document.getElementById("ldd-enhancer-root")?.remove();
      removeStyle();
    } finally {
      _enabling = false;
    }
  }

  function disable() {
    stopPageGuard();
    if (!state.enabled) return;
    state.enabled = false;
    state.panelOpen = false;
    teardownPanelInteractions?.();
    teardownPanelInteractions = null;
    window.dispatchEvent(new CustomEvent("ldd-enhancer-state", { detail: { open: false } }));
    window.removeEventListener("ldd-enhancer-toggle", handleToggleEvent);
    window.removeEventListener("ldd-enhancer-open", handleOpenEvent);
    window.removeEventListener("ldd-enhancer-close", handleCloseEvent);
    window.removeEventListener("ldd-enhancer-request-state", handleRequestStateEvent);
    document.getElementById(ROOT_ID)?.remove();
    removeStyle();
  }

  function handleToggleEvent() {
    if (!isListingsPage()) {
      disable();
      return;
    }
    togglePanel(!state.panelOpen);
  }

  function handleOpenEvent() {
    if (!isListingsPage()) {
      disable();
      return;
    }
    togglePanel(true);
  }

  function handleCloseEvent() {
    togglePanel(false);
  }

  function handleRequestStateEvent() {
    window.dispatchEvent(new CustomEvent("ldd-enhancer-state", { detail: { open: state.panelOpen } }));
  }

  window.LDDEnhancer = {
    enable,
    disable,
    open: handleOpenEvent,
    close: handleCloseEvent,
    toggle: handleToggleEvent,
    isOpen: () => state.panelOpen
  };
})();
