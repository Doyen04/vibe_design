// ============================================
// VIBE DESIGN - Right Panel Component
// Combined panel with tabs for Properties and AI Suggestions
// ============================================

import React, { useState } from 'react';
import { Settings, Sparkles } from 'lucide-react';

import PropertiesPanel from '../PropertiesPanel/PropertiesPanel';
import SuggestionPanel from '../SuggestionPanel/SuggestionPanel';

import './RightPanel.css';

type TabType = 'properties' | 'suggestions';

const RightPanel: React.FC = () => {
    const [activeTab, setActiveTab] = useState<TabType>('properties');

    return (
        <div className="right-panel">
            <div className="right-panel-tabs">
                <button
                    className={`tab-btn ${activeTab === 'properties' ? 'active' : ''}`}
                    onClick={() => setActiveTab('properties')}
                >
                    <Settings size={16} />
                    <span>Properties</span>
                </button>
                <button
                    className={`tab-btn ${activeTab === 'suggestions' ? 'active' : ''}`}
                    onClick={() => setActiveTab('suggestions')}
                >
                    <Sparkles size={16} />
                    <span>AI Suggestions</span>
                </button>
            </div>
            <div className="right-panel-content">
                {activeTab === 'properties' ? (
                    <PropertiesPanel />
                ) : (
                    <SuggestionPanel />
                )}
            </div>
        </div>
    );
};

export default RightPanel;
