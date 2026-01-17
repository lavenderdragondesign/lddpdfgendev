import React, { useRef } from 'react';
import { ElementType, PresetData, Position } from '../../types';
import { CANVAS_SIZE, SAFE_AREA } from '../../utils/constants';
import { DraggableElement } from './DraggableElement';
import { CanvasElement } from './CanvasElement';

interface CanvasProps {
  data: PresetData;
  selectedElement: ElementType | null;
  onSelectElement: (element: ElementType | null) => void;
  onPositionChange: (element: ElementType, position: Position) => void;
  canvasRef: React.RefObject<HTMLDivElement>;
}

export function Canvas({ data, selectedElement, onSelectElement, onPositionChange, canvasRef }: CanvasProps) {
  // Only deselect when the user clicks the *empty* canvas background.
  // (Clicks on elements already stopPropagation in DraggableElement.)
  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // If the click originated from a child element (or UI overlay), ignore it.
    if (e.target !== e.currentTarget) return;
    onSelectElement(null);
  };

  const renderWatermark = () => {
    if (!data.watermarkUrl) return null;

    return (
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        style={{
          opacity: data.watermarkOpacity / 100,
          transform: `scale(${data.watermarkScale / 100}) rotate(${data.watermarkRotate}deg)`,
          filter: 'grayscale(100%)'
        }}
      >
        <img
          src={data.watermarkUrl}
          alt="Watermark"
          className="max-w-full max-h-full object-contain"
          crossOrigin="anonymous"
        />
      </div>
    );
  };

  const renderSafeArea = () => {
    if (!data.guidesEnabled) return null;

    return (
      <div
        className="absolute border-2 border-dashed border-blue-300 pointer-events-none"
        data-ui-only
        style={{
          left: SAFE_AREA.left,
          top: SAFE_AREA.top,
          width: CANVAS_SIZE.width - SAFE_AREA.left - SAFE_AREA.right,
          height: CANVAS_SIZE.height - SAFE_AREA.top - SAFE_AREA.bottom
        }}
      />
    );
  };

  const renderBleedMarks = () => {
    if (data.bleed === 0) return null;

    const markLength = 18;
    const offset = (data.bleed / 8) * 72; // Convert to screen pixels approximation

    return (
      <div className="absolute inset-0 pointer-events-none" data-ui-only>
        {/* Corner crop marks */}
        <div className="absolute" style={{ left: offset, top: offset }}>
          <div className="w-4 h-px bg-black absolute -left-4 top-0" />
          <div className="w-px h-4 bg-black absolute left-0 -top-4" />
        </div>
        <div className="absolute" style={{ right: offset, top: offset }}>
          <div className="w-4 h-px bg-black absolute right-0 top-0" />
          <div className="w-px h-4 bg-black absolute right-0 -top-4" />
        </div>
        <div className="absolute" style={{ left: offset, bottom: offset }}>
          <div className="w-4 h-px bg-black absolute -left-4 bottom-0" />
          <div className="w-px h-4 bg-black absolute left-0 bottom-0" />
        </div>
        <div className="absolute" style={{ right: offset, bottom: offset }}>
          <div className="w-4 h-px bg-black absolute right-0 bottom-0" />
          <div className="w-px h-4 bg-black absolute right-0 bottom-0" />
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
      <div
        ref={canvasRef}
        className="relative bg-white shadow-lg"
        style={{
          width: CANVAS_SIZE.width,
          height: CANVAS_SIZE.height,
          backgroundColor: data.backgroundColor
        }}
        onClick={handleCanvasClick}
      >
        {renderWatermark()}
        {renderSafeArea()}
        {renderBleedMarks()}

        {/* Logo */}
        <DraggableElement
          id="logo"
          position={data.positions.logo}
          onPositionChange={(pos) => onPositionChange('logo', pos)}
          selected={selectedElement === 'logo'}
          onSelect={() => onSelectElement('logo')}
          freeformEnabled={data.freeformMode}
          snapEnabled={data.snapEnabled}
        >
          <CanvasElement type="logo" position={data.positions.logo} data={data} />
        </DraggableElement>

        {/* Title Block */}
        <DraggableElement
          id="title"
          position={data.positions.title}
          onPositionChange={(pos) => onPositionChange('title', pos)}
          selected={selectedElement === 'title'}
          onSelect={() => onSelectElement('title')}
          freeformEnabled={data.freeformMode}
          snapEnabled={data.snapEnabled}
        >
          <CanvasElement type="title" position={data.positions.title} data={data} />
        </DraggableElement>

        {/* Download Button */}
        <DraggableElement
          id="button"
          position={data.positions.button}
          onPositionChange={(pos) => onPositionChange('button', pos)}
          selected={selectedElement === 'button'}
          onSelect={() => onSelectElement('button')}
          freeformEnabled={data.freeformMode}
          snapEnabled={data.snapEnabled}
        >
          <CanvasElement type="button" position={data.positions.button} data={data} />
        </DraggableElement>

        {/* Primary QR */}
        {data.primaryQREnabled && (
          <DraggableElement
            id="qr"
            position={data.positions.qr}
            onPositionChange={(pos) => onPositionChange('qr', pos)}
            selected={selectedElement === 'qr'}
            onSelect={() => onSelectElement('qr')}
            freeformEnabled={data.freeformMode}
            snapEnabled={data.snapEnabled}
          >
            <CanvasElement type="qr" position={data.positions.qr} data={data} />
          </DraggableElement>
        )}

        {/* Promo Box */}
        {data.promoEnabled && (
          <DraggableElement
            id="promo"
            position={data.positions.promo}
            onPositionChange={(pos) => onPositionChange('promo', pos)}
            selected={selectedElement === 'promo'}
            onSelect={() => onSelectElement('promo')}
            freeformEnabled={data.freeformMode}
            snapEnabled={data.snapEnabled}
          >
            <CanvasElement type="promo" position={data.positions.promo} data={data} />
          </DraggableElement>
        )}

        {/* Social Icons */}
        <DraggableElement
          id="socials"
          position={data.positions.socials}
          onPositionChange={(pos) => onPositionChange('socials', pos)}
          selected={selectedElement === 'socials'}
          onSelect={() => onSelectElement('socials')}
          freeformEnabled={data.freeformMode}
          snapEnabled={data.snapEnabled}
        >
          <CanvasElement type="socials" position={data.positions.socials} data={data} />
        </DraggableElement>

        {/* Footer */}
        <DraggableElement
          id="footer"
          position={data.positions.footer}
          onPositionChange={(pos) => onPositionChange('footer', pos)}
          selected={selectedElement === 'footer'}
          onSelect={() => onSelectElement('footer')}
          freeformEnabled={data.freeformMode}
          snapEnabled={data.snapEnabled}
        >
          <CanvasElement type="footer" position={data.positions.footer} data={data} />
        </DraggableElement>
      </div>
    </div>
  );
}