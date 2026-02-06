// ============================================
// VIBE DESIGN - Shape Renderer Component
// Renders shapes using Konva's nested Group hierarchy
// 
// KEY ARCHITECTURE:
// - Shape coordinates (x, y) are RELATIVE to their parent
// - Root shapes have coordinates relative to canvas (world coordinates)
// - Nested shapes have coordinates relative to their parent shape
// - Konva Groups automatically handle transform inheritance
// - Layout modes (flex, grid) calculate child positions automatically
// ============================================

import React, { memo, useCallback, useRef, useEffect, useMemo } from 'react';
import { Rect, Circle, Group, Transformer, Text, Line } from 'react-konva';
import type { Shape } from '../../types';
import { useCanvasStore, useShapeStore } from '../../store';
import { calculateChildPositions } from '../../engine/LayoutEngine';
import type Konva from 'konva';

interface ShapeRendererProps {
    shape: Shape;
    isSelected: boolean;
    isHovered: boolean;
    onSelect: (id: string, addToSelection: boolean) => void;
    onDragStart: (id: string) => void;
    onDragMove: (id: string, x: number, y: number) => void;
    onDragEnd: (id: string) => void;
    onTransformEnd: (id: string, node: Konva.Node) => void;
}

/**
 * ShapeRenderer renders a shape and all its children recursively.
 * Children are rendered inside the parent's Group, so their coordinates
 * are automatically relative to the parent's transform (position + rotation).
 */
