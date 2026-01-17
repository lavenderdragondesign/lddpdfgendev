

export enum EditorTab {
  SOURCE = 'source',
  ASSETS = 'assets',
  CONTENT = 'content',
  FONTS = 'fonts',
  COLORS = 'colors',
  PROMO = 'promo',
  SOCIALS = 'socials',
  PAPER = 'paper',
  PRESETS = 'presets'
}

// Enum used by Sidebar for main application navigation tabs
export enum AppTab {
  BRAINSTORM = 'brainstorm',
  ROADMAP = 'roadmap',
  VISUALIZE = 'visualize',
  PITCH = 'pitch'
}

export interface BlockFont {
  family: string;
  size: number;
  align: 'left' | 'center' | 'right' | 'justify';
  color?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
}

export interface BlockLayout {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ExtraLayer {
  id: string;
  type: 'text' | 'image' | 'button';
  content: string; // For text: the string; For image: b64; For button: the URL
  label?: string; // Optional label for buttons
  x: number;
  y: number;
  w: number;
  h: number;
  fontSize: number;
  visible: boolean;
  fontFamily?: string;
  align?: 'left' | 'center' | 'right' | 'justify';
  color?: string;
  bgColor?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
}

// Recursive interface for AI-generated roadmap structures
export interface RoadmapNode {
  name: string;
  description?: string;
  children?: RoadmapNode[];
}

export interface PDFConfig {
  source: {
    mode: 'upload' | 'link' | 'drive' | 'one' | 'shopify';
    link: string;
    fileName: string | null;
  };
  assets: {
    logo: string | null;
    watermark: string | null;
    watermarkOpacity: number;
  };
  content: {
    title: string;
    shortDesc: string;
    mainDesc: string;
    footer: string;
    twoColumns: boolean;
  };
  fonts: {
    global: string;
    blocks: {
      title: BlockFont;
      shortDesc: BlockFont;
      mainDesc: BlockFont;
      footer: BlockFont;
      promo: BlockFont;
      socials: BlockFont;
      [key: string]: BlockFont;
    };
  };
  colors: {
    background: string;
    accent: string;
    button: string;
    buttonText: string;
    syncAccent: boolean;
    qrColor: string;
    qrBgColor: string;
  };
  promo: {
    enabled: boolean;
    title: string;
    code: string;
    description: string;
    expiry: string;
    link: string;
    size: number;
    showQR: boolean;
  };
  socials: {
    facebook: string;
    instagram: string;
    etsy: string;
    website: string;
    shopify: string;
    woo: string;
    genQR: boolean;
  };
  paper: {
    size: 'US Letter' | 'A4';
    orientation: 'portrait' | 'landscape';
    bleed: string;
  };
  visibility: {
    logo: boolean;
    title: boolean;
    button: boolean;
    qr: boolean;
    promo: boolean;
    socials: boolean;
    footer: boolean;
    shortDesc: boolean;
    mainDesc: boolean;
    watermark: boolean;
    [key: string]: boolean;
  };
  layout: {
    btnWidth: number;
    btnHeight: number;
    freeform: boolean;
    snap: boolean;
    guides: boolean;
    qr: boolean;
    blocks: {
      [key: string]: BlockLayout;
    };
    extraLayers: ExtraLayer[];
  };
}
