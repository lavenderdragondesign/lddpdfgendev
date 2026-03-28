(() => {
  const STYLE_ID = "ldd-card-actions-style";
  const ATTR = "data-ldd-actions";
  const LOGO_URL = chrome.runtime.getURL("assets/logo.png");
  let enabled = true;

  chrome.storage.local.get({ cardActionsEnabled: true }, (r) => {
    enabled = Boolean(r.cardActionsEnabled);
    updateVisibility();
  });

  window.addEventListener("ldd-card-actions-toggle", (e) => {
    enabled = Boolean(e.detail?.enabled);
    updateVisibility();
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && "cardActionsEnabled" in changes) {
      enabled = Boolean(changes.cardActionsEnabled.newValue);
      updateVisibility();
    }
  });

  function updateVisibility() {
    document.querySelectorAll(".ldd-card-btns").forEach(el => {
      el.style.display = enabled ? "" : "none";
    });
  }

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .ldd-card-wrap { position: relative; }
      .ldd-card-btns {
        position: absolute;
        bottom: 4px;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        align-items: center;
        gap: 4px;
        opacity: 0;
        pointer-events: none;
        transition: opacity .15s ease;
        z-index: 10;
        white-space: nowrap;
      }
      .ldd-card-wrap:hover .ldd-card-btns {
        opacity: 1;
        pointer-events: auto;
      }
      .ldd-card-logo {
        width: 14px; height: 14px; border-radius: 3px;
        object-fit: cover; flex-shrink: 0;
        box-shadow: 0 1px 3px rgba(0,0,0,0.2);
      }
      .ldd-card-btn {
        height: 22px; padding: 0 7px; border-radius: 5px;
        border: 1px solid rgba(0,0,0,0.15);
        background: rgba(255,255,255,0.92); color: #334155;
        font-size: 10px; font-weight: 700; cursor: pointer;
        display: inline-flex; align-items: center; gap: 3px;
        backdrop-filter: blur(4px);
        box-shadow: 0 1px 4px rgba(0,0,0,0.12);
        white-space: nowrap;
      }
      .ldd-card-btn:hover { background: #fff; }
      .ldd-card-btn.download:hover { border-color: #16a34a; color: #16a34a; }
      .ldd-card-btn.rename:hover   { border-color: #6d5efc; color: #6d5efc; }
    `;
    document.head.appendChild(style);
  }

  function findDotsButton(card) {
    let node = card.parentElement;
    for (let i = 0; i < 6 && node; i++) {
      const dots = node.querySelector("div.h-6.w-8.cursor-pointer");
      if (dots) return dots;
      node = node.parentElement;
    }
    return null;
  }

  function clickMenuItemByText(labelText) {
    const menu = document.querySelector("div[class*='z-1070'] ul");
    if (!menu) return false;
    for (const btn of menu.querySelectorAll("li button")) {
      const span = btn.querySelector("span");
      if (span && span.textContent.trim().toLowerCase() === labelText.toLowerCase()) {
        btn.click();
        return true;
      }
    }
    return false;
  }

  function triggerAction(card, labelText) {
    const dotsBtn = findDotsButton(card);
    if (!dotsBtn) return;
    dotsBtn.click();
    let tries = 0;
    const timer = setInterval(() => {
      tries++;
      if (clickMenuItemByText(labelText) || tries > 25) clearInterval(timer);
    }, 80);
  }

  function addButtonsToCard(card) {
    if (card.getAttribute(ATTR)) return;
    card.setAttribute(ATTR, "1");
    card.classList.add("ldd-card-wrap");

    const btns = document.createElement("div");
    btns.className = "ldd-card-btns";
    if (!enabled) btns.style.display = "none";

    const logo = document.createElement("img");
    logo.src = LOGO_URL; logo.alt = ""; logo.className = "ldd-card-logo";

    const dlBtn = document.createElement("button");
    dlBtn.className = "ldd-card-btn download"; dlBtn.type = "button"; dlBtn.textContent = "⬇ Download";
    dlBtn.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); triggerAction(card, "Download file"); });

    const rnBtn = document.createElement("button");
    rnBtn.className = "ldd-card-btn rename"; rnBtn.type = "button"; rnBtn.textContent = "✏ Rename";
    rnBtn.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); triggerAction(card, "Rename file"); });

    btns.appendChild(logo); btns.appendChild(dlBtn); btns.appendChild(rnBtn);
    card.appendChild(btns);
  }

  function scanCards() {
    document.querySelectorAll(".dragndrop:not([data-ldd-actions])").forEach(addButtonsToCard);
  }

  function init() {
    injectStyle();
    scanCards();
    new MutationObserver(scanCards).observe(document.body, { childList: true, subtree: true });
  }

  if (window.location.origin === "https://mydesigns.io") {
    document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", init) : init();
  }
})();
