// ============================================
// VIBE DESIGN - Toolbar Component
// Main toolbar with tools and actions
// ============================================

import React, { useCallback, useState } from 'react';
import {
    MousePointer2,
    Square,
    Circle,
    Hand,
    ZoomIn,
    ZoomOut,
    Grid3X3,
    Undo2,
    Redo2,
    Trash2,
    Download,
    Sparkles,
    Bot,
    Loader2,
    X,
} from 'lucide-react';

import { useCanvasStore, useShapeStore, useSuggestionStore } from '../../store';
import { initializeGemini } from '../../engine';
import type { ToolType } from '../../types';

import './Toolbar.css';

interface ToolButtonProps {
    icon: React.ReactNode;
    label: string;
    active?: boolean;
    onClick: () => void;
    disabled?: boolean;
}

const ToolButton: React.FC<ToolButtonProps> = ({
    icon,
    label,
    active,
    onClick,
    disabled,
}) => (
    <button
        className={`tool-button ${active ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
        onClick={onClick}
        disabled={disabled}
        title={label}
        aria-label={label}
    >
        {icon}
    </button>
);

const Toolbar: React.FC = () => {
    // Canvas store
    const activeTool = useCanvasStore((state) => state.activeTool);
    const setActiveTool = useCanvasStore((state) => state.setActiveTool);
    const zoom = useCanvasStore((state) => state.canvas.zoom);
    const setZoom = useCanvasStore((state) => state.setZoom);
    const resetView = useCanvasStore((state) => state.resetView);
    const showGrid = useCanvasStore((state) => state.showGrid);
    const setShowGrid = useCanvasStore((state) => state.setShowGrid);

    // Shape store
    const selectedIds = useShapeStore((state) => state.selectedIds);
    const deleteSelectedShapes = useShapeStore((state) => state.deleteSelectedShapes);
    const undo = useShapeStore((state) => state.undo);
    const redo = useShapeStore((state) => state.redo);
    const history = useShapeStore((state) => state.history);
    const historyIndex = useShapeStore((state) => state.historyIndex);

    // Suggestion store
    const suggestionsEnabled = useSuggestionStore((state) => state.suggestionsEnabled);
    const setSuggestionsEnabled = useSuggestionStore(
        (state) => state.setSuggestionsEnabled
    );
    const llmEnabled = useSuggestionStore((state) => state.llmEnabled);
    const setLlmEnabled = useSuggestionStore((state) => state.setLlmEnabled);
    const llmApiKey = useSuggestionStore((state) => state.llmApiKey);
    const setLlmApiKey = useSuggestionStore((state) => state.setLlmApiKey);
    const llmLoading = useSuggestionStore((state) => state.llmLoading);

    // Local state for API key modal
    const [showApiKeyModal, setShowApiKeyModal] = useState(false);
    const [tempApiKey, setTempApiKey] = useState('');

    const handleToolChange = useCallback(
        (tool: ToolType) => {
            setActiveTool(tool);
        },
        [setActiveTool]
    );

    const handleZoomIn = useCallback(() => {
        setZoom(zoom * 1.2);
    }, [zoom, setZoom]);

    const handleZoomOut = useCallback(() => {
        setZoom(zoom / 1.2);
    }, [zoom, setZoom]);

    const handleDelete = useCallback(() => {
        deleteSelectedShapes();
    }, [deleteSelectedShapes]);

    const handleExport = useCallback(() => {
        // Export functionality placeholder
        console.log('Export functionality coming soon!');
    }, []);

    const handleLlmToggle = useCallback(() => {
        if (!llmEnabled && !llmApiKey) {
            // Show modal to enter API key
            setShowApiKeyModal(true);
        } else {
            setLlmEnabled(!llmEnabled);
        }
    }, [llmEnabled, llmApiKey, setLlmEnabled]);

    const handleApiKeySubmit = useCallback(() => {
        if (tempApiKey.trim()) {
            setLlmApiKey(tempApiKey.trim());
            initializeGemini(tempApiKey.trim());
            setLlmEnabled(true);
            setShowApiKeyModal(false);
            setTempApiKey('');
        }
    }, [tempApiKey, setLlmApiKey, setLlmEnabled]);

    return (
        <div className="toolbar">
            <div className="toolbar-section">
                <span className="toolbar-logo">✨ Vibe Design</span>
            </div>

            <div className="toolbar-divider" />

            <div className="toolbar-section">
                <ToolButton
                    icon={<MousePointer2 size={18} />}
                    label="Select (V)"
                    active={activeTool === 'select'}
                    onClick={() => handleToolChange('select')}
                />
                <ToolButton
                    icon={<Square size={18} />}
                    label="Rectangle (R)"
                    active={activeTool === 'rect'}
                    onClick={() => handleToolChange('rect')}
                />
                <ToolButton
                    icon={<Circle size={18} />}
                    label="Circle (C)"
                    active={activeTool === 'circle'}
                    onClick={() => handleToolChange('circle')}
                />
                <ToolButton
                    icon={<Hand size={18} />}
                    label="Pan (H)"
                    active={activeTool === 'pan'}
                    onClick={() => handleToolChange('pan')}
                />
            </div>

            <div className="toolbar-divider" />

            <div className="toolbar-section">
                <ToolButton
                    icon={<ZoomOut size={18} />}
                    label="Zoom Out (-)"
                    onClick={handleZoomOut}
                />
                <span className="zoom-display" onClick={resetView} title="Reset zoom">
                    {Math.round(zoom * 100)}%
                </span>
                <ToolButton
                    icon={<ZoomIn size={18} />}
                    label="Zoom In (+)"
                    onClick={handleZoomIn}
                />
            </div>

            <div className="toolbar-divider" />

            <div className="toolbar-section">
                <ToolButton
                    icon={<Grid3X3 size={18} />}
                    label="Toggle Grid (G)"
                    active={showGrid}
                    onClick={() => setShowGrid(!showGrid)}
                />
                <ToolButton
                    icon={<Sparkles size={18} />}
                    label="AI Suggestions (Rule-based)"
                    active={suggestionsEnabled && !llmEnabled}
                    onClick={() => setSuggestionsEnabled(!suggestionsEnabled)}
                />
                <ToolButton
                    icon={llmLoading ? <Loader2 size={18} className="spinning" /> : <Bot size={18} />}
                    label={llmEnabled ? "Gemini AI (Active)" : "Enable Gemini AI"}
                    active={llmEnabled}
                    onClick={handleLlmToggle}
                />
            </div>

            <div className="toolbar-divider" />

            <div className="toolbar-section">
                <ToolButton
                    icon={<Undo2 size={18} />}
                    label="Undo (Ctrl+Z)"
                    onClick={undo}
                    disabled={historyIndex < 0}
                />
                <ToolButton
                    icon={<Redo2 size={18} />}
                    label="Redo (Ctrl+Y)"
                    onClick={redo}
                    disabled={historyIndex >= history.length - 1}
                />
            </div>

            <div className="toolbar-divider" />

            <div className="toolbar-section">
                <ToolButton
                    icon={<Trash2 size={18} />}
                    label="Delete (Del)"
                    onClick={handleDelete}
                    disabled={selectedIds.size === 0}
                />
                <ToolButton
                    icon={<Download size={18} />}
                    label="Export"
                    onClick={handleExport}
                />
            </div>

            {/* API Key Modal */}
            {showApiKeyModal && (
                <div className="api-key-modal-overlay" onClick={() => setShowApiKeyModal(false)}>
                    <div className="api-key-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="api-key-modal-header">
                            <h3>🤖 Enable Gemini AI</h3>
                            <button
                                className="modal-close-btn"
                                onClick={() => setShowApiKeyModal(false)}
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <p className="api-key-modal-description">
                            Enter your Google Gemini API key to enable AI-powered design suggestions.
                            Get your API key from <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer">Google AI Studio</a>.
                        </p>
                        <input
                            type="password"
                            className="api-key-input"
                            placeholder="Enter your Gemini API key..."
                            value={tempApiKey}
                            onChange={(e) => setTempApiKey(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleApiKeySubmit()}
                        />
                        <div className="api-key-modal-actions">
                            <button
                                className="cancel-btn"
                                onClick={() => setShowApiKeyModal(false)}
                            >
                                Cancel
                            </button>
                            <button
                                className="submit-btn"
                                onClick={handleApiKeySubmit}
                                disabled={!tempApiKey.trim()}
                            >
                                Enable Gemini AI
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Toolbar;
