import React, { useEffect } from 'react';
import { Position, ElementType } from '../../types';
import { useDragResize } from '../../hooks/useDragResize';

interface DraggableElementProps {
  id: ElementType;
  position: Position;
  onPositionChange: (position: Position) => void;
  selected: boolean;
  onSelect: () => void;
  freeformEnabled: boolean;
  snapEnabled: boolean;
  children: React.ReactNode;
  className?: string;
  showResizeHandles?: boolean;
}

export function DraggableElement({
  id,
  position,
  onPositionChange,
  selected,
  onSelect,
  freeformEnabled,
  snapEnabled,
  children,
  className = '',
  showResizeHandles = true
}: DraggableElementProps) {
  const { elementRef, dragState, handleMouseDown, handleMouseMove, handleMouseUp, handleKeyDown } = useDragResize({
    position,
    onPositionChange,
    enabled: freeformEnabled,
    snapEnabled
  });

  useEffect(() => {
    if (dragState.isDragging || dragState.isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragState.isDragging, dragState.isResizing, handleMouseMove, handleMouseUp]);

  useEffect(() => {
    if (selected) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [selected, handleKeyDown]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect();
  };

  const resizeHandles = showResizeHandles && selected && freeformEnabled ? [
    'top-left', 'top-center', 'top-right',
    'middle-left', 'middle-right',
    'bottom-left', 'bottom-center', 'bottom-right'
  ] : [];

  return (
    <div
      ref={elementRef}
      className={`absolute ${className} ${selected ? 'ring-2 ring-blue-500 ring-opacity-50' : ''} ${freeformEnabled ? 'cursor-move' : 'cursor-default'}`}
      style={{
        left: position.x,
        top: position.y,
        width: position.width,
        height: position.height,
        zIndex: selected ? 10 : 1
      }}
      onMouseDown={freeformEnabled ? (e) => handleMouseDown(e) : undefined}
      onClick={handleClick}
      tabIndex={0}
    >
      {children}
      
      {resizeHandles.map((handle) => (
        <div
          key={handle}
          data-export-hide
          className={`absolute w-2 h-2 bg-blue-500 border border-white cursor-${getResizeCursor(handle)}`}
          style={getHandlePosition(handle)}
          onMouseDown={(e) => handleMouseDown(e, handle)}
        />
      ))}
    </div>
  );
}

function getHandlePosition(handle: string) {
  const positions: Record<string, React.CSSProperties> = {
    'top-left': { top: -4, left: -4 },
    'top-center': { top: -4, left: '50%', transform: 'translateX(-50%)' },
    'top-right': { top: -4, right: -4 },
    'middle-left': { top: '50%', left: -4, transform: 'translateY(-50%)' },
    'middle-right': { top: '50%', right: -4, transform: 'translateY(-50%)' },
    'bottom-left': { bottom: -4, left: -4 },
    'bottom-center': { bottom: -4, left: '50%', transform: 'translateX(-50%)' },
    'bottom-right': { bottom: -4, right: -4 }
  };
  return positions[handle] || {};
}

function getResizeCursor(handle: string): string {
  const cursors: Record<string, string> = {
    'top-left': 'nw-resize',
    'top-center': 'n-resize',
    'top-right': 'ne-resize',
    'middle-left': 'w-resize',
    'middle-right': 'e-resize',
    'bottom-left': 'sw-resize',
    'bottom-center': 's-resize',
    'bottom-right': 'se-resize'
  };
  return cursors[handle] || 'default';
}