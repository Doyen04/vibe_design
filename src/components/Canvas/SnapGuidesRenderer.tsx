// ============================================
// VIBE DESIGN - Snap Guides Renderer
// Renders alignment and snap guides
// ============================================

import React, { memo } from 'react';
import { Line, Group } from 'react-konva';
import type { SnapGuide } from '../../types';

interface SnapGuidesRendererProps {
  guides: SnapGuide[];
}

const SnapGuidesRenderer: React.FC<SnapGuidesRendererProps> = memo(({ guides }) => {
  if (guides.length === 0) return null;

  return (
    <Group>
      {guides.map((guide, index) => {
        const points =
          guide.type === 'vertical'
            ? [guide.position, guide.start, guide.position, guide.end]
            : [guide.start, guide.position, guide.end, guide.position];

        return (
          <Line
            key={`guide-${index}`}
            points={points}
            stroke="#E91E63"
            strokeWidth={1}
            dash={[4, 4]}
            listening={false}
          />
        );
      })}
    </Group>
  );
});

SnapGuidesRenderer.displayName = 'SnapGuidesRenderer';

export default SnapGuidesRenderer;
