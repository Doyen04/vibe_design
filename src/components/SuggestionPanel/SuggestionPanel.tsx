// ============================================
// VIBE DESIGN - Suggestion Panel Component
// Right sidebar showing AI suggestions
// ============================================

import React, { useCallback } from 'react';
import {
  Sparkles,
  Check,
  X,
  Layout,
  Grid,
  Rows,
  Square,
  Circle,
  Star,
} from 'lucide-react';

import { useSuggestionStore, useShapeStore } from '../../store';
import type { Suggestion, SuggestionType, SuggestionConfidence } from '../../types';

import './SuggestionPanel.css';

const getSuggestionIcon = (type: SuggestionType): React.ReactNode => {
  switch (type) {
    case 'add-shape':
      return <Square size={16} />;
    case 'complete-pattern':
      return <Rows size={16} />;
    case 'create-grid':
      return <Grid size={16} />;
    case 'align-shapes':
      return <Layout size={16} />;
    case 'semantic-completion':
      return <Star size={16} />;
    default:
      return <Circle size={16} />;
  }
};

const getConfidenceColor = (confidence: SuggestionConfidence): string => {
  switch (confidence) {
    case 'high':
      return '#4CAF50';
    case 'medium':
      return '#FF9800';
    case 'low':
      return '#9E9E9E';
    default:
      return '#9E9E9E';
  }
};

interface SuggestionCardProps {
  suggestion: Suggestion;
  isActive: boolean;
  onAccept: () => void;
  onReject: () => void;
  onHover: () => void;
}

const SuggestionCard: React.FC<SuggestionCardProps> = ({
  suggestion,
  isActive,
  onAccept,
  onReject,
  onHover,
}) => {
  return (
    <div
      className={`suggestion-card ${isActive ? 'active' : ''}`}
      onMouseEnter={onHover}
    >
      <div className="suggestion-header">
        <div className="suggestion-icon">{getSuggestionIcon(suggestion.type)}</div>
        <div className="suggestion-info">
          <span className="suggestion-title">{suggestion.title}</span>
          <span
            className="suggestion-confidence"
            style={{ color: getConfidenceColor(suggestion.confidence) }}
          >
            {suggestion.confidence} confidence
          </span>
        </div>
      </div>
      <p className="suggestion-description">{suggestion.description}</p>
      <div className="suggestion-preview">
        <span className="preview-label">
          {suggestion.shapes.length} shape{suggestion.shapes.length > 1 ? 's' : ''} suggested
        </span>
      </div>
      <div className="suggestion-actions">
        <button className="action-btn accept" onClick={onAccept} title="Accept (Enter)">
          <Check size={14} />
          Accept
        </button>
        <button className="action-btn reject" onClick={onReject} title="Reject (Esc)">
          <X size={14} />
          Reject
        </button>
      </div>
    </div>
  );
};

const SuggestionPanel: React.FC = () => {
  const suggestions = useSuggestionStore((state) => state.suggestions);
  const activeSuggestion = useSuggestionStore((state) => state.activeSuggestion);
  const suggestionsEnabled = useSuggestionStore((state) => state.suggestionsEnabled);
  const setActiveSuggestion = useSuggestionStore((state) => state.setActiveSuggestion);
  const acceptSuggestion = useSuggestionStore((state) => state.acceptSuggestion);
  const rejectSuggestion = useSuggestionStore((state) => state.rejectSuggestion);
  const setSuggestionsEnabled = useSuggestionStore(
    (state) => state.setSuggestionsEnabled
  );

  const addShape = useShapeStore((state) => state.addShape);
  const nestShape = useShapeStore((state) => state.nestShape);

  const handleAccept = useCallback(
    (suggestionId: string) => {
      const shapes = acceptSuggestion(suggestionId);
      if (shapes) {
        // Add all suggested shapes to the canvas
        shapes.forEach((suggestedShape) => {
          const newShape = addShape({
            type: suggestedShape.type,
            x: suggestedShape.x,
            y: suggestedShape.y,
            width: suggestedShape.width,
            height: suggestedShape.height,
            label: suggestedShape.label,
            fill: suggestedShape.fill,
            stroke: suggestedShape.stroke,
          });

          // Nest if parent is specified
          if (suggestedShape.parentId) {
            nestShape(newShape.id, suggestedShape.parentId);
          }
        });
      }
    },
    [acceptSuggestion, addShape, nestShape]
  );

  const handleReject = useCallback(
    (suggestionId: string) => {
      rejectSuggestion(suggestionId);
    },
    [rejectSuggestion]
  );

  const handleHover = useCallback(
    (suggestion: Suggestion) => {
      setActiveSuggestion(suggestion);
    },
    [setActiveSuggestion]
  );

  if (!suggestionsEnabled) {
    return (
      <div className="suggestion-panel disabled">
        <div className="panel-header">
          <Sparkles size={18} />
          <span>AI Suggestions</span>
        </div>
        <div className="disabled-message">
          <p>AI suggestions are disabled</p>
          <button
            className="enable-btn"
            onClick={() => setSuggestionsEnabled(true)}
          >
            Enable Suggestions
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="suggestion-panel">
      <div className="panel-header">
        <Sparkles size={18} />
        <span>AI Suggestions</span>
        {suggestions.length > 0 && (
          <span className="suggestion-count">{suggestions.length}</span>
        )}
      </div>

      <div className="suggestions-list">
        {suggestions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <Layout size={32} />
            </div>
            <p>Draw shapes to get AI suggestions</p>
            <p className="empty-hint">
              Try drawing a large rectangle to start with a page container
            </p>
          </div>
        ) : (
          suggestions.map((suggestion) => (
            <SuggestionCard
              key={suggestion.id}
              suggestion={suggestion}
              isActive={activeSuggestion?.id === suggestion.id}
              onAccept={() => handleAccept(suggestion.id)}
              onReject={() => handleReject(suggestion.id)}
              onHover={() => handleHover(suggestion)}
            />
          ))
        )}
      </div>

      {suggestions.length > 0 && (
        <div className="panel-footer">
          <div className="keyboard-hints">
            <span>
              <kbd>Tab</kbd> Next
            </span>
            <span>
              <kbd>Enter</kbd> Accept
            </span>
            <span>
              <kbd>Esc</kbd> Reject
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuggestionPanel;
