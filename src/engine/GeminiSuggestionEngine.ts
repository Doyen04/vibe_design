// ============================================
// VIBE DESIGN - Gemini AI Suggestion Engine
// LLM-powered suggestions using Google Gemini
// ============================================

import { GoogleGenAI } from '@google/genai';
import type { Shape, Suggestion, SuggestedShape, SemanticLabel } from '../types';
import { v4 as uuidv4 } from 'uuid';

// Gemini client instance
let geminiClient: GoogleGenAI | null = null;

// Initialize Gemini client with API key
export const initializeGemini = (apiKey: string): void => {
    geminiClient = new GoogleGenAI({ apiKey });
};

// Check if Gemini is initialized
export const isGeminiInitialized = (): boolean => {
    return geminiClient !== null;
};

// Interface for canvas context sent to Gemini
interface CanvasContext {
    shapes: Array<{
        id: string;
        type: string;
        x: number;
        y: number;
        width: number;
        height: number;
        name: string;
    }>;
    canvasWidth: number;
    canvasHeight: number;
    selectedShapeIds: string[];
}

// Interface for Gemini suggestion response
interface GeminiSuggestionResponse {
    suggestions: Array<{
        title: string;
        description: string;
        shapes: Array<{
            type: 'rect' | 'circle';
            x: number;
            y: number;
            width: number;
            height: number;
            label: string;
            fill?: string;
            stroke?: string;
        }>;
    }>;
}

// Build the prompt for Gemini
const buildPrompt = (context: CanvasContext): string => {
    const shapesDescription = context.shapes.length > 0
        ? context.shapes.map(s => 
            `- ${s.type} "${s.name}" at (${Math.round(s.x)}, ${Math.round(s.y)}) size ${Math.round(s.width)}x${Math.round(s.height)}`
          ).join('\n')
        : 'No shapes on canvas yet';

    const selectedDescription = context.selectedShapeIds.length > 0
        ? `Selected shapes: ${context.selectedShapeIds.join(', ')}`
        : 'No shapes selected';

    return `You are an AI design assistant for a Figma/Canva-like design tool. Analyze the current canvas state and suggest complementary shapes that would improve the design.

Canvas size: ${context.canvasWidth}x${context.canvasHeight}

Current shapes on canvas:
${shapesDescription}

${selectedDescription}

Based on the current design, suggest 1-3 complementary shapes that would:
1. Create visual balance and harmony
2. Complete common UI patterns (headers, cards, buttons, etc.)
3. Maintain consistent spacing and alignment

Respond with a JSON object in this exact format:
{
  "suggestions": [
    {
      "title": "Short title for the suggestion",
      "description": "Brief explanation of why this helps the design",
      "shapes": [
        {
          "type": "rect" or "circle",
          "x": number (x position),
          "y": number (y position),
          "width": number,
          "height": number,
          "label": "header" | "card" | "button" | "avatar" | "icon" | "container" | "sidebar" | "content" | "nav" | "footer" | "unknown",
          "fill": "#hexcolor" (optional),
          "stroke": "#hexcolor" (optional)
        }
      ]
    }
  ]
}

Rules:
- All coordinates and sizes must be positive numbers
- Shapes must fit within the canvas bounds (0 to ${context.canvasWidth} for x, 0 to ${context.canvasHeight} for y)
- Suggest shapes that don't overlap existing shapes
- Use appropriate sizes for UI elements (buttons ~100x40, cards ~300x200, etc.)
- Return ONLY the JSON object, no other text`;
};

// Parse Gemini response into suggestions
const parseGeminiResponse = (responseText: string, context: CanvasContext): Suggestion[] => {
    try {
        // Extract JSON from response (handle potential markdown code blocks)
        let jsonStr = responseText;
        const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
            jsonStr = jsonMatch[1];
        } else {
            // Try to find JSON object directly
            const objectMatch = responseText.match(/\{[\s\S]*\}/);
            if (objectMatch) {
                jsonStr = objectMatch[0];
            }
        }

        const parsed: GeminiSuggestionResponse = JSON.parse(jsonStr);
        
        if (!parsed.suggestions || !Array.isArray(parsed.suggestions)) {
            return [];
        }

        return parsed.suggestions.map((suggestion, index) => {
            const validShapes: SuggestedShape[] = suggestion.shapes
                .filter(shape => 
                    (shape.type === 'rect' || shape.type === 'circle') &&
                    typeof shape.x === 'number' &&
                    typeof shape.y === 'number' &&
                    typeof shape.width === 'number' &&
                    typeof shape.height === 'number' &&
                    shape.x >= 0 &&
                    shape.y >= 0 &&
                    shape.width > 0 &&
                    shape.height > 0 &&
                    shape.x + shape.width <= context.canvasWidth &&
                    shape.y + shape.height <= context.canvasHeight
                )
                .map(shape => ({
                    type: shape.type,
                    x: shape.x,
                    y: shape.y,
                    width: shape.width,
                    height: shape.height,
                    label: (shape.label || 'unknown') as SemanticLabel,
                    parentId: null,
                    fill: shape.fill || '#E8F5E9',
                    stroke: shape.stroke || '#4CAF50',
                    isGhost: true,
                }));

            return {
                id: uuidv4(),
                type: 'completion' as const,
                title: suggestion.title || `AI Suggestion ${index + 1}`,
                description: suggestion.description || 'Suggested by Gemini AI',
                confidence: 'high' as const,
                priority: 90 - index * 10,
                shapes: validShapes,
                context: {
                    triggerShapeId: context.selectedShapeIds[0] || null,
                    triggerAction: 'create' as const,
                    parentShapeId: null,
                    relatedShapeIds: context.selectedShapeIds,
                },
                timestamp: Date.now(),
            };
        }).filter(s => s.shapes.length > 0);
    } catch (error) {
        console.error('Failed to parse Gemini response:', error);
        return [];
    }
};

// Generate suggestions using Gemini
export const generateGeminiSuggestions = async (
    shapes: Shape[],
    selectedShapeIds: string[],
    canvasWidth: number,
    canvasHeight: number
): Promise<Suggestion[]> => {
    if (!geminiClient) {
        console.warn('Gemini client not initialized');
        return [];
    }

    try {
        const context: CanvasContext = {
            shapes: shapes.map(s => ({
                id: s.id,
                type: s.type,
                x: s.x,
                y: s.y,
                width: s.width,
                height: s.height,
                name: s.name,
            })),
            canvasWidth,
            canvasHeight,
            selectedShapeIds,
        };

        const prompt = buildPrompt(context);

        // Use Gemini 2.5 Flash for best price-performance
        const response = await geminiClient.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                temperature: 0.7,
                maxOutputTokens: 2048,
            },
        });

        const text = response.text;
        if (!text) {
            return [];
        }

        return parseGeminiResponse(text, context);
    } catch (error) {
        console.error('Gemini API error:', error);
        return [];
    }
};

export default {
    initializeGemini,
    isGeminiInitialized,
    generateGeminiSuggestions,
};
