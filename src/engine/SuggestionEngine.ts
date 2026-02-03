// ============================================
// VIBE DESIGN - AI Suggestion Engine
// Rule-based implementation with pluggable AI interface
// ============================================

import { v4 as uuidv4 } from 'uuid';
import type {
  Shape,
  Suggestion,
  SuggestedShape,
  AIProvider,
  LayoutAnalysis,
  ShapeAnalysis,
  DetectedPattern,
  HierarchyNode,
  AnalysisContext,
  SemanticLabel,
  PatternType,
} from '../types';

// ============================================
// Layout Analyzer
// ============================================

export class LayoutAnalyzer {
  private canvasWidth: number;
  private canvasHeight: number;

  constructor(canvasWidth = 1920, canvasHeight = 1080) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
  }

  setCanvasSize(width: number, height: number) {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  analyzeShape(shape: Shape, parent?: Shape): ShapeAnalysis {
    const containerWidth = parent?.width ?? this.canvasWidth;
    const containerHeight = parent?.height ?? this.canvasHeight;
    const containerX = parent?.x ?? 0;
    const containerY = parent?.y ?? 0;

    // Calculate relative position within parent/canvas
    const relativeX = shape.x - containerX;
    const relativeY = shape.y - containerY;

    const relativePosition = {
      inParent: {
        top: relativeY / containerHeight,
        left: relativeX / containerWidth,
        bottom: (relativeY + shape.height) / containerHeight,
        right: (relativeX + shape.width) / containerWidth,
      },
      inCanvas: {
        x: shape.x / this.canvasWidth,
        y: shape.y / this.canvasHeight,
      },
    };

    const sizeRatio = {
      toParent: {
        width: shape.width / containerWidth,
        height: shape.height / containerHeight,
      },
      toCanvas: {
        width: shape.width / this.canvasWidth,
        height: shape.height / this.canvasHeight,
      },
    };

    // Determine semantic label based on analysis
    const semanticLabel = this.inferSemanticLabel(
      shape,
      relativePosition,
      sizeRatio,
      parent
    );

    // Determine alignment
    const alignmentInfo = this.analyzeAlignment(
      shape,
      relativePosition,
      sizeRatio
    );

    return {
      shapeId: shape.id,
      semanticLabel,
      relativePosition,
      sizeRatio,
      alignmentInfo,
    };
  }

  private inferSemanticLabel(
    shape: Shape,
    relativePosition: ShapeAnalysis['relativePosition'],
    sizeRatio: ShapeAnalysis['sizeRatio'],
    parent?: Shape
  ): SemanticLabel {
    const { inParent } = relativePosition;
    const { toParent, toCanvas } = sizeRatio;

    // Page container - large shape covering most of canvas
    if (!parent && toCanvas.width > 0.7 && toCanvas.height > 0.7) {
      return 'page-container';
    }

    // Header - top region, wide, short
    if (
      inParent.top < 0.15 &&
      toParent.width > 0.7 &&
      toParent.height < 0.2
    ) {
      return 'header';
    }

    // Footer - bottom region, wide, short
    if (
      inParent.bottom > 0.85 &&
      toParent.width > 0.7 &&
      toParent.height < 0.2
    ) {
      return 'footer';
    }

    // Sidebar - tall, narrow, on left or right edge
    if (
      toParent.height > 0.6 &&
      toParent.width < 0.3 &&
      (inParent.left < 0.1 || inParent.right > 0.9)
    ) {
      return 'sidebar';
    }

    // Avatar/Logo - small circle in header area
    if (
      shape.type === 'circle' &&
      toParent.width < 0.1 &&
      inParent.top < 0.2
    ) {
      return 'avatar';
    }

    // Button - small rectangle
    if (
      shape.type === 'rect' &&
      toParent.width < 0.2 &&
      toParent.height < 0.1
    ) {
      return 'button';
    }

    // Card - medium-sized rectangle
    if (
      shape.type === 'rect' &&
      toParent.width > 0.15 &&
      toParent.width < 0.4 &&
      toParent.height > 0.2 &&
      toParent.height < 0.5
    ) {
      return 'card';
    }

    // Hero section - large, in upper area
    if (
      inParent.top < 0.3 &&
      toParent.width > 0.6 &&
      toParent.height > 0.25
    ) {
      return 'hero-section';
    }

    // Content area - medium to large, centered
    if (
      toParent.width > 0.4 &&
      toParent.height > 0.3 &&
      inParent.left > 0.1 &&
      inParent.right < 0.9
    ) {
      return 'content-area';
    }

    // Icon - small circle
    if (shape.type === 'circle' && toParent.width < 0.08) {
      return 'icon';
    }

    return 'unknown';
  }

  private analyzeAlignment(
    _shape: Shape,
    relativePosition: ShapeAnalysis['relativePosition'],
    sizeRatio: ShapeAnalysis['sizeRatio']
  ): ShapeAnalysis['alignmentInfo'] {
    const { inParent } = relativePosition;
    const { toParent } = sizeRatio;

    let horizontalAlign: 'left' | 'center' | 'right' | 'stretch' = 'left';
    let verticalAlign: 'top' | 'center' | 'bottom' | 'stretch' = 'top';

    // Horizontal alignment
    if (toParent.width > 0.9) {
      horizontalAlign = 'stretch';
    } else if (Math.abs(inParent.left - (1 - inParent.right)) < 0.05) {
      horizontalAlign = 'center';
    } else if (inParent.right > 0.9) {
      horizontalAlign = 'right';
    }

    // Vertical alignment
    if (toParent.height > 0.9) {
      verticalAlign = 'stretch';
    } else if (Math.abs(inParent.top - (1 - inParent.bottom)) < 0.05) {
      verticalAlign = 'center';
    } else if (inParent.bottom > 0.9) {
      verticalAlign = 'bottom';
    }

    return {
      horizontalAlign,
      verticalAlign,
      snappedTo: [],
    };
  }

  detectPatterns(shapes: Shape[]): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];

    // Group shapes by similar size
    const sizeGroups = this.groupBySimilarSize(shapes);

    for (const group of sizeGroups) {
      if (group.length < 2) continue;

      // Check for horizontal row pattern
      const horizontalPattern = this.detectHorizontalRow(group);
      if (horizontalPattern) {
        patterns.push(horizontalPattern);
      }

      // Check for vertical column pattern
      const verticalPattern = this.detectVerticalColumn(group);
      if (verticalPattern) {
        patterns.push(verticalPattern);
      }

      // Check for grid pattern
      const gridPattern = this.detectGrid(group);
      if (gridPattern) {
        patterns.push(gridPattern);
      }
    }

    return patterns;
  }

  private groupBySimilarSize(shapes: Shape[]): Shape[][] {
    const groups: Shape[][] = [];
    const used = new Set<string>();
    const tolerance = 0.1; // 10% size difference tolerance

    for (const shape of shapes) {
      if (used.has(shape.id)) continue;

      const group: Shape[] = [shape];
      used.add(shape.id);

      for (const other of shapes) {
        if (used.has(other.id) || other.type !== shape.type) continue;

        const widthRatio = Math.abs(shape.width - other.width) / shape.width;
        const heightRatio = Math.abs(shape.height - other.height) / shape.height;

        if (widthRatio < tolerance && heightRatio < tolerance) {
          group.push(other);
          used.add(other.id);
        }
      }

      groups.push(group);
    }

    return groups;
  }

  private detectHorizontalRow(shapes: Shape[]): DetectedPattern | null {
    if (shapes.length < 2) return null;

    // Sort by x position
    const sorted = [...shapes].sort((a, b) => a.x - b.x);

    // Check if y positions are similar (within tolerance)
    const avgY = sorted.reduce((sum, s) => sum + s.y, 0) / sorted.length;
    const yTolerance = sorted[0].height * 0.3;

    const inRow = sorted.every((s) => Math.abs(s.y - avgY) < yTolerance);
    if (!inRow) return null;

    // Check spacing regularity
    const gaps: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      gaps.push(sorted[i].x - (sorted[i - 1].x + sorted[i - 1].width));
    }

    const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    const gapVariance = gaps.reduce((sum, g) => sum + Math.abs(g - avgGap), 0) / gaps.length;
    const regularity = 1 - Math.min(gapVariance / avgGap, 1);

    if (regularity < 0.5) return null;

    // Suggest next shape in row
    const lastShape = sorted[sorted.length - 1];
    const suggestedExpansion: SuggestedShape[] = [
      {
        type: lastShape.type,
        x: lastShape.x + lastShape.width + avgGap,
        y: avgY,
        width: lastShape.width,
        height: lastShape.height,
        label: this.inferSemanticLabel(lastShape, 
          { inParent: { top: 0, left: 0, bottom: 0, right: 0 }, inCanvas: { x: 0, y: 0 } },
          { toParent: { width: 0, height: 0 }, toCanvas: { width: 0, height: 0 } }
        ),
        parentId: lastShape.parentId,
        isGhost: true,
      },
    ];

    return {
      type: 'horizontal-row',
      shapeIds: sorted.map((s) => s.id),
      regularity,
      suggestedExpansion,
    };
  }

  private detectVerticalColumn(shapes: Shape[]): DetectedPattern | null {
    if (shapes.length < 2) return null;

    // Sort by y position
    const sorted = [...shapes].sort((a, b) => a.y - b.y);

    // Check if x positions are similar
    const avgX = sorted.reduce((sum, s) => sum + s.x, 0) / sorted.length;
    const xTolerance = sorted[0].width * 0.3;

    const inColumn = sorted.every((s) => Math.abs(s.x - avgX) < xTolerance);
    if (!inColumn) return null;

    // Check spacing regularity
    const gaps: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      gaps.push(sorted[i].y - (sorted[i - 1].y + sorted[i - 1].height));
    }

    const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    const gapVariance = gaps.reduce((sum, g) => sum + Math.abs(g - avgGap), 0) / gaps.length;
    const regularity = 1 - Math.min(gapVariance / (avgGap || 1), 1);

    if (regularity < 0.5) return null;

    // Suggest next shape in column
    const lastShape = sorted[sorted.length - 1];
    const suggestedExpansion: SuggestedShape[] = [
      {
        type: lastShape.type,
        x: avgX,
        y: lastShape.y + lastShape.height + avgGap,
        width: lastShape.width,
        height: lastShape.height,
        label: 'unknown',
        parentId: lastShape.parentId,
        isGhost: true,
      },
    ];

    return {
      type: 'vertical-column',
      shapeIds: sorted.map((s) => s.id),
      regularity,
      suggestedExpansion,
    };
  }

  private detectGrid(shapes: Shape[]): DetectedPattern | null {
    if (shapes.length < 4) return null;

    // Try to find a grid pattern
    const sortedByY = [...shapes].sort((a, b) => a.y - b.y);
    
    // Group by rows
    const rows: Shape[][] = [];
    let currentRow: Shape[] = [];
    const rowTolerance = shapes[0].height * 0.3;

    for (const shape of sortedByY) {
      if (currentRow.length === 0) {
        currentRow.push(shape);
      } else if (Math.abs(shape.y - currentRow[0].y) < rowTolerance) {
        currentRow.push(shape);
      } else {
        rows.push(currentRow.sort((a, b) => a.x - b.x));
        currentRow = [shape];
      }
    }
    if (currentRow.length > 0) {
      rows.push(currentRow.sort((a, b) => a.x - b.x));
    }

    // Check if it's a valid grid (at least 2 rows with similar column count)
    if (rows.length < 2) return null;
    const columnCounts = rows.map((r) => r.length);
    const modeColumns = this.mode(columnCounts);
    if (modeColumns < 2) return null;

    return {
      type: 'grid',
      shapeIds: shapes.map((s) => s.id),
      regularity: 0.8, // Simplified
    };
  }

  private mode(arr: number[]): number {
    const counts = new Map<number, number>();
    for (const n of arr) {
      counts.set(n, (counts.get(n) ?? 0) + 1);
    }
    let maxCount = 0;
    let modeValue = 0;
    for (const [value, count] of counts) {
      if (count > maxCount) {
        maxCount = count;
        modeValue = value;
      }
    }
    return modeValue;
  }

  buildHierarchy(shapes: Shape[]): HierarchyNode {
    const shapeMap = new Map(shapes.map((s) => [s.id, s]));
    const rootShapes = shapes.filter((s) => !s.parentId);

    const buildNode = (shapeId: string | null, depth: number): HierarchyNode => {
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
        children: shape.children.map((childId) => buildNode(childId, depth + 1)),
        depth,
      };
    };

    return buildNode(null, 0);
  }
}

