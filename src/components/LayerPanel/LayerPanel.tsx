// ============================================
// VIBE DESIGN - Layer Panel Component
// Left sidebar showing shape hierarchy
// ============================================

import React, { useCallback, useMemo } from 'react';
import {
    Layers,
    Square,
    Circle,
    Eye,
    EyeOff,
    Lock,
    Unlock,
    ChevronRight,
    ChevronDown,
    Trash2,
    Frame,
} from 'lucide-react';

import { useShapeStore } from '../../store';
import type { Shape, SemanticLabel } from '../../types';

import './LayerPanel.css';

const getSemanticIcon = (label: SemanticLabel): string => {
    const icons: Record<SemanticLabel, string> = {
        'page-container': '📄',
        'header': '🔝',
        'footer': '🔽',
        'sidebar': '📋',
        'nav-menu': '🧭',
        'card': '🃏',
        'card-grid': '📊',
        'avatar': '👤',
        'logo': '🎯',
        'button': '🔘',
        'icon': '⭐',
        'text-block': '📝',
        'image-placeholder': '🖼️',
        'input-field': '✏️',
        'hero-section': '🦸',
        'content-area': '📑',
        'modal': '🔲',
        'unknown': '❓',
    };
    return icons[label] || '❓';
};

interface LayerItemProps {
    shape: Shape;
    depth: number;
    isSelected: boolean;
    isExpanded: boolean;
    hasChildren: boolean;
    onSelect: (id: string, addToSelection: boolean) => void;
    onToggleExpand: (id: string) => void;
    onToggleVisibility: (id: string) => void;
    onToggleLock: (id: string) => void;
    onDelete: (id: string) => void;
}

const LayerItem: React.FC<LayerItemProps> = ({
    shape,
    depth,
    isSelected,
    isExpanded,
    hasChildren,
    onSelect,
    onToggleExpand,
    onToggleVisibility,
    onToggleLock,
    onDelete,
}) => {
    const handleClick = useCallback(
        (e: React.MouseEvent) => {
            onSelect(shape.id, e.shiftKey);
        },
        [shape.id, onSelect]
    );

    const handleExpandClick = useCallback(
        (e: React.MouseEvent) => {
            e.stopPropagation();
            onToggleExpand(shape.id);
        },
        [shape.id, onToggleExpand]
    );

    const handleVisibilityClick = useCallback(
        (e: React.MouseEvent) => {
            e.stopPropagation();
            onToggleVisibility(shape.id);
        },
        [shape.id, onToggleVisibility]
    );

    const handleLockClick = useCallback(
        (e: React.MouseEvent) => {
            e.stopPropagation();
            onToggleLock(shape.id);
        },
        [shape.id, onToggleLock]
    );

    const handleDeleteClick = useCallback(
        (e: React.MouseEvent) => {
            e.stopPropagation();
            onDelete(shape.id);
        },
        [shape.id, onDelete]
    );

    return (
        <div
            className={`layer-item ${isSelected ? 'selected' : ''} ${!shape.visible ? 'hidden-layer' : ''}`}
            style={{ paddingLeft: `${16 + depth * 16}px` }}
            onClick={handleClick}
        >
            <div className="layer-expand">
                {hasChildren ? (
                    <button className="expand-btn" onClick={handleExpandClick}>
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>
                ) : (
                    <span className="expand-spacer" />
                )}
            </div>

            <div className="layer-icon">
                {shape.type === 'rect' ? (
                    <Square size={14} />
                ) : shape.type === 'frame' ? (
                    <Frame size={14} />
                ) : (
                    <Circle size={14} />
                )}
            </div>

            <div className="layer-info">
                <span className="layer-name">{shape.name}</span>
                {shape.label !== 'unknown' && (
                    <span className="layer-semantic" title={shape.label}>
                        {getSemanticIcon(shape.label)}
                    </span>
                )}
            </div>

            <div className="layer-actions">
                <button
                    className={`layer-action-btn ${!shape.visible ? 'inactive' : ''}`}
                    onClick={handleVisibilityClick}
                    title={shape.visible ? 'Hide' : 'Show'}
                >
                    {shape.visible ? <Eye size={12} /> : <EyeOff size={12} />}
                </button>
                <button
                    className={`layer-action-btn ${shape.locked ? 'active' : ''}`}
                    onClick={handleLockClick}
                    title={shape.locked ? 'Unlock' : 'Lock'}
                >
                    {shape.locked ? <Lock size={12} /> : <Unlock size={12} />}
                </button>
                <button
                    className="layer-action-btn delete"
                    onClick={handleDeleteClick}
                    title="Delete"
                >
                    <Trash2 size={12} />
                </button>
            </div>
        </div>
    );
};

