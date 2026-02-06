// ============================================
// VIBE DESIGN - Core Type Definitions
// ============================================

// Shape Types
// Note: Only 'frame' can nest other shapes. 'rect' and 'circle' cannot contain children.
export type ShapeType = 'rect' | 'circle' | 'frame';

// Layout Mode Types for Frames
export type LayoutMode = 'free' | 'flex' | 'grid';

// Flex Layout Properties
export type FlexDirection = 'row' | 'column' | 'row-reverse' | 'column-reverse';
export type FlexJustify = 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' | 'space-evenly';
export type FlexAlign = 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline';
export type FlexWrap = 'nowrap' | 'wrap' | 'wrap-reverse';

export interface FlexLayoutSettings {
    direction: FlexDirection;
    justifyContent: FlexJustify;
    alignItems: FlexAlign;
    wrap: FlexWrap;
    gap: number;
    rowGap?: number;
    columnGap?: number;
    padding: { top: number; right: number; bottom: number; left: number };
}

// Grid Layout Properties
export interface GridLayoutSettings {
    columns: number;
    rows: number;
    columnGap: number;
    rowGap: number;
    autoFlow: 'row' | 'column' | 'dense';
    padding: { top: number; right: number; bottom: number; left: number };
    cellWidth?: number | 'auto';  // auto means equal distribution
    cellHeight?: number | 'auto';
}

// Combined Layout Settings
export interface LayoutSettings {
    mode: LayoutMode;
    flex?: FlexLayoutSettings;
    grid?: GridLayoutSettings;
}

// Semantic labels for shapes (AI-detected meanings)
export type SemanticLabel =
    | 'page-container'
    | 'header'
    | 'footer'
    | 'sidebar'
    | 'nav-menu'
    | 'card'
    | 'card-grid'
    | 'avatar'
    | 'logo'
    | 'button'
    | 'icon'
    | 'text-block'
    | 'image-placeholder'
    | 'input-field'
    | 'hero-section'
    | 'content-area'
    | 'modal'
    | 'unknown';

// Base shape interface
export interface Shape {
    id: string;
    type: ShapeType;
    x: number;
    y: number;
    width: number;
    height: number;
    parentId: string | null;
    children: string[];
    zIndex: number;
    label: SemanticLabel;
    name: string;
    fill: string;
    stroke: string;
    strokeWidth: number;
    opacity: number;
    rotation: number;
    visible: boolean;
    locked: boolean;
    // For circles, width and height are treated as diameter

    // Layout settings (only applicable for frames)
    layout?: LayoutSettings;
}

// Shape creation input (partial shape for creating new shapes)
export interface ShapeCreateInput {
    type: ShapeType;
    x: number;
    y: number;
    width: number;
    height: number;
    parentId?: string | null;
    label?: SemanticLabel;
    name?: string;
    fill?: string;
    stroke?: string;
}

// ============================================
// AI Suggestion Types
// ============================================

export type SuggestionType =
    | 'add-shape'
    | 'complete-pattern'
    | 'align-shapes'
    | 'create-grid'
    | 'semantic-completion'
    | 'ai-suggestion';

export type SuggestionConfidence = 'high' | 'medium' | 'low';

export interface Suggestion {
    id: string;
    type: SuggestionType;
    title: string;
    description: string;
    confidence: SuggestionConfidence;
    priority: number; // Higher = more relevant
    shapes: SuggestedShape[];
    context: SuggestionContext;
    timestamp: number;
}

export interface SuggestedShape {
    type: ShapeType;
    x: number;
    y: number;
    width: number;
    height: number;
    label: SemanticLabel;
    parentId: string | null;
    fill?: string;
    stroke?: string;
    isGhost?: boolean;
}

export interface SuggestionContext {
    triggerShapeId: string | null;
    triggerAction: 'create' | 'resize' | 'move' | 'nest' | 'pattern';
    parentShapeId: string | null;
    relatedShapeIds: string[];
    patternType?: PatternType;
}

