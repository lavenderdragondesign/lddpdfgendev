import React, { useState, useRef } from 'react';
import { PresetData, ElementType, Position } from './types';
import { getDefaultPreset } from './utils/presets';
import { loadGoogleFont } from './utils/fonts';
import { ControlsPanel } from './components/Controls/ControlsPanel';
import { Canvas } from './components/Canvas/Canvas';

function App() {
  const [data, setData] = useState<PresetData>(() => {
    const defaultPreset = getDefaultPreset();
    // Load default font
    loadGoogleFont(defaultPreset.globalFont);
    return defaultPreset;
  });
  
  const [selectedElement, setSelectedElement] = useState<ElementType | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const handleDataChange = (updates: Partial<PresetData>) => {
    setData(prev => {
      const newData = { ...prev, ...updates };
      
      // Load fonts when they change
      if (updates.globalFont) {
        loadGoogleFont(updates.globalFont);
      }
      if (updates.fonts) {
        Object.values(updates.fonts).forEach(font => {
          loadGoogleFont(font.family);
        });
      }
      
      return newData;
    });
  };

  const handlePositionChange = (element: ElementType, position: Position) => {
    setData(prev => ({
      ...prev,
      positions: {
        ...prev.positions,
        [element]: position
      }
    }));
  };

  // Apply global font to the entire app
  React.useEffect(() => {
    document.body.style.fontFamily = data.globalFont;
  }, [data.globalFont]);

  return (
    <div className="flex h-screen bg-gray-100" style={{ fontFamily: data.globalFont }}>
      <ControlsPanel
        data={data}
        onChange={handleDataChange}
        selectedElement={selectedElement}
        canvasRef={canvasRef}
      />
      
      <div className="flex-1 flex flex-col">
        <div className="p-4 bg-white border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800">Live Preview</h2>
          {selectedElement && (
            <div className="text-sm text-gray-600 mt-1">
              Selected: <span className="font-medium capitalize">{selectedElement}</span>
            </div>
          )}
        </div>
        
        <Canvas
          data={data}
          selectedElement={selectedElement}
          onSelectElement={setSelectedElement}
          onPositionChange={handlePositionChange}
          canvasRef={canvasRef}
        />
      </div>
    </div>
  );
}

export default App;