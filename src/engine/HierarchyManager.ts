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
     * Only frames can contain other shapes - rect and circle cannot nest
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

        // Only frames can contain other shapes
        if (parent.type !== 'frame') return false;

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
     * Only frames can be parents - rect and circle cannot contain children
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

            // Only frames can be parents
            if (candidate.type !== 'frame') continue;

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

    /**
     * Rotate a point around a center point
     */
    rotatePoint(
        px: number,
        py: number,
        cx: number,
        cy: number,
        angleDeg: number
    ): { x: number; y: number } {
        const angleRad = (angleDeg * Math.PI) / 180;
        const cos = Math.cos(angleRad);
        const sin = Math.sin(angleRad);
        
        const dx = px - cx;
        const dy = py - cy;
        
        return {
            x: cx + dx * cos - dy * sin,
            y: cy + dx * sin + dy * cos,
        };
    }

    /**
     * Get the center point of a shape
     */
    getShapeCenter(shape: Shape): { x: number; y: number } {
        return {
            x: shape.x + shape.width / 2,
            y: shape.y + shape.height / 2,
        };
    }

    /**
     * Update positions of all descendants when parent rotates
     * Children rotate around the parent's center while maintaining relative position
     */
    getDescendantRotationUpdates(
        parentId: string,
        deltaRotation: number,
        parentCenterX: number,
        parentCenterY: number,
        shapes: Map<string, Shape>
    ): { id: string; x: number; y: number; rotation: number }[] {
        const updates: { id: string; x: number; y: number; rotation: number }[] = [];
        const descendants = this.getDescendants(parentId, shapes);

        for (const descendant of descendants) {
            // Get the center of the descendant shape
            const childCenter = this.getShapeCenter(descendant);
            
            // Rotate the child's center around the parent's center
            const rotatedCenter = this.rotatePoint(
                childCenter.x,
                childCenter.y,
                parentCenterX,
                parentCenterY,
                deltaRotation
            );
            
            // Calculate new top-left position from the rotated center
            const newX = rotatedCenter.x - descendant.width / 2;
            const newY = rotatedCenter.y - descendant.height / 2;
            
            // Also update the child's own rotation
            const newRotation = descendant.rotation + deltaRotation;

            updates.push({
                id: descendant.id,
                x: newX,
                y: newY,
                rotation: newRotation,
            });
        }

        return updates;
    }

    /**
     * Get combined transform updates for descendants when parent moves and/or rotates
     */
    getDescendantTransformUpdates(
        parentId: string,
        deltaX: number,
        deltaY: number,
        deltaRotation: number,
        parentCenterX: number,
        parentCenterY: number,
        shapes: Map<string, Shape>
    ): { id: string; x: number; y: number; rotation: number }[] {
        const updates: { id: string; x: number; y: number; rotation: number }[] = [];
        const descendants = this.getDescendants(parentId, shapes);

        for (const descendant of descendants) {
            let newX = descendant.x;
            let newY = descendant.y;
            let newRotation = descendant.rotation;

            // First apply translation
            newX += deltaX;
            newY += deltaY;

            // Then apply rotation around the new parent center (after translation)
            if (deltaRotation !== 0) {
                const newParentCenterX = parentCenterX + deltaX;
                const newParentCenterY = parentCenterY + deltaY;
                
                // Get the center of the descendant shape after translation
                const childCenterX = newX + descendant.width / 2;
                const childCenterY = newY + descendant.height / 2;
                
                // Rotate the child's center around the parent's center
                const rotatedCenter = this.rotatePoint(
                    childCenterX,
                    childCenterY,
                    newParentCenterX,
                    newParentCenterY,
                    deltaRotation
                );
                
                // Calculate new top-left position from the rotated center
                newX = rotatedCenter.x - descendant.width / 2;
                newY = rotatedCenter.y - descendant.height / 2;
                
                // Also update the child's own rotation
                newRotation += deltaRotation;
            }

            updates.push({
                id: descendant.id,
                x: newX,
                y: newY,
                rotation: newRotation,
            });
        }

        return updates;
    }

    /**
     * Convert a point from world coordinates to parent's local coordinates
     * accounting for parent's rotation
     */
    worldToLocal(
        worldX: number,
        worldY: number,
        parent: Shape
    ): { x: number; y: number } {
        const parentCenterX = parent.x + parent.width / 2;
        const parentCenterY = parent.y + parent.height / 2;
        
        // Rotate point around parent center by negative parent rotation
        const rotated = this.rotatePoint(
            worldX,
            worldY,
            parentCenterX,
            parentCenterY,
            -parent.rotation
        );
        
        // Convert to local coordinates (relative to parent's top-left in local space)
        return {
            x: rotated.x - parent.x,
            y: rotated.y - parent.y,
        };
    }

    /**
     * Convert a point from parent's local coordinates to world coordinates
     * accounting for parent's rotation
     */
    localToWorld(
        localX: number,
        localY: number,
        parent: Shape
    ): { x: number; y: number } {
        // First convert to absolute position (before rotation)
        const absX = parent.x + localX;
        const absY = parent.y + localY;
        
        const parentCenterX = parent.x + parent.width / 2;
        const parentCenterY = parent.y + parent.height / 2;
        
        // Rotate point around parent center by parent rotation
        return this.rotatePoint(
            absX,
            absY,
            parentCenterX,
            parentCenterY,
            parent.rotation
        );
    }

    /**
     * Get descendant updates when parent is resized while rotated
     * This properly handles the case where a rotated parent changes size
     */
    getDescendantResizeUpdates(
        parentId: string,
        oldParent: Shape,
        newParent: { x: number; y: number; width: number; height: number; rotation: number },
        shapes: Map<string, Shape>
    ): { id: string; x: number; y: number; rotation: number }[] {
        const updates: { id: string; x: number; y: number; rotation: number }[] = [];
        const descendants = this.getDescendants(parentId, shapes);

        // Calculate old and new parent centers
        const oldCenterX = oldParent.x + oldParent.width / 2;
        const oldCenterY = oldParent.y + oldParent.height / 2;
        const newCenterX = newParent.x + newParent.width / 2;
        const newCenterY = newParent.y + newParent.height / 2;

        // Delta rotation
        const deltaRotation = newParent.rotation - oldParent.rotation;

        for (const descendant of descendants) {
            // Get child's center in world coordinates
            const childCenterX = descendant.x + descendant.width / 2;
            const childCenterY = descendant.y + descendant.height / 2;

            // Convert child center to parent's local coordinate system
            // First rotate around old parent center to undo parent's rotation
            const localChild = this.rotatePoint(
                childCenterX,
                childCenterY,
                oldCenterX,
                oldCenterY,
                -oldParent.rotation
            );

            // Calculate relative position as fraction of parent size
            const relativeX = (localChild.x - oldParent.x) / oldParent.width;
            const relativeY = (localChild.y - oldParent.y) / oldParent.height;

            // Apply same relative position to new parent size
            const newLocalX = newParent.x + relativeX * newParent.width;
            const newLocalY = newParent.y + relativeY * newParent.height;

            // Rotate back to world coordinates using new parent center and rotation
            const newWorldPos = this.rotatePoint(
                newLocalX,
                newLocalY,
                newCenterX,
                newCenterY,
                newParent.rotation
            );

            // Calculate new top-left from center
            const newX = newWorldPos.x - descendant.width / 2;
            const newY = newWorldPos.y - descendant.height / 2;

            // Update child rotation by delta
            const newRotation = descendant.rotation + deltaRotation;

            updates.push({
                id: descendant.id,
                x: newX,
                y: newY,
                rotation: newRotation,
            });
        }

        return updates;
    }

    /**
     * Calculate the world (absolute) transform for a shape considering all parent transforms
     * This is useful for rendering children with inherited transforms
     */
    getWorldTransform(
        shapeId: string,
        shapes: Map<string, Shape>
    ): { x: number; y: number; rotation: number; scaleX: number; scaleY: number } {
        const shape = shapes.get(shapeId);
        if (!shape) {
            return { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 };
        }

        // Get all ancestors from bottom to top
        const ancestors = this.getAncestors(shapeId, shapes).reverse();
        
        // Start with identity transform
        let worldX = shape.x;
        let worldY = shape.y;
        let worldRotation = shape.rotation;

        // Apply each ancestor's transform
        for (const ancestor of ancestors) {
            // Rotate around ancestor's center
            if (ancestor.rotation !== 0) {
                const ancestorCenter = this.getShapeCenter(ancestor);
                const shapeCenter = { x: worldX + shape.width / 2, y: worldY + shape.height / 2 };
                const rotated = this.rotatePoint(
                    shapeCenter.x,
                    shapeCenter.y,
                    ancestorCenter.x,
                    ancestorCenter.y,
                    ancestor.rotation
                );
                worldX = rotated.x - shape.width / 2;
                worldY = rotated.y - shape.height / 2;
                worldRotation += ancestor.rotation;
            }
        }

        return {
            x: worldX,
            y: worldY,
            rotation: worldRotation,
            scaleX: 1,
            scaleY: 1,
        };
    }
}

// Export singleton
export const hierarchyManager = new HierarchyManager();
