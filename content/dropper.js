(() => {
  "use strict";

  const DEBUG = true;
  const LDD_LOGO_URL = chrome.runtime.getURL("assets/logo.png");

  const AUTO_CLICK_UPLOAD_ALL = true;
  const AUTO_CONFIRM_UPLOAD_DESIGNS = true;
  const UPLOAD_ALL_TIMEOUT_MS = 20000;
  const CONFIRM_TIMEOUT_MS = 20000;
  const SINGLE_LISTING_KEY = "lddDropSingleListing";
  const FOLDER_DROP_ENABLED = true;
  const MAX_FILES_PER_DROP = 2000;
  const SORT_FILES = true;

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const norm = (s) => (s || "").replace(/\s+/g, " ").trim().toLowerCase();
  const log = (...args) => { if (DEBUG) console.log("[LDD Drop]", ...args); };

  function isListingsPage() {
    return window.location.pathname.includes("/app/listings");
  }

  function createController() {
    const dropQueue = [];
    let processingQueue = false;
    let armed = true;
    let active = false;
    let singleListingMode = false;
    let overlay = null;

    chrome.storage.local.get({ [SINGLE_LISTING_KEY]: true }, (result) => {
      singleListingMode = Boolean(result[SINGLE_LISTING_KEY]);
      updateModeToggleUI();
      setStatus(singleListingMode ? "📦 Single Listing ready" : "📂 Multi-Listing ready");
    });

    // Keep singleListingMode in sync whenever the toggle changes it from ui-mods.js
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === "local" && SINGLE_LISTING_KEY in changes) {
        singleListingMode = Boolean(changes[SINGLE_LISTING_KEY].newValue);
        updateModeToggleUI();
        setStatus(singleListingMode ? "📦 Single Listing ready" : "📂 Multi-Listing ready");
        log("Mode updated via storage:", singleListingMode ? "Single Listing" : "Multi-Listing");
      }
    });

    function updateModeToggleUI() {
      const dropLabel = document.getElementById("lddDropLabel");
      if (dropLabel) {
        dropLabel.textContent = singleListingMode ? "📦 Single Listing" : "📂 Multi-Listing";
        dropLabel.style.color = singleListingMode ? "#6d28d9" : "#334155";
      }
    }

    function setMode(single) {
      singleListingMode = single;
      chrome.storage.local.set({ [SINGLE_LISTING_KEY]: single });
      updateModeToggleUI();
      log("Mode:", single ? "Single Listing" : "Multi Listing");
    }

    function setStatus(text) {
      const el = document.getElementById("lddStatus");
      if (el) el.textContent = text;
    }

    function showOverlay(text) {
      setStatus(text);
      if (overlay) overlay.style.display = "flex";
    }

    function hideOverlay() {
      if (overlay) overlay.style.display = "none";
    }

    function hardClick(el) {
      if (!el) return;
      el.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
      el.dispatchEvent(new MouseEvent("mouseup",   { bubbles: true }));
      el.dispatchEvent(new MouseEvent("click",     { bubbles: true }));
    }

    function findMenuButton(labelText) {
      const target = norm(labelText);
      const allBtns = Array.from(document.querySelectorAll("ul li button"));
      return allBtns.find((btn) => {
        const span = btn.querySelector("span");
        return norm(span?.textContent || btn.textContent) === target;
      });
    }

    function findButtonByText(text) {
      const target = norm(text);
      return Array.from(document.querySelectorAll("button")).find((btn) =>
        norm(btn.textContent).includes(target)
      );
    }

    function findUploadModal() {
      return Array.from(document.querySelectorAll("div")).find((div) =>
        div.textContent?.includes("Drag and drop files")
      );
    }

    function findDropTarget(modal) {
      return modal?.querySelector('[class*="border-dashed"]') || modal?.querySelector("div");
    }

    function fireDrop(target, files) {
      if (!target || !files.length) return;
      const dataTransfer = new DataTransfer();
      files.forEach((file) => dataTransfer.items.add(file));
      target.dispatchEvent(new DragEvent("dragenter", { bubbles: true, cancelable: true, dataTransfer }));
      target.dispatchEvent(new DragEvent("dragover", { bubbles: true, cancelable: true, dataTransfer }));
      target.dispatchEvent(new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer }));
    }

    function getButtonText(btn) {
      return norm(btn?.textContent || btn?.innerText || btn?.ariaLabel || btn?.getAttribute?.("aria-label") || "");
    }

    function findButtonsByTextInScope(scope, texts = []) {
      const wanted = texts.map(norm).filter(Boolean);
      return Array.from((scope || document).querySelectorAll("button, [role=button], input[type='button'], input[type='submit']")).filter((el) => {
        const txt = getButtonText(el) || norm(el.value || "");
        return wanted.some((w) => txt.includes(w));
      });
    }

    async function clickSingleListingConfirm(modal) {
      const started = Date.now();
      while (Date.now() - started < UPLOAD_ALL_TIMEOUT_MS) {
        const scopedCandidates = findButtonsByTextInScope(modal, ["upload", "upload file", "upload files", "save"]);
        const globalSubmit = Array.from(document.querySelectorAll('button[type="submit"], input[type="submit"]'));
        const candidates = [...scopedCandidates, ...globalSubmit].filter(Boolean);

        const unique = candidates.filter((el, idx, arr) => arr.indexOf(el) === idx);
        if (unique.length) {
          log("Single listing confirm candidates:", unique.map((btn) => ({
            text: (btn.textContent || btn.value || "").trim(),
            disabled: !!btn.disabled,
            type: btn.getAttribute?.("type") || "",
            cls: btn.className || ""
          })));
        }

        const btn = unique.find((el) => !el.disabled && getComputedStyle(el).display !== "none" && getComputedStyle(el).visibility !== "hidden");
        if (btn) {
          try {
            btn.scrollIntoView({ block: "center", inline: "center" });
          } catch (_e) {}

          try {
            const form = btn.closest?.("form");
            if (form?.requestSubmit) {
              form.requestSubmit(btn.tagName === "BUTTON" || btn.tagName === "INPUT" ? btn : undefined);
              log("Single listing confirm via form.requestSubmit()");
              await sleep(150);
            }
          } catch (e) {
            log("requestSubmit failed:", e);
          }

          try {
            btn.focus?.();
            btn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true, composed: true }));
            btn.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, cancelable: true, composed: true }));
            btn.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true, composed: true }));
            btn.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, cancelable: true, composed: true }));
            btn.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, composed: true }));
            hardClick(btn);
            log("Single listing confirm clicked:", (btn.textContent || btn.value || "").trim());
            return true;
          } catch (e) {
            log("Single listing confirm click failed:", e);
          }
        }
        await sleep(150);
      }
      log("Single listing confirm button not found or not clickable before timeout.");
      return false;
    }

    async function expandDrop(event) {
      const files = Array.from(event.dataTransfer?.files || []);
      if (!FOLDER_DROP_ENABLED) return files;

      const items = Array.from(event.dataTransfer?.items || []);
      const out = [];

      async function walk(entry, path = "") {
        if (!entry || out.length >= MAX_FILES_PER_DROP) return;
        if (entry.isFile) {
          await new Promise((resolve) => {
            entry.file((file) => {
              try {
                out.push(new File([file], path + file.name, { type: file.type, lastModified: file.lastModified }));
              } catch (_e) { out.push(file); }
              resolve();
            }, () => resolve());
          });
          return;
        }
        if (entry.isDirectory) {
          const reader = entry.createReader();
          while (out.length < MAX_FILES_PER_DROP) {
            const entries = await new Promise((resolve) => reader.readEntries(resolve, () => resolve([])));
            if (!entries.length) break;
            for (const child of entries) {
              await walk(child, `${path}${entry.name}/`);
              if (out.length >= MAX_FILES_PER_DROP) break;
            }
          }
        }
      }

      const entries = items.map((item) => item.webkitGetAsEntry?.()).filter(Boolean);
      for (const entry of entries) {
        await walk(entry);
        if (out.length >= MAX_FILES_PER_DROP) break;
      }

      if (SORT_FILES) out.sort((a, b) => a.name.localeCompare(b.name));
      await sleep(300);
      return out.length ? out : files;
    }


    // ── Rename panel ────────────────────────────────────────────────────────
        // Number position mirrors which field is filled:
        // prefix only → N + base, suffix only → base + N, both → N + base + N, neither → base + N
        function buildName(prefix, base, suffix, i) {
          const n = String(i + 1);
          if (prefix && suffix)  return n + prefix + base + suffix + n;
          if (prefix && !suffix) return n + prefix + base;
          if (!prefix && suffix) return base + suffix + n;
          return base + n;
        }

    function showRenamePanel(files) {
      return new Promise((resolve) => {
        if (!overlay) { resolve(files); return; }

        overlay.style.display = "flex";
        overlay.style.pointerEvents = "auto";

        const card = overlay.querySelector("div");
        const original = card.innerHTML;

        const MAX_INDIVIDUAL = 80;
        const showIndividual = files.length <= MAX_INDIVIDUAL;

        const splitName = (name) => {
          const dot = name.lastIndexOf(".");
          return dot > 0 ? [name.slice(0, dot), name.slice(dot)] : [name, ""];
        };
        // Strip any folder prefix (e.g. "folder/file.png" → "file.png")
        const stripFolder = (name) => name.split("/").pop().split("\\").pop();
        const names = files.map(f => { const [base, ext] = splitName(stripFolder(f.name)); return { base, ext }; });

        // Preview state
        let previewIdx = 0;
        const imageFiles = files.filter(f => f.type.startsWith("image/"));

        function loadPreview(idx) {
          const img = document.getElementById("lddRenPreviewImg");
          const counter = document.getElementById("lddRenPreviewCounter");
          const prevBtn = document.getElementById("lddRenPrev");
          const nextBtn = document.getElementById("lddRenNext");
          if (!img || !imageFiles.length) return;
          const file = imageFiles[idx];
          const url = URL.createObjectURL(file);
          img.onload = () => URL.revokeObjectURL(url);
          img.src = url;
          if (counter) counter.textContent = `${idx + 1} / ${imageFiles.length}`;
          if (prevBtn) prevBtn.style.opacity = idx === 0 ? "0.3" : "1";
          if (nextBtn) nextBtn.style.opacity = idx === imageFiles.length - 1 ? "0.3" : "1";
          // Highlight the matching file row
          if (showIndividual) {
            const fileIdx = files.indexOf(file);
            const inp = document.getElementById(`lddRenFile_${fileIdx}`);
            if (inp) inp.scrollIntoView({ block: "nearest" });
          }
        }

        // Track whether user has erased — if so, applyBulk uses main/counter not original names
        let erased = false;

        function getCounter(i) {
          // 1-based numeric counter
          return String(i + 1);
        }

        function applyBulk() {
          const prefix = document.getElementById("lddRenPrefix")?.value || "";
          const suffix = document.getElementById("lddRenSuffix")?.value || "";
          const main   = document.getElementById("lddRenMain")?.value || "";
          if (!showIndividual) return;
          names.forEach((n, i) => {
            const inp = document.getElementById(`lddRenFile_${i}`);
            if (!inp) return;
            const autoNum = document.getElementById("lddRenAutoNum")?.checked;
            const base = (erased || main) ? main : n.base;
            inp.value = autoNum ? buildName(prefix, base, suffix, i) : prefix + base + suffix;
          });
        }

        function confirm() {
          const renamed = files.map((f, i) => {
            let newBase;
            if (showIndividual) {
              const autoNumInd = document.getElementById("lddRenAutoNum")?.checked;
              const baseVal = (document.getElementById(`lddRenFile_${i}`)?.value ?? "").trim();
              newBase = autoNumInd ? baseVal + "_" + String(i + 1) : baseVal;
            } else {
              const prefix = document.getElementById("lddRenPrefix")?.value || "";
              const suffix = document.getElementById("lddRenSuffix")?.value || "";
              const main   = document.getElementById("lddRenMain")?.value || "";
              const autoNum = document.getElementById("lddRenAutoNum")?.checked;
              const base = (erased || main) ? main : names[i].base;
              newBase = autoNum ? buildName(prefix, base, suffix, i) : prefix + base + suffix;
            }
            const newName = newBase + names[i].ext;
            return newName === f.name ? f : new File([f], newName, { type: f.type, lastModified: f.lastModified });
          });
          card.innerHTML = original;
          overlay.style.pointerEvents = "none";
          resolve(renamed);
        }

        function skip() {
          card.innerHTML = original;
          overlay.style.pointerEvents = "none";
          resolve(files);
        }

        const hasImages = imageFiles.length > 0;
        const navBtn = (id, label) =>
          `<button id="${id}" style="background:rgba(0,0,0,0.45);border:none;color:#fff;font-size:16px;cursor:pointer;width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;line-height:1;">${label}</button>`;

        const previewBlock = hasImages ? `
          <div style="width:100%;position:relative;border-radius:12px;overflow:hidden;background:#f1f5f9;aspect-ratio:4/3;display:flex;align-items:center;justify-content:center;">
            <img id="lddRenPreviewImg" style="max-width:100%;max-height:100%;object-fit:contain;display:block;" />
            ${imageFiles.length > 1 ? `
            <div style="position:absolute;bottom:6px;left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:6px;">
              ${navBtn("lddRenPrev","‹")}
              <span id="lddRenPreviewCounter" style="font-size:10px;font-weight:700;color:#fff;background:rgba(0,0,0,0.45);padding:2px 7px;border-radius:99px;"></span>
              ${navBtn("lddRenNext","›")}
            </div>` : ""}
          </div>` : "";

        const fileRows = showIndividual
          ? names.map((n, i) => `
              <div style="display:flex;align-items:center;gap:6px;min-width:0;">
                <span style="font-size:10px;color:#94a3b8;flex-shrink:0;width:22px;text-align:right;">${i+1}.</span>
                <input id="lddRenFile_${i}" value="${n.base.replace(/"/g,"&quot;")}"
                  style="flex:1;min-width:0;font-size:11px;padding:3px 6px;border:1px solid #e2e8f0;border-radius:6px;outline:none;font-family:inherit;color:#1e2a40;" />
                <span style="font-size:10px;color:#94a3b8;flex-shrink:0;">${n.ext}</span>
              </div>`).join("")
          : `<p style="font-size:11px;color:#94a3b8;text-align:center;margin:0;">${files.length} files — prefix/suffix applied to all</p>`;

        card.innerHTML = `
          <div style="display:flex;align-items:center;gap:10px;width:100%;">
            <img src="${LDD_LOGO_URL}" style="width:32px;height:32px;border-radius:8px;flex-shrink:0;" />
            <div style="flex:1;">
              <div style="font-weight:800;font-size:14px;color:#1e2a40;">Rename Files</div>
              <div style="font-size:11px;color:#94a3b8;">${files.length} file${files.length!==1?"s":""} ready</div>
            </div>
            <button id="lddRenSkip" style="border:none;background:none;font-size:16px;color:#94a3b8;cursor:pointer;padding:0;width:24px;height:24px;display:flex;align-items:center;justify-content:center;border-radius:6px;">✕</button>
          </div>

          ${previewBlock}

          <div style="display:flex;flex-direction:column;gap:3px;width:100%;">
            <label style="font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em;">Main keyword <span style="font-weight:400;text-transform:none;letter-spacing:0;">(replaces original name)</span></label>
            <input id="lddRenMain" placeholder="e.g. bunny → bunny (or bunny1, bunny2 with prefix/suffix)"
              style="font-size:12px;padding:5px 8px;border:1px solid #c4b5fd;border-radius:8px;outline:none;font-family:inherit;color:#1e2a40;width:100%;box-sizing:border-box;background:#faf5ff;" />
          </div>

          <div style="display:flex;gap:8px;width:100%;">
            <div style="flex:1;display:flex;flex-direction:column;gap:3px;">
              <label style="font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em;">Prefix</label>
              <input id="lddRenPrefix" placeholder="e.g. Summer_"
                style="font-size:12px;padding:5px 8px;border:1px solid #e2e8f0;border-radius:8px;outline:none;font-family:inherit;color:#1e2a40;width:100%;box-sizing:border-box;" />
            </div>
            <div style="flex:1;display:flex;flex-direction:column;gap:3px;">
              <label style="font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em;">Suffix</label>
              <input id="lddRenSuffix" placeholder="e.g. _v2"
                style="font-size:12px;padding:5px 8px;border:1px solid #e2e8f0;border-radius:8px;outline:none;font-family:inherit;color:#1e2a40;width:100%;box-sizing:border-box;" />
            </div>
          </div>

          <label style="display:flex;align-items:center;gap:7px;cursor:pointer;width:100%;font-size:11px;font-weight:600;color:#334155;">
            <input type="checkbox" id="lddRenAutoNum" style="width:14px;height:14px;accent-color:#6d5efc;cursor:pointer;" />
            Auto-number files <span style="font-weight:400;color:#94a3b8;">( adds _1, _2, _3 … at end )</span>
          </label>

          ${showIndividual ? `
          <div style="width:100%;max-height:160px;overflow-y:auto;display:flex;flex-direction:column;gap:5px;padding-right:2px;">
            ${fileRows}
          </div>` : fileRows}

          <div style="display:flex;gap:8px;width:100%;margin-top:2px;">
            ${showIndividual ? `<button id="lddRenErase" style="flex:1;padding:7px;font-size:12px;font-weight:700;border:1px solid #fecaca;border-radius:10px;background:#fff5f5;color:#ef4444;cursor:pointer;">Erase all</button>` : ""}
            ${showIndividual ? `<button id="lddRenApply" style="flex:1;padding:7px;font-size:12px;font-weight:700;border:1px solid #e2e8f0;border-radius:10px;background:#f8fafc;color:#334155;cursor:pointer;">Apply to all</button>` : ""}
            <button id="lddRenSkipRename" style="flex:1;padding:7px;font-size:12px;font-weight:700;border:1px solid #e2e8f0;border-radius:10px;background:#f8fafc;color:#334155;cursor:pointer;">Skip rename</button>
            <button id="lddRenConfirm" style="flex:2;padding:7px;font-size:12px;font-weight:700;border:none;border-radius:10px;background:#6d5efc;color:#fff;cursor:pointer;">Upload ➜</button>
          </div>
        `;

        // Wire buttons
        document.getElementById("lddRenSkip")?.addEventListener("click", skip);
        document.getElementById("lddRenSkipRename")?.addEventListener("click", skip);
        document.getElementById("lddRenErase")?.addEventListener("click", () => {
          erased = true;
          names.forEach((_, i) => {
            const inp = document.getElementById(`lddRenFile_${i}`);
            if (inp) inp.value = "";
          });
          const prefix = document.getElementById("lddRenPrefix");
          const suffix = document.getElementById("lddRenSuffix");
          const main   = document.getElementById("lddRenMain");
          if (prefix) prefix.value = "";
          if (suffix) suffix.value = "";
          if (main)   main.value   = "";
        });
        document.getElementById("lddRenApply")?.addEventListener("click", applyBulk);
        document.getElementById("lddRenConfirm")?.addEventListener("click", confirm);
        ["lddRenPrefix","lddRenSuffix","lddRenMain"].forEach(id => {
          document.getElementById(id)?.addEventListener("input", applyBulk);
        });
        document.getElementById("lddRenAutoNum")?.addEventListener("change", applyBulk);

        // Preview nav
        if (hasImages) {
          loadPreview(0);
          document.getElementById("lddRenPrev")?.addEventListener("click", () => {
            if (previewIdx > 0) loadPreview(--previewIdx);
          });
          document.getElementById("lddRenNext")?.addEventListener("click", () => {
            if (previewIdx < imageFiles.length - 1) loadPreview(++previewIdx);
          });
        }
      });
    }
    // ── End rename panel ─────────────────────────────────────────────────────

    async function processQueue() {
      if (processingQueue || !active) return;
      processingQueue = true;
      armed = false;

      while (active && dropQueue.length) {
        const files = dropQueue.shift();
        showOverlay(`Uploading ${files.length} file${files.length !== 1 ? "s" : ""} — ${dropQueue.length} queued`);

        const uploadBtn = findButtonByText("Upload");
        if (uploadBtn) hardClick(uploadBtn);

        // Always log what menu items exist so we can identify single listing option
        let menuBtn = null;
        for (let i = 0; i < 40; i++) {
          const allMenuBtns = Array.from(document.querySelectorAll("ul li button"));
          if (allMenuBtns.length) {
            log("Available menu buttons:", allMenuBtns.map(b => (b.querySelector("span")?.textContent || b.textContent).trim()));
          }
          menuBtn = singleListingMode
            ? findMenuButton("Upload Files to Single Listing")
            : findMenuButton("Upload Files");
          if (menuBtn) break;
          await sleep(100);
        }

        if (!menuBtn) {
          // In single listing mode, fall back to "Upload Files" if dedicated item not found
          // and log so the user can identify the correct label
          if (singleListingMode) {
            log("Single Listing menu item not found — falling back to Upload Files. Check console for correct label.");
            menuBtn = findMenuButton("Upload Files");
          }
          if (!menuBtn) {
            log("No upload menu button found at all.");
            continue;
          }
        }
        log("Clicking menu item:", (menuBtn.querySelector("span")?.textContent || menuBtn.textContent).trim(), "| singleListingMode:", singleListingMode);
        hardClick(menuBtn);

        let modal;
        for (let i = 0; i < 50; i++) {
          modal = findUploadModal();
          if (modal) break;
          await sleep(100);
        }
        if (!modal) continue;

        fireDrop(findDropTarget(modal), files);

        if (singleListingMode) {
          await sleep(350);
          await clickSingleListingConfirm(modal);
        } else {
          if (AUTO_CLICK_UPLOAD_ALL) {
            const t = Date.now();
            while (Date.now() - t < UPLOAD_ALL_TIMEOUT_MS) {
              const btn = findButtonByText("Upload All");
              if (btn && !btn.disabled) { hardClick(btn); break; }
              await sleep(100);
            }
          }

          if (AUTO_CONFIRM_UPLOAD_DESIGNS && !singleListingMode) {
            const t = Date.now();
            while (Date.now() - t < CONFIRM_TIMEOUT_MS) {
              const btn = findButtonByText("Upload designs");
              if (btn && !btn.disabled) { hardClick(btn); break; }
              await sleep(100);
            }
          }
        }

        await sleep(1000);
      }

      setStatus("✅ Upload complete!");
      await sleep(800);
      hideOverlay();
      processingQueue = false;
      armed = true;
    }

    function onDragOver(event) {
      if (!active || !isListingsPage()) return;
      if (event.dataTransfer?.types?.includes("Files")) {
        event.preventDefault();
        showOverlay(singleListingMode ? "Drop to upload to Single Listing" : "Drop to upload (Multi-Listing)");
        updateModeToggleUI();
      }
    }

    async function onDrop(event) {
      if (!active || !armed || !isListingsPage()) return;
      if (!event.dataTransfer?.types?.includes("Files")) return;
      event.preventDefault();
      event.stopPropagation();
      const rawFiles = await expandDrop(event);
      if (!rawFiles.length) return;
      const files = await showRenamePanel(rawFiles);
      if (!files.length) return;
      dropQueue.push(files);
      log("Queued batch:", files.length);
      processQueue();
    }

    function createOverlay() {
      overlay?.remove();
      overlay = document.createElement("div");
      overlay.style.cssText = [
        "position:fixed;inset:0;z-index:999999;",
        "display:none;align-items:center;justify-content:center;",
        "background:rgba(15,20,40,0.35);backdrop-filter:blur(3px);pointer-events:none;",
        "font-family:system-ui,sans-serif;"
      ].join("");

      const card = document.createElement("div");
      card.style.cssText = [
        "width:min(340px,90vw);border-radius:22px;padding:24px 22px 20px;",
        "background:#fff;border:1px solid #e2e8f0;",
        "box-shadow:0 24px 64px rgba(26,38,67,0.22);pointer-events:auto;",
        "display:flex;flex-direction:column;align-items:center;gap:14px;"
      ].join("");

      // Logo + title row
      const header = document.createElement("div");
      header.style.cssText = "display:flex;align-items:center;gap:10px;width:100%;";
      const logo = document.createElement("img");
      logo.src = LDD_LOGO_URL;
      logo.style.cssText = "width:32px;height:32px;border-radius:8px;flex-shrink:0;";
      const titleWrap = document.createElement("div");
      titleWrap.style.cssText = "flex:1;";
      titleWrap.innerHTML = `<div style="font-weight:800;font-size:14px;color:#1e2a40;line-height:1.2;">LDD Upload Assist</div><div id="lddStatus" style="font-size:11px;color:#94a3b8;margin-top:1px;"></div>`;
      const closeBtn = document.createElement("button");
      closeBtn.textContent = "✕";
      closeBtn.style.cssText = "margin-left:auto;padding:0;border:none;background:none;font-size:16px;color:#94a3b8;cursor:pointer;line-height:1;flex-shrink:0;width:24px;height:24px;display:flex;align-items:center;justify-content:center;border-radius:6px;transition:background .12s,color .12s;";
      closeBtn.addEventListener("mouseover", () => { closeBtn.style.background = "#f1f5f9"; closeBtn.style.color = "#1e2a40"; });
      closeBtn.addEventListener("mouseout",  () => { closeBtn.style.background = "none";    closeBtn.style.color = "#94a3b8"; });
      closeBtn.addEventListener("click", () => hideOverlay());
      header.appendChild(logo);
      header.appendChild(titleWrap);
      header.appendChild(closeBtn);
      card.appendChild(header);

      // Drop zone
      const dropZone = document.createElement("div");
      dropZone.id = "lddDropZone";
      dropZone.style.cssText = [
        "width:100%;border:2px dashed #cbd5e1;border-radius:16px;",
        "padding:26px 16px;text-align:center;",
        "transition:border-color .15s,background .15s;",
        "background:#f8fafc;pointer-events:auto;box-sizing:border-box;"
      ].join("");

      const arrow = document.createElement("div");
      arrow.style.cssText = "font-size:32px;margin-bottom:10px;line-height:1;";
      arrow.textContent = "⬇️";

      const modeLabel = document.createElement("div");
      modeLabel.id = "lddDropLabel";
      modeLabel.style.cssText = "font-size:14px;font-weight:800;color:#334155;margin-bottom:4px;";

      const subLabel = document.createElement("div");
      subLabel.style.cssText = "font-size:11px;color:#94a3b8;";
      subLabel.textContent = "Files & folders supported";

      dropZone.appendChild(arrow);
      dropZone.appendChild(modeLabel);
      dropZone.appendChild(subLabel);
      card.appendChild(dropZone);
      overlay.appendChild(card);
      document.documentElement.appendChild(overlay);

      // Drop zone events
      let enterCount = 0;
      dropZone.addEventListener("dragenter", (e) => {
        e.preventDefault(); e.stopPropagation();
        if (++enterCount === 1) {
          dropZone.style.borderColor = "#6d5efc";
          dropZone.style.background  = "rgba(109,94,252,0.06)";
        }
      });
      dropZone.addEventListener("dragover",  (e) => { e.preventDefault(); e.stopPropagation(); });
      dropZone.addEventListener("dragleave", (e) => {
        e.stopPropagation();
        if (--enterCount <= 0) {
          enterCount = 0;
          dropZone.style.borderColor = "#cbd5e1";
          dropZone.style.background  = "#f8fafc";
        }
      });
      dropZone.addEventListener("drop", (e) => {
        e.preventDefault(); e.stopPropagation();
        enterCount = 0;
        dropZone.style.borderColor = "#cbd5e1";
        dropZone.style.background  = "#f8fafc";
        onDrop(e);
      });

      updateModeToggleUI();
    }

    function start() {
      if (active) return;
      active = true;
      armed = true;
      createOverlay();
      window.addEventListener("dragover", onDragOver, true);
      window.addEventListener("drop", onDrop, true);
      log("LDD Multi-Drop uploader active");
    }

    function stop() {
      if (!active) return;
      active = false;
      armed = true;
      dropQueue.length = 0;
      processingQueue = false;
      window.removeEventListener("dragover", onDragOver, true);
      window.removeEventListener("drop", onDrop, true);
      hideOverlay();
      overlay?.remove();
      overlay = null;
    }

    return { start, stop };
  }

  const state = { enabled: false, controller: null };

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

  window.LDDDropper = { enable, disable };
})();
