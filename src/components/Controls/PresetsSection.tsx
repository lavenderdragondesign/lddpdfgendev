import React, { useState } from 'react';
import { PresetData } from '../../types';
import { 
  savePreset, 
  loadPreset, 
  deletePreset, 
  getStoredPresets, 
  exportPresets, 
  importPresets 
} from '../../utils/presets';

interface PresetsSectionProps {
  data: PresetData;
  onLoadPreset: (preset: PresetData) => void;
}

export function PresetsSection({ data, onLoadPreset }: PresetsSectionProps) {
  const [presetName, setPresetName] = useState('');
  const [selectedPreset, setSelectedPreset] = useState('');
  const [presets, setPresets] = useState(() => getStoredPresets());

  const refreshPresets = () => {
    setPresets(getStoredPresets());
  };

  const handleSavePreset = () => {
    if (presetName.trim()) {
      savePreset(presetName.trim(), data);
      setPresetName('');
      refreshPresets();
    }
  };

  const handleLoadPreset = () => {
    if (selectedPreset) {
      const preset = loadPreset(selectedPreset);
      if (preset) {
        onLoadPreset(preset);
      }
    }
  };

  const handleDeletePreset = () => {
    if (selectedPreset && confirm(`Delete preset "${selectedPreset}"?`)) {
      deletePreset(selectedPreset);
      setSelectedPreset('');
      refreshPresets();
    }
  };

  const handleExportJSON = () => {
    const json = exportPresets();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bpfg-presets.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const json = e.target?.result as string;
        if (importPresets(json)) {
          refreshPresets();
          alert('Presets imported successfully!');
        } else {
          alert('Failed to import presets. Please check the file format.');
        }
      };
      reader.readAsText(file);
    }
  };

  const presetNames = Object.keys(presets);

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-gray-800">Presets & Export</h3>
      
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Save Current as Preset</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              placeholder="Preset name..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
            <button
              onClick={handleSavePreset}
              disabled={!presetName.trim()}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:bg-gray-400"
            >
              Save
            </button>
          </div>
        </div>

        {presetNames.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Load Preset</label>
            <div className="flex gap-2">
              <select
                value={selectedPreset}
                onChange={(e) => setSelectedPreset(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="">Select preset...</option>
                {presetNames.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
              <button
                onClick={handleLoadPreset}
                disabled={!selectedPreset}
                className="px-4 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 disabled:bg-gray-400"
              >
                Load
              </button>
              <button
                onClick={handleDeletePreset}
                disabled={!selectedPreset}
                className="px-3 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 disabled:bg-gray-400"
              >
                Del
              </button>
            </div>
          </div>
        )}

        <div className="border-t pt-3">
          <label className="block text-sm font-medium text-gray-700 mb-2">Import/Export JSON</label>
          <div className="flex gap-2">
            <button
              onClick={handleExportJSON}
              className="px-4 py-2 bg-gray-600 text-white text-sm rounded-md hover:bg-gray-700"
            >
              Export JSON
            </button>
            <label className="px-4 py-2 bg-gray-600 text-white text-sm rounded-md hover:bg-gray-700 cursor-pointer">
              Import JSON
              <input
                type="file"
                accept=".json"
                onChange={handleImportJSON}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}