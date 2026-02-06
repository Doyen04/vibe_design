// ============================================
// VIBE DESIGN - Layout Engine
// Calculates child positions based on layout mode (free, flex, grid)
// ============================================

import type { Shape, FlexLayoutSettings, GridLayoutSettings } from '../types';

export interface CalculatedPosition {
    x: number;
    y: number;
    width?: number;  // Optional override for stretch behavior
    height?: number;
}

export interface LayoutResult {
    positions: Map<string, CalculatedPosition>;
}

/**
 * Calculate positions for all children based on parent's layout mode
 */
export function calculateChildPositions(
    parent: Shape,
    children: Shape[]
): LayoutResult {
    const layout = parent.layout;
    
    // Default to free positioning if no layout or free mode
    if (!layout || layout.mode === 'free') {
        return calculateFreeLayout(children);
    }
    
    if (layout.mode === 'flex' && layout.flex) {
        return calculateFlexLayout(parent, children, layout.flex);
    }
    
    if (layout.mode === 'grid' && layout.grid) {
        return calculateGridLayout(parent, children, layout.grid);
    }
    
    return calculateFreeLayout(children);
}

/**
 * Free layout - children keep their original positions (absolute positioning)
 */
function calculateFreeLayout(children: Shape[]): LayoutResult {
    const positions = new Map<string, CalculatedPosition>();
    
    for (const child of children) {
        positions.set(child.id, {
            x: child.x,
            y: child.y,
        });
    }
    
    return { positions };
}

/**
 * Flex layout - arranges children in a row or column with gaps
 */
function calculateFlexLayout(
    parent: Shape,
    children: Shape[],
    flex: FlexLayoutSettings
): LayoutResult {
    const positions = new Map<string, CalculatedPosition>();
    
    if (children.length === 0) {
        return { positions };
    }
    
    const { direction, justifyContent, alignItems, gap, padding } = flex;
    
    // Calculate available space
    const availableWidth = parent.width - padding.left - padding.right;
    const availableHeight = parent.height - padding.top - padding.bottom;
    
    // Determine main and cross axis based on direction
    const isRow = direction === 'row' || direction === 'row-reverse';
    const isReverse = direction === 'row-reverse' || direction === 'column-reverse';
    
    // Calculate total children size along main axis
    let totalMainSize = 0;
    let totalCrossSize = 0;
    
    for (const child of children) {
        if (isRow) {
            totalMainSize += child.width;
            totalCrossSize = Math.max(totalCrossSize, child.height);
        } else {
            totalMainSize += child.height;
            totalCrossSize = Math.max(totalCrossSize, child.width);
        }
    }
    
    // Add gaps
    totalMainSize += gap * (children.length - 1);
    
    const mainAxisSize = isRow ? availableWidth : availableHeight;
    const crossAxisSize = isRow ? availableHeight : availableWidth;
    
    // Calculate starting position based on justifyContent
    let mainStart = 0;
    let mainGap = gap;
    
    switch (justifyContent) {
        case 'flex-start':
            mainStart = 0;
            break;
        case 'flex-end':
            mainStart = mainAxisSize - totalMainSize;
            break;
        case 'center':
            mainStart = (mainAxisSize - totalMainSize) / 2;
            break;
        case 'space-between':
            mainStart = 0;
            mainGap = children.length > 1 
                ? (mainAxisSize - totalMainSize + gap * (children.length - 1)) / (children.length - 1)
                : 0;
            break;
        case 'space-around': {
            const aroundSpace = (mainAxisSize - totalMainSize + gap * (children.length - 1)) / children.length;
            mainStart = aroundSpace / 2;
            mainGap = aroundSpace;
            break;
        }
        case 'space-evenly': {
            const evenSpace = (mainAxisSize - totalMainSize + gap * (children.length - 1)) / (children.length + 1);
            mainStart = evenSpace;
            mainGap = evenSpace;
            break;
        }
    }
    
    // Position each child
    let currentMain = mainStart;
    const orderedChildren = isReverse ? [...children].reverse() : children;
    
    for (const child of orderedChildren) {
        const childMainSize = isRow ? child.width : child.height;
        const childCrossSize = isRow ? child.height : child.width;
        
        // Calculate cross axis position based on alignItems
        let crossPos = 0;
        let stretchSize: number | undefined;
        
        switch (alignItems) {
            case 'flex-start':
                crossPos = 0;
                break;
            case 'flex-end':
                crossPos = crossAxisSize - childCrossSize;
                break;
            case 'center':
                crossPos = (crossAxisSize - childCrossSize) / 2;
                break;
            case 'stretch':
                crossPos = 0;
                stretchSize = crossAxisSize;
                break;
            case 'baseline':
                // For simplicity, treat baseline as flex-start
                crossPos = 0;
                break;
        }
        
        // Set position based on direction
        const pos: CalculatedPosition = isRow
            ? {
                x: padding.left + currentMain,
                y: padding.top + crossPos,
                height: stretchSize,
            }
            : {
                x: padding.left + crossPos,
                y: padding.top + currentMain,
                width: stretchSize,
            };
        
        positions.set(child.id, pos);
        currentMain += childMainSize + mainGap;
    }
    
    return { positions };
}

