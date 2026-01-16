import React from 'react';
import { HexColorPicker } from 'react-colorful';
import { PresetData } from '../../types';
import { BRAND_COLORS } from '../../utils/constants';

interface ColorsSectionProps {
  data: PresetData;
  onChange: (updates: Partial<PresetData>) => void;
}

export function ColorsSection({ data, onChange }: ColorsSectionProps) {
  const [showBackgroundPicker, setShowBackgroundPicker] = React.useState(false);
  const [showAccentPicker, setShowAccentPicker] = React.useState(false);
  const [showButtonPicker, setShowButtonPicker] = React.useState(false);

  const handleBrandPreset = (preset: keyof typeof BRAND_COLORS) => {
    const color = BRAND_COLORS[preset];
    onChange({ buttonColor: color });
  };

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-gray-800">Colors</h3>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Background</label>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowBackgroundPicker(!showBackgroundPicker)}
            className="w-8 h-8 border border-gray-300 rounded"
            style={{ backgroundColor: data.backgroundColor }}
          />
          <span className="text-sm text-gray-600">{data.backgroundColor}</span>
        </div>
        {showBackgroundPicker && (
          <div className="mt-2">
            <HexColorPicker
              color={data.backgroundColor}
              onChange={(color) => onChange({ backgroundColor: color })}
            />
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Accent Color</label>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAccentPicker(!showAccentPicker)}
            className="w-8 h-8 border border-gray-300 rounded"
            style={{ backgroundColor: data.accentColor }}
          />
          <span className="text-sm text-gray-600">{data.accentColor}</span>
        </div>
        {showAccentPicker && (
          <div className="mt-2">
            <HexColorPicker
              color={data.accentColor}
              onChange={(color) => onChange({ accentColor: color })}
            />
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Download Button</label>
        
        <div className="flex gap-2 mb-2 flex-wrap">
          <button
            onClick={() => onChange({ buttonColor: data.accentColor })}
            className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded border"
          >
            Use Accent
          </button>
          {Object.entries(BRAND_COLORS).map(([name, color]) => (
            <button
              key={name}
              onClick={() => handleBrandPreset(name as keyof typeof BRAND_COLORS)}
              className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded border capitalize"
            >
              {name}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowButtonPicker(!showButtonPicker)}
            className="w-8 h-8 border border-gray-300 rounded"
            style={{ backgroundColor: data.buttonColor }}
          />
          <span className="text-sm text-gray-600">{data.buttonColor}</span>
        </div>
        {showButtonPicker && (
          <div className="mt-2">
            <HexColorPicker
              color={data.buttonColor}
              onChange={(color) => onChange({ buttonColor: color })}
            />
          </div>
        )}
      </div>
    </div>
  );
}