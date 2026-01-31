# LDD PDF Generator — Vibe-Coding Guide for Google AI Studio

This repo is a **Vite + React + TypeScript** app that creates a **print-ready “Thank You / Download” PDF page** for Etsy digital orders.

The core workflow is:

1) **Upload an original MyDesigns `Download.pdf`** (or paste a link)  
2) The app **extracts the embedded download URL** (when present)  
3) You customize layout, colors, fonts, logo/watermark, promo + socials, and optional QR  
4) Export generates a **1-page PDF** by screenshotting the on-screen canvas via **html2canvas** and then embedding that image into **jsPDF**  
5) Export **adds clickable link regions** over the button, QR, and social icons

---

## Project Map

- `App.tsx` — **the brain** (canvas editor + export + font manager + link extraction)
- `components/Sidebar.tsx` — tab sidebar UI
- `components/RoadmapViz.tsx` — roadmap visuals
- `services/geminiService.ts` — optional Gemini copy enhancement + key storage helpers
- `types.ts` — shared types (tabs, config shapes)
- `public/index.css` — theme overrides and dark-mode tweaks
- `netlify.toml` — deploy rules (Netlify hosting)

---

## The Big Mental Model

### Two “worlds”
**(A) The editor world (DOM)**
- You see a “print canvas” (816×1056).  
- Every block is a draggable/resizable DOM element (`DraggableBlock`) positioned by `config.layout.blocks[...]`.
- Text styling lives under `config.fonts.blocks[...]` and colors under `config.colors[...]`.

**(B) The export world (PDF)**
- Export uses `html2canvas(#pdf-canvas)` to rasterize the DOM to a PNG.
- `jsPDF` creates a 1-page PDF and places the image edge-to-edge.
- Then it overlays link hotspots using `pdf.link(x, y, w, h, { url })`.

Because export is a screenshot of the DOM, **font loading and DOM rendering quirks** matter a lot.

---

## Key Concepts in `App.tsx`

### 1) `PDFConfig`
Everything is a single `config` object:
- `source` — upload mode + extracted URL
- `content` — title/desc/footer strings
- `colors` — background, button, promoBg, text colors, QR colors
- `fonts` — global + per-block typography (family/size/bold/italic/underline/align/color)
- `layout.blocks` — x/y/w/h for each primary block (title, button, qr, etc.)
- `layout.extraLayers` — user-added text/images
- `visibility` — toggles (show/hide each element)
- `promo` / `socials` — promo toggle, social links, etc.

### 2) MyDesigns URL extraction
When the user uploads `Download.pdf`, the app uses **pdfjs** (`pdfjs-dist`) to parse the PDF and attempt to find a link annotation / embedded URL.

If found:
- `config.source.link` is set automatically
- The button and QR can link to it

### 3) Draggable / resizable blocks
The editor uses absolutely-positioned blocks:
- drag math uses `zoom` so movement remains accurate while zoomed
- snapping can align blocks to canvas centerlines
- multi-select and multi-drag supported

### 4) Export pipeline
`handleExportPDF(preview: boolean)`
- temporarily resets canvas zoom transform (so capture is clean)
- `html2canvas` captures the canvas → PNG
- `jsPDF` makes a single page and places the PNG
- overlays `pdf.link(...)` hotspots

### 5) Custom font manager (important)
Users can upload `.ttf/.otf/.woff/.woff2`.
- Fonts are loaded with `FontFace(...)` + `document.fonts.add(...)`
- Font metadata is persisted in `localStorage` as data URLs so fonts survive refresh

**Common failure mode:** Export happens before the font is fully loaded → spacing/kerning goes weird in the exported PDF.

---

## Fixes Included In This Version

### ✅ Button text centering bug (export-safe)
`html2canvas` sometimes mis-centers flexbox content in certain fonts.
The download button text now uses **absolute centering** (`left:50%/top:50%/translate`) instead of relying on flexbox.

### ✅ Script/custom font spacing stability on export
Before export, the app now:
- pre-loads every active font family via `document.fonts.load(...)`
- waits for `document.fonts.ready`
- enables `letterRendering` in html2canvas (helps kerning/spacing in tricky fonts)

Result: custom/script fonts behave way more like what you see in the editor.

---

## How to Extend Features (Vibe-Coding Recipes)

### A) Add a new block type
1) Add a layout entry in `INITIAL_CONFIG.layout.blocks`
2) Add a visibility toggle in `INITIAL_CONFIG.visibility`
3) Add a text config in `INITIAL_CONFIG.fonts.blocks` (if it’s text)
4) Render a new `<DraggableBlock id="yourBlock">...</DraggableBlock>` in the canvas
5) Add sidebar controls (find the block UI section and clone patterns)

### B) Add a new “extra layer” tool
Extra layers are in `config.layout.extraLayers`.
Each layer can be:
- `type: 'text'` with `text`, `fontFamily`, `fontSize`, `color`, alignment
- `type: 'image'` with a data URL

To add a tool:
- create a “+ Add Text Layer” / “+ Add Image Layer” action
- push a new layer object into `extraLayers`
- render it inside the canvas loop that draws extra layers

### C) Add more export link hotspots
Export already adds hotspots for button, QR, socials.
To add another:
- after `pdf.addImage(...)` compute `scaleX/scaleY`
- call `pdf.link(block.x*scaleX, block.y*scaleY, block.w*scaleX, block.h*scaleY, { url })`

---

## AI Studio Prompt Template (paste into AI Studio)

Use this when you want AI Studio to generate code changes **without losing your app’s structure**:

**SYSTEM / ROLE**
You are a senior React + TypeScript engineer. You must modify the existing codebase without breaking features. Do not rewrite the app from scratch.

**CONTEXT**
This project is a Vite + React + TS PDF editor that exports a 1-page PDF via html2canvas + jsPDF. The main logic is in App.tsx.

**RULES**
- Keep types intact and compile cleanly.
- Keep existing UI patterns and tailwind classes.
- Changes must be minimal and localized.
- Do not delete features.
- When touching export logic, preserve link hotspots.

**TASK**
<describe your change here>

**FILES**
I will provide:
- App.tsx
- types.ts
- services/geminiService.ts (if needed)
- public/index.css (if needed)

Return:
1) exactly the modified file contents
2) a short checklist of what changed and why

---

## Dev Commands

```bash
npm i
npm run dev
npm run build
```

Netlify build should be `npm run build` with publish folder `dist`.

---
Made with ❤️ by LavenderDragonDesign
