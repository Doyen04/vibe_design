// ============================================
// VIBE DESIGN - Grid Renderer
// Renders the canvas grid (supports infinite canvas)
// ============================================

import React, { memo, useMemo } from 'react';
import { Line, Group } from 'react-konva';

interface GridRendererProps {
    width: number;
    height: number;
    gridSize: number;
    visible: boolean;
    offsetX?: number;
    offsetY?: number;
}

const GridRenderer: React.FC<GridRendererProps> = memo(
    ({ width, height, gridSize, visible, offsetX = 0, offsetY = 0 }) => {
        const lines = useMemo(() => {
            if (!visible) return [];

            const linesArray: { points: number[]; key: string }[] = [];

            // Limit grid lines for performance
            const maxLines = 200;
            const effectiveGridSize = width / maxLines > gridSize ? Math.ceil(width / maxLines / gridSize) * gridSize : gridSize;

            // Vertical lines
            for (let x = offsetX; x <= offsetX + width; x += effectiveGridSize) {
                linesArray.push({
                    points: [x, offsetY, x, offsetY + height],
                    key: `v-${x}`,
                });
            }

            // Horizontal lines
            for (let y = offsetY; y <= offsetY + height; y += effectiveGridSize) {
                linesArray.push({
                    points: [offsetX, y, offsetX + width, y],
                    key: `h-${y}`,
                });
            }

            return linesArray;
        }, [width, height, gridSize, visible, offsetX, offsetY]);

        if (!visible) return null;

        return (
            <Group>
                {lines.map((line) => (
                    <Line
                        key={line.key}
                        points={line.points}
                        stroke="#E0E0E0"
                        strokeWidth={0.5}
                        listening={false}
                    />
                ))}
            </Group>
        );
    }
);

GridRenderer.displayName = 'GridRenderer';

export default GridRenderer;
