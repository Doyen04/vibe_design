// ============================================
// VIBE DESIGN - Shape Renderer Component
// Renders individual shapes on the canvas
// ============================================

import React, { memo, useCallback } from 'react';
import { Rect, Circle, Group, Transformer } from 'react-konva';
import type { Shape } from '../../types';
import { useCanvasStore } from '../../store';
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
    const shapeRef = React.useRef<Konva.Rect | Konva.Circle>(null);
    const transformerRef = React.useRef<Konva.Transformer>(null);

    // Update transformer when selection changes
    React.useEffect(() => {
      if (isSelected && transformerRef.current && shapeRef.current) {
        transformerRef.current.nodes([shapeRef.current]);
        transformerRef.current.getLayer()?.batchDraw();
      }
    }, [isSelected]);

    const handleClick = useCallback(
      (e: Konva.KonvaEventObject<MouseEvent>) => {
        if (activeTool !== 'select') return;
        e.cancelBubble = true;
        onSelect(shape.id, e.evt.shiftKey);
      },
      [activeTool, shape.id, onSelect]
    );

    const handleDragStart = useCallback(() => {
      onDragStart(shape.id);
    }, [shape.id, onDragStart]);

    const handleDragMove = useCallback(
      (e: Konva.KonvaEventObject<DragEvent>) => {
        const node = e.target;
        onDragMove(shape.id, node.x(), node.y());
      },
      [shape.id, onDragMove]
    );

    const handleDragEnd = useCallback(() => {
      onDragEnd(shape.id);
    }, [shape.id, onDragEnd]);

    const handleTransformEnd = useCallback(() => {
      if (shapeRef.current) {
        onTransformEnd(shape.id, shapeRef.current);
      }
    }, [shape.id, onTransformEnd]);

    const commonProps = {
      x: shape.x,
      y: shape.y,
      fill: shape.fill,
      stroke: isSelected ? '#2196F3' : isHovered ? '#64B5F6' : shape.stroke,
      strokeWidth: isSelected ? 2 : shape.strokeWidth,
      opacity: shape.opacity,
      rotation: shape.rotation,
      draggable: activeTool === 'select' && !shape.locked,
      onClick: handleClick,
      onTap: handleClick,
      onDragStart: handleDragStart,
      onDragMove: handleDragMove,
      onDragEnd: handleDragEnd,
      onTransformEnd: handleTransformEnd,
      shadowColor: isSelected ? '#2196F3' : undefined,
      shadowBlur: isSelected ? 10 : 0,
      shadowOpacity: isSelected ? 0.3 : 0,
    };

    if (!shape.visible) return null;

    return (
      <Group>
        {shape.type === 'rect' ? (
          <Rect
            ref={shapeRef as React.RefObject<Konva.Rect>}
            {...commonProps}
            width={shape.width}
            height={shape.height}
            cornerRadius={4}
          />
        ) : (
          <Circle
            ref={shapeRef as React.RefObject<Konva.Circle>}
            {...commonProps}
            x={shape.x + shape.width / 2}
            y={shape.y + shape.height / 2}
            radius={Math.min(shape.width, shape.height) / 2}
          />
        )}

        {isSelected && (
          <Transformer
            ref={transformerRef}
            boundBoxFunc={(oldBox, newBox) => {
              // Limit minimum size
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
      </Group>
    );
  }
);

ShapeRenderer.displayName = 'ShapeRenderer';

export default ShapeRenderer;
