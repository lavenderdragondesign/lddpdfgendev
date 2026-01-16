export interface Position {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FontConfig {
  family: string;
  weight: number;
  size: number;
  align: 'left' | 'center' | 'right' | 'justify';
}

export interface PresetData {
  // Source Mode
  inputMode: 'manual' | 'upload' | 'gdrive' | 'onedrive';
  primaryLink: string;
  
  // Branding
  backgroundColor: string;
  accentColor: string;
  buttonColor: string;
  
  // Assets
  logoUrl: string;
  watermarkUrl: string;
  watermarkOpacity: number;
  watermarkScale: number;
  watermarkRotate: number;
  
  // Typography
  globalFont: string;
  fonts: {
    title: FontConfig;
    short: FontConfig;
    main: FontConfig;
    footer: FontConfig;
    promo: FontConfig;
  };
  
  // Content
  content: {
    title: string;
    short: string;
    main: string;
    footer: string;
    mainTwoColumn: boolean;
  };
  
  // Promo
  promoEnabled: boolean;
  promo: {
    title: string;
    code: string;
    description: string;
    expiry: string;
    link: string;
    size: number;
    qrEnabled: boolean;
  };
  
  // Social
  socials: {
    facebook: string;
    instagram: string;
    etsy: string;
    website: string;
    shopify: string;
    woocommerce: string;
    qrEnabled: boolean;
  };
  
  // QR Settings
  primaryQREnabled: boolean;
  
  // Layout Positions
  positions: {
    logo: Position;
    title: Position;
    button: Position;
    qr: Position;
    promo: Position;
    socials: Position;
    footer: Position;
  };
  
  // Export Settings
  paper: 'letter' | 'a4';
  orientation: 'portrait' | 'landscape';
  bleed: number;
  showMarks: boolean;
  
  // UI Settings
  freeformMode: boolean;
  snapEnabled: boolean;
  guidesEnabled: boolean;
}

export interface DragState {
  isDragging: boolean;
  isResizing: boolean;
  startPos: { x: number; y: number };
  startRect: Position;
  handle: string | null;
}

export type ElementType = 'logo' | 'title' | 'button' | 'qr' | 'promo' | 'socials' | 'footer';