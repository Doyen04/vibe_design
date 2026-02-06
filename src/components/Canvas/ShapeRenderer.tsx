// ============================================
// VIBE DESIGN - Shape Renderer Component
// Renders shapes using Konva's nested Group hierarchy
// 
// KEY ARCHITECTURE:
// - Shape coordinates (x, y) are RELATIVE to their parent
// - Root shapes have coordinates relative to canvas (world coordinates)
// - Nested shapes have coordinates relative to their parent shape
// - Konva Groups automatically handle transform inheritance
// ============================================

import React, { memo, useCallback, useRef, useEffect, useMemo } from 'react';
import { Rect, Circle, Group, Transformer } from 'react-konva';
import type { Shape } from '../../types';
import { useCanvasStore, useShapeStore } from '../../store';
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
                e.cancelBubble = true;
                onDragStart(shape.id);
            },
            [shape.id, onDragStart]
        );

        const handleDragMove = useCallback(
            (e: Konva.KonvaEventObject<DragEvent>) => {
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

                    {/* 
                      Recursively render children INSIDE this Group.
                      Because children are inside, their coordinates are relative to this shape.
                      Konva automatically applies the parent's transform (translation + rotation).
                    */}
                    {childShapes.map((childShape) => (
                        <ShapeRenderer
                            key={childShape.id}
                            shape={childShape}
                            isSelected={selectedIds.has(childShape.id)}
                            isHovered={hoveredId === childShape.id}
                            onSelect={onSelect}
                            onDragStart={onDragStart}
                            onDragMove={onDragMove}
                            onDragEnd={onDragEnd}
                            onTransformEnd={onTransformEnd}
                        />
                    ))}
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
