
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { EditorTab, PDFConfig, BlockLayout, ExtraLayer } from './types';
import { 
  FileText, Image as ImageIcon, Type, Palette, 
  Tag, Share2, File, Save, Download, 
  X, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Trash2, Settings, Loader2, Plus, 
  Facebook, Instagram, ShoppingBag, Globe, Store, ShoppingCart,
  RotateCw, Copy, Scissors, Clipboard, Undo2, Redo2, Layers, Eye,
  Link as LinkIcon, HardDrive, Cloud, Sun, Moon, Info, MousePointer2, Move,
  Maximize, Upload, Link as LinkIcon2, CloudDrizzle, ShoppingBag as ShopifyIcon, Laptop,
  Layout, Minimize2, ChevronRight, ChevronDown, ChevronUp, EyeOff, Search, QrCode, Heart, Coffee, FolderOpen,
  Waves, MousePointer, FileJson, Sparkles, Bold, Italic, Underline, ChevronLeft,
  ArrowUpToLine, ArrowDownToLine, ArrowUp, ArrowDown
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import * as pdfjsLib from 'pdfjs-dist';
import { enhancePdfCopy, getStoredGeminiKey, LDD_GEMINI_KEY_STORAGE, MissingGeminiKeyError } from './services/geminiService';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@4.10.38/build/pdf.worker.mjs`;

const LDD_ETY_SHOP_URL = 'https://www.etsy.com/shop/LavenderDragonDesign';
const LDD_BMAC_URL = 'https://www.buymeacoffee.com/lavenderdragondesign';

const CANVAS_WIDTH = 816; 
const CANVAS_HEIGHT = 1056; 

const INITIAL_CONFIG: PDFConfig = {
  source: { mode: 'upload', link: '', fileName: null },
  assets: { logo: null, watermark: null, watermarkOpacity: 0.1 },
  content: {
    title: 'Your Digital Files Are Ready',
    shortDesc: 'Thank you for your purchase!',
    mainDesc: 'Click the button below to access your digital files. We recommend saving this page so you can return anytime.',
    footer: '© 2026 Your Store Name. All rights reserved.',
    twoColumns: false,
  },
  fonts: {
    global: 'Inter',
    blocks: {
      title: { family: 'Inter', size: 36, align: 'center', color: '#0f172a', bold: true },
      shortDesc: { family: 'Inter', size: 30, align: 'center', color: '#334155' },
      mainDesc: { family: 'Inter', size: 30, align: 'center', color: '#475569' },
      footer: { family: 'Inter', size: 10, align: 'center', color: '#94a3b8' },
      promo: { family: 'Inter', size: 18, align: 'center', color: '#ffffff', bold: true },
      button: { family: 'Inter', size: 20, align: 'center', color: '#ffffff', bold: true },
      socials: { family: 'Inter', size: 12, align: 'center', color: '#475569' },
    }
  },
  colors: {
    background: '#ffffff',
    accent: '#f97316',
    // Promo background is intentionally independent from the download button background.
    // (Users expect "Promo Background" to only affect the promo block.)
    promoBg: '#f97316',
    button: '#3b82f6',
    buttonText: '#ffffff',
    // Kept for backward compatibility with older saved projects.
    // No longer used to auto-sync promo/button backgrounds.
    syncAccent: false,
    qrColor: '#000000',
    qrBgColor: '#ffffff'
  },
  promo: {
    enabled: true,
    title: 'SPECIAL OFFER',
    code: 'SAVE20',
    description: '20% off your next purchase',
    expiry: '',
    link: 'https://your-store.com/promo',
    size: 18,
    showQR: false,
  },
  socials: {
    facebook: '', instagram: '', etsy: '', website: '', shopify: '', woo: '',
    genQR: false,
  },
  paper: { size: 'US Letter', orientation: 'portrait', bleed: 'None' },
  visibility: {
    logo: false, title: true, button: true, qr: false, promo: true, 
    socials: false, footer: true, shortDesc: true, mainDesc: true, watermark: false
  },
  layout: {
    btnWidth: 60, btnHeight: 40, freeform: true, snap: true, guides: false, groups: [], qr: true,
    blocks: {
      // Roomier defaults so the big placeholder text doesn't pile up on first load.
      title: { x: 158, y: 70, w: 500, h: 80 },
      shortDesc: { x: 158, y: 170, w: 500, h: 70 },
      mainDesc: { x: 118, y: 260, w: 580, h: 220 },
      button: { x: 283, y: 510, w: 250, h: 70 },
      qr: { x: 448, y: 600, w: 120, h: 120 },
      promo: { x: 118, y: 740, w: 580, h: 180 },
      footer: { x: 158, y: 945, w: 500, h: 40 },
      logo: { x: 378, y: 20, w: 60, h: 60 },
      socials: { x: 118, y: 995, w: 580, h: 40 }
    },
    extraLayers: []
      ,
    zIndex: {}
  }
};

const FONT_FAMILIES = ['Inter', 'Arial', 'Verdana', 'Georgia', 'Times New Roman', 'Courier New'];


// --- Text box auto-fit helpers (prevents cut-off on load) ---
function measureTextBox(text: string, font: string, maxWidth: number, padding = 16, lineHeightMult = 1.25) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  ctx.font = font;

  const rawLines = (text || '').split('\n');
  const lines: string[] = [];

  for (const raw of rawLines) {
    const words = raw.split(' ');
    let line = '';
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (ctx.measureText(test).width > Math.max(1, maxWidth - padding * 2) && line) {
        lines.push(line);
        line = w;
      } else {
        line = test;
      }
    }
    lines.push(line);
  }

  let widest = 0;
  for (const l of lines) widest = Math.max(widest, ctx.measureText(l).width);

  // baseline-safe line height
  const fontSizeMatch = /\b(\d+(?:\.\d+)?)px\b/.exec(font);
  const fontSize = fontSizeMatch ? parseFloat(fontSizeMatch[1]) : 14;
  const lineHeight = fontSize * lineHeightMult;

  const height = Math.ceil(lines.length * lineHeight + padding * 2);
  const width = Math.ceil(widest + padding * 2);

  return { width, height, lineCount: lines.length };
}

function autoFitStandardTextBlocks(cfg: PDFConfig): PDFConfig {
  const next = JSON.parse(JSON.stringify(cfg)) as PDFConfig;

  const MIN_W: Record<string, number> = {
    title: 420, shortDesc: 380, mainDesc: 520, footer: 420, promo: 560, socials: 520
  };
  const MIN_H: Record<string, number> = {
    title: 80, shortDesc: 70, mainDesc: 160, footer: 60, promo: 170, socials: 70
  };

  const blocks = ['title','shortDesc','mainDesc','footer','promo','socials'] as const;

  for (const id of blocks) {
    const b = (next.layout.blocks as any)[id];
    const f = (next.fonts.blocks as any)[id];
    if (!b || !f) continue;

    const weight = f.bold ? 800 : 600;
    const style = f.italic ? 'italic' : 'normal';
    const font = `${style} ${weight} ${f.size}px ${f.family || next.fonts.global || 'Inter'}`;

    const text =
      id === 'promo'
        ? `${next.promo.title || ''}\n${next.promo.code || ''}\n${next.promo.description || ''}${next.promo.expiry ? `\n${next.promo.expiry}` : ''}`
        : ((next.content as any)[id] || '');

    const minW = MIN_W[id] ?? 360;
    const minH = MIN_H[id] ?? 80;

    // Expand width/height just enough so the loaded project doesn't look "cut off".
    const measured = measureTextBox(text, font, Math.max(b.w || 1, minW), 16, 1.25);
    b.w = Math.max(b.w || 0, measured.width, minW);
    b.h = Math.max(b.h || 0, measured.height, minH);
  }

  return next;
}

const DraggableBlock: React.FC<{
  id: string;
  config: PDFConfig;
  updateConfig: (path: string, value: any, record?: boolean) => void;
  children: React.ReactNode;
  visible: boolean;
  onSnap?: (lines: { h: number[], v: number[] }) => void;
  onContextMenu: (e: React.MouseEvent, id: string, isExtra: boolean) => void;
  onSelect: (id: string, mode?: 'replace' | 'toggle' | 'add' | 'keep') => void;
  selectedIds: string[];
  onDoubleClick?: () => void;
  isExtra?: boolean;
  zoom: number;
  isSelected?: boolean;
  isPrimary?: boolean;
  isEditing?: boolean;
	}> = ({ id, config, updateConfig, children, visible, onSnap, onContextMenu, onSelect, selectedIds, onDoubleClick, isExtra = false, zoom, isSelected, isPrimary, isEditing }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [startPos, setStartPos] = useState({ x: 0, y: 0, blockX: 0, blockY: 0, blockW: 0, blockH: 0, multiIds: [] as string[], snapshots: {} as Record<string, {x:number,y:number,w:number,h:number, isExtra:boolean}> });
  
  const block = isExtra 
    ? config.layout.extraLayers.find(l => l.id === id) as BlockLayout 
    : config.layout.blocks[id];

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging && !resizeHandle) return;
      
      let newX = startPos.blockX + (e.clientX - startPos.x) / zoom;
      let newY = startPos.blockY + (e.clientY - startPos.y) / zoom;
      let newW = startPos.blockW;
      let newH = startPos.blockH;

      if (resizeHandle) {
        const dx = (e.clientX - startPos.x) / zoom;
        const dy = (e.clientY - startPos.y) / zoom;
        if (resizeHandle.includes('e')) newW = startPos.blockW + dx;
        if (resizeHandle.includes('w')) { newW = startPos.blockW - dx; newX = startPos.blockX + dx; }
        if (resizeHandle.includes('s')) newH = startPos.blockH + dy;
        if (resizeHandle.includes('n')) { newH = startPos.blockH - dy; newY = startPos.blockY + dy; }
      }

      newW = Math.max(20, Math.min(newW, CANVAS_WIDTH));
      newH = Math.max(20, Math.min(newH, CANVAS_HEIGHT));
      newX = Math.max(0, Math.min(newX, CANVAS_WIDTH - newW));
      newY = Math.max(0, Math.min(newY, CANVAS_HEIGHT - newH));

      if (config.layout.snap) {
        const snapThreshold = 10;
        const linesH: number[] = [], linesV: number[] = [];
        const targetsX = [CANVAS_WIDTH / 2], targetsY = [CANVAS_HEIGHT / 2];
        const blockCenterX = newX + newW / 2;

        targetsX.forEach(tx => { if (Math.abs(blockCenterX - tx) < snapThreshold) { newX = tx - newW / 2; linesV.push(tx); } });
        targetsY.forEach(ty => { if (Math.abs(newY + newH/2 - ty) < snapThreshold) { newY = ty - newH / 2; linesH.push(ty); } });
        onSnap?.({ h: linesH, v: linesV });
      }

      // Apply movement (single or multi)
      if (startPos.multiIds && startPos.multiIds.length > 1 && startPos.snapshots) {
        const deltaX = newX - startPos.blockX;
        const deltaY = newY - startPos.blockY;

        // Update blocks
        const nextBlocks: any = { ...config.layout.blocks };
        let nextLayers = config.layout.extraLayers;

        for (const sid of startPos.multiIds) {
          const snap = startPos.snapshots[sid];
          if (!snap) continue;
          const nx = Math.max(0, Math.min(snap.x + deltaX, CANVAS_WIDTH - snap.w));
          const ny = Math.max(0, Math.min(snap.y + deltaY, CANVAS_HEIGHT - snap.h));

          if (snap.isExtra) {
            nextLayers = nextLayers.map(l => l.id === sid ? { ...l, x: nx, y: ny } : l);
          } else {
            if (nextBlocks[sid]) nextBlocks[sid] = { ...nextBlocks[sid], x: nx, y: ny };
          }
        }

        updateConfig('layout.blocks', nextBlocks, false);
        updateConfig('layout.extraLayers', nextLayers, false);
      } else {
        if (isExtra) {
          const newLayers = config.layout.extraLayers.map(l => l.id === id ? { ...l, x: newX, y: newY, w: newW, h: newH } : l);
          updateConfig('layout.extraLayers', newLayers, false);
        } else {
          updateConfig(`layout.blocks.${id}`, { x: newX, y: newY, w: newW, h: newH }, false);
        }
      }
    };

    const handleMouseUp = () => { 
      if (isDragging || resizeHandle) {
        if (isExtra) {
          updateConfig('layout.extraLayers', [...config.layout.extraLayers], true);
        } else {
          updateConfig(`layout.blocks.${id}`, { ...config.layout.blocks[id] }, true);
        }
      }
      setIsDragging(false); 
      setResizeHandle(null); 
      onSnap?.({ h: [], v: [] }); 
    };
    if (isDragging || resizeHandle) { window.addEventListener('mousemove', handleMouseMove); window.addEventListener('mouseup', handleMouseUp); }
    return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); };
  }, [isDragging, resizeHandle, startPos, id, block, config, updateConfig, isExtra, onSnap, zoom]);

  if (!visible || !block) return null;


  return (
    <div
      className={`absolute group select-none flex items-center justify-center ${config.layout.freeform ? 'cursor-move' : ''} ${isPrimary ? 'ring-2 ring-indigo-600 ring-offset-2 shadow-2xl z-50' : isSelected ? 'ring-2 ring-blue-500 ring-offset-1 z-40' : ''}`}
	      // IMPORTANT: use capture so selection still works even when inner elements stopPropagation
	      // (inputs, editable text, etc). This mirrors desktop editors: click anywhere inside selects.
	      onMouseDownCapture={(e) => {
	        if (e.button !== 0 || isEditing) return;
	        const alreadySelected = selectedIds.includes(id);
	        const mode: 'replace' | 'toggle' | 'add' | 'keep' = (e.ctrlKey || e.metaKey)
	          ? 'toggle'
	          : e.shiftKey
	            ? 'add'
	            : alreadySelected
	              ? 'keep'
	              : 'replace';
	        onSelect(id, mode);
	      }}
      onMouseDown={(e) => {
        if (e.button !== 0 || isEditing) return;
        e.stopPropagation();

	        const alreadySelected = selectedIds.includes(id);
	        const mode: 'replace' | 'toggle' | 'add' | 'keep' = (e.ctrlKey || e.metaKey)
	          ? 'toggle'
	          : e.shiftKey
	            ? 'add'
	            : alreadySelected
	              ? 'keep'
	              : 'replace';

        const target = e.target as HTMLElement;
        if (target.closest('.close-button') || target.closest('.resize-handle') || target.closest('.clickable-part')) return;

        // Multi-drag: if the block is already part of a multi-selection, drag them all together.
        const multiIds = (mode === 'keep' && alreadySelected && selectedIds.length > 1) ? selectedIds : [id];

        const snapshots: Record<string, { x: number; y: number; w: number; h: number; isExtra: boolean }> = {};
        for (const sid of multiIds) {
          const ex = config.layout.extraLayers.find(l => l.id === sid);
          if (ex) snapshots[sid] = { x: ex.x, y: ex.y, w: ex.w, h: ex.h, isExtra: true };
          else {
            const b = (config.layout.blocks as any)[sid];
            if (b) snapshots[sid] = { x: b.x, y: b.y, w: b.w, h: b.h, isExtra: false };
          }
        }

        setIsDragging(true);
        setStartPos({ x: e.clientX, y: e.clientY, blockX: block.x, blockY: block.y, blockW: block.w, blockH: block.h, multiIds, snapshots });
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onDoubleClick?.();
      }}
      onContextMenu={(e) => onContextMenu(e, id, isExtra)}
      style={{ left: block.x, top: block.y, width: block.w, height: block.h, zIndex: (isDragging || resizeHandle) ? 60 : (config.layout.zIndex?.[id] ?? 10) }}
    >
      <div className={`relative w-full h-full flex items-center justify-center ${(!isSelected) ? 'group-hover:ring-2 group-hover:ring-blue-500 group-hover:ring-offset-1' : ''}`}>
        <div className={`w-full h-full flex items-center justify-center overflow-hidden`}>
          {children}
        </div>
        {config.layout.freeform && !isEditing && (
          <>
            <button onClick={(e) => { e.stopPropagation(); if (isExtra) updateConfig('layout.extraLayers', config.layout.extraLayers.filter(l => l.id !== id)); else updateConfig(`visibility.${id}`, false); }} className="absolute -top-4 -right-4 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg z-[70]"><X size={12} /></button>
            {['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'].map(h => (
              <div key={h} onMouseDown={(e) => { 
                e.stopPropagation(); 
                onSelect(id); 
                setResizeHandle(h); 
                setStartPos({ x: e.clientX, y: e.clientY, blockX: block.x, blockY: block.y, blockW: block.w, blockH: block.h }); 
              }} className={`resize-handle absolute w-3.5 h-3.5 bg-white border-2 border-blue-600 rounded shadow-md opacity-0 group-hover:opacity-100 z-[60] ${h === 'nw' ? '-top-1.5 -left-1.5 cursor-nw-resize' : h === 'n' ? '-top-1.5 left-1/2 -translate-x-1/2 cursor-n-resize' : h === 'ne' ? '-top-1.5 -right-1.5 cursor-ne-resize' : h === 'e' ? 'top-1/2 -translate-y-1/2 -right-1.5 cursor-e-resize' : h === 'se' ? '-bottom-1.5 -right-1.5 cursor-se-resize' : h === 's' ? '-bottom-1.5 left-1/2 -translate-x-1/2 cursor-s-resize' : h === 'sw' ? '-bottom-1.5 -left-1.5 cursor-sw-resize' : 'top-1/2 -translate-y-1/2 -left-1.5 cursor-w-resize'}`} />
            ))}
          </>
        )}
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<EditorTab>(EditorTab.SOURCE);

  const [customFontFamilies, setCustomFontFamilies] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('ldd_custom_fonts') || '[]'); } catch { return []; }
  });
	  // Persist actual font files so they still work after refresh.
	  // Stored as data URLs in localStorage (best-effort; very large fonts may exceed quota).
	  const CUSTOM_FONTS_DATA_KEY = 'ldd_custom_fonts_data_v1';
	  type StoredFont = { name: string; dataUrl: string; uploadedAt: number };

	  useEffect(() => {
	    (async () => {
	      let stored: StoredFont[] = [];
	      try { stored = JSON.parse(localStorage.getItem(CUSTOM_FONTS_DATA_KEY) || '[]'); } catch { stored = []; }
	      if (!stored?.length) return;
	      // Load fonts into document.fonts
	      for (const f of stored) {
	        try {
	          // @ts-ignore
	          const ff = new FontFace(f.name, `url(${f.dataUrl})`);
	          await ff.load();
	          // @ts-ignore
	          document.fonts.add(ff);
	        } catch (e) {
	          console.warn('Failed to restore font', f?.name, e);
	        }
	      }
	      // Ensure the dropdown list includes these names
	      setCustomFontFamilies(prev => {
	        const set = new Set([...(prev || []), ...stored.map(s => s.name)]);
	        const next = Array.from(set);
	        try { localStorage.setItem('ldd_custom_fonts', JSON.stringify(next)); } catch {}
	        return next;
	      });
	    })();
	  }, []);
  const [config, setConfig] = useState<PDFConfig>(INITIAL_CONFIG);


  // Fonts currently used anywhere in this document (blocks + extra text layers)
  const usedFontsInDoc = useMemo(() => {
    const used = new Set<string>();

    const blocks: any = (config as any)?.fonts?.blocks || {};
    for (const b of Object.values(blocks)) {
      const fam = (b as any)?.family;
      if (typeof fam === 'string' && fam.trim()) used.add(fam.trim());
    }

    for (const l of (config.layout?.extraLayers || [])) {
      if (l && l.type === 'text' && typeof (l as any).fontFamily === 'string' && (l as any).fontFamily.trim()) {
        used.add((l as any).fontFamily.trim());
      }
    }

    return used;
  }, [config]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const canvasRef = useRef<HTMLDivElement>(null);
  const fontUploadRef = useRef<HTMLInputElement>(null);
  const [fontUploadWarningOpen, setFontUploadWarningOpen] = useState<boolean>(false);

  // Google Fonts (Google Fonts are free/open-licensed and generally OK for commercial use under their individual licenses.)
type GoogleFontEntry = {
  family: string;
  category?: string;
  variants?: string[];
  subsets?: string[];
};

const [googleFontsAll, setGoogleFontsAll] = useState<GoogleFontEntry[]>([]);
const [googleFontsSelected, setGoogleFontsSelected] = useState<GoogleFontEntry | null>(() => {
  try {
    const fam = (localStorage.getItem('ldd_google_fonts_selected_family') || '').trim();
    return fam ? ({ family: fam } as GoogleFontEntry) : null;
  } catch {
    return null;
  }
});
const [googleFontsLoaded, setGoogleFontsLoaded] = useState<string[]>(() => {
  try { return JSON.parse(localStorage.getItem('ldd_google_fonts_loaded') || '[]'); } catch { return []; }
});
const [googleFontsQuery, setGoogleFontsQuery] = useState<string>('');
const [googleFontsBusy, setGoogleFontsBusy] = useState<boolean>(false);
const [googleFontsError, setGoogleFontsError] = useState<string | null>(null);
const [fontManagerOpen, setFontManagerOpen] = useState<boolean>(() => localStorage.getItem('ldd_font_manager_open') !== '0');
const [fontPreviewText, setFontPreviewText] = useState<string>(() => localStorage.getItem('ldd_font_preview_text') || 'The quick brown fox jumps over the lazy dog 123');

const [marquee, setMarquee] = useState<null | { x0: number; y0: number; x1: number; y1: number; additive: boolean }>(null);

  // Persist Google Fonts choices
  useEffect(() => {
    try { localStorage.setItem('ldd_google_fonts_loaded', JSON.stringify(googleFontsLoaded)); } catch {}
  }, [googleFontsLoaded]);

  // Persist selected Google Font
  useEffect(() => {
    try {
      if (googleFontsSelected?.family) localStorage.setItem('ldd_google_fonts_selected_family', googleFontsSelected.family);
    } catch {}
  }, [googleFontsSelected?.family]);


  // Re-inject CSS links for stored Google Fonts (e.g., after reload)
  useEffect(() => {
    for (const family of googleFontsLoaded) {
      const f = (family || '').trim();
      if (!f) continue;
      const id = `ldd-gf-${f.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
      if (!document.getElementById(id)) {
        const link = document.createElement('link');
        link.id = id;
        link.rel = 'stylesheet';
        link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(f).replace(/%20/g, '+')}&display=swap`;
        document.head.appendChild(link);
      }
    }
  }, [googleFontsLoaded]);

  // Fetch Google Fonts catalog (tries a CORS-friendly endpoint first)
useEffect(() => {
  if (!fontManagerOpen) return;
  if (googleFontsAll.length) return;

  let alive = true;
  (async () => {
    try {
      setGoogleFontsBusy(true);
      setGoogleFontsError(null);

      let entries: GoogleFontEntry[] | null = null;

      // 1) Preferred: google-webfonts-helper API (usually CORS-friendly)
      try {
        const res = await fetch('https://gwfh.mranftl.com/api/fonts?sort=alpha');
        const data = await res.json();
        if (Array.isArray(data)) {
          entries = data
            .map((f: any) => ({
              family: typeof f?.family === 'string' ? f.family.trim() : '',
              category: typeof f?.category === 'string' ? f.category : undefined,
              variants: Array.isArray(f?.variants) ? f.variants : undefined,
              subsets: Array.isArray(f?.subsets) ? f.subsets : undefined,
            }))
            .filter((f: any) => f.family)
            .sort((a: any, b: any) => a.family.localeCompare(b.family));
        }
      } catch {}

      // 2) Fallback: raw GitHub font index (CORS-friendly, large but reliable)
      if (!entries || !entries.length) {
        try {
          const res = await fetch('https://raw.githubusercontent.com/jonathantneal/google-fonts-complete/master/google-fonts.json', { cache: 'force-cache' });
          const data = await res.json();
          if (data && typeof data === 'object') {
            // Format: { "ABeeZee": { "category": "...", "variants": [...], "subsets": [...] }, ... }
            const out: GoogleFontEntry[] = [];
            for (const [family, meta] of Object.entries<any>(data)) {
              const f = (family || '').toString().trim();
              if (!f) continue;
              out.push({
                family: f,
                category: typeof meta?.category === 'string' ? meta.category : undefined,
                variants: Array.isArray(meta?.variants) ? meta.variants : undefined,
                subsets: Array.isArray(meta?.subsets) ? meta.subsets : undefined,
              });
            }
            entries = out.sort((a, b) => a.family.localeCompare(b.family));
          }
        } catch {}
      }

      // 3) Fallback: fonts.google.com metadata (often blocked by CORS depending on environment)
      if (!entries || !entries.length) {
        const res = await fetch('https://fonts.google.com/metadata/fonts');
        const raw = await res.text();
        const cleaned = raw.replace(/^\)\]\}'\s*/, ''); // anti-XSSI prefix
        const meta = JSON.parse(cleaned);
        const families = (meta?.familyMetadataList || [])
          .map((f: any) => (typeof f?.family === 'string' ? f.family.trim() : ''))
          .filter(Boolean);
        const unique = Array.from(new Set(families)).sort((a, b) => a.localeCompare(b));
        entries = unique.map((family) => ({ family }));
      }

      if (!alive) return;
      setGoogleFontsAll(entries || []);
      if (entries && entries.length) {
  const stored = (() => {
    try { return (localStorage.getItem('ldd_google_fonts_selected_family') || '').trim(); } catch { return ''; }
  })();
  if (stored) {
    const found = entries.find(e => (e.family || '').toLowerCase() === stored.toLowerCase());
    const chosen = found || entries[0];
    setGoogleFontsSelected(chosen);
    // Preload for preview immediately (no click required)
    previewGoogleFont(chosen.family);
  } else {
    const chosen = entries[0];
    setGoogleFontsSelected(chosen);
    // Preload for preview immediately (no click required)
    previewGoogleFont(chosen.family);
  }
}
    } catch (e: any) {
      console.error(e);
      if (alive) setGoogleFontsError('Could not load the Google Fonts list. (Network/CORS issue)');
    } finally {
      if (alive) setGoogleFontsBusy(false);
    }
  })();

  return () => { alive = false; };
}, [fontManagerOpen, googleFontsAll.length]);


  const injectGoogleFontLink = useCallback((family: string, prefix: string = 'ldd-gf') => {
  const f = (family || '').trim();
  if (!f) return;
  const id = `${prefix}-${f.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  if (!document.getElementById(id)) {
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(f).replace(/%20/g, '+')}&display=swap`;
    document.head.appendChild(link);
  }
}, []);

const ensureGoogleFontLoaded = useCallback((family: string) => {
  const f = (family || '').trim();
  if (!f) return;
  injectGoogleFontLink(f, 'ldd-gf');
  setGoogleFontsLoaded((prev) => (prev.includes(f) ? prev : [...prev, f]));
}, [injectGoogleFontLink]);

const previewGoogleFont = useCallback((family: string) => {
  const f = (family || '').trim();
  if (!f) return;
  // Load for preview without permanently "adding" it
  injectGoogleFontLink(f, 'ldd-gf-preview');
}, [injectGoogleFontLink]);

  // Auto-load the selected font for the preview pane (so it renders immediately without a click)
  useEffect(() => {
    if (!googleFontsSelected?.family) return;
    previewGoogleFont(googleFontsSelected.family);
  }, [googleFontsSelected?.family, previewGoogleFont]);

  const getGroupByMember = useCallback((id: string) => {
    return config.layout.groups?.find(g => g.memberIds.includes(id)) || null;
  }, [config.layout.groups]);

  const selectElement = useCallback((id: string, mode: 'replace' | 'toggle' | 'add' | 'keep' = 'replace') => {
    const group = getGroupByMember(id);
    const groupIds = group ? group.memberIds : [id];

    setSelectedId(id);
    setSelectedIds(prev => {
      if (mode === 'keep') return prev;
      if (mode === 'replace') return groupIds;
      if (mode === 'add') return Array.from(new Set([...prev, ...groupIds]));
      // toggle
      const allSelected = groupIds.every(gid => prev.includes(gid));
      if (allSelected) return prev.filter(x => !groupIds.includes(x));
      return Array.from(new Set([...prev, ...groupIds]));
    });
  }, [getGroupByMember]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const clearSelection = useCallback(() => {
    setSelectedId(null);
    setSelectedIds([]);
    setEditingId(null);
  }, []);
  const [snapLines, setSnapLines] = useState<{h: number[], v: number[]}>({ h: [], v: [] });
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [restoreModal, setRestoreModal] = useState(false);
  const [restoreChoiceMade, setRestoreChoiceMade] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

// Tips panel (docked on the right side of the editor viewport)
const TIPS_OPEN_KEY = 'ldd_pdfgen_tips_panel_open_v1';
const [tipsOpen, setTipsOpen] = useState<boolean>(() => {
  const v = localStorage.getItem(TIPS_OPEN_KEY);
  // Open by default (only respect stored value if present)
  return v == null ? true : v === '1';
});
const [tipsSection, setTipsSection] = useState<EditorTab | 'CANVAS'>(EditorTab.SOURCE);
  const [isSidebarMinimized, setIsSidebarMinimized] = useState(false);
  const [contextMenu, setContextMenu] = useState<null | {
    id: string;
    isExtra: boolean;
    anchorX: number;
    anchorY: number;
    openUp: boolean;
    left: number;
    top?: number;
    bottom?: number;
  }>(null);
  const [alignSubmenuOpen, setAlignSubmenuOpen] = useState(false);
  const [clipboard, setClipboard] = useState<any>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [savedPresets, setSavedPresets] = useState<{name: string, config: PDFConfig}[]>(() => {
  try {
    return JSON.parse(localStorage.getItem('lavender_presets') || '[]');
  } catch {
    return [];
  }
});


// Tips panel persistence + auto-section switching
  useEffect(() => {
    try { localStorage.setItem('ldd_font_manager_open', fontManagerOpen ? '1' : '0'); } catch {}
  }, [fontManagerOpen]);

  useEffect(() => {
    try { localStorage.setItem('ldd_font_preview_text', fontPreviewText); } catch {}
  }, [fontPreviewText]);

useEffect(() => {
  localStorage.setItem(TIPS_OPEN_KEY, tipsOpen ? '1' : '0');
}, [tipsOpen]);

useEffect(() => {
  // When the user changes the main editor tab, automatically switch the tips section too.
  setTipsSection(activeTab);
}, [activeTab]);


  // Close context menu on scroll/zoom/resize so it doesn't stay open while the viewport changes.
  useEffect(() => {
    if (!contextMenu) return;
    const close = () => {
      setContextMenu(null);
      setAlignSubmenuOpen(false);
    };

    // Capture phase so we close even if inner handlers stop propagation.
    window.addEventListener('wheel', close, { capture: true, passive: true } as any);
    window.addEventListener('scroll', close, { capture: true, passive: true } as any);
    window.addEventListener('resize', close, { passive: true } as any);
    window.addEventListener('orientationchange', close, { passive: true } as any);
    return () => {
      window.removeEventListener('wheel', close as any, true);
      window.removeEventListener('scroll', close as any, true);
      window.removeEventListener('resize', close as any);
      window.removeEventListener('orientationchange', close as any);
    };
  }, [contextMenu]);

  // --- AI Settings (per-user key stored locally) ---
  const [showSettings, setShowSettings] = useState(false);
  const [geminiKey, setGeminiKey] = useState(() => getStoredGeminiKey());
  const hasGeminiKey = Boolean((geminiKey || '').trim());
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [needsApiKey, setNeedsApiKey] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [restoreDontAsk, setRestoreDontAsk] = useState(false);

  // Appearance
  const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('lavender_theme') as any) || 'light');
  const effectiveConfig = config;

  const [zoom, setZoom] = useState(0.65);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [hasUserPanned, setHasUserPanned] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [isSpaceDown, setIsSpaceDown] = useState(false);
  const lastMousePos = useRef({ x: 0, y: 0 });

  const viewportRef = useRef<HTMLDivElement>(null);

  const [history, setHistory] = useState<PDFConfig[]>([INITIAL_CONFIG]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const watermarkInputRef = useRef<HTMLInputElement>(null);
  const extraImgInputRef = useRef<HTMLInputElement>(null);
  const sourceInputRef = useRef<HTMLInputElement>(null);
  const projectInputRef = useRef<HTMLInputElement>(null);

  // Helper to reliably check if an element is an extra layer
  const isExtraLayer = useCallback((id: string | null) => {
    if (!id) return false;
    return config.layout.extraLayers.some(l => l.id === id);
  }, [config.layout.extraLayers]);

  // Load logic
  useEffect(() => {
    const hidden = localStorage.getItem('lavender_welcome_hidden');
    if (!hidden) setShowOnboarding(true);

    const skipRestore = localStorage.getItem('lavender_restore_hidden');
    const savedWork = localStorage.getItem('lavender_autosave');
    if (savedWork && !skipRestore) setRestoreModal(true);
  }, []);

  // Ensure text blocks don't load with tiny boxes that clip content.
  useEffect(() => { setConfig(prev => autoFitStandardTextBlocks(prev)); }, []);

  // Auto-save logic

  // Auto-toggle socials visibility (show only when at least one social link is filled)
  useEffect(() => {
    const s = config.socials;
    const has = Boolean((s.facebook||'').trim() || (s.instagram||'').trim() || (s.etsy||'').trim() || (s.website||'').trim() || (s.shopify||'').trim() || (s.woo||'').trim());
    if (config.visibility.socials !== has) {
      setConfig(prev => ({ ...prev, visibility: { ...prev.visibility, socials: has } }));
    }
  }, [config.socials.facebook, config.socials.instagram, config.socials.etsy, config.socials.website, config.socials.shopify, config.socials.woo]);
  useEffect(() => {
    // If the "Resume Last Work" modal is open and the user hasn't chosen yet,
    // do NOT autosave the blank INITIAL_CONFIG over their real saved work.
    if (restoreModal && !restoreChoiceMade) return;

    const timer = setTimeout(() => {
      localStorage.setItem('lavender_autosave', JSON.stringify(config));
    }, 2000);
    return () => clearTimeout(timer);
  }, [config, restoreModal, restoreChoiceMade]);

  // Keep theme and auto-socials visibility in sync
  useEffect(() => {
    document.documentElement.classList.toggle('ldd-dark', theme === 'dark');
    localStorage.setItem('lavender_theme', theme);
  }, [theme]);

  // Keep the canvas centered until the user pans.
  useEffect(() => {
    if (hasUserPanned) return;
    const el = viewportRef.current;
    if (!el) return;

    const center = () => {
      const vw = el.clientWidth;
      const vh = el.clientHeight;
      const x = (vw - CANVAS_WIDTH * zoom) / 2;
      const y = (vh - CANVAS_HEIGHT * zoom) / 2;
      setOffset({ x, y });
    };

    center();
    window.addEventListener('resize', center);
    return () => window.removeEventListener('resize', center);
  }, [zoom, hasUserPanned]);

  // Deselect only when the user clicks the empty canvas background.
  // (We intentionally do NOT deselect on clicks in the UI, so the top toolbar
  // doesn't disappear when you interact with it.)


  const persistGeminiKey = useCallback(() => {
    const key = (geminiKey || '').trim();
    if (key) localStorage.setItem(LDD_GEMINI_KEY_STORAGE, key);
    else localStorage.removeItem(LDD_GEMINI_KEY_STORAGE);
  }, [geminiKey]);

  const ensureGeminiKey = useCallback(() => {
    const key = (geminiKey || '').trim();
    if (key) return true;
    setNeedsApiKey(true);
    return false;
  }, [geminiKey]);

  // Normalize older saved projects/autosaves to the current config shape.
  const normalizeLoadedConfig = useCallback((loaded: any): PDFConfig => {
    const deepMerge = (target: any, source: any) => {
      if (!source || typeof source !== 'object') return target;
      for (const k of Object.keys(source)) {
        const sv = source[k];
        if (sv && typeof sv === 'object' && !Array.isArray(sv)) {
          target[k] = deepMerge({ ...(target[k] || {}) }, sv);
        } else {
          target[k] = sv;
        }
      }
      return target;
    };

    const merged = deepMerge(JSON.parse(JSON.stringify(INITIAL_CONFIG)), loaded);

    // New: promoBg (independent promo background).
    if (!merged.colors) merged.colors = (JSON.parse(JSON.stringify(INITIAL_CONFIG.colors)) as any);
    if (!('promoBg' in merged.colors) || !merged.colors.promoBg) merged.colors.promoBg = merged.colors.accent;

    // syncAccent is deprecated; keep false.
    merged.colors.syncAccent = false;

    // Keep promo text color consistent with Button Text Color by default.
    if (merged.fonts?.blocks?.promo) merged.fonts.blocks.promo.color = merged.colors.buttonText;

    return merged as PDFConfig;
  }, []);

  const updateConfig = (path: string, value: any, record = true) => {
    setConfig(prev => {
      const newConfig = JSON.parse(JSON.stringify(prev));
      let current: any = newConfig;
      const keys = path.split('.');
      for (let i = 0; i < keys.length - 1; i++) { if (!current[keys[i]]) current[keys[i]] = {}; current = current[keys[i]]; }
      current[keys[keys.length - 1]] = value;

      // Keep "Button Text Color" consistent across the Download button AND the Promo block text.
      if (path === 'colors.buttonText') {
        if (!newConfig.fonts?.blocks?.promo) newConfig.fonts = { ...(newConfig.fonts || {}), blocks: { ...(newConfig.fonts?.blocks || {}), promo: { family: 'Inter', size: 18, align: 'center', color: value, bold: true } } } as any;
        else newConfig.fonts.blocks.promo.color = value;
      }
      if (record) {
        setHistory(prevHist => {
          const next = prevHist.slice(0, historyIndex + 1);
          next.push(JSON.parse(JSON.stringify(newConfig)));
          if (next.length > 50) next.shift();
          return next;
        });
        setHistoryIndex(prevIdx => Math.min(prevIdx + 1, 49));
      }
      return newConfig;
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'source' | 'logo' | 'watermark' | 'extra' | 'project') => {
    const file = e.target.files?.[0] || (e as any).dataTransfer?.files?.[0];
    if (!file) return;

    if (type === 'project') {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const loadedConfig = JSON.parse(event.target?.result as string);
          const normalized = normalizeLoadedConfig(loadedConfig);
          setConfig(normalized);
          setHistory([normalized]);
          setHistoryIndex(0);
        } catch (err) {
          alert('Failed to load project file. Invalid format.');
        }
      };
      reader.readAsText(file);
      return;
    }

    if (type === 'source') {
      setIsExtracting(true);
      updateConfig('source.fileName', file.name);
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        
        let extractedUrl = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const annotations = await page.getAnnotations();
          const link = annotations.find((ann: any) => ann.subtype === 'Link' && ann.url);
          if (link) {
            extractedUrl = link.url;
            break;
          }
        }
        
        if (extractedUrl) {
          updateConfig('source.link', extractedUrl);
          updateConfig('visibility.qr', true);
        } else {
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const text = textContent.items.map((item: any) => item.str).join(' ');
            const urlMatch = text.match(/https?:\/\/[^\s]+/);
            if (urlMatch) {
              extractedUrl = urlMatch[0];
              updateConfig('source.link', extractedUrl);
              updateConfig('visibility.qr', true);
              break;
            }
          }
        }
      } catch (err) {
        console.error("PDF operation failed", err);
      } finally {
        setIsExtracting(false);
      }
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const data = event.target?.result as string;
      if (type === 'logo') {
        updateConfig('assets.logo', data);
        updateConfig('visibility.logo', true);
      } else if (type === 'watermark') {
        updateConfig('assets.watermark', data);
        updateConfig('visibility.watermark', true);
      } else if (type === 'extra') {
        const newId = `img-${Date.now()}`;
        const newLayer: ExtraLayer = {
          id: newId, type: 'image', content: data, x: 200, y: 200, w: 200, h: 200, fontSize: 16, visible: true
        };
        updateConfig('layout.extraLayers', [...config.layout.extraLayers, newLayer]);
        setSelectedId(newId);
      }
    };
    reader.readAsDataURL(file);
  };

  const enhanceFieldWithGemini = useCallback(async (kind: 'title' | 'shortDesc' | 'mainDesc' | 'footer') => {
    if (!ensureGeminiKey()) return;
    setAiError(null);
    setAiBusy(true);
    try {
      const currentText = (config.content as any)[kind] || '';
      const updated = await enhancePdfCopy(kind, currentText);
      if (updated) updateConfig(`content.${kind}`, updated, true);
    } catch (err: any) {
      if (err instanceof MissingGeminiKeyError) {
        setNeedsApiKey(true);
      } else {
        setAiError(err?.message || 'AI request failed');
      }
    } finally {
      setAiBusy(false);
    }
  }, [config.content, ensureGeminiKey, updateConfig]);

  const handleSaveProject = () => {
    try {
      const blob = new Blob([JSON.stringify(config)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `lavender_project_${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 100);
    } catch (e) {
      alert("Project too large to save.");
    }
  };

  const handleSavePreset = () => {
    const name = prompt('Enter a name for this preset:');
    if (name) {
      const newPresets = [...savedPresets, { name, config: JSON.parse(JSON.stringify(config)) }];
      setSavedPresets(newPresets);
      localStorage.setItem('lavender_presets', JSON.stringify(newPresets));
    }
  };

  const handleLoadPreset = (presetConfig: PDFConfig) => {
    setConfig(JSON.parse(JSON.stringify(presetConfig)));
    setHistory([presetConfig]);
    setHistoryIndex(0);
  };

  const handleDeletePreset = (index: number) => {
    const newPresets = savedPresets.filter((_, i) => i !== index);
    setSavedPresets(newPresets);
    localStorage.setItem('lavender_presets', JSON.stringify(newPresets));
  };

	const readFileAsDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
	  const reader = new FileReader();
	  reader.onerror = () => reject(new Error('Failed to read file'));
	  reader.onload = () => resolve(String(reader.result));
	  reader.readAsDataURL(file);
	});

	const handleUploadFont = useCallback(async (file: File) => {
  if (!file) return;
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  if (!['ttf','otf','woff','woff2'].includes(ext)) return;
  const baseName = file.name.replace(/\.[^/.]+$/, '');
  const fontName = `${baseName}-${Date.now()}`;
  try {
	    const [data, dataUrl] = await Promise.all([file.arrayBuffer(), readFileAsDataUrl(file)]);
	    // @ts-ignore
	    const fontFace = new FontFace(fontName, data);
    await fontFace.load();
    // @ts-ignore
    document.fonts.add(fontFace);
	    // Persist the font so it works after refresh
	    try {
	      const existing: StoredFont[] = JSON.parse(localStorage.getItem(CUSTOM_FONTS_DATA_KEY) || '[]');
	      const next = [...(existing || []).filter(x => x?.name !== fontName), { name: fontName, dataUrl, uploadedAt: Date.now() }];
	      localStorage.setItem(CUSTOM_FONTS_DATA_KEY, JSON.stringify(next));
	    } catch {}
    setCustomFontFamilies(prev => {
      const next = prev.includes(fontName) ? prev : [...prev, fontName];
      try { localStorage.setItem('ldd_custom_fonts', JSON.stringify(next)); } catch {}
      return next;
    });
    // Apply to selected element if it supports fonts
    if (selectedId) {
      const isExtra = isExtraLayer(selectedId);
      if (isExtra) {
        updateConfig('layout.extraLayers', config.layout.extraLayers.map(l => l.id === selectedId ? { ...l, fontFamily: fontName } : l));
      } else {
        updateConfig(`fonts.blocks.${selectedId}.family`, fontName);
      }
    }
  } catch (e) {
    console.error('Font upload failed', e);
  }
}, [selectedId, config.layout.extraLayers, updateConfig]);

  const uninstallCustomFont = useCallback((fontName: string) => {
    if (!fontName) return;
    // Remove from name list
    setCustomFontFamilies(prev => {
      const next = (prev || []).filter(n => n !== fontName);
      try { localStorage.setItem('ldd_custom_fonts', JSON.stringify(next)); } catch {}
      return next;
    });
    // Remove stored font data
    try {
      const existing: StoredFont[] = JSON.parse(localStorage.getItem(CUSTOM_FONTS_DATA_KEY) || '[]');
      const next = (existing || []).filter(f => f?.name !== fontName);
      localStorage.setItem(CUSTOM_FONTS_DATA_KEY, JSON.stringify(next));
    } catch {}

    // Revert any blocks using this font back to global font (or Inter)
    const fallback = config.fonts?.global || 'Inter';
    const nextConfig: any = JSON.parse(JSON.stringify(config));
    try {
      const blocks = nextConfig.fonts?.blocks || {};
      for (const k of Object.keys(blocks)) {
        if (blocks[k]?.family === fontName) blocks[k].family = fallback;
      }
      // Extra layers
      nextConfig.layout.extraLayers = (nextConfig.layout.extraLayers || []).map((l: any) =>
        l?.fontFamily === fontName ? { ...l, fontFamily: fallback } : l
      );
    } catch {}
    setConfig(nextConfig);
  }, [config]);





  const handleAction = useCallback((action: string) => {
    const id = contextMenu?.id || selectedId;
    // Built-in blocks that should NOT be copyable/duplicable.
    // (Prevents accidental extra blocks and export weirdness.)
    const isNonCopyableBlock = id === 'button' || id === 'promo';
    if ((action === 'duplicate' || action === 'copy') && isNonCopyableBlock) return;

    const isExtra = contextMenu?.isExtra || isExtraLayer(selectedId);

    switch (action) {
      case 'paste':
        if (clipboard) {
          const newId = `${clipboard.type.slice(0, 3)}-${Date.now()}`;
          const newLayer = { 
            ...clipboard, 
            id: newId, 
            x: 200, 
            y: 200, 
            w: clipboard.w || 200, 
            h: clipboard.h || 40, 
            visible: true 
          };
          updateConfig('layout.extraLayers', [...config.layout.extraLayers, newLayer]);
          setSelectedId(newId);
        }
        break;
      case 'duplicate':
        if (id) {
          const original = config.layout.extraLayers.find(l => l.id === id);
          if (original) {
            updateConfig('layout.extraLayers', [...config.layout.extraLayers, { ...original, id: `${original.id.split('-')[0]}-copy-${Date.now()}`, x: original.x + 20, y: original.y + 20 }]);
          } else if (config.layout.blocks[id]) {
            const b = config.layout.blocks[id];
            const f = config.fonts.blocks[id];
            const c = (config.content as any)[id];
            updateConfig('layout.extraLayers', [...config.layout.extraLayers, { 
              id: `text-copy-${Date.now()}`, type: 'text', content: c || 'Copy', x: b.x + 20, y: b.y + 20, w: b.w, h: b.h, fontSize: f?.size || 16, visible: true, fontFamily: f?.family || 'Inter', align: f?.align || 'center', color: f?.color || '#000000' 
            }]);
          }
        }
        break;
      case 'toggle-bold':
        if (id) {
          if (isExtra) updateConfig('layout.extraLayers', config.layout.extraLayers.map(l => l.id === id ? { ...l, bold: !l.bold } : l));
          else updateConfig(`fonts.blocks.${id}.bold`, !config.fonts.blocks[id].bold);
        }
        break;
      case 'toggle-italic':
        if (id) {
          if (isExtra) updateConfig('layout.extraLayers', config.layout.extraLayers.map(l => l.id === id ? { ...l, italic: !l.italic } : l));
          else updateConfig(`fonts.blocks.${id}.italic`, !config.fonts.blocks[id].italic);
        }
        break;
      case 'toggle-underline':
        if (id) {
          if (isExtra) updateConfig('layout.extraLayers', config.layout.extraLayers.map(l => l.id === id ? { ...l, underline: !l.underline } : l));
          else updateConfig(`fonts.blocks.${id}.underline`, !config.fonts.blocks[id].underline);
        }
        break;
      case 'align-left':
      case 'align-center':
      case 'align-right':
      case 'space-h':
      case 'space-v': {
        // Align / distribute works on the current multi-selection (or the clicked item).
        const baseIds = (selectedIds && selectedIds.length)
          ? Array.from(new Set(selectedIds))
          : (id ? [id] : []);
        if (!baseIds.length) break;

        const groups = (config.layout.groups || []);
        const groupByMember = new Map<string, { id: string; memberIds: string[] }>();
        for (const g of groups) for (const mid of (g.memberIds || [])) groupByMember.set(mid, { id: g.id, memberIds: g.memberIds || [] });

        const getRect = (rid: string) => {
          const extra = config.layout.extraLayers.find(l => l.id === rid);
          if (extra) return { x: extra.x, y: extra.y, w: extra.w, h: extra.h, isExtra: true };
          const b = config.layout.blocks[rid];
          if (b) return { x: b.x, y: b.y, w: b.w, h: b.h, isExtra: false };
          return null;
        };

        // Coalesce selection into "units" so groups move/align as a single object.
        type Unit = { unitId: string; memberIds: string[]; rect: { x: number; y: number; w: number; h: number } };
        const unitsMap = new Map<string, Unit>();

        for (const rid of baseIds) {
          const g = groupByMember.get(rid);
          if (g) {
            if (!unitsMap.has(g.id)) {
              const rects = (g.memberIds || []).map(getRect).filter(Boolean) as any[];
              if (rects.length) {
                const minX = Math.min(...rects.map(r => r.x));
                const minY = Math.min(...rects.map(r => r.y));
                const maxX = Math.max(...rects.map(r => r.x + r.w));
                const maxY = Math.max(...rects.map(r => r.y + r.h));
                unitsMap.set(g.id, { unitId: g.id, memberIds: [...g.memberIds], rect: { x: minX, y: minY, w: (maxX - minX), h: (maxY - minY) } });
              }
            }
          } else {
            const r = getRect(rid);
            if (r) unitsMap.set(rid, { unitId: rid, memberIds: [rid], rect: { x: r.x, y: r.y, w: r.w, h: r.h } });
          }
        }

        const units = Array.from(unitsMap.values());
        if (!units.length) break;

        const nextBlocks = JSON.parse(JSON.stringify(config.layout.blocks));
        const nextExtras = config.layout.extraLayers.map(l => ({ ...l }));
        const setPos = (rid: string, x: number, y: number) => {
          const ix = nextExtras.findIndex(l => l.id === rid);
          if (ix >= 0) { nextExtras[ix].x = x; nextExtras[ix].y = y; return; }
          if (nextBlocks[rid]) { nextBlocks[rid].x = x; nextBlocks[rid].y = y; }
        };
        const moveMembers = (memberIds: string[], dx: number, dy: number) => {
          for (const mid of memberIds) {
            const r = getRect(mid);
            if (!r) continue;
            setPos(mid, r.x + dx, r.y + dy);
          }
        };

        if (action === 'align-left' || action === 'align-center' || action === 'align-right') {
          for (const u of units) {
            const targetX = action === 'align-left'
              ? 0
              : action === 'align-center'
                ? (CANVAS_WIDTH - u.rect.w) / 2
                : (CANVAS_WIDTH - u.rect.w);
            const dx = targetX - u.rect.x;
            moveMembers(u.memberIds, dx, 0);
          }
        }

        // Distribute spacing behaves like design tools: needs 3+ units to be meaningful.
        // Keeps the outer bounds defined by the selection span.
        if (action === 'space-h') {
          const sorted = units.slice().sort((a, b) => a.rect.x - b.rect.x);
          if (sorted.length >= 3) {
            const minX = Math.min(...sorted.map(u => u.rect.x));
            const maxX = Math.max(...sorted.map(u => u.rect.x + u.rect.w));
            const totalW = sorted.reduce((s, u) => s + u.rect.w, 0);
            const gap = (maxX - minX - totalW) / (sorted.length - 1);
            let cursor = minX;
            for (const u of sorted) {
              const dx = cursor - u.rect.x;
              moveMembers(u.memberIds, dx, 0);
              cursor += u.rect.w + gap;
            }
          }
        }

        if (action === 'space-v') {
          const sorted = units.slice().sort((a, b) => a.rect.y - b.rect.y);
          if (sorted.length >= 3) {
            const minY = Math.min(...sorted.map(u => u.rect.y));
            const maxY = Math.max(...sorted.map(u => u.rect.y + u.rect.h));
            const totalH = sorted.reduce((s, u) => s + u.rect.h, 0);
            const gap = (maxY - minY - totalH) / (sorted.length - 1);
            let cursor = minY;
            for (const u of sorted) {
              const dy = cursor - u.rect.y;
              moveMembers(u.memberIds, 0, dy);
              cursor += u.rect.h + gap;
            }
          }
        }

        updateConfig('layout', { ...config.layout, blocks: nextBlocks, extraLayers: nextExtras });
        break;
      }
      case 'font-inc':
        if (id) {
          if (isExtra) updateConfig('layout.extraLayers', config.layout.extraLayers.map(l => l.id === id ? { ...l, fontSize: l.fontSize + 2 } : l));
          else updateConfig(`fonts.blocks.${id}.size`, config.fonts.blocks[id].size + 2);
        }
        break;
      case 'font-dec':
        if (id) {
          if (isExtra) updateConfig('layout.extraLayers', config.layout.extraLayers.map(l => l.id === id ? { ...l, fontSize: Math.max(4, l.fontSize - 2) } : l));
          else updateConfig(`fonts.blocks.${id}.size`, Math.max(4, config.fonts.blocks[id].size - 2));
        }
        break;
      case 'copy':
        if (id) {
          const isExtraObj = isExtraLayer(id);
          const item = isExtraObj ? config.layout.extraLayers.find(l => l.id === id) : { 
            id, 
            type: 'text', 
            content: (config.content as any)[id] || 'New Text', 
            ...config.fonts.blocks[id],
            w: config.layout.blocks[id].w,
            h: config.layout.blocks[id].h
          };
          if (item) setClipboard(JSON.parse(JSON.stringify(item)));
        }
        break;
      case 'group':
        if (selectedIds.length >= 2) {
          const gid = `group-${Date.now()}`;
          const nextGroups = [...(config.layout.groups || []), { id: gid, name: `Group`, memberIds: [...selectedIds] }];
          updateConfig('layout.groups', nextGroups);
        }
        break;
      case 'ungroup':
        if (id) {
          const g = getGroupByMember(id);
          if (g) {
            updateConfig('layout.groups', (config.layout.groups || []).filter(x => x.id !== g.id));
          }
        }
        break;

case 'bringToFront':
case 'sendToBack':
case 'moveForward':
case 'moveBackward': {
  if (!id) break;
  const z = { ...(config.layout.zIndex || {}) };
  const values = Object.values(z);
  const maxZ = values.length ? Math.max(...(values as number[])) : 10;
  const minZ = values.length ? Math.min(...(values as number[])) : 10;
  const current = (z[id] ?? 10);
  if (action === 'bringToFront') z[id] = maxZ + 1;
  else if (action === 'sendToBack') z[id] = minZ - 1;
  else if (action === 'moveForward') z[id] = current + 1;
  else if (action === 'moveBackward') z[id] = current - 1;
  updateConfig('layout.zIndex', z);
  break;
}
case 'upload-font': {
  // triggers hidden file input
  setFontManagerOpen(true);
  break;
}

case 'delete':

        if (!editingId) {
          const ids = selectedIds.length ? selectedIds : (id ? [id] : []);
          if (ids.length) {
            // Remove extras in one pass
            const removeSet = new Set(ids);
            const nextExtras = config.layout.extraLayers.filter(l => !removeSet.has(l.id));
            if (nextExtras.length !== config.layout.extraLayers.length) updateConfig('layout.extraLayers', nextExtras);

            // Hide built-in blocks
            for (const bid of ids) {
              if (!isExtraLayer(bid) && config.visibility[bid] !== undefined) {
                updateConfig(`visibility.${bid}`, false, false);
              }
            }
          }
          clearSelection();
        }
        break;
    }
    setContextMenu(null);
    setAlignSubmenuOpen(false);
  }, [config, contextMenu, selectedId, selectedIds, clipboard, editingId, isExtraLayer, clearSelection, getGroupByMember]);

  useEffect(() => { 
    const handleKeyDown = (e: KeyboardEvent) => {
      if (editingId) return;
	      if (e.key === 'Escape') {
	        clearSelection();
	        setEditingId(null);
	        setContextMenu(null);
	        setAlignSubmenuOpen(false);
	        return;
	      }
      if (e.code === 'Space') { if ((e.target as HTMLElement).tagName !== 'INPUT' && (e.target as HTMLElement).tagName !== 'TEXTAREA') { e.preventDefault(); setIsSpaceDown(true); } }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA' && !target.isContentEditable && !contextMenu) handleAction('delete');
      }
      if (e.ctrlKey || e.metaKey) {
	        if (e.key.toLowerCase() === 'g') {
	          e.preventDefault();
	          handleAction(e.shiftKey ? 'ungroup' : 'group');
	        }
        if (e.key === 'c') { e.preventDefault(); handleAction('copy'); }
        if (e.key === 'v') { e.preventDefault(); handleAction('paste'); }
        if (e.key === 'z') { e.preventDefault(); undo(); }
        if (e.key === 'y') { e.preventDefault(); redo(); }
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => { if (e.code === 'Space') setIsSpaceDown(false); };
    window.addEventListener('keydown', handleKeyDown); window.addEventListener('keyup', handleKeyUp);
    return () => { window.removeEventListener('keydown', handleKeyDown); window.removeEventListener('keyup', handleKeyUp); };
  }, [selectedId, clipboard, handleAction, contextMenu, editingId]);

  const undo = () => { if (historyIndex > 0) { const nextIdx = historyIndex - 1; setHistoryIndex(nextIdx); setConfig(history[nextIdx]); } };
  const redo = () => { if (historyIndex < history.length - 1) { const nextIdx = historyIndex + 1; setHistoryIndex(nextIdx); setConfig(history[nextIdx]); } };
  const handleScroll = (e: React.WheelEvent) => { const delta = e.deltaY; const zoomFactor = 1.05; const newZoom = delta > 0 ? zoom / zoomFactor : zoom * zoomFactor; setZoom(Math.max(0.1, Math.min(newZoom, 5))); };
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (isSpaceDown || e.button === 1) {
      setIsPanning(true);
      lastMousePos.current = { x: e.clientX, y: e.clientY };
    }
  };
  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      const dx = e.clientX - lastMousePos.current.x;
      const dy = e.clientY - lastMousePos.current.y;
      if (!hasUserPanned && (Math.abs(dx) + Math.abs(dy) > 0.5)) setHasUserPanned(true);
      setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      lastMousePos.current = { x: e.clientX, y: e.clientY };
    }
  };
  const handleCanvasMouseUp = () => setIsPanning(false);

  const beginMarqueeFromClient = useCallback((clientX: number, clientY: number, additive: boolean) => {
    const r = canvasRef.current?.getBoundingClientRect();
    if (!r) return;
    const x = (clientX - r.left) / zoom;
    const y = (clientY - r.top) / zoom;
    const cx = Math.max(0, Math.min(x, CANVAS_WIDTH));
    const cy = Math.max(0, Math.min(y, CANVAS_HEIGHT));
    setMarquee({ x0: cx, y0: cy, x1: cx, y1: cy, additive });
  }, [zoom]);

  // marquee selection listeners
  useEffect(() => {
    if (!marquee) return;

    const getCanvasPoint = (clientX: number, clientY: number) => {
      const r = canvasRef.current?.getBoundingClientRect();
      if (!r) return null;
      const x = (clientX - r.left) / zoom;
      const y = (clientY - r.top) / zoom;
      return { x: Math.max(0, Math.min(x, CANVAS_WIDTH)), y: Math.max(0, Math.min(y, CANVAS_HEIGHT)) };
    };

    const rectIntersects = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) => {
      return !(a.x + a.w < b.x || b.x + b.w < a.x || a.y + a.h < b.y || b.y + b.h < a.y);
    };

    const onMove = (e: MouseEvent) => {
      const pt = getCanvasPoint(e.clientX, e.clientY);
      if (!pt) return;
      setMarquee(m => (m ? { ...m, x1: pt.x, y1: pt.y } : m));
    };

    const onUp = (e: MouseEvent) => {
      const pt = getCanvasPoint(e.clientX, e.clientY);
      if (!pt) {
        setMarquee(null);
        return;
      }

      const sel = {
        x: Math.min(marquee.x0, pt.x),
        y: Math.min(marquee.y0, pt.y),
        w: Math.abs(pt.x - marquee.x0),
        h: Math.abs(pt.y - marquee.y0),
      };

      // Ignore micro-drags; treat as background click.
      if (sel.w < 3 && sel.h < 3) {
        if (!marquee.additive) clearSelection();
        setMarquee(null);
        return;
      }

      const hits: string[] = [];

      // Blocks
      for (const [id, b] of Object.entries(config.layout.blocks)) {
        // Treat undefined as visible; only skip when explicitly hidden.
        if ((config.visibility as any)[id] === false) continue;
        if (!b) continue;
        if (rectIntersects({ x: b.x, y: b.y, w: b.w, h: b.h }, sel)) hits.push(id);
      }

      // Extras
      for (const l of config.layout.extraLayers) {
        if (!l.visible) continue;
        if (rectIntersects({ x: l.x, y: l.y, w: l.w, h: l.h }, sel)) hits.push(l.id);
      }

      // Expand groups
      const expanded = new Set(hits);
      for (const hid of Array.from(expanded)) {
        const g = getGroupByMember(hid);
        if (g) g.memberIds.forEach(mid => expanded.add(mid));
      }
      const finalHits = Array.from(expanded);

      setSelectedIds(prev => {
        const base = marquee.additive ? prev : [];
        const next = Array.from(new Set([...base, ...finalHits]));
        return next;
      });
      if (finalHits.length) setSelectedId(finalHits[finalHits.length - 1]);
      else if (!marquee.additive) setSelectedId(null);

      setMarquee(null);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [marquee, zoom, config.layout.blocks, config.layout.extraLayers, config.visibility, clearSelection, getGroupByMember]);

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
    setAlignSubmenuOpen(false);
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent, id: string, isExtra: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    setAlignSubmenuOpen(false);

    const PAD = 10;
    const MENU_W = 256;
    const MENU_H = id === 'canvas' ? 150 : 250; // estimated; we clamp just in case

    const anchorX = e.clientX;
    const anchorY = e.clientY;

    // Horizontal clamp
    let left = anchorX;
    left = Math.min(left, window.innerWidth - MENU_W - PAD);
    left = Math.max(PAD, left);

    // Vertical flip + clamp
    const spaceBelow = window.innerHeight - anchorY;
    const openUp = spaceBelow < MENU_H + PAD;

    if (openUp) {
      let bottom = window.innerHeight - anchorY;
      // keep within top padding too
      bottom = Math.min(bottom, window.innerHeight - PAD - MENU_H);
      bottom = Math.max(PAD, bottom);
      setContextMenu({ id, isExtra, anchorX, anchorY, openUp, left, bottom });
    } else {
      let top = anchorY;
      top = Math.min(top, window.innerHeight - PAD - MENU_H);
      top = Math.max(PAD, top);
      setContextMenu({ id, isExtra, anchorX, anchorY, openUp, left, top });
    }
  }, []);

  const hexNoHash = (hex: string) => (hex || '').replace('#','').trim() || '475569';

  const activeSocialLinks = useMemo(() => {
    return [
      { id: 'facebook', icon: Facebook, link: config.socials.facebook },
      { id: 'instagram', icon: Instagram, link: config.socials.instagram },
      { id: 'etsy', icon: ShoppingBag, link: config.socials.etsy },
      { id: 'website', icon: Globe, link: config.socials.website },
      { id: 'shopify', icon: Store, link: config.socials.shopify }
    ].filter(s => !!s.link);
  }, [config.socials]);


  const validateBeforeExport = (cfg: PDFConfig) => {
    const warnings: string[] = [];

    // Link sanity
    const hasMdFile = cfg.source?.mode === 'upload' && !!cfg.source?.fileName;
    const link = (cfg.source?.link || '').trim();
    if (!hasMdFile && !link) warnings.push("No download link detected. Upload your MyDesigns Download.pdf or paste a link.");

    // Basic text overflow check (approx)
    const ids = ['title','shortDesc','mainDesc','footer','socials'] as const;
    for (const id of ids) {
      if (!(cfg.visibility as any)[id]) continue;
      const b = (cfg.layout.blocks as any)[id];
      const f = (cfg.fonts.blocks as any)[id];
      if (!b || !f) continue;
      const weight = f.bold ? 800 : 600;
      const style = f.italic ? 'italic' : 'normal';
      const font = `${style} ${weight} ${f.size}px ${f.family || cfg.fonts.global || 'Inter'}`;
      const t = ((cfg.content as any)[id] || '').toString();
      const measured = measureTextBox(t, font, b.w || 1, 16, 1.25);
      if (measured.height > (b.h || 0)) warnings.push(`“${id}” may overflow (box is too short). Try making the text box taller.`);
    }

    // Promo overflow check
    if (cfg.visibility.promo && cfg.promo?.enabled) {
      const b = (cfg.layout.blocks as any).promo;
      const f = (cfg.fonts.blocks as any).promo;
      if (b && f) {
        const weight = f.bold ? 800 : 600;
        const style = f.italic ? 'italic' : 'normal';
        const font = `${style} ${weight} ${f.size}px ${f.family || cfg.fonts.global || 'Inter'}`;
        const t = `${cfg.promo.title || ''}\n${cfg.promo.code || ''}\n${cfg.promo.description || ''}${cfg.promo.expiry ? `\n${cfg.promo.expiry}` : ''}`;
        const measured = measureTextBox(t, font, b.w || 1, 16, 1.25);
        if (measured.height > (b.h || 0)) warnings.push("Promo text may overflow. Make the promo box taller or reduce font size.");
      }
    }

    return warnings;
  };

  const [exportWarnings, setExportWarnings] = useState<string[] | null>(null);
  // One-shot bypass for export warnings. Must be a ref (not state) so "Export Anyway"
  // cannot immediately re-trigger the same modal due to async state updates.
  const bypassWarningsRef = useRef(false);
  const [dontShowExportWarnings, setDontShowExportWarnings] = useState<boolean>(() => localStorage.getItem('ldd_hide_export_warnings') === '1');
  const [pendingPreviewExport, setPendingPreviewExport] = useState<boolean | null>(null);
	  // Export rename modal (white card)
	  const pendingPdfRef = useRef<any>(null);
	  const [renameModalOpen, setRenameModalOpen] = useState(false);
	  const [renameDefault, setRenameDefault] = useState('export.pdf');
	  const [renameValue, setRenameValue] = useState('');

  
  // --- Export font stabilization ---
  // html2canvas can capture before custom fonts finish loading, which causes kerning/spacing glitches (especially script fonts).
  // Export helpers: foreignObjectRendering improves script-font kerning, but can produce white captures