// ============================================
// Rule-Based Suggestion Engine
// ============================================

export class RuleBasedSuggestionEngine implements AIProvider {
  name = 'RuleBasedEngine';
  version = '1.0.0';
  isLLMEnabled = false;

  private analyzer: LayoutAnalyzer;

  constructor(canvasWidth = 1920, canvasHeight = 1080) {
    this.analyzer = new LayoutAnalyzer(canvasWidth, canvasHeight);
  }

  setCanvasSize(width: number, height: number) {
    this.analyzer.setCanvasSize(width, height);
  }

  analyzeLayout(shapes: Shape[]): LayoutAnalysis {
    const shapeMap = new Map(shapes.map((s) => [s.id, s]));
    const shapeAnalyses: ShapeAnalysis[] = [];
    const semanticMap = new Map<string, SemanticLabel>();

    for (const shape of shapes) {
      const parent = shape.parentId ? shapeMap.get(shape.parentId) : undefined;
      const analysis = this.analyzer.analyzeShape(shape, parent);
      shapeAnalyses.push(analysis);
      semanticMap.set(shape.id, analysis.semanticLabel);
    }

    return {
      shapes: shapeAnalyses,
      patterns: this.analyzer.detectPatterns(shapes),
      hierarchy: this.analyzer.buildHierarchy(shapes),
      semanticMap,
    };
  }