const ShapeRenderer: React.FC<ShapeRendererProps> = memo(
    ({
        shape,
        isSelected,
        isHovered,
        onSelect,
        onDragStart,
        onDragMove,
        onDragEnd,
        onTransformEnd,
    }) => {
        const activeTool = useCanvasStore((state) => state.activeTool);
        const shapes = useShapeStore((state) => state.shapes);
        const selectedIds = useShapeStore((state) => state.selectedIds);
        const hoveredId = useShapeStore((state) => state.hoveredId);

        const groupRef = useRef<Konva.Group>(null);
        const transformerRef = useRef<Konva.Transformer>(null);

        // Get child shapes
        const childShapes = useMemo(() => {
            return shape.children
                .map((childId) => shapes.get(childId))
                .filter(Boolean) as Shape[];
        }, [shape.children, shapes]);

        // Calculate layout positions for children if this is a frame with layout
        const layoutPositions = useMemo(() => {
            if (shape.type !== 'frame' || !shape.layout || shape.layout.mode === 'free') {
                return null;
            }
            return calculateChildPositions(shape, childShapes);
        }, [shape, childShapes]);

        // Get effective position for a child (considering layout)
        const getChildPosition = useCallback((child: Shape) => {
            if (!layoutPositions) {
                return { x: child.x, y: child.y };
            }
            return layoutPositions.positions.get(child.id) || { x: child.x, y: child.y };
        }, [layoutPositions]);

        // Sync Konva Group position with shape props
        // This is needed because Konva updates node position directly during drag,
        // and we need to reset it when the shape's x/y changes from state updates
        useEffect(() => {
            if (groupRef.current) {
                const node = groupRef.current;
                // Only update if position differs (avoids unnecessary updates during drag)
                if (node.x() !== shape.x || node.y() !== shape.y) {
                    node.x(shape.x);
                    node.y(shape.y);
                    node.getLayer()?.batchDraw();
                }
            }
        }, [shape.x, shape.y]);

        // Update transformer when selection changes or shape dimensions change
        useEffect(() => {
            if (isSelected && transformerRef.current && groupRef.current) {
                // Reset any lingering scale on the group
                groupRef.current.scaleX(1);
                groupRef.current.scaleY(1);
                transformerRef.current.nodes([groupRef.current]);
                transformerRef.current.getLayer()?.batchDraw();
            }
        }, [isSelected, shape.width, shape.height, shape.x, shape.y, shape.rotation]);

        const handleClick = useCallback(
            (e: Konva.KonvaEventObject<MouseEvent>) => {
                if (activeTool !== 'select') return;
                e.cancelBubble = true;
                onSelect(shape.id, e.evt.shiftKey);
            },
            [activeTool, shape.id, onSelect]
        );

        const handleDragStart = useCallback(
            (e: Konva.KonvaEventObject<DragEvent>) => {
                // Only handle if this is the actual dragged node (not a bubbled event from child)
                if (e.target !== groupRef.current) return;
                e.cancelBubble = true;
                onDragStart(shape.id);
            },
            [shape.id, onDragStart]
        );

        const handleDragMove = useCallback(
            (e: Konva.KonvaEventObject<DragEvent>) => {
                // Only handle if this is the actual dragged node (not a bubbled event from child)
                if (e.target !== groupRef.current) return;
                e.cancelBubble = true;
                const node = e.target;
                // The node position is in parent's coordinate space
                // This is what we want - relative coordinates
                onDragMove(shape.id, node.x(), node.y());
            },
            [shape.id, onDragMove]
        );

        const handleDragEnd = useCallback(
            (e: Konva.KonvaEventObject<DragEvent>) => {
                // Only handle if this is the actual dragged node (not a bubbled event from child)
                if (e.target !== groupRef.current) return;
                e.cancelBubble = true;
                onDragEnd(shape.id);
            },
            [shape.id, onDragEnd]
        );

        const handleTransformEnd = useCallback(
            (e: Konva.KonvaEventObject<Event>) => {
                e.cancelBubble = true;
                if (groupRef.current) {
                    onTransformEnd(shape.id, groupRef.current);
                }
            },
            [shape.id, onTransformEnd]
        );

        if (!shape.visible) return null;

        const isFrame = shape.type === 'frame';
        const strokeColor = isSelected ? '#2196F3' : isHovered ? '#64B5F6' : shape.stroke;
        const hasLayout = isFrame && shape.layout && shape.layout.mode !== 'free';
        const layoutMode = shape.layout?.mode;

        // Render layout indicator for frames with active layout
        const renderLayoutIndicator = () => {
            if (!hasLayout || !isSelected) return null;

            const indicatorText = layoutMode === 'flex' ? '⟷ Flex' : '▦ Grid';
            const bgColor = layoutMode === 'flex' ? '#9C27B0' : '#FF9800';

            return (
                <>
                    <Rect
                        x={4}
                        y={4}
                        width={50}
                        height={18}
                        fill={bgColor}
                        cornerRadius={3}
                        opacity={0.9}
                    />
                    <Text
                        x={8}
                        y={7}
                        text={indicatorText}
                        fontSize={10}
                        fontStyle="bold"
                        fill="#FFFFFF"
                    />
                </>
            );
        };

        // Render grid overlay for grid layout
        const renderGridOverlay = () => {
            if (!isFrame || !shape.layout || shape.layout.mode !== 'grid' || !isSelected) {
                return null;
            }

            const grid = shape.layout.grid!;
            const { columns, rows, columnGap, rowGap, padding } = grid;

            const availableWidth = shape.width - padding.left - padding.right;
            const availableHeight = shape.height - padding.top - padding.bottom;
            const cellWidth = (availableWidth - columnGap * (columns - 1)) / columns;
            const cellHeight = (availableHeight - rowGap * (rows - 1)) / rows;

            const lines: React.ReactNode[] = [];

            // Vertical lines
            for (let i = 1; i < columns; i++) {
                const x = padding.left + i * (cellWidth + columnGap) - columnGap / 2;
                lines.push(
                    <Line
                        key={`v-${i}`}
                        points={[x, padding.top, x, shape.height - padding.bottom]}
                        stroke="#FF9800"
                        strokeWidth={1}
                        dash={[4, 4]}
                        opacity={0.5}
                    />
                );
            }

            // Horizontal lines
            for (let i = 1; i < rows; i++) {
                const y = padding.top + i * (cellHeight + rowGap) - rowGap / 2;
                lines.push(
                    <Line
                        key={`h-${i}`}
                        points={[padding.left, y, shape.width - padding.right, y]}
                        stroke="#FF9800"
                        strokeWidth={1}
                        dash={[4, 4]}
                        opacity={0.5}
                    />
                );
            }

            return lines;
        };

        // Render the shape content (rect, circle, or frame)
        const renderShapeContent = () => {
            if (shape.type === 'rect' || shape.type === 'frame') {
                return (
                    <Rect
                        x={0}
                        y={0}
                        width={shape.width}
                        height={shape.height}
                        fill={isFrame ? 'transparent' : shape.fill}
                        stroke={strokeColor}
                        strokeWidth={isSelected ? 2 : shape.strokeWidth}
                        opacity={shape.opacity}
                        dash={isFrame ? [8, 4] : undefined}
                        cornerRadius={isFrame ? 0 : 4}
                        shadowColor={isSelected ? '#2196F3' : undefined}
                        shadowBlur={isSelected ? 10 : 0}
                        shadowOpacity={isSelected ? 0.3 : 0}
                    />
                );
            } else {
                return (
                    <Circle
                        x={shape.width / 2}
                        y={shape.height / 2}
                        radius={Math.min(shape.width, shape.height) / 2}
                        fill={shape.fill}
                        stroke={strokeColor}
                        strokeWidth={isSelected ? 2 : shape.strokeWidth}
                        opacity={shape.opacity}
                        shadowColor={isSelected ? '#2196F3' : undefined}
                        shadowBlur={isSelected ? 10 : 0}
                        shadowOpacity={isSelected ? 0.3 : 0}
                    />
                );
            }
        };

        return (
            <>
                <Group
                    ref={groupRef}
                    id={shape.id}
                    name={shape.name}
                    x={shape.x}
                    y={shape.y}
                    rotation={shape.rotation}
                    draggable={activeTool === 'select' && !shape.locked}
                    onClick={handleClick}
                    onTap={handleClick}
                    onDragStart={handleDragStart}
                    onDragMove={handleDragMove}
                    onDragEnd={handleDragEnd}
                    onTransformEnd={handleTransformEnd}
                >
                    {/* The shape's visual content */}
                    {renderShapeContent()}

                    {/* Layout indicator for frames with layout */}
                    {renderLayoutIndicator()}

                    {/* Grid overlay for grid layout */}
                    {renderGridOverlay()}

                    {/* 
                      Recursively render children INSIDE this Group.
                      Because children are inside, their coordinates are relative to this shape.
                      Konva automatically applies the parent's transform (translation + rotation).
                      For frames with layout, children use calculated positions.
                    */}
                    {childShapes.map((childShape) => {
                        const pos = getChildPosition(childShape);
                        // Create a modified shape with calculated layout position
                        const effectiveShape = layoutPositions
                            ? { ...childShape, x: pos.x, y: pos.y }
                            : childShape;

                        return (
                            <ShapeRenderer
                                key={childShape.id}
                                shape={effectiveShape}
                                isSelected={selectedIds.has(childShape.id)}
                                isHovered={hoveredId === childShape.id}
                                onSelect={onSelect}
                                onDragStart={onDragStart}
                                onDragMove={onDragMove}
                                onDragEnd={onDragEnd}
                                onTransformEnd={onTransformEnd}
                            />
                        );
                    })}
                </Group>

                {/* Transformer for selected shapes - render at root level for proper behavior */}
                {isSelected && (
                    <Transformer
                        ref={transformerRef}
                        boundBoxFunc={(oldBox, newBox) => {
                            if (newBox.width < 10 || newBox.height < 10) {
                                return oldBox;
                            }
                            return newBox;
                        }}
                        anchorSize={8}
                        anchorCornerRadius={2}
                        borderStroke="#2196F3"
                        anchorStroke="#2196F3"
                        anchorFill="#FFFFFF"
                        rotateEnabled={true}
                        enabledAnchors={[
                            'top-left',
                            'top-right',
                            'bottom-left',
                            'bottom-right',
                            'middle-left',
                            'middle-right',
                            'top-center',
                            'bottom-center',
                        ]}
                    />
                )}
            </>
        );
    }
);

ShapeRenderer.displayName = 'ShapeRenderer';

export default ShapeRenderer;
