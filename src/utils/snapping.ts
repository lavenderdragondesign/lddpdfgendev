import { Position } from '../types';
import { CANVAS_SIZE, SAFE_AREA, SNAP_TOLERANCE } from './constants';

export interface SnapInfo {
  x: number;
  y: number;
  snapped: boolean;
  snapLines: { type: 'vertical' | 'horizontal'; position: number }[];
}

export function calculateSnap(rect: Position): SnapInfo {
  let snappedX = rect.x;
  let snappedY = rect.y;
  let snapped = false;
  const snapLines: { type: 'vertical' | 'horizontal'; position: number }[] = [];

  // Safe area bounds
  const safeLeft = SAFE_AREA.left;
  const safeRight = CANVAS_SIZE.width - SAFE_AREA.right;
  const safeTop = SAFE_AREA.top;
  const safeBottom = CANVAS_SIZE.height - SAFE_AREA.bottom;
  
  // Canvas centers
  const centerX = CANVAS_SIZE.width / 2;
  const centerY = CANVAS_SIZE.height / 2;

  // Snap to left edge
  if (Math.abs(rect.x - safeLeft) < SNAP_TOLERANCE) {
    snappedX = safeLeft;
    snapped = true;
    snapLines.push({ type: 'vertical', position: safeLeft });
  }
  
  // Snap to right edge
  else if (Math.abs((rect.x + rect.width) - safeRight) < SNAP_TOLERANCE) {
    snappedX = safeRight - rect.width;
    snapped = true;
    snapLines.push({ type: 'vertical', position: safeRight });
  }
  
  // Snap to center X
  else if (Math.abs((rect.x + rect.width / 2) - centerX) < SNAP_TOLERANCE) {
    snappedX = centerX - rect.width / 2;
    snapped = true;
    snapLines.push({ type: 'vertical', position: centerX });
  }

  // Snap to top edge
  if (Math.abs(rect.y - safeTop) < SNAP_TOLERANCE) {
    snappedY = safeTop;
    snapped = true;
    snapLines.push({ type: 'horizontal', position: safeTop });
  }
  
  // Snap to bottom edge
  else if (Math.abs((rect.y + rect.height) - safeBottom) < SNAP_TOLERANCE) {
    snappedY = safeBottom - rect.height;
    snapped = true;
    snapLines.push({ type: 'horizontal', position: safeBottom });
  }
  
  // Snap to center Y
  else if (Math.abs((rect.y + rect.height / 2) - centerY) < SNAP_TOLERANCE) {
    snappedY = centerY - rect.height / 2;
    snapped = true;
    snapLines.push({ type: 'horizontal', position: centerY });
  }

  return {
    x: snappedX,
    y: snappedY,
    snapped,
    snapLines
  };
}

export function clampToCanvas(rect: Position): Position {
  return {
    x: Math.max(0, Math.min(rect.x, CANVAS_SIZE.width - rect.width)),
    y: Math.max(0, Math.min(rect.y, CANVAS_SIZE.height - rect.height)),
    width: Math.max(20, Math.min(rect.width, CANVAS_SIZE.width - rect.x)),
    height: Math.max(20, Math.min(rect.height, CANVAS_SIZE.height - rect.y))
  };
}