  generateSuggestions(context: AnalysisContext): Suggestion[] {
    const suggestions: Suggestion[] = [];
    const { allShapes, selectedShapeIds, canvasSize } = context;

    if (allShapes.length === 0) {
      // Empty canvas - suggest starting with a page container
      suggestions.push(this.suggestPageContainer(canvasSize));
      return suggestions;
    }

    // Analyze current layout
    const analysis = this.analyzeLayout(allShapes);

    // Get the most recently affected shape
    const triggerShapeId = selectedShapeIds[selectedShapeIds.length - 1] ?? null;
    const triggerShape = triggerShapeId
      ? allShapes.find((s) => s.id === triggerShapeId)
      : null;

    if (triggerShape) {
      const shapeAnalysis = analysis.shapes.find(
        (a) => a.shapeId === triggerShape.id
      );

      if (shapeAnalysis) {
        // Generate contextual suggestions based on shape
        const contextualSuggestions = this.generateContextualSuggestions(
          triggerShape,
          shapeAnalysis,
          allShapes,
          analysis
        );
        suggestions.push(...contextualSuggestions);
      }
    }

    // Pattern-based suggestions
    for (const pattern of analysis.patterns) {
      if (pattern.suggestedExpansion && pattern.suggestedExpansion.length > 0) {
        suggestions.push(
          this.createPatternSuggestion(pattern, triggerShapeId)
        );
      }
    }

    return this.rankSuggestions(suggestions);
  }

