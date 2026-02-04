// ============================================
// VIBE DESIGN - Hierarchy Manager
// Manages parent-child relationships between shapes
// ============================================

import type { Shape, HierarchyNode } from '../types';

export class HierarchyManager {
    /**
     * Build a complete hierarchy tree from flat shapes array
     */
    buildHierarchy(shapes: Shape[]): HierarchyNode {
        const shapeMap = new Map(shapes.map((s) => [s.id, s]));
        const rootShapes = shapes.filter((s) => !s.parentId);

        const buildNode = (
            shapeId: string | null,
            depth: number
        ): HierarchyNode => {
            if (shapeId === null) {
                return {
                    shapeId: null,
                    children: rootShapes.map((s) => buildNode(s.id, 1)),
                    depth: 0,
                };
            }

            const shape = shapeMap.get(shapeId);
            if (!shape) {
                return { shapeId, children: [], depth };
            }

            return {
                shapeId,
                children: shape.children.map((childId) =>
                    buildNode(childId, depth + 1)
                ),
                depth,
            };
        };

        return buildNode(null, 0);
    }

    /**
     * Get all ancestors of a shape (parent, grandparent, etc.)
     */
    getAncestors(shapeId: string, shapes: Map<string, Shape>): Shape[] {
        const ancestors: Shape[] = [];
        let currentShape = shapes.get(shapeId);

        while (currentShape?.parentId) {
            const parent = shapes.get(currentShape.parentId);
            if (parent) {
                ancestors.push(parent);
                currentShape = parent;
            } else {
                break;
            }
        }

        return ancestors;
    }

    /**
     * Get all descendants of a shape (children, grandchildren, etc.)
     */
    getDescendants(shapeId: string, shapes: Map<string, Shape>): Shape[] {
        const descendants: Shape[] = [];
        const shape = shapes.get(shapeId);

        if (!shape) return descendants;

        const collectDescendants = (id: string) => {
            const s = shapes.get(id);
            if (!s) return;

            for (const childId of s.children) {
                const child = shapes.get(childId);
                if (child) {
                    descendants.push(child);
                    collectDescendants(childId);
                }
            }
        };

        collectDescendants(shapeId);
        return descendants;
    }

    /**
     * Check if a shape can be nested inside another
     */
    canNest(
        childId: string,
        parentId: string,
        shapes: Map<string, Shape>
    ): boolean {
        // Can't nest a shape inside itself
        if (childId === parentId) return false;

        const child = shapes.get(childId);
        const parent = shapes.get(parentId);

        if (!child || !parent) return false;

        // Can't nest if child is an ancestor of parent (would create cycle)
        const parentAncestors = this.getAncestors(parentId, shapes);
        if (parentAncestors.some((a) => a.id === childId)) return false;

        // Check if child fits inside parent bounds
        const childRight = child.x + child.width;
        const childBottom = child.y + child.height;
        const parentRight = parent.x + parent.width;
        const parentBottom = parent.y + parent.height;

        return (
            child.x >= parent.x &&
            child.y >= parent.y &&
            childRight <= parentRight &&
            childBottom <= parentBottom
        );
    }

    /**
     * Find the best parent for a shape based on its position
     */
    findBestParent(
        shape: Shape,
        shapes: Map<string, Shape>,
        excludeIds: Set<string> = new Set()
    ): Shape | null {
        let bestParent: Shape | null = null;
        let smallestArea = Infinity;

        for (const [id, candidate] of shapes) {
            if (id === shape.id || excludeIds.has(id)) continue;

            // Check if shape is inside candidate
            const shapeRight = shape.x + shape.width;
            const shapeBottom = shape.y + shape.height;
            const candidateRight = candidate.x + candidate.width;
            const candidateBottom = candidate.y + candidate.height;

            if (
                shape.x >= candidate.x &&
                shape.y >= candidate.y &&
                shapeRight <= candidateRight &&
                shapeBottom <= candidateBottom
            ) {
                const area = candidate.width * candidate.height;
                if (area < smallestArea) {
                    smallestArea = area;
                    bestParent = candidate;
                }
            }
        }

        return bestParent;
    }

    /**
     * Update positions of all descendants when parent moves
     */
    getDescendantUpdates(
        parentId: string,
        deltaX: number,
        deltaY: number,
        shapes: Map<string, Shape>
    ): { id: string; x: number; y: number }[] {
        const updates: { id: string; x: number; y: number }[] = [];
        const descendants = this.getDescendants(parentId, shapes);

        for (const descendant of descendants) {
            updates.push({
                id: descendant.id,
                x: descendant.x + deltaX,
                y: descendant.y + deltaY,
            });
        }

        return updates;
    }

    /**
     * Get depth of a shape in the hierarchy
     */
    getDepth(shapeId: string, shapes: Map<string, Shape>): number {
        return this.getAncestors(shapeId, shapes).length;
    }

    /**
     * Get siblings of a shape (shapes with same parent)
     */
    getSiblings(shapeId: string, shapes: Map<string, Shape>): Shape[] {
        const shape = shapes.get(shapeId);
        if (!shape) return [];

        const siblings: Shape[] = [];
        for (const [id, s] of shapes) {
            if (id !== shapeId && s.parentId === shape.parentId) {
                siblings.push(s);
            }
        }

        return siblings;
    }

    /**
     * Flatten hierarchy to ordered array for rendering
     */
    flattenHierarchy(hierarchy: HierarchyNode): string[] {
        const result: string[] = [];

        const traverse = (node: HierarchyNode) => {
            if (node.shapeId) {
                result.push(node.shapeId);
            }
            for (const child of node.children) {
                traverse(child);
            }
        };

        traverse(hierarchy);
        return result;
    }

    /**
     * Convert absolute coordinates to relative (to parent)
     */
    toRelativeCoords(
        shape: Shape,
        parent: Shape
    ): { x: number; y: number } {
        return {
            x: shape.x - parent.x,
            y: shape.y - parent.y,
        };
    }

    /**
     * Convert relative coordinates to absolute (from parent)
     */
    toAbsoluteCoords(
        relativeX: number,
        relativeY: number,
        parent: Shape
    ): { x: number; y: number } {
        return {
            x: relativeX + parent.x,
            y: relativeY + parent.y,
        };
    }
}

// Export singleton
export const hierarchyManager = new HierarchyManager();
