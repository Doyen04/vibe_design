// ============================================
// VIBE DESIGN - Ghost Shape Renderer
// Renders suggestion preview shapes (clickable to accept/reject)
// ============================================

import React, { memo, useState } from 'react';
import { Rect, Circle, Group, Text } from 'react-konva';
import type { SuggestedShape } from '../../types';

interface GhostShapeRendererProps {
    shape: SuggestedShape;
    onAccept?: () => void;
    onReject?: () => void;
    isClickable?: boolean;
}

const GhostShapeRenderer: React.FC<GhostShapeRendererProps> = memo(({
    shape,
    onAccept,
    onReject,
    isClickable = true
}) => {
    const [isHovered, setIsHovered] = useState(false);

    const baseOpacity = 0.5;
    const hoverOpacity = 0.8;

    // Calculate center and button positions
    const centerX = shape.x + shape.width / 2;
    const centerY = shape.y + shape.height / 2;

    // Button size and positioning
    const buttonSize = 28;
    const buttonSpacing = 8;
    const acceptBtnX = centerX - buttonSize - buttonSpacing / 2;
    const rejectBtnX = centerX + buttonSpacing / 2;
    const buttonY = centerY - buttonSize / 2;

    const commonProps = {
        fill: isHovered ? '#BBDEFB' : (shape.fill ?? '#E3F2FD'),
        stroke: isHovered ? '#1976D2' : '#2196F3',
        strokeWidth: isHovered ? 3 : 2,
        opacity: isHovered ? hoverOpacity : baseOpacity,
        dash: isHovered ? undefined : [8, 4],
        listening: isClickable,
    };

    return (
        <Group
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Shape preview */}
            {shape.type === 'rect' ? (
                <Rect
                    {...commonProps}
                    x={shape.x}
                    y={shape.y}
                    width={shape.width}
                    height={shape.height}
                    cornerRadius={4}
                />
            ) : (
                <Circle
                    {...commonProps}
                    x={centerX}
                    y={centerY}
                    radius={Math.min(shape.width, shape.height) / 2}
                />
            )}

            {/* Accept and Reject buttons when hovered */}
            {isHovered && isClickable && (
                <Group>
                    {/* Accept button (green checkmark) */}
                    <Group
                        x={acceptBtnX}
                        y={buttonY}
                        onClick={(e) => {
                            e.cancelBubble = true;
                            onAccept?.();
                        }}
                        onTap={(e) => {
                            e.cancelBubble = true;
                            onAccept?.();
                        }}
                    >
                        <Rect
                            width={buttonSize}
                            height={buttonSize}
                            fill="#4CAF50"
                            cornerRadius={4}
                            shadowColor="#000"
                            shadowBlur={4}
                            shadowOpacity={0.2}
                            listening={true}
                        />
                        <Text
                            x={buttonSize / 2 - 7}
                            y={buttonSize / 2 - 10}
                            text="✓"
                            fontSize={18}
                            fontStyle="bold"
                            fill="#FFFFFF"
                            listening={false}
                        />
                    </Group>

                    {/* Reject button (red X) */}
                    <Group
                        x={rejectBtnX}
                        y={buttonY}
                        onClick={(e) => {
                            e.cancelBubble = true;
                            onReject?.();
                        }}
                        onTap={(e) => {
                            e.cancelBubble = true;
                            onReject?.();
                        }}
                    >
                        <Rect
                            width={buttonSize}
                            height={buttonSize}
                            fill="#F44336"
                            cornerRadius={4}
                            shadowColor="#000"
                            shadowBlur={4}
                            shadowOpacity={0.2}
                            listening={true}
                        />
                        <Text
                            x={buttonSize / 2 - 7}
                            y={buttonSize / 2 - 10}
                            text="✕"
                            fontSize={18}
                            fontStyle="bold"
                            fill="#FFFFFF"
                            listening={false}
                        />
                    </Group>
                </Group>
            )}
        </Group>
    );
});

GhostShapeRenderer.displayName = 'GhostShapeRenderer';

export default GhostShapeRenderer;