  private suggestPageContainer(canvasSize: { width: number; height: number }): Suggestion {
    const padding = 40;
    return {
      id: uuidv4(),
      type: 'add-shape',
      title: 'Add Page Container',
      description: 'Start with a main container for your layout',
      confidence: 'high',
      priority: 100,
      shapes: [
        {
          type: 'rect',
          x: padding,
          y: padding,
          width: canvasSize.width - padding * 2,
          height: canvasSize.height - padding * 2,
          label: 'page-container',
          parentId: null,
          fill: '#FFFFFF',
          stroke: '#E0E0E0',
          isGhost: true,
        },
      ],
      context: {
        triggerShapeId: null,
        triggerAction: 'create',
        parentShapeId: null,
        relatedShapeIds: [],
      },
      timestamp: Date.now(),
    };
  }

  private generateContextualSuggestions(
    shape: Shape,
    analysis: ShapeAnalysis,
    allShapes: Shape[],
    layoutAnalysis: LayoutAnalysis
  ): Suggestion[] {
    const suggestions: Suggestion[] = [];
    const { semanticLabel, sizeRatio } = analysis;

    // Based on semantic label, suggest complementary shapes
    switch (semanticLabel) {
      case 'page-container':
        suggestions.push(
          this.suggestHeader(shape),
          this.suggestSidebar(shape),
          this.suggestContentArea(shape)
        );
        break;

      case 'header':
        suggestions.push(
          this.suggestLogo(shape),
          this.suggestNavMenu(shape),
          this.suggestAvatar(shape)
        );
        break;

      case 'content-area':
        suggestions.push(
          this.suggestCardGrid(shape),
          this.suggestHeroSection(shape)
        );
        break;

      case 'card': {
        // Check if there are other cards to form a pattern
        const siblingCards = allShapes.filter(
          (s) =>
            s.id !== shape.id &&
            s.parentId === shape.parentId &&
            layoutAnalysis.semanticMap.get(s.id) === 'card'
        );
        if (siblingCards.length > 0 && siblingCards.length < 4) {
          suggestions.push(this.suggestAdditionalCard(shape, siblingCards));
        }
        break;
      }

      case 'sidebar':
        suggestions.push(this.suggestNavItems(shape));
        break;

      default:
        // Generic suggestions based on size
        if (sizeRatio.toParent.width > 0.5 && sizeRatio.toParent.height > 0.5) {
          suggestions.push(this.suggestNestedContent(shape));
        }
    }

    return suggestions;
  }

