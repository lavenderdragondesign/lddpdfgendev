import React from 'react';
import { PresetData, ElementType } from '../../types';
import { extractLinkFromPdfFile } from '../../utils/extractLinkFromPdf';
import { exportToPDF } from '../../utils/export';
import { SourceModeSection } from './SourceModeSection';
import { PaperSection } from './PaperSection';
import { FontSection } from './FontSection';
import { AssetsSection } from './AssetsSection';
import { ColorsSection } from './ColorsSection';
import { ContentSection } from './ContentSection';
import { PromoSection } from './PromoSection';
import { SocialsSection } from './SocialsSection';
import { PresetsSection } from './PresetsSection';

interface ControlsPanelProps {
  data: PresetData;
  onChange: (updates: Partial<PresetData>) => void;
  selectedElement: ElementType | null;
  canvasRef: React.RefObject<HTMLDivElement>;
}

export function ControlsPanel({ data, onChange, selectedElement, canvasRef }: ControlsPanelProps) {
  const [isExporting, setIsExporting] = React.useState(false);
  const handleQuickPdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/\.pdf$/i.test(file.name)) { alert('Please choose a PDF'); return; }
    const url = await extractLinkFromPdfFile(file);
    if (url) onChange({ primaryLink: url, inputMode: 'upload' });
    else alert('No web link found in that PDF.');
  };
  const [tab, setTab] = React.useState<'assets'|'content'|'fonts'|'colors'|'promo'|'socials'|'source'|'paper'|'presets'>('source');

  const handleExportPDF = async () => {
    if (!canvasRef.current) return;
    
    setIsExporting(true);
    try {
      await exportToPDF(canvasRef.current, {
        paper: data.paper,
        orientation: data.orientation,
        bleed: data.bleed,
        showMarks: data.showMarks
      });
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col h-screen" role="navigation" aria-label="Sidebar">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
  {data.logoUrl && (
    <img src={data.logoUrl} alt="Logo" className="w-7 h-7 rounded" crossOrigin="anonymous" />
  )}
  <h1 className="text-lg font-bold text-gray-800">LavenderDragonDesign's Branded PDF Generator</h1>
</div>
        <div className="text-xs text-gray-500 mt-1">Ultimate+ Build</div>
    </div>

      <div className="px-3 py-3 border-b border-gray-200 sticky top-0 bg-white z-10" data-ui>
        <div className="grid grid-cols-2 gap-2">
          {[
            ['source','Source'],
            ['assets','Assets'],
            ['content','Content'],
            ['fonts','Fonts'],
            ['colors','Colors'],
            ['promo','Promo'],
            ['socials','Socials'],
            ['paper','Paper'],
            ['presets','Presets'],
          ].map(([key,label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key as any)}
              className={`px-2.5 py-2 rounded-md text-sm border transition ${tab===key ? "bg-gray-900 text-white border-gray-900" : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 p-4">
{tab==="assets" && (<AssetsSection data={data} onChange={onChange} />)}
{tab==="content" && (<ContentSection data={data} onChange={onChange} />)}
{tab==="fonts" && (<FontSection data={data} onChange={onChange} />)}
{tab==="colors" && (<ColorsSection data={data} onChange={onChange} />)}
{tab==="promo" && (<PromoSection data={data} onChange={onChange} />)}
{tab==="socials" && (<SocialsSection data={data} onChange={onChange} />)}
{tab==="source" && (<SourceModeSection data={data} onChange={onChange} />)}
{tab==="paper" && (<PaperSection data={data} onChange={onChange} />)}
{tab==="presets" && (<PresetsSection data={data} onChange={onChange} />)}
</div>

<div className="p-4 border-t border-gray-200 space-y-3">
        <div className="flex gap-2 text-xs">
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={data.freeformMode}
              onChange={(e) => onChange({ freeformMode: e.target.checked })}
              className="text-blue-600"
            />
            Freeform
          </label>
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={data.snapEnabled}
              onChange={(e) => onChange({ snapEnabled: e.target.checked })}
              className="text-blue-600"
            />
            Snap
          </label>
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={data.guidesEnabled}
              onChange={(e) => onChange({ guidesEnabled: e.target.checked })}
              className="text-blue-600"
            />
            Guides
          </label>
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={data.primaryQREnabled}
              onChange={(e) => onChange({ primaryQREnabled: e.target.checked })}
              className="text-blue-600"
            />
            QR
          </label>
        </div>

        <button type="button" onClick={handleExportPDF}
          disabled={isExporting}
          className="w-full px-4 py-3 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
        >
          {isExporting ? 'Exporting...' : 'Export PDF'}
        </button>
      </div>
    </div>
  );
}