// ============================================
// VIBE DESIGN - Suggestion Store (Zustand)
// ============================================

import { create } from 'zustand';
import type { Suggestion, SuggestedShape } from '../types';

interface SuggestionStoreState {
  // Suggestions
  suggestions: Suggestion[];
  activeSuggestion: Suggestion | null;
  
  // Settings
  suggestionsEnabled: boolean;
  autoShowSuggestions: boolean;
  suggestionDebounceMs: number;
  
  // Ghost preview shapes
  ghostShapes: SuggestedShape[];
  
  // Actions
  setSuggestions: (suggestions: Suggestion[]) => void;
  addSuggestion: (suggestion: Suggestion) => void;
  clearSuggestions: () => void;
  
  setActiveSuggestion: (suggestion: Suggestion | null) => void;
  
  acceptSuggestion: (suggestionId: string) => SuggestedShape[] | null;
  rejectSuggestion: (suggestionId: string) => void;
  
  setGhostShapes: (shapes: SuggestedShape[]) => void;
  clearGhostShapes: () => void;
  
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
  ghostShapes: [],
  
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
  
  // Settings
  setSuggestionsEnabled: (suggestionsEnabled) => {
    set({ suggestionsEnabled });
    if (!suggestionsEnabled) {
      set({ suggestions: [], activeSuggestion: null, ghostShapes: [] });
    }
  },
  setAutoShowSuggestions: (autoShowSuggestions) => set({ autoShowSuggestions }),
}));
