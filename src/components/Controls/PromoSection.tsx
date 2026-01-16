import React from 'react';
import { PresetData } from '../../types';

interface PromoSectionProps {
  data: PresetData;
  onChange: (updates: Partial<PresetData>) => void;
}

export function PromoSection({ data, onChange }: PromoSectionProps) {
  const handlePromoChange = (field: keyof PresetData['promo'] | 'enabled', value: string | number | boolean) => {
    if (field === 'enabled') {
      onChange({ promoEnabled: value as boolean });
    } else {
      onChange({
        promo: {
          ...data.promo,
          [field]: value
        }
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="promo-enabled"
          checked={data.promoEnabled}
          onChange={(e) => handlePromoChange('enabled', e.target.checked)}
          className="text-blue-600"
        />
        <label htmlFor="promo-enabled" className="font-semibold text-gray-800">Promo Code Box</label>
      </div>
      
      {data.promoEnabled && (
        <div className="space-y-3 pl-6 border-l-2 border-gray-200">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Promo Title</label>
            <input
              type="text"
              value={data.promo.title}
              onChange={(e) => handlePromoChange('title', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Promo Code</label>
            <input
              type="text"
              value={data.promo.code}
              onChange={(e) => handlePromoChange('code', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-mono"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input
              type="text"
              value={data.promo.description}
              onChange={(e) => handlePromoChange('description', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
            <input
              type="date"
              value={data.promo.expiry}
              onChange={(e) => handlePromoChange('expiry', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Promo Link</label>
            <input
              type="url"
              value={data.promo.link}
              onChange={(e) => handlePromoChange('link', e.target.value)}
              placeholder="https://your-store.com/promo"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Code Size: {data.promo.size}px</label>
            <input
              type="range"
              min="12"
              max="32"
              value={data.promo.size}
              onChange={(e) => handlePromoChange('size', Number(e.target.value))}
              className="w-full"
            />
          </div>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={data.promo.qrEnabled}
              onChange={(e) => handlePromoChange('qrEnabled', e.target.checked)}
              className="text-blue-600"
            />
            <span className="text-sm">Show Promo QR Code</span>
          </label>
        </div>
      )}
    </div>
  );
}