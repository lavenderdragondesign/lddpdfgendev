/* LDD PDF Generator — full canvas editor */
(function () {
  'use strict';

  // ── Constants ────────────────────────────────────────────────────────────────
  const LOGO_URL   = chrome.runtime.getURL('assets/logo.png');
  const WORKER_URL = chrome.runtime.getURL('libs/pdf.worker.min.mjs');

  const PAPER = {
    letter: { w: 816, h: 1056, label: 'US Letter' },
    a4:     { w: 794, h: 1123, label: 'A4' },
  };
  const SNAP_SIZE   = 8;
  const GRID_SIZE   = 8;
  const FONT_FAMILIES = ['Inter','Arial','Helvetica','Verdana','Georgia','Times New Roman','Courier New','Trebuchet MS','Impact'];

  // ── State ────────────────────────────────────────────────────────────────────
  let paper     = 'letter';
  let zoom      = 1.0;
  let snapOn    = true;
  let guidesOn  = false;
  let blocks    = [];       // array of block objects
  let selId     = null;     // selected block id
  let undoStack = [];
  let redoStack = [];
  let idSeq     = 1;

  // Drag / resize tracking
  let dragState  = null;
  let resizeState = null;

  // ── DOM refs ─────────────────────────────────────────────────────────────────
  const canvasArea  = document.getElementById('canvas-area');
  const canvasWrap  = document.getElementById('canvas-wrap');
  const layerList   = document.getElementById('layer-list');
  const propsBody   = document.getElementById('props-body');
  const propsEmpty  = document.getElementById('props-empty');
  const tbZoom      = document.getElementById('tb-zoom');
  const zoomInfo    = document.getElementById('zoom-info');
  const tbPaper     = document.getElementById('tb-paper');
  const qrScratch   = document.getElementById('qr-scratch');

  document.getElementById('tb-logo').src = LOGO_URL;

  // ── Helpers ──────────────────────────────────────────────────────────────────
  function uid() { return 'b' + (idSeq++); }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function snap(v) { return snapOn ? Math.round(v / SNAP_SIZE) * SNAP_SIZE : v; }
  function px(v)   { return v + 'px'; }

  function saveUndo() {
    undoStack.push(JSON.stringify(blocks));
    if (undoStack.length > 60) undoStack.shift();
    redoStack = [];
  }

  function applyBlocks(arr) { blocks = arr; renderAll(); selectBlock(selId && blocks.find(b => b.id === selId) ? selId : null); }

  // ── Default block factory ────────────────────────────────────────────────────
  function makeBlock(type, overrides = {}) {
    const P = PAPER[paper];
    const defaults = {
      id: uid(), type, visible: true,
      x: snap(P.w / 2 - 150), y: snap(80),
      w: 300, h: 60,
      // text props
      content: '',
      fontSize: 20, fontFamily: 'Inter', fontWeight: 'normal', fontStyle: 'normal',
      textDecoration: 'none', textAlign: 'center', color: '#172033',
      bgColor: 'transparent', borderRadius: 0, padding: 8, lineHeight: 1.35,
      // button-specific
      url: '', btnColor: '#3b82f6', btnTextColor: '#ffffff',
      // qr
      qrUrl: '', qrFg: '#000000', qrBg: '#ffffff',
      // image
      imgSrc: null,
      // divider
      divColor: '#e5e7eb', divThickness: 2,
      // z-order (higher = on top)
      z: blocks.length,
    };
    const block = { ...defaults, ...overrides };

    // Type-specific defaults
    if (type === 'text' && !overrides.content)   block.content = 'Your text here';
    if (type === 'button') {
      block.content = overrides.content || 'Download Your Files';
      block.w = 280; block.h = 56;
      block.bgColor = block.btnColor; block.color = block.btnTextColor;
      block.borderRadius = 12; block.fontWeight = 'bold';
    }
    if (type === 'qr')     { block.w = 120; block.h = 120; block.content = ''; }
    if (type === 'image')  { block.w = 200; block.h = 120; }
    if (type === 'divider'){ block.w = P.w - 80; block.h = 16; block.x = 40; }
    return block;
  }

  // ── Preset layouts ───────────────────────────────────────────────────────────
  function loadPreset(name) {
    saveUndo();
    const P = PAPER[paper];
    const cx = P.w / 2;

    if (name === 'digital-download') {
      blocks = [
        makeBlock('text',    { id: uid(), content: 'Your Digital Files Are Ready', x: 80, y: 60, w: P.w-160, h: 70, fontSize: 36, fontWeight: 'bold', color: '#7c3aed', textAlign: 'center' }),
        makeBlock('text',    { id: uid(), content: 'Thank you for your purchase! 🎉', x: 100, y: 150, w: P.w-200, h: 44, fontSize: 22, color: '#475569', textAlign: 'center' }),
        makeBlock('divider', { id: uid(), x: 80, y: 208, w: P.w-160, h: 12, divColor: '#e2d9f3' }),
        makeBlock('text',    { id: uid(), content: 'Click the button below to access your digital files. Save this PDF so you can return anytime.', x: 80, y: 232, w: P.w-160, h: 80, fontSize: 18, color: '#64748b', textAlign: 'center' }),
        makeBlock('button',  { id: uid(), content: 'Download Your Files', x: cx-160, y: 330, w: 320, h: 60, btnColor: '#7c3aed', btnTextColor: '#fff', fontSize: 20, borderRadius: 14 }),
        makeBlock('text',    { id: uid(), content: '✨ SPECIAL OFFER  ·  Use code SAVE20 for 20% off your next purchase', x: 60, y: 420, w: P.w-120, h: 70, fontSize: 17, color: '#fff', bgColor: '#f97316', borderRadius: 14, textAlign: 'center', padding: 14 }),
        makeBlock('text',    { id: uid(), content: '© 2026 Your Store Name. All rights reserved.', x: 80, y: P.h-60, w: P.w-160, h: 36, fontSize: 12, color: '#94a3b8', textAlign: 'center' }),
      ];
    } else if (name === 'minimal') {
      blocks = [
        makeBlock('text',    { id: uid(), content: 'Download Ready', x: 80, y: 80, w: P.w-160, h: 80, fontSize: 48, fontWeight: 'bold', color: '#0f172a', textAlign: 'center' }),
        makeBlock('divider', { id: uid(), x: cx-80, y: 180, w: 160, h: 8, divColor: '#3b82f6', divThickness: 3 }),
        makeBlock('text',    { id: uid(), content: 'Your files are ready. Click below to access them instantly.', x: 100, y: 206, w: P.w-200, h: 56, fontSize: 18, color: '#64748b', textAlign: 'center' }),
        makeBlock('button',  { id: uid(), content: 'Get My Files →', x: cx-140, y: 286, w: 280, h: 56, btnColor: '#0f172a', btnTextColor: '#fff', borderRadius: 8 }),
        makeBlock('text',    { id: uid(), content: '© Your Store', x: 80, y: P.h-52, w: P.w-160, h: 32, fontSize: 11, color: '#cbd5e1', textAlign: 'center' }),
      ];
    } else if (name === 'blank') {
      blocks = [];
    }
    blocks.forEach((b, i) => { b.z = i; });
    idSeq = blocks.length + 1;
    renderAll();
    selectBlock(null);
  }

  // ── Render engine ─────────────────────────────────────────────────────────────
  function renderAll() {
    const P = PAPER[paper];
    canvasWrap.style.width  = px(P.w * zoom);
    canvasWrap.style.height = px(P.h * zoom);
    tbZoom.textContent  = Math.round(zoom * 100) + '%';
    zoomInfo.textContent = Math.round(zoom * 100) + '%';

    // Remove all block elements, keep guides
    canvasWrap.querySelectorAll('.block').forEach(el => el.remove());

    const sorted = [...blocks].sort((a, b) => a.z - b.z);
    sorted.forEach(b => {
      if (!document.getElementById('block-' + b.id)) renderBlock(b);
    });

    renderLayers();
    renderGuides();
  }

  function renderBlock(b) {
    // Remove old el if exists
    const old = document.getElementById('block-' + b.id);
    if (old) old.remove();

    if (!b.visible) {
      // still create it but hidden for layer panel purposes
    }

    const el = document.createElement('div');
    el.id         = 'block-' + b.id;
    el.className  = 'block' + (b.id === selId ? ' sel' : '') + (!b.visible ? ' hidden-block' : '');
    el.dataset.id = b.id;
    el.style.cssText = `
      left:${px(b.x * zoom)}; top:${px(b.y * zoom)};
      width:${px(b.w * zoom)}; height:${px(b.h * zoom)};
      z-index:${b.z + 1};
    `;

    // Inner content
    if (b.type === 'text') {
      const inner = document.createElement('div');
      inner.className = 'block-text';
      inner.style.cssText = `
        font-size:${b.fontSize * zoom}px; font-family:${b.fontFamily};
        font-weight:${b.fontWeight}; font-style:${b.fontStyle};
        text-decoration:${b.textDecoration}; text-align:${b.textAlign};
        color:${b.color}; background:${b.bgColor};
        border-radius:${b.borderRadius * zoom}px;
        padding:${b.padding * zoom}px; line-height:${b.lineHeight};
        pointer-events:none;
      `;
      inner.textContent = b.content;
      el.appendChild(inner);
    } else if (b.type === 'button') {
      const inner = document.createElement('div');
      inner.className = 'block-btn';
      inner.style.cssText = `
        background:${b.btnColor}; color:${b.btnTextColor};
        font-size:${b.fontSize * zoom}px; font-family:${b.fontFamily};
        font-weight:${b.fontWeight}; border-radius:${b.borderRadius * zoom}px;
        pointer-events:none;
      `;
      inner.textContent = b.content;
      el.appendChild(inner);
    } else if (b.type === 'image') {
      if (b.imgSrc) {
        const img = document.createElement('img');
        img.className = 'block-img'; img.src = b.imgSrc;
        img.style.borderRadius = px(b.borderRadius * zoom);
        img.draggable = false;
        el.appendChild(img);
      } else {
        const ph = document.createElement('div');
        ph.style.cssText = `width:100%;height:100%;background:#1e293b;display:flex;align-items:center;justify-content:center;color:#475569;font-size:${11*zoom}px;border-radius:${b.borderRadius*zoom}px;`;
        ph.textContent = '🖼️ Click to upload image';
        el.appendChild(ph);
        el.addEventListener('dblclick', () => {
          document.getElementById('img-upload-input').dataset.blockId = b.id;
          document.getElementById('img-upload-input').click();
        });
      }
    } else if (b.type === 'qr') {
      const c = document.createElement('canvas');
      c.className = 'block-qr';
      c.style.width = '100%'; c.style.height = '100%';
      el.appendChild(c);
      try {
        new QRious({ element: c, value: b.qrUrl || 'https://example.com', size: Math.round(b.w * zoom), foreground: b.qrFg, background: b.qrBg });
      } catch(e) {}
    } else if (b.type === 'divider') {
      const inner = document.createElement('div');
      inner.className = 'block-divider';
      inner.style.height = '100%';
      const hr = document.createElement('hr');
      hr.style.cssText = `border:none;border-top:${b.divThickness}px solid ${b.divColor};width:100%;`;
      inner.appendChild(hr);
      el.appendChild(inner);
    }

    // Resize handles
    ['nw','n','ne','e','se','s','sw','w'].forEach(pos => {
      const h = document.createElement('div');
      h.className = `resize-handle rh-${pos}`;
      h.dataset.dir = pos;
      el.appendChild(h);
    });

    // Events
    el.addEventListener('mousedown', onBlockMouseDown);
    canvasWrap.appendChild(el);
  }

  function updateBlockEl(b) {
    const el = document.getElementById('block-' + b.id);
    if (!el) { renderBlock(b); return; }
    el.style.left   = px(b.x * zoom);
    el.style.top    = px(b.y * zoom);
    el.style.width  = px(b.w * zoom);
    el.style.height = px(b.h * zoom);
    el.style.zIndex = b.z + 1;
    el.className    = 'block' + (b.id === selId ? ' sel' : '') + (!b.visible ? ' hidden-block' : '');

    // Re-render inner content for live updates
    el.querySelectorAll(':not(.resize-handle)').forEach(c => c.remove());

    // Re-add content (reuse renderBlock inner logic)
    const tmp = document.createElement('div');
    tmp.id = 'block-' + b.id + '-tmp';
    canvasWrap.appendChild(tmp);
    const clone = document.getElementById('block-' + b.id);
    // Just re-render the block fully
    renderBlock(b);
    if (tmp.parentNode) tmp.remove();
  }

  function renderLayers() {
    layerList.innerHTML = '';
    const sorted = [...blocks].sort((a, b) => b.z - a.z);
    sorted.forEach(b => {
      const li = document.createElement('div');
      li.className = 'layer-item' + (b.id === selId ? ' sel' : '');
      li.dataset.id = b.id;

      const icons = { text: '📝', button: '🔘', image: '🖼️', qr: '⬛', divider: '➖' };
      li.innerHTML = `
        <span class="layer-icon">${icons[b.type] || '▫️'}</span>
        <span class="layer-name">${b.type === 'text' || b.type === 'button' ? (b.content || b.type).slice(0, 22) : b.type}</span>
        <button class="layer-vis" title="Toggle visibility">${b.visible ? '👁' : '🙈'}</button>
        <button class="layer-del" title="Delete">✕</button>
      `;
      li.querySelector('.layer-vis').addEventListener('click', e => {
        e.stopPropagation(); saveUndo();
        const bl = blocks.find(x => x.id === b.id);
        bl.visible = !bl.visible;
        renderAll(); renderProps();
      });
      li.querySelector('.layer-del').addEventListener('click', e => {
        e.stopPropagation(); saveUndo();
        blocks = blocks.filter(x => x.id !== b.id);
        if (selId === b.id) selectBlock(null);
        renderAll();
      });
      li.addEventListener('click', () => selectBlock(b.id));
      layerList.appendChild(li);
    });
  }

  function renderGuides() {
    canvasWrap.querySelectorAll('.guide').forEach(g => g.remove());
    if (!guidesOn) return;
    const P = PAPER[paper];
    const cx = (P.w / 2) * zoom;
    // Vertical center
    const gv = document.createElement('div');
    gv.className = 'guide guide-v';
    gv.style.cssText = `left:${cx}px;top:0;height:100%;`;
    // Horizontal thirds
    [P.h/3, (2*P.h/3)].forEach(y => {
      const gh = document.createElement('div');
      gh.className = 'guide guide-h';
      gh.style.cssText = `top:${y*zoom}px;left:0;width:100%;`;
      canvasWrap.appendChild(gh);
    });
    canvasWrap.appendChild(gv);
  }

  // ── Selection + Properties ────────────────────────────────────────────────────
  function selectBlock(id) {
    selId = id;
    document.querySelectorAll('.block').forEach(el => el.classList.remove('sel'));
    document.querySelectorAll('.layer-item').forEach(el => el.classList.remove('sel'));
    if (id) {
      const el = document.getElementById('block-' + id);
      if (el) el.classList.add('sel');
      const li = layerList.querySelector(`[data-id="${id}"]`);
      if (li) li.classList.add('sel');
    }
    renderProps();
  }

  function renderProps() {
    const b = blocks.find(x => x.id === selId);
    if (!b) {
      propsEmpty.style.display = '';
      propsBody.style.display  = 'none';
      return;
    }
    propsEmpty.style.display = 'none';
    propsBody.style.display  = '';
    propsBody.innerHTML = buildPropsHTML(b);
    bindProps(b);
  }

  function buildPropsHTML(b) {
    const isText   = b.type === 'text';
    const isButton = b.type === 'button';
    const isQR     = b.type === 'qr';
    const isImg    = b.type === 'image';
    const isDiv    = b.type === 'divider';
    const hasText  = isText || isButton;

    let html = '';

    // Position & size
    html += `<div class="prop-group">
      <div class="prop-label">Position & Size</div>
      <div class="prop-row">
        <input class="prop-input prop-num" data-prop="x" type="number" value="${Math.round(b.x)}" title="X" />
        <input class="prop-input prop-num" data-prop="y" type="number" value="${Math.round(b.y)}" title="Y" />
        <input class="prop-input prop-num" data-prop="w" type="number" value="${Math.round(b.w)}" title="W" />
        <input class="prop-input prop-num" data-prop="h" type="number" value="${Math.round(b.h)}" title="H" />
      </div>
    </div>
    <hr class="prop-divider" />`;

    if (hasText) {
      html += `<div class="prop-group">
        <div class="prop-label">Content</div>
        <textarea class="prop-textarea" data-prop="content">${(b.content||'').replace(/</g,'&lt;')}</textarea>
      </div>
      <hr class="prop-divider" />
      <div class="prop-group">
        <div class="prop-label">Font</div>
        <select class="prop-select" data-prop="fontFamily">
          ${FONT_FAMILIES.map(f => `<option value="${f}"${b.fontFamily===f?' selected':''}>${f}</option>`).join('')}
        </select>
        <div class="prop-row" style="margin-top:4px">
          <input class="prop-input prop-num" data-prop="fontSize" type="number" value="${b.fontSize}" title="Size" style="width:60px" />
          <input class="prop-input prop-num" data-prop="lineHeight" type="number" step="0.05" value="${b.lineHeight}" title="Line height" style="width:60px" />
        </div>
        <div class="prop-btn-row" style="margin-top:4px">
          <button class="prop-btn${b.fontWeight==='bold'?' on':''}" data-toggle="fontWeight" data-vals='["normal","bold"]' title="Bold"><b>B</b></button>
          <button class="prop-btn${b.fontStyle==='italic'?' on':''}" data-toggle="fontStyle" data-vals='["normal","italic"]' title="Italic"><i>I</i></button>
          <button class="prop-btn${b.textDecoration==='underline'?' on':''}" data-toggle="textDecoration" data-vals='["none","underline"]' title="Underline"><u>U</u></button>
          <button class="prop-btn${b.textAlign==='left'?' on':''}" data-set="textAlign" data-val="left" title="Left">⬝L</button>
          <button class="prop-btn${b.textAlign==='center'?' on':''}" data-set="textAlign" data-val="center" title="Center">⬝C</button>
          <button class="prop-btn${b.textAlign==='right'?' on':''}" data-set="textAlign" data-val="right" title="Right">⬝R</button>
        </div>
      </div>
      <hr class="prop-divider" />
      <div class="prop-group">
        <div class="prop-label">Text Color</div>
        <div class="prop-row"><input type="color" class="prop-color" data-prop="color" value="${b.color}" /><input class="prop-input" data-prop="color" value="${b.color}" /></div>
      </div>`;
    }

    if (isButton) {
      html += `<hr class="prop-divider" />
      <div class="prop-group">
        <div class="prop-label">Button URL</div>
        <input class="prop-input" data-prop="url" value="${(b.url||'').replace(/"/g,'&quot;')}" placeholder="https://..." />
        <div class="prop-label" style="margin-top:6px">Button Background</div>
        <div class="prop-row"><input type="color" class="prop-color" data-prop="btnColor" value="${b.btnColor}" /><input class="prop-input" data-prop="btnColor" value="${b.btnColor}" /></div>
        <div class="prop-label" style="margin-top:4px">Button Text Color</div>
        <div class="prop-row"><input type="color" class="prop-color" data-prop="btnTextColor" value="${b.btnTextColor}" /><input class="prop-input" data-prop="btnTextColor" value="${b.btnTextColor}" /></div>
      </div>`;
    }

    if (isText || isButton) {
      html += `<hr class="prop-divider" />
      <div class="prop-group">
        <div class="prop-label">Background</div>
        <div class="prop-row"><input type="color" class="prop-color" data-prop="bgColor" value="${b.bgColor==='transparent'?'#ffffff':b.bgColor}" /><input class="prop-input" data-prop="bgColor" value="${b.bgColor}" /></div>
        <div class="prop-label" style="margin-top:4px">Corner Radius</div>
        <input class="prop-input" data-prop="borderRadius" type="number" value="${b.borderRadius}" />
        <div class="prop-label" style="margin-top:4px">Padding</div>
        <input class="prop-input" data-prop="padding" type="number" value="${b.padding}" />
      </div>`;
    }

    if (isQR) {
      html += `<div class="prop-group">
        <div class="prop-label">QR URL</div>
        <input class="prop-input" data-prop="qrUrl" value="${(b.qrUrl||'').replace(/"/g,'&quot;')}" placeholder="https://..." />
        <div class="prop-label" style="margin-top:6px">Foreground Color</div>
        <div class="prop-row"><input type="color" class="prop-color" data-prop="qrFg" value="${b.qrFg}" /><input class="prop-input" data-prop="qrFg" value="${b.qrFg}" /></div>
        <div class="prop-label" style="margin-top:4px">Background Color</div>
        <div class="prop-row"><input type="color" class="prop-color" data-prop="qrBg" value="${b.qrBg}" /><input class="prop-input" data-prop="qrBg" value="${b.qrBg}" /></div>
      </div>`;
    }

    if (isImg) {
      html += `<div class="prop-group">
        <div class="prop-label">Image</div>
        <div class="prop-upload" id="prop-img-upload">Click to upload / replace image</div>
        <div class="prop-label" style="margin-top:6px">Corner Radius</div>
        <input class="prop-input" data-prop="borderRadius" type="number" value="${b.borderRadius}" />
      </div>`;
    }

    if (isDiv) {
      html += `<div class="prop-group">
        <div class="prop-label">Line Color</div>
        <div class="prop-row"><input type="color" class="prop-color" data-prop="divColor" value="${b.divColor}" /><input class="prop-input" data-prop="divColor" value="${b.divColor}" /></div>
        <div class="prop-label" style="margin-top:6px">Thickness (px)</div>
        <input class="prop-input" data-prop="divThickness" type="number" value="${b.divThickness}" />
      </div>`;
    }

    // Layer order
    html += `<hr class="prop-divider" />
    <div class="prop-group">
      <div class="prop-label">Layer Order</div>
      <div class="prop-btn-row">
        <button class="prop-btn" id="prop-bring-front">⬆ Front</button>
        <button class="prop-btn" id="prop-send-back">⬇ Back</button>
        <button class="prop-btn" id="prop-duplicate">⧉ Dupe</button>
        <button class="prop-btn" id="prop-delete" style="color:#f87171">✕ Delete</button>
      </div>
    </div>`;

    return html;
  }

  function bindProps(b) {
    // Generic input → prop
    propsBody.querySelectorAll('[data-prop]').forEach(input => {
      const prop = input.dataset.prop;
      const ev = input.tagName === 'SELECT' || input.type === 'checkbox' ? 'change' : 'input';
      input.addEventListener(ev, () => {
        saveUndo();
        let val = input.type === 'number' ? (parseFloat(input.value) || 0) : input.value;

        // Sync color pickers ↔ hex inputs
        if (input.type === 'color') {
          propsBody.querySelectorAll(`[data-prop="${prop}"]:not([type="color"])`).forEach(el => el.value = val);
        } else if (/^#[0-9a-fA-F]{3,6}$/.test(val) && input.type !== 'color') {
          const picker = propsBody.querySelector(`[data-prop="${prop}"][type="color"]`);
          if (picker && /^#[0-9a-fA-F]{6}$/.test(val)) picker.value = val;
        }

        b[prop] = val;

        // Button sync
        if (b.type === 'button') {
          if (prop === 'btnColor') { b.bgColor = val; }
          if (prop === 'btnTextColor') { b.color = val; }
        }

        updateBlockEl(b);
        renderLayers();
      });
    });

    // Toggle buttons
    propsBody.querySelectorAll('[data-toggle]').forEach(btn => {
      btn.addEventListener('click', () => {
        saveUndo();
        const prop = btn.dataset.toggle;
        const vals = JSON.parse(btn.dataset.vals);
        const cur = b[prop];
        b[prop] = vals[(vals.indexOf(cur) + 1) % vals.length];
        renderProps(); updateBlockEl(b);
      });
    });

    // Set buttons (alignment etc)
    propsBody.querySelectorAll('[data-set]').forEach(btn => {
      btn.addEventListener('click', () => {
        saveUndo();
        b[btn.dataset.set] = btn.dataset.val;
        renderProps(); updateBlockEl(b);
      });
    });

    // Layer order buttons
    const btnFront = document.getElementById('prop-bring-front');
    const btnBack  = document.getElementById('prop-send-back');
    const btnDupe  = document.getElementById('prop-duplicate');
    const btnDel   = document.getElementById('prop-delete');
    if (btnFront) btnFront.addEventListener('click', () => { saveUndo(); b.z = Math.max(...blocks.map(x=>x.z)) + 1; reorderZ(); renderAll(); });
    if (btnBack)  btnBack.addEventListener('click',  () => { saveUndo(); b.z = Math.min(...blocks.map(x=>x.z)) - 1; reorderZ(); renderAll(); });
    if (btnDupe)  btnDupe.addEventListener('click',  () => { saveUndo(); const nb = { ...JSON.parse(JSON.stringify(b)), id: uid(), x: b.x+16, y: b.y+16, z: blocks.length }; blocks.push(nb); renderAll(); selectBlock(nb.id); });
    if (btnDel)   btnDel.addEventListener('click',   () => { saveUndo(); blocks = blocks.filter(x => x.id !== b.id); selectBlock(null); renderAll(); });

    // Image upload from props
    const imgUpload = document.getElementById('prop-img-upload');
    if (imgUpload) {
      imgUpload.addEventListener('click', () => {
        document.getElementById('img-upload-input').dataset.blockId = b.id;
        document.getElementById('img-upload-input').click();
      });
    }
  }

  function reorderZ() {
    const sorted = [...blocks].sort((a, b) => a.z - b.z);
    sorted.forEach((b, i) => b.z = i);
  }

  // ── Drag & Resize ─────────────────────────────────────────────────────────────
  function onBlockMouseDown(e) {
    if (e.target.classList.contains('resize-handle')) return; // handled below
    e.stopPropagation();
    const el = e.currentTarget;
    const id = el.dataset.id;
    selectBlock(id);

    const b    = blocks.find(x => x.id === id);
    const startX = e.clientX, startY = e.clientY;
    const origX  = b.x, origY = b.y;

    dragState = { id, startX, startY, origX, origY };

    function onMove(ev) {
      if (!dragState) return;
      const dx = (ev.clientX - dragState.startX) / zoom;
      const dy = (ev.clientY - dragState.startY) / zoom;
      const nb = blocks.find(x => x.id === dragState.id);
      nb.x = snap(dragState.origX + dx);
      nb.y = snap(dragState.origY + dy);
      const el = document.getElementById('block-' + nb.id);
      if (el) { el.style.left = px(nb.x * zoom); el.style.top = px(nb.y * zoom); }
      renderProps();
    }

    function onUp() {
      if (dragState) saveUndo();
      dragState = null;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup',   onUp);
    }

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup',   onUp);
  }

  // Resize handle mousedown
  canvasWrap.addEventListener('mousedown', e => {
    if (!e.target.classList.contains('resize-handle')) return;
    e.preventDefault(); e.stopPropagation();

    const el  = e.target.closest('.block');
    const id  = el.dataset.id;
    const dir = e.target.dataset.dir;
    const b   = blocks.find(x => x.id === id);
    selectBlock(id);

    const startX = e.clientX, startY = e.clientY;
    const orig   = { x: b.x, y: b.y, w: b.w, h: b.h };

    function onMove(ev) {
      const dx = (ev.clientX - startX) / zoom;
      const dy = (ev.clientY - startY) / zoom;
      let { x, y, w, h } = orig;

      if (dir.includes('e')) w  = snap(Math.max(20, orig.w + dx));
      if (dir.includes('s')) h  = snap(Math.max(10, orig.h + dy));
      if (dir.includes('w')) { w = snap(Math.max(20, orig.w - dx)); x = snap(orig.x + (orig.w - w)); }
      if (dir.includes('n')) { h = snap(Math.max(10, orig.h - dy)); y = snap(orig.y + (orig.h - h)); }

      b.x = x; b.y = y; b.w = w; b.h = h;
      const blockEl = document.getElementById('block-' + id);
      if (blockEl) {
        blockEl.style.left   = px(b.x * zoom); blockEl.style.top    = px(b.y * zoom);
        blockEl.style.width  = px(b.w * zoom); blockEl.style.height = px(b.h * zoom);
      }
      renderProps();
    }

    function onUp() {
      saveUndo();
      updateBlockEl(b);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup',   onUp);
    }

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup',   onUp);
  });

  // Click on canvas bg → deselect
  canvasWrap.addEventListener('mousedown', e => {
    if (e.target === canvasWrap) selectBlock(null);
  });

  // ── Keyboard shortcuts ────────────────────────────────────────────────────────
  document.addEventListener('keydown', e => {
    if (['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)) return;
    const b = blocks.find(x => x.id === selId);

    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (b) { saveUndo(); blocks = blocks.filter(x => x.id !== selId); selectBlock(null); renderAll(); }
    }
    if (e.key === 'ArrowLeft'  && b) { saveUndo(); b.x -= e.shiftKey ? 10 : 1; updateBlockEl(b); renderProps(); }
    if (e.key === 'ArrowRight' && b) { saveUndo(); b.x += e.shiftKey ? 10 : 1; updateBlockEl(b); renderProps(); }
    if (e.key === 'ArrowUp'    && b) { saveUndo(); b.y -= e.shiftKey ? 10 : 1; updateBlockEl(b); renderProps(); }
    if (e.key === 'ArrowDown'  && b) { saveUndo(); b.y += e.shiftKey ? 10 : 1; updateBlockEl(b); renderProps(); }

    if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undoAction(); }
    if ((e.ctrlKey || e.metaKey) && e.key === 'y') { e.preventDefault(); redoAction(); }
    if ((e.ctrlKey || e.metaKey) && e.key === 'd' && b) { e.preventDefault(); const nb = { ...JSON.parse(JSON.stringify(b)), id: uid(), x: b.x+16, y: b.y+16, z: blocks.length }; saveUndo(); blocks.push(nb); renderAll(); selectBlock(nb.id); }
  });

  // ── Undo / Redo ──────────────────────────────────────────────────────────────
  function undoAction() { if (!undoStack.length) return; redoStack.push(JSON.stringify(blocks)); applyBlocks(JSON.parse(undoStack.pop())); }
  function redoAction() { if (!redoStack.length) return; undoStack.push(JSON.stringify(blocks)); applyBlocks(JSON.parse(redoStack.pop())); }
  document.getElementById('btn-undo').addEventListener('click', undoAction);
  document.getElementById('btn-redo').addEventListener('click', redoAction);

  // ── Toolbar actions ───────────────────────────────────────────────────────────
  document.querySelectorAll('[data-add]').forEach(btn => {
    btn.addEventListener('click', () => {
      saveUndo();
      const b = makeBlock(btn.dataset.add);
      const P = PAPER[paper];
      b.x = snap(P.w / 2 - b.w / 2);
      b.y = snap(P.h / 2 - b.h / 2);
      b.z = blocks.length;
      blocks.push(b);
      renderAll();
      selectBlock(b.id);
    });
  });

  // Snap
  const btnSnap = document.getElementById('btn-snap');
  btnSnap.classList.add('active');
  btnSnap.addEventListener('click', () => {
    snapOn = !snapOn;
    btnSnap.classList.toggle('active', snapOn);
  });

  // Guides
  const btnGuides = document.getElementById('btn-guides');
  btnGuides.addEventListener('click', () => {
    guidesOn = !guidesOn;
    btnGuides.classList.toggle('active', guidesOn);
    renderGuides();
  });

  // Paper size
  tbPaper.addEventListener('change', () => {
    saveUndo(); paper = tbPaper.value;
    renderAll();
  });

  // Zoom
  document.getElementById('btn-zoom-in').addEventListener('click',  () => { zoom = Math.min(3, zoom + 0.1); renderAll(); });
  document.getElementById('btn-zoom-out').addEventListener('click', () => { zoom = Math.max(0.2, zoom - 0.1); renderAll(); });
  document.getElementById('btn-zoom-fit').addEventListener('click', () => {
    const areaH = canvasArea.clientHeight - 48;
    const areaW = canvasArea.clientWidth  - 48;
    const P     = PAPER[paper];
    zoom = Math.min(areaW / P.w, areaH / P.h, 1);
    zoom = Math.round(zoom * 100) / 100;
    renderAll();
  });

  // Presets dropdown
  document.getElementById('btn-add-preset').addEventListener('click', e => {
    const menu = document.createElement('div');
    menu.style.cssText = 'position:fixed;background:var(--surface);border:1px solid var(--line2);border-radius:8px;z-index:9999;box-shadow:0 8px 24px rgba(0,0,0,.4);min-width:180px;';
    const items = [
      { label: '📥 Digital Download', val: 'digital-download' },
      { label: '⬜ Minimal', val: 'minimal' },
      { label: '🗑 Blank Canvas', val: 'blank' },
    ];
    items.forEach(item => {
      const li = document.createElement('div');
      li.style.cssText = 'padding:9px 14px;cursor:pointer;font-size:12px;color:var(--text);';
      li.textContent = item.label;
      li.addEventListener('mouseenter', () => li.style.background = 'var(--surface2)');
      li.addEventListener('mouseleave', () => li.style.background = '');
      li.addEventListener('click', () => { loadPreset(item.val); document.body.removeChild(menu); });
      menu.appendChild(li);
    });
    const rect = e.target.getBoundingClientRect();
    menu.style.left = rect.left + 'px'; menu.style.top = (rect.bottom + 4) + 'px';
    document.body.appendChild(menu);
    const close = ev => { if (!menu.contains(ev.target)) { document.body.removeChild(menu); document.removeEventListener('mousedown', close); } };
    setTimeout(() => document.addEventListener('mousedown', close), 0);
  });

  // Image upload
  document.getElementById('img-upload-input').addEventListener('change', e => {
    const file = e.target.files[0]; if (!file) return;
    const id = e.target.dataset.blockId;
    const reader = new FileReader();
    reader.onload = ev => {
      const b = blocks.find(x => x.id === id);
      if (b) { saveUndo(); b.imgSrc = ev.target.result; updateBlockEl(b); renderProps(); }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  });

  // ── PDF Import (pdfjs) ────────────────────────────────────────────────────────
  document.getElementById('btn-import-pdf').addEventListener('click', () => document.getElementById('import-pdf-input').click());
  document.getElementById('import-pdf-input').addEventListener('change', async e => {
    const file = e.target.files[0]; if (!file) return;
    e.target.value = '';
    try {
      const pdfjsLib = await import(chrome.runtime.getURL('libs/pdf.min.mjs'));
      pdfjsLib.GlobalWorkerOptions.workerSrc = WORKER_URL;
      const ab  = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: ab }).promise;
      const page = await pdf.getPage(1);
      const content = await page.getTextContent();
      const lines   = [];
      let curY = null, curLine = '';
      content.items.forEach(item => {
        if (!item.str) return;
        const y = Math.round(item.transform[5]);
        if (curY === null || Math.abs(y - curY) < 5) { curLine += item.str + ' '; curY = y; }
        else { if (curLine.trim()) lines.push(curLine.trim()); curLine = item.str + ' '; curY = y; }
      });
      if (curLine.trim()) lines.push(curLine.trim());

      if (!lines.length) { alert('No text found in PDF.'); return; }

      saveUndo();
      const P = PAPER[paper];
      blocks = [];
      let y = 60;
      lines.slice(0, 20).forEach((line, i) => {
        if (!line.trim()) return;
        const isTitle = i === 0 || line.length < 40;
        const b = makeBlock('text', {
          id: uid(), content: line,
          x: 60, y, w: P.w - 120, h: isTitle ? 60 : 40,
          fontSize: isTitle ? (i === 0 ? 28 : 18) : 14,
          fontWeight: (i === 0 || (isTitle && i < 3)) ? 'bold' : 'normal',
          color: i === 0 ? '#7c3aed' : '#334155',
          textAlign: 'left', z: i,
        });
        blocks.push(b);
        y += b.h + 6;
      });
      idSeq = blocks.length + 1;
      renderAll(); selectBlock(null);
    } catch (err) {
      alert('Failed to import PDF: ' + err.message);
      console.error(err);
    }
  });

  // ── Export PDF ────────────────────────────────────────────────────────────────
  document.getElementById('btn-export').addEventListener('click', async () => {
    const btn = document.getElementById('btn-export');
    btn.disabled = true; btn.textContent = '⏳ Exporting...';

    try {
      selectBlock(null);
      await new Promise(r => setTimeout(r, 100));

      const P        = PAPER[paper];
      const origZoom = zoom;
      zoom = 1;
      renderAll();
      await new Promise(r => setTimeout(r, 200));

      const canvasEl = await html2canvas(canvasWrap, {
        scale: 2, useCORS: true, allowTaint: true,
        width: P.w, height: P.h, backgroundColor: '#ffffff',
      });

      zoom = origZoom;
      renderAll();

      const { jsPDF } = window.jspdf;
      const isA4 = paper === 'a4';
      const pdf  = new jsPDF({ orientation: 'portrait', unit: 'mm', format: isA4 ? 'a4' : 'letter' });
      const pw   = pdf.internal.pageSize.getWidth();
      const ph   = pdf.internal.pageSize.getHeight();
      const img  = canvasEl.toDataURL('image/jpeg', 0.95);
      pdf.addImage(img, 'JPEG', 0, 0, pw, ph);
      pdf.save('ldd_digital_download.pdf');
    } catch (err) {
      alert('Export failed: ' + err.message);
      console.error(err);
    } finally {
      btn.disabled = false; btn.innerHTML = '⬇ Export PDF';
    }
  });

  // ── Init ──────────────────────────────────────────────────────────────────────
  loadPreset('digital-download');
  document.getElementById('btn-zoom-fit').click();

})();
