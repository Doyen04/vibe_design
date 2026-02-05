// ============================================
// VIBE DESIGN - Canvas Store (Zustand)
// ============================================

import { create } from 'zustand';
import type { ToolType, CanvasState, SnapGuide } from '../types';

interface CanvasStoreState {
    // Tool state
    activeTool: ToolType;
    setActiveTool: (tool: ToolType) => void;

    // Canvas viewport
    canvas: CanvasState;
    setZoom: (zoom: number) => void;
    setPan: (x: number, y: number) => void;
    setCanvasSize: (width: number, height: number) => void;
    resetView: () => void;

    // Drawing state
    isDrawing: boolean;
    drawStartPoint: { x: number; y: number } | null;
    setIsDrawing: (isDrawing: boolean) => void;
    setDrawStartPoint: (point: { x: number; y: number } | null) => void;

    // Dragging state
    isDragging: boolean;
    setIsDragging: (isDragging: boolean) => void;

    // Resizing state
    isResizing: boolean;
    resizeHandle: string | null;
    setIsResizing: (isResizing: boolean, handle?: string | null) => void;

    // Snapping
    snapEnabled: boolean;
    snapThreshold: number;
    activeGuides: SnapGuide[];
    setSnapEnabled: (enabled: boolean) => void;
    setActiveGuides: (guides: SnapGuide[]) => void;

    // Grid
    showGrid: boolean;
    gridSize: number;
    setShowGrid: (show: boolean) => void;
    setGridSize: (size: number) => void;

    // Preview shape (while drawing)
    previewShape: {
        type: 'rect' | 'circle' | 'frame';
        x: number;
        y: number;
        width: number;
        height: number;
    } | null;
    setPreviewShape: (shape: CanvasStoreState['previewShape']) => void;
}

const DEFAULT_CANVAS: CanvasState = {
    zoom: 1,
    panX: 0,
    panY: 0,
    width: 1920,
    height: 1080,
};

export const useCanvasStore = create<CanvasStoreState>((set) => ({
    // Tool state
    activeTool: 'select',
    setActiveTool: (tool) => set({ activeTool: tool }),

    // Canvas viewport
    canvas: DEFAULT_CANVAS,
    setZoom: (zoom) =>
        set((state) => ({
            canvas: { ...state.canvas, zoom: Math.max(0.1, Math.min(5, zoom)) },
        })),
    setPan: (panX, panY) =>
        set((state) => ({
            canvas: { ...state.canvas, panX, panY },
        })),
    setCanvasSize: (width, height) =>
        set((state) => ({
            canvas: { ...state.canvas, width, height },
        })),
    resetView: () =>
        set((state) => ({
            canvas: { ...state.canvas, zoom: 1, panX: 0, panY: 0 },
        })),

    // Drawing state
    isDrawing: false,
    drawStartPoint: null,
    setIsDrawing: (isDrawing) => set({ isDrawing }),
    setDrawStartPoint: (drawStartPoint) => set({ drawStartPoint }),

    // Dragging state
    isDragging: false,
    setIsDragging: (isDragging) => set({ isDragging }),

    // Resizing state
    isResizing: false,
    resizeHandle: null,
    setIsResizing: (isResizing, handle = null) =>
        set({ isResizing, resizeHandle: handle }),

    // Snapping
    snapEnabled: true,
    snapThreshold: 8,
    activeGuides: [],
    setSnapEnabled: (snapEnabled) => set({ snapEnabled }),
    setActiveGuides: (activeGuides) => set({ activeGuides }),

    // Grid
    showGrid: true,
    gridSize: 20,
    setShowGrid: (showGrid) => set({ showGrid }),
    setGridSize: (gridSize) => set({ gridSize }),

    // Preview shape
    previewShape: null,
    setPreviewShape: (previewShape) => set({ previewShape }),
}));

// Utility function to convert screen coordinates to canvas coordinates
export const screenToCanvas = (
    screenX: number,
    screenY: number,
    canvas: CanvasState
): { x: number; y: number } => {
    return {
        x: (screenX - canvas.panX) / canvas.zoom,
        y: (screenY - canvas.panY) / canvas.zoom,
    };
};

// Utility function to convert canvas coordinates to screen coordinates
export const canvasToScreen = (
    canvasX: number,
    canvasY: number,
    canvas: CanvasState
): { x: number; y: number } => {
    return {
        x: canvasX * canvas.zoom + canvas.panX,
        y: canvasY * canvas.zoom + canvas.panY,
    };
};
