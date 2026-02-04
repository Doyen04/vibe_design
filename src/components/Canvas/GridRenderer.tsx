// ============================================
// VIBE DESIGN - Grid Renderer
// Renders the canvas grid
// ============================================

import React, { memo, useMemo } from 'react';
import { Line, Group } from 'react-konva';

interface GridRendererProps {
    width: number;
    height: number;
    gridSize: number;
    visible: boolean;
}

const GridRenderer: React.FC<GridRendererProps> = memo(
    ({ width, height, gridSize, visible }) => {
        const lines = useMemo(() => {
            if (!visible) return [];

            const linesArray: { points: number[]; key: string }[] = [];

            // Vertical lines
            for (let x = 0; x <= width; x += gridSize) {
                linesArray.push({
                    points: [x, 0, x, height],
                    key: `v-${x}`,
                });
            }

            // Horizontal lines
            for (let y = 0; y <= height; y += gridSize) {
                linesArray.push({
                    points: [0, y, width, y],
                    key: `h-${y}`,
                });
            }

            return linesArray;
        }, [width, height, gridSize, visible]);

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
