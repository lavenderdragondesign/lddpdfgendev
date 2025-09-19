import React from 'react';
import { PresetData } from '../../types';

interface ContentSectionProps {
  data: PresetData;
  onChange: (updates: Partial<PresetData>) => void;
}

export function ContentSection({ data, onChange }: ContentSectionProps) {
  const handleContentChange = (field: keyof PresetData['content'], value: string | boolean) => {
    onChange({
      content: {
        ...data.content,
        [field]: value
      }
    });
  };

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-gray-800">Content</h3>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
        <input
          type="text"
          value={data.content.title}
          onChange={(e) => handleContentChange('title', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Short Description</label>
        <input
          type="text"
          value={data.content.short}
          onChange={(e) => handleContentChange('short', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-sm font-medium text-gray-700">Main Description</label>
          <label className="flex items-center gap-1 text-xs">
            <input
              type="checkbox"
              checked={data.content.mainTwoColumn}
              onChange={(e) => handleContentChange('mainTwoColumn', e.target.checked)}
              className="text-blue-600"
            />
            Two Columns
          </label>
        </div>
        <textarea
          value={data.content.main}
          onChange={(e) => handleContentChange('main', e.target.value)}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm resize-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Footer</label>
        <input
          type="text"
          value={data.content.footer}
          onChange={(e) => handleContentChange('footer', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
        />
      </div>
    </div>
  );
}