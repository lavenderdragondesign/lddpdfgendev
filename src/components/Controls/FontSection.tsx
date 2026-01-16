import React from 'react';
import { PresetData } from '../../types';
import { getAllFonts, loadGoogleFont, loadCustomFont } from '../../utils/fonts';

interface FontSectionProps {
  data: PresetData;
  onChange: (updates: Partial<PresetData>) => void;
}

export function FontSection({ data, onChange }: FontSectionProps) {
  const availableFonts = getAllFonts();

  const handleGlobalFontChange = (fontFamily: string) => {
    loadGoogleFont(fontFamily);
    onChange({ globalFont: fontFamily });
  };

  const handleCustomFontUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && (file.type === 'font/ttf' || file.type === 'font/otf' || file.name.endsWith('.ttf') || file.name.endsWith('.otf'))) {
      try {
        const fontName = await loadCustomFont(file);
        // Optionally set as global font
        onChange({ globalFont: fontName });
      } catch (error) {
        console.error('Failed to load custom font:', error);
        alert('Failed to load font file. Please check the file format.');
      }
    }
  };

  const handleBlockFontChange = (blockType: keyof PresetData['fonts'], property: keyof PresetData['fonts']['title'], value: any) => {
    onChange({
      fonts: {
        ...data.fonts,
        [blockType]: {
          ...data.fonts[blockType],
          [property]: value
        }
      }
    });
  };

  const renderBlockFontControls = (blockType: keyof PresetData['fonts'], label: string) => {
    const font = data.fonts[blockType];
    return (
      <div key={blockType} className="space-y-2">
        <h5 className="text-sm font-medium text-gray-700">{label}</h5>
        <div className="grid grid-cols-2 gap-2">
          <select
            value={font.family}
            onChange={(e) => {
              loadGoogleFont(e.target.value);
              handleBlockFontChange(blockType, 'family', e.target.value);
            }}
            className="px-2 py-1 border border-gray-300 rounded text-xs"
          >
            {availableFonts.map(fontName => (
              <option key={fontName} value={fontName}>{fontName}</option>
            ))}
          </select>
          <input
            type="range"
            min="8"
            max="48"
            value={font.size}
            onChange={(e) => handleBlockFontChange(blockType, 'size', Number(e.target.value))}
            className="w-full"
          />
        </div>
        <div className="flex gap-1">
          {(['left', 'center', 'right', 'justify'] as const).map(align => (
            <button
              key={align}
              onClick={() => handleBlockFontChange(blockType, 'align', align)}
              className={`px-2 py-1 text-xs rounded ${font.align === align ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
            >
              {align[0].toUpperCase()}
            </button>
          ))}
        </div>
        <div className="text-xs text-gray-500">{font.size}px</div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-gray-800">Typography</h3>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Global Font</label>
        <select
          value={data.globalFont}
          onChange={(e) => handleGlobalFontChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
        >
          {availableFonts.map(fontName => (
            <option key={fontName} value={fontName}>{fontName}</option>
          ))}
        </select>
      </div>

      <div>
        <input
          type="file"
          accept=".ttf,.otf"
          onChange={handleCustomFontUpload}
          className="hidden"
          id="font-upload"
        />
        <label
          htmlFor="font-upload"
          className="inline-block px-4 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-full text-sm cursor-pointer transition-colors"
        >
          Upload Custom Font...
        </label>
      </div>

      <div className="space-y-4 border-t pt-4">
        <h4 className="font-medium text-gray-700">Per-Block Fonts</h4>
        {renderBlockFontControls('title', 'Title')}
        {renderBlockFontControls('short', 'Short Description')}
        {renderBlockFontControls('main', 'Main Description')}
        {renderBlockFontControls('footer', 'Footer')}
        {renderBlockFontControls('promo', 'Promo')}
      </div>
    </div>
  );
}