// ============================================
// VIBE DESIGN - Simple Heuristic Suggestion Engine
// Rule-based suggestions for design autocomplete
// ============================================

import { v4 as uuidv4 } from 'uuid';
import type { Shape, Suggestion, SuggestedShape, SemanticLabel } from '../types';

// ============================================
// Simple Suggestion Engine
// ============================================

export class SimpleSuggestionEngine {
    generateSuggestions(
        shapes: Shape[],
        selectedIds: string[],
        canvasWidth: number,
        canvasHeight: number
    ): Suggestion[] {
        console.log('[Heuristic] Generating suggestions for', shapes.length, 'shapes');
        
        const suggestions: Suggestion[] = [];

        // Empty canvas - suggest a starting container
        if (shapes.length === 0) {
            suggestions.push(this.suggestStarterContainer(canvasWidth, canvasHeight));
            return suggestions;
        }

        // Get the last selected or most recent shape
        const triggerShape = selectedIds.length > 0
            ? shapes.find(s => s.id === selectedIds[selectedIds.length - 1])
            : shapes[shapes.length - 1];

        if (!triggerShape) {
            return suggestions;
        }

        // Generate simple contextual suggestions
        suggestions.push(
            this.suggestShapeToRight(triggerShape, shapes, canvasWidth),
            this.suggestShapeBelow(triggerShape, shapes, canvasHeight),
        );

        // If shape is large, suggest nested content
        if (triggerShape.width > 200 && triggerShape.height > 150) {
            suggestions.push(this.suggestNestedElement(triggerShape));
        }

        // Filter out invalid suggestions and sort by priority
        return suggestions
            .filter(s => s.shapes.length > 0)
            .sort((a, b) => b.priority - a.priority)
            .slice(0, 3); // Max 3 suggestions
    }

    private suggestStarterContainer(canvasWidth: number, canvasHeight: number): Suggestion {
        const padding = 50;
        return {
            id: uuidv4(),
            type: 'add-shape',
            title: 'Add Container',
            description: 'Start with a main container',
            confidence: 'high',
            priority: 100,
            shapes: [{
                type: 'rect',
                x: padding,
                y: padding,
                width: Math.min(800, canvasWidth - padding * 2),
                height: Math.min(600, canvasHeight - padding * 2),
                label: 'container' as SemanticLabel,
                parentId: null,
                fill: '#FFFFFF',
                stroke: '#E0E0E0',
                isGhost: true,
            }],
            context: {
                triggerShapeId: null,
                triggerAction: 'create',
                parentShapeId: null,
                relatedShapeIds: [],
            },
            timestamp: Date.now(),
        };
    }

    private suggestShapeToRight(
        shape: Shape,
        allShapes: Shape[],
        canvasWidth: number
    ): Suggestion {
        const gap = 20;
        const newX = shape.x + shape.width + gap;
        
        // Check if fits on canvas
        const fits = newX + shape.width <= canvasWidth;
        
        // Check for overlap with existing shapes
        const overlaps = allShapes.some(s => 
            s.id !== shape.id &&
            this.shapesOverlap(
                { x: newX, y: shape.y, width: shape.width, height: shape.height },
                s
            )
        );

        return {
            id: uuidv4(),
            type: 'add-shape',
            title: 'Add to Right',
            description: 'Add a similar shape to the right',
            confidence: fits && !overlaps ? 'high' : 'low',
            priority: fits && !overlaps ? 70 : 20,
            shapes: fits ? [{
                type: shape.type as 'rect' | 'circle',
                x: newX,
                y: shape.y,
                width: shape.width,
                height: shape.height,
                label: 'unknown' as SemanticLabel,
                parentId: null,
                fill: '#E3F2FD',
                stroke: '#2196F3',
                isGhost: true,
            }] : [],
            context: {
                triggerShapeId: shape.id,
                triggerAction: 'create',
                parentShapeId: null,
                relatedShapeIds: [shape.id],
            },
            timestamp: Date.now(),
        };
    }

    private suggestShapeBelow(
        shape: Shape,
        allShapes: Shape[],
        canvasHeight: number
    ): Suggestion {
        const gap = 20;
        const newY = shape.y + shape.height + gap;
        
        // Check if fits on canvas
        const fits = newY + shape.height <= canvasHeight;
        
        // Check for overlap
        const overlaps = allShapes.some(s => 
            s.id !== shape.id &&
            this.shapesOverlap(
                { x: shape.x, y: newY, width: shape.width, height: shape.height },
                s
            )
        );

        return {
            id: uuidv4(),
            type: 'add-shape',
            title: 'Add Below',
            description: 'Add a similar shape below',
            confidence: fits && !overlaps ? 'high' : 'low',
            priority: fits && !overlaps ? 65 : 15,
            shapes: fits ? [{
                type: shape.type as 'rect' | 'circle',
                x: shape.x,
                y: newY,
                width: shape.width,
                height: shape.height,
                label: 'unknown' as SemanticLabel,
                parentId: null,
                fill: '#E8F5E9',
                stroke: '#4CAF50',
                isGhost: true,
            }] : [],
            context: {
                triggerShapeId: shape.id,
                triggerAction: 'create',
                parentShapeId: null,
                relatedShapeIds: [shape.id],
            },
            timestamp: Date.now(),
        };
    }

    private suggestNestedElement(shape: Shape): Suggestion {
        const padding = 20;
        return {
            id: uuidv4(),
            type: 'add-shape',
            title: 'Add Inside',
            description: 'Add a nested element',
            confidence: 'medium',
            priority: 60,
            shapes: [{
                type: 'rect',
                x: shape.x + padding,
                y: shape.y + padding,
                width: shape.width - padding * 2,
                height: Math.min(60, shape.height * 0.3),
                label: 'unknown' as SemanticLabel,
                parentId: shape.id,
                fill: '#FFF3E0',
                stroke: '#FF9800',
                isGhost: true,
            }],
            context: {
                triggerShapeId: shape.id,
                triggerAction: 'create',
                parentShapeId: shape.id,
                relatedShapeIds: [],
            },
            timestamp: Date.now(),
        };
    }

    private shapesOverlap(
        a: { x: number; y: number; width: number; height: number },
        b: { x: number; y: number; width: number; height: number }
    ): boolean {
        return !(
            a.x + a.width < b.x ||
            b.x + b.width < a.x ||
            a.y + a.height < b.y ||
            b.y + b.height < a.y
        );
    }
}

// Singleton instance
export const suggestionEngine = new SimpleSuggestionEngine();

export default suggestionEngine;
