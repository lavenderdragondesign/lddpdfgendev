/* LDD Image Compressor — on-page modal overlay */
(function () {
  if (window.__lddCompressorLoaded) return;
  window.__lddCompressorLoaded = true;

  const LOGO_URL   = chrome.runtime.getURL("assets/logo.png");
  const PAKO_URL   = chrome.runtime.getURL("libs/pako.min.js");
  const UPNG_URL   = chrome.runtime.getURL("libs/UPNG.js");
  const ETSY_LIMIT = 19.9 * 1024 * 1024;

  // ─── Worker source (inline string, loaded with local libs) ───────────────────
  const WORKER_FN = `
    function calculateCRC(data) {
      let crc = 0xFFFFFFFF;
      const table = new Uint32Array(256);
      for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        table[n] = c;
      }
      for (let i = 0; i < data.length; i++) crc = table[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
      return (crc ^ 0xFFFFFFFF) >>> 0;
    }

    function inject300DPI(buffer) {
      const insertPos = 33;
      const physChunk = new Uint8Array([0,0,0,9,112,72,89,115,0,0,46,35,0,0,46,35,1,0,0,0,0]);
      const crc = calculateCRC(physChunk.slice(4, 17));
      const dv = new DataView(physChunk.buffer);
      dv.setUint32(17, crc);
      const out = new Uint8Array(buffer.length + physChunk.length);
      out.set(buffer.slice(0, insertPos), 0);
      out.set(physChunk, insertPos);
      out.set(buffer.slice(insertPos), insertPos + physChunk.length);
      return out;
    }

    function injectJpegDPI(bytes, dpi) {
      if (!bytes || bytes.length < 4 || bytes[0] !== 0xFF || bytes[1] !== 0xD8) return bytes;
      const makeAPP0 = () => {
        const out = new Uint8Array(20); let o = 0;
        out[o++]=0xFF; out[o++]=0xE0; out[o++]=0x00; out[o++]=0x10;
        out[o++]=0x4A; out[o++]=0x46; out[o++]=0x49; out[o++]=0x46; out[o++]=0x00;
        out[o++]=0x01; out[o++]=0x02; out[o++]=0x01;
        out[o++]=(dpi>>8)&0xFF; out[o++]=dpi&0xFF;
        out[o++]=(dpi>>8)&0xFF; out[o++]=dpi&0xFF;
        out[o++]=0x00; out[o++]=0x00;
        return out;
      };
      let i = 2;
      while (i + 4 < bytes.length) {
        if (bytes[i] !== 0xFF) { i++; continue; }
        while (i < bytes.length && bytes[i] === 0xFF) i++;
        if (i >= bytes.length) break;
        const marker = bytes[i++];
        if (marker===0xD8||marker===0xD9) continue;
        if (marker>=0xD0&&marker<=0xD7) continue;
        if (marker===0x01) continue;
        if (marker===0xDA) break;
        if (i + 1 >= bytes.length) break;
        const segLen = (bytes[i] << 8) | bytes[i + 1];
        if (segLen < 2 || i + segLen > bytes.length) break;
        if (marker === 0xE0 && segLen >= 16) {
          if (bytes[i+2]===0x4A&&bytes[i+3]===0x46&&bytes[i+4]===0x49&&bytes[i+5]===0x46&&bytes[i+6]===0x00) {
            bytes[i+9]=0x01; bytes[i+10]=(dpi>>8)&0xFF; bytes[i+11]=dpi&0xFF; bytes[i+12]=(dpi>>8)&0xFF; bytes[i+13]=dpi&0xFF;
            return bytes;
          }
        }
        i += segLen;
      }
      const app0 = makeAPP0();
      const out = new Uint8Array(bytes.length + app0.length);
      out.set(bytes.slice(0, 2), 0); out.set(app0, 2); out.set(bytes.slice(2), 2 + app0.length);
      return out;
    }

    async function processFile(file, paletteSize) {
      const isPng = file.mimeType === 'image/png' || file.name.toLowerCase().endsWith('.png');
      if (isPng) {
        const img = UPNG.decode(file.data);
        const rgba = UPNG.toRGBA8(img)[0];
        const compressed = UPNG.encode([rgba], img.width, img.height, paletteSize);
        const finalData = inject300DPI(new Uint8Array(compressed));
        return { name: file.name, data: finalData, originalSize: file.size, newSize: finalData.length, mimeType: 'image/png' };
      } else {
        const blob = new Blob([file.data], { type: file.mimeType });
        const bitmap = await createImageBitmap(blob);
        const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(bitmap, 0, 0);
        const outputBlob = await canvas.convertToBlob({ type: file.mimeType, quality: 0.92 });
        const arrayBuffer = await outputBlob.arrayBuffer();
        const finalData = new Uint8Array(arrayBuffer);
        const isJpeg = file.mimeType === 'image/jpeg' || /\\.jpe?g$/i.test(file.name);
        const outData = isJpeg ? injectJpegDPI(finalData, 300) : finalData;
        return { name: file.name, data: outData, originalSize: file.size, newSize: outData.length, mimeType: file.mimeType };
      }
    }

    self.onmessage = async function(e) {
      const { files, paletteSize } = e.data;
      const results = [], transferList = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          self.postMessage({ type: 'PROGRESS', payload: { progress: (i / files.length) * 100, currentFile: file.name } });
          const processed = await processFile(file, paletteSize);
          results.push(processed); transferList.push(processed.data.buffer);
        } catch (err) {
          results.push({ name: file.name, data: new Uint8Array(file.data), originalSize: file.size, newSize: file.size, mimeType: file.mimeType });
          transferList.push(file.data);
        }
      }
      self.postMessage({ type: 'DONE', payload: results }, transferList);
    };
  `;

  let workerUrl = null;
  let workerPool = [];
  let isReady = false;

  async function fetchText(url) {
    const r = await fetch(url); return r.text();
  }

  async function initWorkers() {
    const [pako, upng] = await Promise.all([fetchText(PAKO_URL), fetchText(UPNG_URL)]);
    const src = `var window = self;\n${pako}\n${upng}\n${WORKER_FN}`;
    const blob = new Blob([src], { type: "application/javascript" });
    workerUrl = URL.createObjectURL(blob);
    const cores = Math.max(1, (navigator.hardwareConcurrency || 4) - 1);
    const count = Math.min(cores, 6);
    for (let i = 0; i < count; i++) workerPool.push(new Worker(workerUrl));
    isReady = true;
  }

  // Init workers eagerly
  initWorkers().catch(err => console.error("[LDD Compressor] Worker init failed", err));

  // ─── Styles ───────────────────────────────────────────────────────────────────
  const styleEl = document.createElement("style");
  styleEl.textContent = `
    #ldd-comp-backdrop {
      position: fixed; inset: 0; z-index: 2147483645;
      background: rgba(15, 20, 40, 0.6);
      backdrop-filter: blur(4px);
      display: flex; align-items: center; justify-content: center;
      opacity: 0; transition: opacity .18s ease; pointer-events: none;
    }
    #ldd-comp-backdrop.visible { opacity: 1; pointer-events: auto; }
    #ldd-comp-modal {
      width: 500px; max-height: 88vh;
      background: #ffffff; border-radius: 20px;
      box-shadow: 0 24px 64px rgba(0,0,0,.22), 0 4px 16px rgba(0,0,0,.12);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 12px; color: #172033;
      display: flex; flex-direction: column; overflow: hidden;
      transform: scale(.96) translateY(8px); transition: transform .18s ease;
    }
    #ldd-comp-backdrop.visible #ldd-comp-modal { transform: scale(1) translateY(0); }

    #ldd-comp-header {
      padding: 14px 16px 12px; border-bottom: 1.5px solid #f0f0f4;
      display: flex; align-items: center; gap: 10px; flex-shrink: 0;
    }
    #ldd-comp-header img { width: 30px; height: 30px; border-radius: 8px; flex-shrink: 0; }
    .ldd-c-title { font-size: 14px; font-weight: 700; color: #111; flex: 1; }
    .ldd-c-sub   { font-size: 11px; color: #9ca3af; margin-top: 1px; }
    #ldd-comp-close {
      width: 28px; height: 28px; border: none; background: #f3f4f6;
      border-radius: 8px; cursor: pointer; display: flex; align-items: center;
      justify-content: center; color: #6b7280; font-size: 15px;
      transition: background .12s; flex-shrink: 0;
    }
    #ldd-comp-close:hover { background: #fee2e2; color: #dc2626; }

    #ldd-comp-body {
      flex: 1; overflow-y: auto; padding: 16px;
      display: flex; flex-direction: column; gap: 14px;
    }
    #ldd-comp-body::-webkit-scrollbar { width: 4px; }
    #ldd-comp-body::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 4px; }

    /* Drop zone */
    #ldd-c-drop {
      border: 2px dashed #10b981; border-radius: 14px;
      background: #f0fdf4; padding: 28px 16px;
      text-align: center; cursor: pointer; transition: all .15s;
    }
    #ldd-c-drop:hover, #ldd-c-drop.over { border-color: #059669; background: #d1fae5; }
    #ldd-c-drop.disabled { opacity: .5; cursor: not-allowed; }
    .ldd-c-drop-icon  { font-size: 28px; margin-bottom: 6px; }
    .ldd-c-drop-title { font-weight: 700; color: #059669; font-size: 13px; }
    .ldd-c-drop-hint  { color: #9ca3af; font-size: 11px; margin-top: 3px; }

    /* Processing overlay */
    #ldd-c-processing {
      display: none;
      flex-direction: column; align-items: center; justify-content: center;
      gap: 16px; padding: 32px 16px; text-align: center;
    }
    #ldd-c-processing.active { display: flex; }
    .ldd-c-spin-wrap {
      width: 72px; height: 72px; position: relative;
    }
    .ldd-c-spin-logo {
      position: absolute; inset: 0; border-radius: 50%;
      object-fit: cover; width: 100%; height: 100%;
    }
    .ldd-c-spin-ring {
      position: absolute; inset: -4px; border-radius: 50%;
      border: 4px solid #d1fae5;
      border-top-color: #10b981;
      animation: ldd-c-spin 0.9s linear infinite;
      z-index: 1; background: transparent;
    }
    @keyframes ldd-c-spin { to { transform: rotate(360deg); } }
    .ldd-c-proc-file {
      font-size: 12px; font-weight: 600; color: #374151;
      max-width: 300px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .ldd-c-proc-pct { font-size: 22px; font-weight: 800; color: #10b981; }
    .ldd-c-proc-track { width: 100%; height: 4px; background: #e5e7eb; border-radius: 4px; overflow: hidden; }
    .ldd-c-proc-fill  { height: 100%; background: #10b981; border-radius: 4px; width: 0%; transition: width .2s; }

    /* Status bar — keep for compat but hide */
    #ldd-c-status-bar { display: none !important; }

    /* Results */
    #ldd-c-results { display: none; flex-direction: column; gap: 8px; }
    .ldd-c-result-header {
      display: flex; align-items: center; gap: 8px;
      background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 10px 12px;
    }
    .ldd-c-result-icon { font-size: 20px; }
    .ldd-c-result-title { font-size: 13px; font-weight: 700; color: #065f46; }
    .ldd-c-result-sub   { font-size: 11px; color: #10b981; margin-top: 1px; }
    .ldd-c-stat-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; }
    .ldd-c-stat {
      background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px;
      padding: 8px 10px; text-align: center;
    }
    .ldd-c-stat-val { font-size: 14px; font-weight: 800; color: #111; }
    .ldd-c-stat-lbl { font-size: 10px; color: #9ca3af; margin-top: 2px; }

    /* File list */
    #ldd-c-file-list { display: flex; flex-direction: column; gap: 4px; max-height: 180px; overflow-y: auto; }
    #ldd-c-file-list::-webkit-scrollbar { width: 3px; }
    #ldd-c-file-list::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 3px; }
    .ldd-c-file-row {
      display: flex; align-items: center; gap: 8px;
      background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 7px; padding: 5px 8px;
    }
    .ldd-c-file-name { flex: 1; font-size: 11px; color: #374151; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .ldd-c-file-sizes { font-size: 10px; color: #9ca3af; white-space: nowrap; }
    .ldd-c-file-saved { font-size: 10px; color: #10b981; font-weight: 700; white-space: nowrap; }

    /* Footer */
    #ldd-comp-footer {
      padding: 12px 16px; border-top: 1.5px solid #f0f0f4;
      background: #fff; flex-shrink: 0; display: flex; flex-direction: column; gap: 8px;
    }
    .ldd-c-btn-row { display: flex; gap: 8px; }
    .ldd-c-btn {
      flex: 1; padding: 10px; border: none; border-radius: 10px;
      font-size: 12px; font-weight: 700; cursor: pointer;
      display: flex; align-items: center; justify-content: center; gap: 6px;
      transition: background .15s, opacity .15s;
    }
    .ldd-c-btn:disabled { opacity: .4; cursor: not-allowed; }
    .ldd-c-btn-primary { background: #16a34a; color: #fff; }
    .ldd-c-btn-primary:hover:not(:disabled) { background: #15803d; }
    .ldd-c-btn-secondary { background: #f3f4f6; color: #374151; border: 1px solid #e5e7eb; }
    .ldd-c-btn-secondary:hover:not(:disabled) { background: #e5e7eb; }
    .ldd-c-reset-btn {
      background: none; border: none; color: #9ca3af; font-size: 11px; cursor: pointer;
      text-align: center; padding: 2px; transition: color .1s;
    }
    .ldd-c-reset-btn:hover { color: #374151; }

    /* Ready/not ready pill */
    .ldd-c-ready-pill {
      display: inline-flex; align-items: center; gap: 5px;
      font-size: 10px; font-weight: 700; color: #9ca3af;
      background: #f3f4f6; border-radius: 99px; padding: 3px 8px; margin-bottom: 4px;
    }
    .ldd-c-ready-pill.ready { color: #10b981; background: #f0fdf4; }
    .ldd-c-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
    .ldd-c-dot.pulse { animation: ldd-c-pulse 1.5s infinite; }
    @keyframes ldd-c-pulse { 0%,100%{opacity:1} 50%{opacity:.3} }

    .ldd-c-section-label {
      font-size: 10px; font-weight: 700; text-transform: uppercase;
      letter-spacing: .06em; color: #9ca3af; margin-bottom: 6px;
    }
    .ldd-c-divider { border: none; border-top: 1.5px solid #f3f4f6; margin: 0; }
  `;
  document.head.appendChild(styleEl);

  // ─── Build DOM ────────────────────────────────────────────────────────────────
  const backdrop = document.createElement("div");
  backdrop.id = "ldd-comp-backdrop";
  backdrop.innerHTML = `
    <div id="ldd-comp-modal">
      <div id="ldd-comp-header">
        <img src="${LOGO_URL}" alt="LDD" />
        <div>
          <div class="ldd-c-title">Image Compressor</div>
          <div class="ldd-c-sub">PNG/JPG/WebP · 300 DPI · Etsy ZIP splitter</div>
        </div>
        <button id="ldd-comp-close" title="Close">✕</button>
      </div>

      <div id="ldd-comp-body">
        <div style="display:flex;align-items:center;justify-content:space-between">
          <span id="ldd-c-ready-pill" class="ldd-c-ready-pill">
            <span class="ldd-c-dot pulse"></span> Engine warming...
          </span>
        </div>

        <div id="ldd-c-drop">
          <input id="ldd-c-file-input" type="file" accept="image/*,.zip" multiple style="display:none" />
          <div class="ldd-c-drop-icon">🗜️</div>
          <div class="ldd-c-drop-title">Drop images or ZIPs to compress</div>
          <div class="ldd-c-drop-hint">PNG · JPG · WebP · ZIP — 300 DPI metadata injected</div>
        </div>

        <div id="ldd-c-status-bar">
          <div class="ldd-c-status-file" id="ldd-c-status-file">Processing...</div>
          <div class="ldd-c-prog-track"><div class="ldd-c-prog-fill" id="ldd-c-prog-fill"></div></div>
          <div class="ldd-c-prog-label" id="ldd-c-prog-label">0%</div>
        </div>

        <div id="ldd-c-processing">
          <div class="ldd-c-spin-wrap">
            <img class="ldd-c-spin-logo" src="${LOGO_URL}" alt="" />
            <div class="ldd-c-spin-ring"></div>
          </div>
          <div class="ldd-c-proc-pct" id="ldd-c-proc-pct">0%</div>
          <div class="ldd-c-proc-file" id="ldd-c-proc-file">Starting...</div>
          <div class="ldd-c-proc-track" style="width:260px"><div class="ldd-c-proc-fill" id="ldd-c-proc-fill"></div></div>
        </div>

        <div id="ldd-c-results">
          <div class="ldd-c-result-header">
            <div class="ldd-c-result-icon">✅</div>
            <div>
              <div class="ldd-c-result-title">Compression complete!</div>
              <div class="ldd-c-result-sub" id="ldd-c-result-sub"></div>
            </div>
          </div>
          <div class="ldd-c-stat-grid">
            <div class="ldd-c-stat"><div class="ldd-c-stat-val" id="ldd-c-stat-files">—</div><div class="ldd-c-stat-lbl">Files</div></div>
            <div class="ldd-c-stat"><div class="ldd-c-stat-val" id="ldd-c-stat-saved">—</div><div class="ldd-c-stat-lbl">Saved</div></div>
            <div class="ldd-c-stat"><div class="ldd-c-stat-val" id="ldd-c-stat-pct">—</div><div class="ldd-c-stat-lbl">Reduction</div></div>
          </div>
          <div class="ldd-c-section-label">Files</div>
          <div id="ldd-c-file-list"></div>
        </div>
      </div>

      <div id="ldd-comp-footer">
        <div class="ldd-c-btn-row">
          <button class="ldd-c-btn ldd-c-btn-primary" id="ldd-c-dl-zip" disabled>
            <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"/></svg>
            Download Etsy ZIP
          </button>
          <button class="ldd-c-btn ldd-c-btn-secondary" id="ldd-c-dl-ind" disabled>Individual Files</button>
        </div>
        <button class="ldd-c-reset-btn" id="ldd-c-reset">↺ Compress more files</button>
      </div>
    </div>
  `;
  document.body.appendChild(backdrop);

  // ─── Open / Close ─────────────────────────────────────────────────────────────
  function open()  { backdrop.classList.add("visible"); }
  function close() { backdrop.classList.remove("visible"); }
  backdrop.addEventListener("click", e => { if (e.target === backdrop) close(); });
  document.getElementById("ldd-comp-close").addEventListener("click", close);
  document.addEventListener("keydown", e => { if (e.key === "Escape") close(); });
  window.LDDCompressor = { open, close, toggle: () => backdrop.classList.contains("visible") ? close() : open() };

  // ─── Refs ─────────────────────────────────────────────────────────────────────
  const dropZone    = document.getElementById("ldd-c-drop");
  const fileInput   = document.getElementById("ldd-c-file-input");
  const statusBar   = document.getElementById("ldd-c-status-bar");
  const statusFile  = document.getElementById("ldd-c-status-file");
  const progFill    = document.getElementById("ldd-c-prog-fill");
  const progLabel   = document.getElementById("ldd-c-prog-label");
  const processingEl = document.getElementById("ldd-c-processing");
  const procPct     = document.getElementById("ldd-c-proc-pct");
  const procFile    = document.getElementById("ldd-c-proc-file");
  const procFill    = document.getElementById("ldd-c-proc-fill");
  const resultsEl   = document.getElementById("ldd-c-results");
  const resultSub   = document.getElementById("ldd-c-result-sub");
  const statFiles   = document.getElementById("ldd-c-stat-files");
  const statSaved   = document.getElementById("ldd-c-stat-saved");
  const statPct     = document.getElementById("ldd-c-stat-pct");
  const fileList    = document.getElementById("ldd-c-file-list");
  const dlZipBtn    = document.getElementById("ldd-c-dl-zip");
  const dlIndBtn    = document.getElementById("ldd-c-dl-ind");
  const resetBtn    = document.getElementById("ldd-c-reset");
  const readyPill   = document.getElementById("ldd-c-ready-pill");

  // Poll until ready
  const pillInterval = setInterval(() => {
    if (isReady) {
      readyPill.className = "ldd-c-ready-pill ready";
      readyPill.innerHTML = `<span class="ldd-c-dot"></span> Engine ready`;
      clearInterval(pillInterval);
    }
  }, 500);

  // ─── State ────────────────────────────────────────────────────────────────────
  let results = [];
  let processing = false;

  // ─── Upload ───────────────────────────────────────────────────────────────────
  dropZone.addEventListener("click", () => { if (!processing && isReady) fileInput.click(); });
  fileInput.addEventListener("change", e => { handleFiles(e.target.files); fileInput.value = ""; });
  dropZone.addEventListener("dragover",  e => { e.preventDefault(); e.stopPropagation(); if (!processing) dropZone.classList.add("over"); });
  dropZone.addEventListener("dragleave", () => dropZone.classList.remove("over"));
  dropZone.addEventListener("drop", e => { e.preventDefault(); e.stopPropagation(); dropZone.classList.remove("over"); if (!processing && isReady) handleFiles(e.dataTransfer.files); });

  function fmtSize(b) {
    if (b < 1024) return b + " B";
    if (b < 1024*1024) return (b/1024).toFixed(1) + " KB";
    return (b/(1024*1024)).toFixed(2) + " MB";
  }

  async function handleFiles(rawFiles) {
    if (!isReady || processing) return;
    processing = true;
    dropZone.classList.add("disabled");
    statusBar.style.display = "none";
    processingEl.classList.add("active");
    procPct.textContent = "0%";
    procFile.textContent = "Reading files...";
    procFill.style.width = "0%";
    resultsEl.style.display = "none";
    dlZipBtn.disabled = true; dlIndBtn.disabled = true;

    // Flatten input files (images + ZIP contents)
    const workList = [];
    const usedNames = new Map();

    function makeName(raw) {
      const safe = raw.replace(/\\/g, "/").replace(/\//g, "__");
      const key = safe.toLowerCase();
      const n = usedNames.get(key) || 0;
      usedNames.set(key, n + 1);
      if (n === 0) return safe;
      const m = safe.match(/^(.*?)(\.[a-z0-9]+)$/i);
      return m ? `${m[1]}__dup${n+1}${m[2]}` : `${safe}__dup${n+1}`;
    }

    function isImage(name) { return /\.(png|jpe?g|webp)$/i.test(name); }
    function isZip(name)   { return /\.zip$/i.test(name); }
    function guessMime(name) {
      if (/\.jpe?g$/i.test(name)) return "image/jpeg";
      if (/\.webp$/i.test(name)) return "image/webp";
      return "image/png";
    }

    async function scanZip(zipObj, stack, depth) {
      if (depth > 4) return;
      for (const zName of Object.keys(zipObj.files)) {
        const entry = zipObj.files[zName];
        if (!entry || entry.dir || zName.startsWith("__MACOSX/") || zName.endsWith(".DS_Store")) continue;
        if (isImage(zName)) {
          const data = await entry.async("arraybuffer");
          const prefix = stack.length ? stack.join("__") + "__" : "";
          workList.push({ name: makeName(prefix + zName), data, size: data.byteLength, mimeType: guessMime(zName) });
        } else if (isZip(zName)) {
          try {
            const nestedBytes = await entry.async("arraybuffer");
            const nestedZip = new window.JSZip();
            const nestedContent = await nestedZip.loadAsync(nestedBytes);
            await scanZip(nestedContent, [...stack, zName], depth + 1);
          } catch {}
        }
      }
    }

    for (const file of Array.from(rawFiles)) {
      if (isZip(file.name)) {
        const zip = new window.JSZip();
        const content = await zip.loadAsync(file);
        await scanZip(content, [file.name], 0);
      } else if (isImage(file.name) || file.type.startsWith("image/")) {
        const data = await file.arrayBuffer();
        workList.push({ name: makeName(file.name), data, size: file.size, mimeType: file.type || guessMime(file.name) });
      }
    }

    if (!workList.length) {
      processing = false; dropZone.classList.remove("disabled"); statusBar.style.display = "none";
      return;
    }

    // Distribute across workers
    const pool = workerPool;
    const chunks = Array.from({ length: pool.length }, () => []);
    workList.forEach((f, i) => chunks[i % pool.length].push(f));

    const total = workList.length;
    let completed = 0;
    const allResults = [];

    const promises = chunks.map((chunk, i) => {
      if (!chunk.length) return Promise.resolve([]);
      return new Promise((resolve, reject) => {
        const w = pool[i];
        w.onmessage = e => {
          const { type, payload } = e.data;
          if (type === "PROGRESS") {
            const pct = Math.round((completed / total) * 100);
            procFile.textContent = payload.currentFile;
            procPct.textContent = pct + "%";
            procFill.style.width = pct + "%";
            // keep legacy refs in sync
            statusFile.textContent = payload.currentFile;
            progFill.style.width = pct + "%";
            progLabel.textContent = pct + "%";
          } else if (type === "DONE") {
            completed += payload.length;
            progFill.style.width = Math.round((completed / total) * 100) + "%";
            progLabel.textContent = Math.round((completed / total) * 100) + "%";
            resolve(payload);
          }
        };
        w.onerror = reject;
        const transfers = chunk.map(f => f.data);
        w.postMessage({ files: chunk, paletteSize: 256 }, transfers);
      });
    });

    try {
      const batches = await Promise.all(promises);
      results = batches.flat();
      processingEl.classList.remove("active");
      showResults(workList);
    } catch (err) {
      console.error("[LDD Compressor]", err);
      processingEl.classList.remove("active");
      statusFile.textContent = "Error: " + err.message;
    } finally {
      processing = false;
      dropZone.classList.remove("disabled");
    }
  }

  function showResults(originals) {
    const origSize = originals.reduce((s, f) => s + f.size, 0);
    const newSize  = results.reduce((s, r) => s + r.data.length, 0);
    const saved    = origSize - newSize;
    const pct      = origSize > 0 ? Math.round((saved / origSize) * 100) : 0;

    statFiles.textContent = results.length;
    statSaved.textContent = fmtSize(Math.max(0, saved));
    statPct.textContent   = pct + "%";
    resultSub.textContent = `${fmtSize(origSize)} → ${fmtSize(newSize)}`;

    fileList.innerHTML = results.map((r, i) => {
      const orig = originals[i];
      const s = orig ? fmtSize(orig.size) + " → " : "";
      const savedPct = orig ? Math.round((1 - r.data.length / orig.size) * 100) : 0;
      return `<div class="ldd-c-file-row">
        <div class="ldd-c-file-name">${r.name}</div>
        <div class="ldd-c-file-sizes">${s}${fmtSize(r.data.length)}</div>
        <div class="ldd-c-file-saved">${savedPct > 0 ? "-" + savedPct + "%" : "—"}</div>
      </div>`;
    }).join("");

    statusBar.style.display = "none";
    resultsEl.style.display = "flex";
    dlZipBtn.disabled = false; dlIndBtn.disabled = false;
  }

  // ─── Download ─────────────────────────────────────────────────────────────────
  dlZipBtn.addEventListener("click", async () => {
    if (!results.length) return;
    dlZipBtn.disabled = true;
    dlZipBtn.textContent = "Packing...";

    if (results.length === 1) {
      triggerDownload(new Blob([results[0].data], { type: results[0].mimeType }), results[0].name);
      dlZipBtn.disabled = false; dlZipBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"/></svg> Download Etsy ZIP`;
      return;
    }

    // First Fit Decreasing bin pack under Etsy limit
    const sorted = [...results].sort((a, b) => b.data.length - a.data.length);
    const volumes = [];
    for (const f of sorted) {
      let vol = volumes.find(v => v.size + f.data.length <= ETSY_LIMIT);
      if (!vol) { vol = { zip: new window.JSZip(), size: 0 }; volumes.push(vol); }
      vol.zip.file(f.name, f.data); vol.size += f.data.length;
    }

    if (volumes.length === 1) {
      const blob = await volumes[0].zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
      triggerDownload(blob, "Etsy_Optimized_Pack.zip");
    } else {
      const master = new window.JSZip();
      for (let i = 0; i < volumes.length; i++) {
        const blob = await volumes[i].zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
        master.file(`Part${i+1}of${volumes.length}.zip`, blob);
      }
      const masterBlob = await master.generateAsync({ type: "blob", compression: "STORE" });
      triggerDownload(masterBlob, "Etsy_Bundle_All_Parts.zip");
    }

    dlZipBtn.disabled = false;
    dlZipBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"/></svg> Download Etsy ZIP`;
  });

  dlIndBtn.addEventListener("click", () => {
    results.forEach((r, i) => setTimeout(() => triggerDownload(new Blob([r.data], { type: r.mimeType }), r.name), i * 200));
  });

  resetBtn.addEventListener("click", () => {
    results = []; fileList.innerHTML = "";
    resultsEl.style.display = "none"; statusBar.style.display = "none";
    processingEl.classList.remove("active");
    dlZipBtn.disabled = true; dlIndBtn.disabled = true;
    procFill.style.width = "0%"; procPct.textContent = "0%";
    progFill.style.width = "0%"; progLabel.textContent = "0%";
  });

  function triggerDownload(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

})();
