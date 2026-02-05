// ============================================
// VIBE DESIGN - Snap Engine
// Smart snapping and alignment guides
// ============================================

import type { Shape, SnapGuide, AlignmentGuide } from '../types';

export interface SnapResult {
    snappedX: number;
    snappedY: number;
    guides: SnapGuide[];
}

export class SnapEngine {
    private threshold: number;
    private enabled: boolean;

    constructor(threshold = 8) {
        this.threshold = threshold;
        this.enabled = true;
    }

    setEnabled(enabled: boolean) {
        this.enabled = enabled;
    }

    setThreshold(threshold: number) {
        this.threshold = threshold;
    }

    /**
     * Calculate snap position for a shape being moved
     */
    snapShape(
        movingShape: Shape,
        newX: number,
        newY: number,
        otherShapes: Shape[],
        canvasWidth: number,
        canvasHeight: number
    ): SnapResult {
        if (!this.enabled) {
            return { snappedX: newX, snappedY: newY, guides: [] };
        }

        const guides: SnapGuide[] = [];
        let snappedX = newX;
        let snappedY = newY;

        const movingRight = newX + movingShape.width;
        const movingBottom = newY + movingShape.height;
        const movingCenterX = newX + movingShape.width / 2;
        const movingCenterY = newY + movingShape.height / 2;

        // Canvas center snapping
        const canvasCenterX = canvasWidth / 2;
        const canvasCenterY = canvasHeight / 2;

        // Check canvas center X
        if (Math.abs(movingCenterX - canvasCenterX) < this.threshold) {
            snappedX = canvasCenterX - movingShape.width / 2;
            guides.push({
                type: 'vertical',
                position: canvasCenterX,
                start: 0,
                end: canvasHeight,
                sourceShapeId: movingShape.id,
                targetShapeId: 'canvas',
            });
        }

        // Check canvas center Y
        if (Math.abs(movingCenterY - canvasCenterY) < this.threshold) {
            snappedY = canvasCenterY - movingShape.height / 2;
            guides.push({
                type: 'horizontal',
                position: canvasCenterY,
                start: 0,
                end: canvasWidth,
                sourceShapeId: movingShape.id,
                targetShapeId: 'canvas',
            });
        }

        // Snap to other shapes
        for (const target of otherShapes) {
            if (target.id === movingShape.id) continue;

            const targetRight = target.x + target.width;
            const targetBottom = target.y + target.height;
            const targetCenterX = target.x + target.width / 2;
            const targetCenterY = target.y + target.height / 2;

            // Horizontal snapping (X axis)
            // Left edge to left edge
            if (Math.abs(newX - target.x) < this.threshold) {
                snappedX = target.x;
                guides.push(this.createVerticalGuide(target.x, movingShape, target));
            }
            // Right edge to right edge
            else if (Math.abs(movingRight - targetRight) < this.threshold) {
                snappedX = targetRight - movingShape.width;
                guides.push(this.createVerticalGuide(targetRight, movingShape, target));
            }
            // Left edge to right edge
            else if (Math.abs(newX - targetRight) < this.threshold) {
                snappedX = targetRight;
                guides.push(this.createVerticalGuide(targetRight, movingShape, target));
            }
            // Right edge to left edge
            else if (Math.abs(movingRight - target.x) < this.threshold) {
                snappedX = target.x - movingShape.width;
                guides.push(this.createVerticalGuide(target.x, movingShape, target));
            }
            // Center to center X
            else if (Math.abs(movingCenterX - targetCenterX) < this.threshold) {
                snappedX = targetCenterX - movingShape.width / 2;
                guides.push(this.createVerticalGuide(targetCenterX, movingShape, target));
            }

            // Vertical snapping (Y axis)
            // Top edge to top edge
            if (Math.abs(newY - target.y) < this.threshold) {
                snappedY = target.y;
                guides.push(this.createHorizontalGuide(target.y, movingShape, target));
            }
            // Bottom edge to bottom edge
            else if (Math.abs(movingBottom - targetBottom) < this.threshold) {
                snappedY = targetBottom - movingShape.height;
                guides.push(this.createHorizontalGuide(targetBottom, movingShape, target));
            }
            // Top edge to bottom edge
            else if (Math.abs(newY - targetBottom) < this.threshold) {
                snappedY = targetBottom;
                guides.push(this.createHorizontalGuide(targetBottom, movingShape, target));
            }
            // Bottom edge to top edge
            else if (Math.abs(movingBottom - target.y) < this.threshold) {
                snappedY = target.y - movingShape.height;
                guides.push(this.createHorizontalGuide(target.y, movingShape, target));
            }
            // Center to center Y
            else if (Math.abs(movingCenterY - targetCenterY) < this.threshold) {
                snappedY = targetCenterY - movingShape.height / 2;
                guides.push(this.createHorizontalGuide(targetCenterY, movingShape, target));
            }
        }

        return { snappedX, snappedY, guides };
    }

