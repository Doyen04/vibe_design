// ============================================
// VIBE DESIGN - Keyboard Shortcuts Hook
// ============================================

import { useEffect, useCallback } from 'react';
import { useCanvasStore, useShapeStore, useSuggestionStore } from '../store';

export const useKeyboardShortcuts = () => {
  const setActiveTool = useCanvasStore((state) => state.setActiveTool);
  const setShowGrid = useCanvasStore((state) => state.setShowGrid);
  const showGrid = useCanvasStore((state) => state.showGrid);
  const setZoom = useCanvasStore((state) => state.setZoom);
  const zoom = useCanvasStore((state) => state.canvas.zoom);
  const resetView = useCanvasStore((state) => state.resetView);

  const selectedIds = useShapeStore((state) => state.selectedIds);
  const deleteSelectedShapes = useShapeStore((state) => state.deleteSelectedShapes);
  const selectAll = useShapeStore((state) => state.selectAll);
  const clearSelection = useShapeStore((state) => state.clearSelection);
  const undo = useShapeStore((state) => state.undo);
  const redo = useShapeStore((state) => state.redo);

  const suggestions = useSuggestionStore((state) => state.suggestions);
  const activeSuggestion = useSuggestionStore((state) => state.activeSuggestion);
  const setActiveSuggestion = useSuggestionStore((state) => state.setActiveSuggestion);
  const acceptSuggestion = useSuggestionStore((state) => state.acceptSuggestion);
  const rejectSuggestion = useSuggestionStore((state) => state.rejectSuggestion);

  const addShape = useShapeStore((state) => state.addShape);
  const nestShape = useShapeStore((state) => state.nestShape);

  const handleAcceptSuggestion = useCallback(() => {
    if (!activeSuggestion) return;
    
    const shapes = acceptSuggestion(activeSuggestion.id);
    if (shapes) {
      shapes.forEach((suggestedShape) => {
        const newShape = addShape({
          type: suggestedShape.type,
          x: suggestedShape.x,
          y: suggestedShape.y,
          width: suggestedShape.width,
          height: suggestedShape.height,
          label: suggestedShape.label,
          fill: suggestedShape.fill,
          stroke: suggestedShape.stroke,
        });

        if (suggestedShape.parentId) {
          nestShape(newShape.id, suggestedShape.parentId);
        }
      });
    }
  }, [activeSuggestion, acceptSuggestion, addShape, nestShape]);

  const handleNextSuggestion = useCallback(() => {
    if (suggestions.length === 0) return;
    
    const currentIndex = activeSuggestion
      ? suggestions.findIndex((s) => s.id === activeSuggestion.id)
      : -1;
    
    const nextIndex = (currentIndex + 1) % suggestions.length;
    setActiveSuggestion(suggestions[nextIndex]);
  }, [suggestions, activeSuggestion, setActiveSuggestion]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Ignore if typing in input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const key = e.key.toLowerCase();
      const isCtrl = e.ctrlKey || e.metaKey;

      // Tool shortcuts
      if (!isCtrl) {
        switch (key) {
          case 'v':
            setActiveTool('select');
            break;
          case 'r':
            setActiveTool('rect');
            break;
          case 'c':
            setActiveTool('circle');
            break;
          case 'h':
            setActiveTool('pan');
            break;
          case 'g':
            setShowGrid(!showGrid);
            break;
          case 'delete':
          case 'backspace':
            if (selectedIds.size > 0) {
              e.preventDefault();
              deleteSelectedShapes();
            }
            break;
          case 'escape':
            if (activeSuggestion) {
              rejectSuggestion(activeSuggestion.id);
            } else {
              clearSelection();
            }
            break;
          case 'enter':
            if (activeSuggestion) {
              e.preventDefault();
              handleAcceptSuggestion();
            }
            break;
          case 'tab':
            if (suggestions.length > 0) {
              e.preventDefault();
              handleNextSuggestion();
            }
            break;
          case '0':
            resetView();
            break;
          case '=':
          case '+':
            setZoom(zoom * 1.2);
            break;
          case '-':
            setZoom(zoom / 1.2);
            break;
        }
      }

      // Ctrl/Cmd shortcuts
      if (isCtrl) {
        switch (key) {
          case 'z':
            e.preventDefault();
            if (e.shiftKey) {
              redo();
            } else {
              undo();
            }
            break;
          case 'y':
            e.preventDefault();
            redo();
            break;
          case 'a':
            e.preventDefault();
            selectAll();
            break;
          case 'd':
            e.preventDefault();
            clearSelection();
            break;
        }
      }
    },
    [
      setActiveTool,
      setShowGrid,
      showGrid,
      selectedIds,
      deleteSelectedShapes,
      clearSelection,
      selectAll,
      undo,
      redo,
      zoom,
      setZoom,
      resetView,
      activeSuggestion,
      suggestions,
      rejectSuggestion,
      handleAcceptSuggestion,
      handleNextSuggestion,
    ]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
};