  private suggestHeader(parent: Shape): Suggestion {
    const headerHeight = parent.height * 0.08;
    return {
      id: uuidv4(),
      type: 'add-shape',
      title: 'Add Header',
      description: 'Add a header bar at the top',
      confidence: 'high',
      priority: 90,
      shapes: [
        {
          type: 'rect',
          x: parent.x + 10,
          y: parent.y + 10,
          width: parent.width - 20,
          height: headerHeight,
          label: 'header',
          parentId: parent.id,
          fill: '#F5F5F5',
          stroke: '#BDBDBD',
          isGhost: true,
        },
      ],
      context: {
        triggerShapeId: parent.id,
        triggerAction: 'create',
        parentShapeId: parent.id,
        relatedShapeIds: [],
      },
      timestamp: Date.now(),
    };
  }

  private suggestSidebar(parent: Shape): Suggestion {
    const sidebarWidth = parent.width * 0.2;
    const headerHeight = parent.height * 0.08;
    return {
      id: uuidv4(),
      type: 'add-shape',
      title: 'Add Sidebar',
      description: 'Add a sidebar for navigation',
      confidence: 'medium',
      priority: 70,
      shapes: [
        {
          type: 'rect',
          x: parent.x + 10,
          y: parent.y + headerHeight + 20,
          width: sidebarWidth,
          height: parent.height - headerHeight - 30,
          label: 'sidebar',
          parentId: parent.id,
          fill: '#FAFAFA',
          stroke: '#E0E0E0',
          isGhost: true,
        },
      ],
      context: {
        triggerShapeId: parent.id,
        triggerAction: 'create',
        parentShapeId: parent.id,
        relatedShapeIds: [],
      },
      timestamp: Date.now(),
    };
  }

  private suggestContentArea(parent: Shape): Suggestion {
    const sidebarWidth = parent.width * 0.2;
    const headerHeight = parent.height * 0.08;
    const padding = 20;
    return {
      id: uuidv4(),
      type: 'add-shape',
      title: 'Add Content Area',
      description: 'Add a main content area',
      confidence: 'high',
      priority: 85,
      shapes: [
        {
          type: 'rect',
          x: parent.x + sidebarWidth + padding * 2,
          y: parent.y + headerHeight + padding,
          width: parent.width - sidebarWidth - padding * 3,
          height: parent.height - headerHeight - padding * 2,
          label: 'content-area',
          parentId: parent.id,
          fill: '#FFFFFF',
          stroke: '#EEEEEE',
          isGhost: true,
        },
      ],
      context: {
        triggerShapeId: parent.id,
        triggerAction: 'create',
        parentShapeId: parent.id,
        relatedShapeIds: [],
      },
      timestamp: Date.now(),
    };
  }

  private suggestLogo(header: Shape): Suggestion {
    const logoSize = header.height * 0.6;
    return {
      id: uuidv4(),
      type: 'add-shape',
      title: 'Add Logo',
      description: 'Add a logo to the header',
      confidence: 'high',
      priority: 80,
      shapes: [
        {
          type: 'circle',
          x: header.x + 20,
          y: header.y + (header.height - logoSize) / 2,
          width: logoSize,
          height: logoSize,
          label: 'logo',
          parentId: header.id,
          fill: '#2196F3',
          stroke: '#1976D2',
          isGhost: true,
        },
      ],
      context: {
        triggerShapeId: header.id,
        triggerAction: 'create',
        parentShapeId: header.id,
        relatedShapeIds: [],
      },
      timestamp: Date.now(),
    };
  }

