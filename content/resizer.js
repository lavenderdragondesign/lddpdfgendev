/* LDD Quick Resizer — on-page modal overlay */
(function () {
  if (window.__lddResizerLoaded) return;
  window.__lddResizerLoaded = true;

  const LOGO_URL = chrome.runtime.getURL("assets/logo.png");

  // ─── State ────────────────────────────────────────────────────────────────────
  const DEFAULT_SIZES = [
    { id: "4500-5400", w: 4500, h: 5400, label: "POD Default" },
    { id: "4500-4500", w: 4500, h: 4500, label: "Merch Square" },
    { id: "3000-3000", w: 3000, h: 3000, label: "Etsy Listing" },
    { id: "2400-3000", w: 2400, h: 3000, label: "8x10 Print" },
    { id: "1080-1080", w: 1080, h: 1080, label: "Instagram Post" },
    { id: "1080-1920", w: 1080, h: 1920, label: "Story" },
    { id: "2048-2048", w: 2048, h: 2048, label: "2K Web" },
    { id: "1200-1200", w: 1200, h: 1200, label: "Web Preview" },
  ];

  let images      = [];
  let sizes       = DEFAULT_SIZES.map(s => ({ ...s }));
  let selectedIds = new Set(["4500-5400"]);
  let opts = {
    mode: "contain",
    keepTransparency: true,
    sharpen: false,
    convertToPng: false,
    padColor: "#ffffff",
    folderStrategy: "bySize",
  };

  // ─── Styles ───────────────────────────────────────────────────────────────────
  const styleEl = document.createElement("style");
  styleEl.textContent = `
    #ldd-resizer-backdrop {
      position: fixed; inset: 0; z-index: 2147483646;
      background: rgba(15, 20, 40, 0.55);
      backdrop-filter: blur(4px);
      display: flex; align-items: center; justify-content: center;
      opacity: 0; transition: opacity .18s ease;
      pointer-events: none;
    }
    #ldd-resizer-backdrop.visible {
      opacity: 1; pointer-events: auto;
    }
    #ldd-resizer-modal {
      width: 460px; max-height: 88vh;
      background: #ffffff; border-radius: 20px;
      box-shadow: 0 24px 64px rgba(0,0,0,.22), 0 4px 16px rgba(0,0,0,.12);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 12px; color: #172033;
      display: flex; flex-direction: column; overflow: hidden;
      transform: scale(.96) translateY(8px);
      transition: transform .18s ease;
    }
    #ldd-resizer-backdrop.visible #ldd-resizer-modal {
      transform: scale(1) translateY(0);
    }
    #ldd-resizer-header {
      padding: 14px 16px 12px;
      border-bottom: 1.5px solid #f0f0f4;
      display: flex; align-items: center; gap: 10px; flex-shrink: 0;
    }
    #ldd-resizer-header img { width: 30px; height: 30px; border-radius: 8px; flex-shrink: 0; }
    .ldd-r-title  { font-size: 14px; font-weight: 700; color: #111; flex: 1; }
    .ldd-r-sub    { font-size: 11px; color: #9ca3af; margin-top: 1px; }
    #ldd-resizer-close {
      width: 28px; height: 28px; border: none; background: #f3f4f6;
      border-radius: 8px; cursor: pointer; display: flex; align-items: center;
      justify-content: center; color: #6b7280; font-size: 15px;
      transition: background .12s; flex-shrink: 0;
    }
    #ldd-resizer-close:hover { background: #fee2e2; color: #dc2626; }
    #ldd-resizer-body {
      flex: 1; overflow-y: auto; padding: 14px 16px;
      display: flex; flex-direction: column; gap: 14px;
    }
    #ldd-resizer-body::-webkit-scrollbar { width: 4px; }
    #ldd-resizer-body::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 4px; }
    .ldd-r-section-label {
      font-size: 10px; font-weight: 700; text-transform: uppercase;
      letter-spacing: .06em; color: #9ca3af; margin-bottom: 8px;
      display: flex; align-items: center; gap: 6px;
    }
    .ldd-r-badge { background: #eef2ff; color: #6366f1; font-size: 9px; font-weight: 700; border-radius: 4px; padding: 1px 5px; }
    .ldd-r-divider { border: none; border-top: 1.5px solid #f3f4f6; margin: 0; }
    #ldd-r-drop {
      border: 2px dashed #c7d2fe; border-radius: 12px;
      background: #f5f3ff; padding: 18px 12px;
      text-align: center; cursor: pointer; transition: all .15s;
    }
    #ldd-r-drop:hover, #ldd-r-drop.over { border-color: #6366f1; background: #eef2ff; }
    .ldd-r-drop-icon  { font-size: 26px; margin-bottom: 5px; }
    .ldd-r-drop-title { font-weight: 700; color: #6366f1; font-size: 13px; }
    .ldd-r-drop-hint  { color: #9ca3af; font-size: 11px; margin-top: 2px; }
    #ldd-r-img-list { display: flex; flex-direction: column; gap: 5px; margin-top: 8px; }
    .ldd-r-img-row {
      display: flex; align-items: center; gap: 8px;
      background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 9px; padding: 5px 9px;
    }
    .ldd-r-img-thumb { width: 34px; height: 34px; object-fit: contain; border-radius: 6px; background: #f3f4f6; flex-shrink: 0; }
    .ldd-r-img-name  { flex: 1; font-size: 11px; color: #374151; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .ldd-r-img-dims  { font-size: 10px; color: #9ca3af; white-space: nowrap; }
    .ldd-r-img-del   { border: none; background: none; cursor: pointer; color: #d1d5db; font-size: 14px; line-height: 1; transition: color .1s; padding: 0; }
    .ldd-r-img-del:hover { color: #ef4444; }
    #ldd-r-size-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 5px; margin-bottom: 7px; }
    .ldd-r-size-btn {
      border: 1.5px solid #e5e7eb; border-radius: 9px; background: #fff;
      padding: 7px 8px; text-align: left; cursor: pointer; transition: all .12s; position: relative;
    }
    .ldd-r-size-btn:hover { border-color: #a5b4fc; background: #f5f3ff; }
    .ldd-r-size-btn.sel  { border-color: #6366f1; background: #eef2ff; }
    .ldd-r-size-dims { font-size: 11px; font-weight: 700; color: #111; }
    .ldd-r-size-btn.sel .ldd-r-size-dims { color: #4f46e5; }
    .ldd-r-size-lbl  { font-size: 10px; color: #9ca3af; margin-top: 1px; }
    .ldd-r-size-btn.sel .ldd-r-size-lbl { color: #818cf8; }
    .ldd-r-size-check { position: absolute; top: 5px; right: 7px; font-size: 10px; color: #6366f1; display: none; }
    .ldd-r-size-btn.sel .ldd-r-size-check { display: block; }
    .ldd-r-custom-row { display: flex; align-items: center; gap: 6px; }
    .ldd-r-num { flex: 1; border: 1.5px solid #e5e7eb; border-radius: 8px; padding: 6px 8px; font-size: 12px; outline: none; text-align: center; color: #111; background: #fff; transition: border-color .12s; }
    .ldd-r-num:focus { border-color: #6366f1; }
    .ldd-r-sep { color: #9ca3af; font-size: 13px; flex-shrink: 0; }
    .ldd-r-add-btn { border: 1.5px solid #e5e7eb; border-radius: 8px; background: #fff; padding: 6px 12px; font-size: 11px; font-weight: 600; cursor: pointer; color: #6366f1; white-space: nowrap; transition: all .12s; }
    .ldd-r-add-btn:hover { background: #eef2ff; border-color: #a5b4fc; }
    .ldd-r-opts-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px; }
    .ldd-r-opt-label { font-size: 11px; font-weight: 600; color: #6b7280; display: flex; flex-direction: column; gap: 4px; }
    .ldd-r-select { border: 1.5px solid #e5e7eb; border-radius: 8px; padding: 6px 8px; font-size: 11.5px; background: #fff; color: #111; outline: none; cursor: pointer; }
    .ldd-r-select:focus { border-color: #6366f1; }
    .ldd-r-checks { display: flex; flex-direction: column; gap: 3px; }
    .ldd-r-check-row { display: flex; flex-direction: row; align-items: center; gap: 8px; font-size: 11.5px; color: #374151; font-weight: 400; cursor: pointer; padding: 4px 6px; border-radius: 6px; transition: background .1s; }
    .ldd-r-check-row:hover { background: #f9fafb; }
    .ldd-r-check-row input { width: 13px; height: 13px; accent-color: #6366f1; cursor: pointer; flex-shrink: 0; }
    .ldd-r-pad-wrap { display: flex; align-items: center; gap: 7px; margin-top: 4px; }
    .ldd-r-color-input { width: 30px; height: 26px; border: 1.5px solid #e5e7eb; border-radius: 6px; padding: 2px; cursor: pointer; background: none; }
    .ldd-r-color-hex { font-size: 11px; color: #9ca3af; font-family: monospace; }
    #ldd-resizer-footer { padding: 12px 16px; border-top: 1.5px solid #f0f0f4; background: #fff; flex-shrink: 0; }
    #ldd-r-export-btn {
      width: 100%; padding: 11px; border: none; border-radius: 11px;
      background: #16a34a; color: #fff; font-size: 13px; font-weight: 700;
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      gap: 8px; transition: background .15s, opacity .15s;
    }
    #ldd-r-export-btn:hover:not(:disabled) { background: #15803d; }
    #ldd-r-export-btn:disabled { opacity: .45; cursor: not-allowed; }
    #ldd-r-progress-wrap { height: 4px; background: #e5e7eb; border-radius: 4px; margin-top: 9px; overflow: hidden; display: none; }
    #ldd-r-progress-bar  { height: 100%; background: #16a34a; width: 0%; transition: width .2s; }
    #ldd-r-status { font-size: 10px; color: #9ca3af; text-align: center; margin-top: 6px; min-height: 13px; }
    #ldd-r-status.ok  { color: #16a34a; }
    #ldd-r-status.err { color: #ef4444; }
  `;
  document.head.appendChild(styleEl);

  // ─── Build DOM ────────────────────────────────────────────────────────────────
  const backdrop = document.createElement("div");
  backdrop.id = "ldd-resizer-backdrop";
  backdrop.innerHTML = `
    <div id="ldd-resizer-modal">
      <div id="ldd-resizer-header">
        <img src="${LOGO_URL}" alt="LDD" />
        <div>
          <div class="ldd-r-title">Quick Resizer</div>
          <div class="ldd-r-sub">Bulk resize · 300 DPI · ZIP export</div>
        </div>
        <button id="ldd-resizer-close" title="Close">✕</button>
      </div>

      <div id="ldd-resizer-body">
        <div>
          <div class="ldd-r-section-label">Images <span id="ldd-r-img-count" class="ldd-r-badge">0</span></div>
          <div id="ldd-r-drop">
            <input id="ldd-r-file-input" type="file" accept="image/*" multiple style="display:none" />
            <div class="ldd-r-drop-icon">🖼️</div>
            <div class="ldd-r-drop-title">Drop images or click to browse</div>
            <div class="ldd-r-drop-hint">PNG · JPG · WebP — multiple files supported</div>
          </div>
          <div id="ldd-r-img-list"></div>
        </div>

        <hr class="ldd-r-divider" />

        <div>
          <div class="ldd-r-section-label">Output Sizes <span id="ldd-r-sel-count" class="ldd-r-badge">1</span></div>
          <div id="ldd-r-size-grid"></div>
          <div class="ldd-r-custom-row">
            <input id="ldd-r-cw" class="ldd-r-num" type="number" placeholder="W" min="1" />
            <span class="ldd-r-sep">×</span>
            <input id="ldd-r-ch" class="ldd-r-num" type="number" placeholder="H" min="1" />
            <button class="ldd-r-add-btn" id="ldd-r-add-custom" type="button">+ Add</button>
          </div>
        </div>

        <hr class="ldd-r-divider" />

        <div>
          <div class="ldd-r-section-label">Options</div>
          <div class="ldd-r-opts-grid">
            <label class="ldd-r-opt-label">Fit Mode
              <select id="ldd-r-mode" class="ldd-r-select">
                <option value="contain">Contain (fit inside)</option>
                <option value="cover">Cover (crop to fill)</option>
                <option value="stretch">Stretch (distort)</option>
                <option value="pad">Pad (fit + fill bg)</option>
              </select>
            </label>
            <label class="ldd-r-opt-label">ZIP Folder By
              <select id="ldd-r-folder" class="ldd-r-select">
                <option value="bySize">Size</option>
                <option value="byImage">Image name</option>
                <option value="flat">Flat (no folders)</option>
              </select>
            </label>
          </div>
          <div id="ldd-r-pad-row" style="display:none;margin-bottom:8px">
            <div class="ldd-r-opt-label">Background Color</div>
            <div class="ldd-r-pad-wrap">
              <input id="ldd-r-pad-color" class="ldd-r-color-input" type="color" value="#ffffff" />
              <span id="ldd-r-pad-hex" class="ldd-r-color-hex">#ffffff</span>
            </div>
          </div>
          <div class="ldd-r-checks">
            <label class="ldd-r-check-row"><input id="ldd-r-transparency" type="checkbox" checked /> Keep Transparency (PNG / WebP)</label>
            <label class="ldd-r-check-row"><input id="ldd-r-to-png" type="checkbox" /> Force Convert to PNG</label>
            <label class="ldd-r-check-row"><input id="ldd-r-sharpen" type="checkbox" /> Apply Slight Sharpening</label>
          </div>
        </div>
      </div>

      <div id="ldd-resizer-footer">
        <button id="ldd-r-export-btn" disabled type="button">
          <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"/></svg>
          Export ZIP
        </button>
        <div id="ldd-r-progress-wrap"><div id="ldd-r-progress-bar"></div></div>
        <div id="ldd-r-status"></div>
      </div>
    </div>
  `;
  document.body.appendChild(backdrop);

  // ─── Open / Close ─────────────────────────────────────────────────────────────
  function open()  { backdrop.classList.add("visible"); }
  function close() { backdrop.classList.remove("visible"); }

  backdrop.addEventListener("click", e => { if (e.target === backdrop) close(); });
  document.getElementById("ldd-resizer-close").addEventListener("click", close);
  document.addEventListener("keydown", e => { if (e.key === "Escape") close(); });

  window.LDDResizer = { open, close, toggle: () => backdrop.classList.contains("visible") ? close() : open() };

  // ─── Refs ─────────────────────────────────────────────────────────────────────
  const dropZone   = document.getElementById("ldd-r-drop");
  const fileInput  = document.getElementById("ldd-r-file-input");
  const imgList    = document.getElementById("ldd-r-img-list");
  const imgCount   = document.getElementById("ldd-r-img-count");
  const sizeGrid   = document.getElementById("ldd-r-size-grid");
  const selCount   = document.getElementById("ldd-r-sel-count");
  const cwEl       = document.getElementById("ldd-r-cw");
  const chEl       = document.getElementById("ldd-r-ch");
  const addCustom  = document.getElementById("ldd-r-add-custom");
  const modeEl     = document.getElementById("ldd-r-mode");
  const padRow     = document.getElementById("ldd-r-pad-row");
  const padColorEl = document.getElementById("ldd-r-pad-color");
  const padHexEl   = document.getElementById("ldd-r-pad-hex");
  const transEl    = document.getElementById("ldd-r-transparency");
  const toPngEl    = document.getElementById("ldd-r-to-png");
  const sharpenEl  = document.getElementById("ldd-r-sharpen");
  const folderEl   = document.getElementById("ldd-r-folder");
  const exportBtn  = document.getElementById("ldd-r-export-btn");
  const progWrap   = document.getElementById("ldd-r-progress-wrap");
  const progBar    = document.getElementById("ldd-r-progress-bar");
  const statusEl   = document.getElementById("ldd-r-status");

  // ─── Upload ───────────────────────────────────────────────────────────────────
  function uid() { return Math.random().toString(36).slice(2, 9); }

  async function loadFile(file) {
    return new Promise(resolve => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => resolve({ id: uid(), file, name: file.name, width: img.naturalWidth, height: img.naturalHeight, url });
      img.src = url;
    });
  }

  async function addFiles(files) {
    const loaded = await Promise.all(Array.from(files).filter(f => f.type.startsWith("image/")).map(loadFile));
    images.push(...loaded);
    renderImages();
    refreshExportBtn();
  }

  dropZone.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", e => { addFiles(e.target.files); fileInput.value = ""; });
  dropZone.addEventListener("dragover",  e => { e.preventDefault(); e.stopPropagation(); dropZone.classList.add("over"); });
  dropZone.addEventListener("dragleave", () => dropZone.classList.remove("over"));
  dropZone.addEventListener("drop", e => { e.preventDefault(); e.stopPropagation(); dropZone.classList.remove("over"); addFiles(e.dataTransfer.files); });

  function renderImages() {
    imgCount.textContent = images.length;
    if (!images.length) { imgList.innerHTML = ""; return; }
    imgList.innerHTML = images.map(img => `
      <div class="ldd-r-img-row">
        <img class="ldd-r-img-thumb" src="${img.url}" />
        <div style="flex:1;overflow:hidden">
          <div class="ldd-r-img-name">${img.name}</div>
          <div class="ldd-r-img-dims">${img.width} × ${img.height}</div>
        </div>
        <button class="ldd-r-img-del" data-id="${img.id}" title="Remove">✕</button>
      </div>
    `).join("");
    imgList.querySelectorAll(".ldd-r-img-del").forEach(btn => {
      btn.addEventListener("click", () => {
        const removed = images.find(i => i.id === btn.dataset.id);
        if (removed) URL.revokeObjectURL(removed.url);
        images = images.filter(i => i.id !== btn.dataset.id);
        renderImages();
        refreshExportBtn();
      });
    });
  }

  // ─── Sizes ────────────────────────────────────────────────────────────────────
  function renderSizes() {
    selCount.textContent = selectedIds.size;
    sizeGrid.innerHTML = sizes.map(s => `
      <button class="ldd-r-size-btn${selectedIds.has(s.id) ? " sel" : ""}" data-id="${s.id}" type="button">
        <div class="ldd-r-size-dims">${s.w} × ${s.h}</div>
        <div class="ldd-r-size-lbl">${s.label || "Custom"}</div>
        <span class="ldd-r-size-check">✓</span>
      </button>
    `).join("");
    sizeGrid.querySelectorAll(".ldd-r-size-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        selectedIds.has(btn.dataset.id) ? selectedIds.delete(btn.dataset.id) : selectedIds.add(btn.dataset.id);
        renderSizes(); refreshExportBtn();
      });
    });
  }
  renderSizes();

  addCustom.addEventListener("click", () => {
    const w = parseInt(cwEl.value), h = parseInt(chEl.value);
    if (w > 0 && h > 0) {
      const id = `custom-${w}-${h}-${Date.now()}`;
      sizes.push({ id, w, h, label: "Custom" });
      selectedIds.add(id);
      cwEl.value = ""; chEl.value = "";
      renderSizes(); refreshExportBtn();
    }
  });

  // ─── Options ─────────────────────────────────────────────────────────────────
  function togglePadRow() { padRow.style.display = (opts.mode === "pad" || !opts.keepTransparency) ? "" : "none"; }
  modeEl.addEventListener("change",    () => { opts.mode = modeEl.value; togglePadRow(); });
  padColorEl.addEventListener("input", () => { opts.padColor = padColorEl.value; padHexEl.textContent = padColorEl.value; });
  transEl.addEventListener("change",   () => { opts.keepTransparency = transEl.checked; togglePadRow(); });
  toPngEl.addEventListener("change",   () => { opts.convertToPng = toPngEl.checked; });
  sharpenEl.addEventListener("change", () => { opts.sharpen = sharpenEl.checked; });
  folderEl.addEventListener("change",  () => { opts.folderStrategy = folderEl.value; });
  function refreshExportBtn() { exportBtn.disabled = images.length === 0 || selectedIds.size === 0; }

  // ─── Image Processing ─────────────────────────────────────────────────────────
  const PPM_300 = 11811;
  const CRC_TABLE = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1); t[n] = c >>> 0; }
    return t;
  })();
  function crc32(buf) { let c = 0xffffffff >>> 0; for (let i = 0; i < buf.length; i++) c = (CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)) >>> 0; return (c ^ 0xffffffff) >>> 0; }

  async function force300Dpi(blob) {
    const buf = await blob.arrayBuffer(), b = new Uint8Array(buf);
    if (blob.type === "image/jpeg" && b[0] === 0xff && b[1] === 0xd8) {
      for (let p = 2; p < Math.min(b.length - 18, 100); p++) {
        if (b[p] === 0xff && b[p+1] === 0xe0 && b[p+6] === 0x4a && b[p+7] === 0x46) {
          const out = new Uint8Array(b); out[p+13]=1; out[p+14]=0x01; out[p+15]=0x2c; out[p+16]=0x01; out[p+17]=0x2c;
          return new Blob([out], { type: "image/jpeg" });
        }
      }
    } else if (blob.type === "image/png" && b[0] === 0x89 && b[1] === 0x50) {
      const C = 21, out = new Uint8Array(b.length + C); out.set(b.slice(0, 33), 0);
      const cv = new DataView(new ArrayBuffer(C));
      cv.setUint32(0, 9); cv.setUint8(4,0x70); cv.setUint8(5,0x48); cv.setUint8(6,0x59); cv.setUint8(7,0x73);
      cv.setUint32(8, PPM_300); cv.setUint32(12, PPM_300); cv.setUint8(16, 1);
      cv.setUint32(17, crc32(new Uint8Array(cv.buffer.slice(4, 17))));
      out.set(new Uint8Array(cv.buffer), 33); out.set(b.slice(33), 33 + C);
      return new Blob([out], { type: "image/png" });
    }
    return blob;
  }

  function getGeom(sw, sh, tw, th, mode) {
    if (mode === "stretch") return { cw:tw, ch:th, dx:0, dy:0, dw:tw, dh:th };
    const sr = sw/sh, tr = tw/th; let dw=tw, dh=th;
    if (mode==="contain"||mode==="pad") { if(sr>tr) dh=tw/sr; else dw=th*sr; }
    else { if(sr>tr) dw=th*sr; else dh=tw/sr; }
    return { cw:tw, ch:th, dx:(tw-dw)/2, dy:(th-dh)/2, dw, dh };
  }

  function applySharpen(ctx, w, h) {
    const id = ctx.getImageData(0,0,w,h), d=id.data, buf=new Uint8ClampedArray(d), mix=0.2;
    for (let y=1;y<h-1;y++) for (let x=1;x<w-1;x++) {
      const i=(y*w+x)*4;
      for (let c=0;c<3;c++) { const v=buf[i+c]*5+buf[((y-1)*w+x)*4+c]*-1+buf[((y+1)*w+x)*4+c]*-1+buf[(y*w+(x-1))*4+c]*-1+buf[(y*w+(x+1))*4+c]*-1; d[i+c]=Math.min(255,Math.max(0,v*mix+buf[i+c]*(1-mix))); }
    }
    ctx.putImageData(id, 0, 0);
  }

  function processImage(imgObj, size) {
    return new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) { reject(new Error("No canvas context")); return; }
        const g = getGeom(el.naturalWidth, el.naturalHeight, size.w, size.h, opts.mode);
        canvas.width = g.cw; canvas.height = g.ch;
        if (opts.mode==="pad") { ctx.fillStyle=opts.padColor; ctx.fillRect(0,0,g.cw,g.ch); }
        else if (!opts.keepTransparency) { ctx.fillStyle="#ffffff"; ctx.fillRect(0,0,g.cw,g.ch); }
        ctx.imageSmoothingEnabled=true; ctx.imageSmoothingQuality="high";
        ctx.drawImage(el, g.dx, g.dy, g.dw, g.dh);
        if (opts.sharpen) applySharpen(ctx, g.cw, g.ch);
        const mime = opts.convertToPng ? "image/png" : imgObj.file.type;
        canvas.toBlob(async blob => { if (!blob) { reject(new Error("toBlob failed")); return; } try { resolve(await force300Dpi(blob)); } catch { resolve(blob); } }, mime, 0.95);
      };
      el.onerror = () => reject(new Error("Failed to load: " + imgObj.name));
      el.src = imgObj.url;
    });
  }

  // ─── Export ───────────────────────────────────────────────────────────────────
  exportBtn.addEventListener("click", async () => {
    const selSizes = sizes.filter(s => selectedIds.has(s.id));
    if (!images.length || !selSizes.length) return;
    exportBtn.disabled = true; progWrap.style.display = ""; progBar.style.width = "0%"; setStatus("Starting...", "");
    const total = images.length * selSizes.length; let done = 0;
    try {
      const zip = new window.JSZip();
      for (const img of images) {
        for (const size of selSizes) {
          setStatus(`Processing ${img.name} @ ${size.w}×${size.h}`, "");
          progBar.style.width = `${(done/total)*100}%`;
          await new Promise(r => setTimeout(r, 0));
          const blob = await processImage(img, size);
          const base = img.name.replace(/\.[^.]+$/, "");
          const ext  = opts.convertToPng ? ".png" : (img.name.match(/\.[^.]+$/) || [".png"])[0];
          const filename = `${base}_${size.w}x${size.h}${ext}`;
          let path = filename;
          if (opts.folderStrategy==="bySize") path=`${size.w}x${size.h}${size.label?"-"+size.label.replace(/[^\w]/g,"_"):""}/${filename}`;
          else if (opts.folderStrategy==="byImage") path=`${base}/${filename}`;
          zip.file(path, blob); done++;
        }
      }
      progBar.style.width = "100%"; setStatus("Compressing...", "");
      await new Promise(r => setTimeout(r, 0));
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a"); a.href=url; a.download=`ldd_resized_${new Date().toISOString().slice(0,10)}.zip`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
      setStatus(`✓ Done — ${images.length} image${images.length!==1?"s":""}, ${selSizes.length} size${selSizes.length!==1?"s":""}`, "ok");
    } catch (err) {
      console.error("[LDD Resizer]", err); setStatus("Error: " + err.message, "err");
    } finally {
      refreshExportBtn(); setTimeout(() => { progWrap.style.display = "none"; }, 2500);
    }
  });

  function setStatus(msg, cls) { statusEl.textContent = msg; statusEl.className = cls || ""; }

})();
