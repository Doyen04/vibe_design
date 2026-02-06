// ============================================
// VIBE DESIGN - Properties Panel Component
// Right sidebar showing selected shape properties
// including layout settings for frames
// ============================================

import React, { useCallback } from 'react';
import {
    Settings,
    Layout,
    Grid,
    Columns,
    Rows,
    AlignLeft,
    AlignCenter,
    AlignRight,
    AlignStartVertical,
    AlignCenterVertical,
    AlignEndVertical,
    Move,
    ArrowRight,
    ArrowDown,
    ArrowLeft,
    ArrowUp,
} from 'lucide-react';

import { useShapeStore } from '../../store';
import type {
    LayoutMode,
    FlexDirection,
    FlexJustify,
    FlexAlign,
    FlexWrap,
} from '../../types';

import './PropertiesPanel.css';

const PropertiesPanel: React.FC = () => {
    const selectedIds = useShapeStore((state) => state.selectedIds);
    const shapes = useShapeStore((state) => state.shapes);
    const updateShape = useShapeStore((state) => state.updateShape);

    // Get selected shapes
    const selectedShapes = Array.from(selectedIds)
        .map((id) => shapes.get(id))
        .filter(Boolean);

    // Check if we have a single frame selected
    const selectedFrame = selectedShapes.length === 1 && selectedShapes[0]?.type === 'frame'
        ? selectedShapes[0]
        : null;

    const layout = selectedFrame?.layout;

    const handleLayoutModeChange = useCallback(
        (mode: LayoutMode) => {
            if (!selectedFrame) return;
            updateShape(selectedFrame.id, {
                layout: {
                    ...selectedFrame.layout!,
                    mode,
                },
            });
        },
        [selectedFrame, updateShape]
    );

    const handleFlexDirectionChange = useCallback(
        (direction: FlexDirection) => {
            if (!selectedFrame || !selectedFrame.layout) return;
            updateShape(selectedFrame.id, {
                layout: {
                    ...selectedFrame.layout,
                    flex: {
                        ...selectedFrame.layout.flex!,
                        direction,
                    },
                },
            });
        },
        [selectedFrame, updateShape]
    );

    const handleFlexJustifyChange = useCallback(
        (justifyContent: FlexJustify) => {
            if (!selectedFrame || !selectedFrame.layout) return;
            updateShape(selectedFrame.id, {
                layout: {
                    ...selectedFrame.layout,
                    flex: {
                        ...selectedFrame.layout.flex!,
                        justifyContent,
                    },
                },
            });
        },
        [selectedFrame, updateShape]
    );

    const handleFlexAlignChange = useCallback(
        (alignItems: FlexAlign) => {
            if (!selectedFrame || !selectedFrame.layout) return;
            updateShape(selectedFrame.id, {
                layout: {
                    ...selectedFrame.layout,
                    flex: {
                        ...selectedFrame.layout.flex!,
                        alignItems,
                    },
                },
            });
        },
        [selectedFrame, updateShape]
    );

    const handleFlexWrapChange = useCallback(
        (wrap: FlexWrap) => {
            if (!selectedFrame || !selectedFrame.layout) return;
            updateShape(selectedFrame.id, {
                layout: {
                    ...selectedFrame.layout,
                    flex: {
                        ...selectedFrame.layout.flex!,
                        wrap,
                    },
                },
            });
        },
        [selectedFrame, updateShape]
    );

    const handleFlexGapChange = useCallback(
        (gap: number) => {
            if (!selectedFrame || !selectedFrame.layout) return;
            updateShape(selectedFrame.id, {
                layout: {
                    ...selectedFrame.layout,
                    flex: {
                        ...selectedFrame.layout.flex!,
                        gap,
                    },
                },
            });
        },
        [selectedFrame, updateShape]
    );

    const handleFlexPaddingChange = useCallback(
        (side: 'top' | 'right' | 'bottom' | 'left', value: number) => {
            if (!selectedFrame || !selectedFrame.layout) return;
            updateShape(selectedFrame.id, {
                layout: {
                    ...selectedFrame.layout,
                    flex: {
                        ...selectedFrame.layout.flex!,
                        padding: {
                            ...selectedFrame.layout.flex!.padding,
                            [side]: value,
                        },
                    },
                },
            });
        },
        [selectedFrame, updateShape]
    );

    const handleGridColumnsChange = useCallback(
        (columns: number) => {
            if (!selectedFrame || !selectedFrame.layout) return;
            updateShape(selectedFrame.id, {
                layout: {
                    ...selectedFrame.layout,
                    grid: {
                        ...selectedFrame.layout.grid!,
                        columns,
                    },
                },
            });
        },
        [selectedFrame, updateShape]
    );

    const handleGridRowsChange = useCallback(
        (rows: number) => {
            if (!selectedFrame || !selectedFrame.layout) return;
            updateShape(selectedFrame.id, {
                layout: {
                    ...selectedFrame.layout,
                    grid: {
                        ...selectedFrame.layout.grid!,
                        rows,
                    },
                },
            });
        },
        [selectedFrame, updateShape]
    );

    const handleGridGapChange = useCallback(
        (type: 'columnGap' | 'rowGap', value: number) => {
            if (!selectedFrame || !selectedFrame.layout) return;
            updateShape(selectedFrame.id, {
                layout: {
                    ...selectedFrame.layout,
                    grid: {
                        ...selectedFrame.layout.grid!,
                        [type]: value,
                    },
                },
            });
        },
        [selectedFrame, updateShape]
    );

    const handleGridPaddingChange = useCallback(
        (side: 'top' | 'right' | 'bottom' | 'left', value: number) => {
            if (!selectedFrame || !selectedFrame.layout) return;
            updateShape(selectedFrame.id, {
                layout: {
                    ...selectedFrame.layout,
                    grid: {
                        ...selectedFrame.layout.grid!,
                        padding: {
                            ...selectedFrame.layout.grid!.padding,
                            [side]: value,
                        },
                    },
                },
            });
        },
        [selectedFrame, updateShape]
    );

    if (!selectedFrame) {
        return (
            <div className="properties-panel">
                <div className="panel-header">
                    <Settings size={18} />
                    <span>Properties</span>
                </div>
                <div className="empty-state">
                    <p>Select a frame to edit layout</p>
                    <p className="empty-hint">Frame layout options will appear here</p>
                </div>
            </div>
        );
    }

    return (
        <div className="properties-panel">
            <div className="panel-header">
                <Settings size={18} />
                <span>Properties</span>
            </div>

            <div className="properties-content">
                {/* Shape Info */}
                <div className="property-section">
                    <div className="section-title">Frame: {selectedFrame.name}</div>
                    <div className="shape-info">
                        <span>Size: {Math.round(selectedFrame.width)} × {Math.round(selectedFrame.height)}</span>
                        <span>Children: {selectedFrame.children.length}</span>
                    </div>
                </div>

                {/* Layout Mode Selection */}
                <div className="property-section">
                    <div className="section-title">Layout Mode</div>
                    <div className="layout-mode-buttons">
                        <button
                            className={`mode-btn ${layout?.mode === 'free' ? 'active' : ''}`}
                            onClick={() => handleLayoutModeChange('free')}
                            title="Free / Absolute positioning"
                        >
                            <Move size={16} />
                            <span>Free</span>
                        </button>
                        <button
                            className={`mode-btn ${layout?.mode === 'flex' ? 'active' : ''}`}
                            onClick={() => handleLayoutModeChange('flex')}
                            title="Flexbox layout"
                        >
                            <Layout size={16} />
                            <span>Flex</span>
                        </button>
                        <button
                            className={`mode-btn ${layout?.mode === 'grid' ? 'active' : ''}`}
                            onClick={() => handleLayoutModeChange('grid')}
                            title="Grid layout"
                        >
                            <Grid size={16} />
                            <span>Grid</span>
                        </button>
                    </div>
                </div>

                {/* Flex Layout Settings */}
                {layout?.mode === 'flex' && layout.flex && (
                    <>
                        <div className="property-section">
                            <div className="section-title">Direction</div>
                            <div className="direction-buttons">
                                <button
                                    className={`dir-btn ${layout.flex.direction === 'row' ? 'active' : ''}`}
                                    onClick={() => handleFlexDirectionChange('row')}
                                    title="Row"
                                >
                                    <ArrowRight size={14} />
                                </button>
                                <button
                                    className={`dir-btn ${layout.flex.direction === 'column' ? 'active' : ''}`}
                                    onClick={() => handleFlexDirectionChange('column')}
                                    title="Column"
                                >
                                    <ArrowDown size={14} />
                                </button>
                                <button
                                    className={`dir-btn ${layout.flex.direction === 'row-reverse' ? 'active' : ''}`}
                                    onClick={() => handleFlexDirectionChange('row-reverse')}
                                    title="Row Reverse"
                                >
                                    <ArrowLeft size={14} />
                                </button>
                                <button
                                    className={`dir-btn ${layout.flex.direction === 'column-reverse' ? 'active' : ''}`}
                                    onClick={() => handleFlexDirectionChange('column-reverse')}
                                    title="Column Reverse"
                                >
                                    <ArrowUp size={14} />
                                </button>
                            </div>
                        </div>

                        <div className="property-section">
                            <div className="section-title">Justify Content</div>
                            <div className="justify-buttons">
                                <button
                                    className={`justify-btn ${layout.flex.justifyContent === 'flex-start' ? 'active' : ''}`}
                                    onClick={() => handleFlexJustifyChange('flex-start')}
                                    title="Start"
                                >
                                    <AlignLeft size={14} />
                                </button>
                                <button
                                    className={`justify-btn ${layout.flex.justifyContent === 'center' ? 'active' : ''}`}
                                    onClick={() => handleFlexJustifyChange('center')}
                                    title="Center"
                                >
                                    <AlignCenter size={14} />
                                </button>
                                <button
                                    className={`justify-btn ${layout.flex.justifyContent === 'flex-end' ? 'active' : ''}`}
                                    onClick={() => handleFlexJustifyChange('flex-end')}
                                    title="End"
                                >
                                    <AlignRight size={14} />
                                </button>
                                <button
                                    className={`justify-btn ${layout.flex.justifyContent === 'space-between' ? 'active' : ''}`}
                                    onClick={() => handleFlexJustifyChange('space-between')}
                                    title="Space Between"
                                >
                                    <Columns size={14} />
                                </button>
                                <button
                                    className={`justify-btn ${layout.flex.justifyContent === 'space-around' ? 'active' : ''}`}
                                    onClick={() => handleFlexJustifyChange('space-around')}
                                    title="Space Around"
                                >
                                    <Rows size={14} />
                                </button>
                            </div>
                        </div>

                        <div className="property-section">
                            <div className="section-title">Align Items</div>
                            <div className="align-buttons">
                                <button
                                    className={`align-btn ${layout.flex.alignItems === 'flex-start' ? 'active' : ''}`}
                                    onClick={() => handleFlexAlignChange('flex-start')}
                                    title="Start"
                                >
                                    <AlignStartVertical size={14} />
                                </button>
                                <button
                                    className={`align-btn ${layout.flex.alignItems === 'center' ? 'active' : ''}`}
                                    onClick={() => handleFlexAlignChange('center')}
                                    title="Center"
                                >
                                    <AlignCenterVertical size={14} />
                                </button>
                                <button
                                    className={`align-btn ${layout.flex.alignItems === 'flex-end' ? 'active' : ''}`}
                                    onClick={() => handleFlexAlignChange('flex-end')}
                                    title="End"
                                >
                                    <AlignEndVertical size={14} />
                                </button>
                                <button
                                    className={`align-btn ${layout.flex.alignItems === 'stretch' ? 'active' : ''}`}
                                    onClick={() => handleFlexAlignChange('stretch')}
                                    title="Stretch"
                                >
                                    ⇔
                                </button>
                            </div>
                        </div>

                        <div className="property-section">
                            <div className="section-title">Wrap</div>
                            <div className="wrap-buttons">
                                <button
                                    className={`wrap-btn ${layout.flex.wrap === 'nowrap' ? 'active' : ''}`}
                                    onClick={() => handleFlexWrapChange('nowrap')}
                                >
                                    No Wrap
                                </button>
                                <button
                                    className={`wrap-btn ${layout.flex.wrap === 'wrap' ? 'active' : ''}`}
                                    onClick={() => handleFlexWrapChange('wrap')}
                                >
                                    Wrap
                                </button>
                            </div>
                        </div>

                        <div className="property-section">
                            <div className="section-title">Gap</div>
                            <div className="input-row">
                                <input
                                    type="number"
                                    value={layout.flex.gap}
                                    onChange={(e) => handleFlexGapChange(Number(e.target.value))}
                                    min={0}
                                    max={100}
                                />
                                <span className="input-label">px</span>
                            </div>
                        </div>

                        <div className="property-section">
                            <div className="section-title">Padding</div>
                            <div className="padding-grid">
                                <div className="padding-row">
                                    <span className="padding-label">T</span>
                                    <input
                                        type="number"
                                        value={layout.flex.padding.top}
                                        onChange={(e) => handleFlexPaddingChange('top', Number(e.target.value))}
                                        min={0}
                                    />
                                </div>
                                <div className="padding-row">
                                    <span className="padding-label">R</span>
                                    <input
                                        type="number"
                                        value={layout.flex.padding.right}
                                        onChange={(e) => handleFlexPaddingChange('right', Number(e.target.value))}
                                        min={0}
                                    />
                                </div>
                                <div className="padding-row">
                                    <span className="padding-label">B</span>
                                    <input
                                        type="number"
                                        value={layout.flex.padding.bottom}
                                        onChange={(e) => handleFlexPaddingChange('bottom', Number(e.target.value))}
                                        min={0}
                                    />
                                </div>
                                <div className="padding-row">
                                    <span className="padding-label">L</span>
                                    <input
                                        type="number"
                                        value={layout.flex.padding.left}
                                        onChange={(e) => handleFlexPaddingChange('left', Number(e.target.value))}
                                        min={0}
                                    />
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {/* Grid Layout Settings */}
                {layout?.mode === 'grid' && layout.grid && (
                    <>
                        <div className="property-section">
                            <div className="section-title">Grid Structure</div>
                            <div className="grid-structure">
                                <div className="input-row">
                                    <span className="input-label">Columns</span>
                                    <input
                                        type="number"
                                        value={layout.grid.columns}
                                        onChange={(e) => handleGridColumnsChange(Number(e.target.value))}
                                        min={1}
                                        max={12}
                                    />
                                </div>
                                <div className="input-row">
                                    <span className="input-label">Rows</span>
                                    <input
                                        type="number"
                                        value={layout.grid.rows}
                                        onChange={(e) => handleGridRowsChange(Number(e.target.value))}
                                        min={1}
                                        max={12}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="property-section">
                            <div className="section-title">Gap</div>
                            <div className="grid-gap">
                                <div className="input-row">
                                    <span className="input-label">Col Gap</span>
                                    <input
                                        type="number"
                                        value={layout.grid.columnGap}
                                        onChange={(e) => handleGridGapChange('columnGap', Number(e.target.value))}
                                        min={0}
                                    />
                                </div>
                                <div className="input-row">
                                    <span className="input-label">Row Gap</span>
                                    <input
                                        type="number"
                                        value={layout.grid.rowGap}
                                        onChange={(e) => handleGridGapChange('rowGap', Number(e.target.value))}
                                        min={0}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="property-section">
                            <div className="section-title">Padding</div>
                            <div className="padding-grid">
                                <div className="padding-row">
                                    <span className="padding-label">T</span>
                                    <input
                                        type="number"
                                        value={layout.grid.padding.top}
                                        onChange={(e) => handleGridPaddingChange('top', Number(e.target.value))}
                                        min={0}
                                    />
                                </div>
                                <div className="padding-row">
                                    <span className="padding-label">R</span>
                                    <input
                                        type="number"
                                        value={layout.grid.padding.right}
                                        onChange={(e) => handleGridPaddingChange('right', Number(e.target.value))}
                                        min={0}
                                    />
                                </div>
                                <div className="padding-row">
                                    <span className="padding-label">B</span>
                                    <input
                                        type="number"
                                        value={layout.grid.padding.bottom}
                                        onChange={(e) => handleGridPaddingChange('bottom', Number(e.target.value))}
                                        min={0}
                                    />
                                </div>
                                <div className="padding-row">
                                    <span className="padding-label">L</span>
                                    <input
                                        type="number"
                                        value={layout.grid.padding.left}
                                        onChange={(e) => handleGridPaddingChange('left', Number(e.target.value))}
                                        min={0}
                                    />
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {/* Free Mode Info */}
                {layout?.mode === 'free' && (
                    <div className="property-section">
                        <div className="free-mode-info">
                            <p>Children are positioned absolutely.</p>
                            <p className="hint">Drag shapes freely within the frame.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PropertiesPanel;
