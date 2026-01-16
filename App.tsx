
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
  Layout, Minimize2, ChevronRight, ChevronDown, EyeOff, Search, QrCode, Heart, FolderOpen,
  Waves, MousePointer, FileJson, Bold, Italic, Underline, ChevronLeft
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@4.10.38/build/pdf.worker.mjs`;

const CANVAS_WIDTH = 816; 
const CANVAS_HEIGHT = 1056; 

const INITIAL_CONFIG: PDFConfig = {
  source: { mode: 'upload', link: '', fileName: null },
  assets: { logo: null, watermark: null, watermarkOpacity: 0.1 },
  content: {
    title: 'Your Digital Download',
    shortDesc: 'Thank you for your purchase!',
    mainDesc: 'Click the download button below to access your files. Save this page for future reference.',
    footer: '© 2025 Your Store Name. All rights reserved.',
    twoColumns: false,
  },
  fonts: {
    global: 'Inter',
    blocks: {
      title: { family: 'Inter', size: 36, align: 'center', color: '#0f172a', bold: true },
      shortDesc: { family: 'Inter', size: 18, align: 'center', color: '#334155' },
      mainDesc: { family: 'Inter', size: 14, align: 'center', color: '#475569' },
      footer: { family: 'Inter', size: 10, align: 'center', color: '#94a3b8' },
      promo: { family: 'Inter', size: 18, align: 'center', color: '#ffffff', bold: true },
      socials: { family: 'Inter', size: 12, align: 'center', color: '#475569' },
    }
  },
  colors: {
    background: '#ffffff',
    accent: '#f97316',
    button: '#3b82f6',
    buttonText: '#ffffff',
    syncAccent: true,
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
    socials: true, footer: true, shortDesc: true, mainDesc: true, watermark: false
  },
  layout: {
    btnWidth: 60, btnHeight: 40, freeform: true, snap: true, guides: false, qr: true,
    blocks: {
      title: { x: 208, y: 80, w: 400, h: 60 },
      shortDesc: { x: 208, y: 160, w: 400, h: 40 },
      mainDesc: { x: 158, y: 220, w: 500, h: 120 },
      button: { x: 283, y: 380, w: 250, h: 60 },
      qr: { x: 448, y: 460, w: 120, h: 120 },
      promo: { x: 143, y: 620, w: 530, h: 150 },
      footer: { x: 208, y: 920, w: 400, h: 40 },
      logo: { x: 378, y: 20, w: 60, h: 60 },
      socials: { x: 158, y: 960, w: 500, h: 40 }
    },
    extraLayers: []
  }
};

const FONT_FAMILIES = ['Inter', 'Arial', 'Verdana', 'Georgia', 'Times New Roman', 'Courier New'];

const DraggableBlock: React.FC<{
  id: string;
  config: PDFConfig;
  updateConfig: (path: string, value: any, record?: boolean) => void;
  children: React.ReactNode;
  visible: boolean;
  onSnap?: (lines: { h: number[], v: number[] }) => void;
  onContextMenu: (e: React.MouseEvent, id: string, isExtra: boolean) => void;
  onSelect: (id: string) => void;
  onDoubleClick?: () => void;
  isExtra?: boolean;
  zoom: number;
  isSelected?: boolean;
  isEditing?: boolean;
}> = ({ id, config, updateConfig, children, visible, onSnap, onContextMenu, onSelect, onDoubleClick, isExtra = false, zoom, isSelected, isEditing }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [startPos, setStartPos] = useState({ x: 0, y: 0, blockX: 0, blockY: 0, blockW: 0, blockH: 0 });
  
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

      if (isExtra) {
        const newLayers = config.layout.extraLayers.map(l => l.id === id ? { ...l, x: newX, y: newY, w: newW, h: newH } : l);
        updateConfig('layout.extraLayers', newLayers, false);
      } else {
        updateConfig(`layout.blocks.${id}`, { x: newX, y: newY, w: newW, h: newH }, false);
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
      className={`absolute group select-none flex items-center justify-center ${config.layout.freeform ? 'cursor-move' : ''} ${isSelected ? 'ring-2 ring-indigo-600 ring-offset-2 shadow-2xl z-50' : ''}`}
      onMouseDown={(e) => {
        if (e.button !== 0 || isEditing) return;
        e.stopPropagation();
        onSelect(id);
        const target = e.target as HTMLElement;
        if (target.closest('.close-button') || target.closest('.resize-handle') || target.closest('.clickable-part')) return;
        setIsDragging(true);
        setStartPos({ x: e.clientX, y: e.clientY, blockX: block.x, blockY: block.y, blockW: block.w, blockH: block.h });
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onDoubleClick?.();
      }}
      onContextMenu={(e) => onContextMenu(e, id, isExtra)}
      style={{ left: block.x, top: block.y, width: block.w, height: block.h, zIndex: isDragging || resizeHandle ? 60 : 10 }}
    >
      <div className={`relative w-full h-full flex items-center justify-center ${config.layout.freeform ? 'group-hover:ring-2 group-hover:ring-blue-500 group-hover:ring-offset-1' : ''}`}>
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
  const [config, setConfig] = useState<PDFConfig>(INITIAL_CONFIG);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [snapLines, setSnapLines] = useState<{h: number[], v: number[]}>({ h: [], v: [] });
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [restoreModal, setRestoreModal] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [isTipsMinimized, setIsTipsMinimized] = useState(true);
  const [isSidebarMinimized, setIsSidebarMinimized] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, id: string, isExtra: boolean } | null>(null);
  const [clipboard, setClipboard] = useState<any>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [savedPresets, setSavedPresets] = useState<{name: string, config: PDFConfig}[]>(() => {
    return JSON.parse(localStorage.getItem('lavender_presets') || '[]');
  });

  const [zoom, setZoom] = useState(0.65);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [isSpaceDown, setIsSpaceDown] = useState(false);
  const lastMousePos = useRef({ x: 0, y: 0 });

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

    const savedWork = localStorage.getItem('lavender_autosave');
    if (savedWork) setRestoreModal(true);
  }, []);

  // Auto-save logic
  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem('lavender_autosave', JSON.stringify(config));
    }, 2000);
    return () => clearTimeout(timer);
  }, [config]);

  const updateConfig = (path: string, value: any, record = true) => {
    setConfig(prev => {
      const newConfig = JSON.parse(JSON.stringify(prev));
      let current: any = newConfig;
      const keys = path.split('.');
      for (let i = 0; i < keys.length - 1; i++) { if (!current[keys[i]]) current[keys[i]] = {}; current = current[keys[i]]; }
      current[keys[keys.length - 1]] = value;
      if (path === 'colors.accent' && newConfig.colors.syncAccent) newConfig.colors.button = value;
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
          setConfig(loadedConfig);
          setHistory([loadedConfig]);
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

  const handleAction = useCallback((action: string) => {
    const id = contextMenu?.id || selectedId;
    if ((action === 'duplicate' || action === 'copy') && (id === 'button' || id === 'qr' || id === 'promo')) return;

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
        if (id) {
          if (isExtra) updateConfig('layout.extraLayers', config.layout.extraLayers.map(l => l.id === id ? { ...l, x: 0 } : l));
          else updateConfig(`layout.blocks.${id}.x`, 0);
        }
        break;
      case 'align-center':
        if (id) {
          const b = isExtra ? config.layout.extraLayers.find(l => l.id === id) : config.layout.blocks[id];
          if (b) {
             const newX = (CANVAS_WIDTH - b.w) / 2;
             if (isExtra) updateConfig('layout.extraLayers', config.layout.extraLayers.map(l => l.id === id ? { ...l, x: newX } : l));
             else updateConfig(`layout.blocks.${id}.x`, newX);
          }
        }
        break;
      case 'align-right':
        if (id) {
          const b = isExtra ? config.layout.extraLayers.find(l => l.id === id) : config.layout.blocks[id];
          if (b) {
             const newX = CANVAS_WIDTH - b.w;
             if (isExtra) updateConfig('layout.extraLayers', config.layout.extraLayers.map(l => l.id === id ? { ...l, x: newX } : l));
             else updateConfig(`layout.blocks.${id}.x`, newX);
          }
        }
        break;
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
      case 'delete':
        if (id && !editingId) {
          if (isExtra) updateConfig('layout.extraLayers', config.layout.extraLayers.filter(l => l.id !== id));
          else updateConfig(`visibility.${id}`, false);
          setSelectedId(null);
        }
        break;
    }
    setContextMenu(null);
  }, [config, contextMenu, selectedId, clipboard, editingId, isExtraLayer]);

  useEffect(() => { 
    const handleKeyDown = (e: KeyboardEvent) => {
      if (editingId) return;
      if (e.code === 'Space') { if ((e.target as HTMLElement).tagName !== 'INPUT' && (e.target as HTMLElement).tagName !== 'TEXTAREA') { e.preventDefault(); setIsSpaceDown(true); } }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA' && !target.isContentEditable && !contextMenu) handleAction('delete');
      }
      if (e.ctrlKey || e.metaKey) {
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
  const handleCanvasMouseDown = (e: React.MouseEvent) => { if (isSpaceDown || e.button === 1) { setIsPanning(true); lastMousePos.current = { x: e.clientX, y: e.clientY }; } };
  const handleCanvasMouseMove = (e: React.MouseEvent) => { if (isPanning) { const dx = e.clientX - lastMousePos.current.x; const dy = e.clientY - lastMousePos.current.y; setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy })); lastMousePos.current = { x: e.clientX, y: e.clientY }; } };
  const handleCanvasMouseUp = () => setIsPanning(false);
  const handleContextMenu = useCallback((e: React.MouseEvent, id: string, isExtra: boolean) => { e.preventDefault(); e.stopPropagation(); setContextMenu({ x: e.clientX, y: e.clientY, id, isExtra }); }, []);

  const activeSocialLinks = useMemo(() => {
    return [
      { id: 'facebook', icon: Facebook, link: config.socials.facebook },
      { id: 'instagram', icon: Instagram, link: config.socials.instagram },
      { id: 'etsy', icon: ShoppingBag, link: config.socials.etsy },
      { id: 'website', icon: Globe, link: config.socials.website },
      { id: 'shopify', icon: Store, link: config.socials.shopify }
    ].filter(s => !!s.link);
  }, [config.socials]);

  const handleExportPDF = async (preview: boolean) => {
    const canvas = document.getElementById('pdf-canvas');
    if (!canvas) return;
    const originalTransform = canvas.style.transform;
    canvas.style.transform = 'scale(1)';
    try {
      const capture = await html2canvas(canvas, { useCORS: true, scale: 2, backgroundColor: config.colors.background });
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

      if (preview) window.open(pdf.output('bloburl'), '_blank');
      else pdf.save(`${(config.content.title || 'export').replace(/\s+/g, '_')}.pdf`);
    } catch (err) { console.error('Export failed:', err); } finally { canvas.style.transform = originalTransform; }
  };

  const getQRUrl = () => {
     const data = config.source.link || 'https://lavenderdragondesign.app';
     return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(data)}&color=${config.colors.qrColor.replace('#', '')}&bgcolor=${config.colors.qrBgColor.replace('#', '')}`;
  };

  const activeElementProps = selectedId ? (() => {
    const isExtra = isExtraLayer(selectedId);
    const target = isExtra ? config.layout.extraLayers.find(l => l.id === selectedId) : null;
    const isText = isExtra ? (target?.type === 'text') : (['title', 'shortDesc', 'mainDesc', 'footer', 'promo', 'socials'].includes(selectedId));
    return { isExtra, target, isText };
  })() : null;

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
                 <div onClick={() => sourceInputRef.current?.click()} className="border-4 border-dashed border-slate-200 p-10 rounded-3xl flex flex-col items-center gap-3 cursor-pointer hover:border-indigo-400 transition-all bg-white hover:bg-indigo-50/20 group relative">
                   {isExtracting ? <Loader2 size={40} className="text-indigo-600 animate-spin" /> : <Upload size={40} className="text-slate-400 group-hover:text-indigo-600 transition-colors" />}
                   <p className="text-[10px] font-black text-slate-900 text-center group-hover:text-indigo-600 transition-colors">{config.source.fileName || 'Click here to upload MD download.pdf'}</p>
                   <input type="file" ref={sourceInputRef} hidden accept=".pdf" onChange={e => handleFileUpload(e, 'source')} />
                 </div>
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
              { id: 'accent', label: 'Promo Background' },
              { id: 'button', label: 'Button Background' },
              { id: 'buttonText', label: 'Button Text Color' }
            ].map(c => (
              <div key={c.id} className="flex items-center justify-between p-4 bg-white border-2 border-slate-100 rounded-2xl">
                <label className="text-[10px] font-black text-slate-900 uppercase">{c.label}</label>
                <input type="color" value={(config.colors as any)[c.id]} onChange={e => updateConfig(`colors.${c.id}`, e.target.value)} className="w-10 h-10 rounded-xl border-2 border-slate-100 cursor-pointer" />
              </div>
            ))}
          </div>
        );
      case EditorTab.CONTENT:
        return (
          <div className="space-y-4">
            <h3 className="text-sm font-black text-slate-900 uppercase">Text Content</h3>
            {['title', 'shortDesc', 'footer'].map(f => (
              <div key={f}>
                <label className="text-[10px] font-black text-slate-900 uppercase">{f}</label>
                <input className="w-full mt-1 p-3 bg-white border-2 border-slate-100 rounded-2xl text-xs font-black" value={(config.content as any)[f]} onChange={e => updateConfig(`content.${f}`, e.target.value)} />
              </div>
            ))}
            <div>
              <label className="text-[10px] font-black text-slate-900 uppercase">Main Description</label>
              <textarea className="w-full mt-1 p-3 bg-white border-2 border-slate-100 rounded-2xl text-xs font-black h-32" value={config.content.mainDesc} onChange={e => updateConfig('content.mainDesc', e.target.value)} />
            </div>
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

  return (
    <div className="h-screen w-screen flex bg-slate-100 font-sans transition-colors overflow-hidden">
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
                    {FONT_FAMILIES.map(ff => <option key={ff} value={ff}>{ff}</option>)}
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
            
            <div className="flex-1 flex justify-end gap-2">
              <button onClick={() => handleAction('align-center')} className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-black uppercase hover:bg-indigo-50 hover:text-indigo-600 transition-all">Snap Center X</button>
              <button onClick={() => handleAction('duplicate')} className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-black uppercase hover:bg-indigo-50 hover:text-indigo-600 transition-all">Duplicate</button>
            </div>
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
             <div className="flex gap-3 mt-6">
               <button onClick={() => { localStorage.removeItem('lavender_autosave'); setRestoreModal(false); }} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-black text-xs hover:bg-slate-200">New Project</button>
               <button onClick={() => { const data = localStorage.getItem('lavender_autosave'); if (data) setConfig(JSON.parse(data)); setRestoreModal(false); }} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-black text-xs shadow-lg shadow-indigo-100">Resume</button>
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
          <h2 className="text-xl font-black text-slate-900 leading-tight">LavenderDragonDesign's PDF Generator</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 text-center">Branded Download Pages</p>
        </header>
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">{renderTabContent()}</div>
        <div className="p-6 bg-slate-50 border-t-2 border-slate-100">
          <div className="flex gap-3 mb-4">
            <button onClick={() => handleExportPDF(true)} className="flex-1 py-4 bg-white border-2 border-slate-200 text-slate-900 rounded-2xl font-black text-xs hover:bg-slate-50 transition-all flex items-center justify-center gap-2"><Eye size={16} /> Preview</button>
            <button onClick={() => handleExportPDF(false)} className="flex-[1.5] py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 flex items-center justify-center gap-2"><Download size={16} /> Export PDF</button>
          </div>
          <p className="text-center text-[10px] font-black text-slate-400 uppercase flex items-center justify-center gap-1">Made with <Heart size={10} className="text-red-500 fill-red-500 animate-pulse" /> by Andrea</p>
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

      <div className={`flex-1 relative bg-slate-100 overflow-hidden flex items-center justify-center pt-16 ${isPanning ? 'cursor-grabbing' : 'cursor-auto'}`} onWheel={handleScroll} onMouseDown={handleCanvasMouseDown} onMouseMove={handleCanvasMouseMove} onMouseUp={handleCanvasMouseUp} onContextMenu={(e) => handleContextMenu(e, 'canvas', false)} onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }} onDrop={(e) => { e.preventDefault(); e.stopPropagation(); handleFileUpload(e as any, 'source'); }}>
        <div className="absolute inset-0 dashed-grid pointer-events-none opacity-50" />
        <div id="pdf-canvas" className="relative bg-white shadow-2xl shrink-0 border-2 border-slate-200 transition-all duration-300" style={{ width: `${CANVAS_WIDTH}px`, height: `${CANVAS_HEIGHT}px`, backgroundColor: config.colors.background, transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`, transformOrigin: 'center' }} onClick={(e) => { if (e.target === e.currentTarget) setSelectedId(null); }}>
          {config.assets.watermark && config.visibility.watermark && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden"><img src={config.assets.watermark} style={{ opacity: config.assets.watermarkOpacity, transform: 'rotate(-45deg) scale(2)' }} className="w-1/2 object-contain" /></div>
          )}
          <DraggableBlock id="logo" config={config} updateConfig={updateConfig} visible={!!config.assets.logo && config.visibility.logo} onSelect={setSelectedId} isSelected={selectedId === 'logo'} onContextMenu={handleContextMenu} zoom={zoom}><img src={config.assets.logo!} className="w-full h-full object-contain pointer-events-none" /></DraggableBlock>
          
          {/* STANDARD TEXT BLOCKS */}
          {['title', 'shortDesc', 'mainDesc', 'footer', 'socials'].map(blockId => (
            <DraggableBlock key={blockId} id={blockId} config={config} updateConfig={updateConfig} visible={config.visibility[blockId]} onSnap={setSnapLines} onSelect={setSelectedId} onDoubleClick={() => setEditingId(blockId)} isSelected={selectedId === blockId} isEditing={editingId === blockId} onContextMenu={handleContextMenu} zoom={zoom}>
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
                  <div className="flex gap-4 items-center">
                    {activeSocialLinks.length > 0 ? activeSocialLinks.map((social, idx) => (
                      <div key={idx} className="flex items-center gap-1 opacity-80 hover:opacity-100 transition-opacity">
                        <social.icon size={Math.max(14, config.fonts.blocks.socials.size * 1.2)} />
                        {activeSocialLinks.length < 3 && <span className="text-[0.8em] font-bold">{social.id}</span>}
                      </div>
                    )) : <span className="text-[0.8em] italic opacity-50">Social Links (Add in Sidebar)</span>}
                  </div>
                ) : (
                  (config.content as any)[blockId]
                )}
              </div>
            </DraggableBlock>
          ))}
          
          <DraggableBlock id="button" config={config} updateConfig={updateConfig} visible={config.visibility.button} onSnap={setSnapLines} onSelect={setSelectedId} isSelected={selectedId === 'button'} onContextMenu={handleContextMenu} zoom={zoom}><div style={{ backgroundColor: config.colors.button, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }} className="rounded-3xl shadow-xl overflow-hidden text-center font-black"><span style={{ fontSize: `${Math.min(config.layout.blocks.button.h * 0.4, 30)}px`, color: config.colors.buttonText }} className="px-4">Download Now</span></div></DraggableBlock>
          <DraggableBlock id="qr" config={config} updateConfig={updateConfig} visible={config.visibility.qr && !!config.source.link} onSnap={setSnapLines} onSelect={setSelectedId} isSelected={selectedId === 'qr'} onContextMenu={handleContextMenu} zoom={zoom}><img src={getQRUrl()} className="w-full h-full object-contain pointer-events-none" /></DraggableBlock>
          
          <DraggableBlock id="promo" config={config} updateConfig={updateConfig} visible={config.visibility.promo && config.promo.enabled} onSnap={setSnapLines} onSelect={setSelectedId} isSelected={selectedId === 'promo'} onContextMenu={handleContextMenu} zoom={zoom}>
            <div 
              style={{ 
                backgroundColor: config.colors.accent, 
                color: config.fonts.blocks.promo.color,
                fontWeight: config.fonts.blocks.promo.bold ? 'bold' : 'normal',
                fontStyle: config.fonts.blocks.promo.italic ? 'italic' : 'normal',
                textDecoration: config.fonts.blocks.promo.underline ? 'underline' : 'none',
                textAlign: config.fonts.blocks.promo.align
              }} 
              className="w-full h-full rounded-[40px] p-6 flex flex-col items-center justify-center gap-1 shadow-2xl overflow-hidden text-center border-4 border-white/20"
            >
              <span className="uppercase opacity-70 block" style={{ fontSize: `${config.layout.blocks.promo.h * 0.08}px` }}>{config.promo.title}</span>
              <span className="tracking-tighter leading-none block font-black" style={{ fontSize: `${config.layout.blocks.promo.h * 0.25}px` }}>{config.promo.code}</span>
              <span className="opacity-90 block" style={{ fontSize: `${config.layout.blocks.promo.h * 0.08}px` }}>{config.promo.description}</span>
            </div>
          </DraggableBlock>

          {config.layout.extraLayers.map(l => (
            <DraggableBlock key={l.id} id={l.id} config={config} updateConfig={updateConfig} visible={l.visible} isExtra onSnap={setSnapLines} onSelect={setSelectedId} onDoubleClick={() => setEditingId(l.id)} isSelected={selectedId === l.id} isEditing={editingId === l.id} onContextMenu={handleContextMenu} zoom={zoom}>
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
        <div className={`fixed bottom-10 right-10 bg-white border-2 border-slate-200 p-6 rounded-[30px] shadow-2xl z-[60] transition-all duration-300 ${isTipsMinimized ? 'w-16 h-16 p-0 overflow-hidden flex items-center justify-center cursor-pointer' : 'w-72 h-auto'}`} onClick={() => isTipsMinimized && setIsTipsMinimized(false)}>
           {!isTipsMinimized ? (<><div className="flex items-center justify-between mb-3"><div className="flex items-center gap-3"><Info className="text-indigo-600" size={20} /><span className="text-xs font-black uppercase text-slate-900 tracking-widest">Editor Tips</span></div><button onClick={(e) => { e.stopPropagation(); setIsTipsMinimized(true); }} className="p-1 hover:bg-slate-100 rounded-lg"><Minimize2 size={16}/></button></div><ul className="text-[10px] font-black text-slate-500 space-y-3"><li className="flex items-center gap-2"><MousePointer2 size={12}/> Scroll to Zoom</li><li className="flex items-center gap-2"><Move size={12}/> Space + Drag to Pan</li><li className="flex items-center gap-2"><Layout size={12}/> Click sidebar to start</li></ul></>) : (<Info className="text-indigo-600" size={24} />)}
        </div>
      </div>

      {contextMenu && (
        <div className="fixed z-[200] bg-white border-2 border-slate-200 shadow-2xl rounded-2xl py-2 w-64 overflow-hidden animate-in zoom-in-95 duration-100" style={{ left: contextMenu.x, top: contextMenu.y }} onClick={e => e.stopPropagation()}>
          {contextMenu.id !== 'canvas' ? (
            <><button onClick={() => handleAction('copy')} className="w-full px-6 py-3 hover:bg-slate-50 flex items-center gap-4 text-xs font-black text-slate-900 text-left"><Copy size={16}/> Copy</button><button onClick={() => handleAction('duplicate')} className="w-full px-6 py-3 hover:bg-slate-50 flex items-center gap-4 text-xs font-black text-slate-900 text-left"><Plus size={16}/> Duplicate</button><div className="h-px bg-slate-100 my-1" /><button onClick={() => handleAction('align-center')} className="w-full px-6 py-3 hover:bg-slate-50 flex items-center gap-4 text-xs font-black text-slate-900 text-left"><AlignCenter size={16}/> Center X</button><div className="h-px bg-slate-100 my-1" /><button onClick={() => handleAction('delete')} className="w-full px-6 py-3 hover:bg-slate-50 flex items-center gap-4 text-xs font-black text-red-600 text-left"><Trash2 size={16}/> Remove</button></>
          ) : (
            <><button onClick={() => handleAction('paste')} disabled={!clipboard} className={`w-full px-6 py-3 hover:bg-slate-50 flex items-center gap-4 text-xs font-black text-left ${clipboard ? 'text-slate-900' : 'text-slate-300'}`}><Clipboard size={16}/> Paste</button><div className="h-px bg-slate-100 my-1" /><button onClick={() => { setActiveTab(EditorTab.ASSETS); setContextMenu(null); }} className="w-full px-6 py-3 hover:bg-slate-50 flex items-center gap-4 text-xs font-black text-slate-900 text-left"><Layers size={16}/> Layers Library</button></>
          )}
        </div>
      )}
    </div>
  );
};

export default App;
