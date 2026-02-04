// ============================================
// VIBE DESIGN - Ghost Shape Renderer
// Renders suggestion preview shapes (clickable to accept)
// ============================================

import React, { memo, useState } from 'react';
import { Rect, Circle, Group, Text } from 'react-konva';
import type { SuggestedShape } from '../../types';

interface GhostShapeRendererProps {
  shape: SuggestedShape;
  onClick?: () => void;
  isClickable?: boolean;
}

const GhostShapeRenderer: React.FC<GhostShapeRendererProps> = memo(({ 
  shape, 
  onClick,
  isClickable = true 
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const baseOpacity = 0.5;
  const hoverOpacity = 0.8;

  const commonProps = {
    x: shape.x,
    y: shape.y,
    fill: isHovered ? '#BBDEFB' : (shape.fill ?? '#E3F2FD'),
    stroke: isHovered ? '#1976D2' : '#2196F3',
    strokeWidth: isHovered ? 3 : 2,
    opacity: isHovered ? hoverOpacity : baseOpacity,
    dash: isHovered ? undefined : [8, 4],
    listening: isClickable,
    onMouseEnter: () => setIsHovered(true),
    onMouseLeave: () => setIsHovered(false),
    onClick: onClick,
    onTap: onClick,
    style: isClickable ? { cursor: 'pointer' } : undefined,
  };

  // Calculate center for the "+" icon
  const centerX = shape.x + shape.width / 2;
  const centerY = shape.y + shape.height / 2;

  return (
    <Group>
      {shape.type === 'rect' ? (
        <Rect
          {...commonProps}
          width={shape.width}
          height={shape.height}
          cornerRadius={4}
        />
      ) : (
        <Circle
          {...commonProps}
          x={centerX}
          y={centerY}
          radius={Math.min(shape.width, shape.height) / 2}
        />
      )}
      
      {/* Show "+" icon when hovered to indicate clickable */}
      {isHovered && isClickable && (
        <Text
          x={centerX - 12}
          y={centerY - 12}
          text="+"
          fontSize={24}
          fontStyle="bold"
          fill="#1976D2"
          listening={false}
        />
      )}
    </Group>
  );
});

GhostShapeRenderer.displayName = 'GhostShapeRenderer';

export default GhostShapeRenderer;