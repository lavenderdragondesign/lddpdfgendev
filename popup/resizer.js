/* LDD Quick Resizer — standalone popup window */
(function () {
  // ─── State ────────────────────────────────────────────────────────────────────
  const DEFAULT_SIZES = [
    { id: "4500-5400", w: 4500, h: 5400, label: "POD Default" },
    { id: "4500-4500", w: 4500, h: 4500, label: "Merch Square" },
    { id: "3000-3000", w: 3000, h: 3000, label: "Etsy Listing" },
    { id: "2400-3000", w: 2400, h: 3000, label: "8×10 Print" },
    { id: "1080-1080", w: 1080, h: 1080, label: "Instagram Post" },
    { id: "1080-1920", w: 1080, h: 1920, label: "Instagram Story" },
    { id: "2048-2048", w: 2048, h: 2048, label: "2K Web" },
    { id: "1200-1200", w: 1200, h: 1200, label: "Web Preview" },
  ];

  let images = [];
  let sizes = DEFAULT_SIZES.map(s => ({ ...s }));
  let selectedIds = new Set(["4500-5400"]);
  let opts = {
    mode: "contain",
    keepTransparency: true,
    sharpen: false,
    convertToPng: false,
    padColor: "#ffffff",
    folderStrategy: "bySize",
  };

  // ─── Refs ─────────────────────────────────────────────────────────────────────
  const dropZone   = document.getElementById("drop-zone");
  const fileInput  = document.getElementById("file-input");
  const imgList    = document.getElementById("img-list");
  const imgCount   = document.getElementById("img-count");
  const sizeGrid   = document.getElementById("size-grid");
  const selCount   = document.getElementById("sel-count");
  const cwEl       = document.getElementById("cw");
  const chEl       = document.getElementById("ch");
  const addCustom  = document.getElementById("add-custom");
  const modeEl     = document.getElementById("mode");
  const padRow     = document.getElementById("pad-row");
  const padColorEl = document.getElementById("pad-color");
  const padHexEl   = document.getElementById("pad-hex");
  const transEl    = document.getElementById("transparency");
  const toPngEl    = document.getElementById("to-png");
  const sharpenEl  = document.getElementById("sharpen");
  const folderEl   = document.getElementById("folder");
  const exportBtn  = document.getElementById("export-btn");
  const progWrap   = document.getElementById("progress-wrap");
  const progBar    = document.getElementById("progress-bar");
  const statusEl   = document.getElementById("status");

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
  dropZone.addEventListener("dragover", e => { e.preventDefault(); dropZone.classList.add("over"); });
  dropZone.addEventListener("dragleave", () => dropZone.classList.remove("over"));
  dropZone.addEventListener("drop", e => { e.preventDefault(); dropZone.classList.remove("over"); addFiles(e.dataTransfer.files); });

  function renderImages() {
    imgCount.textContent = images.length;
    if (!images.length) { imgList.innerHTML = ""; return; }
    imgList.innerHTML = images.map(img => `
      <div class="img-row">
        <img class="img-thumb" src="${img.url}" />
        <div class="img-info">
          <div class="img-name">${img.name}</div>
          <div class="img-dims">${img.width} × ${img.height}</div>
        </div>
        <button class="img-del" data-id="${img.id}" title="Remove">✕</button>
      </div>
    `).join("");
    imgList.querySelectorAll(".img-del").forEach(btn => {
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
      <button class="size-btn${selectedIds.has(s.id) ? " sel" : ""}" data-id="${s.id}" type="button">
        <div class="size-dims">${s.w} × ${s.h}</div>
        <div class="size-lbl">${s.label || "Custom"}</div>
        <span class="size-check">✓</span>
      </button>
    `).join("");
    sizeGrid.querySelectorAll(".size-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.id;
        selectedIds.has(id) ? selectedIds.delete(id) : selectedIds.add(id);
        renderSizes();
        refreshExportBtn();
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
      renderSizes();
      refreshExportBtn();
    }
  });

  // ─── Options ─────────────────────────────────────────────────────────────────
  function togglePadRow() {
    padRow.style.display = (opts.mode === "pad" || !opts.keepTransparency) ? "" : "none";
  }
  modeEl.addEventListener("change",  () => { opts.mode = modeEl.value; togglePadRow(); });
  padColorEl.addEventListener("input", () => { opts.padColor = padColorEl.value; padHexEl.textContent = padColorEl.value; });
  transEl.addEventListener("change",  () => { opts.keepTransparency = transEl.checked; togglePadRow(); });
  toPngEl.addEventListener("change",  () => { opts.convertToPng = toPngEl.checked; });
  sharpenEl.addEventListener("change",() => { opts.sharpen = sharpenEl.checked; });
  folderEl.addEventListener("change", () => { opts.folderStrategy = folderEl.value; });

  function refreshExportBtn() {
    exportBtn.disabled = images.length === 0 || selectedIds.size === 0;
  }

  // ─── Image Processing ─────────────────────────────────────────────────────────
  const PPM_300 = 11811;
  const CRC_TABLE = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      t[n] = c >>> 0;
    }
    return t;
  })();

  function crc32(buf) {
    let c = 0xffffffff >>> 0;
    for (let i = 0; i < buf.length; i++) c = (CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)) >>> 0;
    return (c ^ 0xffffffff) >>> 0;
  }

  async function force300Dpi(blob) {
    const buf = await blob.arrayBuffer();
    const b = new Uint8Array(buf);

    if (blob.type === "image/jpeg" && b[0] === 0xff && b[1] === 0xd8) {
      for (let p = 2; p < Math.min(b.length - 18, 100); p++) {
        if (b[p] === 0xff && b[p+1] === 0xe0 &&
            b[p+6] === 0x4a && b[p+7] === 0x46 && b[p+8] === 0x49 && b[p+9] === 0x46) {
          const out = new Uint8Array(b);
          out[p+13] = 1;
          out[p+14] = 0x01; out[p+15] = 0x2c;
          out[p+16] = 0x01; out[p+17] = 0x2c;
          return new Blob([out], { type: "image/jpeg" });
        }
      }
    } else if (blob.type === "image/png" && b[0] === 0x89 && b[1] === 0x50) {
      // Insert pHYs chunk after IHDR (byte 33)
      const CHUNK_SIZE = 21; // 4(len)+4(type)+9(data)+4(crc)
      const out = new Uint8Array(b.length + CHUNK_SIZE);
      out.set(b.slice(0, 33), 0);

      const cv = new DataView(new ArrayBuffer(CHUNK_SIZE));
      cv.setUint32(0, 9);                                // data length
      cv.setUint8(4, 0x70); cv.setUint8(5, 0x48);       // 'p','H'
      cv.setUint8(6, 0x59); cv.setUint8(7, 0x73);       // 'Y','s'
      cv.setUint32(8, PPM_300);                          // X ppu
      cv.setUint32(12, PPM_300);                         // Y ppu
      cv.setUint8(16, 1);                                // unit = metre
      cv.setUint32(17, crc32(new Uint8Array(cv.buffer.slice(4, 17))));

      out.set(new Uint8Array(cv.buffer), 33);
      out.set(b.slice(33), 33 + CHUNK_SIZE);
      return new Blob([out], { type: "image/png" });
    }
    return blob;
  }

  function getGeom(sw, sh, tw, th, mode) {
    if (mode === "stretch") return { cw: tw, ch: th, dx: 0, dy: 0, dw: tw, dh: th };
    const sr = sw / sh, tr = tw / th;
    let dw = tw, dh = th;
    if (mode === "contain" || mode === "pad") {
      if (sr > tr) dh = tw / sr; else dw = th * sr;
    } else { // cover
      if (sr > tr) dw = th * sr; else dh = tw / sr;
    }
    return { cw: tw, ch: th, dx: (tw - dw) / 2, dy: (th - dh) / 2, dw, dh };
  }

  function applySharpen(ctx, w, h) {
    const id = ctx.getImageData(0, 0, w, h);
    const d = id.data, buf = new Uint8ClampedArray(d);
    const mix = 0.2;
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = (y * w + x) * 4;
        for (let c = 0; c < 3; c++) {
          const v = buf[i+c]*5 +
            buf[((y-1)*w+x)*4+c]*-1 + buf[((y+1)*w+x)*4+c]*-1 +
            buf[(y*w+(x-1))*4+c]*-1 + buf[(y*w+(x+1))*4+c]*-1;
          d[i+c] = Math.min(255, Math.max(0, v * mix + buf[i+c] * (1 - mix)));
        }
      }
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

        if (opts.mode === "pad") {
          ctx.fillStyle = opts.padColor;
          ctx.fillRect(0, 0, g.cw, g.ch);
        } else if (!opts.keepTransparency) {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, g.cw, g.ch);
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(el, g.dx, g.dy, g.dw, g.dh);

        if (opts.sharpen) applySharpen(ctx, g.cw, g.ch);

        const mime = opts.convertToPng ? "image/png" : imgObj.file.type;
        canvas.toBlob(async blob => {
          if (!blob) { reject(new Error("toBlob failed")); return; }
          try { resolve(await force300Dpi(blob)); }
          catch { resolve(blob); }
        }, mime, 0.95);
      };
      el.onerror = () => reject(new Error("Failed to load: " + imgObj.name));
      el.src = imgObj.url;
    });
  }

  function getExt(img) {
    if (opts.convertToPng) return ".png";
    const m = img.name.match(/\.[^.]+$/);
    return m ? m[0] : ".png";
  }

  // ─── Export ───────────────────────────────────────────────────────────────────
  exportBtn.addEventListener("click", async () => {
    const selSizes = sizes.filter(s => selectedIds.has(s.id));
    if (!images.length || !selSizes.length) return;

    exportBtn.disabled = true;
    progWrap.style.display = "";
    progBar.style.width = "0%";
    setStatus("Starting...", "");

    const total = images.length * selSizes.length;
    let done = 0;

    try {
      const zip = new JSZip();

      for (const img of images) {
        for (const size of selSizes) {
          setStatus(`Processing ${img.name} @ ${size.w}×${size.h}`, "");
          progBar.style.width = `${(done / total) * 100}%`;
          await new Promise(r => setTimeout(r, 0)); // yield to UI

          const blob = await processImage(img, size);
          const base = img.name.replace(/\.[^.]+$/, "");
          const ext  = getExt(img);
          const filename = `${base}_${size.w}x${size.h}${ext}`;

          let path = filename;
          if (opts.folderStrategy === "bySize") {
            const folder = `${size.w}x${size.h}${size.label ? "-" + size.label.replace(/[^a-z0-9]/gi, "_") : ""}`;
            path = `${folder}/${filename}`;
          } else if (opts.folderStrategy === "byImage") {
            path = `${base}/${filename}`;
          }

          zip.file(path, blob);
          done++;
        }
      }

      progBar.style.width = "100%";
      setStatus("Compressing ZIP...", "");
      await new Promise(r => setTimeout(r, 0));

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ldd_resized_${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setStatus(`✓ Done — ${images.length} image${images.length !== 1 ? "s" : ""}, ${selSizes.length} size${selSizes.length !== 1 ? "s" : ""}`, "ok");
    } catch (err) {
      console.error("[LDD Resizer]", err);
      setStatus("Error: " + err.message, "err");
    } finally {
      refreshExportBtn();
      setTimeout(() => { progWrap.style.display = "none"; }, 2500);
    }
  });

  function setStatus(msg, cls) {
    statusEl.textContent = msg;
    statusEl.className = cls || "";
  }
})();
