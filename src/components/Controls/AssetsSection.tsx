import React from 'react';
import { PresetData } from '../../types';

interface AssetsSectionProps {
  data: PresetData;
  onChange: (updates: Partial<PresetData>) => void;
}

export function AssetsSection({ data, onChange }: AssetsSectionProps) {
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        onChange({ logoUrl: e.target?.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleWatermarkUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        onChange({ watermarkUrl: e.target?.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-gray-800">Assets</h3>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Logo</label>
        <input
          type="file"
          accept="image/*"
          onChange={handleLogoUpload}
          className="hidden"
          id="logo-upload"
        />
        <label
          htmlFor="logo-upload"
          className="inline-block px-4 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-full text-sm cursor-pointer transition-colors"
        >
          Choose Image...
        </label>
        {data.logoUrl && (
          <div className="mt-2">
            <img src={data.logoUrl} alt="Logo preview" className="w-16 h-16 object-contain border border-gray-200 rounded" />
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Watermark</label>
        <input
          type="file"
          accept="image/*"
          onChange={handleWatermarkUpload}
          className="hidden"
          id="watermark-upload"
        />
        <label
          htmlFor="watermark-upload"
          className="inline-block px-4 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-full text-sm cursor-pointer transition-colors"
        >
          Choose Image...
        </label>
        {data.watermarkUrl && (
          <div className="mt-2">
            <img src={data.watermarkUrl} alt="Watermark preview" className="w-16 h-16 object-contain border border-gray-200 rounded" />
            
            <div className="mt-3 space-y-2">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Opacity: {data.watermarkOpacity}%</label>
                <input
                  type="range"
                  min="2"
                  max="30"
                  value={data.watermarkOpacity}
                  onChange={(e) => onChange({ watermarkOpacity: Number(e.target.value) })}
                  className="w-full"
                />
              </div>
              
              <div>
                <label className="block text-xs text-gray-600 mb-1">Scale: {data.watermarkScale}%</label>
                <input
                  type="range"
                  min="20"
                  max="120"
                  value={data.watermarkScale}
                  onChange={(e) => onChange({ watermarkScale: Number(e.target.value) })}
                  className="w-full"
                />
              </div>
              
              <div>
                <label className="block text-xs text-gray-600 mb-1">Rotate: {data.watermarkRotate}°</label>
                <input
                  type="range"
                  min="-60"
                  max="60"
                  value={data.watermarkRotate}
                  onChange={(e) => onChange({ watermarkRotate: Number(e.target.value) })}
                  className="w-full"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}