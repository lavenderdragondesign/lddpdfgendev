
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
  ArrowUpToLine, ArrowDownToLine, ArrowUp, ArrowDown, Hand, ZoomIn, Check,
  MessageSquarePlus, Smartphone, Image as ImageExport, SlidersHorizontal, Shuffle, RefreshCw, AlertTriangle
} from 'lucide-react';
import html2canvas from 'html2canvas';
import SocialIconGrid from '../components/SocialIconGrid';
import { jsPDF } from 'jspdf';
import * as pdfjsLib from 'pdfjs-dist';


pdfjsLib.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@4.10.38/build/pdf.worker.mjs`;

const LDD_ETY_SHOP_URL = 'https://www.etsy.com/shop/LavenderDragonDesign';
const LDD_BMAC_URL = 'https://www.buymeacoffee.com/lavenderdragondesign';

const CANVAS_WIDTH = 816; 
const CANVAS_HEIGHT = 1056; 

type PlatformTemplate = {
  id: string;
  name: string;
  accent: string;
  title: string;
  shortDesc: string;
  mainDesc: string;
  buttonText: string;
  promoEnabled: boolean;
  promoTitle: string;
  promoCode: string;
  promoSubtitle: string;
};

const PLATFORM_TEMPLATES: PlatformTemplate[] = [
  {
    id: 'etsy',
    name: 'Etsy',
    accent: '#F1641E',
    title: 'Your Digital Files Are Ready',
    shortDesc: 'Thank you for your purchase!',
    mainDesc: 'Click the button below to access your files. We recommend saving this page so you can come back anytime.',
    buttonText: 'Download Now',
    promoEnabled: true,
    promoTitle: 'SPECIAL OFFER',
    promoCode: 'SAVE20',
    promoSubtitle: '20% off your next purchase',
  },
  {
    id: 'facebook',
    name: 'Facebook',
    accent: '#1877F2',
    title: 'Your Files Are Ready',
    shortDesc: 'Thanks for your purchase!',
    mainDesc: 'Tap the button below to open your files and save this page if you want quick access later.',
    buttonText: 'Tap to Download',
    promoEnabled: true,
    promoTitle: 'GROUP BONUS',
    promoCode: 'VIP20',
    promoSubtitle: '20% off your next order',
  },
  {
    id: 'instagram',
    name: 'Instagram',
    accent: '#E1306C',
    title: 'Your Files Are Ready ✨',
    shortDesc: 'Thanks for your support!',
    mainDesc: 'Tap below to download your files instantly.',
    buttonText: 'Tap to Download',
    promoEnabled: true,
    promoTitle: 'INSTA DEAL',
    promoCode: 'INSTA15',
    promoSubtitle: '15% off your next order',
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    accent: '#111111',
    title: 'DOWNLOAD YOUR FILES',
    shortDesc: 'Your purchase is ready.',
    mainDesc: 'Tap below to get your files now.',
    buttonText: 'GET FILES',
    promoEnabled: true,
    promoTitle: 'TOK BONUS',
    promoCode: 'TOK10',
    promoSubtitle: '10% off your next purchase',
  },
  {
    id: 'threads',
    name: 'Threads',
    accent: '#000000',
    title: 'Your Files Are Ready 👇',
    shortDesc: 'Thanks for grabbing this!',
    mainDesc: 'Tap below to download your files instantly.',
    buttonText: 'Download Files',
    promoEnabled: true,
    promoTitle: 'THREAD DROP',
    promoCode: 'THREAD10',
    promoSubtitle: '10% off your next download',
  },
  {
    id: 'pinterest',
    name: 'Pinterest',
    accent: '#E60023',
    title: 'Download Your Files',
    shortDesc: 'Your purchase is ready!',
    mainDesc: 'Click below to access your files.',
    buttonText: 'Download Now',
    promoEnabled: true,
    promoTitle: 'PIN BONUS',
    promoCode: 'PIN20',
    promoSubtitle: '20% off your next purchase',
  },
  {
    id: 'youtube',
    name: 'YouTube',
    accent: '#FF0000',
    title: 'Your Download Is Ready 🎬',
    shortDesc: 'Thanks for supporting!',
    mainDesc: 'Click below to access your files.',
    buttonText: 'Download Files',
    promoEnabled: true,
    promoTitle: 'SUB BONUS',
    promoCode: 'YT15',
    promoSubtitle: '15% off your next download',
  },
  {
    id: 'x',
    name: 'X',
    accent: '#000000',
    title: 'Your Files Are Ready',
    shortDesc: 'Appreciate the support 🙌',
    mainDesc: 'Click below to grab your files instantly.',
    buttonText: 'Download',
    promoEnabled: true,
    promoTitle: 'FOLLOW BONUS',
    promoCode: 'X10',
    promoSubtitle: '10% off your next drop',
  },
  {
    id: 'shopify',
    name: 'Shopify',
    accent: '#95BF47',
    title: 'Thanks for your order!',
    shortDesc: 'Your download is ready.',
    mainDesc: 'Click below to access your files.',
    buttonText: 'Access Your Files',
    promoEnabled: false,
    promoTitle: '',
    promoCode: '',
    promoSubtitle: '',
  },
  {
    id: 'gumroad',
    name: 'Gumroad',
    accent: '#FF90E8',
    title: 'Thanks for Your Purchase!',
    shortDesc: 'Your files are ready.',
    mainDesc: 'Click below to access your download instantly.',
    buttonText: 'Get Your Files',
    promoEnabled: false,
    promoTitle: '',
    promoCode: '',
    promoSubtitle: '',
  },
  {
    id: 'website',
    name: 'Website',
    accent: '#6366F1',
    title: 'Your Files Are Ready',
    shortDesc: 'Thank you for your purchase!',
    mainDesc: 'Click below to download your files.',
    buttonText: 'Download Now',
    promoEnabled: true,
    promoTitle: 'SPECIAL OFFER',
    promoCode: 'SAVE10',
    promoSubtitle: '10% off your next purchase',
  },
  {
    id: 'clean',
    name: 'Clean',
    accent: '#4F46E5',
    title: 'Your Files Are Ready',
    shortDesc: 'Thank you for your purchase!',
    mainDesc: 'Click below to access your files.',
    buttonText: 'Download',
    promoEnabled: false,
    promoTitle: '',
    promoCode: '',
    promoSubtitle: '',
  },
];




const SOCIAL_ICON_ASSETS: Record<string, string> = {
  facebook: '/social/facebook.png',
  instagram: '/social/instagram.png',
  twitter: '/social/x.png',
  pinterest: '/social/pinterest.png',
  tiktok: '/social/tiktok.png',
  canva: '/social/canva.svg',
  threads: '/social/threads.svg',
  etsy: '/social/icons8-etsy-48.png',
  website: '/social/icons8-domain-48.png',
  shopify: '/social/icons8-shopify-48.png',
  woo: '/social/woocommerce.png',
};

const DISABLED_SOCIALS = [] as const;


const SOCIAL_GROUPS = [
  {
    title: 'Social',
    keys: ['facebook', 'instagram', 'twitter', 'threads', 'pinterest', 'tiktok', 'canva'] as const,
  },
  {
    title: 'Stores',
    keys: ['etsy', 'shopify', 'woo', 'website'] as const,
  },
] as const;


type SocialCardDef = { key: string; label: string; group: 'Social' | 'Stores'; disabled?: boolean };

const SOCIAL_CARDS: SocialCardDef[] = [
  { key: 'facebook', label: 'Facebook', group: 'Social' },
  { key: 'instagram', label: 'Instagram', group: 'Social' },
  { key: 'twitter', label: 'X', group: 'Social' },
  { key: 'threads', label: 'Threads', group: 'Social', disabled: false },
  { key: 'pinterest', label: 'Pinterest', group: 'Social' },
  { key: 'tiktok', label: 'TikTok', group: 'Social' },
  { key: 'canva', label: 'Canva', group: 'Social' },
  { key: 'etsy', label: 'Etsy', group: 'Stores' },
  { key: 'shopify', label: 'Shopify', group: 'Stores' },
  { key: 'woo', label: 'WooCommerce', group: 'Stores' },
  { key: 'website', label: 'Website', group: 'Stores' },
];

const detectPlatformFromUrl = (url: string): string | null => {
  const value = (url || '').toLowerCase().trim();
  if (!value) return null;
  if (value.includes('facebook.com')) return 'facebook';
  if (value.includes('instagram.com')) return 'instagram';
  if (value.includes('twitter.com') || value.includes('x.com')) return 'twitter';
  if (value.includes('threads.net')) return 'threads';
  if (value.includes('pinterest.com') || value.includes('pin.it')) return 'pinterest';
  if (value.includes('tiktok.com')) return 'tiktok';
  if (value.includes('canva.com')) return 'canva';
  if (value.includes('etsy.com')) return 'etsy';
  if (value.includes('myshopify.com') || value.includes('shopify.com')) return 'shopify';
  if (value.includes('woocommerce') || value.includes('wordpress.com')) return 'woo';
  return null;
};

const normalizeSocialValue = (value: string) => {
  const v = (value || '').trim();
  if (!v) return '';
  if (/^https?:\/\//i.test(v) || /^mailto:/i.test(v)) return v;
  return `https://${v}`;
};


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
      socials: { family: 'Inter', size: 48, align: 'center', color: '#475569' },
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
    facebook: '', instagram: '', twitter: '', threads: '', etsy: '', website: '', shopify: '', woo: '', pinterest: '', tiktok: '', customIcon: '', customLink: '',
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
      footer: { x: 158, y: 936, w: 500, h: 40 },
      logo: { x: 378, y: 20, w: 60, h: 60 },
      socials: { x: 118, y: 974, w: 580, h: 68 }
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
  const toStartCaseLabel = (value: string) => value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
  const applyPlatformTemplate = (template: PlatformTemplate) => {
    setConfig(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      next.content = next.content || {};
      next.promo = next.promo || {};
      next.colors = next.colors || {};
      next.visibility = next.visibility || {};
      next.button = next.button || {};
      next.cta = next.cta || {};

      next.content.title = template.title;
      next.content.shortDesc = template.shortDesc;
      next.content.mainDesc = template.mainDesc;
      next.content.buttonText = template.buttonText;

      // Mirror likely legacy fields so the UI/canvas/export all stay in sync.
      next.button.text = template.buttonText;
      next.cta.text = template.buttonText;

      next.colors.accent = template.accent;
      next.colors.button = template.accent;
      next.colors.promoBg = template.accent;

      next.promo.enabled = template.promoEnabled;
      next.promo.title = template.promoTitle;
      next.promo.code = template.promoCode;
      next.promo.description = template.promoSubtitle;

      next.visibility.title = true;
      next.visibility.shortDesc = true;
      next.visibility.mainDesc = true;
      next.visibility.button = true;
      next.visibility.promo = template.promoEnabled;
      return next;
    });
  };

  const hasExistingSourceLink = (cfg: any) => {
    return Boolean(cfg?.source?.link || cfg?.content?.buttonLink);
  };

  const [activeTab, setActiveTab] = useState<EditorTab | 'templates'>(EditorTab.SOURCE);
  const [selectedSocialEditor, setSelectedSocialEditor] = useState<string | null>(null);
  const [socialTooltip, setSocialTooltip] = useState<{ label: string; x: number; y: number } | null>(null);

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
  const [toolbarTargetId, setToolbarTargetId] = useState<string>('title');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const canvasRef = useRef<HTMLDivElement>(null);
  const fontUploadRef = useRef<HTMLInputElement>(null);
  const [fontUploadWarningOpen, setFontUploadWarningOpen] = useState<boolean>(false);

  useEffect(() => {
    if (selectedId) setToolbarTargetId(selectedId);
  }, [selectedId]);

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
const [fontManagerOpen, setFontManagerOpen] = useState<boolean>(false);
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

  // Pre-load fonts for all visible list items so they render in their own typeface immediately
  useEffect(() => {
    if (!fontManagerOpen || googleFontsAll.length === 0) return;
    const visible = googleFontsAll
      .filter(f => !googleFontsQuery.trim() || (f.family || '').toLowerCase().includes(googleFontsQuery.trim().toLowerCase()))
      .slice(0, 300);
    // Batch in small chunks to avoid flooding the network
    let i = 0;
    const step = () => {
      const chunk = visible.slice(i, i + 20);
      chunk.forEach(f => previewGoogleFont(f.family));
      i += 20;
      if (i < visible.length) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [fontManagerOpen, googleFontsAll, googleFontsQuery, previewGoogleFont]);

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
  const [showConstructionModal, setShowConstructionModal] = useState(false);

  // Project identity & recent projects
  const [projectId, setProjectId] = useState<string>(() => localStorage.getItem('ldd_current_project_id') || `proj_${Date.now()}`);
  const [projectName, setProjectName] = useState<string>(() => localStorage.getItem('ldd_current_project_name') || 'Untitled Project');
  const [recentProjects, setRecentProjects] = useState<{id: string; name: string; config: PDFConfig; savedAt: number}[]>(() => {
    try { return JSON.parse(localStorage.getItem('ldd_recent_projects') || '[]'); } catch { return []; }
  });
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [showSaveProjectModal, setShowSaveProjectModal] = useState(false);
  const [showClearRecentConfirm, setShowClearRecentConfirm] = useState(false);
  const [openProjectTab, setOpenProjectTab] = useState<'recent' | 'presets'>('recent');
  const [showSuggestBox, setShowSuggestBox] = useState(false);
  const [suggestText, setSuggestText] = useState('');
  const [suggestSent, setSuggestSent] = useState(false);
  const [showMobilePreview, setShowMobilePreview] = useState(false);
  const [mobilePreviewImg, setMobilePreviewImg] = useState<string | null>(null);
  const [exportScale, setExportScale] = useState<1|2|3>(2);
  const [newProjectNameInput, setNewProjectNameInput] = useState('');
  const [saveProjectNameInput, setSaveProjectNameInput] = useState('');
  const [showGetStarted, setShowGetStarted] = useState(false);
  const [getStartedDontShow, setGetStartedDontShow] = useState(false);
  const [toolbarMode, setToolbarMode] = useState<'auto' | 'show' | 'hide'>('show');
  const [showToolbarSettings, setShowToolbarSettings] = useState(false);

// Tips panel (docked on the right side of the editor viewport)
const TIPS_OPEN_KEY = 'ldd_pdfgen_tips_panel_open_v1';
const [tipsOpen, setTipsOpen] = useState<boolean>(() => {
  const v = localStorage.getItem(TIPS_OPEN_KEY);
  // Open by default (only respect stored value if present)
  return v == null ? false : v === '1';
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
  const [extractToast, setExtractToast] = useState(false);
  const [linkNotDetected, setLinkNotDetected] = useState(false);
  const [detectedNonMdUrl, setDetectedNonMdUrl] = useState<string | null>(null);
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

  

  const didInitGetStartedRef = useRef(false);

  useEffect(() => {
    if (didInitGetStartedRef.current) return;
    didInitGetStartedRef.current = true;

    const hasFile = Boolean(config?.source?.fileName);
    const hasLink = hasExistingSourceLink(config);

    setShowGetStarted(!hasFile && !hasLink);
  }, [config]);


  // removed png popup state


  const [showSettings, setShowSettings] = useState(false);
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
    if (savedWork && !skipRestore) {
      setRestoreModal(true);
    } else if (!savedWork && localStorage.getItem('ldd_get_started_hidden') !== '1') {
      // Brand new user — show get started only if welcome is already dismissed
      if (localStorage.getItem('lavender_welcome_hidden')) {
        setTimeout(() => setShowGetStarted(true), 300);
      }
      // Otherwise it fires from the welcome "Let's Go" button handler
    }
  }, []);

  // Ensure text blocks don't load with tiny boxes that clip content.
  useEffect(() => { setConfig(prev => autoFitStandardTextBlocks(prev)); }, []);

  // Auto-save logic

  // Auto-toggle socials visibility (show only when at least one social link is filled)
  useEffect(() => {
    const s = config.socials;
    const has = Boolean((s.facebook||'').trim() || (s.instagram||'').trim() || (s.etsy||'').trim() || (s.website||'').trim() || (s.shopify||'').trim() || (s.woo||'').trim() || (s.pinterest||'').trim() || (s.tiktok||'').trim() || (s.customLink||'').trim());
    if (config.visibility.socials !== has) {
      setConfig(prev => ({ ...prev, visibility: { ...prev.visibility, socials: has } }));
    }
  }, [config.socials.facebook, config.socials.instagram, (config.socials as any).twitter, (config.socials as any).threads, config.socials.etsy, config.socials.website, config.socials.shopify, config.socials.woo, config.socials.pinterest, config.socials.tiktok, config.socials.customLink]);
  useEffect(() => {
    // If the "Open Recent" modal is open and the user hasn't chosen yet,
    // do NOT autosave the blank INITIAL_CONFIG over their real saved work.
    if (restoreModal && !restoreChoiceMade) return;

    const timer = setTimeout(() => {
      localStorage.setItem('lavender_autosave', JSON.stringify(config));
      // Also upsert into recent projects list (keep last 10)
      const snapshot = { id: projectId, name: projectName, config: JSON.parse(JSON.stringify(config)), savedAt: Date.now() };
      setRecentProjects(prev => {
        const filtered = prev.filter(p => p.id !== projectId);
        const next = [snapshot, ...filtered].slice(0, 10);
        try { localStorage.setItem('ldd_recent_projects', JSON.stringify(next)); } catch {}
        return next;
      });
      try { localStorage.setItem('ldd_current_project_id', projectId); } catch {}
      try { localStorage.setItem('ldd_current_project_name', projectName); } catch {}
    }, 2000);
    return () => clearTimeout(timer);
  }, [config, restoreModal, restoreChoiceMade, projectId, projectName]);

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
      // pt-16 already shifts content down 64px — just center within the remaining usable height.
      const usableH = vh - 64;
      const x = (vw - CANVAS_WIDTH * zoom) / 2;
      const y = (usableH - CANVAS_HEIGHT * zoom) / 2;
      setOffset({ x, y });
    };

    center();
    window.addEventListener('resize', center);
    return () => window.removeEventListener('resize', center);
  }, [zoom, hasUserPanned]);

  // Deselect only when the user clicks the empty canvas background.
  // (We intentionally do NOT deselect on clicks in the UI, so the top toolbar
  // doesn't disappear when you interact with it.)


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
      if (!file.name.toLowerCase().endsWith('.json')) {
        if (file.name.toLowerCase().endsWith('.pdf')) {
          e.target.value = '';
          alert('Open Project only accepts .json project files.\n\nTo auto-extract a download link, go to the Source tab and upload your original MD Download.pdf or any PDF containing a MyDesigns download link. Note: other download links will not auto-extract.');
        } else {
          alert(`"${file.name}" is not a valid project file.\n\nOpen Project only accepts .json files saved with Save Project.`);
          e.target.value = '';
        }
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const loadedConfig = JSON.parse(event.target?.result as string);
          const normalized = normalizeLoadedConfig(loadedConfig);
          setConfig(normalized);
          setHistory([normalized]);
          setHistoryIndex(0);
        } catch (err) {
          alert('Failed to load project file. The file may be corrupted or not a valid project file.');
        }
      };
      reader.readAsText(file);
      return;
    }

    if (type === 'source') {
      setIsExtracting(true);
      setLinkNotDetected(false);
      setDetectedNonMdUrl(null);
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

        if (extractedUrl) {
          const isMdLink = /mydesigns\.io|download\.mydesigns/i.test(extractedUrl);
          if (isMdLink) {
            // MD link — set on canvas and show success toast
            setExtractToast(true);
            setTimeout(() => setExtractToast(false), 3000);
          } else {
            // Non-MD link detected — don't auto-apply, ask user to add manually
            setDetectedNonMdUrl(extractedUrl);
            setLinkNotDetected(true);
          }
        } else {
          setLinkNotDetected(true);
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

  // Open a recent project from the list
  const handleOpenRecent = (proj: {id: string; name: string; config: PDFConfig; savedAt: number}) => {
    const loadedConfig = normalizeLoadedConfig(proj.config);
    setConfig(loadedConfig);
    setHistory([loadedConfig]);
    setHistoryIndex(0);
    setProjectId(proj.id);
    setProjectName(proj.name);
    setRestoreChoiceMade(true);
    setRestoreModal(false);

    const hasFile = Boolean(loadedConfig?.source?.fileName);
    const hasLink = hasExistingSourceLink(loadedConfig);

    if (localStorage.getItem('ldd_get_started_hidden') !== '1' && !hasFile && !hasLink) {
      setTimeout(() => setShowGetStarted(true), 200);
    } else {
      setShowGetStarted(false);
    }
  };

  // Start a brand-new project (called after user confirms name)
  const confirmNewProject = (name: string) => {
    const id = `proj_${Date.now()}`;
    setProjectId(id);
    setProjectName(name || 'Untitled Project');
    setConfig(INITIAL_CONFIG as unknown as PDFConfig);
    setHistory([INITIAL_CONFIG as unknown as PDFConfig]);
    setHistoryIndex(0);
    setRestoreChoiceMade(true);
    setRestoreModal(false);
    setShowNewProjectModal(false);
    setNewProjectNameInput('');
    // Show get-started prompt unless user has opted out
    if (localStorage.getItem('ldd_get_started_hidden') !== '1') {
      setShowGetStarted(true);
    }
  };

  // Mobile preview rendering is handled by refreshMobilePreview below.
  // Keeping only one effect prevents repeated refresh loops in the modal preview.

  const handleGlobalFontSwitch = (family: string) => {
    if (!family || family === '__add_new__') return;
    setConfig(prev => ({
      ...prev,
      fonts: {
        ...prev.fonts,
        global: family,
        blocks: Object.fromEntries(
          Object.entries(prev.fonts.blocks).map(([k, v]) => [k, { ...v, family }])
        ) as any,
      },
    }));
  };

  const handleSaveProject = (customName?: string) => {
    try {
      const safeBase = (customName || projectName || `lavender_project_${Date.now()}`)
        .trim()
        .replace(/[^a-z0-9-_ ]/gi, '')
        .replace(/\s+/g, '_') || `lavender_project_${Date.now()}`;
      const blob = new Blob([JSON.stringify(config)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${safeBase}.json`;
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 100);
      setShowSaveProjectModal(false);
    } catch (e) {
      alert("Project too large to save.");
    }
  };

  const handleClearRecentProjects = () => {
    setRecentProjects([]);
    try { localStorage.removeItem('ldd_recent_projects'); } catch {}
    setShowClearRecentConfirm(false);
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
    const loadedConfig = JSON.parse(JSON.stringify(presetConfig));
    setConfig(loadedConfig);
    setHistory([loadedConfig]);
    setHistoryIndex(0);

    const hasFile = Boolean(loadedConfig?.source?.fileName);
    const hasLink = hasExistingSourceLink(loadedConfig);

    if (localStorage.getItem('ldd_get_started_hidden') !== '1' && !hasFile && !hasLink) {
      setShowGetStarted(true);
    } else {
      setShowGetStarted(false);
    }
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
	        if (selectedSocialEditor) { setSelectedSocialEditor(null); return; }
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
  }, [selectedId, clipboard, handleAction, contextMenu, editingId, selectedSocialEditor]);

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
      { id: 'facebook', label: 'Facebook', link: config.socials.facebook, asset: SOCIAL_ICON_ASSETS.facebook, customImg: null },
      { id: 'instagram', label: 'Instagram', link: config.socials.instagram, asset: SOCIAL_ICON_ASSETS.instagram, customImg: null },
      { id: 'twitter', label: 'X', link: (config.socials as any).twitter, asset: SOCIAL_ICON_ASSETS.twitter, customImg: null },
      { id: 'threads', label: 'Threads', link: (config.socials as any).threads, asset: SOCIAL_ICON_ASSETS.threads, customImg: null },
      { id: 'pinterest', label: 'Pinterest', link: (config.socials as any).pinterest, asset: SOCIAL_ICON_ASSETS.pinterest, customImg: null },
      { id: 'tiktok', label: 'TikTok', link: (config.socials as any).tiktok, asset: SOCIAL_ICON_ASSETS.tiktok, customImg: null },
      { id: 'canva', label: 'Canva', link: (config.socials as any).canva, asset: SOCIAL_ICON_ASSETS.canva, customImg: null },
      { id: 'etsy', label: 'Etsy', link: config.socials.etsy, asset: SOCIAL_ICON_ASSETS.etsy, customImg: null },
      { id: 'website', label: 'Website', link: config.socials.website, asset: SOCIAL_ICON_ASSETS.website, customImg: null },
      { id: 'shopify', label: 'Shopify', link: config.socials.shopify, asset: SOCIAL_ICON_ASSETS.shopify, customImg: null },
      { id: 'woo', label: 'WooCommerce', link: config.socials.woo, asset: SOCIAL_ICON_ASSETS.woo, customImg: null },
      { id: 'custom', label: 'Custom', link: (config.socials as any).customLink, asset: null, customImg: (config.socials as any).customIcon || null },
    ].filter(s => !!s.link && !(DISABLED_SOCIALS as readonly string[]).includes(s.id));
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
  const pendingPngRef = useRef<string | null>(null);
  const [renamePngModalOpen, setRenamePngModalOpen] = useState(false);
  const [renamePngValue, setRenamePngValue] = useState('');

  
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
    // Sample a grid of points across the canvas for reliable blank detection
    const steps = 8;
    const xs = Array.from({ length: steps }, (_, i) => Math.floor((i / (steps - 1)) * (w - 1)));
    const ys = Array.from({ length: steps }, (_, i) => Math.floor((i / (steps - 1)) * (h - 1)));
    let nonEmpty = 0;
    const threshold = Math.floor(steps * steps * 0.05); // 5% of sampled pixels must have content
    for (const y of ys) for (const x of xs) {
      const d = ctx.getImageData(x, y, 1, 1).data;
      // Any non-transparent pixel counts as content.
      if (d[3] > 0) nonEmpty++;
      if (nonEmpty > threshold) return false;
    }
    return nonEmpty === 0;
  } catch {
    return true;
  }
};

// Convert any image source into a data URL before export.
// This keeps html2canvas from losing relative /social assets in the cloned DOM,
// which is what caused the social icons to export as broken white boxes / X marks.
const blobToDataUrl = (blob: Blob): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result || ''));
  reader.onerror = reject;
  reader.readAsDataURL(blob);
});

const toDataUrlViaCanvas = (src: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const c = document.createElement('canvas');
        c.width = img.naturalWidth || img.width || 1;
        c.height = img.naturalHeight || img.height || 1;
        const ctx = c.getContext('2d');
        if (!ctx) throw new Error('2d context unavailable');
        ctx.drawImage(img, 0, 0);
        resolve(c.toDataURL('image/png'));
      } catch (e) { reject(e); }
    };
    img.onerror = reject;
    img.src = src + (src.includes('?') ? '&' : '?') + '_export=' + Date.now();
  });
};

const srcToDataUrl = async (src: string): Promise<string> => {
  const absoluteSrc = new URL(src, window.location.href).href;

  try {
    const res = await fetch(absoluteSrc, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
    return await blobToDataUrl(await res.blob());
  } catch {
    return await toDataUrlViaCanvas(absoluteSrc);
  }
};

// Replace all img srcs inside el with data URLs, return a restore fn.
const convertImagesToDataURLs = async (el: HTMLElement): Promise<() => void> => {
  const imgs = Array.from(el.querySelectorAll('img')) as HTMLImageElement[];
  const originals: { img: HTMLImageElement; src: string | null }[] = [];

  await Promise.all(imgs.map(async (img) => {
    const originalSrc = img.getAttribute('src');
    const resolvedSrc = img.currentSrc || img.src || originalSrc || '';
    if (!resolvedSrc || resolvedSrc.startsWith('data:') || resolvedSrc.startsWith('blob:')) return;

    try {
      const dataUrl = await srcToDataUrl(resolvedSrc);
      originals.push({ img, src: originalSrc });
      img.src = dataUrl;
      img.setAttribute('data-export-inlined', '1');
    } catch {
      // If an image still refuses to load, remove src so html2canvas skips it cleanly.
      originals.push({ img, src: originalSrc });
      img.removeAttribute('src');
    }
  }));

  await Promise.all(imgs.map(img => new Promise<void>(resolve => {
    if (!img.getAttribute('src') || img.complete) return resolve();
    const done = () => {
      img.removeEventListener('load', done);
      img.removeEventListener('error', done);
      resolve();
    };
    img.addEventListener('load', done, { once: true });
    img.addEventListener('error', done, { once: true });
  })));

  return () => originals.forEach(({ img, src }) => {
    if (src) img.setAttribute('src', src);
    else img.removeAttribute('src');
  });
};

const renderElementForExport = async (el: HTMLElement, bg: string): Promise<HTMLCanvasElement> => {
  const bgColor = bg || '#ffffff';

  // Deep-clone the element so we can mutate it freely without affecting the live DOM.
  const clone = el.cloneNode(true) as HTMLElement;

  // Strip all transforms and position the clone off-screen but fully visible.
  // Attaching directly to <body> escapes every overflow:hidden ancestor.
  clone.style.cssText = `
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    transform: none !important;
    width: ${el.offsetWidth}px !important;
    height: ${el.offsetHeight}px !important;
    z-index: -9999 !important;
    pointer-events: none !important;
    opacity: 1 !important;
    visibility: visible !important;
    background-color: ${bgColor} !important;
    margin: 0 !important;
    padding: 0 !important;
    border: none !important;
    outline: none !important;
    box-shadow: none !important;
  `;
  document.body.appendChild(clone);

  try {
    clone.style.border = 'none';
    clone.style.outline = 'none';
    clone.style.boxShadow = 'none';
    const exportSurface = clone.querySelector('#pdf-canvas') as HTMLElement | null;
    if (exportSurface) {
      exportSurface.style.border = 'none';
      exportSurface.style.outline = 'none';
      exportSurface.style.boxShadow = 'none';
      exportSurface.style.margin = '0';
    }
  } catch {}

  // Inject custom font @font-face rules into the clone so html2canvas can render them correctly.
  try {
    const storedFonts: {name: string; dataUrl: string}[] = JSON.parse(localStorage.getItem('ldd_custom_fonts_data_v1') || '[]');
    if (storedFonts.length > 0) {
      const styleEl = document.createElement('style');
      styleEl.textContent = storedFonts.map(f => {
        const ext = (f.dataUrl.split(';')[0] || '').replace('data:font/', '').replace('data:application/font-', '') || 'truetype';
        const format = ext === 'woff2' ? 'woff2' : ext === 'woff' ? 'woff' : ext === 'otf' ? 'opentype' : 'truetype';
        return `@font-face { font-family: '${f.name}'; src: url('${f.dataUrl}') format('${format}'); font-weight: normal; font-style: normal; }`;
      }).join('\n');
      clone.prepend(styleEl);
      // Pre-load each custom font at all weights before capture
      await Promise.allSettled(storedFonts.flatMap(f => [
        document.fonts.load(`normal 16px "${f.name}"`, 'AaBbCc'),
        document.fonts.load(`bold 16px "${f.name}"`, 'AaBbCc'),
      ]));
    }
  } catch {}

  // Replace external image srcs with data URLs inside the clone (avoids canvas taint).
  await convertImagesToDataURLs(clone);

  // Give the browser extra frames to paint the clone — custom fonts need more time to settle.
  await new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(() => r()))));

  const baseOpts: any = {
    useCORS: true,
    allowTaint: false,
    scale: exportScale,
    backgroundColor: bgColor,
    letterRendering: false,
    width: el.offsetWidth,
    height: el.offsetHeight,
  };

  try {
    try {
      const c1 = await html2canvas(clone, { ...baseOpts, foreignObjectRendering: true });
      if (!isCanvasMostlyBlank(c1)) return c1;
    } catch {
      // fall through
    }
    return await html2canvas(clone, { ...baseOpts, foreignObjectRendering: false });
  } finally {
    document.body.removeChild(clone);
  }
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
      img.style.borderRadius = 'inherit';

      const prevOverflow = btnBlock.style.overflow;
      const prevRadius = btnBlock.style.borderRadius;
      const prevPosition = btnBlock.style.position;
      const computedBtn = window.getComputedStyle(btnBlock);
      const exportRadius = computedBtn.borderRadius || prevRadius || '9999px';

      if (!prevPosition || prevPosition === 'static') {
        btnBlock.style.position = 'relative';
      }
      btnBlock.style.overflow = 'hidden';
      btnBlock.style.borderRadius = exportRadius;

      const prevVisibility = labelEl.style.visibility;
      labelEl.style.visibility = 'hidden';
      btnBlock.appendChild(img);

      return () => {
        try {
          img.remove();
          labelEl.style.visibility = prevVisibility;
          btnBlock.style.overflow = prevOverflow;
          btnBlock.style.borderRadius = prevRadius;
          btnBlock.style.position = prevPosition;
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


  const refreshMobilePreview = useCallback(async () => {
    const canvas = document.getElementById('pdf-canvas');
    if (!canvas) return;
    try {
      setMobilePreviewImg(null);
      await ensureFontsLoadedForExport();
      const rendered = await renderElementForExport(canvas as HTMLElement, config.colors.background);
      setMobilePreviewImg(rendered.toDataURL('image/png'));
    } catch {
      // keep previous preview if rendering fails
    }
  }, [config, ensureFontsLoadedForExport, renderElementForExport]);

  useEffect(() => {
    if (!showMobilePreview) return;
    const t = window.setTimeout(() => {
      refreshMobilePreview();
    }, 120);
    return () => window.clearTimeout(t);
  }, [showMobilePreview, config, googleFontsSelected, customFontFamilies, refreshMobilePreview]);

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
      capture = await renderElementForExport(canvas, config.colors.background);
      const imgData = capture.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: config.paper.orientation === 'portrait' ? 'p' : 'l', unit: 'pt', format: config.paper.size === 'US Letter' ? 'letter' : 'a4' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      const scaleX = pdfWidth / CANVAS_WIDTH;
      const scaleY = pdfHeight / CANVAS_HEIGHT;

      // Ensure URL has a protocol — bare domains like "google.com" become file paths in PDF viewers
      const sanitizeUrl = (url: string) => {
        const u = (url || '').trim();
        if (!u) return u;
        if (/^https?:\/\//i.test(u)) return u;
        if (/^mailto:/i.test(u)) return u;
        return 'https://' + u;
      };

      // Helper: add a clickable link that opens in a new browser tab
      const addLink = (x: number, y: number, w: number, h: number, url: string) => {
        url = sanitizeUrl(url);
        try {
          // Use jsPDF's internal annotation system with a URI action
          (pdf as any).link(x, y, w, h, { url });
          // Patch the last annotation to include the NewWindow flag in the raw PDF stream
          const pages = (pdf as any).internal.pages;
          const annots = (pdf as any).internal.annotations;
          if (annots && annots[(pdf as any).internal.getCurrentPageInfo().pageNumber]) {
            const arr = annots[(pdf as any).internal.getCurrentPageInfo().pageNumber];
            const last = arr[arr.length - 1];
            if (last && last.A) last.A.NewWindow = true;
          }
        } catch {
          (pdf as any).link(x, y, w, h, { url });
        }
      };

      if (config.visibility.button && config.source.link) {
        const b = config.layout.blocks.button;
        addLink(b.x * scaleX, b.y * scaleY, b.w * scaleX, b.h * scaleY, config.source.link);
      }
      if (config.visibility.qr && config.source.link) {
        const qr = config.layout.blocks.qr;
        addLink(qr.x * scaleX, qr.y * scaleY, qr.w * scaleX, qr.h * scaleY, config.source.link);
      }

      // Add links for extra button layers (use their own link, or fall back to main download link)
      config.layout.extraLayers.filter(l => l.type === 'button' && l.visible !== false).forEach(l => {
        const url = (l.content || '').trim() || config.source.link;
        if (url) addLink(l.x * scaleX, l.y * scaleY, l.w * scaleX, l.h * scaleY, url);
      });

      // Add links for socials using the actual centered icon boxes so click targets line up with the exported icons.
      if (config.visibility.socials && activeSocialLinks.length > 0) {
        const sb = config.layout.blocks.socials;
        const renderedIconSize = Math.max(18, Math.min(config.fonts.blocks.socials.size, Math.max(24, sb.h - 10)));
        const iconBoxSize = Math.max(34, renderedIconSize + 10);
        const gap = 12; // Tailwind gap-3 in the on-canvas renderer
        const totalWidth = (activeSocialLinks.length * iconBoxSize) + ((activeSocialLinks.length - 1) * gap);
        const startX = sb.x + Math.max(0, (sb.w - totalWidth) / 2);
        const startY = sb.y + Math.max(0, (sb.h - iconBoxSize) / 2);

        activeSocialLinks.forEach((social, i) => {
          const iconX = startX + i * (iconBoxSize + gap);
          addLink(iconX * scaleX, startY * scaleY, iconBoxSize * scaleX, iconBoxSize * scaleY, social.link);
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
      try { cleanupCustomTextOverlays?.(); } catch {}
    }
  };

  const getQRUrl = () => {
     const data = config.source.link || 'https://lavenderdragondesign.app';
     return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(data)}&color=${config.colors.qrColor.replace('#', '')}&bgcolor=${config.colors.qrBgColor.replace('#', '')}`;
  };

  const toolbarResolvedId = selectedId || toolbarTargetId;
  const activeElementProps = toolbarResolvedId ? (() => {
    const isExtra = isExtraLayer(toolbarResolvedId);
    const target = isExtra ? config.layout.extraLayers.find(l => l.id === toolbarResolvedId) : null;
    const isText = isExtra ? (target?.type === 'text') : (['title', 'shortDesc', 'mainDesc', 'footer', 'promo', 'socials', 'button'].includes(toolbarResolvedId));
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
                { id: 'link', icon: LinkIcon2, label: 'Manual Link' },
                { id: 'drive', icon: HardDrive, label: 'Google Drive' },
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
                     <p className="mt-2 text-[10px] text-slate-400 italic leading-snug">
                       Only MyDesigns download links will auto-extract. Other PDF links will not be detected.
                     </p>
                   </div>
                   {linkNotDetected && (() => {
                     const url = detectedNonMdUrl || '';
                     const isDrive = /drive\.google\.com/i.test(url);
                     const isOneDrive = /onedrive\.live\.com|1drv\.ms/i.test(url);
                     const isShopify = /myshopify\.com|shopify\.com/i.test(url);
                     const isWoo = /woocommerce|\/product\//i.test(url);
                     const hasDetected = !!url;

                     const modeLabel = isDrive ? 'Google Drive' : isOneDrive ? 'OneDrive' : isShopify ? 'Shopify' : isWoo ? 'WooCommerce' : 'Manual Link';
                     const modeId = isDrive ? 'drive' : isOneDrive ? 'one' : isShopify ? 'shopify' : isWoo ? 'woo' : 'link';

                     return (
                       <div className="mt-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-3">
                         <div className="flex gap-2 items-start">
                           <Info size={13} className="text-amber-600 shrink-0 mt-0.5" />
                           <p className="text-[10px] font-black text-amber-800 leading-snug">
                             {hasDetected
                               ? `A ${modeLabel} link was detected but must be added manually — only MyDesigns links auto-apply.`
                               : 'No download link detected in this PDF. Please paste your link manually.'}
                           </p>
                         </div>
                         {hasDetected && (
                           <div className="text-[9px] text-amber-700 font-bold truncate bg-amber-100 rounded-lg px-2 py-1">{url}</div>
                         )}
                         <div className="flex gap-2 flex-wrap">
                           {hasDetected && (
                             <button
                               onClick={() => {
                                 updateConfig('source.mode', modeId);
                                 updateConfig('source.link', url);
                                 setLinkNotDetected(false);
                                 setDetectedNonMdUrl(null);
                               }}
                               className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white rounded-xl font-black text-[10px] hover:bg-indigo-700 transition-all"
                             >
                               <LinkIcon size={11} /> Add to {modeLabel}
                             </button>
                           )}
                           <button
                             onClick={() => {
                               updateConfig('source.mode', 'link');
                               if (url) updateConfig('source.link', url);
                               setLinkNotDetected(false);
                               setDetectedNonMdUrl(null);
                             }}
                             className="flex items-center gap-1.5 px-3 py-2 bg-white border border-amber-300 text-amber-800 rounded-xl font-black text-[10px] hover:bg-amber-100 transition-all"
                           >
                             <LinkIcon size={11} /> {hasDetected && modeId !== 'link' ? 'Add to Manual Link' : 'Enter Manually'}
                           </button>
                         </div>
                       </div>
                     );
                   })()}
                                  </>
               ) : (
                 <div className="space-y-3">
                   <label className="text-[10px] font-black text-slate-900 uppercase">
                     {config.source.mode === 'link' ? 'Manual Link' : config.source.mode === 'drive' ? 'Google Drive Link' : config.source.mode === 'one' ? 'OneDrive Link' : config.source.mode === 'shopify' ? 'Shopify Link' : config.source.mode === 'woo' ? 'WooCommerce Link' : 'Download Link'}
                   </label>
                   <div className="flex gap-2 p-3 bg-white border-2 border-slate-100 rounded-2xl">
                     <LinkIcon size={18} className="text-slate-400 shrink-0" />
                     <input className="flex-1 bg-transparent text-xs font-black outline-none" value={config.source.link} onChange={e => updateConfig('source.link', e.target.value)} placeholder="Paste your link here..." />
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
              <div className="grid grid-cols-2 gap-3">
                <div onClick={() => logoInputRef.current?.click()} className={`h-24 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:border-indigo-400 transition-all ${config.assets.logo ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-100'}`}>
                  {config.assets.logo ? <img src={config.assets.logo} className="w-10 h-10 object-contain" /> : <ImageIcon className="text-slate-400" size={20} />}
                  <span className="text-[10px] font-black uppercase tracking-wide">Logo</span>
                  <input type="file" ref={logoInputRef} hidden accept="image/*" onChange={e => handleFileUpload(e, 'logo')} />
                </div>
                <div onClick={() => watermarkInputRef.current?.click()} className={`h-24 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:border-indigo-400 transition-all ${config.assets.watermark ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-100'}`}>
                  {config.assets.watermark ? <Waves className="text-indigo-600" size={20} /> : <ImageIcon className="text-slate-400" size={20} />}
                  <span className="text-[10px] font-black uppercase tracking-wide">Watermark</span>
                  <input type="file" ref={watermarkInputRef} hidden accept="image/*" onChange={e => handleFileUpload(e, 'watermark')} />
                </div>
              </div>
            </div>
            <div className="pt-4 border-t border-slate-100 space-y-4">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase mb-3">Add Layers</h3>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => { const nid = `text-${Date.now()}`; updateConfig('layout.extraLayers', [...config.layout.extraLayers, { id: nid, type: 'text', content: 'New Text', x: 200, y: 300, w: 200, h: 40, fontSize: 16, visible: true, fontFamily: 'Inter', align: 'center', color: '#000000' }]); setSelectedId(nid); }}
                    className="flex flex-col items-center gap-1 py-3 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 rounded-xl border border-slate-200 transition-all"
                  >
                    <Type size={16} /><span className="text-xs font-black">Text</span>
                  </button>
                  <button
                    onClick={() => extraImgInputRef.current?.click()}
                    className="flex flex-col items-center gap-1 py-3 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 rounded-xl border border-slate-200 transition-all"
                  >
                    <ImageIcon size={16} /><span className="text-xs font-black">Image</span>
                  </button>
                  <button
                    onClick={() => { const nid = `btn-${Date.now()}`; updateConfig('layout.extraLayers', [...config.layout.extraLayers, { id: nid, type: 'button', content: '', label: 'Download Now', x: 208, y: 480, w: 400, h: 60, fontSize: 18, visible: true, fontFamily: 'Inter', align: 'center', color: config.colors.buttonText, bgColor: config.colors.button, bold: true }]); setSelectedId(nid); }}
                    className="flex flex-col items-center gap-1 py-3 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 rounded-xl border border-slate-200 transition-all"
                  >
                    <Download size={16} /><span className="text-xs font-black">Button</span>
                  </button>
                </div>
                <input type="file" ref={extraImgInputRef} hidden accept="image/*" onChange={e => handleFileUpload(e, 'extra')} />
              </div>

              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase mb-3">Layer Visibility</h3>
                <div className="space-y-1">
                  <div
                    onClick={() => setSelectedId('watermark')}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl border transition-all cursor-pointer ${selectedId === 'watermark' ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
                  >
                    <span className="text-xs font-black text-slate-700">Watermark</span>
                    <button onClick={(e) => { e.stopPropagation(); updateConfig('visibility.watermark', !config.visibility.watermark); }} className={`p-1 rounded-lg transition-all ${config.visibility.watermark ? 'text-indigo-600' : 'text-slate-300'}`}>
                      {config.visibility.watermark ? <Eye size={14}/> : <EyeOff size={14}/>}
                    </button>
                  </div>
                  {Object.keys(config.layout.blocks).map(id => id !== 'socials' && (
                    <div key={id} onClick={() => setSelectedId(id)} className={`flex items-center justify-between px-3 py-2 rounded-xl border transition-all cursor-pointer ${selectedId === id ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                      <span className="text-xs font-black text-slate-700">{toStartCaseLabel({ title:'Title', shortDesc:'Short Description', mainDesc:'Main Description', button:'Download Button', qr:'QR Code', promo:'Promo Block', footer:'Footer', socials:'Social Links' }[id] || id)}</span>
                      <button onClick={(e) => { e.stopPropagation(); updateConfig(`visibility.${id}`, !config.visibility[id]); }} className={`p-1 rounded-lg transition-all ${config.visibility[id] ? 'text-indigo-600' : 'text-slate-300'}`}>
                        {config.visibility[id] ? <Eye size={14}/> : <EyeOff size={14}/>}
                      </button>
                    </div>
                  ))}
                  {config.layout.extraLayers.map(l => (
                    <div key={l.id} onClick={() => setSelectedId(l.id)} className={`flex items-center justify-between px-3 py-2 rounded-xl border transition-all cursor-pointer ${selectedId === l.id ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                      <span className="text-xs font-black text-slate-700 truncate max-w-[160px]">{toStartCaseLabel(l.type === 'button' ? (l.label || 'Download Button') : l.type === 'text' ? l.content : 'Image Layer')}</span>
                      <button onClick={(e) => { e.stopPropagation(); updateConfig('layout.extraLayers', config.layout.extraLayers.map(x => x.id === l.id ? { ...x, visible: !x.visible } : x)); }} className={`p-1 rounded-lg transition-all ${l.visible !== false ? 'text-indigo-600' : 'text-slate-300'}`}>
                        {l.visible !== false ? <Eye size={14}/> : <EyeOff size={14}/>}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      case EditorTab.SOCIALS:
        return (() => {
          // Map existing config keys to SocialIconGrid's key format
          const socialKeyMap: Record<string, string> = {
            twitter: 'x',
            facebook: 'facebook',
            instagram: 'instagram',
            tiktok: 'tiktok',
            pinterest: 'pinterest',
            threads: 'threads',
            youtube: 'youtube',
            canva: 'canva',
          };

          // Build value prop for SocialIconGrid
          const gridValue = Object.entries(socialKeyMap).reduce((acc, [configKey, gridKey]) => {
            const url = ((config.socials as any)[configKey] || '') as string;
            return { ...acc, [gridKey]: { url, hidden: false } };
          }, {} as Record<string, { url: string; hidden: boolean }>);

          const handleGridChange = (nextLinks: Record<string, { url: string; hidden: boolean }>) => {
            // Map back from gridKey -> configKey
            const reverseMap: Record<string, string> = { x: 'twitter' };
            Object.entries(nextLinks).forEach(([gridKey, data]) => {
              const configKey = reverseMap[gridKey] || gridKey;
              updateConfig(`socials.${configKey}`, data.url);
            });
          };

          const setSocialValue = (key: string, value: string) => updateConfig(`socials.${key}`, value);
          const handleQuickPaste = (raw: string) => {
            const detected = detectPlatformFromUrl(raw);
            if (!detected || (DISABLED_SOCIALS as readonly string[]).includes(detected)) return;
            setSocialValue(detected, normalizeSocialValue(raw));
          };

          return (
            <div className="space-y-5">
              <div className="rounded-[24px] border-2 border-slate-100 bg-white p-4 shadow-sm">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-black uppercase text-slate-900">Social Presence</h3>
                    <p className="mt-1 text-[10px] font-bold italic text-slate-400">Click an icon to set its link. Drag to reorder. Keep it tidy.</p>
                  </div>
                </div>

                <SocialIconGrid
                  value={gridValue as any}
                  onChange={handleGridChange as any}
                  className="mb-2"
                />
              </div>

              <div className="rounded-[24px] border-2 border-slate-100 bg-white p-4 shadow-sm">
                <div
                  className="rounded-2xl border-2 border-slate-100 bg-slate-50 p-3 transition-all hover:border-indigo-200 hover:bg-white"
                >
                  <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Quick Paste (Stores)</label>
                  <input
                    className="w-full bg-transparent text-sm font-bold text-slate-700 outline-none placeholder:text-slate-300"
                    placeholder="Paste an Etsy, Shopify, or WooCommerce URL here..."
                    onPaste={(e) => {
                      const pasted = e.clipboardData.getData('text');
                      if (pasted) setTimeout(() => handleQuickPaste(pasted), 0);
                    }}
                    onBlur={(e) => {
                      const value = e.target.value.trim();
                      if (value) {
                        handleQuickPaste(value);
                        e.target.value = '';
                      }
                    }}
                  />
                </div>
              </div>

              {/* Store links (Etsy, Shopify, WooCommerce, Website) — kept as simple inputs */}
              <div className="space-y-3">
                <div className="px-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Stores</div>
                <div className="grid grid-cols-2 gap-3">
                  {SOCIAL_CARDS.filter(item => item.group === 'Stores').map(item => {
                    const value = ((config.socials as any)[item.key] || '') as string;
                    const tooltipLabel = value.trim() ? `${item.label} · Link attached` : `Add ${item.label} link`;

                        return (
                          <div
                            key={item.key}
                            className={`relative rounded-[24px] border-2 p-3 transition-all ${value.trim() ? 'border-indigo-200 bg-indigo-50/70 shadow-sm' : 'border-slate-100 bg-white hover:border-slate-200 hover:shadow-sm'}`}
                            onMouseEnter={(e) => { const r = e.currentTarget.getBoundingClientRect(); setSocialTooltip({ label: tooltipLabel, x: r.left + r.width / 2, y: r.top - 10 }); }}
                            onMouseMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); setSocialTooltip({ label: tooltipLabel, x: r.left + r.width / 2, y: r.top - 10 }); }}
                            onMouseLeave={() => setSocialTooltip(t => t?.label === tooltipLabel ? null : t)}
                          >
                            <div className="mb-3 flex items-center gap-3">
                              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
                                {SOCIAL_ICON_ASSETS[item.key]
                                  ? <img src={SOCIAL_ICON_ASSETS[item.key]} alt={item.label} className="h-6 w-6 object-contain" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                                  : <Share2 size={18} className="text-slate-400" />}
                              </div>
                              <div className="min-w-0">
                                <div className="truncate text-xs font-black uppercase text-slate-900">{item.label}</div>
                                <div className="text-[10px] font-bold text-slate-400">{value.trim() ? 'Link attached' : 'No link yet'}</div>
                              </div>
                            </div>

                            <input
                              className="w-full rounded-2xl border-2 px-3 py-2.5 text-xs font-bold outline-none transition-all placeholder:text-slate-300 border-slate-100 bg-white focus:border-indigo-300"
                              value={value}
                              onChange={e => setSocialValue(item.key, e.target.value)}
                              onBlur={e => setSocialValue(item.key, normalizeSocialValue(e.target.value))}
                              placeholder="Paste link..."
                            />

                            <div className="mt-3 flex items-center justify-between gap-2">
                              <button
                                type="button"
                                onClick={() => { if (!value.trim()) return; navigator.clipboard.writeText(value).catch(() => {}); }}
                                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-slate-600 transition-all hover:border-slate-300 hover:bg-slate-50"
                              >
                                Copy
                              </button>
                              <button
                                type="button"
                                onClick={() => setSocialValue(item.key, '')}
                                className="rounded-xl border border-red-200 bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-red-500 transition-all hover:bg-red-50"
                              >
                                Clear
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

              <div className="rounded-[24px] border-2 border-slate-100 bg-white p-4 space-y-3 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Custom Platform</label>
                    <p className="mt-1 text-[10px] font-bold text-slate-400">Use this for a site that does not fit the presets.</p>
                  </div>
                  {(config.socials as any).customIcon && <img src={(config.socials as any).customIcon} className="h-8 w-8 rounded-xl object-contain border border-slate-100 bg-white p-1" />}
                </div>
                <input
                  className="w-full rounded-2xl border-2 border-slate-100 bg-white px-3 py-2.5 text-xs font-bold outline-none transition-all focus:border-indigo-300"
                  value={(config.socials as any).customLink || ''}
                  onChange={e => updateConfig('socials.customLink', e.target.value)}
                  onBlur={e => updateConfig('socials.customLink', normalizeSocialValue(e.target.value))}
                  placeholder="https://..."
                />
                <div className="flex items-center gap-3">
                  <label className="flex cursor-pointer items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-slate-600 transition-all hover:bg-indigo-50 hover:text-indigo-700">
                    <Upload size={12} /> {(config.socials as any).customIcon ? 'Change Icon' : 'Upload Icon'}
                    <input type="file" hidden accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = ev => updateConfig('socials.customIcon', ev.target?.result as string); r.readAsDataURL(f); }} />
                  </label>
                  <button
                    type="button"
                    onClick={() => { updateConfig('socials.customLink', ''); updateConfig('socials.customIcon', ''); }}
                    className="rounded-xl border border-red-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-red-500 transition-all hover:bg-red-50"
                  >
                    Clear Custom
                  </button>
                </div>
              </div>

              <div className="rounded-[24px] border-2 border-slate-100 bg-white p-4 space-y-2 shadow-sm">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Icon Size</label>
                  <span className="text-[11px] font-black text-indigo-600">{config.fonts.blocks.socials.size}px</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={96}
                  step={1}
                  value={config.fonts.blocks.socials.size}
                  onChange={e => updateConfig('fonts.blocks.socials.size', Number(e.target.value))}
                  className="w-full accent-indigo-600"
                />
                <div className="flex justify-between text-[9px] font-bold text-slate-400">
                  <span>Small</span><span>Large</span>
                </div>
              </div>

              {socialTooltip && (
                <div
                  className="fixed z-[260] pointer-events-none"
                  style={{ left: socialTooltip.x, top: socialTooltip.y, transform: 'translate(-50%, -100%)' }}
                >
                  <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-black text-slate-700 shadow-2xl whitespace-nowrap">
                    {socialTooltip.label}
                  </div>
                </div>
              )}
            </div>
          );
        })();
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
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900 uppercase">Branding Colors</h3>
              <button
                type="button"
                onClick={() => {
                  updateConfig('colors.background', '#ffffff');
                  updateConfig('colors.accent', '#f97316');
                  updateConfig('colors.promoBg', '#f97316');
                  updateConfig('colors.button', '#3b82f6');
                  updateConfig('colors.buttonText', '#ffffff');
                  updateConfig('colors.qrColor', '#000000');
                  updateConfig('colors.qrBgColor', '#ffffff');
                }}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 transition-all hover:border-indigo-200 hover:text-indigo-600"
              >
                Reset
              </button>
            </div>

            <div className="grid grid-cols-5 gap-2">
              {[
                { name: 'Sunset', accent: '#f97316', promoBg: '#f97316', button: '#3b82f6', buttonText: '#ffffff', background: '#ffffff', qrColor: '#000000', qrBgColor: '#ffffff' },
                { name: 'Lavender', accent: '#8b5cf6', promoBg: '#a855f7', button: '#7c3aed', buttonText: '#ffffff', background: '#fcfaff', qrColor: '#2e1065', qrBgColor: '#ffffff' },
                { name: 'Rose', accent: '#f43f5e', promoBg: '#fb7185', button: '#e11d48', buttonText: '#ffffff', background: '#fffafc', qrColor: '#4c0519', qrBgColor: '#ffffff' },
                { name: 'Ocean', accent: '#06b6d4', promoBg: '#0891b2', button: '#2563eb', buttonText: '#ffffff', background: '#f8fdff', qrColor: '#0f172a', qrBgColor: '#ffffff' },
                { name: 'Forest', accent: '#22c55e', promoBg: '#16a34a', button: '#15803d', buttonText: '#ffffff', background: '#fbfffc', qrColor: '#052e16', qrBgColor: '#ffffff' },
              ].map(preset => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => {
                    updateConfig('colors.accent', preset.accent);
                    updateConfig('colors.promoBg', preset.promoBg);
                    updateConfig('colors.button', preset.button);
                    updateConfig('colors.buttonText', preset.buttonText);
                    updateConfig('colors.background', preset.background);
                    updateConfig('colors.qrColor', preset.qrColor);
                    updateConfig('colors.qrBgColor', preset.qrBgColor);
                  }}
                  className="overflow-hidden rounded-2xl border-2 border-slate-100 bg-white text-left transition-all hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-lg hover:shadow-slate-200/60"
                >
                  <div className="grid grid-cols-4 h-8">
                    <span style={{ backgroundColor: preset.background }} />
                    <span style={{ backgroundColor: preset.accent }} />
                    <span style={{ backgroundColor: preset.promoBg }} />
                    <span style={{ backgroundColor: preset.button }} />
                  </div>
                  <div className="px-2 py-2 text-[10px] font-black uppercase tracking-wide text-slate-700">{preset.name}</div>
                </button>
              ))}
            </div>

            {[
              { id: 'background', label: 'Canvas Background', value: config.colors.background },
              { id: 'accent', label: 'Accent Color', value: config.colors.accent },
              { id: 'promoBg', label: 'Promo Background', value: (config.colors as any).promoBg ?? config.colors.accent },
              { id: 'button', label: 'Button Background', value: config.colors.button },
              { id: 'buttonText', label: 'Button Text', value: config.colors.buttonText },
              { id: 'qrColor', label: 'QR Code', value: config.colors.qrColor },
              { id: 'qrBgColor', label: 'QR Background', value: config.colors.qrBgColor },
            ].map(c => (
              <div key={c.id} className="flex items-center justify-between gap-3 p-4 bg-white border-2 border-slate-100 rounded-2xl">
                <div className="min-w-0">
                  <label className="block text-[10px] font-black text-slate-900 uppercase">{c.label}</label>
                  <div className="mt-1 text-[10px] font-bold text-slate-400">{String(c.value).toUpperCase()}</div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={c.value}
                    onChange={e => updateConfig(`colors.${c.id}`, e.target.value)}
                    className="w-24 rounded-xl border-2 border-slate-100 bg-slate-50 px-2 py-2 text-[10px] font-black uppercase tracking-wide text-slate-700 outline-none focus:border-indigo-300 focus:bg-white"
                  />
                  <input
                    type="color"
                    value={c.value}
                    onChange={e => updateConfig(`colors.${c.id}`, e.target.value)}
                    className="h-10 w-10 rounded-xl border-2 border-slate-100 cursor-pointer"
                  />
                </div>
              </div>
            ))}
          </div>
        );
      case EditorTab.CONTENT:
        return (
          <div className="space-y-5">
            <h3 className="text-base font-black text-slate-900 uppercase">Text Content</h3>

            {/* Extra button layers — show link + label editor */}
            {config.layout.extraLayers.filter(l => l.type === 'button').length > 0 && (
              <div className="space-y-3">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Extra Download Buttons</h4>
                {config.layout.extraLayers.filter(l => l.type === 'button').map(l => (
                  <div key={l.id} className="p-4 bg-white border-2 border-slate-100 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black text-slate-700">{l.label || 'Download Button'}</span>
                      <button onClick={() => updateConfig('layout.extraLayers', config.layout.extraLayers.filter(x => x.id !== l.id))} className="p-1 text-red-400 hover:text-red-600 transition-all"><Trash2 size={13}/></button>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase">Button Label</label>
                      <input
                        className="w-full mt-1 p-2.5 bg-slate-50 border-2 border-transparent focus:border-indigo-500 outline-none rounded-xl text-xs font-black transition-all"
                        value={l.label || ''}
                        onChange={e => updateConfig('layout.extraLayers', config.layout.extraLayers.map(x => x.id === l.id ? { ...x, label: e.target.value } : x))}
                        placeholder="Download Now"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase">Download Link <span className="text-slate-300">(optional)</span></label>
                      <div className="flex gap-2 mt-1 p-2.5 bg-slate-50 border-2 border-transparent focus-within:border-indigo-500 rounded-xl transition-all">
                        <LinkIcon size={14} className="text-slate-400 shrink-0 mt-0.5" />
                        <input
                          className="flex-1 bg-transparent text-xs font-black outline-none"
                          value={l.content || ''}
                          onChange={e => updateConfig('layout.extraLayers', config.layout.extraLayers.map(x => x.id === l.id ? { ...x, content: e.target.value } : x))}
                          placeholder="https://... (leave blank to use main link)"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {([
              { key: 'title', label: 'Title' },
              { key: 'shortDesc', label: 'Short description' },
              { key: 'footer', label: 'Footer' },
            ] as const).map(({ key, label }) => (
              <div key={key} className="space-y-2">
                <label className="text-[11px] font-black text-slate-900 uppercase">{label}</label>
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
              </div>
              <textarea
                className="w-full mt-2 p-3 bg-white border-2 border-slate-100 rounded-2xl text-sm font-black h-32"
                value={config.content.mainDesc}
                onChange={e => updateConfig('content.mainDesc', e.target.value)}
              />
            </div>

          </div>
        );

      case 'templates':
        return (
          <div className="space-y-5">
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase">Platform Templates</h3>
              <p className="text-[10px] font-bold text-slate-400 italic">One-click starters that keep your file and download link intact.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {PLATFORM_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.id}
                  onClick={() => applyPlatformTemplate(tpl)}
                  className="group rounded-[22px] border-2 border-slate-200 bg-white p-4 text-left transition-all hover:-translate-y-0.5 hover:border-indigo-400 hover:shadow-lg hover:shadow-indigo-100"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-3.5 w-3.5 rounded-full shrink-0" style={{ backgroundColor: tpl.accent }} />
                    <div className="text-sm font-black text-slate-900">{tpl.name}</div>
                  </div>
                  <div className="mt-2 text-[11px] font-bold leading-4 text-slate-500">{tpl.title}</div>
                  <div className="mt-3 inline-flex rounded-xl bg-slate-50 px-2.5 py-1 text-[10px] font-black text-slate-600">
                    {tpl.buttonText}
                  </div>
                </button>
              ))}
            </div>
            <div className="rounded-[22px] border-2 border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-[11px] font-bold leading-5 text-slate-500">
              Templates update visible content like headlines, button text, promo copy, and accent colors. Your source file and existing download link stay untouched.
            </div>
          </div>
        );

      case EditorTab.PRESETS:
        return (
          <div className="space-y-4">

            {/* Working on */}
            <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl">
              <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1">Currently Working On</p>
              <input
                type="text"
                value={projectName}
                onChange={e => setProjectName(e.target.value)}
                placeholder="Untitled Project"
                className="w-full bg-transparent text-sm font-black text-indigo-900 outline-none placeholder-indigo-300"
              />
              <p className="text-[9px] text-indigo-300 mt-1">✓ Auto-saving</p>
            </div>

            {/* 3 simple actions */}
            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={() => { setRestoreChoiceMade(false); setRestoreModal(true); }}
                className="w-full py-3.5 bg-white border-2 border-slate-100 rounded-2xl font-black text-sm text-slate-900 hover:border-indigo-400 hover:text-indigo-700 transition-all flex items-center gap-3 px-4"
              >
                <RotateCw size={18} className="text-indigo-500 shrink-0" />
                <div className="text-left">
                  <div className="text-xs font-black">Switch Project</div>
                  <div className="text-[9px] font-medium text-slate-400">All auto-saved — pick any recent project</div>
                </div>
              </button>
              <button
                onClick={() => { setShowNewProjectModal(true); setNewProjectNameInput(''); }}
                className="w-full py-3.5 bg-white border-2 border-slate-100 rounded-2xl font-black text-sm text-slate-900 hover:border-indigo-400 hover:text-indigo-700 transition-all flex items-center gap-3 px-4"
              >
                <Plus size={18} className="text-indigo-500 shrink-0" />
                <div className="text-left">
                  <div className="text-xs font-black">New Project</div>
                  <div className="text-[9px] font-medium text-slate-400">Start from a blank canvas</div>
                </div>
              </button>
            </div>

            <div className="h-px bg-slate-100" />

            {/* Transfer between devices */}
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Transfer to Another Device</p>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={handleSaveProject} className="flex flex-col items-center gap-2 p-4 bg-white border-2 border-slate-100 rounded-2xl hover:border-indigo-400 transition-all">
                  <FileJson size={22} className="text-indigo-500" />
                  <span className="text-[10px] font-black text-slate-700">Save to File</span>
                </button>
                <button onClick={() => projectInputRef.current?.click()} className="flex flex-col items-center gap-2 p-4 bg-white border-2 border-slate-100 rounded-2xl hover:border-indigo-400 transition-all">
                  <FolderOpen size={22} className="text-indigo-500" />
                  <span className="text-[10px] font-black text-slate-700">Load</span>
                  <input type="file" ref={projectInputRef} hidden accept=".json" onChange={e => handleFileUpload(e, 'project')} />
                </button>
              </div>
              <p className="text-[9px] text-slate-400 text-center mt-2">Saves your design settings only — not the PDF.</p>
            </div>

            <div className="h-px bg-slate-100" />

            <button onClick={handleSavePreset} className="w-full py-3 bg-slate-50 text-slate-600 rounded-xl font-black text-[10px] uppercase hover:bg-slate-100 transition-all flex items-center justify-center gap-2"><Plus size={14} /> Save as Preset</button>
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
    const resolvedId = selectedId || toolbarTargetId || 'title';
    if (isExtraLayer(resolvedId)) {
      return config.layout.extraLayers.find(l => l.id === resolvedId);
    }
    return config.fonts.blocks[resolvedId];
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
    ['templates']: {
      title: 'Template Tips',
      tips: [
        { icon: Layout, text: 'Templates are quick starters for different platforms.' },
        { icon: Palette, text: 'They update visible content and color styling only.' },
        { icon: LinkIcon2, text: 'Your source file and download link stay untouched.' },
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
    return null;
  }

  const key = tipsSection === 'CANVAS' ? 'CANVAS' : tipsSection;
  const payload = tipsBySection[key];

  return (
    <div className="fixed top-24 right-4 w-[280px] max-w-[calc(100vw-2rem)] h-[min(420px,calc(100vh-10rem))] z-[160] no-print">
      <div className="h-full bg-white border-2 border-slate-200 rounded-[24px] shadow-2xl overflow-hidden flex flex-col">
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


  const sidebarDockOffset = isSidebarMinimized ? 0 : 232;
  const toolbarCenterStyle = { left: `calc(50% + ${sidebarDockOffset}px)` };
  const helperPillWidth = isSidebarMinimized
    ? 'min(640px, calc(100vw - 2rem))'
    : 'min(640px, calc(100vw - 2rem - 464px))';
  const toolbarDockWidth = isSidebarMinimized
    ? 'min(1180px, calc(100vw - 2rem))'
    : 'min(1180px, calc(100vw - 2rem - 464px))';

  return (
    <div className="relative h-screen w-screen">

    <div className="h-screen w-screen flex bg-slate-100 font-sans transition-colors overflow-hidden">
      <input ref={fontUploadRef} type="file" accept=".ttf,.otf,.woff,.woff2" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadFont(f); e.currentTarget.value = ''; }} />
      {/* CONTEXTUAL TOOLBAR */}
      {/* Hidden toolbar indicator — shows a pull-down arrow when toolbar is not visible */}
      <div
        className="fixed top-4 -translate-x-1/2 min-h-[68px] border-2 border-slate-200 bg-white/95 backdrop-blur-2xl z-[100] flex items-center justify-center px-5 py-3 shadow-[0_10px_35px_rgba(0,0,0,0.10)] no-print transition-transform duration-300 rounded-[28px] translate-y-0"
        style={{ ...toolbarCenterStyle, width: toolbarDockWidth, maxWidth: toolbarDockWidth }}
      >
        {(activeElementProps || { isExtra: false, target: null, isText: true }) && (
          <div className="flex w-full flex-wrap items-center justify-center gap-x-6 gap-y-3 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex items-center gap-3 pr-6 border-r border-slate-200">
              <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2.5 py-1.5 rounded-[14px] min-w-[120px] text-center">{selectedId ? `Selected: ${selectedId.split('-')[0]}` : `Toolbar: ${toolbarTargetId.split('-')[0]}`}</span>
              <button onClick={() => selectedId && handleAction('delete')} disabled={!selectedId} className={`p-2 rounded-[14px] transition-all ${selectedId ? 'text-red-500 hover:bg-red-50' : 'text-slate-300 cursor-not-allowed'}`}><Trash2 size={16}/></button>
            </div>
            
            <div className="min-w-[980px] flex items-center justify-start">
            {activeElementProps.isText && activeFont && (
              <>
                <div className="flex items-center gap-2">
                  <Type size={16} className="text-slate-400 shrink-0" />
                  <select 
                    className="bg-transparent text-xs font-black outline-none border-none cursor-pointer hover:text-indigo-600 transition-colors max-w-[140px]"
                    value={activeFont.family || (activeFont as any).fontFamily || 'Inter'}
                    onChange={e => {
                      if (e.target.value === '__add_new__') { setFontManagerOpen(true); return; }
                      if (activeElementProps.isExtra) updateConfig('layout.extraLayers', config.layout.extraLayers.map(l => l.id === selectedId ? { ...l, fontFamily: e.target.value } : l));
                      else updateConfig(`fonts.blocks.${selectedId}.family`, e.target.value);
                    }}
                  >
                    {Array.from(new Set([...FONT_FAMILIES, ...googleFontsLoaded, ...customFontFamilies])).map(ff => <option key={ff} value={ff}>{ff}</option>)}
                    <option disabled>──────────</option>
                    <option value="__add_new__">+ Add New Font...</option>
                  </select>
                  {/* Fonts manager button — next to dropdown */}
                  <div className="relative group/fonts shrink-0">
                    <button
                      onClick={() => setFontManagerOpen(true)}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 inline-flex items-center gap-1.5 text-[10px] font-black border border-slate-200"
                    >
                      <Type size={13} className="text-indigo-500" />
                      Fonts
                    </button>
                    <div className="absolute top-full left-0 mt-2 w-64 opacity-0 group-hover/fonts:opacity-100 pointer-events-none transition-all duration-150 z-[200]">
                      <div className="w-2.5 h-2.5 bg-white border-l border-t border-slate-200 rotate-45 absolute -top-1.5 left-4" />
                      <div className="bg-white border-2 border-slate-200 rounded-2xl p-3.5 shadow-xl">
                        <div className="flex items-center gap-2 mb-2">
                          <Type size={13} className="text-indigo-500 shrink-0" />
                          <span className="text-[11px] font-black uppercase tracking-widest text-slate-900">Font Manager</span>
                        </div>
                        <p className="text-[10px] text-slate-500 leading-relaxed">Install Google Fonts or upload custom fonts (.ttf/.otf/.woff). Installed fonts appear in the dropdown.</p>
                        <div className="mt-2.5 pt-2.5 border-t border-slate-100 text-[9px] text-indigo-500 font-black">Click to open Font Manager →</div>
                      </div>
                    </div>
                  </div>
                  {/* Switch All Fonts button — applies selected font to all blocks */}
                  <div className="relative group/switchall shrink-0">
                    <button
                      onClick={() => {
                        const fam = activeFont.family || (activeFont as any).fontFamily || 'Inter';
                        handleGlobalFontSwitch(fam);
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 text-slate-500 inline-flex items-center gap-1.5 text-[10px] font-black border border-slate-200"
                    >
                      <Shuffle size={13} />
                      Switch All
                    </button>
                    <div className="absolute top-full left-0 mt-2 w-72 opacity-0 group-hover/switchall:opacity-100 pointer-events-none transition-all duration-150 z-[200]">
                      <div className="w-2.5 h-2.5 bg-white border-l border-t border-slate-200 rotate-45 absolute -top-1.5 left-4" />
                      <div className="bg-white border-2 border-slate-200 rounded-2xl p-3.5 shadow-xl">
                        <div className="flex items-center gap-2 mb-2">
                          <Shuffle size={13} className="text-indigo-500 shrink-0" />
                          <span className="text-[11px] font-black uppercase tracking-widest text-slate-900">Switch All Fonts</span>
                        </div>
                        <p className="text-[10px] text-slate-500 leading-relaxed">Applies the currently selected font to <span className="text-slate-900 font-black">every text element</span> on the canvas at once.</p>
                        <div className="mt-2.5 pt-2.5 border-t border-slate-100 space-y-1.5">
                          <div className="text-[9px] text-slate-500 font-bold flex items-center gap-1.5"><span className="text-indigo-500 font-black">1.</span> Install or select a font from the dropdown</div>
                          <div className="text-[9px] text-slate-500 font-bold flex items-center gap-1.5"><span className="text-indigo-500 font-black">2.</span> Click Switch All to apply everywhere</div>
                        </div>
                      </div>
                    </div>
                  </div>
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

                

{/* GROUP: Align + Layer Order */}
<div className="flex items-center gap-1 border-l pl-6 border-slate-200">
  <button onClick={() => handleAction('align-left')} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500" title="Align Left"><AlignLeft size={16}/></button>
  <button onClick={() => handleAction('align-center')} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500" title="Align Center"><AlignCenter size={16}/></button>
  <button onClick={() => handleAction('align-right')} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500" title="Align Right"><AlignRight size={16}/></button>
  <div className="w-px h-6 bg-slate-200 mx-2" />
  <button onClick={() => handleAction('sendToBack')} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500" title="Send to Back"><ArrowDownToLine size={16}/></button>
  <button onClick={() => handleAction('bringToFront')} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500" title="Bring to Front"><ArrowUpToLine size={16}/></button>
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
            
            </div>
            <div className="flex-1" />
          </div>
        )}
      </div>

      {showOnboarding && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-lg p-6">
          <div className="bg-white rounded-[40px] p-10 max-w-lg w-full shadow-2xl relative text-center border-t-8 border-indigo-600">
            <button
              onClick={() => { if (dontShowAgain) localStorage.setItem('lavender_welcome_hidden', 'true'); setShowOnboarding(false); }}
              className="absolute top-5 right-5 p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-all"
            ><X size={18} /></button>
            <div className="flex flex-col items-center gap-3 mb-5">
              <img src="/logo.png" alt="LavenderDragonDesign's Custom Branded Download PDF Generator" className="w-16 h-16 rounded-2xl object-contain ring-2 ring-indigo-100 bg-white p-1" />
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">LavenderDragonDesign's Custom Branded Download PDF Generator</h2>
                <p className="text-sm font-bold text-indigo-500">Full branded delivery page builder</p>
              </div>
            </div>
            <div className="bg-slate-50 p-5 rounded-3xl text-left border border-slate-100 mb-6">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">What's New</p>
              <ul className="text-xs text-slate-700 space-y-2.5 font-medium">
                <li className="flex items-start gap-2"><Check size={13} className="text-indigo-500 mt-0.5 shrink-0" /><span>Workspace-centered dock — the top toolbar now tracks the real editor area instead of drifting under the sidebar.</span></li>
                <li className="flex items-start gap-2"><Check size={13} className="text-indigo-500 mt-0.5 shrink-0" /><span>Formatting toolbar behavior — auto-hide, always show, or always hide via ⚙ settings.</span></li>
                <li className="flex items-start gap-2"><Check size={13} className="text-indigo-500 mt-0.5 shrink-0" /><span>Canvas spacing fix — the page now sits lower when the dock is open so it stops covering your content.</span></li>
                <li className="flex items-start gap-2"><Check size={13} className="text-indigo-500 mt-0.5 shrink-0" /><span>Social icons now default to 48px and can still be resized from the Social tab.</span></li>
                <li className="flex items-start gap-2"><Check size={13} className="text-indigo-500 mt-0.5 shrink-0" /><span>Live Google Fonts preview — see every font before you apply it.</span></li>
              </ul>
            </div>
            <div className="flex flex-col gap-3">
              <label className="flex items-center justify-center gap-3 cursor-pointer group">
                <input type="checkbox" checked={dontShowAgain} onChange={e => setDontShowAgain(e.target.checked)} className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                <span className="text-sm font-black text-slate-500 group-hover:text-indigo-600 transition-colors">Don't show this again</span>
              </label>
              <button onClick={() => {
                if (dontShowAgain) localStorage.setItem('lavender_welcome_hidden', 'true');
                setShowOnboarding(false);
                const hasFile = Boolean(config?.source?.fileName);
                const hasLink = hasExistingSourceLink(config);
                if (localStorage.getItem('ldd_get_started_hidden') !== '1' && !hasFile && !hasLink) {
                  setTimeout(() => setShowGetStarted(true), 200);
                }
              }} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-lg hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200">Let's Go</button>
            </div>
          </div>
        </div>
      )}

      {restoreModal && !showOnboarding && (
        <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/50 backdrop-blur-sm p-6">
          <div className="bg-white rounded-[30px] p-8 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-xl font-black text-slate-900">Open Project</h3>
                <p className="text-xs text-slate-400 mt-0.5">Pick a project or start fresh</p>
              </div>
              <button onClick={() => { setRestoreChoiceMade(true); setRestoreModal(false); }} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400"><X size={18} /></button>
            </div>

            <div className="flex gap-2 mb-4">
              <button onClick={() => setOpenProjectTab('recent')} className={`flex-1 py-2 rounded-xl font-black text-[11px] uppercase transition-all ${openProjectTab === 'recent' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Recent</button>
              <button onClick={() => setOpenProjectTab('presets')} className={`flex-1 py-2 rounded-xl font-black text-[11px] uppercase transition-all ${openProjectTab === 'presets' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Presets</button>
            </div>

            {openProjectTab === 'recent' && (
              recentProjects.length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-auto mb-5">
                  {recentProjects.map(proj => (
                    <button key={proj.id} onClick={() => handleOpenRecent(proj)} className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-indigo-50 border-2 border-transparent hover:border-indigo-200 rounded-2xl transition-all text-left group">
                      <div className="min-w-0">
                        <div className="text-sm font-black text-slate-900 truncate group-hover:text-indigo-700">{proj.name}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{new Date(proj.savedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                      </div>
                      <RotateCw size={14} className="text-slate-300 group-hover:text-indigo-500 shrink-0 ml-3" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 text-slate-400 text-xs mb-5">No recent projects yet.</div>
              )
            )}

            {openProjectTab === 'presets' && (
              savedPresets.length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-auto mb-5">
                  {savedPresets.map((preset, idx) => (
                    <button key={idx} onClick={() => { handleLoadPreset(preset.config); setRestoreChoiceMade(true); setRestoreModal(false); }} className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-indigo-50 border-2 border-transparent hover:border-indigo-200 rounded-2xl transition-all text-left group">
                      <div className="min-w-0">
                        <div className="text-sm font-black text-slate-900 truncate group-hover:text-indigo-700">{preset.name}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">Saved preset</div>
                      </div>
                      <div className="flex gap-1 shrink-0 ml-3">
                        <RotateCw size={14} className="text-slate-300 group-hover:text-indigo-500" />
                        <button onClick={(e) => { e.stopPropagation(); handleDeletePreset(idx); }} className="p-1 text-slate-300 hover:text-red-500 transition-all"><Trash2 size={13} /></button>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 text-slate-400 text-xs mb-5">No presets saved yet. Use the Project tab to save one.</div>
              )
            )}

            <div className="grid grid-cols-2 gap-2 mb-2">
              <button
                onClick={() => { setSaveProjectNameInput((projectName || 'Untitled Project').trim()); setShowSaveProjectModal(true); }}
                className="p-3 rounded-2xl border-2 border-slate-100 bg-white hover:border-indigo-300 hover:bg-indigo-50 transition-all text-left"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Save size={15} className="text-indigo-500" />
                  <span className="text-[11px] font-black text-slate-800 uppercase">Save</span>
                </div>
                <div className="text-[10px] text-slate-400 font-medium">Export this project with a custom file name</div>
              </button>
              <button
                onClick={() => setShowClearRecentConfirm(true)}
                className="p-3 rounded-2xl border-2 border-red-100 bg-white hover:border-red-300 hover:bg-red-50 transition-all text-left"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Trash2 size={15} className="text-red-500" />
                  <span className="text-[11px] font-black text-red-600 uppercase">Clear Recent</span>
                </div>
                <div className="text-[10px] text-slate-400 font-medium">Remove the recent project list only</div>
              </button>
            </div>

            <button onClick={() => { setShowNewProjectModal(true); setNewProjectNameInput(''); }} className="w-full py-3 bg-indigo-600 text-white rounded-2xl font-black text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2">
              <Plus size={16} /> New Project
            </button>
          </div>
        </div>
      )}

      {showSaveProjectModal && (
        <div className="fixed inset-0 z-[215] flex items-center justify-center bg-black/55 backdrop-blur-sm p-6">
          <div className="bg-white rounded-[30px] p-7 max-w-sm w-full shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-black text-slate-900">Save Project</h3>
                <p className="text-xs text-slate-400 mt-0.5">Pick a name for your JSON file</p>
              </div>
              <button onClick={() => setShowSaveProjectModal(false)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400"><X size={18} /></button>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 mb-4">
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Save Name</div>
              <input
                type="text"
                value={saveProjectNameInput}
                onChange={e => setSaveProjectNameInput(e.target.value)}
                placeholder="My PDF Project"
                className="w-full rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-800 outline-none focus:border-indigo-400"
              />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowSaveProjectModal(false)} className="flex-1 py-3 rounded-2xl bg-slate-100 text-slate-600 font-black text-sm hover:bg-slate-200 transition-all">Cancel</button>
              <button onClick={() => handleSaveProject(saveProjectNameInput)} className="flex-1 py-3 rounded-2xl bg-indigo-600 text-white font-black text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">Save</button>
            </div>
          </div>
        </div>
      )}

      {showClearRecentConfirm && (
        <div className="fixed inset-0 z-[216] flex items-center justify-center bg-black/55 backdrop-blur-sm p-6">
          <div className="bg-white rounded-[30px] p-7 max-w-sm w-full shadow-2xl border border-red-100">
            <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
              <AlertTriangle size={22} className="text-red-500" />
            </div>
            <h3 className="text-lg font-black text-slate-900 mb-1">Clear Recent Projects?</h3>
            <p className="text-sm text-slate-500 leading-6 mb-5">This clears the recent project list only. Your current project and saved presets stay put.</p>
            <div className="flex gap-2">
              <button onClick={() => setShowClearRecentConfirm(false)} className="flex-1 py-3 rounded-2xl bg-slate-100 text-slate-600 font-black text-sm hover:bg-slate-200 transition-all">Keep Them</button>
              <button onClick={handleClearRecentProjects} className="flex-1 py-3 rounded-2xl bg-red-600 text-white font-black text-sm hover:bg-red-700 transition-all shadow-lg shadow-red-100">Yes, Clear</button>
            </div>
          </div>
        </div>
      )}

      {/* Get Started modal */}
      {showGetStarted && !showOnboarding && !restoreModal && (
        <div className="fixed inset-0 z-[225] flex items-center justify-center bg-black/50 backdrop-blur-sm p-6">
          <div className="bg-white rounded-[28px] shadow-2xl border border-slate-100 p-8 max-w-sm w-full text-center relative">
            <button
              onClick={() => { if (getStartedDontShow) localStorage.setItem('ldd_get_started_hidden', '1'); setShowGetStarted(false); }}
              className="absolute top-4 right-4 p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-all"
            ><X size={16} /></button>
            <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Upload className="text-indigo-600" size={28} />
            </div>
            <h3 className="text-lg font-black text-slate-900 mb-1">Let's Get Started</h3>
            <p className="text-[11px] text-slate-500 mb-6 leading-relaxed">
              Upload your <span className="font-black text-slate-700">MyDesigns Download.pdf</span> to auto-extract your download link, or choose another source below.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => { setShowGetStarted(false); setActiveTab(EditorTab.SOURCE); setIsSidebarMinimized(false); setTimeout(() => sourceInputRef.current?.click(), 150); }}
                className="w-full py-3.5 bg-indigo-600 text-white rounded-2xl font-black text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2"
              >
                <Upload size={15} /> Upload MD Download.pdf
              </button>
              <button
                onClick={() => { setShowGetStarted(false); setActiveTab(EditorTab.SOURCE); setIsSidebarMinimized(false); updateConfig('source.mode', 'link'); }}
                className="w-full py-3 bg-slate-100 text-slate-700 rounded-2xl font-black text-sm hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
              >
                <LinkIcon size={14} /> Enter Link Manually
              </button>
              <div className="flex gap-2">
                {[
                  { id: 'drive', label: 'Google Drive', icon: HardDrive },
                  { id: 'one', label: 'OneDrive', icon: Cloud },
                  { id: 'shopify', label: 'Shopify', icon: ShopifyIcon },
                ].map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => { setShowGetStarted(false); setActiveTab(EditorTab.SOURCE); setIsSidebarMinimized(false); updateConfig('source.mode', id); }}
                    className="flex-1 py-2.5 bg-slate-50 border border-slate-200 text-slate-600 rounded-xl font-black text-[10px] hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition-all flex flex-col items-center gap-1"
                  >
                    <Icon size={13} />{label}
                  </button>
                ))}
              </div>
              <div className="pt-2 flex items-center justify-center gap-2">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={getStartedDontShow}
                    onChange={e => setGetStartedDontShow(e.target.checked)}
                    className="w-4 h-4 rounded accent-indigo-600"
                  />
                  <span className="text-[10px] font-black text-slate-400 group-hover:text-slate-600 transition-colors">Don't show this again</span>
                </label>
              </div>
              <button
                onClick={() => { if (getStartedDontShow) localStorage.setItem('ldd_get_started_hidden', '1'); setShowGetStarted(false); }}
                className="w-full py-2 text-slate-400 font-black text-[10px] hover:text-slate-600 transition-colors"
              >
                Skip for now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Project name prompt */}
      {showNewProjectModal && (
        <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/50 backdrop-blur-sm p-6">
          <div className="bg-white rounded-[28px] p-8 max-w-sm w-full shadow-2xl">
            <h3 className="text-lg font-black text-slate-900 mb-1">Name Your Project</h3>
            <p className="text-xs text-slate-400 mb-5">You can change this any time in the Project tab.</p>
            <input
              autoFocus
              type="text"
              value={newProjectNameInput}
              onChange={e => setNewProjectNameInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') confirmNewProject(newProjectNameInput); if (e.key === 'Escape') setShowNewProjectModal(false); }}
              placeholder="e.g. Summer Sale PDF"
              className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-indigo-500 outline-none rounded-2xl text-sm font-black mb-5 transition-all"
            />
            <div className="flex gap-3">
              <button onClick={() => setShowNewProjectModal(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-black text-xs hover:bg-slate-200">Cancel</button>
              <button onClick={() => confirmNewProject(newProjectNameInput)} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-black text-xs hover:bg-indigo-700 shadow-lg shadow-indigo-100">Create</button>
            </div>
          </div>
        </div>
      )}


      {/* Extract success toast */}
      {extractToast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[300] animate-in slide-in-from-bottom-4 duration-300">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 p-5 flex items-start gap-4 min-w-[320px] max-w-sm">
            <div className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center shrink-0">
              <Check size={18} className="text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-slate-900">MyDesigns Download Link Extracted</p>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">It has been added to your Download Button & QR Code.</p>
            </div>
            <button onClick={() => setExtractToast(false)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 shrink-0"><X size={14} /></button>
          </div>
        </div>
      )}

      {/* Mobile Preview modal */}
      {showMobilePreview && (
        <div className="fixed inset-0 z-[230] flex items-center justify-center bg-black/70 backdrop-blur-sm p-6">
          <div className="bg-slate-100 rounded-[32px] p-6 max-w-sm w-full shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Smartphone size={16} className="text-indigo-600" />
                <span className="text-sm font-black text-slate-900">Mobile Preview</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    const canvas = document.getElementById('pdf-canvas');
                    if (!canvas) return;
                    setMobilePreviewImg(null);
                    setTimeout(() => {
                      renderElementForExport(canvas as HTMLElement, config.colors.background).then(c => {
                        setMobilePreviewImg(c.toDataURL('image/png'));
                      }).catch(() => {});
                    }, 100);
                  }}
                  className="p-2 rounded-xl hover:bg-slate-200 text-slate-400 hover:text-indigo-600 transition-all"
                  title="Refresh preview"
                >
                  <RefreshCw size={15} />
                </button>
                <button onClick={() => setShowMobilePreview(false)} className="p-2 rounded-xl hover:bg-slate-200 text-slate-400"><X size={16} /></button>
              </div>
            </div>
            {/* Phone frame */}
            <div className="bg-slate-900 rounded-[28px] p-2 mx-auto" style={{ width: 260 }}>
              <div className="bg-white rounded-[20px] overflow-hidden" style={{ height: 520 }}>
                <div
                  style={{
                    transform: `scale(${260 / 816})`,
                    transformOrigin: 'top left',
                    width: 816,
                    height: 1056,
                    pointerEvents: 'none',
                  }}
                >
                  {mobilePreviewImg
                    ? <img src={mobilePreviewImg} style={{ width: 816, height: 1056, display: 'block' }} />
                    : <div style={{ width: 816, height: 1056, backgroundColor: config.colors.background, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Loader2 size={32} className="text-indigo-400 animate-spin" /></div>
                  }
                </div>
              </div>
            </div>
            <p className="text-[10px] text-center text-slate-400 mt-3 font-bold">Approximate mobile screen ratio at 65% zoom</p>
          </div>
        </div>
      )}

      {/* Suggest a Feature modal */}
      {showSuggestBox && (
        <div className="fixed inset-0 z-[230] flex items-center justify-center bg-black/50 backdrop-blur-sm p-6">
          <div className="bg-white rounded-[28px] p-8 max-w-sm w-full shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-black text-slate-900">Suggest a Feature</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">What would make this tool better for you?</p>
              </div>
              <button onClick={() => { setShowSuggestBox(false); setSuggestSent(false); setSuggestText(''); }} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400"><X size={16} /></button>
            </div>
            {suggestSent ? (
              <div className="text-center py-8">
                <Check size={32} className="text-emerald-500 mx-auto mb-3" />
                <p className="text-sm font-black text-slate-900">Thanks for the suggestion!</p>
                <p className="text-[11px] text-slate-400 mt-1">We read every one.</p>
                <button onClick={() => { setSuggestSent(false); setSuggestText(''); }} className="mt-4 text-[11px] font-black text-indigo-600 hover:underline">Send another</button>
              </div>
            ) : (
              <>
                <textarea
                  autoFocus
                  value={suggestText}
                  onChange={e => setSuggestText(e.target.value)}
                  placeholder="e.g. I'd love to be able to..."
                  className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-indigo-500 outline-none rounded-2xl text-sm font-medium h-32 resize-none transition-all mb-4"
                />
                <button
                  disabled={!suggestText.trim()}
                  onClick={async () => {
                    try {
                      await fetch('/', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                        body: new URLSearchParams({
                          'form-name': 'suggestions',
                          'suggestion': suggestText.trim(),
                        }).toString(),
                      });
                    } catch {}
                    // Also save locally as backup
                    try {
                      const existing = JSON.parse(localStorage.getItem('ldd_suggestions') || '[]');
                      existing.push({ text: suggestText.trim(), at: new Date().toISOString() });
                      localStorage.setItem('ldd_suggestions', JSON.stringify(existing));
                    } catch {}
                    setSuggestSent(true);
                  }}
                  className="w-full py-3 bg-indigo-600 text-white rounded-2xl font-black text-sm hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  Send Suggestion
                </button>
              </>
            )}
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

      {/* PNG Rename Modal */}
      {renamePngModalOpen && (
        <div className="fixed inset-0 z-[235] flex items-center justify-center bg-black/60 backdrop-blur-sm p-6">
          <div className="bg-white rounded-[28px] p-7 max-w-md w-full shadow-2xl border border-slate-100">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center shrink-0">
                <ImageExport className="text-slate-700" size={24} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-black text-slate-900">Name your PNG</h3>
                <p className="text-xs text-slate-600 mt-1">Rename it now, or skip and use the default.</p>
              </div>
              <button
                onClick={() => { setRenamePngModalOpen(false); pendingPngRef.current = null; }}
                className="p-2 rounded-xl hover:bg-slate-100"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>
            <div className="mt-4">
              <label className="text-[11px] font-black text-slate-700 uppercase">File name</label>
              <input
                value={renamePngValue}
                onChange={(e) => setRenamePngValue(e.target.value)}
                className="mt-2 w-full px-4 py-3 rounded-2xl border-2 border-slate-200 focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 font-bold"
                placeholder="Exported_PDF_PNG"
              />
              <div className="text-[11px] text-slate-500 mt-2">Tip: ".png" will be added if you forget it.</div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  const dataUrl = pendingPngRef.current;
                  if (!dataUrl) return;
                  const link = document.createElement('a');
                  link.download = 'Exported_PDF_PNG.png';
                  link.href = dataUrl;
                  link.click();
                  pendingPngRef.current = null;
                  setRenamePngModalOpen(false);
                }}
                className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-black text-xs hover:bg-slate-200"
              >
                Skip
              </button>
              <button
                onClick={() => {
                  const dataUrl = pendingPngRef.current;
                  if (!dataUrl) return;
                  const raw = (renamePngValue || 'Exported_PDF_PNG').trim();
                  if (!raw) return;
                  const safe = raw.toLowerCase().endsWith('.png') ? raw : `${raw}.png`;
                  const link = document.createElement('a');
                  link.download = safe;
                  link.href = dataUrl;
                  link.click();
                  pendingPngRef.current = null;
                  setRenamePngModalOpen(false);
                }}
                className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-black text-xs shadow-lg shadow-indigo-100 hover:bg-indigo-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}




      {/* MAIN PROPERTY SIDEBAR (Collapsible) */}
      <div className={`no-print bg-white border-r-2 border-slate-100 flex flex-col z-[105] shadow-inner overflow-hidden transition-all duration-300 ease-in-out ${isSidebarMinimized ? 'w-0 border-r-0 opacity-0' : 'w-[29rem] opacity-100'}`}>
        <header className="border-b-2 border-slate-50 relative flex flex-col transition-all duration-300 pb-4 px-4 pt-16">
          <button 
            onClick={() => setIsSidebarMinimized(true)} 
            className="absolute top-3 right-3 p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
            title="Minimize Sidebar"
          >
            <ChevronLeft size={18} />
          </button>

          <div className="pr-10">
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-indigo-500">LDD PDF</div>
            <h2 className="text-base font-black text-slate-900 leading-tight mt-1">Compact board test</h2>
            <p className="text-[10px] font-bold text-slate-400 mt-1 truncate" title={projectName}>{projectName}</p>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-1.5">
            {[
              { id: EditorTab.SOURCE, icon: Laptop, label: 'Source' },
              { id: EditorTab.ASSETS, icon: Layers, label: 'Layers' },
              { id: EditorTab.CONTENT, icon: Type, label: 'Content' },
              { id: EditorTab.PROMO, icon: Tag, label: 'Offer' },
              { id: EditorTab.SOCIALS, icon: Share2, label: 'Social' },
              { id: EditorTab.COLORS, icon: Palette, label: 'Colors' },
              { id: 'templates' as const, icon: Layout, label: 'Templates' },
              { id: EditorTab.PRESETS, icon: Save, label: 'Project' },
            ].map(item => (
              <button
                key={item.id}
                onClick={() => { setActiveTab(item.id); setIsSidebarMinimized(false); }}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 transition-all ${activeTab === item.id ? 'border-indigo-500 bg-indigo-50 text-indigo-600 shadow-md shadow-indigo-100' : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-indigo-200 hover:text-indigo-500'}`}
              >
                <item.icon size={15} className="shrink-0" />
                <span className="text-xs font-black uppercase tracking-wide leading-tight">{item.label}</span>
              </button>
            ))}
          </div>
        </header>

        <div className="flex-1 overflow-hidden px-3 pb-3">
          <div
            className="h-full overflow-y-auto rounded-[24px] border border-slate-200 bg-slate-50/70 p-2 custom-scrollbar"
          >
            {renderTabContent()}
          </div>
        </div>

        <div className="p-3 bg-slate-50 border-t-2 border-slate-100 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => handleExportPDF(true)} className="min-h-[60px] bg-white border-2 border-slate-200 text-slate-900 rounded-2xl font-black text-[11px] hover:bg-slate-50 transition-all flex flex-col items-center justify-center gap-1"><Eye size={15} /> Preview</button>
            <button
              onClick={() => handleExportPDF(false)}
              className="min-h-[60px] bg-indigo-600 text-white rounded-2xl font-black text-[11px] hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 flex flex-col items-center justify-center gap-1"
            >
              <Download size={15} /> Export
            </button>
          </div>
          <button
            onClick={() => setShowSettings(true)}
            className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 hover:text-indigo-600 hover:border-indigo-200 transition-all"
            title="Settings"
          >
            Settings
          </button>
        </div>
      </div>{/* END MAIN PROPERTY SIDEBAR */}



      <div className="fixed bottom-4 right-4 z-[170] no-print">
        <button
          onClick={() => setTipsOpen(v => !v)}
          className={`group flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/96 backdrop-blur-xl px-3 py-2.5 text-[10px] font-black uppercase tracking-[0.18em] shadow-[0_12px_28px_rgba(15,23,42,0.12)] transition-all hover:-translate-y-0.5 hover:border-indigo-200 hover:text-indigo-600 ${tipsOpen ? 'text-indigo-700 border-indigo-200 bg-white' : 'text-slate-600'}`}
          title={tipsOpen ? 'Hide Tips' : 'Show Tips'}
        >
          <span className={`flex h-7 w-7 items-center justify-center rounded-xl transition-all ${tipsOpen ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-500'}`}>
            <Info size={14} />
          </span>
          <span>Tips</span>
        </button>
      </div>

      {/* RE-OPEN SIDEBAR BUTTON (Visible when minimized) */}
      {isSidebarMinimized && (
        <button 
          onClick={() => setIsSidebarMinimized(false)}
          className="fixed left-4 top-4 p-3 bg-white border-2 border-slate-100 rounded-2xl text-slate-900 shadow-xl z-50 hover:text-indigo-600 hover:border-indigo-100 transition-all animate-in slide-in-from-left-4 duration-300"
          title="Show Sidebar"
        >
          <ChevronRight size={24} />
        </button>
      )}

      <div className="flex-1 flex flex-col min-w-0">
      <div
        ref={viewportRef}
        data-viewport="1"
        className={`flex-1 relative bg-white overflow-hidden pt-32 ${isPanning ? 'cursor-grabbing' : 'cursor-auto'}`}
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
        

        {/* removed gray/dashed editor backing per latest UI pass */}
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
            <DraggableBlock key={blockId} id={blockId} config={config} updateConfig={updateConfig} visible={blockId === 'socials' ? true : config.visibility[blockId]} onSnap={setSnapLines} onSelect={selectElement} selectedIds={selectedIds} onDoubleClick={() => setEditingId(blockId)} isSelected={selectedIds.includes(blockId)} isPrimary={selectedId === blockId} isEditing={editingId === blockId} onContextMenu={handleContextMenu} zoom={zoom}>
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
                  <div className="w-full h-full flex items-center justify-center gap-3 px-2">
                    {activeSocialLinks.length > 0 ? activeSocialLinks.map((social, idx) => {
                      const size = Math.max(18, Math.min(config.fonts.blocks.socials.size, Math.max(24, config.layout.blocks.socials.h - 10)));
                      return (
                        <div key={idx} className="relative group flex items-center justify-center opacity-95">
                          <div className="flex items-center justify-center rounded-xl" style={{ width: Math.max(34, size + 10), height: Math.max(34, size + 10) }}>
                            {social.customImg
                              ? <img src={social.customImg} style={{ width: size, height: size }} className="object-contain" />
                              : social.asset
                              ? <img src={social.asset} alt={social.label} style={{ width: social.id === 'threads' ? Math.round(size * 0.88) : size, height: social.id === 'threads' ? Math.round(size * 0.88) : size }} className="object-contain" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                              : <Globe size={size} />
                            }
                          </div>
                        </div>
                      );
                    }) : <span className="text-[0.8em] italic opacity-50 w-full text-center">Social Links (Add in Sidebar)</span>}
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
              className="rounded-3xl overflow-hidden"
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
              className="w-full h-full rounded-[40px] p-6 flex flex-col items-center justify-center gap-1 overflow-hidden text-center border-4 border-white/20"
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
              ) : l.type === 'button' ? (
                <div className="w-full h-full rounded-3xl flex items-center justify-center shadow-xl overflow-hidden relative" style={{ backgroundColor: l.bgColor || config.colors.button }}>
                  <span
                    style={{
                      position: 'absolute', left: '50%', top: '50%',
                      transform: 'translate(-50%,-50%)',
                      display: 'inline-block',
                      whiteSpace: 'nowrap',
                      padding: '0 18px',
                      maxWidth: '92%',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      fontFamily: l.fontFamily || config.fonts.global,
                      fontSize: `${l.fontSize || 18}px`,
                      fontWeight: l.bold ? 'bold' : '800',
                      color: l.color || config.colors.buttonText,
                      textAlign: 'center',
                    }}
                    contentEditable={editingId === l.id}
                    suppressContentEditableWarning={true}
                    onBlur={(e) => { updateConfig('layout.extraLayers', config.layout.extraLayers.map(x => x.id === l.id ? { ...x, label: (e.target as HTMLElement).innerText } : x)); setEditingId(null); }}
                  >
                    {l.label || 'Download Now'}
                  </span>
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
      </div>{/* end viewportRef */}

        {/* ── FOOTER BAR — lives outside canvas, never overlaps it ── */}
        <div className="no-print shrink-0 border-t border-slate-200 bg-slate-100/70 py-3 px-4">
          {/* Canvas tips mini card */}
          <div className="fixed right-4 top-4 z-[165] hidden xl:block pointer-events-none">
            <div className="rounded-2xl border border-slate-200 bg-white/95 backdrop-blur-xl px-3 py-2 shadow-[0_12px_28px_rgba(15,23,42,0.10)]">
              <div className="flex flex-wrap items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-wide">
                <span className="flex items-center gap-1"><MousePointer size={11} className="text-indigo-400" /> Select</span>
                <span className="text-slate-300">•</span>
                <span className="flex items-center gap-1"><Move size={11} className="text-indigo-400" /> Move</span>
                <span className="text-slate-300">•</span>
                <span className="flex items-center gap-1"><ZoomIn size={11} className="text-indigo-400" /> Zoom</span>
                <span className="text-slate-300">•</span>
                <span className="flex items-center gap-1"><Hand size={11} className="text-indigo-400" /> Pan</span>
              </div>
            </div>
          </div>
          {/* Toolbar mode settings popup */}
          {showToolbarSettings && (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-xl p-3 flex items-center gap-1 animate-in slide-in-from-bottom-2 duration-200">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest pr-2">Formatting Bar</span>
              {([['auto', 'Auto-hide'], ['show', 'Always show'], ['hide', 'Always hide']] as const).map(([mode, label]) => (
                <button
                  key={mode}
                  onClick={() => { setToolbarMode(mode); localStorage.setItem('ldd_toolbar_mode', mode); setShowToolbarSettings(false); }}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-black transition-all ${toolbarMode === mode ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
          {/* Bottom action toolbar */}
          <div className="bg-white border-2 border-slate-200 rounded-[30px] shadow-lg p-1.5 flex items-center gap-1">
            <button onClick={undo} title="Undo (Ctrl+Z)" className="p-2.5 hover:bg-slate-100 rounded-2xl text-slate-900 transition-all active:scale-90"><Undo2 size={18}/></button>
            <button onClick={redo} title="Redo (Ctrl+Y)" className="p-2.5 hover:bg-slate-100 rounded-2xl text-slate-900 transition-all active:scale-90"><Redo2 size={18}/></button>
            <div className="w-px h-6 bg-slate-200 mx-1"></div>
            <button onClick={() => handleAction('copy')} title="Copy (Ctrl+C)" className="p-2.5 hover:bg-slate-100 rounded-2xl text-slate-900 transition-all active:scale-90"><Copy size={18}/></button>
            <button onClick={() => handleAction('paste')} title="Paste (Ctrl+V)" className={`p-2.5 rounded-2xl transition-all active:scale-90 ${clipboard ? 'text-slate-900 hover:bg-slate-100' : 'text-slate-200 cursor-not-allowed'}`} disabled={!clipboard}><Clipboard size={18}/></button>
            <div className="w-px h-6 bg-slate-200 mx-1"></div>
            <div className="px-3 font-black text-slate-900 text-xs min-w-[52px] text-center">{Math.round(zoom * 100)}%</div>
            <button onClick={() => { setZoom(0.65); setOffset({ x: 0, y: 0 }); setTimeout(() => { const el = document.querySelector('[data-viewport]'); if (el) { const vw = el.clientWidth; const vh = el.clientHeight; setOffset({ x: (vw - CANVAS_WIDTH * 0.65) / 2, y: (vh - 64 - CANVAS_HEIGHT * 0.65) / 2 }); } }, 50); }} className="p-2.5 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 active:scale-90 transition-all"><Maximize size={18} /></button>
            <div className="w-px h-6 bg-slate-200 mx-1"></div>
            <button
              onClick={() => setShowToolbarSettings(v => !v)}
              title="Formatting toolbar settings"
              className={`p-2.5 rounded-2xl transition-all active:scale-90 ${showToolbarSettings ? 'bg-indigo-100 text-indigo-600' : 'hover:bg-slate-100 text-slate-400'}`}
            >
              <Settings size={16}/>
            </button>
          </div>
        </div>
      </div>{/* end flex-col wrapper */}

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
                <button
                  onClick={() => handleAction('upload-font')}
                  className="w-full px-6 py-3 flex items-center gap-4 text-xs font-black text-left text-slate-900 hover:bg-slate-50"
                >
                  <Upload size={16} /> Upload Custom Font
                </button>

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
    onClick={() => fontUploadRef.current?.click()}
    className="px-4 py-2 rounded-xl font-black text-xs bg-emerald-600 text-white hover:bg-emerald-700 transition-all inline-flex items-center gap-2"
  >
    <Upload size={16} />
    Install Font
  </button>
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



            {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-[230] flex items-center justify-center bg-black/60 backdrop-blur-sm p-6">
          <div className="bg-white rounded-[30px] p-8 max-w-lg w-full shadow-2xl border border-slate-100 relative">
            <button onClick={() => setShowSettings(false)} className="absolute top-4 right-4 p-2 rounded-xl hover:bg-slate-100 text-slate-500" title="Close"><X size={18} /></button>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center"><Settings className="text-indigo-600" size={24} /></div>
              <div>
                <h3 className="text-xl font-black text-slate-900">Settings</h3>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Privacy · Liability · Support</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-white border-2 border-slate-100">
                <h4 className="text-sm font-black text-slate-900 uppercase mb-2">Privacy Policy</h4>
                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                  All PDF generation happens locally in your browser. No data is sent to any server.
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-white border-2 border-slate-100">
                <h4 className="text-sm font-black text-slate-900 uppercase mb-2">Liability Notice</h4>
                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                  LavenderDragonDesign is not liable for any issues arising from use of this tool. You are responsible for the content you generate.
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-white border-2 border-slate-100">
                <h4 className="text-sm font-black text-slate-900 uppercase mb-2">Support</h4>
                <a href={LDD_BMAC_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-white border-2 border-slate-200 text-slate-900 hover:bg-slate-50 transition-all text-[10px] font-black uppercase tracking-widest">
                  <Coffee size={16} /> Buy Me a Coffee
                </a>
              </div>
            </div>
            <div className="mt-6 flex flex-col gap-3">
              <div className="text-center text-[10px] font-bold text-slate-400">
                <a target="_blank" rel="noreferrer" href="https://icons8.com/icon/ClbD5JTFM7FA/x" className="hover:text-indigo-600 transition-colors">All</a> icons by <a target="_blank" rel="noreferrer" href="https://icons8.com" className="hover:text-indigo-600 transition-colors">Icons8</a>
              </div>
              <div className="flex justify-end">
                <button onClick={() => setShowSettings(false)} className="px-5 py-3 bg-slate-100 text-slate-700 rounded-xl font-black text-xs hover:bg-slate-200">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Social Link Editor Modal ── */}
      {selectedSocialEditor && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          style={{ backgroundColor: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(4px)' }}
          onClick={() => setSelectedSocialEditor(null)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl w-full max-w-sm mx-4 p-6 space-y-5"
            style={{ boxShadow: '0 32px 80px rgba(0,0,0,0.18)' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                  {selectedSocialEditor === 'custom'
                    ? ((config.socials as any).customIcon
                        ? <img src={(config.socials as any).customIcon} className="w-8 h-8 object-contain" />
                        : <Share2 size={22} className="text-slate-400" />)
                    : (SOCIAL_ICON_ASSETS[selectedSocialEditor]
                      ? <img src={SOCIAL_ICON_ASSETS[selectedSocialEditor]} alt={selectedSocialEditor} className="w-8 h-8 object-contain" />
                      : <MessageSquarePlus size={22} className="text-slate-500" />)
                  }
                </div>
                <div>
                  <div className="text-sm font-black uppercase tracking-wide text-slate-900">
                    {selectedSocialEditor === 'tiktok' ? 'TikTok'
                      : selectedSocialEditor === 'pinterest' ? 'Pinterest'
                      : selectedSocialEditor === 'twitter' ? 'X'
                      : selectedSocialEditor === 'threads' ? 'Threads'
                      : selectedSocialEditor === 'woo' ? 'WooCommerce'
                      : selectedSocialEditor === 'custom' ? 'Custom Platform'
                      : selectedSocialEditor.charAt(0).toUpperCase() + selectedSocialEditor.slice(1)}
                  </div>
                  <div className="text-[10px] font-bold text-slate-400 mt-0.5">
                    {selectedSocialEditor === 'custom' ? 'Upload an icon and paste your URL' : 'Paste your full profile URL'}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedSocialEditor(null)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-all shrink-0"
              >
                <X size={15} />
              </button>
            </div>

            {/* URL input */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                {selectedSocialEditor === 'custom' ? 'Link URL' : 'Profile URL'}
              </label>
              <input
                autoFocus
                className="w-full px-4 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold outline-none focus:border-indigo-400 focus:bg-white transition-all placeholder:text-slate-300"
                value={selectedSocialEditor === 'custom'
                  ? ((config.socials as any).customLink || '')
                  : ((config.socials as any)[selectedSocialEditor] || '')}
                onChange={e => {
                  if (selectedSocialEditor === 'custom') {
                    updateConfig('socials.customLink', e.target.value);
                  } else {
                    updateConfig(`socials.${selectedSocialEditor}`, e.target.value);
                  }
                }}
                onBlur={e => {
                  const v = e.target.value.trim();
                  if (v && !/^https?:\/\//i.test(v) && !/^mailto:/i.test(v)) {
                    const field = selectedSocialEditor === 'custom' ? 'socials.customLink' : `socials.${selectedSocialEditor}`;
                    updateConfig(field, 'https://' + v);
                  }
                }}
                placeholder="https://..."
              />
            </div>

            {/* Custom icon upload */}
            {selectedSocialEditor === 'custom' && (
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Platform Icon</label>
                <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 rounded-xl font-black text-[11px] transition-all">
                  <Upload size={13} />
                  {(config.socials as any).customIcon ? 'Change Icon' : 'Upload Icon'}
                  <input
                    type="file"
                    hidden
                    accept="image/*"
                    onChange={e => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      const r = new FileReader();
                      r.onload = ev => updateConfig('socials.customIcon', ev.target?.result as string);
                      r.readAsDataURL(f);
                    }}
                  />
                </label>
              </div>
            )}

            {/* Clear + Done */}
            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={() => {
                  if (selectedSocialEditor === 'custom') {
                    updateConfig('socials.customLink', '');
                  } else {
                    updateConfig(`socials.${selectedSocialEditor}`, '');
                  }
                }}
                className="flex-1 py-3 rounded-2xl border-2 border-slate-100 text-slate-500 font-black text-xs uppercase tracking-wide hover:border-red-200 hover:text-red-500 hover:bg-red-50 transition-all"
              >
                Clear
              </button>
              <button
                onClick={() => setSelectedSocialEditor(null)}
                className="flex-1 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wide transition-all shadow-md shadow-indigo-200"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
  </div>
  );
};

export default App;