  private suggestNavMenu(header: Shape): Suggestion {
    const navItemWidth = 80;
    const navItemHeight = header.height * 0.4;
    const startX = header.x + header.width * 0.3;
    const y = header.y + (header.height - navItemHeight) / 2;
    const gap = 20;

    const shapes: SuggestedShape[] = [];
    for (let i = 0; i < 4; i++) {
      shapes.push({
        type: 'rect',
        x: startX + i * (navItemWidth + gap),
        y,
        width: navItemWidth,
        height: navItemHeight,
        label: 'nav-menu',
        parentId: header.id,
        fill: '#E3F2FD',
        stroke: '#90CAF9',
        isGhost: true,
      });
    }

    return {
      id: uuidv4(),
      type: 'add-shape',
      title: 'Add Navigation Menu',
      description: 'Add navigation items to the header',
      confidence: 'medium',
      priority: 75,
      shapes,
      context: {
        triggerShapeId: header.id,
        triggerAction: 'create',
        parentShapeId: header.id,
        relatedShapeIds: [],
        patternType: 'horizontal-row',
      },
      timestamp: Date.now(),
    };
  }

  private suggestAvatar(header: Shape): Suggestion {
    const avatarSize = header.height * 0.6;
    return {
      id: uuidv4(),
      type: 'add-shape',
      title: 'Add User Avatar',
      description: 'Add an avatar to the header',
      confidence: 'medium',
      priority: 65,
      shapes: [
        {
          type: 'circle',
          x: header.x + header.width - avatarSize - 20,
          y: header.y + (header.height - avatarSize) / 2,
          width: avatarSize,
          height: avatarSize,
          label: 'avatar',
          parentId: header.id,
          fill: '#FCE4EC',
          stroke: '#F48FB1',
          isGhost: true,
        },
      ],
      context: {
        triggerShapeId: header.id,
        triggerAction: 'create',
        parentShapeId: header.id,
        relatedShapeIds: [],
      },
      timestamp: Date.now(),
    };
  }

  private suggestCardGrid(parent: Shape): Suggestion {
    const cardWidth = (parent.width - 80) / 3;
    const cardHeight = cardWidth * 0.75;
    const gap = 20;
    const startX = parent.x + gap;
    const startY = parent.y + gap;

    const shapes: SuggestedShape[] = [];
    for (let i = 0; i < 3; i++) {
      shapes.push({
        type: 'rect',
        x: startX + i * (cardWidth + gap),
        y: startY,
        width: cardWidth,
        height: cardHeight,
        label: 'card',
        parentId: parent.id,
        fill: '#FFFFFF',
        stroke: '#E0E0E0',
        isGhost: true,
      });
    }

    return {
      id: uuidv4(),
      type: 'create-grid',
      title: 'Add Card Grid',
      description: 'Add a grid of content cards',
      confidence: 'high',
      priority: 80,
      shapes,
      context: {
        triggerShapeId: parent.id,
        triggerAction: 'create',
        parentShapeId: parent.id,
        relatedShapeIds: [],
        patternType: 'grid',
      },
      timestamp: Date.now(),
    };
  }

  private suggestHeroSection(parent: Shape): Suggestion {
    return {
      id: uuidv4(),
      type: 'add-shape',
      title: 'Add Hero Section',
      description: 'Add a hero banner section',
      confidence: 'medium',
      priority: 70,
      shapes: [
        {
          type: 'rect',
          x: parent.x + 20,
          y: parent.y + 20,
          width: parent.width - 40,
          height: parent.height * 0.4,
          label: 'hero-section',
          parentId: parent.id,
          fill: '#E8EAF6',
          stroke: '#C5CAE9',
          isGhost: true,
        },
      ],
      context: {
        triggerShapeId: parent.id,
        triggerAction: 'create',
        parentShapeId: parent.id,
        relatedShapeIds: [],
      },
      timestamp: Date.now(),
    };
  }

  private suggestAdditionalCard(shape: Shape, siblings: Shape[]): Suggestion {
    // Calculate position for new card based on pattern
    const allCards = [shape, ...siblings].sort((a, b) => a.x - b.x);
    const lastCard = allCards[allCards.length - 1];
    const gap = allCards.length > 1 
      ? allCards[1].x - (allCards[0].x + allCards[0].width)
      : 20;

    return {
      id: uuidv4(),
      type: 'complete-pattern',
      title: 'Add Another Card',
      description: 'Continue the card pattern',
      confidence: 'high',
      priority: 85,
      shapes: [
        {
          type: 'rect',
          x: lastCard.x + lastCard.width + gap,
          y: lastCard.y,
          width: lastCard.width,
          height: lastCard.height,
          label: 'card',
          parentId: shape.parentId,
          fill: shape.fill,
          stroke: shape.stroke,
          isGhost: true,
        },
      ],
      context: {
        triggerShapeId: shape.id,
        triggerAction: 'pattern',
        parentShapeId: shape.parentId,
        relatedShapeIds: siblings.map((s) => s.id),
        patternType: 'horizontal-row',
      },
      timestamp: Date.now(),
    };
  }

