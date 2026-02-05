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
