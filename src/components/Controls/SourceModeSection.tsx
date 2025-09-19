import React from 'react';
import { PresetData } from '../../types';
import { extractLinkFromPdfFile } from '../../utils/extractLinkFromPdf';

interface SourceModeSectionProps {
  data: PresetData;
  onChange: (updates: Partial<PresetData>) => void;
}

export function SourceModeSection({ data, onChange }: SourceModeSectionProps) {
  const handleModeChange = (mode: PresetData['inputMode']) => {
    onChange({ inputMode: mode });
  };

  const handleLinkChange = (link: string) => {
    onChange({ primaryLink: link });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/\.pdf$/i.test(file.name)) {
      alert('Please select a PDF file.');
      return;
    }
    const url = await extractLinkFromPdfFile(file);
    if (url) {
      onChange({ primaryLink: url, inputMode: 'upload' });
    } else {
      alert('No web link found inside that PDF. Try a different PDF or paste the link manually.');
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-gray-800">Source Mode</h3>
      
      <div className="space-y-3">
        {data.inputMode === 'manual' && (
          <input
            type="url"
            placeholder="https://your-download-link.com"
            value={data.primaryLink}
            onChange={(e) => handleLinkChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          />
        )}

        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="inputMode"
            value="upload"
            checked={data.inputMode === 'upload'}
            onChange={() => handleModeChange('upload')}
            className="text-blue-600"
          />
          <span className="text-sm">Upload PDF</span>
        </label>
<label className="flex items-center gap-2">
          <input
            type="radio"
            name="inputMode"
            value="manual"
            checked={data.inputMode === 'manual'}
            onChange={() => handleModeChange('manual')}
            className="text-blue-600"
          />
          <span className="text-sm">Manual Link</span>
        </label>

        {data.inputMode === 'upload' && (
          <div>
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileUpload}
              className="hidden"
              id="pdf-upload"
            />
            <label
              htmlFor="pdf-upload"
              className="inline-block px-4 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-full text-sm cursor-pointer transition-colors"
            >
              Choose PDF...
            </label>
            {data.primaryLink.startsWith('file://') && (
              <div className="mt-2 text-sm text-gray-600">
                Selected: {data.primaryLink.replace('file://', '')}
              </div>
            )}
          </div>
        )}

        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="inputMode"
            value="gdrive"
            checked={data.inputMode === 'gdrive'}
            onChange={() => handleModeChange('gdrive')}
            className="text-blue-600"
          />
          <span className="text-sm">Google Drive Link</span>
        </label>

        {data.inputMode === 'gdrive' && (
          <input
            type="url"
            placeholder="https://drive.google.com/..."
            value={data.primaryLink}
            onChange={(e) => handleLinkChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          />
        )}

        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="inputMode"
            value="onedrive"
            checked={data.inputMode === 'onedrive'}
            onChange={() => handleModeChange('onedrive')}
            className="text-blue-600"
          />
          <span className="text-sm">OneDrive Link</span>
        </label>

        {data.inputMode === 'onedrive' && (
          <input
            type="url"
            placeholder="https://1drv.ms/..."
            value={data.primaryLink}
            onChange={(e) => handleLinkChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          />
        )}
      </div>
    </div>
  );
}