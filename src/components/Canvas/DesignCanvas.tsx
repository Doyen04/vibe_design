// ============================================
// VIBE DESIGN - Main Design Canvas
// Core canvas component with all interactions
// ============================================

import React, { useCallback, useRef, useEffect, useMemo } from 'react';
import { Stage, Layer, Rect } from 'react-konva';
import type Konva from 'konva';
import { debounce } from 'lodash';

import { useShapeStore, useCanvasStore, useSuggestionStore } from '../../store';
import { suggestionEngine, snapEngine, hierarchyManager } from '../../engine';
import type { Shape, ShapeCreateInput } from '../../types';

import ShapeRenderer from './ShapeRenderer';
import GhostShapeRenderer from './GhostShapeRenderer';
import SnapGuidesRenderer from './SnapGuidesRenderer';
import GridRenderer from './GridRenderer';

interface DesignCanvasProps {
  width: number;
  height: number;
}

const DesignCanvas: React.FC<DesignCanvasProps> = ({ width, height }) => {
  const stageRef = useRef<Konva.Stage>(null);

  // Shape store
  const shapes = useShapeStore((state) => state.shapes);
  const shapeOrder = useShapeStore((state) => state.shapeOrder);
  const selectedIds = useShapeStore((state) => state.selectedIds);
  const hoveredId = useShapeStore((state) => state.hoveredId);
  const addShape = useShapeStore((state) => state.addShape);
  const updateShape = useShapeStore((state) => state.updateShape);
  const selectShape = useShapeStore((state) => state.selectShape);
  const clearSelection = useShapeStore((state) => state.clearSelection);
  const batchUpdate = useShapeStore((state) => state.batchUpdate);
  const nestShape = useShapeStore((state) => state.nestShape);

  // Canvas store
  const activeTool = useCanvasStore((state) => state.activeTool);
  const canvas = useCanvasStore((state) => state.canvas);
  const isDrawing = useCanvasStore((state) => state.isDrawing);
  const drawStartPoint = useCanvasStore((state) => state.drawStartPoint);
  const previewShape = useCanvasStore((state) => state.previewShape);
  const showGrid = useCanvasStore((state) => state.showGrid);
  const gridSize = useCanvasStore((state) => state.gridSize);
  const activeGuides = useCanvasStore((state) => state.activeGuides);
  const setIsDrawing = useCanvasStore((state) => state.setIsDrawing);
  const setDrawStartPoint = useCanvasStore((state) => state.setDrawStartPoint);
  const setPreviewShape = useCanvasStore((state) => state.setPreviewShape);
  const setActiveGuides = useCanvasStore((state) => state.setActiveGuides);
  const setZoom = useCanvasStore((state) => state.setZoom);
  const setPan = useCanvasStore((state) => state.setPan);

  // Suggestion store
  const suggestionsEnabled = useSuggestionStore(
    (state) => state.suggestionsEnabled
  );
  const ghostShapes = useSuggestionStore((state) => state.ghostShapes);
  const setSuggestions = useSuggestionStore((state) => state.setSuggestions);

  // Get shapes array for rendering
  const shapesArray = useMemo(() => {
    return shapeOrder
      .map((id) => shapes.get(id))
      .filter(Boolean) as Shape[];
  }, [shapes, shapeOrder]);

  // Debounced suggestion generation
  const generateSuggestions = useMemo(
    () =>
      debounce(() => {
        if (!suggestionsEnabled) return;

        const allShapes = Array.from(shapes.values());
        const selectedShapeIds = Array.from(selectedIds);

        const suggestions = suggestionEngine.generateSuggestions({
          allShapes,
          selectedShapeIds,
          recentActions: [],
          canvasSize: { width: canvas.width, height: canvas.height },
          zoomLevel: canvas.zoom,
        });

        setSuggestions(suggestions);
      }, 300),
    [shapes, selectedIds, suggestionsEnabled, canvas, setSuggestions]
  );

  // Generate suggestions when shapes change
  useEffect(() => {
    generateSuggestions();
    return () => generateSuggestions.cancel();
  }, [shapes, selectedIds, generateSuggestions]);

  // Get pointer position relative to canvas
  const getPointerPosition = useCallback((): { x: number; y: number } | null => {
    const stage = stageRef.current;
    if (!stage) return null;

    const pointerPos = stage.getPointerPosition();
    if (!pointerPos) return null;

    return {
      x: (pointerPos.x - canvas.panX) / canvas.zoom,
      y: (pointerPos.y - canvas.panY) / canvas.zoom,
    };
  }, [canvas.panX, canvas.panY, canvas.zoom]);

  // Handle mouse down
  const handleMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      const pos = getPointerPosition();
      if (!pos) return;

      // If clicking on empty space with select tool, clear selection
      if (activeTool === 'select' && e.target === e.target.getStage()) {
        clearSelection();
        return;
      }

      // Start drawing with rect or circle tool
      if (activeTool === 'rect' || activeTool === 'circle') {
        setIsDrawing(true);
        setDrawStartPoint(pos);
        setPreviewShape({
          type: activeTool,
          x: pos.x,
          y: pos.y,
          width: 0,
          height: 0,
        });
      }

      // Pan with pan tool or middle mouse button
      if (activeTool === 'pan' || e.evt.button === 1) {
        // Pan is handled by stage drag
      }
    },
    [
      activeTool,
      getPointerPosition,
      clearSelection,
      setIsDrawing,
      setDrawStartPoint,
      setPreviewShape,
    ]
  );

  // Handle mouse move
  const handleMouseMove = useCallback(
    () => {
      const pos = getPointerPosition();
      if (!pos) return;

      // Update preview shape while drawing
      if (isDrawing && drawStartPoint) {
        const x = Math.min(pos.x, drawStartPoint.x);
        const y = Math.min(pos.y, drawStartPoint.y);
        const width = Math.abs(pos.x - drawStartPoint.x);
        const height = Math.abs(pos.y - drawStartPoint.y);

        setPreviewShape({
          type: activeTool as 'rect' | 'circle',
          x,
          y,
          width,
          height,
        });
      }
    },
    [isDrawing, drawStartPoint, activeTool, getPointerPosition, setPreviewShape]
  );

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    if (isDrawing && previewShape && previewShape.width > 5 && previewShape.height > 5) {
      // Create the shape
      const input: ShapeCreateInput = {
        type: previewShape.type,
        x: previewShape.x,
        y: previewShape.y,
        width: previewShape.width,
        height: previewShape.height,
      };

      // Check if shape should be nested
      const allShapes = Array.from(shapes.values());
      const potentialParent = snapEngine.findPotentialParent(
        { ...input, id: 'temp' } as Shape,
        allShapes
      );

      if (potentialParent) {
        input.parentId = potentialParent.id;
      }

      const newShape = addShape(input);
      selectShape(newShape.id, false);
    }

    setIsDrawing(false);
    setDrawStartPoint(null);
    setPreviewShape(null);
  }, [
    isDrawing,
    previewShape,
    shapes,
    addShape,
    selectShape,
    setIsDrawing,
    setDrawStartPoint,
    setPreviewShape,
  ]);

  // Handle wheel for zoom
  const handleWheel = useCallback(
    (e: Konva.KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault();

      const stage = stageRef.current;
      if (!stage) return;

      const oldScale = canvas.zoom;
      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      const mousePointTo = {
        x: (pointer.x - canvas.panX) / oldScale,
        y: (pointer.y - canvas.panY) / oldScale,
      };

      const direction = e.evt.deltaY > 0 ? -1 : 1;
      const newScale = direction > 0 ? oldScale * 1.1 : oldScale / 1.1;
      const clampedScale = Math.max(0.1, Math.min(5, newScale));

      setZoom(clampedScale);
      setPan(
        pointer.x - mousePointTo.x * clampedScale,
        pointer.y - mousePointTo.y * clampedScale
      );
    },
    [canvas.zoom, canvas.panX, canvas.panY, setZoom, setPan]
  );

  // Shape interaction handlers
  const handleShapeSelect = useCallback(
    (id: string, addToSelection: boolean) => {
      selectShape(id, addToSelection);
    },
    [selectShape]
  );

  const handleShapeDragStart = useCallback(
    (id: string) => {
      if (!selectedIds.has(id)) {
        selectShape(id, false);
      }
    },
    [selectedIds, selectShape]
  );

  const handleShapeDragMove = useCallback(
    (id: string, x: number, y: number) => {
      const shape = shapes.get(id);
      if (!shape) return;

      // Calculate snap
      const otherShapes = Array.from(shapes.values()).filter((s) => s.id !== id);
      const snapResult = snapEngine.snapShape(
        shape,
        x,
        y,
        otherShapes,
        canvas.width,
        canvas.height
      );

      setActiveGuides(snapResult.guides);

      // Update shape and its descendants
      const deltaX = snapResult.snappedX - shape.x;
      const deltaY = snapResult.snappedY - shape.y;

      const descendantUpdates = hierarchyManager.getDescendantUpdates(
        id,
        deltaX,
        deltaY,
        shapes
      );

      batchUpdate([
        { id, changes: { x: snapResult.snappedX, y: snapResult.snappedY } },
        ...descendantUpdates.map((u: { id: string; x: number; y: number }) => ({
          id: u.id,
          changes: { x: u.x, y: u.y },
        })),
      ]);
    },
    [shapes, canvas.width, canvas.height, setActiveGuides, batchUpdate]
  );

  const handleShapeDragEnd = useCallback(
    (id: string) => {
      setActiveGuides([]);

      // Check if shape should be nested in a new parent
      const shape = shapes.get(id);
      if (!shape) return;

      const allShapes = Array.from(shapes.values());
      const potentialParent = snapEngine.findPotentialParent(shape, allShapes);

      if (potentialParent && potentialParent.id !== shape.parentId) {
        nestShape(id, potentialParent.id);
      }
    },
    [shapes, setActiveGuides, nestShape]
  );

  const handleTransformEnd = useCallback(
    (id: string, node: Konva.Node) => {
      const scaleX = node.scaleX();
      const scaleY = node.scaleY();

      // Reset scale and apply to width/height
      node.scaleX(1);
      node.scaleY(1);

      const shape = shapes.get(id);
      if (!shape) return;

      updateShape(id, {
        x: node.x(),
        y: node.y(),
        width: Math.max(10, shape.width * scaleX),
        height: Math.max(10, shape.height * scaleY),
        rotation: node.rotation(),
      });
    },
    [shapes, updateShape]
  );

  return (
    <Stage
      ref={stageRef}
      width={width}
      height={height}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      scaleX={canvas.zoom}
      scaleY={canvas.zoom}
      x={canvas.panX}
      y={canvas.panY}
      draggable={activeTool === 'pan'}
      onDragEnd={(e) => {
        setPan(e.target.x(), e.target.y());
      }}
      style={{ backgroundColor: '#F5F5F5' }}
    >
      <Layer>
        {/* Canvas background */}
        <Rect
          x={0}
          y={0}
          width={canvas.width}
          height={canvas.height}
          fill="#FFFFFF"
          shadowColor="#000000"
          shadowBlur={20}
          shadowOpacity={0.1}
          shadowOffsetX={0}
          shadowOffsetY={4}
          listening={false}
        />

        {/* Grid */}
        <GridRenderer
          width={canvas.width}
          height={canvas.height}
          gridSize={gridSize}
          visible={showGrid}
        />

        {/* Shapes */}
        {shapesArray.map((shape) => (
          <ShapeRenderer
            key={shape.id}
            shape={shape}
            isSelected={selectedIds.has(shape.id)}
            isHovered={hoveredId === shape.id}
            onSelect={handleShapeSelect}
            onDragStart={handleShapeDragStart}
            onDragMove={handleShapeDragMove}
            onDragEnd={handleShapeDragEnd}
            onTransformEnd={handleTransformEnd}
          />
        ))}

        {/* Ghost shapes (suggestions) */}
        {ghostShapes.map((shape, index) => (
          <GhostShapeRenderer key={`ghost-${index}`} shape={shape} />
        ))}

        {/* Preview shape while drawing */}
        {previewShape && (
          <GhostShapeRenderer
            shape={{
              ...previewShape,
              label: 'unknown',
              parentId: null,
            }}
          />
        )}

        {/* Snap guides */}
        <SnapGuidesRenderer guides={activeGuides} />
      </Layer>
    </Stage>
  );
};

export default DesignCanvas;
