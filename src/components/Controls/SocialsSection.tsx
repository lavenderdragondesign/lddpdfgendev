import React from 'react';
import { PresetData } from '../../types';

interface SocialsSectionProps {
  data: PresetData;
  onChange: (updates: Partial<PresetData>) => void;
}

export function SocialsSection({ data, onChange }: SocialsSectionProps) {
  const handleSocialChange = (platform: keyof Omit<PresetData['socials'], 'qrEnabled'> | 'qrEnabled', value: string | boolean) => {
    onChange({
      socials: {
        ...data.socials,
        [platform]: value
      }
    });
  };

  const socialPlatforms = [
    { key: 'facebook', label: 'Facebook', placeholder: 'https://facebook.com/yourpage' },
    { key: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/youraccount' },
    { key: 'etsy', label: 'Etsy', placeholder: 'https://etsy.com/shop/yourshop' },
    { key: 'website', label: 'Website', placeholder: 'https://yourwebsite.com' },
    { key: 'shopify', label: 'Shopify', placeholder: 'https://yourstore.myshopify.com' },
    { key: 'woocommerce', label: 'WooCommerce', placeholder: 'https://yourstore.com' }
  ] as const;

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-gray-800">Social Media</h3>
      
      <div className="space-y-3">
        {socialPlatforms.map(({ key, label, placeholder }) => (
          <div key={key}>
            <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
            <input
              type="url"
              value={data.socials[key]}
              onChange={(e) => handleSocialChange(key, e.target.value)}
              placeholder={placeholder}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>
        ))}
        
        <label className="flex items-center gap-2 pt-2 border-t border-gray-200">
          <input
            type="checkbox"
            checked={data.socials.qrEnabled}
            onChange={(e) => handleSocialChange('qrEnabled', e.target.checked)}
            className="text-blue-600"
          />
          <span className="text-sm">Generate QR codes for social links</span>
        </label>
      </div>
    </div>
  );
}