/**
 * Grid layout - arranges children in a grid
 */
function calculateGridLayout(
    parent: Shape,
    children: Shape[],
    grid: GridLayoutSettings
): LayoutResult {
    const positions = new Map<string, CalculatedPosition>();
    
    if (children.length === 0) {
        return { positions };
    }
    
    const { columns, rows, columnGap, rowGap, padding, autoFlow } = grid;
    
    // Calculate available space
    const availableWidth = parent.width - padding.left - padding.right;
    const availableHeight = parent.height - padding.top - padding.bottom;
    
    // Calculate cell dimensions
    const cellWidth = (availableWidth - columnGap * (columns - 1)) / columns;
    const cellHeight = (availableHeight - rowGap * (rows - 1)) / rows;
    
    // Position each child in grid cells
    for (let i = 0; i < children.length; i++) {
        const child = children[i];
        
        let col: number;
        let row: number;
        
        if (autoFlow === 'column') {
            col = Math.floor(i / rows);
            row = i % rows;
        } else {
            // Default: row flow
            row = Math.floor(i / columns);
            col = i % columns;
        }
        
        // Skip if out of bounds
        if (col >= columns || row >= rows) {
            // Place at original position if out of grid bounds
            positions.set(child.id, { x: child.x, y: child.y });
            continue;
        }
        
        // Calculate position - center child in cell
        const cellX = padding.left + col * (cellWidth + columnGap);
        const cellY = padding.top + row * (cellHeight + rowGap);
        
        // Center the child within the cell
        const x = cellX + (cellWidth - child.width) / 2;
        const y = cellY + (cellHeight - child.height) / 2;
        
        positions.set(child.id, { x, y });
    }
    
    return { positions };
}

/**
 * Get the effective position for a child shape based on parent's layout
 * Returns the calculated position if layout is applied, otherwise returns original
 */
export function getEffectivePosition(
    child: Shape,
    parent: Shape | null,
    allShapes: Map<string, Shape>
): CalculatedPosition {
    // If no parent or parent is not a frame, use original position
    if (!parent || parent.type !== 'frame') {
        return { x: child.x, y: child.y };
    }
    
    // If parent uses free layout, use original position
    if (!parent.layout || parent.layout.mode === 'free') {
        return { x: child.x, y: child.y };
    }
    
    // Get all siblings (children of the parent)
    const siblings = parent.children
        .map(id => allShapes.get(id))
        .filter(Boolean) as Shape[];
    
    // Calculate layout positions
    const result = calculateChildPositions(parent, siblings);
    
    // Return calculated position or fallback to original
    return result.positions.get(child.id) || { x: child.x, y: child.y };
}
