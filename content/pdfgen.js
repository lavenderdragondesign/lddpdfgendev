/* LDD PDF Generator — on-page modal */
(function () {
  if (window.__lddPdfGenLoaded) return;
  window.__lddPdfGenLoaded = true;

  const LOGO_URL = chrome.runtime.getURL("assets/logo.png");

  // ─── Styles ───────────────────────────────────────────────────────────────────
  const styleEl = document.createElement("style");
  styleEl.textContent = `
    #ldd-pdf-backdrop {
      position: fixed; inset: 0; z-index: 2147483644;
      background: rgba(10,15,30,.65); backdrop-filter: blur(5px);
      display: flex; align-items: center; justify-content: center;
      opacity: 0; transition: opacity .18s ease; pointer-events: none;
    }
    #ldd-pdf-backdrop.visible { opacity: 1; pointer-events: auto; }
    #ldd-pdf-modal {
      width: 960px; max-width: 98vw; height: 88vh;
      background: #f8fafc; border-radius: 20px;
      box-shadow: 0 28px 80px rgba(0,0,0,.28);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 12px; color: #172033;
      display: flex; flex-direction: column; overflow: hidden;
      transform: scale(.96) translateY(10px); transition: transform .18s ease;
    }
    #ldd-pdf-backdrop.visible #ldd-pdf-modal { transform: scale(1) translateY(0); }

    /* Header */
    #ldd-pdf-header {
      padding: 12px 16px; border-bottom: 1.5px solid #e5e7eb;
      background: #fff; display: flex; align-items: center; gap: 10px; flex-shrink: 0;
    }
    #ldd-pdf-header img { width: 28px; height: 28px; border-radius: 7px; flex-shrink: 0; }
    .ldd-p-title { font-size: 14px; font-weight: 700; flex: 1; }
    .ldd-p-sub   { font-size: 10px; color: #9ca3af; }
    #ldd-pdf-close {
      width: 28px; height: 28px; border: none; background: #f3f4f6;
      border-radius: 8px; cursor: pointer; color: #6b7280; font-size: 15px;
      display: flex; align-items: center; justify-content: center; transition: background .12s;
    }
    #ldd-pdf-close:hover { background: #fee2e2; color: #dc2626; }

    /* Body layout */
    #ldd-pdf-body {
      flex: 1; overflow: hidden; display: flex;
    }

    /* Left panel — controls */
    #ldd-pdf-controls {
      width: 280px; flex-shrink: 0;
      background: #fff; border-right: 1.5px solid #e5e7eb;
      display: flex; flex-direction: column; overflow: hidden;
    }

    /* Tab nav */
    .ldd-p-tabs {
      display: flex; flex-wrap: wrap; gap: 3px; padding: 8px; border-bottom: 1px solid #e5e7eb; flex-shrink: 0;
    }
    .ldd-p-tab {
      border: 1px solid #e5e7eb; background: #f9fafb; color: #6b7280;
      border-radius: 6px; font-size: 10px; font-weight: 600; padding: 4px 8px;
      cursor: pointer; transition: all .1s;
    }
    .ldd-p-tab.active { background: #ede9fe; border-color: #c4b5fd; color: #6d28d9; }

    /* Control scroll area */
    #ldd-pdf-ctrl-scroll {
      flex: 1; overflow-y: auto; padding: 12px;
      display: flex; flex-direction: column; gap: 10px;
    }
    #ldd-pdf-ctrl-scroll::-webkit-scrollbar { width: 4px; }
    #ldd-pdf-ctrl-scroll::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 4px; }

    .ldd-p-panel { display: none; flex-direction: column; gap: 8px; }
    .ldd-p-panel.active { display: flex; }

    .ldd-p-field-label {
      font-size: 10px; font-weight: 700; color: #6b7280;
      text-transform: uppercase; letter-spacing: .05em; margin-bottom: 2px;
    }
    .ldd-p-input, .ldd-p-textarea, .ldd-p-select {
      width: 100%; border: 1.5px solid #e5e7eb; border-radius: 7px;
      padding: 6px 8px; font-size: 11.5px; color: #111; background: #fff;
      outline: none; transition: border-color .12s; font-family: inherit;
      box-sizing: border-box;
    }
    .ldd-p-input:focus, .ldd-p-textarea:focus, .ldd-p-select:focus { border-color: #7c3aed; }
    .ldd-p-textarea { min-height: 60px; resize: vertical; }
    .ldd-p-color-row { display: flex; align-items: center; gap: 8px; }
    .ldd-p-color-input { width: 32px; height: 28px; border: 1.5px solid #e5e7eb; border-radius: 6px; padding: 2px; cursor: pointer; flex-shrink: 0; }
    .ldd-p-check-row { display: flex; align-items: center; gap: 7px; font-size: 11.5px; color: #374151; cursor: pointer; padding: 3px 0; }
    .ldd-p-check-row input { accent-color: #7c3aed; cursor: pointer; }
    .ldd-p-divider { border: none; border-top: 1px solid #f3f4f6; margin: 2px 0; }
    .ldd-p-section-head { font-size: 11px; font-weight: 700; color: #374151; }

    /* Upload button */
    .ldd-p-upload-btn {
      border: 1.5px dashed #c4b5fd; border-radius: 8px; background: #faf5ff;
      padding: 8px; text-align: center; cursor: pointer; font-size: 11px;
      color: #7c3aed; font-weight: 600; transition: all .12s;
    }
    .ldd-p-upload-btn:hover { background: #ede9fe; border-color: #7c3aed; }
    .ldd-p-upload-preview { max-width: 100%; max-height: 60px; object-fit: contain; border-radius: 6px; margin-top: 4px; }

    /* Right panel — preview */
    #ldd-pdf-preview-wrap {
      flex: 1; background: #e5e7eb; display: flex; flex-direction: column;
      align-items: center; justify-content: flex-start; padding: 16px; overflow-y: auto; gap: 12px;
    }
    #ldd-pdf-preview-wrap::-webkit-scrollbar { width: 5px; }
    #ldd-pdf-preview-wrap::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 4px; }

    #ldd-pdf-canvas-outer {
      position: relative; flex-shrink: 0;
      box-shadow: 0 8px 32px rgba(0,0,0,.18); border-radius: 4px; overflow: hidden;
    }
    #ldd-pdf-canvas {
      display: block; width: 408px; height: 528px;
    }

    /* Footer */
    #ldd-pdf-footer {
      padding: 10px 16px; border-top: 1.5px solid #e5e7eb; background: #fff;
      display: flex; gap: 8px; align-items: center; flex-shrink: 0;
    }
    .ldd-p-btn {
      padding: 9px 18px; border: none; border-radius: 9px;
      font-size: 12px; font-weight: 700; cursor: pointer;
      display: flex; align-items: center; gap: 6px; transition: all .15s;
    }
    .ldd-p-btn-primary { background: #16a34a; color: #fff; }
    .ldd-p-btn-primary:hover { background: #15803d; }
    .ldd-p-btn-secondary { background: #f3f4f6; color: #374151; border: 1.5px solid #e5e7eb; }
    .ldd-p-btn-secondary:hover { background: #e5e7eb; }
    .ldd-p-btn:disabled { opacity: .45; cursor: not-allowed; }
    #ldd-p-export-status { font-size: 11px; color: #9ca3af; margin-left: auto; }

    /* QR canvas inside preview */
    #ldd-p-qr-canvas { display: none; }
  `;
  document.head.appendChild(styleEl);

  // ─── Config state ─────────────────────────────────────────────────────────────
  let cfg = {
    title:     "Your Digital Files Are Ready",
    shortDesc: "Thank you for your purchase!",
    mainDesc:  "Click the button below to access your digital files. We recommend saving this page so you can return anytime.",
    footer:    "© 2026 Your Store Name. All rights reserved.",
    btnLabel:  "Download Your Files",
    btnUrl:    "",
    bgColor:   "#ffffff",
    accentColor: "#f97316",
    btnColor:  "#3b82f6",
    btnTextColor: "#ffffff",
    promoBg:   "#f97316",
    promoEnabled: true,
    promoTitle: "SPECIAL OFFER",
    promoCode:  "SAVE20",
    promoDesc:  "20% off your next purchase",
    showSocials: false,
    facebook: "", instagram: "", etsy: "", website: "",
    showQR:   false,
    qrUrl:    "",
    logoData: null,
    paperSize: "US Letter", // 816×1056 at 96dpi → 408×528 display
  };

  // ─── DOM ──────────────────────────────────────────────────────────────────────
  const backdrop = document.createElement("div");
  backdrop.id = "ldd-pdf-backdrop";
  backdrop.innerHTML = `
    <div id="ldd-pdf-modal">
      <div id="ldd-pdf-header">
        <img src="${LOGO_URL}" alt="LDD" />
        <div>
          <div class="ldd-p-title">PDF Generator</div>
          <div class="ldd-p-sub">Build your digital download delivery page</div>
        </div>
        <button id="ldd-pdf-close">✕</button>
      </div>

      <div id="ldd-pdf-body">
        <div id="ldd-pdf-controls">
          <div class="ldd-p-tabs">
            <button class="ldd-p-tab active" data-tab="content">Content</button>
            <button class="ldd-p-tab" data-tab="button">Button</button>
            <button class="ldd-p-tab" data-tab="colors">Colors</button>
            <button class="ldd-p-tab" data-tab="promo">Promo</button>
            <button class="ldd-p-tab" data-tab="socials">Socials</button>
            <button class="ldd-p-tab" data-tab="assets">Assets</button>
          </div>
          <div id="ldd-pdf-ctrl-scroll">

            <!-- CONTENT -->
            <div class="ldd-p-panel active" data-panel="content">
              <div class="ldd-p-field-label">Title</div>
              <input class="ldd-p-input" id="ldd-p-title" value="${esc(cfg.title)}" />
              <div class="ldd-p-field-label">Subtitle</div>
              <input class="ldd-p-input" id="ldd-p-short" value="${esc(cfg.shortDesc)}" />
              <div class="ldd-p-field-label">Main Description</div>
              <textarea class="ldd-p-textarea" id="ldd-p-main">${esc(cfg.mainDesc)}</textarea>
              <div class="ldd-p-field-label">Footer</div>
              <input class="ldd-p-input" id="ldd-p-footer" value="${esc(cfg.footer)}" />
            </div>

            <!-- BUTTON -->
            <div class="ldd-p-panel" data-panel="button">
              <div class="ldd-p-field-label">Button Label</div>
              <input class="ldd-p-input" id="ldd-p-btn-label" value="${esc(cfg.btnLabel)}" />
              <div class="ldd-p-field-label">Button URL (your download link)</div>
              <input class="ldd-p-input" id="ldd-p-btn-url" placeholder="https://..." value="${esc(cfg.btnUrl)}" />
              <hr class="ldd-p-divider" />
              <div class="ldd-p-field-label">QR Code</div>
              <label class="ldd-p-check-row"><input type="checkbox" id="ldd-p-show-qr" /> Show QR Code for button URL</label>
              <div class="ldd-p-field-label" style="margin-top:4px">QR URL (leave blank to use button URL)</div>
              <input class="ldd-p-input" id="ldd-p-qr-url" placeholder="https://..." />
            </div>

            <!-- COLORS -->
            <div class="ldd-p-panel" data-panel="colors">
              <div class="ldd-p-field-label">Background</div>
              <div class="ldd-p-color-row">
                <input type="color" class="ldd-p-color-input" id="ldd-p-bg-color" value="${cfg.bgColor}" />
                <input class="ldd-p-input" id="ldd-p-bg-hex" value="${cfg.bgColor}" style="flex:1" />
              </div>
              <div class="ldd-p-field-label">Accent / Heading Color</div>
              <div class="ldd-p-color-row">
                <input type="color" class="ldd-p-color-input" id="ldd-p-accent-color" value="${cfg.accentColor}" />
                <input class="ldd-p-input" id="ldd-p-accent-hex" value="${cfg.accentColor}" style="flex:1" />
              </div>
              <div class="ldd-p-field-label">Button Color</div>
              <div class="ldd-p-color-row">
                <input type="color" class="ldd-p-color-input" id="ldd-p-btn-color" value="${cfg.btnColor}" />
                <input class="ldd-p-input" id="ldd-p-btn-hex" value="${cfg.btnColor}" style="flex:1" />
              </div>
              <div class="ldd-p-field-label">Button Text Color</div>
              <div class="ldd-p-color-row">
                <input type="color" class="ldd-p-color-input" id="ldd-p-btntxt-color" value="${cfg.btnTextColor}" />
                <input class="ldd-p-input" id="ldd-p-btntxt-hex" value="${cfg.btnTextColor}" style="flex:1" />
              </div>
            </div>

            <!-- PROMO -->
            <div class="ldd-p-panel" data-panel="promo">
              <label class="ldd-p-check-row"><input type="checkbox" id="ldd-p-promo-enabled" checked /> Show Promo Block</label>
              <div class="ldd-p-field-label">Promo Heading</div>
              <input class="ldd-p-input" id="ldd-p-promo-title" value="${esc(cfg.promoTitle)}" />
              <div class="ldd-p-field-label">Coupon Code</div>
              <input class="ldd-p-input" id="ldd-p-promo-code" value="${esc(cfg.promoCode)}" />
              <div class="ldd-p-field-label">Description</div>
              <input class="ldd-p-input" id="ldd-p-promo-desc" value="${esc(cfg.promoDesc)}" />
              <div class="ldd-p-field-label">Promo Block Background</div>
              <div class="ldd-p-color-row">
                <input type="color" class="ldd-p-color-input" id="ldd-p-promo-bg" value="${cfg.promoBg}" />
                <input class="ldd-p-input" id="ldd-p-promo-bg-hex" value="${cfg.promoBg}" style="flex:1" />
              </div>
            </div>

            <!-- SOCIALS -->
            <div class="ldd-p-panel" data-panel="socials">
              <label class="ldd-p-check-row"><input type="checkbox" id="ldd-p-show-socials" /> Show Social Links</label>
              <div class="ldd-p-field-label">Etsy Shop URL</div>
              <input class="ldd-p-input" id="ldd-p-etsy" placeholder="https://etsy.com/shop/..." />
              <div class="ldd-p-field-label">Instagram</div>
              <input class="ldd-p-input" id="ldd-p-instagram" placeholder="https://instagram.com/..." />
              <div class="ldd-p-field-label">Facebook</div>
              <input class="ldd-p-input" id="ldd-p-facebook" placeholder="https://facebook.com/..." />
              <div class="ldd-p-field-label">Website</div>
              <input class="ldd-p-input" id="ldd-p-website" placeholder="https://..." />
            </div>

            <!-- ASSETS -->
            <div class="ldd-p-panel" data-panel="assets">
              <div class="ldd-p-field-label">Logo / Header Image</div>
              <div class="ldd-p-upload-btn" id="ldd-p-logo-btn">Click to upload logo</div>
              <input type="file" id="ldd-p-logo-input" accept="image/*" style="display:none" />
              <img id="ldd-p-logo-preview" class="ldd-p-upload-preview" style="display:none" />
              <button class="ldd-p-btn ldd-p-btn-secondary" id="ldd-p-logo-clear" style="display:none;font-size:11px;padding:5px 10px;margin-top:2px">Remove Logo</button>
              <div class="ldd-p-field-label" style="margin-top:6px">Paper Size</div>
              <select class="ldd-p-select" id="ldd-p-paper">
                <option value="US Letter">US Letter (8.5×11")</option>
                <option value="A4">A4 (210×297mm)</option>
              </select>
            </div>

          </div><!-- ctrl-scroll -->
        </div><!-- controls -->

        <!-- Preview -->
        <div id="ldd-pdf-preview-wrap">
          <div id="ldd-pdf-canvas-outer">
            <canvas id="ldd-pdf-canvas" width="816" height="1056"></canvas>
          </div>
          <canvas id="ldd-p-qr-canvas" width="120" height="120"></canvas>
        </div>
      </div>

      <div id="ldd-pdf-footer">
        <button class="ldd-p-btn ldd-p-btn-secondary" id="ldd-p-refresh-btn">↺ Refresh Preview</button>
        <button class="ldd-p-btn ldd-p-btn-primary" id="ldd-p-export-btn">
          <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"/></svg>
          Export PDF
        </button>
        <span id="ldd-p-export-status"></span>
      </div>
    </div>
  `;
  document.body.appendChild(backdrop);

  function esc(s) { return (s || "").replace(/"/g, "&quot;").replace(/</g, "&lt;"); }

  // ─── Open / Close ─────────────────────────────────────────────────────────────
  function open()  { backdrop.classList.add("visible"); drawPreview(); }
  function close() { backdrop.classList.remove("visible"); }
  backdrop.addEventListener("click", e => { if (e.target === backdrop) close(); });
  document.getElementById("ldd-pdf-close").addEventListener("click", close);
  document.addEventListener("keydown", e => { if (e.key === "Escape") close(); });
  window.LDDPdfGen = { open, close, toggle: () => backdrop.classList.contains("visible") ? close() : open() };

  // ─── Tab switching ────────────────────────────────────────────────────────────
  backdrop.querySelectorAll(".ldd-p-tab").forEach(btn => {
    btn.addEventListener("click", () => {
      backdrop.querySelectorAll(".ldd-p-tab").forEach(b => b.classList.remove("active"));
      backdrop.querySelectorAll(".ldd-p-panel").forEach(p => p.classList.remove("active"));
      btn.classList.add("active");
      backdrop.querySelector(`.ldd-p-panel[data-panel="${btn.dataset.tab}"]`).classList.add("active");
    });
  });

  // ─── Wire inputs → cfg → redraw ──────────────────────────────────────────────
  function wire(id, key, type = "text") {
    const el = document.getElementById(id);
    if (!el) return;
    const ev = type === "checkbox" ? "change" : "input";
    el.addEventListener(ev, () => {
      cfg[key] = type === "checkbox" ? el.checked : el.value;
      scheduleRedraw();
    });
  }

  // Sync color picker ↔ hex input
  function wireColor(pickerId, hexId, key) {
    const picker = document.getElementById(pickerId);
    const hex    = document.getElementById(hexId);
    picker.addEventListener("input", () => { hex.value = picker.value; cfg[key] = picker.value; scheduleRedraw(); });
    hex.addEventListener("input", () => {
      if (/^#[0-9a-fA-F]{6}$/.test(hex.value)) { picker.value = hex.value; cfg[key] = hex.value; scheduleRedraw(); }
    });
  }

  wire("ldd-p-title",       "title");
  wire("ldd-p-short",       "shortDesc");
  wire("ldd-p-main",        "mainDesc");
  wire("ldd-p-footer",      "footer");
  wire("ldd-p-btn-label",   "btnLabel");
  wire("ldd-p-btn-url",     "btnUrl");
  wire("ldd-p-show-qr",     "showQR",      "checkbox");
  wire("ldd-p-qr-url",      "qrUrl");
  wire("ldd-p-promo-enabled","promoEnabled","checkbox");
  wire("ldd-p-promo-title", "promoTitle");
  wire("ldd-p-promo-code",  "promoCode");
  wire("ldd-p-promo-desc",  "promoDesc");
  wire("ldd-p-show-socials","showSocials",  "checkbox");
  wire("ldd-p-etsy",        "etsy");
  wire("ldd-p-instagram",   "instagram");
  wire("ldd-p-facebook",    "facebook");
  wire("ldd-p-website",     "website");
  wire("ldd-p-paper",       "paperSize");

  wireColor("ldd-p-bg-color",     "ldd-p-bg-hex",      "bgColor");
  wireColor("ldd-p-accent-color", "ldd-p-accent-hex",  "accentColor");
  wireColor("ldd-p-btn-color",    "ldd-p-btn-hex",     "btnColor");
  wireColor("ldd-p-btntxt-color", "ldd-p-btntxt-hex",  "btnTextColor");
  wireColor("ldd-p-promo-bg",     "ldd-p-promo-bg-hex","promoBg");

  // Logo upload
  const logoBtn     = document.getElementById("ldd-p-logo-btn");
  const logoInput   = document.getElementById("ldd-p-logo-input");
  const logoPreview = document.getElementById("ldd-p-logo-preview");
  const logoClear   = document.getElementById("ldd-p-logo-clear");

  logoBtn.addEventListener("click", () => logoInput.click());
  logoInput.addEventListener("change", e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      cfg.logoData = ev.target.result;
      logoPreview.src = cfg.logoData; logoPreview.style.display = "";
      logoClear.style.display = ""; logoBtn.textContent = "Change logo";
      scheduleRedraw();
    };
    reader.readAsDataURL(file);
  });
  logoClear.addEventListener("click", () => {
    cfg.logoData = null; logoPreview.style.display = "none";
    logoClear.style.display = "none"; logoBtn.textContent = "Click to upload logo";
    logoInput.value = ""; scheduleRedraw();
  });

  // ─── Canvas drawing ───────────────────────────────────────────────────────────
  const canvas  = document.getElementById("ldd-pdf-canvas");
  const ctx     = canvas.getContext("2d");
  const qrCanvas = document.getElementById("ldd-p-qr-canvas");

  let redrawTimer = null;
  function scheduleRedraw() {
    clearTimeout(redrawTimer);
    redrawTimer = setTimeout(drawPreview, 120);
  }

  function wrapText(ctx, text, x, y, maxW, lineH) {
    const words = (text || "").split(" ");
    let line = "";
    let cy = y;
    for (const w of words) {
      const test = line ? line + " " + w : w;
      if (ctx.measureText(test).width > maxW && line) {
        ctx.fillText(line, x, cy); line = w; cy += lineH;
      } else { line = test; }
    }
    if (line) ctx.fillText(line, x, cy);
    return cy + lineH;
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y); ctx.arcTo(x+w, y, x+w, y+r, r);
    ctx.lineTo(x+w, y+h-r);  ctx.arcTo(x+w, y+h, x+w-r, y+h, r);
    ctx.lineTo(x+r, y+h);    ctx.arcTo(x, y+h, x, y+h-r, r);
    ctx.lineTo(x, y+r);      ctx.arcTo(x, y, x+r, y, r);
    ctx.closePath();
  }

  function drawPreview() {
    const W = 816, H = 1056;
    canvas.width = W; canvas.height = H;
    ctx.clearRect(0, 0, W, H);

    // Background
    ctx.fillStyle = cfg.bgColor;
    ctx.fillRect(0, 0, W, H);

    // Accent top bar
    ctx.fillStyle = cfg.accentColor;
    ctx.fillRect(0, 0, W, 8);

    let y = 40;
    const pad = 80;
    const contentW = W - pad * 2;

    // Logo
    if (cfg.logoData) {
      const logoImg = new Image();
      logoImg.onload = () => {
        const lh = 70, lw = lh * (logoImg.width / logoImg.height);
        ctx.drawImage(logoImg, (W - lw) / 2, y, lw, lh);
        continueDrawing(y + lh + 20);
      };
      logoImg.src = cfg.logoData;
    } else {
      continueDrawing(y);
    }

    function continueDrawing(startY) {
      let cy = startY;

      // Title
      ctx.fillStyle = cfg.accentColor;
      ctx.font = "bold 38px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
      ctx.textAlign = "center";
      cy = wrapText(ctx, cfg.title, W/2, cy, contentW, 46) + 10;

      // Short desc
      ctx.fillStyle = "#334155";
      ctx.font = "24px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
      cy = wrapText(ctx, cfg.shortDesc, W/2, cy, contentW, 32) + 14;

      // Divider
      ctx.strokeStyle = cfg.accentColor + "44";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(pad, cy); ctx.lineTo(W - pad, cy); ctx.stroke();
      cy += 20;

      // Main desc
      ctx.fillStyle = "#475569";
      ctx.font = "20px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
      cy = wrapText(ctx, cfg.mainDesc, W/2, cy, contentW, 28) + 20;

      // Button
      const btnW = 320, btnH = 62, btnX = (W - btnW) / 2;
      roundRect(ctx, btnX, cy, btnW, btnH, 14);
      ctx.fillStyle = cfg.btnColor; ctx.fill();
      ctx.fillStyle = cfg.btnTextColor;
      ctx.font = "bold 22px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(cfg.btnLabel || "Download Your Files", W/2, cy + btnH/2 + 8);
      cy += btnH + 18;

      // QR code
      if (cfg.showQR && (cfg.qrUrl || cfg.btnUrl)) {
        try {
          const qr = new window.QRious({ element: qrCanvas, value: cfg.qrUrl || cfg.btnUrl, size: 120 });
          ctx.drawImage(qrCanvas, (W - 120) / 2, cy);
          cy += 140;
        } catch(e) {}
      }

      // Promo block
      if (cfg.promoEnabled) {
        const promoH = 160;
        roundRect(ctx, pad, cy, contentW, promoH, 16);
        ctx.fillStyle = cfg.promoBg; ctx.fill();

        ctx.fillStyle = "#fff";
        ctx.font = "bold 26px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(cfg.promoTitle, W/2, cy + 36);

        // Code pill
        ctx.fillStyle = "rgba(255,255,255,.22)";
        roundRect(ctx, W/2 - 110, cy + 50, 220, 48, 10); ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.font = "bold 30px 'Courier New', monospace";
        ctx.fillText(cfg.promoCode, W/2, cy + 82);

        ctx.font = "18px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
        ctx.fillStyle = "rgba(255,255,255,.85)";
        ctx.fillText(cfg.promoDesc, W/2, cy + 120);
        cy += promoH + 16;
      }

      // Socials
      if (cfg.showSocials) {
        const links = [
          cfg.etsy && { label: "🛍 Etsy", url: cfg.etsy },
          cfg.instagram && { label: "📸 Instagram", url: cfg.instagram },
          cfg.facebook && { label: "📘 Facebook", url: cfg.facebook },
          cfg.website && { label: "🌐 Website", url: cfg.website },
        ].filter(Boolean);

        if (links.length) {
          ctx.fillStyle = "#64748b";
          ctx.font = "16px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(links.map(l => l.label).join("  ·  "), W/2, cy + 20);
          cy += 40;
        }
      }

      // Footer
      ctx.fillStyle = "#94a3b8";
      ctx.font = "14px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(cfg.footer, W/2, H - 28);

      // Bottom accent bar
      ctx.fillStyle = cfg.accentColor;
      ctx.fillRect(0, H - 8, W, 8);
    }
  }

  // ─── Export PDF ───────────────────────────────────────────────────────────────
  const exportBtn    = document.getElementById("ldd-p-export-btn");
  const exportStatus = document.getElementById("ldd-p-export-status");
  const refreshBtn   = document.getElementById("ldd-p-refresh-btn");

  refreshBtn.addEventListener("click", drawPreview);

  exportBtn.addEventListener("click", async () => {
    exportBtn.disabled = true;
    exportStatus.textContent = "Generating PDF...";

    try {
      // Ensure libs loaded
      if (!window.jspdf) throw new Error("jsPDF not loaded yet");

      drawPreview();
      await new Promise(r => setTimeout(r, 200)); // let canvas settle

      const { jsPDF } = window.jspdf;
      const isA4 = cfg.paperSize === "A4";
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: isA4 ? "a4" : "letter" });
      const pW = pdf.internal.pageSize.getWidth();
      const pH = pdf.internal.pageSize.getHeight();

      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      pdf.addImage(imgData, "JPEG", 0, 0, pW, pH);
      pdf.save("ldd_digital_download.pdf");

      exportStatus.textContent = "✓ Saved!";
      setTimeout(() => { exportStatus.textContent = ""; }, 3000);
    } catch (err) {
      exportStatus.textContent = "Error: " + err.message;
      console.error("[LDD PDF Gen]", err);
    } finally {
      exportBtn.disabled = false;
    }
  });

  // Draw on first open
  setTimeout(drawPreview, 500);

})();
