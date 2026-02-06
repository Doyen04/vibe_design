// ============================================
// VIBE DESIGN - Shape Store (Zustand)
// ============================================

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type { Shape, ShapeCreateInput, DesignAction } from '../types';

interface ShapeState {
    // Shape data
    shapes: Map<string, Shape>;
    shapeOrder: string[]; // For z-index ordering

    // Selection
    selectedIds: Set<string>;
    hoveredId: string | null;

    // History
    history: DesignAction[];
    historyIndex: number;

    // Actions
    addShape: (input: ShapeCreateInput) => Shape;
    updateShape: (id: string, updates: Partial<Shape>) => void;
    deleteShape: (id: string) => void;
    deleteSelectedShapes: () => void;

    // Selection actions
    selectShape: (id: string, addToSelection?: boolean) => void;
    deselectShape: (id: string) => void;
    selectAll: () => void;
    clearSelection: () => void;
    setHoveredId: (id: string | null) => void;

    // Hierarchy actions
    nestShape: (childId: string, parentId: string) => void;
    unnestShape: (childId: string) => void;
    reorderShape: (id: string, newIndex: number) => void;

    // Batch operations
    batchUpdate: (updates: { id: string; changes: Partial<Shape> }[]) => void;

    // History operations
    undo: () => void;
    redo: () => void;

    // Getters (computed)
    getShape: (id: string) => Shape | undefined;
    getShapesArray: () => Shape[];
    getSelectedShapes: () => Shape[];
    getRootShapes: () => Shape[];
    getChildShapes: (parentId: string) => Shape[];
    findParentShape: (childId: string) => Shape | null;
    getShapeAtPoint: (x: number, y: number) => Shape | null;

    // Reset
    reset: () => void;
}

const DEFAULT_SHAPE_COLORS = {
    rect: { fill: '#E3F2FD', stroke: '#2196F3' },
    circle: { fill: '#FCE4EC', stroke: '#E91E63' },
    frame: { fill: 'transparent', stroke: '#9E9E9E' },
};

const createDefaultShape = (input: ShapeCreateInput): Shape => {
    const colors = DEFAULT_SHAPE_COLORS[input.type];

    return {
        id: uuidv4(),
        type: input.type,
        x: input.x,
        y: input.y,
        width: input.width,
        height: input.height,
        parentId: input.parentId ?? null,
        children: [],
        zIndex: 0,
        label: input.label ?? 'unknown',
        name: input.name ?? `${input.type === 'frame' ? 'Frame' : input.type}-${Date.now()}`,
        fill: input.fill ?? colors.fill,
        stroke: input.stroke ?? colors.stroke,
        strokeWidth: input.type === 'frame' ? 1 : 2,
        opacity: 1,
        rotation: 0,
        visible: true,
        locked: false,
    };
};