export type PatternType =
    | 'horizontal-row'
    | 'vertical-column'
    | 'grid'
    | 'centered'
    | 'distributed';

// ============================================
// AI Provider Interface (Pluggable)
// ============================================

export interface AIProvider {
    name: string;
    version: string;

    // Core methods
    analyzeLayout(shapes: Shape[]): LayoutAnalysis;
    generateSuggestions(context: AnalysisContext): Suggestion[];
    rankSuggestions(suggestions: Suggestion[]): Suggestion[];

    // Optional LLM integration
    isLLMEnabled?: boolean;
    llmAnalyze?(shapes: Shape[], prompt?: string): Promise<Suggestion[]>;
}

export interface LayoutAnalysis {
    shapes: ShapeAnalysis[];
    patterns: DetectedPattern[];
    hierarchy: HierarchyNode;
    semanticMap: Map<string, SemanticLabel>;
}

export interface ShapeAnalysis {
    shapeId: string;
    semanticLabel: SemanticLabel;
    relativePosition: RelativePosition;
    sizeRatio: SizeRatio;
    alignmentInfo: AlignmentInfo;
}

export interface RelativePosition {
    inParent: {
        top: number;    // 0-1 ratio
        left: number;
        bottom: number;
        right: number;
    };
    inCanvas: {
        x: number;
        y: number;
    };
}

export interface SizeRatio {
    toParent: { width: number; height: number };
    toCanvas: { width: number; height: number };
}

export interface AlignmentInfo {
    horizontalAlign: 'left' | 'center' | 'right' | 'stretch';
    verticalAlign: 'top' | 'center' | 'bottom' | 'stretch';
    snappedTo: string[];
}

export interface DetectedPattern {
    type: PatternType;
    shapeIds: string[];
    regularity: number; // 0-1 how regular the pattern is
    suggestedExpansion?: SuggestedShape[];
}

export interface HierarchyNode {
    shapeId: string | null; // null for root canvas
    children: HierarchyNode[];
    depth: number;
}

export interface AnalysisContext {
    allShapes: Shape[];
    selectedShapeIds: string[];
    recentActions: DesignAction[];
    canvasSize: { width: number; height: number };
    zoomLevel: number;
}

// ============================================
// Canvas & Interaction Types
// ============================================

export type ToolType = 'select' | 'rect' | 'circle' | 'frame' | 'pan' | 'zoom';

export interface CanvasState {
    zoom: number;
    panX: number;
    panY: number;
    width: number;
    height: number;
}

export interface SelectionBox {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface SnapGuide {
    type: 'horizontal' | 'vertical';
    position: number;
    start: number;
    end: number;
    sourceShapeId: string;
    targetShapeId: string;
}

export interface AlignmentGuide extends SnapGuide {
    alignType: 'edge' | 'center' | 'distribute';
}

// ============================================
// History & Actions
// ============================================

export type DesignActionType =
    | 'create-shape'
    | 'delete-shape'
    | 'move-shape'
    | 'resize-shape'
    | 'update-shape'
    | 'nest-shape'
    | 'unnest-shape'
    | 'reorder-shapes'
    | 'group-shapes'
    | 'ungroup-shapes';

export interface DesignAction {
    type: DesignActionType;
    timestamp: number;
    shapeId: string;
    previousState?: Partial<Shape>;
    newState?: Partial<Shape>;
}

export interface HistoryEntry {
    id: string;
    actions: DesignAction[];
    timestamp: number;
    description: string;
}

// ============================================
// UI State Types
// ============================================

export interface PanelState {
    leftPanelOpen: boolean;
    rightPanelOpen: boolean;
    leftPanelWidth: number;
    rightPanelWidth: number;
}

export interface ToastMessage {
    id: string;
    type: 'info' | 'success' | 'warning' | 'error';
    message: string;
    duration?: number;
}

// ============================================
// Export Types
// ============================================

export interface ExportOptions {
    format: 'png' | 'svg' | 'json';
    scale: number;
    includeBackground: boolean;
    selectedOnly: boolean;
}
