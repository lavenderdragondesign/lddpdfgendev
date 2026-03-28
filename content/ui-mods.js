(() => {
  const STYLE_ID = "ldd-listings-toolbar-style-fixed";
  const CENTER_ID = "ldd-listings-toolbar-center-fixed";
  const VISION_AI_OTHER_LABEL = "other (please specify)";
  const VISION_AI_PRESET_TYPES = ["PNG", "SVG", "TUMBLER WRAP", "MUG WRAP"];
  const VISION_AI_PRESET_BLOCK_ID = "ldd-vision-ai-preset-block";
  const VISION_AI_PRESET_LIST_ITEM_ID = "ldd-vision-ai-preset-list-item";
  const LDD_LOGO_URL = chrome.runtime.getURL("assets/logo.png");
  let visionAiPresetSyncInProgress = false;

  let tooltipsEnabled = true;
  let dropperEnabled = true;
  chrome.storage.local.get({ qaTooltipsEnabled: true, dropperEnabled: true }, (r) => {
    tooltipsEnabled = Boolean(r.qaTooltipsEnabled);
    dropperEnabled = Boolean(r.dropperEnabled);
  });

  const QA_BTN_DEFAULTS = {
    qaShow_imageMockups: true,
    qaShow_videoMockups: true,
    qaShow_visionAI: true,
    qaShow_removeBG: true,
    qaShow_upscale: true,
    qaShow_vectorize: true,
    qaShow_canvas: true,
    qaShow_dreamAI: true,
    qaShow_colorOverlay: true,
    qaShow_editInBulk: true,
	qaShow_download: true,
    qaShow_compressor: true,
    qaShow_resizer: true,
    qaShow_deleteListing: true
  };
  let qaVisibility = { ...QA_BTN_DEFAULTS };

  // Load QA button visibility from storage
  chrome.storage.local.get(QA_BTN_DEFAULTS, (stored) => {
    Object.assign(qaVisibility, stored);
  });

  // Re-build QA bar when visibility settings change
  if (typeof chrome !== "undefined" && chrome?.storage?.onChanged?.addListener) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== "local") return;
      const qaKeys = Object.keys(QA_BTN_DEFAULTS);
      const hasQaChange = qaKeys.some((k) => k in changes);
      const hasDropperChange = "dropperEnabled" in changes;
      if (!hasQaChange && !hasDropperChange) return;
      qaKeys.forEach((k) => {
        if (k in changes) qaVisibility[k] = Boolean(changes[k].newValue);
      });
      if (hasDropperChange) dropperEnabled = Boolean(changes.dropperEnabled.newValue);
      // Invalidate bar so it rebuilds on next interval tick
      const bar = document.getElementById(CENTER_ID);
      if (bar) {
        delete bar.dataset.ready;
        bar.remove();
      }
    });
  }

  function norm(value) {
    return (value || "").replace(/\s+/g, " ").trim().toLowerCase();
  }

  const sleep = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

  function isVisible(element) {
    if (!element) return false;
    const style = window.getComputedStyle(element);
    return (
      style.display !== "none" &&
      style.visibility !== "hidden" &&
      (element.offsetParent !== null || element.getClientRects().length > 0)
    );
  }

  function hardClick(element) {
    if (!element) return;
    ["pointerdown", "mousedown", "pointerup", "mouseup", "click"].forEach((type) => {
      element.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true }));
    });
    if (typeof element.click === "function") {
      element.click();
    }
  }

  function setInputValue(input, value) {
    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
    if (nativeSetter) {
      nativeSetter.call(input, value);
    } else {
      input.value = value;
    }
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  async function waitFor(getter, timeout = 2200, step = 100) {
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeout) {
      const value = getter();
      if (value) return value;
      await sleep(step);
    }
    return null;
  }

  function isListingsPage() {
    const origin = window.location.origin || "";
    const path = (window.location.pathname || "").replace(/\/+$/, "");
    return origin === "https://mydesigns.io" && path === "/app/listings";
  }

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #${CENTER_ID} {
        position: fixed;
        left: 50%;
        bottom: 58px;
        transform: translateX(-50%);
        z-index: 2147483000;
        pointer-events: auto;
        width: auto;
        max-width: min(calc(100vw - 28px), 1400px);
        box-sizing: border-box;
      }

      .ldd-quick-row {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: nowrap;
        justify-content: center;
        padding: 10px 14px;
        border: 1px solid rgba(226,232,240,.95);
        border-radius: 999px;
        background: rgba(255,255,255,.92);
        backdrop-filter: blur(14px);
        box-shadow: 0 12px 34px rgba(15,23,42,.18), inset 0 1px 0 rgba(255,255,255,.88);
      }

      .ldd-no-h-scroll {
        overflow-x: hidden !important;
        scrollbar-width: none !important;
      }
      .ldd-no-h-scroll::-webkit-scrollbar { display: none !important; height: 0 !important; }

      .ldd-tool {
        height: 40px;
        min-width: 40px;
        padding: 0 12px;
        border: 1px solid transparent;
        border-radius: 999px;
        background: transparent;
        color: #334155;
        font-size: 12px;
        font-weight: 700;
        cursor: pointer;
        white-space: nowrap;
        line-height: 1;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        box-sizing: border-box;
        transition: transform .18s ease, background .18s ease, color .18s ease, box-shadow .18s ease;
      }
      .ldd-tool:hover {
        background: #ffffff;
        color: #111827;
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(15,23,42,.10);
      }
      .ldd-tool:active { transform: translateY(0) scale(.98); }
      .ldd-enhancer-toggle-btn.active {
        background: linear-gradient(135deg,#8b5cf6,#7c3aed);
        color: #fff;
        box-shadow: 0 8px 18px rgba(124,58,237,.26);
      }

      .ldd-divider {
        width: 1px;
        height: 28px;
        background: rgba(148,163,184,.34);
        flex: 0 0 auto;
      }

      .ldd-tip {
        position: fixed;
        z-index: 2147483647;
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 14px;
        padding: 10px 12px;
        box-shadow: 0 12px 28px rgba(15,23,42,0.16);
        pointer-events: none;
        opacity: 0;
        transition: opacity .12s;
        display: flex;
        flex-direction: column;
        gap: 3px;
        max-width: 240px;
      }
      .ldd-tip.show { opacity: 1; }
      .ldd-tip-title { font-size: 12px; font-weight: 800; color: #1e293b; white-space: nowrap; }
      .ldd-tip-desc  { font-size: 11px; color: #64748b; line-height: 1.4; }
      .ldd-tip-warn  { font-size: 11px; color: #dc2626; font-weight: 700; }

      .ldd-dock-collapse {
        width: 36px;
        height: 36px;
        border: 1px solid rgba(226,232,240,.95);
        border-radius: 999px;
        background: rgba(255,255,255,.92);
        color: #475569;
        box-shadow: 0 10px 26px rgba(15,23,42,.16);
      }
      #${CENTER_ID}.collapsed .ldd-quick-row { display: none; }
      #${CENTER_ID}.collapsed {
        transform: translateX(-50%);
      }

      .ldd-dnd-mode-stack {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 8px !important;
        margin: 0 !important;
        padding: 0 !important;
        border: 0 !important;
        background: transparent !important;
        border-radius: 0 !important;
      }
      .ldd-dnd-mode-stack > div:first-child { display: none !important; }
      .ldd-pill-wrap {
        display: inline-flex;
        flex-direction: row;
        align-items: center;
        gap: 8px;
        flex-shrink: 0;
      }
      .ldd-pill-label {
        font-size: 11px;
        font-weight: 700;
        letter-spacing: .01em;
        text-transform: none;
        color: #64748b;
        white-space: nowrap;
        line-height: 1;
      }
      .ldd-pill-track {
        position: relative;
        display: inline-flex;
        align-items: center;
        height: 22px;
        background: #f1f5f9;
        border: 1px solid #e2e8f0;
        border-radius: 999px;
        padding: 2px;
        cursor: pointer;
        user-select: none;
        min-width: 38px;
      }
      .ldd-pill-thumb {
        position: absolute;
        top: 2px;
        left: 2px;
        width: 16px;
        height: 16px;
        border-radius: 999px;
        transition: all .18s ease;
        box-shadow: 0 1px 2px rgba(15,23,42,.16);
      }

      @media (max-width: 1180px) {
        .ldd-tool[data-short="0"] { display: none; }
      }
      @media (max-width: 860px) {
        #${CENTER_ID} { bottom: 48px; max-width: calc(100vw - 16px); }
        .ldd-quick-row { gap: 6px; padding: 8px 10px; overflow-x: auto; justify-content: flex-start; }
        .ldd-pill-label { display: none; }
      }
    `;
    document.documentElement.appendChild(style);
  }

  function makeTool(label, actionLabels, tipDesc, tipWarn) {
    const button = document.createElement("button");
    button.className = "ldd-tool";
    button.type = "button";
    button.textContent = label;
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      triggerMenuAction(actionLabels);
    });
    if (tipDesc || tipWarn) attachTip(button, label, tipDesc, tipWarn);
    return button;
  }

  function makeHrefTool(label, href, tipDesc) {
    const button = document.createElement("button");
    button.className = "ldd-tool";
    button.type = "button";
    button.textContent = label;
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      window.location.href = href;
    });
    if (tipDesc) attachTip(button, label, tipDesc);
    return button;
  }

  function makeStaticLogo() {
    const logoWrap = document.createElement("span");
    logoWrap.className = "ldd-qa-logo";
    logoWrap.setAttribute("aria-hidden", "true");

    const logo = document.createElement("img");
    logo.src = chrome.runtime.getURL("assets/logo.png");
    logo.alt = "";
    logoWrap.appendChild(logo);

    return logoWrap;
  }

  function makeDndModeTool() {
    const SINGLE_LISTING_KEY = "lddDropSingleListing";

    const outer = document.createElement("div");
    outer.className = "ldd-dnd-mode-stack";
    outer.id = "lddDndModeTool";

    const wrap = document.createElement("div");
    wrap.className = "ldd-pill-wrap";

    const leftLabel = document.createElement("span");
    leftLabel.className = "ldd-pill-label";
    leftLabel.id = "lddDndPillLabelLeft";
    leftLabel.textContent = "Upload Regular";

    const track = document.createElement("div");
    track.className = "ldd-pill-track";

    const thumb = document.createElement("div");
    thumb.className = "ldd-pill-thumb";

    const rightLabel = document.createElement("span");
    rightLabel.className = "ldd-pill-label";
    rightLabel.id = "lddDndPillLabelRight";
    rightLabel.textContent = "Upload To Single Listing";

    track.appendChild(thumb);
    wrap.appendChild(leftLabel);
    wrap.appendChild(track);
    wrap.appendChild(rightLabel);
    outer.appendChild(wrap);

    function refresh(isSingle) {
      leftLabel.style.opacity = isSingle ? "0.55" : "1";
      rightLabel.style.opacity = isSingle ? "1" : "0.55";
      leftLabel.style.color = isSingle ? "#94a3b8" : "#16a34a";
      rightLabel.style.color = isSingle ? "#7c3aed" : "#94a3b8";
      thumb.style.left = isSingle ? "18px" : "2px";
      thumb.style.background = isSingle ? "linear-gradient(180deg,#8b5cf6,#7c3aed)" : "linear-gradient(180deg,#22c55e,#16a34a)";
      track.style.background = isSingle ? "rgba(139,92,246,.16)" : "rgba(34,197,94,.16)";
      track.style.boxShadow = isSingle ? "inset 0 0 0 1px rgba(139,92,246,.18)" : "inset 0 0 0 1px rgba(34,197,94,.18)";
    }

    chrome.storage.local.get({ [SINGLE_LISTING_KEY]: true }, (result) => refresh(Boolean(result[SINGLE_LISTING_KEY])));
    attachTip(track, "Upload Mode", "Left: Upload Regular · Right: Upload All To Single Listing");

    track.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      chrome.storage.local.get({ [SINGLE_LISTING_KEY]: true }, (result) => {
        const next = !Boolean(result[SINGLE_LISTING_KEY]);
        chrome.storage.local.set({ [SINGLE_LISTING_KEY]: next });
        refresh(next);
      });
    });

    if (typeof chrome !== "undefined" && chrome?.storage?.onChanged?.addListener) {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area === "local" && SINGLE_LISTING_KEY in changes) {
          refresh(Boolean(changes[SINGLE_LISTING_KEY].newValue));
        }
      });
    }

    return outer;
  }

  function ensureHeaderUploadModeRow(actionGroup) {
    if (!actionGroup?.parentElement) return null;
    let row = document.getElementById("lddHeaderUploadRow");
    if (!row) {
      row = document.createElement("div");
      row.id = "lddHeaderUploadRow";
      row.className = "ldd-header-upload-row";
    }
    if (row.parentElement !== actionGroup.parentElement || row.previousElementSibling !== actionGroup) {
      actionGroup.insertAdjacentElement("afterend", row);
    }
    return row;
  }

  function openEnhancerSettings() {
    const enhancer = window.LDDEnhancer;
    enhancer?.open?.();

    const activate = () => {
      const settingsTab = document.querySelector('[data-tab="settings"]');
      settingsTab?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
      const settingsPanel = document.querySelector('[data-panel="settings"]');
      settingsPanel?.scrollIntoView?.({ behavior: "smooth", block: "start" });
      const qaLabel = Array.from(document.querySelectorAll('.settings-toggle-label')).find((el) => /quick actions bar/i.test(el.textContent || ""));
      qaLabel?.closest('.settings-toggle-row')?.scrollIntoView?.({ behavior: "smooth", block: "center" });
    };

    requestAnimationFrame(() => setTimeout(activate, 80));
  }

  function makeQaVisibilityTool() {
    const button = document.createElement("button");
    button.className = "ldd-tool ldd-qa-visibility-btn";
    button.type = "button";
    button.textContent = "Show/Hide";
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      openEnhancerSettings();
    });
    attachTip(button, "QA Bar Buttons", "Jump to Enhancer Settings to show or hide Quick Actions buttons");
    return button;
  }

  function makeEnhancerToggleTool() {
    const button = document.createElement("button");
    button.id = "lddEnhancerToggle";
    button.className = "ldd-tool ldd-enhancer-toggle-btn";
    button.type = "button";

    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const enhancer = window.LDDEnhancer;
      if (!enhancer) {
        window.dispatchEvent(new CustomEvent("ldd-enhancer-toggle"));
        return;
      }

      const isOpen = typeof enhancer.isOpen === "function" ? Boolean(enhancer.isOpen()) : button.classList.contains("active");
      if (isOpen) {
        enhancer.close?.();
        return;
      }

      enhancer.enable?.();
      enhancer.open?.();
    });

    const syncState = (open) => {
      const isOpen = Boolean(open);
      button.classList.toggle("active", isOpen);
      button.textContent = isOpen ? "Close MD Enhancer" : "Open MD Enhancer";
      button.title = isOpen ? "Close MD Enhancer" : "Open MD Enhancer";
    };

    window.addEventListener("ldd-enhancer-state", (event) => {
      syncState(Boolean(event.detail?.open));
    });

    syncState(false);

    window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent("ldd-enhancer-request-state"));
    }, 120);

    return button;
  }

  function makePdfGenTool() {
    const button = document.createElement("button");
    button.className = "ldd-tool";
    button.type = "button";
    button.textContent = "PDF Gen";
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      chrome.runtime.sendMessage({ type: "ldd/openPdfGen" });
    });
    attachTip(button, "PDF Generator", "Build Custom Branded PDF from MD Download.pdf ");
    return button;
  }

  function makeCompressorTool() {
    const button = document.createElement("button");
    button.className = "ldd-tool";
    button.type = "button";
    button.textContent = "Compressor";
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      window.LDDCompressor?.toggle();
    });
    attachTip(button, "Image Compressor", "Compress & optimize PNG files");
    return button;
  }

  function makeResizerTool() {
    const button = document.createElement("button");
    button.className = "ldd-tool";
    button.type = "button";
    button.textContent = "Resizer";
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      window.LDDResizer?.toggle();
    });
    attachTip(button, "Quick Resizer", "Resize images to common POD dimensions");
    return button;
  }

  function makeLddDivider() {
    const wrap = document.createElement("span");
    wrap.style.cssText = "display:inline-flex;align-items:center;gap:6px;flex-shrink:0;";

    const pipe = document.createElement("span");
    pipe.textContent = "|";
    pipe.style.cssText = "color:rgba(255,255,255,.25);font-size:14px;line-height:1;";

    wrap.appendChild(pipe);
    return wrap;
  }

  function buildCenterGroup() {
    let group = document.getElementById(CENTER_ID);
    if (!group) {
      group = document.createElement("div");
      group.id = CENTER_ID;
    }

    if (!group.dataset.ready) {
      const row = document.createElement("div");
      row.className = "ldd-quick-row";
      row.appendChild(makeStaticLogo());
      if (qaVisibility.qaShow_imageMockups) row.appendChild(makeTool("Image Mockups", "Image Mockups", "Create image mockups for your listing"));
      if (qaVisibility.qaShow_videoMockups) row.appendChild(makeTool("Video Mockups", "Video Mockups", "Create video mockups for your listing"));
      if (qaVisibility.qaShow_visionAI)     row.appendChild(makeTool("Vision AI", "Vision AI", "Generate listing data from your design with AI"));
      if (qaVisibility.qaShow_removeBG)     row.appendChild(makeTool("Remove Background", "Remove Background", "Remove the background from your image"));
      if (qaVisibility.qaShow_upscale)      row.appendChild(makeTool("Upscale", "Upscale Image", "Upscale your image to a higher resolution"));
      if (qaVisibility.qaShow_vectorize)    row.appendChild(makeTool("Vectorize", "Vectorize Image", "Convert your image to a vector format"));
      if (qaVisibility.qaShow_canvas)       row.appendChild(makeTool("Canvas", "Canvas", "Open the canvas editor"));
      if (qaVisibility.qaShow_dreamAI)      row.appendChild(makeHrefTool("Dream AI", "/app/dreamer", "Generate AI art with Dream AI"));
      if (qaVisibility.qaShow_colorOverlay) row.appendChild(makeTool("Color Overlay", "Color Overlay", "Apply a color overlay to your design"));
      if (qaVisibility.qaShow_editInBulk)   row.appendChild(makeTool("Edit in Bulk", "Edit in Bulk", "Apply changes to multiple listings at once"));
	  if (qaVisibility.qaShow_download)   row.appendChild(makeTool("Download Files", "Download", "Download Files"));
      if (qaVisibility.qaShow_deleteListing) {
        const delBtn = makeTool("⚠️ Caution: Delete Listings ⚠️ ", ["delete listing", "delete listings"], "Permanently delete selected listings", "This action cannot be undone");
        delBtn.style.cssText += "border-color:#fca5a5;color:#dc2626;background:#fff5f5;";
        delBtn.addEventListener("mouseenter", () => { delBtn.style.background = "#fee2e2"; delBtn.style.borderColor = "#ef4444"; });
        delBtn.addEventListener("mouseleave", () => { delBtn.style.background = "#fff5f5"; delBtn.style.borderColor = "#fca5a5"; });
        row.appendChild(delBtn);
      }
      row.appendChild(makeLddDivider());
      if (qaVisibility.qaShow_compressor) row.appendChild(makeCompressorTool());
      if (qaVisibility.qaShow_resizer)    row.appendChild(makeResizerTool());
      row.appendChild(makeQaVisibilityTool());
      row.appendChild(makeEnhancerToggleTool());
      if (dropperEnabled) {
        row.appendChild(makeLddDivider());
        row.appendChild(makeDndModeTool());
      }
      const collapseBtn = document.createElement("button");
      collapseBtn.className = "ldd-dock-collapse";
      collapseBtn.type = "button";
      collapseBtn.textContent = group.classList.contains("collapsed") ? "›" : "⌄";
      attachTip(collapseBtn, "Hide Dock", "Collapse or reopen the floating dock");
      collapseBtn.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const next = !group.classList.contains("collapsed");
        group.classList.toggle("collapsed", next);
        collapseBtn.textContent = next ? "›" : "⌄";
        chrome.storage.local.set({ lddDockCollapsed: next });
      });
      group.innerHTML = "";
      group.appendChild(row);
      group.appendChild(collapseBtn);
      chrome.storage.local.get({ lddDockCollapsed: false }, (stored) => {
        const isCollapsed = Boolean(stored.lddDockCollapsed);
        group.classList.toggle("collapsed", isCollapsed);
        collapseBtn.textContent = isCollapsed ? "›" : "⌄";
      });
      group.dataset.ready = "1";
    }

    return group;
  }

  function findPublishActionGroup() {
    const publishButton = Array.from(document.querySelectorAll("button")).find((button) => norm(button.textContent) === "publish");
    if (!publishButton) return null;

    let node = publishButton;
    for (let i = 0; i < 10 && node; i += 1) {
      const parent = node.parentElement;
      if (!parent) break;

      const text = norm(parent.innerText || "");
      if (text.includes("publications") && text.includes("template") && text.includes("upload") && text.includes("publish")) {
        return parent;
      }

      node = parent;
    }

    return null;
  }

  function findHeaderRightArea() {
    return (
      Array.from(document.querySelectorAll("div.ms-auto.flex.items-center")).find((element) => {
        const text = norm(element.innerText || "");
        return text.includes("publish") || text.includes("andrea kessler");
      }) || null
    );
  }

  function findVisionAiForm() {
    return (
      Array.from(document.querySelectorAll("form")).find((form) => {
        const text = norm(form.textContent || "");
        return (
          (text.includes("generate listing data based on your design") && text.includes("select product type")) ||
          (text.includes("vision ai") && text.includes("select product type"))
        );
      }) || null
    );
  }

  function findVisionAiRoot(seed) {
    if (seed) {
      let node = seed;
      for (let i = 0; i < 10 && node; i += 1) {
        const text = norm(node.textContent || "");
        if (
          text.includes("generate listing data based on your design") ||
          (text.includes("vision ai") && text.includes("select product type"))
        ) {
          return node;
        }
        node = node.parentElement;
      }
    }

    const form = findVisionAiForm();
    if (form) return form;

    return (
      Array.from(document.querySelectorAll("div[role='dialog'],div")).find((node) => {
        const text = norm(node.textContent || "");
        return text.includes("vision ai") && text.includes("select product type");
      }) || document
    );
  }

  function findButtonByLabel(root, labelText) {
    const target = norm(labelText);
    const labels = Array.from(root.querySelectorAll("label,div,span,p")).filter(
      (node) => norm(node.textContent || "") === target
    );

    for (const label of labels) {
      const box = label.closest("div");
      if (!box) continue;
      const scopes = [box, box.parentElement, box.parentElement?.parentElement];
      for (const scope of scopes) {
        if (!scope) continue;
        const button = scope.querySelector('button[type="button"]');
        if (button && isVisible(button)) return button;
      }
    }
    return null;
  }

  function findOtherProductTypeOption(root) {
    const listContainer = findVisionAiOptionListContainer(root);
    if (listContainer) {
      const rowByData = Array.from(listContainer.querySelectorAll("li[data-value]")).find((row) =>
        norm(row.textContent || "") === VISION_AI_OTHER_LABEL
      );
      if (rowByData) return rowByData;
    }

    const searchInput = findVisionAiProductTypeSearchInput(root);
    const searchScope = searchInput?.closest("div")?.parentElement;
    const scope = searchScope && root?.contains?.(searchScope) ? searchScope : root || document;

    const exactTextNodes = Array.from(scope.querySelectorAll("span,div,label,p")).filter((node) => {
      if (!isVisible(node)) return false;
      return norm(node.textContent || "") === VISION_AI_OTHER_LABEL;
    });

    for (const node of exactTextNodes) {
      let current = node;
      for (let depth = 0; current && depth < 5; depth += 1) {
        if (
          current.getAttribute?.("role") === "option" ||
          current.tagName === "BUTTON" ||
          current.classList?.contains("cursor-pointer") ||
          current.hasAttribute?.("tabindex")
        ) {
          return current;
        }
        current = current.parentElement;
      }
      if (node.parentElement) {
        return node.parentElement;
      }
    }

    const candidates = Array.from(scope.querySelectorAll("label,li,button,[role='option'],div")).filter((node) => {
      if (!isVisible(node)) return false;
      const text = norm(node.textContent || "");
      if (!text.includes(VISION_AI_OTHER_LABEL)) return false;
      const hasCheckbox = Boolean(node.querySelector('input[type="checkbox"],[role="checkbox"]'));
      const looksInteractive =
        node.getAttribute("role") === "option" ||
        node.tagName === "BUTTON" ||
        node.classList?.contains("cursor-pointer") ||
        node.hasAttribute("tabindex");
      return hasCheckbox || looksInteractive;
    });

    candidates.sort((a, b) => (a.textContent || "").length - (b.textContent || "").length);
    return candidates[0] || null;
  }

  function findVisionAiProductTypeSearchInput(root = document) {
    const scope = root || document;
    return (
      Array.from(scope.querySelectorAll("input")).find((input) => {
        if (!isVisible(input)) return false;
        const placeholder = norm(input.getAttribute("placeholder") || "");
        return placeholder.includes("search option");
      }) || null
    );
  }

  function findVisionAiOptionRows(root) {
    const listContainer = findVisionAiOptionListContainer(root);
    if (!listContainer) return [];
    const rows = Array.from(listContainer.querySelectorAll("li")).filter((node) => {
      if (!isVisible(node)) return false;
      if (node.id === VISION_AI_PRESET_BLOCK_ID) return false;
      const text = norm(node.textContent || "");
      if (!text) return false;
      const isProductRow = node.hasAttribute("data-value") || node.hasAttribute("tabindex");
      return isProductRow;
    });

    rows.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);
    return rows;
  }

  function findVisionAiOptionListContainer(root) {
    const searchInput = findVisionAiProductTypeSearchInput(root);
    if (!searchInput) return null;
    const panel = searchInput.closest("div.relative.rounded-md")?.parentElement || searchInput.closest("div")?.parentElement;
    const localLists = panel
      ? Array.from(panel.querySelectorAll("ul")).filter((list) => {
          if (!isVisible(list)) return false;
          return Boolean(list.querySelector("li[data-value],li[tabindex]"));
        })
      : [];
    if (localLists.length) {
      localLists.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);
      return localLists[0];
    }

    const globalLists = Array.from(document.querySelectorAll("ul")).filter((list) => {
      if (!isVisible(list)) return false;
      if (!list.querySelector("li[data-value],li[tabindex]")) return false;
      const text = norm(list.textContent || "");
      return text.includes(VISION_AI_OTHER_LABEL);
    });
    if (!globalLists.length) return null;

    globalLists.sort((a, b) => {
      const scoreA = (a.querySelectorAll("li[data-value],li[tabindex]").length || 0) + (norm(a.textContent || "").includes("t-shirt") ? 5 : 0);
      const scoreB = (b.querySelectorAll("li[data-value],li[tabindex]").length || 0) + (norm(b.textContent || "").includes("t-shirt") ? 5 : 0);
      return scoreB - scoreA;
    });
    return globalLists[0];
  }

  function isOtherOptionSelected(root) {
    const option = findOtherProductTypeOption(root);
    if (!option) return false;
    const row = option.closest("li") || option.closest("div") || option;
    return Boolean(row.querySelector('[class*="bg-brand-primary"] svg, [class*="bg-brand-primary"]'));
  }

  async function ensureVisionAiOtherType(root) {
    const productTypeButton = findButtonByLabel(root, "Select product type");
    if (productTypeButton && norm(productTypeButton.textContent || "").includes(VISION_AI_OTHER_LABEL)) {
      return true;
    }

    if (productTypeButton) {
      hardClick(productTypeButton);
      await sleep(120);
    }

    let option = await waitFor(() => findOtherProductTypeOption(root), 1200, 100);
    if (!option) {
      const searchInput = findVisionAiProductTypeSearchInput(root);
      if (!searchInput) return false;
      setInputValue(searchInput, "other");
      option = await waitFor(() => findOtherProductTypeOption(root), 1600, 100);
      if (!option) return false;
    }

    const bestTarget = option.matches?.("[tabindex]") ? option : option.querySelector?.("[tabindex]") || option;
    hardClick(bestTarget);
    await sleep(120);
    const selected = await waitFor(() => {
      if (productTypeButton && norm(productTypeButton.textContent || "").includes(VISION_AI_OTHER_LABEL)) {
        return true;
      }
      return Boolean(findVisionAiCustomTypeInput(root)) || isOtherOptionSelected(root);
    }, 2000, 120);
    return Boolean(selected);
  }

  function findVisionAiCustomTypeInput(root) {
    const scope = root || document;
    const exactContainer = Array.from(scope.querySelectorAll("div[maxlength]")).find((container) => {
      if (!isVisible(container)) return false;
      const maxLength = Number.parseInt(container.getAttribute("maxlength") || "0", 10);
      if (maxLength !== 150) return false;
      return norm(container.textContent || "").includes("please specify other type");
    });
    if (exactContainer) {
      const exactInput = exactContainer.querySelector('input[maxlength="150"]');
      if (exactInput && isVisible(exactInput)) return exactInput;
    }

    const byLabelContainer = Array.from(scope.querySelectorAll("div")).find((container) => {
      if (!isVisible(container)) return false;
      const text = norm(container.textContent || "");
      if (!text.includes("please specify other type")) return false;
      return Boolean(container.querySelector("input"));
    });
    if (byLabelContainer) {
      const labeledInput = byLabelContainer.querySelector('input[maxlength="150"],input[type="text"],input:not([type])');
      if (labeledInput && isVisible(labeledInput)) return labeledInput;
    }

    const byMaxLength = Array.from(scope.querySelectorAll("input[maxlength]")).find((input) => {
      if (!isVisible(input)) return false;
      const maxLength = Number.parseInt(input.getAttribute("maxlength") || "0", 10);
      return maxLength >= 100;
    });
    if (byMaxLength) return byMaxLength;

    const label = Array.from(scope.querySelectorAll("label,div,span,p")).find(
      (node) => norm(node.textContent || "") === "please specify other type"
    );
    if (!label) return null;

    const box = label.closest("div");
    if (!box) return null;
    const input = box.parentElement?.querySelector('input[type="text"],input:not([type])');
    return input && isVisible(input) ? input : null;
  }

  function parseVisionAiTypeList(value) {
    return new Set(
      String(value || "")
        .split(",")
        .map((entry) => norm(entry))
        .filter(Boolean)
    );
  }

  function syncVisionAiPresetChecks(root, block) {
    const customInput = findVisionAiCustomTypeInput(root);
    if (!customInput) return;

    const selected = parseVisionAiTypeList(customInput.value);
    block.querySelectorAll('input[type="checkbox"][data-type]').forEach((checkbox) => {
      checkbox.checked = selected.has(norm(checkbox.dataset.type || ""));
    });
  }

  function buildVisionAiPresetBlock(root) {
    const block = document.createElement("div");
    block.id = VISION_AI_PRESET_BLOCK_ID;
    block.className = "ldd-vision-ai-preset-block";
    block.addEventListener("click", (event) => {
      event.stopPropagation();
    });
    block.addEventListener("mousedown", (event) => {
      event.stopPropagation();
    });

    const heading = document.createElement("div");
    heading.className = "ldd-vision-ai-preset-head";
    const headingLogo = document.createElement("img");
    headingLogo.className = "ldd-vision-ai-preset-logo";
    headingLogo.src = LDD_LOGO_URL;
    headingLogo.alt = "";
    headingLogo.setAttribute("aria-hidden", "true");
    const headingText = document.createElement("span");
    headingText.textContent = "LDD quick custom types";
    heading.appendChild(headingLogo);
    heading.appendChild(headingText);
    block.appendChild(heading);

    VISION_AI_PRESET_TYPES.forEach((typeValue) => {
      const row = document.createElement("label");
      row.className = "ldd-vision-ai-preset-row";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.dataset.type = typeValue;

      const logo = document.createElement("img");
      logo.className = "ldd-vision-ai-preset-logo";
      logo.src = LDD_LOGO_URL;
      logo.alt = "";
      logo.setAttribute("aria-hidden", "true");

      const text = document.createElement("span");
      text.className = "ldd-vision-ai-preset-text";
      text.textContent = typeValue;

      row.addEventListener("click", (event) => {
        event.stopPropagation();
      });

      checkbox.addEventListener("change", () => {
        void applyVisionAiPresetSelection(root, block);
      });

      row.appendChild(checkbox);
      row.appendChild(logo);
      row.appendChild(text);
      block.appendChild(row);
    });

    return block;
  }

  function getVisionAiPresetBlock(root) {
    return document.getElementById(VISION_AI_PRESET_BLOCK_ID) || buildVisionAiPresetBlock(root);
  }

  function mountVisionAiPresetBlockInList(listContainer, block) {
    if (!listContainer || !block) return false;

    let wrapper = document.getElementById(VISION_AI_PRESET_LIST_ITEM_ID);
    if (!wrapper) {
      wrapper = document.createElement("li");
      wrapper.id = VISION_AI_PRESET_LIST_ITEM_ID;
      wrapper.className = "ldd-vision-ai-preset-list-item";
      wrapper.setAttribute("tabindex", "-1");
    }

    if (block.parentElement !== wrapper) {
      wrapper.appendChild(block);
    }

    const firstRow = Array.from(listContainer.querySelectorAll("li")).find(
      (row) => row.id !== VISION_AI_PRESET_LIST_ITEM_ID
    );
    if (firstRow) {
      listContainer.insertBefore(wrapper, firstRow);
    } else {
      listContainer.prepend(wrapper);
    }

    return true;
  }

  function mountVisionAiPresetBlockInline(root, searchInput, block) {
    if (!block) return false;

    const wrapper = document.getElementById(VISION_AI_PRESET_LIST_ITEM_ID);
    if (wrapper?.contains(block)) {
      wrapper.remove();
    }

    const searchContainer = searchInput?.closest("div.relative.rounded-md") || searchInput?.closest("div");
    const panel = searchContainer?.parentElement;
    if (panel && searchContainer) {
      if (searchContainer.nextElementSibling !== block) {
        searchContainer.insertAdjacentElement("afterend", block);
      }
      return true;
    }

    const productTypeButton = findButtonByLabel(root, "Select product type");
    const productTypeWrap = productTypeButton?.parentElement;
    if (productTypeWrap?.parentElement) {
      productTypeWrap.insertAdjacentElement("afterend", block);
      return true;
    }

    return false;
  }

  async function applyVisionAiPresetSelection(root, block) {
    if (visionAiPresetSyncInProgress) return;
    visionAiPresetSyncInProgress = true;
    try {
      const selectedTypes = Array.from(block.querySelectorAll('input[type="checkbox"][data-type]'))
        .filter((checkbox) => checkbox.checked)
        .map((checkbox) => checkbox.dataset.type || "")
        .filter(Boolean);

      if (!selectedTypes.length) {
        const customInput = findVisionAiCustomTypeInput(root);
        if (customInput) {
          setInputValue(customInput, "");
        }
        return;
      }

      const hasOtherType = await ensureVisionAiOtherType(root);
      if (!hasOtherType) return;

      const customInput = await waitFor(() => findVisionAiCustomTypeInput(root), 2600, 120);
      if (!customInput) return;

      setInputValue(customInput, selectedTypes.join(", "));
    } finally {
      visionAiPresetSyncInProgress = false;
    }
  }

  async function maybeInjectVisionAiPresetOptions() {
    // Vision AI preset injection is handled by content-script.js only.
    return;
  }

  function createController() {
    let observer = null;
    let intervalId = null;
    let movedActionState = null;

    function clearToolbarMod() {
      document.getElementById(CENTER_ID)?.remove();
      document.getElementById("lddHeaderUploadRow")?.remove();
      removeStyle();
      resetPublishActionsLocation();
    }

    function movePublishActionsToHeader() {
      if (movedActionState) return;

      const actionGroup = findPublishActionGroup();
      const rightArea = findHeaderRightArea();
      if (!actionGroup || !rightArea) return;

      movedActionState = {
        group: actionGroup,
        parent: actionGroup.parentElement,
        nextSibling: actionGroup.nextElementSibling
      };

      actionGroup.classList.add("ldd-moved-publish-actions");
      rightArea.prepend(actionGroup);
    }

    function resetPublishActionsLocation() {
      if (!movedActionState) return;
      const { group, parent, nextSibling } = movedActionState;
      if (group && parent) {
        if (nextSibling && nextSibling.parentElement === parent) {
          parent.insertBefore(group, nextSibling);
        } else {
          parent.appendChild(group);
        }
      }
      group?.classList?.remove("ldd-moved-publish-actions");
      movedActionState = null;
    }

    function runToolbarMod() {
      if (!isListingsPage()) {
        clearToolbarMod();
        return;
      }

      injectStyle();
      const centerGroup = buildCenterGroup();
      if (!centerGroup) return;
      if (centerGroup.parentElement !== document.body) {
        document.body.appendChild(centerGroup);
      }
      centerGroup.style.display = "inline-flex";
      centerGroup.style.alignItems = "center";
      document.getElementById("lddDndModeTool")?.remove();
      document.getElementById("lddHeaderUploadRow")?.remove();
    }

    function run() {
      runToolbarMod();
    }

    function start() {
      run();
      if (intervalId === null) {
        intervalId = window.setInterval(run, 1500);
      }
    }

    function stop() {
      if (intervalId !== null) {
        window.clearInterval(intervalId);
        intervalId = null;
      }
      observer = null;
      clearToolbarMod();
    }

    return { start, stop };
  }

  const state = {
    controller: null,
    enabled: false
  };
  const visionState = {
    intervalId: null,
    observer: null,
    enabled: false
  };

  function enable() {
    if (state.enabled) return;
    state.enabled = true;
    state.controller = createController();
    state.controller.start();
  }

  function disable() {
    if (!state.enabled) return;
    state.enabled = false;
    state.controller?.stop();
    state.controller = null;
  }

  function runVisionPreset() {
    // Disabled in this file to prevent duplicate observers and freeze loops.
  }

  function enableVisionPreset() {
    if (visionState.enabled) return;
    visionState.enabled = true;
  }

  function disableVisionPreset() {
    if (!visionState.enabled) return;
    visionState.enabled = false;
    if (visionState.intervalId !== null) {
      window.clearInterval(visionState.intervalId);
      visionState.intervalId = null;
    }
    visionState.observer?.disconnect();
    visionState.observer = null;
    document.getElementById(VISION_AI_PRESET_LIST_ITEM_ID)?.remove();
    document.getElementById(VISION_AI_PRESET_BLOCK_ID)?.remove();
  }

  window.LDDQaBar = {
    enable,
    disable
  };

  window.LDDVisionPreset = {
    enable: enableVisionPreset,
    disable: disableVisionPreset
  };
})();