export const useShapeStore = create<ShapeState>()(
    subscribeWithSelector((set, get) => ({
        // Initial state
        shapes: new Map(),
        shapeOrder: [],
        selectedIds: new Set(),
        hoveredId: null,
        history: [],
        historyIndex: -1,

        // Add a new shape
        // Note: If parentId is provided, the x/y coordinates are assumed to be in WORLD coordinates
        // and will be converted to relative (local) coordinates
        addShape: (input: ShapeCreateInput) => {
            const shape = createDefaultShape(input);

            set((state) => {
                const newShapes = new Map(state.shapes);
                
                // If the shape has a parent, convert world coordinates to relative coordinates
                if (shape.parentId) {
                    const parent = state.shapes.get(shape.parentId);
                    if (parent) {
                        // Convert from world to local coordinates
                        shape.x = shape.x - parent.x;
                        shape.y = shape.y - parent.y;
                    }
                }
                
                newShapes.set(shape.id, shape);

                const newOrder = [...state.shapeOrder, shape.id];

                // Update parent's children array if nested
                if (shape.parentId) {
                    const parent = newShapes.get(shape.parentId);
                    if (parent) {
                        newShapes.set(parent.id, {
                            ...parent,
                            children: [...parent.children, shape.id],
                        });
                    }
                }

                // Add to history
                const action: DesignAction = {
                    type: 'create-shape',
                    timestamp: Date.now(),
                    shapeId: shape.id,
                    newState: shape,
                };

                return {
                    shapes: newShapes,
                    shapeOrder: newOrder,
                    history: [...state.history.slice(0, state.historyIndex + 1), action],
                    historyIndex: state.historyIndex + 1,
                };
            });

            return shape;
        },

        // Update an existing shape
        updateShape: (id: string, updates: Partial<Shape>) => {
            set((state) => {
                const shape = state.shapes.get(id);
                if (!shape) return state;

                const newShapes = new Map(state.shapes);
                const previousState = { ...shape };
                const updatedShape = { ...shape, ...updates };
                newShapes.set(id, updatedShape);

                // Add to history
                const action: DesignAction = {
                    type: 'update-shape',
                    timestamp: Date.now(),
                    shapeId: id,
                    previousState,
                    newState: updatedShape,
                };

                return {
                    shapes: newShapes,
                    history: [...state.history.slice(0, state.historyIndex + 1), action],
                    historyIndex: state.historyIndex + 1,
                };
            });
        },

        // Delete a shape
        deleteShape: (id: string) => {
            set((state) => {
                const shape = state.shapes.get(id);
                if (!shape) return state;

                const newShapes = new Map(state.shapes);
                const newOrder = state.shapeOrder.filter((sId) => sId !== id);
                const newSelectedIds = new Set(state.selectedIds);
                newSelectedIds.delete(id);

                // Remove from parent's children
                if (shape.parentId) {
                    const parent = newShapes.get(shape.parentId);
                    if (parent) {
                        newShapes.set(parent.id, {
                            ...parent,
                            children: parent.children.filter((cId) => cId !== id),
                        });
                    }
                }

                // Recursively delete children
                const deleteChildren = (parentId: string) => {
                    const parent = newShapes.get(parentId);
                    if (parent) {
                        parent.children.forEach((childId) => {
                            deleteChildren(childId);
                            newShapes.delete(childId);
                        });
                    }
                };
                deleteChildren(id);

                newShapes.delete(id);

                return {
                    shapes: newShapes,
                    shapeOrder: newOrder,
                    selectedIds: newSelectedIds,
                };
            });
        },

        // Delete all selected shapes
        deleteSelectedShapes: () => {
            const { selectedIds, deleteShape } = get();
            selectedIds.forEach((id) => deleteShape(id));
        },

        // Selection actions
        selectShape: (id: string, addToSelection = false) => {
            set((state) => {
                const newSelectedIds = addToSelection
                    ? new Set([...state.selectedIds, id])
                    : new Set([id]);
                return { selectedIds: newSelectedIds };
            });
        },

        deselectShape: (id: string) => {
            set((state) => {
                const newSelectedIds = new Set(state.selectedIds);
                newSelectedIds.delete(id);
                return { selectedIds: newSelectedIds };
            });
        },

        selectAll: () => {
            set((state) => ({
                selectedIds: new Set(state.shapeOrder),
            }));
        },

        clearSelection: () => {
            set({ selectedIds: new Set() });
        },

        setHoveredId: (id: string | null) => {
            set({ hoveredId: id });
        },

        // Hierarchy actions
        // When nesting, we convert child's world coordinates to relative coordinates (relative to parent)
        nestShape: (childId: string, parentId: string) => {
            set((state) => {
                const child = state.shapes.get(childId);
                const newParent = state.shapes.get(parentId);
                if (!child || !newParent || childId === parentId) return state;

                const newShapes = new Map(state.shapes);
                
                // Calculate the child's current world position
                // If child was already nested, we need to convert from old parent's space to world first
                let childWorldX = child.x;
                let childWorldY = child.y;
                
                if (child.parentId) {
                    const oldParent = state.shapes.get(child.parentId);
                    if (oldParent) {
                        // Convert from old parent's local space to world space
                        // Note: For full rotation support, this would need matrix transforms
                        childWorldX = oldParent.x + child.x;
                        childWorldY = oldParent.y + child.y;
                    }
                }

                // Remove from old parent's children array
                if (child.parentId) {
                    const oldParent = newShapes.get(child.parentId);
                    if (oldParent) {
                        newShapes.set(oldParent.id, {
                            ...oldParent,
                            children: oldParent.children.filter((id) => id !== childId),
                        });
                    }
                }

                // Convert child's world coordinates to new parent's local coordinates
                const relativeX = childWorldX - newParent.x;
                const relativeY = childWorldY - newParent.y;

                // Add to new parent's children array
                newShapes.set(parentId, {
                    ...newParent,
                    children: [...newParent.children, childId],
                });

                // Update child with relative coordinates and new parentId
                newShapes.set(childId, {
                    ...child,
                    parentId,
                    x: relativeX,
                    y: relativeY,
                });

                return { shapes: newShapes };
            });
        },

        // When unnesting, we convert child's relative coordinates back to world coordinates
        unnestShape: (childId: string) => {
            set((state) => {
                const child = state.shapes.get(childId);
                if (!child || !child.parentId) return state;

                const newShapes = new Map(state.shapes);
                const parent = newShapes.get(child.parentId);

                if (parent) {
                    // Convert child's relative coordinates to world coordinates
                    const worldX = parent.x + child.x;
                    const worldY = parent.y + child.y;

                    // Remove from parent's children array
                    newShapes.set(parent.id, {
                        ...parent,
                        children: parent.children.filter((id) => id !== childId),
                    });

                    // Update child with world coordinates and null parentId
                    newShapes.set(childId, {
                        ...child,
                        parentId: null,
                        x: worldX,
                        y: worldY,
                    });
                } else {
                    // Parent not found, just remove the parentId
                    newShapes.set(childId, {
                        ...child,
                        parentId: null,
                    });
                }

                return { shapes: newShapes };
            });
        },

        reorderShape: (id: string, newIndex: number) => {
            set((state) => {
                const currentIndex = state.shapeOrder.indexOf(id);
                if (currentIndex === -1) return state;

                const newOrder = [...state.shapeOrder];
                newOrder.splice(currentIndex, 1);
                newOrder.splice(newIndex, 0, id);

                return { shapeOrder: newOrder };
            });
        },

        // Batch update
        batchUpdate: (updates) => {
            set((state) => {
                const newShapes = new Map(state.shapes);

                updates.forEach(({ id, changes }) => {
                    const shape = newShapes.get(id);
                    if (shape) {
                        newShapes.set(id, { ...shape, ...changes });
                    }
                });

                return { shapes: newShapes };
            });
        },

        // History operations
        undo: () => {
            set((state) => {
                if (state.historyIndex < 0) return state;

                const action = state.history[state.historyIndex];
                const newShapes = new Map(state.shapes);

                if (action.type === 'create-shape') {
                    newShapes.delete(action.shapeId);
                } else if (action.previousState) {
                    const shape = newShapes.get(action.shapeId);
                    if (shape) {
                        newShapes.set(action.shapeId, { ...shape, ...action.previousState });
                    }
                }

                return {
                    shapes: newShapes,
                    historyIndex: state.historyIndex - 1,
                };
            });
        },

        redo: () => {
            set((state) => {
                if (state.historyIndex >= state.history.length - 1) return state;

                const action = state.history[state.historyIndex + 1];
                const newShapes = new Map(state.shapes);

                if (action.newState) {
                    const existing = newShapes.get(action.shapeId);
                    if (existing) {
                        newShapes.set(action.shapeId, { ...existing, ...action.newState });
                    } else {
                        newShapes.set(action.shapeId, action.newState as Shape);
                    }
                }

                return {
                    shapes: newShapes,
                    historyIndex: state.historyIndex + 1,
                };
            });
        },

        // Getters
        getShape: (id: string) => get().shapes.get(id),

        getShapesArray: () => {
            const { shapes, shapeOrder } = get();
            return shapeOrder.map((id) => shapes.get(id)).filter(Boolean) as Shape[];
        },

        getSelectedShapes: () => {
            const { shapes, selectedIds } = get();
            return Array.from(selectedIds)
                .map((id) => shapes.get(id))
                .filter(Boolean) as Shape[];
        },

        getRootShapes: () => {
            const { shapes } = get();
            return Array.from(shapes.values()).filter((s) => !s.parentId);
        },

        getChildShapes: (parentId: string) => {
            const { shapes } = get();
            const parent = shapes.get(parentId);
            if (!parent) return [];
            return parent.children.map((id) => shapes.get(id)).filter(Boolean) as Shape[];
        },

        findParentShape: (childId: string) => {
            const { shapes } = get();
            const child = shapes.get(childId);
            if (!child || !child.parentId) return null;
            return shapes.get(child.parentId) ?? null;
        },

        getShapeAtPoint: (x: number, y: number) => {
            const shapes = get().getShapesArray();
            // Reverse to get top-most shape first
            for (let i = shapes.length - 1; i >= 0; i--) {
                const shape = shapes[i];
                if (
                    x >= shape.x &&
                    x <= shape.x + shape.width &&
                    y >= shape.y &&
                    y <= shape.y + shape.height
                ) {
                    return shape;
                }
            }
            return null;
        },

        // Reset
        reset: () => {
            set({
                shapes: new Map(),
                shapeOrder: [],
                selectedIds: new Set(),
                hoveredId: null,
                history: [],
                historyIndex: -1,
            });
        },
    }))
);

// Selector hooks for optimized re-renders
export const useSelectedShapes = () =>
    useShapeStore((state) => {
        const shapes: Shape[] = [];
        state.selectedIds.forEach((id) => {
            const shape = state.shapes.get(id);
            if (shape) shapes.push(shape);
        });
        return shapes;
    });

export const useShapeById = (id: string) =>
    useShapeStore((state) => state.shapes.get(id));
