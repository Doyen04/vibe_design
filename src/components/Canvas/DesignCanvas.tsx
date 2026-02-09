// ============================================
// VIBE DESIGN - Main Design Canvas
// Core canvas component with all interactions
// ============================================

import React, { useCallback, useRef, useEffect, useMemo } from 'react';
import { Stage, Layer } from 'react-konva';
import type Konva from 'konva';
import { debounce } from 'lodash';

import { useShapeStore, useCanvasStore, useSuggestionStore } from '../../store';
import { suggestionEngine, snapEngine, calculateChildPositions } from '../../engine';
import type { Shape, ShapeCreateInput, Suggestion } from '../../types';

import ShapeRenderer from './ShapeRenderer';
import GhostShapeRenderer from './GhostShapeRenderer';
import SnapGuidesRenderer from './SnapGuidesRenderer';
import InfiniteCanvasBackground from './InfiniteCanvasBackground';

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
    const selectShape = useShapeStore((state) => state.selectShape);
    const clearSelection = useShapeStore((state) => state.clearSelection);
    const batchUpdate = useShapeStore((state) => state.batchUpdate);
    const nestShape = useShapeStore((state) => state.nestShape);
    const reorderChildInParent = useShapeStore((state) => state.reorderChildInParent);

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
    const setZoomAtPoint = useCanvasStore((state) => state.setZoomAtPoint);
    const setPan = useCanvasStore((state) => state.setPan);

    // Suggestion store
    const suggestionsEnabled = useSuggestionStore(
        (state) => state.suggestionsEnabled
    );
    const ghostShapes = useSuggestionStore((state) => state.ghostShapes);
    const activeSuggestion = useSuggestionStore((state) => state.activeSuggestion);
    const setSuggestions = useSuggestionStore((state) => state.setSuggestions);
    const acceptSuggestion = useSuggestionStore((state) => state.acceptSuggestion);
    const rejectSuggestion = useSuggestionStore((state) => state.rejectSuggestion);
    const isPositionUsed = useSuggestionStore((state) => state.isPositionUsed);
    const markPositionUsed = useSuggestionStore((state) => state.markPositionUsed);
    const markPositionRejected = useSuggestionStore((state) => state.markPositionRejected);
    const llmEnabled = useSuggestionStore((state) => state.llmEnabled);
    const setLlmLoading = useSuggestionStore((state) => state.setLlmLoading);

    // Get only ROOT shapes for rendering (shapes without parents)
    // Children are rendered recursively inside their parent's Group by ShapeRenderer
    const rootShapes = useMemo(() => {
        return shapeOrder
            .map((id) => shapes.get(id))
            .filter((shape): shape is Shape => shape != null && shape.parentId === null);
    }, [shapes, shapeOrder]);

    // Generate suggestions (can be called with optional preview shape for real-time updates)
    const generateSuggestionsWithPreview = useCallback(
        async (previewShapeData?: { type: 'rect' | 'circle'; x: number; y: number; width: number; height: number }) => {
            console.log('running ');

            if (!suggestionsEnabled) {
                return;
            }

            console.log('[Suggestions] Generating...', { llmEnabled, shapesCount: shapes.size });

            const allShapes = Array.from(shapes.values());
            const selectedShapeIds = Array.from(selectedIds);

            // Include preview shape if drawing
            if (previewShapeData && previewShapeData.width > 20 && previewShapeData.height > 20) {
                const tempShape: Shape = {
                    id: 'preview-temp',
                    type: previewShapeData.type,
                    x: previewShapeData.x,
                    y: previewShapeData.y,
                    width: previewShapeData.width,
                    height: previewShapeData.height,
                    rotation: 0,
                    fill: '#E0E0E0',
                    stroke: '#9E9E9E',
                    strokeWidth: 1,
                    opacity: 1,
                    visible: true,
                    locked: false,
                    name: 'Preview',
                    label: 'unknown',
                    parentId: null,
                    children: [],
                    zIndex: allShapes.length,
                };
                allShapes.push(tempShape);
            }

            let suggestions: Suggestion[] = [];

            // Use Gemini AI if enabled, otherwise use heuristic engine
            if (llmEnabled) {
                try {
                    setLlmLoading(true);
                    const { generateGeminiSuggestions, isGeminiInitialized } = await import('../../engine/GeminiSuggestionEngine');

                    if (isGeminiInitialized()) {
                        const result = await generateGeminiSuggestions(
                            allShapes,
                            selectedShapeIds,
                            canvas.width,
                            canvas.height
                        );
                        suggestions = result.suggestions || [];

                        if (result.error) {
                            console.warn('[Gemini]', result.error);
                        }
                    } else {
                        // Fallback to heuristic engine
                        console.warn('[Gemini] Not initialized, falling back to heuristic engine');
                        suggestions = suggestionEngine.generateSuggestions(
                            allShapes,
                            selectedShapeIds,
                            canvas.width,
                            canvas.height
                        );
                    }
                } catch (error) {
                    console.error('[Gemini] Error:', error);
                    // Fallback to heuristic
                    suggestions = suggestionEngine.generateSuggestions(
                        allShapes,
                        selectedShapeIds,
                        canvas.width,
                        canvas.height
                    );
                } finally {
                    setLlmLoading(false);
                }
            } else {
                // Use heuristic engine
                suggestions = suggestionEngine.generateSuggestions(
                    allShapes,
                    selectedShapeIds,
                    canvas.width,
                    canvas.height
                );
            }

            console.log('[Suggestions] Generated:', suggestions.length);

            // Filter out suggestions at used/rejected positions
            suggestions = suggestions
                .map(suggestion => ({
                    ...suggestion,
                    shapes: suggestion.shapes.filter(shape =>
                        !isPositionUsed(shape.x, shape.y, shape.width, shape.height)
                    )
                }))
                .filter(suggestion => suggestion.shapes.length > 0);

            console.log('[Suggestions] After filtering:', suggestions.length);
            setSuggestions(suggestions);
        },
        [shapes, selectedIds, suggestionsEnabled, canvas, setSuggestions, isPositionUsed, llmEnabled, setLlmLoading]
    );

    // Use ref to keep stable reference to the callback
    const generateSuggestionsRef = useRef(generateSuggestionsWithPreview);
    useEffect(() => {
        generateSuggestionsRef.current = generateSuggestionsWithPreview;
    }, [generateSuggestionsWithPreview]);

    // Debounced suggestion generation - only called on completed layout events
    const generateSuggestions = useMemo(
        () => {
            console.log('memo running');
            return debounce(() => generateSuggestionsRef.current(), llmEnabled ? 800 : 200);
        },
        [llmEnabled]
    );

    // Cleanup debounce on unmount
    useEffect(() => {
        return () => generateSuggestions.cancel();
    }, [generateSuggestions]);

    // Handle clicking on a ghost shape to accept the suggestion
    const handleGhostShapeAccept = useCallback(
        () => {
            if (!activeSuggestion) return;

            // Accept the current suggestion
            const shapesToAdd = acceptSuggestion(activeSuggestion.id);
            if (!shapesToAdd) return;

            // Mark positions as used and add shapes
            shapesToAdd.forEach((suggestedShape) => {
                markPositionUsed(suggestedShape.x, suggestedShape.y, suggestedShape.width, suggestedShape.height);
                const input: ShapeCreateInput = {
                    type: suggestedShape.type,
                    x: suggestedShape.x,
                    y: suggestedShape.y,
                    width: suggestedShape.width,
                    height: suggestedShape.height,
                    parentId: suggestedShape.parentId,
                    fill: suggestedShape.fill,
                    stroke: suggestedShape.stroke,
                };
                addShape(input);
            });
        },
        [activeSuggestion, acceptSuggestion, addShape, markPositionUsed]
    );

    // Handle clicking on a ghost shape to reject the suggestion
    const handleGhostShapeReject = useCallback(
        () => {
            if (!activeSuggestion) return;

            // Mark all positions from this suggestion as rejected
            activeSuggestion.shapes.forEach((shape) => {
                markPositionRejected(shape.x, shape.y, shape.width, shape.height);
            });

            // Reject the suggestion
            rejectSuggestion(activeSuggestion.id);
        },
        [activeSuggestion, rejectSuggestion, markPositionRejected]
    );

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

            // Start drawing with rect, circle, or frame tool
            if (activeTool === 'rect' || activeTool === 'circle' || activeTool === 'frame') {
                setIsDrawing(true);
                setDrawStartPoint(pos);
                setPreviewShape({
                    type: activeTool as 'rect' | 'circle' | 'frame',
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

    // Handle mouse move - NO AI calls during movement
    const handleMouseMove = useCallback(
        () => {
            const pos = getPointerPosition();
            if (!pos) return;

            // Update preview shape while drawing (visual only, no AI)
            if (isDrawing && drawStartPoint) {
                const x = Math.min(pos.x, drawStartPoint.x);
                const y = Math.min(pos.y, drawStartPoint.y);
                const width = Math.abs(pos.x - drawStartPoint.x);
                const height = Math.abs(pos.y - drawStartPoint.y);

                setPreviewShape({
                    type: activeTool as 'rect' | 'circle' | 'frame',
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
            console.log('mouse up');


            // Trigger AI suggestions after shape creation complete
            generateSuggestions();
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
        generateSuggestions,
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

            // Atomic update of zoom and pan to prevent shapes from jumping
            const newPanX = pointer.x - mousePointTo.x * clampedScale;
            const newPanY = pointer.y - mousePointTo.y * clampedScale;
            setZoomAtPoint(clampedScale, newPanX, newPanY);
        },
        [canvas.zoom, canvas.panX, canvas.panY, setZoomAtPoint]
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
            // x, y are already in the correct coordinate space (relative to parent)
            // Because Konva Groups handle transforms, we just need to update the shape's position

            const currentShapes = useShapeStore.getState().shapes;
            const shape = currentShapes.get(id);
            if (!shape) return;

            // For snapping, we need to work in world coordinates
            // If shape has a parent, convert to world coordinates for snap calculation
            let worldX = x;
            let worldY = y;

            if (shape.parentId) {
                const parent = currentShapes.get(shape.parentId);
                if (parent) {
                    // Convert local to world (simplified - doesn't account for rotation)
                    // For full rotation support, use hierarchyManager.localToWorld
                    worldX = parent.x + x;
                    worldY = parent.y + y;
                }
            }

            // Calculate snap in world coordinates
            // Exclude the shape itself AND its parent (to prevent snapping to parent edges)
            const otherShapes = Array.from(currentShapes.values()).filter(
                (s) => s.id !== id && s.id !== shape.parentId
            );
            const snapResult = snapEngine.snapShape(
                { ...shape, x: worldX, y: worldY },
                worldX,
                worldY,
                otherShapes,
                canvas.width,
                canvas.height
            );

            setActiveGuides(snapResult.guides);

            // Convert snapped position back to local coordinates if needed
            let finalX = snapResult.snappedX;
            let finalY = snapResult.snappedY;

            if (shape.parentId) {
                const parent = currentShapes.get(shape.parentId);
                if (parent) {
                    finalX = snapResult.snappedX - parent.x;
                    finalY = snapResult.snappedY - parent.y;
                }
            }

            // With relative coordinates, we only need to update this shape
            // Children automatically move with parent because they're rendered inside parent's Group
            batchUpdate([{ id, changes: { x: finalX, y: finalY } }]);
        },
        [canvas.width, canvas.height, setActiveGuides, batchUpdate]
    );

    const handleShapeDragEnd = useCallback(
        (id: string, mouseX: number, mouseY: number) => {
            setActiveGuides([]);

            // Always read fresh state to avoid stale closures
            const currentShapes = useShapeStore.getState().shapes;
            const unnestShape = useShapeStore.getState().unnestShape;

            // Get the shape being dragged
            const shape = currentShapes.get(id);
            if (!shape) return;

            // Calculate shape's world position for containment checks
            let shapeWorldX = shape.x;
            let shapeWorldY = shape.y;
            if (shape.parentId) {
                const currentParent = currentShapes.get(shape.parentId);
                if (currentParent) {
                    shapeWorldX = currentParent.x + shape.x;
                    shapeWorldY = currentParent.y + shape.y;
                }
            }

            // Create a temporary shape with world coordinates for parent finding
            const shapeInWorldCoords: Shape = {
                ...shape,
                x: shapeWorldX,
                y: shapeWorldY,
            };

            const allShapes = Array.from(currentShapes.values());
            const potentialParent = snapEngine.findPotentialParent(shapeInWorldCoords, allShapes);

            // Check if shape was dragged completely outside its current parent
            if (shape.parentId) {
                const currentParent = currentShapes.get(shape.parentId);
                if (currentParent) {
                    const isInsideCurrentParent =
                        shapeWorldX >= currentParent.x &&
                        shapeWorldY >= currentParent.y &&
                        shapeWorldX + shape.width <= currentParent.x + currentParent.width &&
                        shapeWorldY + shape.height <= currentParent.y + currentParent.height;

                    if (!isInsideCurrentParent) {
                        // Shape was dragged out of its current parent
                        // First, update the old parent's layout if it has one
                        const oldParentHasLayout = currentParent.layout && currentParent.layout.mode !== 'free';

                        if (!potentialParent) {
                            // Shape is outside all frames - make it a root shape
                            unnestShape(id);

                            // Update old parent's remaining children layout if needed
                            if (oldParentHasLayout) {
                                requestAnimationFrame(() => {
                                    const updatedShapes = useShapeStore.getState().shapes;
                                    const oldParent = updatedShapes.get(currentParent.id);
                                    if (!oldParent || !oldParent.layout || oldParent.layout.mode === 'free') return;

                                    const remainingChildren = oldParent.children
                                        .map((childId) => updatedShapes.get(childId))
                                        .filter(Boolean) as Shape[];

                                    if (remainingChildren.length > 0) {
                                        const layoutResult = calculateChildPositions(oldParent, remainingChildren);
                                        const updates = remainingChildren.map((child) => {
                                            const pos = layoutResult.positions.get(child.id);
                                            return {
                                                id: child.id,
                                                changes: { x: pos?.x ?? child.x, y: pos?.y ?? child.y },
                                            };
                                        });
                                        if (updates.length > 0) batchUpdate(updates);
                                    }
                                });
                            }
                            generateSuggestions();
                            return;
                        } else if (potentialParent.id !== shape.parentId) {
                            // Shape moved from one parent to another
                            nestShape(id, potentialParent.id);

                            // Apply layout to both old and new parent
                            requestAnimationFrame(() => {
                                const updatedShapes = useShapeStore.getState().shapes;
                                const allUpdates: { id: string; changes: Partial<Shape> }[] = [];

                                // Update old parent's remaining children layout
                                if (oldParentHasLayout) {
                                    const oldParent = updatedShapes.get(currentParent.id);
                                    if (oldParent && oldParent.layout && oldParent.layout.mode !== 'free') {
                                        const remainingChildren = oldParent.children
                                            .map((childId) => updatedShapes.get(childId))
                                            .filter(Boolean) as Shape[];
                                        if (remainingChildren.length > 0) {
                                            const layoutResult = calculateChildPositions(oldParent, remainingChildren);
                                            remainingChildren.forEach((child) => {
                                                const pos = layoutResult.positions.get(child.id);
                                                if (pos) {
                                                    allUpdates.push({
                                                        id: child.id,
                                                        changes: { x: pos.x, y: pos.y },
                                                    });
                                                }
                                            });
                                        }
                                    }
                                }

                                // Update new parent's children layout
                                const newParent = updatedShapes.get(potentialParent.id);
                                if (newParent && newParent.layout && newParent.layout.mode !== 'free') {
                                    const newChildren = newParent.children
                                        .map((childId) => updatedShapes.get(childId))
                                        .filter(Boolean) as Shape[];

                                    if (newChildren.length > 0) {
                                        const layoutResult = calculateChildPositions(newParent, newChildren);
                                        newChildren.forEach((child) => {
                                            const pos = layoutResult.positions.get(child.id);
                                            if (pos) {
                                                allUpdates.push({
                                                    id: child.id,
                                                    changes: { x: pos.x, y: pos.y },
                                                });
                                            }
                                        });
                                    }
                                }

                                if (allUpdates.length > 0) batchUpdate(allUpdates);
                                generateSuggestions();
                            });
                            return;
                        }
                    }
                }
            }

            // Shape doesn't have a parent, check if it should be nested into a new one
            if (potentialParent && potentialParent.id !== shape.parentId) {
                // Calculate insertion index based on drop position for flex/grid layouts
                let insertionIndex = -1;
                if (potentialParent.layout && potentialParent.layout.mode !== 'free') {
                    const layout = potentialParent.layout;
                    const existingChildren = potentialParent.children
                        .map((childId) => currentShapes.get(childId))
                        .filter(Boolean) as Shape[];

                    // Convert drop position to parent-relative coordinates
                    const relDropX = shapeWorldX - potentialParent.x + shape.width / 2;
                    const relDropY = shapeWorldY - potentialParent.y + shape.height / 2;

                    if (layout.mode === 'flex' && layout.flex) {
                        const isFlexRow = layout.flex.direction === 'row' || layout.flex.direction === 'row-reverse';
                        const padding = layout.flex.padding;
                        const gap = layout.flex.gap;
                        let pos = isFlexRow ? padding.left : padding.top;

                        for (let i = 0; i < existingChildren.length; i++) {
                            const child = existingChildren[i];
                            const childSize = isFlexRow ? child.width : child.height;
                            const slotMidpoint = pos + childSize / 2;
                            const draggedMainPos = isFlexRow ? relDropX : relDropY;

                            if (draggedMainPos < slotMidpoint) {
                                insertionIndex = i;
                                break;
                            }
                            pos += childSize + gap;
                        }
                        if (insertionIndex === -1) insertionIndex = existingChildren.length;
                    } else if (layout.mode === 'grid' && layout.grid) {
                        const padding = layout.grid.padding;
                        const columns = layout.grid.columns;
                        const columnGap = layout.grid.columnGap;
                        const rowGap = layout.grid.rowGap;

                        const availableWidth = potentialParent.width - padding.left - padding.right;
                        const availableHeight = potentialParent.height - padding.top - padding.bottom;
                        const numRows = Math.ceil((existingChildren.length + 1) / columns);
                        const cellWidth = (availableWidth - columnGap * (columns - 1)) / columns;
                        const cellHeight = (availableHeight - rowGap * (numRows - 1)) / numRows;

                        const col = Math.max(0, Math.min(columns - 1, Math.floor((relDropX - padding.left) / (cellWidth + columnGap))));
                        const row = Math.max(0, Math.floor((relDropY - padding.top) / (cellHeight + rowGap)));

                        insertionIndex = Math.min(row * columns + col, existingChildren.length);
                    }
                }

                // Nest the shape
                nestShape(id, potentialParent.id);

                // If we calculated an insertion index, reorder the children
                if (insertionIndex >= 0 && insertionIndex < potentialParent.children.length) {
                    // After nesting, the shape will be at the end of children array
                    // We need to move it to the correct position
                    requestAnimationFrame(() => {
                        const updatedShapes = useShapeStore.getState().shapes;
                        const newParent = updatedShapes.get(potentialParent.id);
                        if (!newParent) return;

                        // Reorder if needed (shape was added at the end)
                        const currentIndex = newParent.children.indexOf(id);
                        if (currentIndex !== insertionIndex && currentIndex !== -1) {
                            reorderChildInParent(potentialParent.id, id, insertionIndex);
                        }

                        // Apply layout after reorder
                        requestAnimationFrame(() => {
                            const finalShapes = useShapeStore.getState().shapes;
                            const finalParent = finalShapes.get(potentialParent.id);
                            if (!finalParent || !finalParent.layout || finalParent.layout.mode === 'free') {
                                generateSuggestions();
                                return;
                            }

                            const finalChildren = finalParent.children
                                .map((childId) => finalShapes.get(childId))
                                .filter(Boolean) as Shape[];

                            const layoutResult = calculateChildPositions(finalParent, finalChildren);
                            const updates = finalChildren.map((child) => {
                                const pos = layoutResult.positions.get(child.id);
                                return {
                                    id: child.id,
                                    changes: { x: pos?.x ?? child.x, y: pos?.y ?? child.y },
                                };
                            });

                            if (updates.length > 0) batchUpdate(updates);
                            generateSuggestions();
                        });
                    });
                } else {
                    // Apply layout if the new parent has flex/grid
                    requestAnimationFrame(() => {
                        const updatedShapes = useShapeStore.getState().shapes;
                        const newParent = updatedShapes.get(potentialParent.id);
                        if (!newParent || !newParent.layout || newParent.layout.mode === 'free') {
                            generateSuggestions();
                            return;
                        }

                        const updatedChildren = newParent.children
                            .map((childId) => updatedShapes.get(childId))
                            .filter(Boolean) as Shape[];

                        const layoutResult = calculateChildPositions(newParent, updatedChildren);
                        const updates = updatedChildren.map((child) => {
                            const pos = layoutResult.positions.get(child.id);
                            return {
                                id: child.id,
                                changes: { x: pos?.x ?? child.x, y: pos?.y ?? child.y },
                            };
                        });

                        if (updates.length > 0) batchUpdate(updates);
                        generateSuggestions();
                    });
                }
                return;
            } else if (shape.parentId) {
                // Check if we should reorder children in a flex/grid layout
                const parent = currentShapes.get(shape.parentId);
                if (parent && parent.layout && parent.layout.mode !== 'free') {
                    const allChildren = parent.children
                        .map((childId) => currentShapes.get(childId))
                        .filter(Boolean) as Shape[];

                    // Convert mouse position to parent-relative coordinates
                    const relMouseX = mouseX - parent.x;
                    const relMouseY = mouseY - parent.y;

                    const layout = parent.layout;
                    const currentIndex = parent.children.indexOf(id);
                    let targetIndex = -1;

                    if (layout.mode === 'flex' && layout.flex) {
                        const padding = layout.flex.padding;
                        const gap = layout.flex.gap;
                        const isFlexRow = layout.flex.direction === 'row' || layout.flex.direction === 'row-reverse';

                        // Calculate slot positions and check if mouse is inside each slot
                        let pos = isFlexRow ? padding.left : padding.top;

                        for (let i = 0; i < allChildren.length; i++) {
                            const child = allChildren[i];
                            if (child.id === id) {
                                pos += (isFlexRow ? child.width : child.height) + gap;
                                continue;
                            }

                            const childSize = isFlexRow ? child.width : child.height;
                            const slotStart = pos;
                            const slotEnd = pos + childSize;

                            // Check if mouse is inside this slot's bounds
                            const mouseMainPos = isFlexRow ? relMouseX : relMouseY;
                            const mouseCrossPos = isFlexRow ? relMouseY : relMouseX;
                            const crossStart = isFlexRow ? padding.top : padding.left;
                            const crossEnd = isFlexRow ? parent.height - padding.bottom : parent.width - padding.right;

                            if (mouseMainPos >= slotStart && mouseMainPos < slotEnd &&
                                mouseCrossPos >= crossStart && mouseCrossPos < crossEnd) {
                                // Mouse is inside this slot - swap with this shape
                                targetIndex = i;
                                break;
                            }

                            pos += childSize + gap;
                        }
                    } else if (layout.mode === 'grid' && layout.grid) {
                        const padding = layout.grid.padding;
                        const columns = layout.grid.columns;
                        const columnGap = layout.grid.columnGap;
                        const rowGap = layout.grid.rowGap;

                        const availableWidth = parent.width - padding.left - padding.right;
                        const numRows = Math.ceil(allChildren.length / columns);
                        const availableHeight = parent.height - padding.top - padding.bottom;
                        const cellWidth = (availableWidth - columnGap * (columns - 1)) / columns;
                        const cellHeight = (availableHeight - rowGap * (numRows - 1)) / numRows;

                        // Calculate which grid cell the mouse is in
                        const relX = relMouseX - padding.left;
                        const relY = relMouseY - padding.top;

                        // Check if mouse is within the grid bounds
                        if (relX >= 0 && relX < availableWidth && relY >= 0 && relY < availableHeight) {
                            const col = Math.floor(relX / (cellWidth + columnGap));
                            const row = Math.floor(relY / (cellHeight + rowGap));

                            // Check if mouse is actually inside a cell (not in the gap)
                            const cellStartX = col * (cellWidth + columnGap);
                            const cellStartY = row * (cellHeight + rowGap);
                            const isInsideCell = relX >= cellStartX && relX < cellStartX + cellWidth &&
                                                 relY >= cellStartY && relY < cellStartY + cellHeight;

                            if (isInsideCell && col < columns && row < numRows) {
                                const cellIndex = row * columns + col;
                                // Only target if there's a shape in that cell and it's not the dragged shape
                                if (cellIndex < allChildren.length && allChildren[cellIndex].id !== id) {
                                    targetIndex = cellIndex;
                                }
                            }
                        }
                    }

                    // Reorder if mouse is inside another shape's slot
                    if (targetIndex !== -1 && targetIndex !== currentIndex) {
                        reorderChildInParent(parent.id, id, targetIndex);
                    }

                    // Always recalculate and apply layout positions for ALL children after any drag
                    // This ensures all children snap back to their correct layout positions
                    const applyLayoutPositions = () => {
                        const updatedShapes = useShapeStore.getState().shapes;
                        const updatedParent = updatedShapes.get(parent.id);
                        if (!updatedParent || !updatedParent.layout || updatedParent.layout.mode === 'free') return;

                        const updatedChildren = updatedParent.children
                            .map((childId) => updatedShapes.get(childId))
                            .filter(Boolean) as Shape[];

                        const layoutResult = calculateChildPositions(updatedParent, updatedChildren);

                        // Update all children to their calculated layout positions
                        const updates = updatedChildren.map((child) => {
                            const pos = layoutResult.positions.get(child.id);
                            return {
                                id: child.id,
                                changes: {
                                    x: pos?.x ?? child.x,
                                    y: pos?.y ?? child.y,
                                },
                            };
                        });

                        if (updates.length > 0) {
                            batchUpdate(updates);
                        }
                    };

                    // If we reordered, wait for next frame for the store to update, otherwise apply immediately
                    if (targetIndex !== -1 && targetIndex !== currentIndex) {
                        requestAnimationFrame(applyLayoutPositions);
                    } else {
                        applyLayoutPositions();
                    }
                }
            }

            // Trigger AI suggestions after drag complete (layout pause)
            generateSuggestions();
        },
        [setActiveGuides, nestShape, reorderChildInParent, batchUpdate, generateSuggestions]
    );

    const handleTransformEnd = useCallback(
        (id: string, node: Konva.Node) => {
            const scaleX = node.scaleX();
            const scaleY = node.scaleY();

            // Always read fresh state to avoid stale closures
            const currentShapes = useShapeStore.getState().shapes;
            const shape = currentShapes.get(id);
            if (!shape) return;

            // Calculate new dimensions from scale
            const newWidth = Math.max(10, shape.width * scaleX);
            const newHeight = Math.max(10, shape.height * scaleY);
            const newRotation = node.rotation();
            const newX = node.x();
            const newY = node.y();

            // Reset scale BEFORE updating state (Konva applies scale temporarily during transform)
            // This ensures the node is in a clean state when React re-renders with new dimensions
            node.scaleX(1);
            node.scaleY(1);

            // With relative coordinates and nested Konva Groups:
            // - Children automatically inherit parent's transform
            // - We only need to update the shape that was transformed
            // - Child shapes maintain their relative positions automatically
            batchUpdate([
                {
                    id,
                    changes: {
                        x: newX,
                        y: newY,
                        width: newWidth,
                        height: newHeight,
                        rotation: newRotation,
                    },
                },
            ]);

            // Force a layer redraw to sync visual state
            node.getLayer()?.batchDraw();

            // Trigger AI suggestions after resize complete
            generateSuggestions();
        },
        [batchUpdate, generateSuggestions]
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
            dragBoundFunc={(pos) => {
                // Only allow stage dragging when pan tool is active
                if (activeTool !== 'pan') {
                    return { x: canvas.panX, y: canvas.panY };
                }
                return pos;
            }}
            onDragMove={(e) => {
                // Only update pan if we're using the pan tool
                if (activeTool === 'pan') {
                    setPan(e.target.x(), e.target.y());
                }
            }}
            onDragEnd={(e) => {
                // Only update pan if we're using the pan tool
                if (activeTool === 'pan') {
                    setPan(e.target.x(), e.target.y());
                }
            }}
            style={{ backgroundColor: '#E8E8E8', cursor: activeTool === 'pan' ? 'grab' : 'default' }}
        >
            <Layer>
                {/* True infinite canvas background with dynamic grid */}
                <InfiniteCanvasBackground
                    viewportWidth={width}
                    viewportHeight={height}
                    zoom={canvas.zoom}
                    panX={canvas.panX}
                    panY={canvas.panY}
                    gridSize={gridSize}
                    showGrid={showGrid}
                />

                {/* Root Shapes - children are rendered recursively inside parent Groups */}
                {rootShapes.map((shape) => (
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

                {/* Ghost shapes (suggestions) - clickable to accept/reject */}
                {ghostShapes.map((shape, index) => (
                    <GhostShapeRenderer
                        key={`ghost-${index}`}
                        shape={shape}
                        onAccept={handleGhostShapeAccept}
                        onReject={handleGhostShapeReject}
                        isClickable={true}
                    />
                ))}

                {/* Preview shape while drawing */}
                {previewShape && (
                    <GhostShapeRenderer
                        shape={{
                            ...previewShape,
                            label: 'unknown',
                            parentId: null,
                        }}
                        isClickable={false}
                    />
                )}

                {/* Snap guides */}
                <SnapGuidesRenderer guides={activeGuides} />
            </Layer>
        </Stage>
    );
};

export default DesignCanvas;
