import { GOOGLE_FONTS } from './constants';

let loadedFonts = new Set<string>();
let customFonts: { name: string; url: string }[] = [];

export function loadGoogleFont(family: string) {
  if (!GOOGLE_FONTS.includes(family) || loadedFonts.has(family)) {
    return;
  }

  const link = document.createElement('link');
  link.rel = 'preconnect';
  link.href = 'https://fonts.googleapis.com';
  document.head.appendChild(link);

  const link2 = document.createElement('link');
  link2.rel = 'preconnect';
  link2.href = 'https://fonts.gstatic.com';
  link2.crossOrigin = 'anonymous';
  document.head.appendChild(link2);

  const fontLink = document.createElement('link');
  fontLink.rel = 'stylesheet';
  fontLink.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@400;600;700;800&display=swap`;
  document.head.appendChild(fontLink);

  loadedFonts.add(family);
}

export function loadCustomFont(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const fontData = e.target?.result as ArrayBuffer;
      const blob = new Blob([fontData], { type: file.type });
      const fontUrl = URL.createObjectURL(blob);
      const fontName = `CustomFont_${Date.now()}`;

      const style = document.createElement('style');
      style.textContent = `
        @font-face {
          font-family: "${fontName}";
          src: url("${fontUrl}") format("${file.type.includes('otf') ? 'opentype' : 'truetype'}");
          font-display: swap;
        }
      `;
      document.head.appendChild(style);

      customFonts.push({ name: fontName, url: fontUrl });
      resolve(fontName);
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

export function getAllFonts(): string[] {
  return [...GOOGLE_FONTS, ...customFonts.map(f => f.name)];
}

export function getCustomFonts(): { name: string; url: string }[] {
  return customFonts;
}