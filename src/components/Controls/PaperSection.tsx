import React from 'react';
import { PresetData } from '../../types';

interface PaperSectionProps {
  data: PresetData;
  onChange: (updates: Partial<PresetData>) => void;
}

export function PaperSection({ data, onChange }: PaperSectionProps) {
  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-gray-800">Paper & Export</h3>
      
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Paper Size</label>
          <div className="flex gap-2">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="paper"
                value="letter"
                checked={data.paper === 'letter'}
                onChange={(e) => onChange({ paper: e.target.value as 'letter' | 'a4' })}
                className="text-blue-600"
              />
              <span className="text-sm">US Letter</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="paper"
                value="a4"
                checked={data.paper === 'a4'}
                onChange={(e) => onChange({ paper: e.target.value as 'letter' | 'a4' })}
                className="text-blue-600"
              />
              <span className="text-sm">A4</span>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Orientation</label>
          <div className="flex gap-2">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="orientation"
                value="portrait"
                checked={data.orientation === 'portrait'}
                onChange={(e) => onChange({ orientation: e.target.value as 'portrait' | 'landscape' })}
                className="text-blue-600"
              />
              <span className="text-sm">Portrait</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="orientation"
                value="landscape"
                checked={data.orientation === 'landscape'}
                onChange={(e) => onChange({ orientation: e.target.value as 'portrait' | 'landscape' })}
                className="text-blue-600"
              />
              <span className="text-sm">Landscape</span>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Bleed & Crop Marks</label>
          <select
            value={data.bleed}
            onChange={(e) => onChange({ bleed: Number(e.target.value), showMarks: Number(e.target.value) > 0 })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          >
            <option value={0}>None</option>
            <option value={1}>⅛"</option>
            <option value={2}>¼"</option>
          </select>
        </div>
      </div>
    </div>
  );
}