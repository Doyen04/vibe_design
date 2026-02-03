// ============================================
// VIBE DESIGN - Main App Component
// ============================================

import React, { useState, useEffect } from 'react';

import { DesignCanvas, Toolbar, LayerPanel, SuggestionPanel } from './components';
import { useKeyboardShortcuts } from './hooks';

import './App.css';

const App: React.FC = () => {
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  // Enable keyboard shortcuts
  useKeyboardShortcuts();

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Calculate canvas dimensions (subtract panels and toolbar)
  const canvasWidth = windowSize.width - 260 - 300; // Left panel + Right panel
  const canvasHeight = windowSize.height - 48; // Toolbar height

  return (
    <div className="app">
      <Toolbar />
      <div className="app-content">
        <LayerPanel />
        <div className="canvas-container">
          <DesignCanvas width={canvasWidth} height={canvasHeight} />
        </div>
        <SuggestionPanel />
      </div>
    </div>
  );
};

export default App;
