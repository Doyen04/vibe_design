// Engine exports
export {
    SimpleSuggestionEngine,
    suggestionEngine
} from './SuggestionEngine';
export { SnapEngine, snapEngine } from './SnapEngine';
export { HierarchyManager, hierarchyManager } from './HierarchyManager';
export {
    initializeGemini,
    isGeminiInitialized,
    validateApiKey,
    generateGeminiSuggestions,
    getRateLimitStatus,
    setDesignIntent,
    getDesignIntent,
} from './GeminiSuggestionEngine';
export type { RateLimitStatus } from './GeminiSuggestionEngine';

// Layout engine for flex/grid layouts
export {
    calculateChildPositions,
    getEffectivePosition,
} from './LayoutEngine';
export type { CalculatedPosition, LayoutResult } from './LayoutEngine';

// Transform utilities for coordinate system conversions
export {
    transformMatrix,
    identityMatrix,
    translationMatrix,
    rotationMatrix,
    scaleMatrix,
    multiplyMatrices,
    invertMatrix,
    transformPoint,
    createTransformMatrix,
    createSimpleTransformMatrix,
    getWorldMatrix,
    worldToLocal,
    localToWorld,
    rotatePointAroundCenter,
    getPositionFromMatrix,
    getRotationFromMatrix,
    getScaleFromMatrix,
    composeTransforms,
    decomposeMatrix,
    degreesToRadians,
    radiansToDegrees,
} from './TransformMatrix';
export type { Matrix2D, Point2D, Transform } from './TransformMatrix';
