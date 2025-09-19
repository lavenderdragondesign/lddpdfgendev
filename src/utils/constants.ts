export const CANVAS_SIZE = {
  width: 816,
  height: 1056
};

export const SAFE_AREA = {
  top: 48,
  right: 48,
  bottom: 48,
  left: 48
};

export const SNAP_TOLERANCE = 8;

export const PAPER_SIZES = {
  letter: { width: 612, height: 792 }, // points
  a4: { width: 595.28, height: 841.89 }
};

export const GOOGLE_FONTS = [
  'Inter',
  'Montserrat', 
  'Roboto',
  'Open Sans',
  'Lora',
  'Playfair Display'
];

export const BRAND_COLORS = {
  etsy: '#F1641E',
  shopify: '#008060',
  black: '#000000',
  white: '#FFFFFF'
};

export const SOCIAL_ICONS = {
  facebook: 'https://img.icons8.com/color/48/facebook-new.png',
  instagram: 'https://img.icons8.com/color/48/instagram-new.png',
  etsy: 'https://img.icons8.com/color/48/etsy.png',
  website: 'https://img.icons8.com/color/48/domain.png',
  shopify: 'https://img.icons8.com/color/48/shopify.png',
  woocommerce: 'https://img.icons8.com/color/48/woocommerce.png'
};

export const DEFAULT_POSITIONS = {
  logo: { x: 68, y: 68, width: 120, height: 80 },
  title: { x: 68, y: 180, width: 680, height: 200 },
  button: { x: 258, y: 420, width: 300, height: 60 },
  qr: { x: 620, y: 380, width: 120, height: 120 },
  promo: { x: 68, y: 550, width: 680, height: 180 },
  socials: { x: 68, y: 780, width: 680, height: 60 },
  footer: { x: 68, y: 980, width: 680, height: 40 }
};

export const DEFAULT_FONTS = {
  title: { family: 'Inter', weight: 800, size: 28, align: 'left' as const },
  short: { family: 'Inter', weight: 600, size: 14, align: 'left' as const },
  main: { family: 'Inter', weight: 400, size: 13, align: 'left' as const },
  footer: { family: 'Inter', weight: 400, size: 10, align: 'left' as const },
  promo: { family: 'Inter', weight: 700, size: 18, align: 'center' as const }
};