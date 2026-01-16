import { PresetData } from '../types';
import { DEFAULT_POSITIONS, DEFAULT_FONTS } from './constants';

const STORAGE_KEY = 'bpfg.presets.v4';

export function getDefaultPreset(): PresetData {
  return {
    inputMode: 'upload',
    primaryLink: '',
    backgroundColor: '#ffffff',
    accentColor: '#f97316',
    buttonColor: '#3b82f6',
    logoUrl: '',
    watermarkUrl: '',
    watermarkOpacity: 10,
    watermarkScale: 60,
    watermarkRotate: 0,
    globalFont: 'Inter',
    fonts: { ...DEFAULT_FONTS },
    content: {
      title: 'Your Digital Download',
      short: 'Thank you for your purchase!',
      main: 'Click the download button below to access your files. Save this page for future reference.',
      footer: '© 2025 Your Store Name. All rights reserved.',
      mainTwoColumn: false
    },
    promoEnabled: false,
    promo: {
      title: 'Special Offer',
      code: 'SAVE20',
      description: '20% off your next purchase',
      expiry: '',
      link: '',
      size: 18,
      qrEnabled: false
    },
    socials: {
      facebook: '',
      instagram: '',
      etsy: '',
      website: '',
      shopify: '',
      woocommerce: '',
      qrEnabled: false
    },
    primaryQREnabled: true,
    positions: { ...DEFAULT_POSITIONS },
    paper: 'letter',
    orientation: 'portrait',
    bleed: 0,
    showMarks: false,
    freeformMode: true,
    snapEnabled: true,
    guidesEnabled: true
  };
}

export function savePreset(name: string, data: PresetData) {
  const presets = getStoredPresets();
  presets[name] = data;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
}

export function loadPreset(name: string): PresetData | null {
  const presets = getStoredPresets();
  return presets[name] || null;
}

export function deletePreset(name: string) {
  const presets = getStoredPresets();
  delete presets[name];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
}

export function getStoredPresets(): Record<string, PresetData> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

export function exportPresets(): string {
  return JSON.stringify(getStoredPresets(), null, 2);
}

export function importPresets(jsonData: string): boolean {
  try {
    const imported = JSON.parse(jsonData);
    if (typeof imported === 'object' && imported !== null) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(imported));
      return true;
    }
  } catch {
    // Invalid JSON
  }
  return false;
}