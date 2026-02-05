// ============================================
// VIBE DESIGN - Suggestion Store (Zustand)
// ============================================

import { create } from 'zustand';
import type { Suggestion, SuggestedShape } from '../types';

// Position key for tracking used suggestion positions
type PositionKey = string;

const createPositionKey = (x: number, y: number, width: number, height: number): PositionKey => {
    // Round to nearest 10px for fuzzy matching
    const rx = Math.round(x / 10) * 10;
    const ry = Math.round(y / 10) * 10;
    const rw = Math.round(width / 10) * 10;
    const rh = Math.round(height / 10) * 10;
    return `${rx},${ry},${rw},${rh}`;
};

interface SuggestionStoreState {
    // Suggestions
    suggestions: Suggestion[];
    activeSuggestion: Suggestion | null;

    // Settings
    suggestionsEnabled: boolean;
    autoShowSuggestions: boolean;
    suggestionDebounceMs: number;

    // LLM mode settings
    llmEnabled: boolean;
    llmApiKey: string;
    llmLoading: boolean;
    llmError: string | null;

    // Ghost preview shapes
    ghostShapes: SuggestedShape[];

    // Track used/rejected positions to avoid repeats
    usedPositions: Set<PositionKey>;
    rejectedPositions: Set<PositionKey>;

    // Actions
    setSuggestions: (suggestions: Suggestion[]) => void;
    addSuggestion: (suggestion: Suggestion) => void;
    clearSuggestions: () => void;

    setActiveSuggestion: (suggestion: Suggestion | null) => void;

    acceptSuggestion: (suggestionId: string) => SuggestedShape[] | null;
    rejectSuggestion: (suggestionId: string) => void;

    setGhostShapes: (shapes: SuggestedShape[]) => void;
    clearGhostShapes: () => void;

    // LLM settings
    setLlmEnabled: (enabled: boolean) => void;
    setLlmApiKey: (apiKey: string) => void;
    setLlmLoading: (loading: boolean) => void;
    setLlmError: (error: string | null) => void;
    clearLlmError: () => void;

    // Position tracking
    isPositionUsed: (x: number, y: number, width: number, height: number) => boolean;
    markPositionUsed: (x: number, y: number, width: number, height: number) => void;
    markPositionRejected: (x: number, y: number, width: number, height: number) => void;
    clearUsedPositions: () => void;

    // Settings
    setSuggestionsEnabled: (enabled: boolean) => void;
    setAutoShowSuggestions: (enabled: boolean) => void;
}

export const useSuggestionStore = create<SuggestionStoreState>((set, get) => ({
    // Initial state
    suggestions: [],
    activeSuggestion: null,
    suggestionsEnabled: true,
    autoShowSuggestions: true,
    suggestionDebounceMs: 300,
    llmEnabled: false,
    llmApiKey: '',
    llmLoading: false,
    llmError: null,
    ghostShapes: [],
    usedPositions: new Set<PositionKey>(),
    rejectedPositions: new Set<PositionKey>(),

    // Actions
    setSuggestions: (suggestions) => {
        set({ suggestions });
        // Auto-set the first suggestion as active if auto-show is enabled
        if (get().autoShowSuggestions && suggestions.length > 0) {
            set({
                activeSuggestion: suggestions[0],
                ghostShapes: suggestions[0].shapes,
            });
        }
    },

    addSuggestion: (suggestion) => {
        set((state) => ({
            suggestions: [...state.suggestions, suggestion].sort(
                (a, b) => b.priority - a.priority
            ),
        }));
    },

    clearSuggestions: () => {
        set({
            suggestions: [],
            activeSuggestion: null,
            ghostShapes: [],
        });
    },

    setActiveSuggestion: (suggestion) => {
        set({
            activeSuggestion: suggestion,
            ghostShapes: suggestion?.shapes ?? [],
        });
    },

    acceptSuggestion: (suggestionId) => {
        const suggestion = get().suggestions.find((s) => s.id === suggestionId);
        if (!suggestion) return null;

        const shapes = suggestion.shapes;

        // Remove this suggestion and clear
        set((state) => ({
            suggestions: state.suggestions.filter((s) => s.id !== suggestionId),
            activeSuggestion: null,
            ghostShapes: [],
        }));

        return shapes;
    },

    rejectSuggestion: (suggestionId) => {
        set((state) => {
            const newSuggestions = state.suggestions.filter(
                (s) => s.id !== suggestionId
            );
            const wasActive = state.activeSuggestion?.id === suggestionId;

            return {
                suggestions: newSuggestions,
                activeSuggestion: wasActive
                    ? newSuggestions[0] ?? null
                    : state.activeSuggestion,
                ghostShapes: wasActive
                    ? newSuggestions[0]?.shapes ?? []
                    : state.ghostShapes,
            };
        });
    },

    setGhostShapes: (ghostShapes) => set({ ghostShapes }),
    clearGhostShapes: () => set({ ghostShapes: [] }),

    // Position tracking
    isPositionUsed: (x, y, width, height) => {
        const key = createPositionKey(x, y, width, height);
        const state = get();
        return state.usedPositions.has(key) || state.rejectedPositions.has(key);
    },

    markPositionUsed: (x, y, width, height) => {
        const key = createPositionKey(x, y, width, height);
        set((state) => {
            const newUsed = new Set(state.usedPositions);
            newUsed.add(key);
            return { usedPositions: newUsed };
        });
    },

    markPositionRejected: (x, y, width, height) => {
        const key = createPositionKey(x, y, width, height);
        set((state) => {
            const newRejected = new Set(state.rejectedPositions);
            newRejected.add(key);
            return { rejectedPositions: newRejected };
        });
    },

    clearUsedPositions: () => set({ usedPositions: new Set(), rejectedPositions: new Set() }),

    // LLM settings
    setLlmEnabled: (llmEnabled) => set({ llmEnabled }),
    setLlmApiKey: (llmApiKey) => set({ llmApiKey }),
    setLlmLoading: (llmLoading) => set({ llmLoading }),
    setLlmError: (llmError) => set({ llmError }),
    clearLlmError: () => set({ llmError: null }),

    // Settings
    setSuggestionsEnabled: (suggestionsEnabled) => {
        set({ suggestionsEnabled });
        if (!suggestionsEnabled) {
            set({ suggestions: [], activeSuggestion: null, ghostShapes: [] });
        }
    },
    setAutoShowSuggestions: (autoShowSuggestions) => set({ autoShowSuggestions }),
}));