// if any image/CSS is incompatible. We detect that and fall back automatically.
const isCanvasMostlyBlank = (c: HTMLCanvasElement) => {
  try {
    const ctx = c.getContext('2d');
    if (!ctx) return true;
    const w = c.width, h = c.height;
    if (!w || !h) return true;
    const xs = [0, Math.floor(w*0.25), Math.floor(w*0.5), Math.floor(w*0.75), w-1].filter(x => x >= 0 && x < w);
    const ys = [0, Math.floor(h*0.25), Math.floor(h*0.5), Math.floor(h*0.75), h-1].filter(y => y >= 0 && y < h);
    let nonEmpty = 0;
    for (const y of ys) for (const x of xs) {
      const d = ctx.getImageData(x, y, 1, 1).data;
      // Any non-transparent, non-white pixel counts as content.
      if (d[3] > 0 && !(d[0] === 255 && d[1] === 255 && d[2] === 255)) nonEmpty++;
    }
    return nonEmpty === 0;
  } catch {
    return true;
  }
};

const renderElementForExport = async (el: HTMLElement, bg: string) => {
  const baseOpts: any = {
    useCORS: true,
    scale: 2,
    backgroundColor: bg,
    letterRendering: false,
  };

  try {
    const c1 = await html2canvas(el, { ...baseOpts, foreignObjectRendering: true });
    if (!isCanvasMostlyBlank(c1)) return c1;
  } catch {
    // fall through
  }

  // Fallback path (more compatible)
  return await html2canvas(el, { ...baseOpts, foreignObjectRendering: false });
};

  const ensureFontsLoadedForExport = async () => {
    try {
      const families = new Set<string>();
      const safeAdd = (v: any) => {
        const s = (v || '').toString().trim();
        if (!s) return;
        families.add(s.replace(/^['"]|['"]$/g, ''));
      };

      safeAdd((config.fonts as any)?.global);
      const blocks = (config.fonts as any)?.blocks || {};
      Object.values(blocks).forEach((f: any) => safeAdd(f?.family));
      (config.layout?.extraLayers || []).forEach((l: any) => safeAdd(l?.fontFamily));

      // Kick the browser into actually loading fonts we're about to screenshot.
      const loaders: Promise<any>[] = [];
      families.forEach(f => {
        // Trigger multiple style/weight variants; export capture is sensitive to late font metric swaps.
        // @ts-ignore
        loaders.push(document.fonts.load(`normal 16px "${f}"`, 'AaBbCcDdEeFf 0123456789'));
        // @ts-ignore
        loaders.push(document.fonts.load(`bold 16px "${f}"`, 'AaBbCcDdEeFf 0123456789'));
        // @ts-ignore
        loaders.push(document.fonts.load(`italic 16px "${f}"`, 'AaBbCcDdEeFf 0123456789'));
        // @ts-ignore
        loaders.push(document.fonts.load(`italic bold 16px "${f}"`, 'AaBbCcDdEeFf 0123456789'));
        // Also load at typical headline/button sizes
        // @ts-ignore
        loaders.push(document.fonts.load(`normal 28px "${f}"`, 'Download Now'));
        // @ts-ignore
        loaders.push(document.fonts.load(`bold 28px "${f}"`, 'Download Now'));
        // @ts-ignore
        loaders.push(document.fonts.load(`italic 28px "${f}"`, 'Download Now'));
      });

      await Promise.allSettled(loaders);
      // @ts-ignore
      await document.fonts.ready;
    } catch {
      // If fonts API isn't available, we still export — just without the stabilization.
    }
  };


  // --- Export-only text overlay for the download button ---
  // html2canvas can mis-measure text metrics (especially script fonts), causing labels to look off-center in the exported PDF.
  // For export, we temporarily replace the button label with a canvas-rendered image whose text is centered via canvas APIs.
  const applyButtonLabelExportOverlay = async (): Promise<null | (() => void)> => {
    try {
      const btnBlock = document.querySelector('[data-ldd-block="button"]') as HTMLElement | null;
      if (!btnBlock) return null;

      const labelEl = btnBlock.querySelector('[data-ldd-button-label="1"]') as HTMLElement | null;
      if (!labelEl) return null;

      // Use offset sizes (layout sizes) for stability; getBoundingClientRect can be fractional under zoom/transform.
      const w = btnBlock.offsetWidth;
      const h = btnBlock.offsetHeight;
      if (w < 2 || h < 2) return null;

      // High-res overlay so it stays crisp after html2canvas capture.
      const SCALE = 4;
      const c = document.createElement('canvas');
      c.width = Math.max(1, w * SCALE);
      c.height = Math.max(1, h * SCALE);
      const ctx = c.getContext('2d');
      if (!ctx) return null;

      const cs = window.getComputedStyle(labelEl);
      const fontStyle = cs.fontStyle || 'normal';
      const fontWeight = cs.fontWeight || '400';
      const fontFamily = cs.fontFamily || 'sans-serif';
      const fontSize = parseFloat(cs.fontSize || '24');
      const fill = cs.color || '#ffffff';
      const text = (labelEl.textContent || 'Download Now').trim();

      // Extra safety: ensure the exact face is resolved before drawing.
      try {
        // @ts-ignore
        if (document.fonts && document.fonts.load) {
          // Load a few variants to avoid late face swaps (script fonts are notorious).
          // @ts-ignore
          await Promise.allSettled([
            document.fonts.load(`${fontStyle} ${fontWeight} ${Math.max(10, Math.round(fontSize))}px ${fontFamily}`, text),
            document.fonts.load(`normal 400 ${Math.max(10, Math.round(fontSize))}px ${fontFamily}`, text),
            document.fonts.load(`italic 400 ${Math.max(10, Math.round(fontSize))}px ${fontFamily}`, text),
            document.fonts.load(`normal 700 ${Math.max(10, Math.round(fontSize))}px ${fontFamily}`, text),
          ]);
          // @ts-ignore
          await document.fonts.ready;
        }
      } catch {
        // proceed anyway
      }

      // Draw in CSS pixel space (scale up canvas for fidelity).
      ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic'; // we'll compute baseline manually
      ctx.fillStyle = fill;
      ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;

      // True visual centering using font metrics when available.
      const metrics = ctx.measureText(text);
      const ascent = (metrics as any).actualBoundingBoxAscent ?? fontSize * 0.8;
      const descent = (metrics as any).actualBoundingBoxDescent ?? fontSize * 0.2;

      const x = w / 2;
      const y = (h + ascent - descent) / 2;

      ctx.fillText(text, x, y);

      const img = document.createElement('img');
      img.src = c.toDataURL('image/png');
      img.alt = text;
      img.style.position = 'absolute';
      img.style.left = '0';
      img.style.top = '0';
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.pointerEvents = 'none';
      img.style.zIndex = '5';

      // Prevent export-time clipping caused by border-radius + overflow hidden masking (html2canvas).
      const prevOverflow = btnBlock.style.overflow;
      const prevRadius = btnBlock.style.borderRadius;
      btnBlock.style.overflow = 'visible';
      btnBlock.style.borderRadius = '0';

      const prevVisibility = labelEl.style.visibility;
      labelEl.style.visibility = 'hidden';
      btnBlock.appendChild(img);

      return () => {
        try {
          img.remove();
          labelEl.style.visibility = prevVisibility;
          btnBlock.style.overflow = prevOverflow;
          btnBlock.style.borderRadius = prevRadius;
        } catch {}
      };
    } catch {
      return null;
    }
  
  };

  // --- Export-only overlays for custom/script-font text blocks ---
  // html2canvas can mangle kerning/spacing for some custom/script fonts. For export, we temporarily replace
  // the live text with a canvas-rendered image that uses the browser's text rasterizer (more reliable).
  const applyCustomFontTextExportOverlays = async (): Promise<null | (() => void)> => {
    try {
      const root = document.getElementById('pdf-canvas') as HTMLElement | null;
      if (!root) return null;

      const SAFE_FONTS = new Set([
        'inter', 'arial', 'helvetica', 'sans-serif', 'serif', 'monospace', 'system-ui', 'ui-sans-serif', 'ui-serif', 'ui-monospace',
        'segoe ui', 'roboto', 'times new roman', 'georgia', 'courier new'
      ]);

      const cleanups: Array<() => void> = [];

      const parsePx = (v: string) => {
        const n = parseFloat((v || '0').toString());
        return Number.isFinite(n) ? n : 0;
      };

      const getPrimaryFamily = (ff: string) => {
        const s = (ff || '').split(',')[0] || '';
        return s.trim().replace(/^['"]|['"]$/g, '').toLowerCase();
      };

      const drawWrapped = (ctx: CanvasRenderingContext2D, text: string, boxW: number, boxH: number, padL: number, padT: number, padR: number, padB: number, align: 'left'|'center'|'right', lineHeight: number) => {
        const maxW = Math.max(1, boxW - padL - padR);
        const maxH = Math.max(1, boxH - padT - padB);

        const paragraphs = (text || '').replace(/\r\n/g, '\n').split('\n');

        const linesOut: string[] = [];
        for (const p of paragraphs) {
          const words = (p || '').split(/\s+/).filter(Boolean);
          if (!words.length) {
            linesOut.push('');
            continue;
          }
          let line = words[0];
          for (let i = 1; i < words.length; i++) {
            const test = line + ' ' + words[i];
            if (ctx.measureText(test).width <= maxW) {
              line = test;
            } else {
              linesOut.push(line);
              line = words[i];
            }
          }
          linesOut.push(line);
        }

        // Vertical centering: keep the same visual "centered block" feel for most of your text areas.
        const totalH = linesOut.length * lineHeight;
        let y = padT + Math.max(0, (maxH - totalH) / 2) + lineHeight * 0.85;

        for (const line of linesOut) {
          let x = padL;
          if (align === 'center') x = padL + maxW / 2;
          if (align === 'right') x = padL + maxW;
          ctx.textAlign = align;
          ctx.fillText(line, x, y);
          y += lineHeight;
          if (y > boxH - padB) break;
        }
      };

      // Candidate elements: leaf-ish blocks with text content inside the export canvas.
      const candidates = Array.from(root.querySelectorAll('div, span, p')) as HTMLElement[];

      for (const el of candidates) {
        // Ignore if it contains other element nodes (we only want simple text containers)
        const hasElementChildren = Array.from(el.childNodes).some(n => n.nodeType === 1);
        if (hasElementChildren) continue;

        const text = (el.innerText || '').trim();
        if (!text) continue;

        const cs = window.getComputedStyle(el);
        const primary = getPrimaryFamily(cs.fontFamily);
        if (!primary || SAFE_FONTS.has(primary)) continue;

        // Skip super tiny or hidden stuff
        if (el.offsetWidth < 10 || el.offsetHeight < 10) continue;
        if (cs.visibility === 'hidden' || cs.display === 'none' || cs.opacity === '0') continue;

        const w = el.offsetWidth;
        const h = el.offsetHeight;

        // Prepare canvas
        const c = document.createElement('canvas');
        const scale = 2;
        c.width = Math.max(1, Math.round(w * scale));
        c.height = Math.max(1, Math.round(h * scale));

        const ctx = c.getContext('2d');
        if (!ctx) continue;

        ctx.scale(scale, scale);
        ctx.clearRect(0, 0, w, h);

        const fontSize = parsePx(cs.fontSize) || 16;
        const fontStyle = (cs.fontStyle || 'normal');
        const fontWeight = (cs.fontWeight || '400');
        const fontFamily = cs.fontFamily || 'sans-serif';
        ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
        ctx.fillStyle = cs.color || '#000000';

        // Make sure font is loaded at the actual size we're drawing
        try {
          // @ts-ignore
          await Promise.race([
            document.fonts.load(`${fontStyle} ${fontWeight} ${Math.max(10, Math.round(fontSize))}px ${fontFamily}`, text),
            new Promise(r => setTimeout(r, 500))
          ]);
        } catch {}

        const padL = parsePx(cs.paddingLeft);
        const padT = parsePx(cs.paddingTop);
        const padR = parsePx(cs.paddingRight);
        const padB = parsePx(cs.paddingBottom);

        const lhRaw = cs.lineHeight;
        const lineHeight = lhRaw && lhRaw !== 'normal' ? parsePx(lhRaw) : Math.round(fontSize * 1.2);

        const align = (cs.textAlign === 'right' ? 'right' : cs.textAlign === 'center' ? 'center' : 'left') as any;

        // For single-line-ish blocks, do metric-based vertical centering (better for script fonts).
        const singleLine = el.scrollHeight <= (lineHeight * 1.6);
        if (singleLine) {
          ctx.textAlign = align;
          const metrics = ctx.measureText(text);
          const ascent = (metrics as any).actualBoundingBoxAscent ?? fontSize * 0.8;
          const descent = (metrics as any).actualBoundingBoxDescent ?? fontSize * 0.2;

          let x = padL;
          const maxW = Math.max(1, w - padL - padR);
          if (align === 'center') x = padL + maxW / 2;
          if (align === 'right') x = padL + maxW;

          const y = (h + padT - padB + ascent - descent) / 2;
          ctx.fillText(text, x, y);
        } else {
          drawWrapped(ctx, text, w, h, padL, padT, padR, padB, align, lineHeight);
        }

        const img = document.createElement('img');
        img.src = c.toDataURL('image/png');
        img.alt = text;
        img.style.position = 'absolute';
        img.style.left = '0';
        img.style.top = '0';
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.pointerEvents = 'none';
        img.style.zIndex = '50';

        // Ensure overlay positions correctly
        const prevPos = el.style.position;
        if (!prevPos || prevPos === 'static') el.style.position = 'relative';

        const prevColor = el.style.color;
        const prevWebkitFill = (el.style as any).webkitTextFillColor;
        const prevTextShadow = el.style.textShadow;

        el.style.color = 'transparent';
        (el.style as any).webkitTextFillColor = 'transparent';
        el.style.textShadow = 'none';

        el.appendChild(img);

        cleanups.push(() => {
          try {
            img.remove();
            el.style.color = prevColor;
            (el.style as any).webkitTextFillColor = prevWebkitFill;
            el.style.textShadow = prevTextShadow;
            el.style.position = prevPos;
          } catch {}
        });
      }

      if (!cleanups.length) return null;

      return () => {
        try { cleanups.forEach(fn => fn()); } catch {}
      };
    } catch {
      return null;
    }
  };

  const handleExportPDF = async (preview: boolean) => {
    if (!bypassWarningsRef.current) {
      const warnings = dontShowExportWarnings ? [] : validateBeforeExport(config);
      if (warnings.length) {
        setExportWarnings(warnings);
        setPendingPreviewExport(preview);
        return;
      }
    }
    // Reset bypass after a successful confirmation.
    if (bypassWarningsRef.current) bypassWarningsRef.current = false;


    const canvas = document.getElementById('pdf-canvas');

    if (!canvas) return;
    const originalTransform = canvas.style.transform;
    canvas.style.transform = 'scale(1)';
    let cleanupButtonOverlay: null | (() => void) = null;
    let cleanupCustomTextOverlays: null | (() => void) = null;
    try {
      await ensureFontsLoadedForExport();
      cleanupButtonOverlay = await applyButtonLabelExportOverlay();
      cleanupCustomTextOverlays = await applyCustomFontTextExportOverlays();


      // Give layout a couple frames to settle after font loads (prevents last-millisecond metric shifts)
      await new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r())));
      await new Promise(r => setTimeout(r, 200));

      let capture: any = null;
      try {
        // Prefer foreignObjectRendering: it leverages the browser's native text layout (much more reliable for custom/script fonts).
        capture = await renderElementForExport(canvas, config.colors.background);
        } catch (e) {
        // Fallback to the default renderer if foreignObject mode fails (usually due to an asset taint/CORS edge case).
        capture = await html2canvas(canvas, {
          useCORS: true,
          scale: 2,
          backgroundColor: config.colors.background,
          foreignObjectRendering: false,
          letterRendering: false,
        } as any);
      }
      const imgData = capture.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: config.paper.orientation === 'portrait' ? 'p' : 'l', unit: 'pt', format: config.paper.size === 'US Letter' ? 'letter' : 'a4' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      const scaleX = pdfWidth / CANVAS_WIDTH;
      const scaleY = pdfHeight / CANVAS_HEIGHT;

      if (config.visibility.button && config.source.link) {
        const b = config.layout.blocks.button;
        pdf.link(b.x * scaleX, b.y * scaleY, b.w * scaleX, b.h * scaleY, { url: config.source.link });
      }
      if (config.visibility.qr && config.source.link) {
        const qr = config.layout.blocks.qr;
        pdf.link(qr.x * scaleX, qr.y * scaleY, qr.w * scaleX, qr.h * scaleY, { url: config.source.link });
      }

      // Add links for socials
      if (config.visibility.socials && activeSocialLinks.length > 0) {
        const sb = config.layout.blocks.socials;
        const linkSpacing = sb.w / activeSocialLinks.length;
        activeSocialLinks.forEach((social, i) => {
          const xOffset = i * linkSpacing;
          pdf.link((sb.x + xOffset) * scaleX, sb.y * scaleY, linkSpacing * scaleX, sb.h * scaleY, { url: social.link });
        });
      }

	      if (preview) {
	        window.open(pdf.output('bloburl'), '_blank');
	      } else {
	        const defaultName = `${(config.content.title || 'export').replace(/\s+/g, '_')}.pdf`;
	        pendingPdfRef.current = pdf;
	        setRenameDefault(defaultName);
	        setRenameValue(defaultName);
	        setRenameModalOpen(true);
	      }
    } catch (err) { console.error('Export failed:', err); } finally {
      try { cleanupButtonOverlay?.(); } catch {}
      canvas.style.transform = originalTransform;
    }
  };

  const getQRUrl = () => {
     const data = config.source.link || 'https://lavenderdragondesign.app';
     return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(data)}&color=${config.colors.qrColor.replace('#', '')}&bgcolor=${config.colors.qrBgColor.replace('#', '')}`;
  };

  const activeElementProps = selectedId ? (() => {
    const isExtra = isExtraLayer(selectedId);
    const target = isExtra ? config.layout.extraLayers.find(l => l.id === selectedId) : null;
    const isText = isExtra ? (target?.type === 'text') : (['title', 'shortDesc', 'mainDesc', 'footer', 'promo', 'socials', 'button'].includes(selectedId));
    return { isExtra, target, isText };
  })() : null;

  const canManageFonts = Boolean(activeElementProps?.isText);

  const renderTabContent = () => {
    switch (activeTab) {
      case EditorTab.SOURCE:
        return (
          <div className="space-y-6">
            <h3 className="text-sm font-black text-slate-900 uppercase">Project Source</h3>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {[
                { id: 'upload', icon: Upload, label: 'Upload' },
                { id: 'link', icon: LinkIcon2, label: 'Manual' },
                { id: 'drive', icon: HardDrive, label: 'G-Drive' },
                { id: 'one', icon: Cloud, label: 'OneDrive' },
                { id: 'shopify', icon: ShopifyIcon, label: 'Shopify' }
              ].map(mode => (
                <button 
                  key={mode.id}
                  onClick={() => updateConfig('source.mode', mode.id)}
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${config.source.mode === mode.id ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-100 text-slate-900 hover:border-slate-200'}`}
                >
                  <mode.icon size={18} />
                  <span className="text-[9px] font-black">{mode.label}</span>
                </button>
              ))}
            </div>
            <div className="pt-4 border-t border-slate-100">
               {config.source.mode === 'upload' ? (
                 <>
                   <div onClick={() => sourceInputRef.current?.click()} className="border-4 border-dashed border-slate-200 p-10 rounded-3xl flex flex-col items-center gap-3 cursor-pointer hover:border-indigo-400 transition-all bg-white hover:bg-indigo-50/20 group relative">
                     {isExtracting ? <Loader2 size={40} className="text-indigo-600 animate-spin" /> : <Upload size={40} className="text-slate-400 group-hover:text-indigo-600 transition-colors" />}
                     <p className="text-[10px] font-black text-slate-900 text-center group-hover:text-indigo-600 transition-colors">{config.source.fileName || 'Click here to upload MD download.pdf'}</p>
                     <input type="file" ref={sourceInputRef} hidden accept=".pdf" onChange={e => handleFileUpload(e, 'source')} />
                   </div>

                   {/* Tip: MD Download.pdf */}
                   <div className="mt-4 rounded-2xl border-2 border-slate-200 bg-slate-50 p-4">
                     <p className="text-[12px] font-black text-slate-900 leading-snug">
                       Upload your original <span className="underline">Download.pdf</span> from MD.
                     </p>
                     <p className="mt-1 text-[11px] font-semibold text-slate-700 leading-snug">
                       We’ll auto add it to your download button — or add your download link manually.
                     </p>
                   </div>
                 </>
               ) : (
                 <div className="space-y-3">
                   <label className="text-[10px] font-black text-slate-900 uppercase">URL for {config.source.mode}</label>
                   <div className="flex gap-2 p-3 bg-white border-2 border-slate-100 rounded-2xl">
                     <LinkIcon size={18} className="text-slate-400" />
                     <input className="flex-1 bg-transparent text-xs font-black outline-none" value={config.source.link} onChange={e => updateConfig('source.link', e.target.value)} placeholder="https://..." />
                   </div>
                 </div>
               )}
            </div>
          </div>
        );
      case EditorTab.ASSETS:
        return (
          <div className="space-y-8">
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase mb-4">Brand Assets</h3>
              <div className="grid grid-cols-2 gap-4">
                <div onClick={() => logoInputRef.current?.click()} className={`aspect-square rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-indigo-400 transition-all ${config.assets.logo ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-100'}`}>
                  {config.assets.logo ? <img src={config.assets.logo} className="w-12 h-12 object-contain" /> : <ImageIcon className="text-slate-400" size={24} />}
                  <span className="text-[10px] font-black uppercase">Logo</span>
                  <input type="file" ref={logoInputRef} hidden accept="image/*" onChange={e => handleFileUpload(e, 'logo')} />
                </div>
                <div onClick={() => watermarkInputRef.current?.click()} className={`aspect-square rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-indigo-400 transition-all ${config.assets.watermark ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-100'}`}>
                  {config.assets.watermark ? <Waves className="text-indigo-600" size={24} /> : <ImageIcon className="text-slate-400" size={24} />}
                  <span className="text-[10px] font-black uppercase">Watermark</span>
                  <input type="file" ref={watermarkInputRef} hidden accept="image/*" onChange={e => handleFileUpload(e, 'watermark')} />
                </div>
              </div>
            </div>
            <div className="pt-6 border-t border-slate-100">
              <h3 className="text-sm font-black text-slate-900 uppercase mb-4">Add Layers</h3>
              <div className="grid grid-cols-2 gap-3 mb-6">
                <button onClick={() => {
                  const nid = `text-${Date.now()}`;
                  updateConfig('layout.extraLayers', [...config.layout.extraLayers, { id: nid, type: 'text', content: 'New Text Layer', x: 200, y: 200, w: 200, h: 40, fontSize: 16, visible: true, fontFamily: 'Inter', align: 'center', color: '#000000' }]);
                  setSelectedId(nid);
                }} className="flex flex-col items-center gap-2 p-4 bg-white border-2 border-slate-100 rounded-2xl hover:border-indigo-600 transition-all">
                  <Type size={24} /> <span className="text-[10px] font-black uppercase text-center">Add Text Layer</span>
                </button>
                <button onClick={() => extraImgInputRef.current?.click()} className="flex flex-col items-center gap-2 p-4 bg-white border-2 border-slate-100 rounded-2xl hover:border-indigo-600 transition-all">
                  <ImageIcon size={24} /> <span className="text-[10px] font-black uppercase text-center">Add Image Layer</span>
                </button>
              </div>
              <div className="space-y-2">
                {/* Standard Visibility Toggles */}
                <div key="watermark" onClick={() => setSelectedId('watermark')} className={`group flex items-center justify-between p-3 rounded-2xl border-2 transition-all cursor-pointer ${selectedId === 'watermark' ? 'border-indigo-600 bg-indigo-50' : 'border-slate-50'}`}>
                  <span className="text-xs font-black text-slate-700 capitalize">Watermark</span>
                  <button onClick={(e) => { e.stopPropagation(); updateConfig('visibility.watermark', !config.visibility.watermark); }} className={`p-2 rounded-xl ${config.visibility.watermark ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>{config.visibility.watermark ? <Eye size={14}/> : <EyeOff size={14}/>}</button>
                </div>
                {Object.keys(config.layout.blocks).map(id => id !== 'socials' && (
                  <div key={id} onClick={() => setSelectedId(id)} className={`group flex items-center justify-between p-3 rounded-2xl border-2 transition-all cursor-pointer ${selectedId === id ? 'border-indigo-600 bg-indigo-50' : 'border-slate-50'}`}>
                    <span className="text-xs font-black text-slate-700 capitalize">{id}</span>
                    <button onClick={(e) => { e.stopPropagation(); updateConfig(`visibility.${id}`, !config.visibility[id]); }} className={`p-2 rounded-xl ${config.visibility[id] ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>{config.visibility[id] ? <Eye size={14}/> : <EyeOff size={14}/>}</button>
                  </div>
                ))}
                {config.layout.extraLayers.map(l => (
                  <div key={l.id} onClick={() => setSelectedId(l.id)} className={`group flex items-center justify-between p-3 rounded-2xl border-2 transition-all cursor-pointer ${selectedId === l.id ? 'border-indigo-600 bg-indigo-50' : 'border-slate-50'}`}>
                    <span className="text-xs font-black text-slate-700 truncate w-32">{(l.type === 'text' ? l.content : 'Custom Image')}</span>
                    <button onClick={(e) => { e.stopPropagation(); updateConfig('layout.extraLayers', config.layout.extraLayers.filter(x => x.id !== l.id)); }} className="p-2 bg-red-100 text-red-600 rounded-xl opacity-0 group-hover:opacity-100 transition-all hover:bg-red-200"><Trash2 size={14}/></button>
                  </div>
                ))}
              </div>
              <input type="file" ref={extraImgInputRef} hidden accept="image/*" onChange={e => handleFileUpload(e, 'extra')} />
            </div>
          </div>
        );
      case EditorTab.SOCIALS:
        return (
          <div className="space-y-4">
             <h3 className="text-sm font-black text-slate-900 uppercase">Social Presence</h3>
             <p className="text-[10px] font-bold text-slate-400 italic">Links will be added to the PDF footer.</p>
             {['facebook', 'instagram', 'etsy', 'website', 'shopify'].map(key => (
               <div key={key}>
                 <label className="text-[10px] font-black text-slate-900 uppercase">{key}</label>
                 <div className="flex items-center gap-3 mt-1 p-3 bg-white border-2 border-slate-100 rounded-2xl">
                   <Share2 size={16} className="text-slate-400" />
                   <input className="flex-1 bg-transparent text-xs font-black outline-none" value={(config.socials as any)[key]} onChange={e => updateConfig(`socials.${key}`, e.target.value)} placeholder="URL..." />
                 </div>
               </div>
             ))}
          </div>
        );
      case EditorTab.PROMO:
        return (
          <div className="space-y-4">
             <h3 className="text-sm font-black text-slate-900 uppercase">Offer Config</h3>
             <div className="p-5 bg-white border-2 border-slate-100 rounded-3xl space-y-5 shadow-sm">
               <div className="flex items-center justify-between pb-3 border-b border-slate-50">
                  <span className="text-xs font-black uppercase text-slate-900">Enable Promo Block</span>
                  <input type="checkbox" checked={config.promo.enabled} onChange={e => updateConfig('promo.enabled', e.target.checked)} className="w-6 h-6 rounded-xl accent-indigo-600 cursor-pointer" />
               </div>
               {['title', 'code'].map(f => (
                 <div key={f}>
                   <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{f === 'title' ? 'Offer Title' : 'Coupon Code'}</label>
                   <input 
                    className="w-full mt-1 p-4 bg-slate-50 border-2 border-transparent focus:border-indigo-600 outline-none rounded-2xl text-xs font-black transition-all" 
                    value={(config.promo as any)[f]} 
                    onChange={e => updateConfig(`promo.${f}`, e.target.value)} 
                    placeholder={f === 'code' ? 'SAVE20' : 'Limited Time Offer'}
                   />
                 </div>
               ))}
               <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Offer Description</label>
                  <textarea 
                    className="w-full mt-1 p-4 bg-slate-50 border-2 border-transparent focus:border-indigo-600 outline-none rounded-2xl text-xs font-black h-24 transition-all" 
                    value={config.promo.description} 
                    onChange={e => updateConfig('promo.description', e.target.value)} 
                    placeholder="Enter short offer details here..."
                  />
               </div>
               <div className="pt-2">
                 <p className="text-[9px] font-bold text-slate-400 italic text-center">Tip: Select the promo block on canvas to edit font, size, and styling.</p>
               </div>
             </div>
          </div>
        );
      case EditorTab.COLORS:
        return (
          <div className="space-y-6">
            <h3 className="text-sm font-black text-slate-900 uppercase">Branding Colors</h3>
            {[
              { id: 'background', label: 'Canvas Background' },
              { id: 'promoBg', label: 'Promo Background' },
              { id: 'button', label: 'Button Background' },
              { id: 'buttonText', label: 'Button Text Color' }
            ].map(c => (
              <div key={c.id} className="flex items-center justify-between p-4 bg-white border-2 border-slate-100 rounded-2xl">
                <label className="text-[10px] font-black text-slate-900 uppercase">{c.label}</label>
                <input
                  type="color"
                  value={c.id === 'promoBg' ? ((config.colors as any).promoBg ?? config.colors.accent) : (config.colors as any)[c.id]}
                  onChange={e => updateConfig(`colors.${c.id}`, e.target.value)}
                  className="w-10 h-10 rounded-xl border-2 border-slate-100 cursor-pointer"
                />
              </div>
            ))}
          </div>
        );
      case EditorTab.CONTENT:
        return (
          <div className="space-y-5">
            <div className="p-4 rounded-2xl bg-white border-2 border-indigo-100">
              <div className="text-[12px] font-black text-slate-900">100% FREE</div>
              <div className="text-[11px] font-bold text-slate-600 mt-1">
                No API key required to generate PDFs. AI enhancement is optional.
              </div>
            </div>

            <h3 className="text-base font-black text-slate-900 uppercase">Text Content</h3>

            {([
              { key: 'title', label: 'Title' },
              { key: 'shortDesc', label: 'Short description' },
              { key: 'footer', label: 'Footer' },
            ] as const).map(({ key, label }) => (
              <div key={key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-black text-slate-900 uppercase">{label}</label>
                  <button
                    onClick={() => enhanceFieldWithGemini(key)}
                    className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-white border-2 border-slate-100 text-slate-900 hover:bg-slate-50 hover:border-indigo-200 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:border-slate-100"
                    title={hasGeminiKey ? 'Enhance with Gemini' : 'Optional: add your Gemini API key in Settings to enable'}
                    disabled={aiBusy || !hasGeminiKey}
                  >
                    {aiBusy ? <Loader2 size={12} className="animate-spin" /> : <Waves size={12} />}
                    Enhance
                  </button>
                </div>
                <input
                  className="w-full p-3 bg-white border-2 border-slate-100 rounded-2xl text-sm font-black"
                  value={(config.content as any)[key]}
                  onChange={e => updateConfig(`content.${key}`, e.target.value)}
                />
              </div>
            ))}

            <div>
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-black text-slate-900 uppercase">Main description</label>
                <button
                  onClick={() => enhanceFieldWithGemini('mainDesc')}
                  className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-white border-2 border-slate-100 text-slate-900 hover:bg-slate-50 hover:border-indigo-200 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:border-slate-100"
                  title={hasGeminiKey ? 'Enhance with Gemini' : 'Optional: add your Gemini API key in Settings to enable'}
                  disabled={aiBusy || !hasGeminiKey}
                >
                  {aiBusy ? <Loader2 size={12} className="animate-spin" /> : <Waves size={12} />}
                  Enhance
                </button>
              </div>
              <textarea
                className="w-full mt-2 p-3 bg-white border-2 border-slate-100 rounded-2xl text-sm font-black h-32"
                value={config.content.mainDesc}
                onChange={e => updateConfig('content.mainDesc', e.target.value)}
              />
            </div>

            {aiError && (
              <div className="p-4 rounded-2xl bg-red-50 border-2 border-red-100 text-red-700 text-sm font-black">
                {aiError}
              </div>
            )}
          </div>
        );

      case EditorTab.PRESETS:
        return (
          <div className="space-y-6">
            <h3 className="text-sm font-black text-slate-900 uppercase">Project File</h3>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={handleSaveProject} className="flex flex-col items-center gap-2 p-4 bg-white border-2 border-slate-100 rounded-2xl hover:border-indigo-600 transition-all">
                <FileJson size={24} className="text-indigo-600" /> <span className="text-[10px] font-black uppercase">Save .json</span>
              </button>
              <button onClick={() => projectInputRef.current?.click()} className="flex flex-col items-center gap-2 p-4 bg-white border-2 border-slate-100 rounded-2xl hover:border-indigo-600 transition-all">
                <FolderOpen size={24} className="text-indigo-600" /> <span className="text-[10px] font-black uppercase">Load .json</span>
                <input type="file" ref={projectInputRef} hidden accept=".json" onChange={e => handleFileUpload(e, 'project')} />
              </button>
            </div>
            <button onClick={handleSavePreset} className="w-full py-3 bg-indigo-50 text-indigo-700 rounded-xl font-black text-[10px] uppercase hover:bg-indigo-100 transition-all flex items-center justify-center gap-2 mb-4"><Plus size={14} /> Save current as preset</button>
            <div className="space-y-2">
              {savedPresets.map((preset, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-white border-2 border-slate-50 rounded-xl group hover:border-indigo-100 transition-all">
                  <span className="text-[10px] font-black text-slate-700">{preset.name}</span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button onClick={() => handleLoadPreset(preset.config)} className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100"><RotateCw size={12} /></button>
                    <button onClick={() => handleDeletePreset(idx)} className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"><Trash2 size={12} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      default: return null;
    }
  };

  const getActiveFont = () => {
    if (!selectedId) return null;
    if (isExtraLayer(selectedId)) {
      return config.layout.extraLayers.find(l => l.id === selectedId);
    }
    return config.fonts.blocks[selectedId];
  };

  const activeFont = getActiveFont();
// --- Tips Panel (Docked) ---
const tipsTabs = useMemo(() => {
  return [
    { id: EditorTab.SOURCE as const, label: 'Source' },
    { id: EditorTab.ASSETS as const, label: 'Layers' },
    { id: EditorTab.CONTENT as const, label: 'Content' },
    { id: EditorTab.PROMO as const, label: 'Offer' },
    { id: EditorTab.SOCIALS as const, label: 'Social' },
    { id: EditorTab.COLORS as const, label: 'Colors' },
    { id: EditorTab.PRESETS as const, label: 'Project' },
  ];
}, []);

const tipsBySection = useMemo(() => {
  const base: Record<string, { title: string; tips: Array<{ icon: any; text: string }> }> = {
    [EditorTab.SOURCE]: {
      title: 'Source Tips',
      tips: [
        { icon: Upload, text: 'Upload your original MyDesigns Download.pdf to auto-extract the embedded download link.' },
        { icon: LinkIcon, text: 'Manual link mode is perfect for Google Drive / OneDrive / Shopify links.' },
      ],
    },
    [EditorTab.ASSETS]: {
      title: 'Layers Tips',
      tips: [
        { icon: Layers, text: 'Add extra text/image layers for watermarks, badges, and callouts.' },
        { icon: Layout, text: 'Right-click → Bring to Front / Send to Back to fix overlaps instantly.' },
        { icon: Layers, text: 'Ctrl/Cmd + G groups • Ctrl/Cmd + Shift + G ungroups.' },
      ],
    },
    [EditorTab.CONTENT]: {
      title: 'Content Tips',
      tips: [
        { icon: Type, text: 'Double-click a custom text layer to edit it inline on the canvas.' },
        { icon: AlignCenter, text: 'Use the top toolbar for alignment and text styling on selected blocks.' },
        { icon: Info, text: 'Custom font upload applies to canvas text only (UI fonts stay unchanged).' },
      ],
    },
    [EditorTab.PROMO]: {
      title: 'Offer Tips',
      tips: [
        { icon: Tag, text: 'Promo background is independent from your download button color.' },
        { icon: QrCode, text: 'QR can link to your download or your shop — great for mobile buyers.' },
        { icon: Layout, text: 'Right-click the promo block to move it behind/in front of other elements.' },
      ],
    },
    [EditorTab.SOCIALS]: {
      title: 'Social Tips',
      tips: [
        { icon: Share2, text: 'Add socials only if you want repeat buyers — keep it minimal & clean.' },
        { icon: Globe, text: 'Use website/shop links for Shopify or standalone stores.' },
        { icon: QrCode, text: 'Turn on a QR if your audience is mostly mobile.' },
      ],
    },
    [EditorTab.COLORS]: {
      title: 'Colors Tips',
      tips: [
        { icon: Palette, text: 'Button text color only affects the download button (promo is separate).' },
        { icon: FileText, text: 'Pure white backgrounds export cleanest for Etsy buyer printing.' },
        { icon: Layout, text: 'Use contrast: dark text + light background reads best on phones.' },
      ],
    },
    [EditorTab.PRESETS]: {
      title: 'Project Tips',
      tips: [
        { icon: Save, text: 'Save presets for different product types (PNG bundle, SVG, Canva, etc.).' },
        { icon: FileJson, text: 'Save/Load JSON lets you move projects between computers.' },
        { icon: Sparkles, text: 'Use “What’s New” to see the latest features anytime.' },
      ],
    },
    CANVAS: {
      title: 'Canvas Tips',
      tips: [
        { icon: MousePointer2, text: 'Scroll to zoom • Space + drag to pan.' },
        { icon: MousePointer2, text: 'Drag on empty space to box-select.' },
        { icon: MousePointer2, text: 'Esc clears selection & closes menus.' },
      ],
    },
  };

  if (selectedId) {
    const sectionKey = tipsSection === 'CANVAS' ? 'CANVAS' : tipsSection;
    const label = selectedId.startsWith('text-') ? 'Text Layer' : selectedId;
    base[sectionKey] = {
      ...base[sectionKey],
      tips: [
        { icon: Info, text: `Selected: ${label}. Right-click it for actions (align, duplicate, layer order, custom fonts, etc.).` },
        ...base[sectionKey].tips,
      ],
    };
  }

  return base;
}, [selectedId, tipsSection]);

const renderTipsPanel = () => {
  if (!tipsOpen) {
    return (
      <div className="absolute top-20 right-6 z-[80]">
        <button
          onClick={() => setTipsOpen(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-white border-2 border-slate-200 text-slate-900 shadow-xl hover:border-indigo-200 hover:text-indigo-600 transition-all text-[10px] font-black uppercase tracking-widest"
          title="Open Tips"
        >
          <Info size={14} /> Tips
        </button>
      </div>
    );
  }

  const key = tipsSection === 'CANVAS' ? 'CANVAS' : tipsSection;
  const payload = tipsBySection[key];

  return (
    <div className="absolute top-20 right-6 bottom-6 w-[360px] z-[80]">
      <div className="h-full bg-white border-2 border-slate-200 rounded-[28px] shadow-2xl overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-indigo-50 flex items-center justify-center">
              <Info className="text-indigo-600" size={18} />
            </div>
            <div>
              <div className="text-[11px] font-black uppercase tracking-widest text-slate-900">Editor Tips</div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Auto-switches with tabs</div>
            </div>
          </div>
          <button
            onClick={() => setTipsOpen(false)}
            className="p-2 rounded-2xl hover:bg-slate-100 text-slate-500"
            title="Close Tips"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-4 pt-3">
          <div className="flex flex-wrap gap-2">
            {tipsTabs.map(t => (
              <button
                key={t.id}
                onClick={() => setTipsSection(t.id)}
                className={`px-3 py-2 rounded-2xl border text-[10px] font-black uppercase tracking-widest transition-all ${tipsSection === t.id ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-200 hover:text-indigo-600'}`}
                title={t.label}
              >
                {t.label}
              </button>
            ))}
            <button
              onClick={() => setTipsSection('CANVAS')}
              className={`px-3 py-2 rounded-2xl border text-[10px] font-black uppercase tracking-widest transition-all ${tipsSection === 'CANVAS' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-200 hover:text-indigo-600'}`}
              title="Canvas"
            >
              Canvas
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          <div className="text-xs font-black text-slate-900 mb-3">{payload?.title || 'Tips'}</div>
          <ul className="space-y-3">
            {payload?.tips?.map((t, idx) => (
              <li key={idx} className="flex gap-3 items-start">
                <div className="w-8 h-8 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0">
                  {t.icon ? React.createElement(t.icon, { size: 14, className: 'text-slate-700' }) : <Info size={14} className="text-slate-700" />}
                </div>
                <div className="text-[11px] font-semibold text-slate-700 leading-snug">{t.text}</div>
              </li>
            ))}
          </ul>
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50">
          <div className="text-[10px] font-bold text-slate-500">
            Pro tip: If something is hidden, use <span className="font-black text-slate-700">Bring to Front</span>.
          </div>
        </div>
      </div>
    </div>
  );
};


  return (
    <div className="relative h-screen w-screen">
    <div className="h-screen w-screen flex bg-slate-100 font-sans transition-colors overflow-hidden">
      <input ref={fontUploadRef} type="file" accept=".ttf,.otf,.woff,.woff2" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadFont(f); e.currentTarget.value = ''; }} />
      {/* CONTEXTUAL TOOLBAR */}
      <div className={`fixed top-0 left-0 right-0 h-16 bg-white/95 backdrop-blur-2xl border-b border-slate-200 z-[100] flex items-center px-8 gap-6 shadow-xl no-print transition-transform duration-300 ${selectedId ? 'translate-y-0' : '-translate-y-full'}`}>
        {activeElementProps && (
          <div className="flex items-center gap-6 w-full animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex items-center gap-3 pr-6 border-r border-slate-200">
              <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2 py-1 rounded-lg">Selected: {selectedId?.split('-')[0]}</span>
              <button onClick={() => handleAction('delete')} className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={16}/></button>
            </div>
            
            {activeElementProps.isText && activeFont && (
              <>
                <div className="flex items-center gap-3">
                  <Type size={16} className="text-slate-400" />
                  <select 
                    className="bg-transparent text-xs font-black outline-none border-none cursor-pointer hover:text-indigo-600 transition-colors"
                    value={activeFont.family || (activeFont as any).fontFamily || 'Inter'}
                    onChange={e => {
                      if (activeElementProps.isExtra) updateConfig('layout.extraLayers', config.layout.extraLayers.map(l => l.id === selectedId ? { ...l, fontFamily: e.target.value } : l));
                      else updateConfig(`fonts.blocks.${selectedId}.family`, e.target.value);
                    }}
                  >
                    {Array.from(new Set([...FONT_FAMILIES, ...googleFontsLoaded, ...customFontFamilies])).map(ff => <option key={ff} value={ff}>{ff}</option>)}
                  </select>
                </div>

                <div className="flex items-center gap-1 border-l pl-6 border-slate-200">
                  <button onClick={() => handleAction('font-dec')} className="p-2 hover:bg-slate-100 rounded-lg"><Minimize2 size={14}/></button>
                  <input 
                    type="number" 
                    className="w-12 bg-slate-50 text-center font-black text-xs outline-none rounded py-1" 
                    value={activeFont.size || (activeFont as any).fontSize || 16}
                    onChange={e => {
                      const ns = parseInt(e.target.value);
                      if (activeElementProps.isExtra) updateConfig('layout.extraLayers', config.layout.extraLayers.map(l => l.id === selectedId ? { ...l, fontSize: ns } : l));
                      else updateConfig(`fonts.blocks.${selectedId}.size`, ns);
                    }}
                  />
                  <button onClick={() => handleAction('font-inc')} className="p-2 hover:bg-slate-100 rounded-lg"><Plus size={14}/></button>
                </div>

                <div className="flex items-center gap-1 border-l pl-6 border-slate-200">
                  <button 
                    onClick={() => handleAction('toggle-bold')} 
                    className={`p-2 rounded-lg transition-all ${activeFont.bold ? 'bg-indigo-600 text-white shadow-md' : 'hover:bg-slate-100 text-slate-400'}`}
                  >
                    <Bold size={16}/>
                  </button>
                  <button 
                    onClick={() => handleAction('toggle-italic')} 
                    className={`p-2 rounded-lg transition-all ${activeFont.italic ? 'bg-indigo-600 text-white shadow-md' : 'hover:bg-slate-100 text-slate-400'}`}
                  >
                    <Italic size={16}/>
                  </button>
                  <button 
                    onClick={() => handleAction('toggle-underline')} 
                    className={`p-2 rounded-lg transition-all ${activeFont.underline ? 'bg-indigo-600 text-white shadow-md' : 'hover:bg-slate-100 text-slate-400'}`}
                  >
                    <Underline size={16}/>
                  </button>
                </div>

                

{/* GROUP: Align + Layer Order + Custom Font Upload */}
<div className="flex items-center gap-1 border-l pl-6 border-slate-200">
  <button onClick={() => handleAction('align-left')} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500" title="Align Left"><AlignLeft size={16}/></button>
  <button onClick={() => handleAction('align-center')} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500" title="Align Center"><AlignCenter size={16}/></button>
  <button onClick={() => handleAction('align-right')} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500" title="Align Right"><AlignRight size={16}/></button>
  <div className="w-px h-6 bg-slate-200 mx-2" />
  <button onClick={() => handleAction('sendToBack')} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500" title="Send to Back"><ArrowDownToLine size={16}/></button>
  <button onClick={() => handleAction('bringToFront')} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500" title="Bring to Front"><ArrowUpToLine size={16}/></button>
  <div className="w-px h-6 bg-slate-200 mx-2" />
  <button
    onClick={() => handleAction('upload-font')}
    className="px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 inline-flex items-center gap-2 text-xs font-black border border-slate-200"
    title="Font Manager"
  >
    <Type size={16} className="text-slate-500" />
    Fonts
  </button>
</div>

<div className="flex items-center gap-4 border-l pl-6 border-slate-200">
                  <input 
                    type="color" 
                    className="w-6 h-6 rounded-full border border-slate-200 cursor-pointer overflow-hidden" 
                    value={activeFont.color || '#000000'}
                    onChange={e => {
                      if (activeElementProps.isExtra) updateConfig('layout.extraLayers', config.layout.extraLayers.map(l => l.id === selectedId ? { ...l, color: e.target.value } : l));
                      else updateConfig(`fonts.blocks.${selectedId}.color`, e.target.value);
                    }}
                  />
                  <div className="flex gap-1">
                    {['left', 'center', 'right'].map(a => (
                      <button 
                        key={a}
                        onClick={() => {
                          if (activeElementProps.isExtra) updateConfig('layout.extraLayers', config.layout.extraLayers.map(l => l.id === selectedId ? { ...l, align: a as any } : l));
                          else updateConfig(`fonts.blocks.${selectedId}.align`, a);
                        }}
                        className={`p-2 rounded-lg transition-all ${((activeFont.align) === a) ? 'bg-indigo-600 text-white shadow-md' : 'hover:bg-slate-100 text-slate-400'}`}
                      >
                        {a === 'left' ? <AlignLeft size={16}/> : a === 'center' ? <AlignCenter size={16}/> : <AlignRight size={16}/>}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
            
            <div className="flex-1" />
          </div>
        )}
      </div>

      {showOnboarding && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-lg p-6">
          <div className="bg-white rounded-[40px] p-12 max-w-xl shadow-2xl relative text-center border-t-8 border-indigo-600">
            <h2 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">LavenderDragonDesign's MD PDF Generator</h2>
            <p className="text-indigo-600 font-bold mb-6 italic">Beta build - v1.4</p>
            <div className="bg-slate-50 p-6 rounded-3xl text-left border border-slate-200 mb-8">
              <ul className="text-xs text-slate-600 space-y-3 font-medium">
                <li className="flex items-start gap-2">• <span className="flex-1">Auto-Extract links from MD Download PDFs.</span></li>
                <li className="flex items-start gap-2">• <span className="flex-1">Fixed Layer Draggability (Copy/Paste Logic).</span></li>
                <li className="flex items-start gap-2">• <span className="flex-1">Branding Watermark toggle added to layers.</span></li>
              </ul>
            </div>
            <div className="flex flex-col gap-4">
              <label className="flex items-center justify-center gap-3 cursor-pointer group">
                <input type="checkbox" checked={dontShowAgain} onChange={e => setDontShowAgain(e.target.checked)} className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                <span className="text-sm font-black text-slate-600 group-hover:text-indigo-600 transition-colors">Don't show this again</span>
              </label>
              <button onClick={() => { if (dontShowAgain) localStorage.setItem('lavender_welcome_hidden', 'true'); setShowOnboarding(false); }} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-lg hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200">Start Designing</button>
            </div>
          </div>
        </div>
      )}

      {restoreModal && !showOnboarding && (
        <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/50 backdrop-blur-sm p-6">
          <div className="bg-white rounded-[30px] p-8 max-w-sm w-full shadow-2xl text-center">
             <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4"><RotateCw className="text-indigo-600" size={32} /></div>
             <h3 className="text-xl font-black text-slate-900 mb-2">Resume Last Work?</h3>
             <label className="mt-4 mb-2 flex items-center justify-center gap-3 cursor-pointer group">
               <input type="checkbox" checked={restoreDontAsk} onChange={e => setRestoreDontAsk(e.target.checked)} className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
               <span className="text-xs font-black text-slate-600 group-hover:text-indigo-600 transition-colors">Don't ask again</span>
             </label>

             <div className="flex gap-3 mt-6">
               <button onClick={() => { if (restoreDontAsk) localStorage.setItem('lavender_restore_hidden','true'); localStorage.removeItem('lavender_autosave'); setRestoreChoiceMade(true); setRestoreModal(false); }} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-black text-xs hover:bg-slate-200">New Project</button>
               <button onClick={() => { if (restoreDontAsk) localStorage.setItem('lavender_restore_hidden','true'); const data = localStorage.getItem('lavender_autosave'); if (data) setConfig(normalizeLoadedConfig(JSON.parse(data))); setRestoreChoiceMade(true); setRestoreModal(false); }} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-black text-xs shadow-lg shadow-indigo-100">Resume</button>
             </div>
          </div>
        </div>
      )}


      {/* Export warnings modal */}
      {exportWarnings && (
        <div className="fixed inset-0 z-[230] flex items-center justify-center bg-black/60 backdrop-blur-sm p-6">
          <div className="bg-white rounded-[28px] p-7 max-w-lg w-full shadow-2xl border border-slate-100">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center shrink-0">
                <Info className="text-amber-700" size={24} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-black text-slate-900">Export Warnings</h3>
                <p className="text-xs text-slate-600 mt-1">You can still export, but these items might cause clipping or broken links.</p>
              </div>
              <button onClick={() => { setExportWarnings(null); setPendingPreviewExport(null); }} className="p-2 rounded-xl hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>

            <ul className="mt-4 space-y-2 text-sm">
              {exportWarnings.map((w, i) => (
                <li key={i} className="flex gap-2 items-start">
                  <span className="mt-0.5 w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                  <span className="text-slate-700">{w}</span>
                </li>
              ))}
            </ul>

            <div className="flex items-center gap-2 mt-4 text-xs text-slate-600">
              <input
                type="checkbox"
                checked={dontShowExportWarnings}
                onChange={(e) => {
                  const v = e.target.checked;
                  setDontShowExportWarnings(v);
                  localStorage.setItem('ldd_hide_export_warnings', v ? '1' : '0');
                }}
              />
              <span>Don’t show export warnings again</span>
            </div>

            <div className="flex gap-3 mt-6 justify-end">
              <button
                onClick={() => { setExportWarnings(null); setPendingPreviewExport(null); }}
                className="px-4 py-2 rounded-xl font-black text-xs border border-slate-200 hover:bg-slate-50"
              >
                Fix It
              </button>
              <button
                onClick={() => {
                  const p = pendingPreviewExport ?? false;
                  setExportWarnings(null);
                  setPendingPreviewExport(null);
                  // One-shot bypass so this confirm never re-triggers the same modal.
                  bypassWarningsRef.current = true;
                  handleExportPDF(p);
                }}
                className="px-4 py-2 rounded-xl font-black text-xs bg-amber-600 text-white hover:bg-amber-700 shadow-lg shadow-amber-100"
              >
                Export Anyway
              </button>
            </div>
          </div>
        </div>
      )}

	      {/* Rename exported PDF modal (white card) */}
	      {renameModalOpen && (
	        <div className="fixed inset-0 z-[235] flex items-center justify-center bg-black/60 backdrop-blur-sm p-6">
	          <div className="bg-white rounded-[28px] p-7 max-w-md w-full shadow-2xl border border-slate-100">
	            <div className="flex items-start gap-4">
	              <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center shrink-0">
	                <FileText className="text-indigo-700" size={24} />
	              </div>
	              <div className="flex-1">
	                <h3 className="text-lg font-black text-slate-900">Name your PDF</h3>
	                <p className="text-xs text-slate-600 mt-1">Rename it now, or skip and use the default.</p>
	              </div>
	              <button
	                onClick={() => { setRenameModalOpen(false); pendingPdfRef.current = null; }}
	                className="p-2 rounded-xl hover:bg-slate-100"
	                title="Close"
	              >
	                <X size={18} />
	              </button>
	            </div>

	            <div className="mt-4">
	              <label className="text-[11px] font-black text-slate-700 uppercase">File name</label>
	              <input
	                value={renameValue}
	                onChange={(e) => setRenameValue(e.target.value)}
	                className="mt-2 w-full px-4 py-3 rounded-2xl border-2 border-slate-200 focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 font-bold"
	                placeholder={renameDefault}
	              />
	              <div className="text-[11px] text-slate-500 mt-2">Tip: “.pdf” will be added if you forget it.</div>
	            </div>

	            <div className="flex gap-3 mt-6">
	              <button
	                onClick={() => {
	                  const pdf = pendingPdfRef.current;
	                  if (!pdf) return;
	                  const name = (renameDefault || 'export.pdf').trim();
	                  const safe = name.toLowerCase().endsWith('.pdf') ? name : `${name}.pdf`;
	                  try { pdf.save(safe); } catch (e) { console.error(e); }
	                  pendingPdfRef.current = null;
	                  setRenameModalOpen(false);
	                }}
	                className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-black text-xs hover:bg-slate-200"
	              >
	                Skip
	              </button>
	              <button
	                onClick={() => {
	                  const pdf = pendingPdfRef.current;
	                  if (!pdf) return;
	                  const raw = (renameValue || renameDefault || 'export.pdf').trim();
	                  if (!raw) return;
	                  const safe = raw.toLowerCase().endsWith('.pdf') ? raw : `${raw}.pdf`;
	                  try { pdf.save(safe); } catch (e) { console.error(e); }
	                  pendingPdfRef.current = null;
	                  setRenameModalOpen(false);
	                }}
	                className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-black text-xs shadow-lg shadow-indigo-100 hover:bg-indigo-700"
	              >
	                Rename
	              </button>
	            </div>
	          </div>
	        </div>
	      )}




      {/* ICON SIDEBAR (Fixed Width) */}
      <div className="no-print w-24 bg-white border-r-2 border-slate-100 flex flex-col items-center py-8 gap-8 z-50 shadow-2xl shrink-0">
        {[
          { id: EditorTab.SOURCE, icon: Laptop, label: 'Source' },
          { id: EditorTab.ASSETS, icon: Layers, label: 'Layers' },
          { id: EditorTab.CONTENT, icon: Type, label: 'Content' },
          { id: EditorTab.PROMO, icon: Tag, label: 'Offer' },
          { id: EditorTab.SOCIALS, icon: Share2, label: 'Social' },
          { id: EditorTab.COLORS, icon: Palette, label: 'Colors' },
          { id: EditorTab.PRESETS, icon: Save, label: 'Project' },
        ].map(item => (
          <button key={item.id} onClick={() => { setActiveTab(item.id); setIsSidebarMinimized(false); }} className={`flex flex-col items-center gap-2 transition-all ${activeTab === item.id ? 'text-indigo-600 scale-110' : 'text-slate-900 hover:text-indigo-500'}`}>
            <div className={`p-3 rounded-2xl transition-all ${activeTab === item.id ? 'bg-indigo-50 ring-2 ring-indigo-600 shadow-lg' : ''}`}><item.icon size={22} /></div>
            <span className="text-[9px] font-black uppercase tracking-widest">{item.label}</span>
          </button>
        ))}

        <div className="flex-1" />

        <button
          onClick={() => setShowSettings(true)}
          className="flex flex-col items-center gap-2 transition-all text-slate-900 hover:text-indigo-500"
          title="Settings"
        >
          <div className="p-3 rounded-2xl transition-all"><Settings size={22} /></div>
          <span className="text-[9px] font-black uppercase tracking-widest">Settings</span>
        </button>
      </div>

      {/* MAIN PROPERTY SIDEBAR (Collapsible) */}
      <div className={`no-print bg-white border-r-2 border-slate-100 flex flex-col z-40 shadow-inner overflow-hidden transition-all duration-300 ease-in-out ${isSidebarMinimized ? 'w-0 border-r-0 opacity-0' : 'w-96 opacity-100'}`}>
        <header className="p-8 pb-6 border-b-2 border-slate-50 relative flex flex-col items-center">
          <button 
            onClick={() => setIsSidebarMinimized(true)} 
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
            title="Minimize Sidebar"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="flex flex-col items-center gap-3">
            <div className="shrink-0 rounded-3xl overflow-hidden ring-2 ring-indigo-100">
              <img src="/icon128.png" alt="LavenderDragonDesign" className="w-14 h-14 object-cover" />
            </div>
            <div className="w-full">
              <h2 className="text-xl font-black text-slate-900 leading-tight text-center whitespace-normal break-words">LavenderDragonDesign's PDF Generator</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 text-center">Branded Download Pages</p>
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">{renderTabContent()}</div>
        <div className="p-6 bg-slate-50 border-t-2 border-slate-100">
          <div className="flex gap-3 mb-4">
            <button onClick={() => handleExportPDF(true)} className="flex-1 py-4 bg-white border-2 border-slate-200 text-slate-900 rounded-2xl font-black text-xs hover:bg-slate-50 transition-all flex items-center justify-center gap-2"><Eye size={16} /> Preview</button>
            <button onClick={() => handleExportPDF(false)} className="flex-[1.5] py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 flex items-center justify-center gap-2"><Download size={16} /> Export PDF</button>
          </div>
          </div>
        </div>

      {/* RE-OPEN SIDEBAR BUTTON (Visible when minimized) */}
      {isSidebarMinimized && (
        <button 
          onClick={() => setIsSidebarMinimized(false)}
          className="fixed left-28 top-8 p-3 bg-white border-2 border-slate-100 rounded-2xl text-slate-900 shadow-xl z-50 hover:text-indigo-600 hover:border-indigo-100 transition-all animate-in slide-in-from-left-4 duration-300"
          title="Show Sidebar"
        >
          <ChevronRight size={24} />
        </button>
      )}

      <div
        ref={viewportRef}
        className={`flex-1 relative bg-slate-100 overflow-hidden pt-16 ${isPanning ? 'cursor-grabbing' : 'cursor-auto'}`}
        onWheel={handleScroll}
        onMouseDown={(e) => {
          // Allow marquee selection even if the user starts the drag on the gray background
          // around the page (Windows-style rubber band selection).
          if (e.button === 0 && !isSpaceDown && e.target === e.currentTarget) {
            beginMarqueeFromClient(e.clientX, e.clientY, !!(e.ctrlKey || e.metaKey));
          }
          handleCanvasMouseDown(e);
        }}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
        onContextMenu={(e) => handleContextMenu(e, 'canvas', false)}
      >
        
        <div className="no-print absolute top-4 right-4 z-50">
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-white border-2 border-slate-100 text-slate-900 shadow-lg hover:border-indigo-200 hover:text-indigo-600 transition-all text-[10px] font-black uppercase tracking-widest"
            title="Toggle theme"
          >
            {theme === 'dark' ? <Moon size={14} /> : <Sun size={14} />}
            {theme === 'dark' ? 'Dark' : 'Light'}
          </button>
        </div>
        <div className="absolute inset-0 dashed-grid pointer-events-none opacity-50" />
        {/* Tips panel lives in the unused right-side space of the editor viewport */}
        {renderTipsPanel()}
        <div
          id="pdf-canvas"
          ref={canvasRef}
          className="relative bg-white shadow-2xl shrink-0 border-2 border-slate-200 transition-all duration-300"
          // NOTE: Marquee selection + hit testing assumes a top-left transform origin so
          // that client->canvas coordinates can be mapped with a simple /zoom.
          style={{ width: `${CANVAS_WIDTH}px`, height: `${CANVAS_HEIGHT}px`, backgroundColor: config.colors.background, transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`, transformOrigin: "top left" }}
          onMouseDown={(e) => {
            if (e.button !== 0 || isSpaceDown) return;
            if (e.target !== e.currentTarget) return;
            e.stopPropagation();
            const r = canvasRef.current?.getBoundingClientRect();
            if (!r) return;
            const x = (e.clientX - r.left) / zoom;
            const y = (e.clientY - r.top) / zoom;
            setMarquee({ x0: x, y0: y, x1: x, y1: y, additive: !!(e.ctrlKey || e.metaKey) });
          }}
          onClick={(e) => { if (e.target === e.currentTarget) { clearSelection(); } }}
        >
          {config.assets.watermark && config.visibility.watermark && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden"><img src={config.assets.watermark} style={{ opacity: config.assets.watermarkOpacity, transform: 'rotate(-45deg) scale(2)' }} className="w-1/2 object-contain" /></div>
          )}
          <DraggableBlock id="logo" config={config} updateConfig={updateConfig} visible={!!config.assets.logo && config.visibility.logo} onSelect={selectElement} selectedIds={selectedIds} isSelected={selectedIds.includes('logo')} isPrimary={selectedId === 'logo'} onContextMenu={handleContextMenu} zoom={zoom}><img src={config.assets.logo!} className="w-full h-full object-contain pointer-events-none" /></DraggableBlock>
          
          {/* STANDARD TEXT BLOCKS */}
          {['title', 'shortDesc', 'mainDesc', 'footer', 'socials'].map(blockId => (
            <DraggableBlock key={blockId} id={blockId} config={config} updateConfig={updateConfig} visible={config.visibility[blockId]} onSnap={setSnapLines} onSelect={selectElement} selectedIds={selectedIds} onDoubleClick={() => setEditingId(blockId)} isSelected={selectedIds.includes(blockId)} isPrimary={selectedId === blockId} isEditing={editingId === blockId} onContextMenu={handleContextMenu} zoom={zoom}>
              <div 
                style={{ 
                  fontSize: `${config.fonts.blocks[blockId].size}px`, 
                  textAlign: config.fonts.blocks[blockId].align, 
                  fontFamily: config.fonts.blocks[blockId].family, 
                  color: config.fonts.blocks[blockId].color || '#000000',
                  fontWeight: config.fonts.blocks[blockId].bold ? 'bold' : 'normal',
                  fontStyle: config.fonts.blocks[blockId].italic ? 'italic' : 'normal',
                  textDecoration: config.fonts.blocks[blockId].underline ? 'underline' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: config.fonts.blocks[blockId].align === 'center' ? 'center' : config.fonts.blocks[blockId].align === 'right' ? 'flex-end' : 'flex-start'
                }} 
                className={`w-full h-auto p-2 leading-tight ${config.content.twoColumns && blockId === 'mainDesc' ? 'columns-2 gap-8' : ''} ${selectedId === blockId ? 'bg-indigo-50/50 outline-dashed outline-1 outline-indigo-200' : ''}`} 
                contentEditable={editingId === blockId && blockId !== 'socials'} 
                suppressContentEditableWarning={true} 
                onBlur={(e) => { if (blockId !== 'socials') updateConfig(`content.${blockId}`, (e.target as HTMLElement).innerText); setEditingId(null); }}
              >
                {blockId === 'socials' ? (
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-4 items-center">
                      {activeSocialLinks.length > 0 ? activeSocialLinks.map((social, idx) => {
                        const size = Math.max(14, config.fonts.blocks.socials.size * 1.2);
                        return (
                          <div key={idx} className="flex items-center gap-1 opacity-80 hover:opacity-100 transition-opacity">
                            <social.icon size={size} />
                            {activeSocialLinks.length < 3 && <span className="text-[0.8em] font-bold">{social.id}</span>}
                          </div>
                        );
                      }) : <span className="text-[0.8em] italic opacity-50">Social Links (Add in Sidebar)</span>}
                    </div>
                  </div>
                ) : (
                  (config.content as any)[blockId]
                )}
              </div>
            </DraggableBlock>
          ))}
          
          <DraggableBlock id="button" config={config} updateConfig={updateConfig} visible={config.visibility.button} onSnap={setSnapLines} onSelect={selectElement} selectedIds={selectedIds} isSelected={selectedIds.includes('button')} isPrimary={selectedId === 'button'} onContextMenu={handleContextMenu} zoom={zoom}>
            <div
              data-ldd-block="button" style={{
                backgroundColor: config.colors.button,
                width: '100%',
                height: '100%',
                position: 'relative',
              }}
              className="rounded-3xl shadow-xl overflow-hidden"
            >
              {/* html2canvas can mis-measure flex centering on some fonts; absolute centering is more stable for export */}
              <span
                data-ldd-button-label="1" style={{
                  position: 'absolute',
                  left: '50%',
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                  display: 'inline-block',
                  whiteSpace: 'nowrap',
                  padding: '0 18px',
                  maxWidth: '92%',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  textAlign: (config.fonts.blocks as any).button?.align ?? 'center',
                  fontFamily: (config.fonts.blocks as any).button?.family ?? config.fonts.global,
                  fontSize: `${(config.fonts.blocks as any).button?.size ?? Math.min(config.layout.blocks.button.h * 0.4, 30)}px`,
                  color: (config.fonts.blocks as any).button?.color ?? config.colors.buttonText,
                  fontWeight: (config.fonts.blocks as any).button?.bold ? 'bold' : 'normal',
                  fontStyle: (config.fonts.blocks as any).button?.italic ? 'italic' : 'normal',
                  textDecoration: (config.fonts.blocks as any).button?.underline ? 'underline' : 'none',
                  lineHeight: 1.2,
                  WebkitFontSmoothing: 'antialiased',
                  MozOsxFontSmoothing: 'grayscale',
                  // Let decorative/script fonts keep their own spacing/kerning; forcing 0px can look "jumbled" on export in some fonts.
                  wordSpacing: 'normal',
                  letterSpacing: 'normal',
                  fontKerning: 'auto',
                } as React.CSSProperties}
              >
                Download Now
              </span>
            </div>
          </DraggableBlock>
          <DraggableBlock id="qr" config={config} updateConfig={updateConfig} visible={config.visibility.qr && !!config.source.link} onSnap={setSnapLines} onSelect={selectElement} selectedIds={selectedIds} isSelected={selectedIds.includes('qr')} isPrimary={selectedId === 'qr'} onContextMenu={handleContextMenu} zoom={zoom}><img src={getQRUrl()} className="w-full h-full object-contain pointer-events-none" /></DraggableBlock>
          
          <DraggableBlock id="promo" config={config} updateConfig={updateConfig} visible={config.visibility.promo && config.promo.enabled} onSnap={setSnapLines} onSelect={selectElement} selectedIds={selectedIds} isSelected={selectedIds.includes('promo')} isPrimary={selectedId === 'promo'} onContextMenu={handleContextMenu} zoom={zoom}>
            <div 
              style={{ 
                backgroundColor: (config.colors as any).promoBg ?? config.colors.accent, 
	                color: config.fonts.blocks.promo.color,
	                fontFamily: config.fonts.blocks.promo.family,
                fontWeight: config.fonts.blocks.promo.bold ? 'bold' : 'normal',
                fontStyle: config.fonts.blocks.promo.italic ? 'italic' : 'normal',
                textDecoration: config.fonts.blocks.promo.underline ? 'underline' : 'none',
                textAlign: config.fonts.blocks.promo.align
              }} 
              className="w-full h-full rounded-[40px] p-6 flex flex-col items-center justify-center gap-1 shadow-2xl overflow-hidden text-center border-4 border-white/20"
            >
              <span
                className="block"
                style={{
                  fontSize: `${Math.max(10, config.fonts.blocks.promo.size * 0.9)}px`,
                  lineHeight: 1.15,
                  letterSpacing: '0px',
                  fontKerning: 'normal',
                  textTransform: 'none',
                  opacity: 0.85,
                }}
              >
                {config.promo.title}
              </span>
              <span
                className="block"
                style={{
                  fontSize: `${Math.max(14, config.fonts.blocks.promo.size * 2.0)}px`,
                  lineHeight: 1.05,
                  letterSpacing: '0px',
                  fontKerning: 'normal',
                }}
              >
                {config.promo.code}
              </span>
              <span
                className="block"
                style={{
                  fontSize: `${Math.max(10, config.layout.blocks.promo.h * 0.08)}px`,
                  lineHeight: 1.2,
                  letterSpacing: '0px',
                  fontKerning: 'normal',
                  opacity: 0.92,
                }}
              >
                {config.promo.description}
              </span>
            </div>
          </DraggableBlock>

          {config.layout.extraLayers.map(l => (
            <DraggableBlock key={l.id} id={l.id} config={config} updateConfig={updateConfig} visible={l.visible} isExtra onSnap={setSnapLines} onSelect={selectElement} selectedIds={selectedIds} onDoubleClick={() => setEditingId(l.id)} isSelected={selectedIds.includes(l.id)} isPrimary={selectedId === l.id} isEditing={editingId === l.id} onContextMenu={handleContextMenu} zoom={zoom}>
              {l.type === 'text' ? (
                <div 
                  style={{ 
                    fontSize: `${l.fontSize}px`, 
                    fontFamily: l.fontFamily || 'Inter', 
                    textAlign: l.align || 'center', 
                    color: l.color || '#000000',
                    fontWeight: l.bold ? 'bold' : 'normal',
                    fontStyle: l.italic ? 'italic' : 'normal',
                    textDecoration: l.underline ? 'underline' : 'none'
                  }} 
                  className={`w-full h-full p-2 flex items-center justify-center font-black ${selectedId === l.id ? 'bg-indigo-50/50 outline-dashed outline-1 outline-indigo-200' : ''}`} 
                  contentEditable={editingId === l.id} 
                  suppressContentEditableWarning={true} 
                  onBlur={(e) => { updateConfig('layout.extraLayers', config.layout.extraLayers.map(x => x.id === l.id ? { ...x, content: (e.target as HTMLElement).innerText } : x)); setEditingId(null); }}
                >
                  {l.content}
                </div>
              ) : (
                <img src={l.content} className="w-full h-full object-contain pointer-events-none" />
              )}
            </DraggableBlock>
          ))}
          {marquee && (
            <div
              className="absolute z-[120] pointer-events-none border-2 border-indigo-500 bg-indigo-200/20"
              style={{
                left: Math.min(marquee.x0, marquee.x1),
                top: Math.min(marquee.y0, marquee.y1),
                width: Math.abs(marquee.x1 - marquee.x0),
                height: Math.abs(marquee.y1 - marquee.y0)
              }}
            />
          )}
          {snapLines.h.map((y, i) => <div key={`h-${i}`} className="absolute left-0 right-0 border-t-2 border-blue-500/50 z-[100] pointer-events-none" style={{ top: y }} />)}
          {snapLines.v.map((x, i) => <div key={`v-${i}`} className="absolute top-0 bottom-0 border-l-2 border-blue-500/50 z-[100] pointer-events-none" style={{ left: x }} />)}
        </div>
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-xl border-2 border-slate-200 rounded-[30px] shadow-2xl p-2 flex items-center gap-2 z-[60]">
           <button onClick={undo} title="Undo (Ctrl+Z)" className="p-3 hover:bg-slate-100 rounded-2xl text-slate-900 transition-all active:scale-90"><Undo2 size={20}/></button>
           <button onClick={redo} title="Redo (Ctrl+Y)" className="p-3 hover:bg-slate-100 rounded-2xl text-slate-900 transition-all active:scale-90"><Redo2 size={20}/></button>
           <div className="w-px h-8 bg-slate-200 mx-1"></div>
           <button onClick={() => handleAction('copy')} title="Copy (Ctrl+C)" className="p-3 hover:bg-slate-100 rounded-2xl text-slate-900 transition-all active:scale-90"><Copy size={20}/></button>
           <button onClick={() => handleAction('paste')} title="Paste (Ctrl+V)" className={`p-3 rounded-2xl transition-all active:scale-90 ${clipboard ? 'text-slate-900 hover:bg-slate-100' : 'text-slate-200 cursor-not-allowed'}`} disabled={!clipboard}><Clipboard size={20}/></button>
           <div className="w-px h-8 bg-slate-200 mx-1"></div>
           <div className="px-4 font-black text-slate-900 text-xs min-w-[60px] text-center">{Math.round(zoom * 100)}%</div>
           <button onClick={() => { setZoom(0.65); setOffset({ x: 0, y: 0 }); }} className="p-3 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 active:scale-90 transition-all"><Maximize size={20} /></button>
        </div>
      </div>

      {contextMenu && (
        <>
          {/* Backdrop: click anywhere outside to close (also prevents "can't click" issues from underlying handlers) */}
          <div
            className="fixed inset-0 z-[190]"
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              closeContextMenu();
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
              closeContextMenu();
            }}
          />

          <div
            className="fixed z-[200]"
            style={{
              left: contextMenu.left,
              top: contextMenu.openUp ? undefined : contextMenu.top,
              bottom: contextMenu.openUp ? contextMenu.bottom : undefined,
              width: 256,
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
              closeContextMenu();
            }}
          >
            {/* Main menu */}
            {/* NOTE: overflow must be visible so submenus can render outside the rounded box */}
            <div className="relative bg-white border-2 border-slate-200 shadow-2xl rounded-2xl py-2 animate-in zoom-in-95 duration-100 overflow-visible">
            {contextMenu.id !== 'canvas' ? (
              <>
                {/* GROUP: Clipboard */}
                <div className="px-6 pt-2 pb-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Clipboard</div>
                <button
                  onClick={() => handleAction('copy')}
                  disabled={contextMenu.id === 'button' || contextMenu.id === 'promo'}
                  className={`w-full px-6 py-3 flex items-center gap-4 text-xs font-black text-left ${(contextMenu.id === 'button' || contextMenu.id === 'promo') ? 'text-slate-300 cursor-not-allowed' : 'text-slate-900 hover:bg-slate-50'}`}
                >
                  <Copy size={16} /> Copy
                </button>
                <button
                  onClick={() => handleAction('duplicate')}
                  disabled={contextMenu.id === 'button' || contextMenu.id === 'promo'}
                  className={`w-full px-6 py-3 flex items-center gap-4 text-xs font-black text-left ${(contextMenu.id === 'button' || contextMenu.id === 'promo') ? 'text-slate-300 cursor-not-allowed' : 'text-slate-900 hover:bg-slate-50'}`}
                >
                  <Plus size={16} /> Duplicate
                </button>

                {selectedIds.length >= 2 && (
                  <>
                    <div className="h-px bg-slate-100 my-1" />
                    <div className="px-6 pt-2 pb-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Grouping</div>
                    <button
                      onClick={() => handleAction('group')}
                      className="w-full px-6 py-3 flex items-center gap-4 text-xs font-black text-left text-slate-900 hover:bg-slate-50"
                    >
                      <Layers size={16} /> Group selection
                    </button>
                    {getGroupByMember(contextMenu.id) && (
                      <button
                        onClick={() => handleAction('ungroup')}
                        className="w-full px-6 py-3 flex items-center gap-4 text-xs font-black text-left text-slate-900 hover:bg-slate-50"
                      >
                        <Layers size={16} /> Ungroup
                      </button>
                    )}
                  </>
                )}

                <div className="h-px bg-slate-100 my-1" />

                {/* GROUP: Align (submenu) */}
                <div className="px-6 pt-2 pb-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Align</div>

                {/* Align submenu: click-toggled (not hover) so it won't disappear while moving into it */}
                <div className="relative">
                  <button
                    className="w-full px-6 py-3 hover:bg-slate-50 flex items-center justify-between text-xs font-black text-slate-900 text-left"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setAlignSubmenuOpen((v) => !v);
                    }}
                  >
                    <span className="flex items-center gap-4"><AlignCenter size={16} /> Align</span>
                    <span className="text-slate-400 text-sm">›</span>
                  </button>

                  {/* Align submenu */}
                  {alignSubmenuOpen && (
                    <div
                      className="absolute top-0 z-[220]"
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => e.stopPropagation()}
                      style={(() => {
                        const SUB_W = 240;
                        const PAD = 10;
                        // Collision detection: if there isn't enough room to the right, open the submenu to the left.
                        // Use the original cursor anchor (not the clamped left) for more intuitive behavior.
                        // Use the actual rendered menu position (clamped) to decide flip.
                        const openLeft = (contextMenu.left + 256 + SUB_W + PAD) > window.innerWidth;
                        const sideStyle: React.CSSProperties = openLeft
                          ? { left: -(SUB_W + 8) }
                          : { left: 256 + 8 };

                        // If the main menu is flipped up, the submenu should still stay on-screen.
                        // We'll anchor it to the top of the Align row; clamp happens via viewport overflow hidden-ish positioning.
                        return { ...sideStyle };
                      })()}
                    >
                      <div className="bg-white border-2 border-slate-200 shadow-2xl rounded-2xl py-2 overflow-hidden" style={{ width: 240 }}>
                        <button
                          onClick={() => handleAction('align-left')}
                          className="w-full px-6 py-3 hover:bg-slate-50 flex items-center gap-4 text-xs font-black text-slate-900 text-left"
                        >
                          <AlignLeft size={16} /> Left
                        </button>
                        <button
                          onClick={() => handleAction('align-center')}
                          className="w-full px-6 py-3 hover:bg-slate-50 flex items-center gap-4 text-xs font-black text-slate-900 text-left"
                        >
                          <AlignCenter size={16} /> Center
                        </button>
                        <button
                          onClick={() => handleAction('align-right')}
                          className="w-full px-6 py-3 hover:bg-slate-50 flex items-center gap-4 text-xs font-black text-slate-900 text-left"
                        >
                          <AlignRight size={16} /> Right
                        </button>
                        <div className="h-px bg-slate-100 my-1" />
                        <div className="px-6 pt-2 pb-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Spacing</div>
                        <button
                          onClick={() => handleAction('space-h')}
                          className="w-full px-6 py-3 hover:bg-slate-50 flex items-center gap-4 text-xs font-black text-slate-900 text-left"
                        >
                          <AlignJustify size={16} /> Distribute Horizontally
                        </button>
                        <button
                          onClick={() => handleAction('space-v')}
                          className="w-full px-6 py-3 hover:bg-slate-50 flex items-center gap-4 text-xs font-black text-slate-900 text-left"
                        >
                          <AlignJustify size={16} className="rotate-90" /> Distribute Vertically
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="h-px bg-slate-100 my-1" />

                {/* GROUP: Layer Order */}
                <div className="px-6 pt-2 pb-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Layer Order</div>
                <button
                  onClick={() => handleAction('bringToFront')}
                  className="w-full px-6 py-3 hover:bg-slate-50 flex items-center gap-4 text-xs font-black text-slate-900 text-left"
                >
                  <ArrowUpToLine size={16} /> Bring to Front
                </button>
                <button
                  onClick={() => handleAction('sendToBack')}
                  className="w-full px-6 py-3 hover:bg-slate-50 flex items-center gap-4 text-xs font-black text-slate-900 text-left"
                >
                  <ArrowDownToLine size={16} /> Send to Back
                </button>
                <button
                  onClick={() => handleAction('moveForward')}
                  className="w-full px-6 py-3 hover:bg-slate-50 flex items-center gap-4 text-xs font-black text-slate-900 text-left"
                >
                  <ArrowUp size={16} /> Move Forward
                </button>
                <button
                  onClick={() => handleAction('moveBackward')}
                  className="w-full px-6 py-3 hover:bg-slate-50 flex items-center gap-4 text-xs font-black text-slate-900 text-left"
                >
                  <ArrowDown size={16} /> Move Backward
                </button>

                <div className="h-px bg-slate-100 my-1" />

                {/* GROUP: Fonts */}
                <div className="px-6 pt-2 pb-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Fonts</div>
                <div className="relative group">
  <button
    disabled
    className="w-full px-6 py-3 flex items-center gap-4 text-xs font-black text-left text-slate-300 cursor-not-allowed"
  >
    <Upload size={16} /> Upload Custom Font
  </button>
  <div className="pointer-events-none absolute left-6 top-1/2 -translate-y-1/2 translate-x-40 opacity-0 group-hover:opacity-100 transition-opacity">
    <div className="bg-white border border-slate-200 shadow-xl rounded-2xl px-4 py-3 w-56">
      <div className="text-xs font-black text-slate-900">Coming soon</div>
      <div className="text-[11px] text-slate-600 mt-1">Custom font uploads are temporarily disabled while export rendering is being improved.</div>
    </div>
  </div>
</div>

                {/* GROUP: Edit */}
                <div className="px-6 pt-2 pb-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Edit</div>
                <button
                  onClick={() => handleAction('delete')}
                  className="w-full px-6 py-3 hover:bg-slate-50 flex items-center gap-4 text-xs font-black text-red-600 text-left"
                >
                  <Trash2 size={16} /> Remove
                </button>
              </>
            ) : (
              <>
                <div className="px-6 pt-2 pb-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Canvas</div>
                <button
                  onClick={() => handleAction('paste')}
                  disabled={!clipboard}
                  className={`w-full px-6 py-3 hover:bg-slate-50 flex items-center gap-4 text-xs font-black text-left ${clipboard ? 'text-slate-900' : 'text-slate-300'}`}
                >
                  <Clipboard size={16} /> Paste
                </button>
                <div className="h-px bg-slate-100 my-1" />
                <div className="px-6 pt-2 pb-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Browse</div>
                <button
                  onClick={() => {
                    setActiveTab(EditorTab.ASSETS);
                    setContextMenu(null);
                    setAlignSubmenuOpen(false);
                  }}
                  className="w-full px-6 py-3 hover:bg-slate-50 flex items-center gap-4 text-xs font-black text-slate-900 text-left"
                >
                  <Layers size={16} /> Layers Library
                </button>
              </>
            )}
            </div>
          </div>
        </>
      )}
    </div>

      {/* Font upload heads-up (white card) */}
      {fontUploadWarningOpen && (
        <div className="fixed inset-0 z-[235] flex items-center justify-center bg-black/60 backdrop-blur-sm p-6">
          <div className="bg-white rounded-[28px] p-7 max-w-lg w-full shadow-2xl border border-slate-100">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center shrink-0">
                <Info className="text-amber-700" size={22} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-black text-slate-900">Quick heads up</h3>
                <p className="text-sm text-slate-600 mt-1">
                  Some uploaded fonts may not display perfectly yet (especially in export). We&apos;re improving it.
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <button
                onClick={() => {
                  try { localStorage.setItem('ldd_font_upload_warn_dismissed', '1'); } catch {}
                  setFontUploadWarningOpen(false);
                  fontUploadRef.current?.click();
                }}
                className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-black text-xs shadow-lg shadow-emerald-100 hover:bg-emerald-700"
              >
                Got it — Install Font
              </button>
              <button
                onClick={() => setFontUploadWarningOpen(false)}
                className="px-4 py-3 rounded-xl font-black text-xs border border-slate-200 hover:bg-slate-50 text-slate-700"
              >
                Not now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Font Manager modal (white card) */}
      {fontManagerOpen && (
        <div className="fixed inset-0 z-[236] flex items-center justify-center bg-black/60 backdrop-blur-sm p-6">
          <div className="bg-white rounded-[28px] p-7 max-w-xl w-full shadow-2xl border border-slate-100">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center shrink-0">
                <Type className="text-emerald-700" size={24} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-black text-slate-900">Fonts</h3>
                <p className="text-xs text-slate-600 mt-1">Install or remove custom fonts. These apply to the canvas only.</p>
              </div>
              <button
                onClick={() => setFontManagerOpen(false)}
                className="p-2 rounded-xl hover:bg-slate-100 text-slate-500"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-5 flex items-center justify-between gap-3">
              <div className="relative group">
  <button
    disabled
    className="px-4 py-2 rounded-xl font-black text-xs bg-slate-200 text-slate-400 cursor-not-allowed inline-flex items-center gap-2"
  >
    <Upload size={16} />
    Install Font
  </button>
  <div className="pointer-events-none absolute left-0 top-full mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
    <div className="bg-white border border-slate-200 shadow-xl rounded-2xl px-4 py-3 w-64">
      <div className="text-xs font-black text-slate-900">Coming soon</div>
      <div className="text-[11px] text-slate-600 mt-1">Custom font uploads are temporarily disabled while we improve rendering consistency.</div>
    </div>
  </div>
</div>

              <div className="flex-1" />

              <div className="w-full max-w-sm">
                <label className="text-[11px] font-bold text-slate-700">Preview text</label>
                <input
                  value={fontPreviewText}
                  onChange={(e) => setFontPreviewText(e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-emerald-200"
                  placeholder="Type preview text…"
                />
              </div>
            </div>


            {/* Google Fonts picker */}
            <div className="mt-5 border border-slate-200 rounded-2xl overflow-hidden">
              <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-black text-slate-800">Google Fonts</div>
                  <div className="text-[11px] text-slate-600">Pick from Google Fonts (free/open-licensed; typically commercial-use friendly).</div>
                </div>
                <div className="text-[11px] text-slate-600">{googleFontsLoaded.length} added</div>
              </div>

              <div className="p-4">
                <div className="flex items-center gap-3">
                  <input
                    value={googleFontsQuery}
                    onChange={(e) => setGoogleFontsQuery(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-emerald-200"
                    placeholder="Search Google Fonts…"
                  />
                  <button
                    onClick={() => {
                      const q = googleFontsQuery.trim().toLowerCase();
                      if (!q) return;
                      const exact = googleFontsAll.find(f => (f.family || '').toLowerCase() === q);
                      if (exact) {
                        setGoogleFontsSelected(exact);
                        previewGoogleFont(exact.family);
                        ensureGoogleFontLoaded(exact.family);
                      }
                    }}
                    className="px-4 py-2 rounded-xl font-black text-xs bg-slate-900 text-white hover:bg-slate-800"
                    title="Add exact match"
                  >
                    Add
                  </button>
                </div>

                {googleFontsBusy && (
                  <div className="mt-3 text-xs text-slate-600 inline-flex items-center gap-2">
                    <Loader2 className="animate-spin" size={14} /> Loading Google Fonts…
                  </div>
                )}
                {googleFontsError && (
                  <div className="mt-3 text-xs text-rose-600">{googleFontsError}</div>
                )}

                {!googleFontsBusy && !googleFontsError && googleFontsAll.length > 0 && (
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* List */}
                    <div className="border border-slate-200 rounded-2xl overflow-hidden">
                      <div className="px-3 py-2 bg-white border-b border-slate-200 text-[11px] text-slate-600">
                        Click a font to preview • Double-click to add
                      </div>
                      <div className="max-h-[260px] overflow-auto divide-y divide-slate-100">
                        {googleFontsAll
                          .filter(f => !googleFontsQuery.trim() || (f.family || '').toLowerCase().includes(googleFontsQuery.trim().toLowerCase()))
                          .slice(0, 300)
                          .map((f) => {
                            const family = f.family;
                            const added = googleFontsLoaded.includes(family);
                            const isSel = googleFontsSelected?.family === family;
                            return (
                              <button
                                key={family}
                                onClick={() => { setGoogleFontsSelected(f); previewGoogleFont(family); }}
                                onDoubleClick={() => ensureGoogleFontLoaded(family)}
                                className={
                                  "w-full text-left px-3 py-2 flex items-center justify-between hover:bg-slate-50 " +
                                  (added ? "bg-emerald-50/60 " : "") +
                                  (isSel ? "ring-2 ring-inset ring-indigo-200 " : "")
                                }
                              >
                                <div className="min-w-0">
                                  <div className="text-sm font-black text-slate-900 truncate" style={{ fontFamily: family }}>{family}</div>
                                  <div className="text-[11px] text-slate-600 truncate" style={{ fontFamily: family }}>{fontPreviewText}</div>
                                </div>
                                <div className={"text-[11px] font-black " + (added ? "text-emerald-700" : "text-slate-500")}>
                                  {added ? "Added" : "Add"}
                                </div>
                              </button>
                            );
                          })}
                      </div>
                      <div className="px-3 py-2 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-600">
                        Showing up to 300 results • Type to filter
                      </div>
                    </div>

                    {/* Preview pane */}
                    <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
                      <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                        <div className="min-w-0">
                          <div className="text-xs font-black text-slate-800">Preview</div>
                          <div className="text-[11px] text-slate-600 truncate">
                            {googleFontsSelected ? googleFontsSelected.family : 'Select a font from the list'}
                          </div>
                        </div>
                        {googleFontsSelected && (
                          <div className="flex items-center gap-2">
                            {googleFontsLoaded.includes(googleFontsSelected.family) ? (
                              <button
                                onClick={() => setGoogleFontsLoaded(prev => prev.filter(x => x !== googleFontsSelected.family))}
                                className="px-3 py-2 rounded-xl font-black text-xs bg-rose-600 text-white hover:bg-rose-700 shadow-lg shadow-rose-100"
                                title="Remove from added fonts"
                              >
                                Remove
                              </button>
                            ) : (
                              <button
                                onClick={() => ensureGoogleFontLoaded(googleFontsSelected.family)}
                                className="px-3 py-2 rounded-xl font-black text-xs bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-100"
                                title="Add this font"
                              >
                                Add
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="p-4">
                        {googleFontsSelected ? (
                          <>
                            <div className="text-[11px] text-slate-600">
                              {googleFontsSelected.category ? <span className="font-bold">Category:</span> : null}
                              {googleFontsSelected.category ? ` ${googleFontsSelected.category}` : ''}
                              {googleFontsSelected.subsets?.length ? ` • Subsets: ${googleFontsSelected.subsets.slice(0, 6).join(', ')}${googleFontsSelected.subsets.length > 6 ? '…' : ''}` : ''}
                            </div>

                            <div
                              className="mt-3 rounded-2xl border border-slate-200 p-4 bg-white"
                              style={{ fontFamily: googleFontsSelected.family }}
                            >
                              <div className="text-lg font-black leading-snug">{fontPreviewText}</div>
                              <div className="mt-2 text-sm">{fontPreviewText}</div>
                            </div>

                            {googleFontsSelected.variants?.length ? (
                              <div className="mt-3 text-[11px] text-slate-600">
                                <span className="font-bold">Variants:</span> {googleFontsSelected.variants.slice(0, 10).join(', ')}{googleFontsSelected.variants.length > 10 ? '…' : ''}
                              </div>
                            ) : null}
                          </>
                        ) : (
                          <div className="text-sm text-slate-600">
                            Pick a font on the left to see it here.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="mt-5 border border-slate-200 rounded-2xl overflow-hidden">
              <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="text-xs font-black text-slate-800">Installed Fonts</div>
                <div className="text-[11px] text-slate-600">{customFontFamilies.length} total • {Array.from(usedFontsInDoc).filter(f => customFontFamilies.includes(f)).length} used</div>
              </div>

              <div className="max-h-[320px] overflow-auto">
                {customFontFamilies.length === 0 ? (
                  <div className="p-4 text-sm text-slate-600">
                    No custom fonts installed yet. Click <span className="font-bold">Install Font</span> to add one.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {customFontFamilies.slice().reverse().map((fname) => (
                      <div key={fname} className="p-4 flex items-start gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="text-sm font-black text-slate-900 truncate">{fname}</div>
                            {usedFontsInDoc.has(fname) && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">Used</span>
                            )}
                          </div>
                          <div
                            className="mt-2 text-sm text-slate-800 bg-white rounded-xl border border-slate-100 p-3"
                            style={{ fontFamily: fname }}
                          >
                            {fontPreviewText || ' '}
                          </div>
                        </div>

                        <button
                          onClick={() => { if (!usedFontsInDoc.has(fname)) uninstallCustomFont(fname); }}
                          disabled={usedFontsInDoc.has(fname)}
                          className={`px-3 py-2 rounded-xl font-black text-xs bg-rose-600 text-white shadow-lg shadow-rose-100 inline-flex items-center gap-2 shrink-0 ${usedFontsInDoc.has(fname) ? 'opacity-40 cursor-not-allowed' : 'hover:bg-rose-700'}`}
                          title="Uninstall font"
                        >
                          <Trash2 size={16} />
                          Uninstall
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setFontManagerOpen(false)}
                className="px-4 py-2 rounded-xl font-black text-xs bg-slate-200 text-slate-800 hover:bg-slate-300"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* API Key Required Popup */}

      {needsApiKey && (
        <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/60 backdrop-blur-sm p-6">
          <div className="bg-white rounded-[28px] p-7 max-w-md w-full shadow-2xl border border-slate-100">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center shrink-0">
                <Info className="text-indigo-600" size={24} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-black text-slate-900">API key needed</h3>
                <p className="text-xs text-slate-600 font-medium mt-1">
                  This feature uses Gemini. Add your own Gemini API key in Settings to enable AI tools.
                </p>
              </div>
              <button onClick={() => setNeedsApiKey(false)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500" title="Close"><X size={18} /></button>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setNeedsApiKey(false); setShowSettings(true); }}
                className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-black text-xs shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all"
              >
                Open Settings
              </button>
              <button
                onClick={() => setNeedsApiKey(false)}
                className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-black text-xs hover:bg-slate-200 transition-all"
              >
                Not now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-[230] flex items-center justify-center bg-black/60 backdrop-blur-sm p-6">
          <div className="bg-white rounded-[30px] p-8 max-w-2xl w-full shadow-2xl border border-slate-100 relative">
            <button onClick={() => setShowSettings(false)} className="absolute top-4 right-4 p-2 rounded-xl hover:bg-slate-100 text-slate-500" title="Close"><X size={18} /></button>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center"><Settings className="text-indigo-600" size={24} /></div>
              <div>
                <h3 className="text-xl font-black text-slate-900">Settings</h3>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">API Key · Privacy · Liability</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="text-sm font-black text-slate-900 uppercase">Gemini API Key (per user)</h4>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Your Gemini API Key</label>
                  <div className="flex gap-2 mt-2">
                    <input
                      type={showGeminiKey ? 'text' : 'password'}
                      value={geminiKey}
                      onChange={e => setGeminiKey(e.target.value)}
                      placeholder="Paste your key here"
                      className="flex-1 p-3 bg-white border-2 border-slate-200 rounded-xl text-xs font-black outline-none focus:border-indigo-600"
                    />
                    <button onClick={() => setShowGeminiKey(v => !v)} className="px-3 py-3 rounded-xl bg-white border-2 border-slate-200 text-slate-700 hover:border-indigo-200" title={showGeminiKey ? 'Hide' : 'Show'}>
                      {showGeminiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>

                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => { persistGeminiKey(); setAiError(null); }}
                      className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all"
                    >
                      Save Key
                    </button>
                    <button
                      onClick={() => { setGeminiKey(''); localStorage.removeItem(LDD_GEMINI_KEY_STORAGE); setShowGeminiKey(false); }}
                      className="flex-1 py-2.5 bg-white border-2 border-slate-200 text-slate-700 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all"
                    >
                      Clear
                    </button>
                  </div>

                  <div className="mt-4 space-y-2">
                    <button
                      onClick={() => window.open('https://aistudio.google.com/app/apikey', '_blank', 'noopener,noreferrer')}
                      className="w-full py-2.5 bg-emerald-50 text-emerald-700 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-100 transition-all"
                    >
                      Get a free Gemini API key
                    </button>
                    <ol className="text-xs text-slate-600 font-medium list-decimal pl-5 space-y-1">
                      <li>Open the Gemini API Key page.</li>
                      <li>Sign in with Google and create a key.</li>
                      <li>Paste it here, then click <span className="font-black">Save Key</span>.</li>
                    </ol>
                    <p className="text-[10px] text-slate-500 font-bold italic">
                      Tip: Set usage limits/quotas in your Google project so you never get surprised.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-white border-2 border-slate-100">
                  <h4 className="text-sm font-black text-slate-900 uppercase mb-2">Privacy Policy</h4>
                  <p className="text-xs text-slate-600 font-medium leading-relaxed">
                    Your Gemini API key is stored locally in your browser (localStorage) and is not sent to LavenderDragonDesign.
                    When you use an AI feature, your prompt/text and your key are sent directly to Google’s Gemini API to generate a response.
                    Avoid entering sensitive personal information.
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-white border-2 border-slate-100">
                  <h4 className="text-sm font-black text-slate-900 uppercase mb-2">Liability Notice</h4>
                  <p className="text-xs text-slate-600 font-medium leading-relaxed">
                    LavenderDragonDesign is not liable for API charges, usage, quota overruns, or costs incurred from your Gemini API key.
                    You are responsible for your own key and billing settings. If you publish this tool publicly, add rate limits and quotas.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white border-2 border-slate-100">
                  <h4 className="text-sm font-black text-slate-900 uppercase mb-2">Support</h4>
                  <a
                    href={LDD_BMAC_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-white border-2 border-slate-200 text-slate-900 hover:bg-slate-50 transition-all text-[10px] font-black uppercase tracking-widest"
                  >
                    <Coffee size={16} /> Buy Me a Coffee
                  </a>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowSettings(false)} className="px-5 py-3 bg-slate-100 text-slate-700 rounded-xl font-black text-xs hover:bg-slate-200">Close</button>
            </div>
          </div>
        </div>
      )}
  </div>
  );
};

export default App;