import { useState, useCallback, useRef } from 'react';
import { Position, DragState } from '../types';
import { calculateSnap, clampToCanvas } from '../utils/snapping';

interface UseDragResizeProps {
  position: Position;
  onPositionChange: (position: Position) => void;
  enabled: boolean;
  snapEnabled: boolean;
}

export function useDragResize({ 
  position, 
  onPositionChange, 
  enabled,
  snapEnabled 
}: UseDragResizeProps) {
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    isResizing: false,
    startPos: { x: 0, y: 0 },
    startRect: position,
    handle: null
  });

  const elementRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent, handle?: string) => {
    if (!enabled) return;
    
    e.preventDefault();
    e.stopPropagation();

    const rect = elementRef.current?.getBoundingClientRect();
    if (!rect) return;

    const startPos = { x: e.clientX, y: e.clientY };
    
    setDragState({
      isDragging: !handle,
      isResizing: !!handle,
      startPos,
      startRect: position,
      handle: handle || null
    });
  }, [enabled, position]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragState.isDragging && !dragState.isResizing) return;

    const deltaX = e.clientX - dragState.startPos.x;
    const deltaY = e.clientY - dragState.startPos.y;
    
    let newRect = { ...dragState.startRect };

    if (dragState.isDragging) {
      // Move element
      newRect.x = dragState.startRect.x + deltaX;
      newRect.y = dragState.startRect.y + deltaY;
    } else if (dragState.isResizing && dragState.handle) {
      // Resize element
      const handle = dragState.handle;
      const shiftPressed = e.shiftKey;
      
      if (handle.includes('right')) {
        newRect.width = Math.max(20, dragState.startRect.width + deltaX);
      }
      if (handle.includes('left')) {
        newRect.width = Math.max(20, dragState.startRect.width - deltaX);
        newRect.x = dragState.startRect.x + deltaX;
      }
      if (handle.includes('bottom')) {
        newRect.height = Math.max(20, dragState.startRect.height + deltaY);
      }
      if (handle.includes('top')) {
        newRect.height = Math.max(20, dragState.startRect.height - deltaY);
        newRect.y = dragState.startRect.y + deltaY;
      }

      // Maintain aspect ratio if Shift is pressed
      if (shiftPressed && (handle.includes('corner') || handle === 'top-left' || handle === 'top-right' || handle === 'bottom-left' || handle === 'bottom-right')) {
        const aspectRatio = dragState.startRect.width / dragState.startRect.height;
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          newRect.height = newRect.width / aspectRatio;
        } else {
          newRect.width = newRect.height * aspectRatio;
        }
      }
    }

    // Apply snapping if enabled and dragging
    if (snapEnabled && dragState.isDragging) {
      const snapInfo = calculateSnap(newRect);
      newRect.x = snapInfo.x;
      newRect.y = snapInfo.y;
    }

    // Clamp to canvas bounds
    newRect = clampToCanvas(newRect);
    
    onPositionChange(newRect);
  }, [dragState, snapEnabled, onPositionChange]);

  const handleMouseUp = useCallback(() => {
    setDragState({
      isDragging: false,
      isResizing: false,
      startPos: { x: 0, y: 0 },
      startRect: position,
      handle: null
    });
  }, [position]);

  // Keyboard movement
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!enabled) return;
    
    const moveAmount = e.shiftKey ? 10 : 1;
    let newRect = { ...position };
    
    switch (e.key) {
      case 'ArrowLeft':
        newRect.x = Math.max(0, position.x - moveAmount);
        break;
      case 'ArrowRight':
        newRect.x = Math.min(800 - position.width, position.x + moveAmount);
        break;
      case 'ArrowUp':
        newRect.y = Math.max(0, position.y - moveAmount);
        break;
      case 'ArrowDown':
        newRect.y = Math.min(1056 - position.height, position.y + moveAmount);
        break;
      default:
        return;
    }
    
    e.preventDefault();
    onPositionChange(newRect);
  }, [enabled, position, onPositionChange]);

  return {
    elementRef,
    dragState,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleKeyDown
  };
}