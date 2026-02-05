// ============================================
// VIBE DESIGN - Design Intent Modal
// Modal for users to describe what they want to design
// ============================================

import React, { useState } from 'react';
import { setDesignIntent } from '../../engine';
import './DesignIntentModal.css';

interface DesignIntentModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const DesignIntentModal: React.FC<DesignIntentModalProps> = ({ isOpen, onClose }) => {
    const [intent, setIntent] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (intent.trim()) {
            setDesignIntent(intent.trim());
        }
        onClose();
    };

    const handleSkip = () => {
        setDesignIntent('');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="design-intent-modal-overlay">
            <div className="design-intent-modal">
                <div className="design-intent-modal-header">
                    <h2>🎨 What would you like to design?</h2>
                    <p>Describe your design goal and our AI will suggest shapes to help you build it.</p>
                </div>

                <form onSubmit={handleSubmit} className="design-intent-modal-form">
                    <textarea
                        value={intent}
                        onChange={(e) => setIntent(e.target.value)}
                        placeholder="e.g., A modern dashboard with cards and charts, A mobile app login screen, A landing page with hero section..."
                        rows={4}
                        autoFocus
                    />

                    <div className="design-intent-modal-examples">
                        <span>Quick examples:</span>
                        <button type="button" onClick={() => setIntent('A modern dashboard with stat cards and a sidebar navigation')}>
                            Dashboard
                        </button>
                        <button type="button" onClick={() => setIntent('A mobile app login screen with form inputs and buttons')}>
                            Login Screen
                        </button>
                        <button type="button" onClick={() => setIntent('A landing page with hero section and feature cards')}>
                            Landing Page
                        </button>
                    </div>

                    <div className="design-intent-modal-actions">
                        <button type="button" className="skip-button" onClick={handleSkip}>
                            Skip for now
                        </button>
                        <button type="submit" className="start-button">
                            Start Designing →
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default DesignIntentModal;
