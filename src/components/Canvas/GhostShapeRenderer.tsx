// ============================================
// VIBE DESIGN - Ghost Shape Renderer
// Renders suggestion preview shapes
// ============================================

import React, { memo } from 'react';
import { Rect, Circle, Group } from 'react-konva';
import type { SuggestedShape } from '../../types';

interface GhostShapeRendererProps {
  shape: SuggestedShape;
}

const GhostShapeRenderer: React.FC<GhostShapeRendererProps> = memo(({ shape }) => {
  const commonProps = {
    x: shape.x,
    y: shape.y,
    fill: shape.fill ?? '#E3F2FD',
    stroke: '#2196F3',
    strokeWidth: 2,
    opacity: 0.5,
    dash: [8, 4],
    listening: false,
  };

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
          x={shape.x + shape.width / 2}
          y={shape.y + shape.height / 2}
          radius={Math.min(shape.width, shape.height) / 2}
        />
      )}
    </Group>
  );
});

GhostShapeRenderer.displayName = 'GhostShapeRenderer';

export default GhostShapeRenderer;