    /**
     * Calculate snap position for shape resize
     */
    snapResize(
        shape: Shape,
        handle: string,
        newX: number,
        newY: number,
        newWidth: number,
        newHeight: number,
        otherShapes: Shape[]
    ): {
        x: number;
        y: number;
        width: number;
        height: number;
        guides: SnapGuide[];
    } {
        if (!this.enabled) {
            return { x: newX, y: newY, width: newWidth, height: newHeight, guides: [] };
        }

        const guides: SnapGuide[] = [];
        let x = newX;
        let y = newY;
        let width = newWidth;
        let height = newHeight;

        for (const target of otherShapes) {
            if (target.id === shape.id) continue;

            const targetRight = target.x + target.width;
            const targetBottom = target.y + target.height;

            // Snap based on which handle is being dragged
            if (handle.includes('e')) {
                // East handles - snap right edge
                if (Math.abs(x + width - targetRight) < this.threshold) {
                    width = targetRight - x;
                    guides.push(this.createVerticalGuide(targetRight, shape, target));
                } else if (Math.abs(x + width - target.x) < this.threshold) {
                    width = target.x - x;
                    guides.push(this.createVerticalGuide(target.x, shape, target));
                }
            }

            if (handle.includes('w')) {
                // West handles - snap left edge
                if (Math.abs(x - target.x) < this.threshold) {
                    const diff = x - target.x;
                    x = target.x;
                    width += diff;
                    guides.push(this.createVerticalGuide(target.x, shape, target));
                } else if (Math.abs(x - targetRight) < this.threshold) {
                    const diff = x - targetRight;
                    x = targetRight;
                    width += diff;
                    guides.push(this.createVerticalGuide(targetRight, shape, target));
                }
            }

            if (handle.includes('s')) {
                // South handles - snap bottom edge
                if (Math.abs(y + height - targetBottom) < this.threshold) {
                    height = targetBottom - y;
                    guides.push(this.createHorizontalGuide(targetBottom, shape, target));
                } else if (Math.abs(y + height - target.y) < this.threshold) {
                    height = target.y - y;
                    guides.push(this.createHorizontalGuide(target.y, shape, target));
                }
            }

            if (handle.includes('n')) {
                // North handles - snap top edge
                if (Math.abs(y - target.y) < this.threshold) {
                    const diff = y - target.y;
                    y = target.y;
                    height += diff;
                    guides.push(this.createHorizontalGuide(target.y, shape, target));
                } else if (Math.abs(y - targetBottom) < this.threshold) {
                    const diff = y - targetBottom;
                    y = targetBottom;
                    height += diff;
                    guides.push(this.createHorizontalGuide(targetBottom, shape, target));
                }
            }
        }

        return { x, y, width: Math.max(10, width), height: Math.max(10, height), guides };
    }

    /**
     * Find potential parent shape for nesting
     * Only frames can be parents - rect and circle cannot contain children
     */
    findPotentialParent(
        shape: Shape,
        allShapes: Shape[]
    ): Shape | null {
        // Find frames that could contain this shape
        const potentialParents = allShapes.filter((s) => {
            if (s.id === shape.id) return false;

            // Only frames can be parents
            if (s.type !== 'frame') return false;

            // Check if shape is inside this potential parent
            return (
                shape.x >= s.x &&
                shape.y >= s.y &&
                shape.x + shape.width <= s.x + s.width &&
                shape.y + shape.height <= s.y + s.height
            );
        });

        if (potentialParents.length === 0) return null;

        // Return the smallest containing frame (most specific parent)
        return potentialParents.reduce((smallest, current) => {
            const smallestArea = smallest.width * smallest.height;
            const currentArea = current.width * current.height;
            return currentArea < smallestArea ? current : smallest;
        });
    }

    /**
     * Generate distribution guides for evenly spacing shapes
     */
    getDistributionGuides(shapes: Shape[]): AlignmentGuide[] {
        if (shapes.length < 3) return [];

        const guides: AlignmentGuide[] = [];

        // Sort by x position for horizontal distribution
        const sortedByX = [...shapes].sort((a, b) => a.x - b.x);
        const totalWidth = sortedByX.reduce((sum, s) => sum + s.width, 0);
        const containerWidth =
            sortedByX[sortedByX.length - 1].x +
            sortedByX[sortedByX.length - 1].width -
            sortedByX[0].x;
        const idealGap = (containerWidth - totalWidth) / (shapes.length - 1);

        // Check if shapes are evenly distributed horizontally
        let isHorizontallyDistributed = true;
        for (let i = 1; i < sortedByX.length; i++) {
            const gap = sortedByX[i].x - (sortedByX[i - 1].x + sortedByX[i - 1].width);
            if (Math.abs(gap - idealGap) > this.threshold) {
                isHorizontallyDistributed = false;
                break;
            }
        }

        if (isHorizontallyDistributed) {
            // Add distribution guides between each shape
            for (let i = 1; i < sortedByX.length; i++) {
                const midX =
                    (sortedByX[i - 1].x + sortedByX[i - 1].width + sortedByX[i].x) / 2;
                guides.push({
                    type: 'vertical',
                    position: midX,
                    start: Math.min(sortedByX[i - 1].y, sortedByX[i].y),
                    end: Math.max(
                        sortedByX[i - 1].y + sortedByX[i - 1].height,
                        sortedByX[i].y + sortedByX[i].height
                    ),
                    sourceShapeId: sortedByX[i - 1].id,
                    targetShapeId: sortedByX[i].id,
                    alignType: 'distribute',
                });
            }
        }

        return guides;
    }

    private createVerticalGuide(
        x: number,
        source: Shape,
        target: Shape
    ): SnapGuide {
        return {
            type: 'vertical',
            position: x,
            start: Math.min(source.y, target.y),
            end: Math.max(
                source.y + source.height,
                target.y + target.height
            ),
            sourceShapeId: source.id,
            targetShapeId: target.id,
        };
    }

    private createHorizontalGuide(
        y: number,
        source: Shape,
        target: Shape
    ): SnapGuide {
        return {
            type: 'horizontal',
            position: y,
            start: Math.min(source.x, target.x),
            end: Math.max(
                source.x + source.width,
                target.x + target.width
            ),
            sourceShapeId: source.id,
            targetShapeId: target.id,
        };
    }
}

// Export singleton
export const snapEngine = new SnapEngine();