  private suggestNavItems(sidebar: Shape): Suggestion {
    const itemHeight = 40;
    const gap = 8;
    const padding = 12;
    const startY = sidebar.y + 20;

    const shapes: SuggestedShape[] = [];
    for (let i = 0; i < 5; i++) {
      shapes.push({
        type: 'rect',
        x: sidebar.x + padding,
        y: startY + i * (itemHeight + gap),
        width: sidebar.width - padding * 2,
        height: itemHeight,
        label: 'nav-menu',
        parentId: sidebar.id,
        fill: i === 0 ? '#E3F2FD' : '#FAFAFA',
        stroke: i === 0 ? '#2196F3' : '#E0E0E0',
        isGhost: true,
      });
    }

    return {
      id: uuidv4(),
      type: 'add-shape',
      title: 'Add Navigation Items',
      description: 'Add navigation menu items',
      confidence: 'high',
      priority: 75,
      shapes,
      context: {
        triggerShapeId: sidebar.id,
        triggerAction: 'create',
        parentShapeId: sidebar.id,
        relatedShapeIds: [],
        patternType: 'vertical-column',
      },
      timestamp: Date.now(),
    };
  }

  private suggestNestedContent(shape: Shape): Suggestion {
    const padding = 20;
    return {
      id: uuidv4(),
      type: 'add-shape',
      title: 'Add Nested Content',
      description: 'Add content inside this container',
      confidence: 'low',
      priority: 50,
      shapes: [
        {
          type: 'rect',
          x: shape.x + padding,
          y: shape.y + padding,
          width: shape.width - padding * 2,
          height: shape.height * 0.3,
          label: 'unknown',
          parentId: shape.id,
          fill: '#F5F5F5',
          stroke: '#E0E0E0',
          isGhost: true,
        },
      ],
      context: {
        triggerShapeId: shape.id,
        triggerAction: 'create',
        parentShapeId: shape.id,
        relatedShapeIds: [],
      },
      timestamp: Date.now(),
    };
  }

  private createPatternSuggestion(
    pattern: DetectedPattern,
    triggerShapeId: string | null
  ): Suggestion {
    const typeLabels: Record<PatternType, string> = {
      'horizontal-row': 'Continue Row',
      'vertical-column': 'Continue Column',
      'grid': 'Expand Grid',
      'centered': 'Add Centered Element',
      'distributed': 'Distribute Elements',
    };

    return {
      id: uuidv4(),
      type: 'complete-pattern',
      title: typeLabels[pattern.type] || 'Continue Pattern',
      description: `Continue the detected ${pattern.type} pattern`,
      confidence: pattern.regularity > 0.8 ? 'high' : 'medium',
      priority: Math.round(60 + pattern.regularity * 30),
      shapes: pattern.suggestedExpansion ?? [],
      context: {
        triggerShapeId,
        triggerAction: 'pattern',
        parentShapeId: null,
        relatedShapeIds: pattern.shapeIds,
        patternType: pattern.type,
      },
      timestamp: Date.now(),
    };
  }

  rankSuggestions(suggestions: Suggestion[]): Suggestion[] {
    return [...suggestions].sort((a, b) => {
      // Primary: confidence level
      const confidenceOrder = { high: 3, medium: 2, low: 1 };
      const confidenceDiff =
        confidenceOrder[b.confidence] - confidenceOrder[a.confidence];
      if (confidenceDiff !== 0) return confidenceDiff;

      // Secondary: priority
      return b.priority - a.priority;
    });
  }

  // LLM stub for future implementation
  async llmAnalyze(shapes: Shape[]): Promise<Suggestion[]> {
    // This would integrate with an actual LLM API
    console.log('LLM analysis not implemented yet. Using rule-based engine.');
    return this.generateSuggestions({
      allShapes: shapes,
      selectedShapeIds: [],
      recentActions: [],
      canvasSize: { width: 1920, height: 1080 },
      zoomLevel: 1,
    });
  }
}

// Export singleton instance
export const suggestionEngine = new RuleBasedSuggestionEngine();
