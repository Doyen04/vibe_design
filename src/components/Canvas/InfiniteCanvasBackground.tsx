// ============================================
// VIBE DESIGN - Infinite Canvas Background
// Dynamically renders background and grid based on viewport
// Uses virtual rendering for true infinite canvas
// ============================================

import React, { memo, useMemo } from 'react';
import { Rect, Line, Group } from 'react-konva';

interface InfiniteCanvasBackgroundProps {
    /** Viewport width in pixels */
    viewportWidth: number;
    /** Viewport height in pixels */
    viewportHeight: number;
    /** Current zoom level */
    zoom: number;
    /** Current pan X offset */
    panX: number;
    /** Current pan Y offset */
    panY: number;
    /** Grid size in scene units */
    gridSize: number;
    /** Whether to show the grid */
    showGrid: boolean;
    /** Background color */
    backgroundColor?: string;
    /** Grid line color */
    gridColor?: string;
}

/**
 * InfiniteCanvasBackground renders a truly infinite canvas background
 * by calculating the visible area and only rendering what's needed.
 * 
 * Key concepts:
 * - Viewport: The visible area on screen (viewportWidth x viewportHeight)
 * - Scene: The infinite canvas coordinate space
 * - We calculate which part of the scene is visible in the viewport
 * - Grid lines are generated dynamically for the visible area only
 */
const InfiniteCanvasBackground: React.FC<InfiniteCanvasBackgroundProps> = memo(
    ({
        viewportWidth,
        viewportHeight,
        zoom,
        panX,
        panY,
        gridSize,
        showGrid,
        backgroundColor = '#F5F5F5',
        gridColor = '#E0E0E0',
    }) => {
        // Calculate the visible scene bounds
        const visibleBounds = useMemo(() => {
            // The visible area in scene coordinates
            // panX, panY represent the scene offset from the viewport origin
            // zoom scales the scene

            // Viewport corners in scene coordinates:
            // Top-left: (-panX/zoom, -panY/zoom)
            // Bottom-right: ((viewportWidth - panX)/zoom, (viewportHeight - panY)/zoom)

            const sceneX1 = -panX / zoom;
            const sceneY1 = -panY / zoom;
            const sceneX2 = (viewportWidth - panX) / zoom;
            const sceneY2 = (viewportHeight - panY) / zoom;

            // Add padding to avoid edge artifacts
            const padding = gridSize * 2;

            return {
                x1: sceneX1 - padding,
                y1: sceneY1 - padding,
                x2: sceneX2 + padding,
                y2: sceneY2 + padding,
                width: sceneX2 - sceneX1 + padding * 2,
                height: sceneY2 - sceneY1 + padding * 2,
            };
        }, [viewportWidth, viewportHeight, zoom, panX, panY, gridSize]);

        // Generate grid lines for the visible area
        const gridLines = useMemo(() => {
            if (!showGrid) return [];

            const lines: { points: number[]; key: string }[] = [];
            const { x1, y1, x2, y2 } = visibleBounds;

            // Adjust grid size based on zoom to prevent too many lines
            let effectiveGridSize = gridSize;
            const maxLinesPerAxis = 100;

            // If there would be too many lines, increase grid size
            const linesX = (x2 - x1) / effectiveGridSize;
            const linesY = (y2 - y1) / effectiveGridSize;

            if (linesX > maxLinesPerAxis || linesY > maxLinesPerAxis) {
                const multiplier = Math.ceil(Math.max(linesX, linesY) / maxLinesPerAxis);
                effectiveGridSize = gridSize * multiplier;
            }

            // Start grid lines at nearest grid-aligned position
            const startX = Math.floor(x1 / effectiveGridSize) * effectiveGridSize;
            const startY = Math.floor(y1 / effectiveGridSize) * effectiveGridSize;

            // Vertical lines
            for (let x = startX; x <= x2; x += effectiveGridSize) {
                lines.push({
                    points: [x, y1, x, y2],
                    key: `v-${x}`,
                });
            }

            // Horizontal lines
            for (let y = startY; y <= y2; y += effectiveGridSize) {
                lines.push({
                    points: [x1, y, x2, y],
                    key: `h-${y}`,
                });
            }

            return lines;
        }, [visibleBounds, gridSize, showGrid]);

        return (
            <Group listening={false}>
                {/* Background rect that covers the visible area */}
                <Rect
                    x={visibleBounds.x1}
                    y={visibleBounds.y1}
                    width={visibleBounds.width}
                    height={visibleBounds.height}
                    fill={backgroundColor}
                    listening={false}
                />

                {/* Grid lines */}
                {showGrid && gridLines.map((line) => (
                    <Line
                        key={line.key}
                        points={line.points}
                        stroke={gridColor}
                        strokeWidth={1 / zoom} // Keep consistent line width regardless of zoom
                        listening={false}
                    />
                ))}

                {/* Origin crosshair (optional - helps with orientation) */}
                {showGrid && (
                    <>
                        <Line
                            points={[0, visibleBounds.y1, 0, visibleBounds.y2]}
                            stroke="#BDBDBD"
                            strokeWidth={2 / zoom}
                            listening={false}
                        />
                        <Line
                            points={[visibleBounds.x1, 0, visibleBounds.x2, 0]}
                            stroke="#BDBDBD"
                            strokeWidth={2 / zoom}
                            listening={false}
                        />
                    </>
                )}
            </Group>
        );
    }
);

InfiniteCanvasBackground.displayName = 'InfiniteCanvasBackground';

export default InfiniteCanvasBackground;
