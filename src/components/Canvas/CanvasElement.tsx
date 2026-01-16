import React, { useState, useEffect } from 'react';
import { Position, FontConfig } from '../../types';
import { generateQRCode } from '../../utils/qr';
import { getContrastColor } from '../../utils/colors';
import { SOCIAL_ICONS } from '../../utils/constants';

function safeHref(raw?: string): string | null {
  if (!raw) return null;
  try {
    // Auto-prepend https:// if it looks like a bare domain
    if (/^[\w.-]+\.[A-Za-z]{2,}(\/.*)?$/.test(raw) && !/^https?:/i.test(raw)) {
      raw = "https://" + raw;
    }
    const url = new URL(raw, window.location.origin);
    if (url.protocol === "http:" || url.protocol === "https:" || url.protocol === "mailto:" || url.protocol === "tel:") {
      return url.toString();
    }
    // Block file:// and other non-web protocols
    return null;
  } catch {
    return null;
  }
}


interface CanvasElementProps {
  type: 'logo' | 'title' | 'button' | 'qr' | 'promo' | 'socials' | 'footer';
  position: Position;
  data: any;
  className?: string;
}

export function CanvasElement({ type, data, className = '' }: CanvasElementProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [socialQRs, setSocialQRs] = useState<Record<string, string>>({});

  useEffect(() => {
    if (type === 'qr' && data.primaryLink) {
      generateQRCode(data.primaryLink).then(setQrDataUrl);
    }
  }, [type, data.primaryLink]);

  useEffect(() => {
    if (type === 'socials' && data.socials?.qrEnabled) {
      const generateSocialQRs = async () => {
        const qrs: Record<string, string> = {};
        const socialKeys = ['facebook', 'instagram', 'etsy', 'website', 'shopify', 'woocommerce'];
        
        for (const key of socialKeys) {
          if (data.socials[key]) {
            qrs[key] = await generateQRCode(data.socials[key]);
          }
        }
        setSocialQRs(qrs);
      };
      generateSocialQRs();
    }
  }, [type, data.socials]);

  const renderContent = () => {
    switch (type) {
      case 'logo':
        return data.logoUrl ? (
          <img 
            src={data.logoUrl} 
            alt="Logo" 
            className="w-full h-full object-contain"
            crossOrigin="anonymous"
          />
        ) : (
          <div className="w-full h-full border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-sm">
            Logo
          </div>
        );

      case 'title':
        return (
          <div className="w-full h-full overflow-hidden">
            <div 
              className="font-bold mb-2"
              style={{
                fontFamily: data.fonts.title.family,
                fontSize: data.fonts.title.size,
                textAlign: data.fonts.title.align,
                fontWeight: data.fonts.title.weight
              }}
            >
              {data.content.title}
            </div>
            <div 
              className="mb-2"
              style={{
                fontFamily: data.fonts.short.family,
                fontSize: data.fonts.short.size,
                textAlign: data.fonts.short.align,
                fontWeight: data.fonts.short.weight
              }}
            >
              {data.content.short}
            </div>
            <div 
              className={data.content.mainTwoColumn ? 'columns-2 gap-4' : ''}
              style={{
                fontFamily: data.fonts.main.family,
                fontSize: data.fonts.main.size,
                textAlign: data.fonts.main.align,
                fontWeight: data.fonts.main.weight
              }}
            >
              {data.content.main}
            </div>
          </div>
        );

      case 'button':
        const buttonTextColor = getContrastColor(data.buttonColor);
        return (
          <button title={data.primaryLink || ''}
            className="w-full h-full rounded-lg font-semibold text-lg transition-opacity hover:opacity-90"
            style={{
              backgroundColor: data.buttonColor,
              color: buttonTextColor
            }}
            onClick={(e) => { const href = safeHref(data.primaryLink); if (!href) { e.preventDefault(); alert('This button can only open web links (http/https). Local file paths like file://download.pdf are blocked by the browser. Please paste an online link.'); return; } window.open(href, '_blank', 'noopener'); }}
          >
            Download Files
          </button>
        );

      case 'qr':
        return (
          <div className="w-full h-full bg-white border border-gray-200 rounded-lg p-2 flex items-center justify-center">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="QR Code" className="max-w-full max-h-full" />
            ) : (
              <div data-export-hide className="text-gray-400 text-xs text-center">QR</div>
            )}
          </div>
        );

      case 'promo':
        if (!data.promoEnabled) return null;
        return (
          <div 
            className="w-full h-full rounded-lg p-4 text-white"
            style={{ backgroundColor: data.accentColor }}
          >
            <div className="text-center">
              <div className="font-bold mb-2">{data.promo.title}</div>
              <div 
                className="font-black tracking-wider mb-2"
                style={{ fontSize: data.promo.size }}
              >
                {data.promo.code}
              </div>
              <div className="text-sm mb-2">{data.promo.description}</div>
              {data.promo.expiry && (
                <div className="text-xs opacity-80">Expires: {data.promo.expiry}</div>
              )}
            </div>
          </div>
        );

      case 'socials':
        const filledSocials = Object.entries(data.socials || {}).filter(([key, value]) => 
          key !== 'qrEnabled' && value && typeof value === 'string' && value.trim() !== ''
        );
        
        if (filledSocials.length === 0) return null;

        return (
          <div className="w-full h-full">
            <div className="flex items-center gap-4 mb-2">
              {filledSocials.map(([key, url]) => (
                <a
                  key={key}
                  href={url as string}
                  target="_blank"
                  rel="noreferrer"
                  className="transition-transform hover:scale-110"
                >
                  <img
                    src={SOCIAL_ICONS[key as keyof typeof SOCIAL_ICONS]}
                    alt={key}
                    className="w-8 h-8"
                    crossOrigin="anonymous"
                  />
                </a>
              ))}
            </div>
            
            {data.socials?.qrEnabled && (
              <div className="flex gap-2 flex-wrap">
                {filledSocials.map(([key, url]) => {
                  const qr = socialQRs[key];
                  if (!qr) return null;
                  
                  const hostname = new URL(url as string).hostname.replace('www.', '');
                  return (
                    <div key={`${key}-qr`} className="text-center">
                      <img src={qr} alt={`${key} QR`} className="w-12 h-12 border border-gray-200" />
                      <div className="text-xs mt-1">{hostname}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );

      case 'footer':
        return (
          <div 
            className="w-full h-full flex items-center"
            style={{
              fontFamily: data.fonts.footer.family,
              fontSize: data.fonts.footer.size,
              textAlign: data.fonts.footer.align,
              fontWeight: data.fonts.footer.weight
            }}
          >
            {data.content.footer}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={`${className}`}>
      {renderContent()}
    </div>
  );
}