const LayerPanel: React.FC = () => {
    const shapes = useShapeStore((state) => state.shapes);
    const shapeOrder = useShapeStore((state) => state.shapeOrder);
    const selectedIds = useShapeStore((state) => state.selectedIds);
    const selectShape = useShapeStore((state) => state.selectShape);
    const updateShape = useShapeStore((state) => state.updateShape);
    const deleteShape = useShapeStore((state) => state.deleteShape);

    const [expandedIds, setExpandedIds] = React.useState<Set<string>>(new Set());

    // Build hierarchy for rendering
    const hierarchyData = useMemo(() => {
        const rootShapes: Shape[] = [];
        const childrenMap = new Map<string, Shape[]>();

        // Organize shapes into hierarchy
        shapeOrder.forEach((id) => {
            const shape = shapes.get(id);
            if (!shape) return;

            if (!shape.parentId) {
                rootShapes.push(shape);
            } else {
                const siblings = childrenMap.get(shape.parentId) || [];
                siblings.push(shape);
                childrenMap.set(shape.parentId, siblings);
            }
        });

        return { rootShapes, childrenMap };
    }, [shapes, shapeOrder]);

    const handleSelect = useCallback(
        (id: string, addToSelection: boolean) => {
            selectShape(id, addToSelection);
        },
        [selectShape]
    );

    const handleToggleExpand = useCallback((id: string) => {
        setExpandedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    }, []);

    const handleToggleVisibility = useCallback(
        (id: string) => {
            const shape = shapes.get(id);
            if (shape) {
                updateShape(id, { visible: !shape.visible });
            }
        },
        [shapes, updateShape]
    );

    const handleToggleLock = useCallback(
        (id: string) => {
            const shape = shapes.get(id);
            if (shape) {
                updateShape(id, { locked: !shape.locked });
            }
        },
        [shapes, updateShape]
    );

    const handleDelete = useCallback(
        (id: string) => {
            deleteShape(id);
        },
        [deleteShape]
    );

    // Render shapes recursively
    const renderShape = (shape: Shape, depth: number): React.ReactNode[] => {
        const children = hierarchyData.childrenMap.get(shape.id) || [];
        const hasChildren = children.length > 0;
        const isExpanded = expandedIds.has(shape.id);

        const items: React.ReactNode[] = [
            <LayerItem
                key={shape.id}
                shape={shape}
                depth={depth}
                isSelected={selectedIds.has(shape.id)}
                isExpanded={isExpanded}
                hasChildren={hasChildren}
                onSelect={handleSelect}
                onToggleExpand={handleToggleExpand}
                onToggleVisibility={handleToggleVisibility}
                onToggleLock={handleToggleLock}
                onDelete={handleDelete}
            />,
        ];

        if (hasChildren && isExpanded) {
            children.forEach((child) => {
                items.push(...renderShape(child, depth + 1));
            });
        }

        return items;
    };

    return (
        <div className="layer-panel">
            <div className="panel-header">
                <Layers size={18} />
                <span>Layers</span>
                <span className="layer-count">{shapes.size}</span>
            </div>

            <div className="layers-list">
                {shapes.size === 0 ? (
                    <div className="empty-state">
                        <p>No shapes yet</p>
                        <p className="empty-hint">Draw shapes on the canvas</p>
                    </div>
                ) : (
                    // Render in reverse order (top layers first)
                    [...hierarchyData.rootShapes]
                        .reverse()
                        .flatMap((shape) => renderShape(shape, 0))
                )}
            </div>
        </div>
    );
};

export default LayerPanel;
