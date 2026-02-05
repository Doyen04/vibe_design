// ============================================
// VIBE DESIGN - Gemini AI Suggestion Engine
// LLM-powered suggestions using Google Gemini 2.5 Flash
// ============================================

import { GoogleGenAI } from '@google/genai';
import type { Shape, Suggestion, SuggestedShape, SemanticLabel } from '../types';
import { v4 as uuidv4 } from 'uuid';

// ============================================
// Gemini 2.5 Flash Rate Limits (Free Tier)
// ============================================
// RPM: 10 requests per minute
// RPD: 1500 requests per day
// TPM: 250,000 tokens per minute
// TPD: 1,000,000 tokens per day
// ============================================

export interface RateLimitStatus {
    canMakeRequest: boolean;
    rpm: { used: number; limit: number; resetsIn: number };
    rpd: { used: number; limit: number; resetsIn: number };
    tpm: { used: number; limit: number; resetsIn: number };
    tpd: { used: number; limit: number; resetsIn: number };
    error?: string;
}

// Rate limits for Gemini 2.5 Flash
const RATE_LIMITS = {
    RPM: 10,        // Requests per minute
    RPD: 1500,      // Requests per day
    TPM: 250000,    // Tokens per minute
    TPD: 1000000,   // Tokens per day
};

// Gemini client instance
let geminiClient: GoogleGenAI | null = null;
let apiKey: string | null = null;

// Rate limiting state
let minuteRequestCount = 0;
let dayRequestCount = 0;
let minuteTokenCount = 0;
let dayTokenCount = 0;
let minuteResetTime = 0;
let dayResetTime = 0;

// Initialize Gemini client
export const initializeGemini = (key: string): void => {
    apiKey = key;
    geminiClient = new GoogleGenAI({ apiKey: key });
    resetRateLimits();
};

// Reset rate limits
const resetRateLimits = (): void => {
    const now = Date.now();
    minuteRequestCount = 0;
    dayRequestCount = 0;
    minuteTokenCount = 0;
    dayTokenCount = 0;
    minuteResetTime = now + 60000; // 1 minute
    dayResetTime = now + 86400000; // 24 hours
};

// Check if Gemini is initialized
export const isGeminiInitialized = (): boolean => {
    return geminiClient !== null && apiKey !== null;
};

// Get rate limit status
export const getRateLimitStatus = (): RateLimitStatus => {
    const now = Date.now();
    
    // Reset minute counters if needed
    if (now > minuteResetTime) {
        minuteRequestCount = 0;
        minuteTokenCount = 0;
        minuteResetTime = now + 60000;
    }
    
    // Reset day counters if needed
    if (now > dayResetTime) {
        dayRequestCount = 0;
        dayTokenCount = 0;
        dayResetTime = now + 86400000;
    }
    
    const canMakeRequest = 
        minuteRequestCount < RATE_LIMITS.RPM &&
        dayRequestCount < RATE_LIMITS.RPD &&
        minuteTokenCount < RATE_LIMITS.TPM &&
        dayTokenCount < RATE_LIMITS.TPD;
    
    let error: string | undefined;
    if (!canMakeRequest) {
        if (minuteRequestCount >= RATE_LIMITS.RPM) {
            error = `Rate limit: ${RATE_LIMITS.RPM} requests/minute exceeded. Wait ${Math.ceil((minuteResetTime - now) / 1000)}s`;
        } else if (dayRequestCount >= RATE_LIMITS.RPD) {
            error = `Daily limit: ${RATE_LIMITS.RPD} requests/day exceeded`;
        } else if (minuteTokenCount >= RATE_LIMITS.TPM) {
            error = `Token limit: ${RATE_LIMITS.TPM} tokens/minute exceeded`;
        } else if (dayTokenCount >= RATE_LIMITS.TPD) {
            error = `Daily token limit: ${RATE_LIMITS.TPD} tokens/day exceeded`;
        }
    }
    
    return {
        canMakeRequest,
        rpm: { used: minuteRequestCount, limit: RATE_LIMITS.RPM, resetsIn: Math.max(0, minuteResetTime - now) },
        rpd: { used: dayRequestCount, limit: RATE_LIMITS.RPD, resetsIn: Math.max(0, dayResetTime - now) },
        tpm: { used: minuteTokenCount, limit: RATE_LIMITS.TPM, resetsIn: Math.max(0, minuteResetTime - now) },
        tpd: { used: dayTokenCount, limit: RATE_LIMITS.TPD, resetsIn: Math.max(0, dayResetTime - now) },
        error,
    };
};

// Record API usage
const recordUsage = (tokenCount: number = 500): void => {
    minuteRequestCount++;
    dayRequestCount++;
    minuteTokenCount += tokenCount;
    dayTokenCount += tokenCount;
};

// Validate API key
export const validateApiKey = async (key: string): Promise<{ valid: boolean; error?: string }> => {
    try {
        const testClient = new GoogleGenAI({ apiKey: key });
        const response = await testClient.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: 'Say OK',
            config: { maxOutputTokens: 5 },
        });
        
        if (response.text) {
            return { valid: true };
        }
        return { valid: false, error: 'No response from API' };
    } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        
        if (msg.includes('API_KEY_INVALID') || msg.includes('invalid')) {
            return { valid: false, error: 'Invalid API key' };
        }
        if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('quota')) {
            return { valid: false, error: 'Rate limit exceeded. Please wait and try again.' };
        }
        
        return { valid: false, error: msg };
    }
};

// Build prompt for suggestions
const buildPrompt = (shapes: Shape[], canvasWidth: number, canvasHeight: number): string => {
    const shapeDescriptions = shapes.length > 0
        ? shapes.map(s => `- ${s.type} at (${Math.round(s.x)}, ${Math.round(s.y)}) size ${Math.round(s.width)}x${Math.round(s.height)}`).join('\n')
        : 'Empty canvas';

    return `You are a UI design assistant. Given the current canvas state, suggest 1-2 complementary shapes.

Canvas: ${canvasWidth}x${canvasHeight}
Current shapes:
${shapeDescriptions}

Respond with JSON only:
{
  "suggestions": [
    {
      "title": "Short title",
      "description": "Why this helps",
      "shapes": [
        {
          "type": "rect",
          "x": 100,
          "y": 100,
          "width": 200,
          "height": 100,
          "fill": "#E8F5E9",
          "stroke": "#4CAF50"
        }
      ]
    }
  ]
}

Rules:
- type must be "rect" or "circle"
- x, y, width, height must be positive numbers
- Shapes must not overlap existing shapes
- Keep shapes within canvas bounds
- Use pleasant colors`;
};

// Parse Gemini response
interface GeminiResponse {
    suggestions: Array<{
        title: string;
        description: string;
        shapes: Array<{
            type: 'rect' | 'circle';
            x: number;
            y: number;
            width: number;
            height: number;
            fill?: string;
            stroke?: string;
        }>;
    }>;
}

const parseResponse = (text: string): Suggestion[] => {
    try {
        // Extract JSON from response (handle markdown code blocks)
        let jsonStr = text;
        const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
            jsonStr = jsonMatch[1];
        }
        
        const parsed: GeminiResponse = JSON.parse(jsonStr.trim());
        
        if (!parsed.suggestions || !Array.isArray(parsed.suggestions)) {
            console.warn('[Gemini] Invalid response format');
            return [];
        }

        return parsed.suggestions.map((s, i) => ({
            id: uuidv4(),
            type: 'ai-suggestion' as const,
            title: s.title || `Suggestion ${i + 1}`,
            description: s.description || 'AI suggestion',
            confidence: 'high' as const,
            priority: 80 - i * 10,
            shapes: s.shapes
                .filter(shape => 
                    (shape.type === 'rect' || shape.type === 'circle') &&
                    shape.x >= 0 && shape.y >= 0 &&
                    shape.width > 0 && shape.height > 0
                )
                .map(shape => ({
                    type: shape.type,
                    x: shape.x,
                    y: shape.y,
                    width: shape.width,
                    height: shape.height,
                    label: 'unknown' as SemanticLabel,
                    parentId: null,
                    fill: shape.fill || '#E8F5E9',
                    stroke: shape.stroke || '#4CAF50',
                    isGhost: true,
                })),
            context: {
                triggerShapeId: null,
                triggerAction: 'create' as const,
                parentShapeId: null,
                relatedShapeIds: [],
            },
            timestamp: Date.now(),
        })).filter(s => s.shapes.length > 0);
    } catch (error) {
        console.error('[Gemini] Parse error:', error);
        return [];
    }
};

// Generate suggestions using Gemini
export const generateGeminiSuggestions = async (
    shapes: Shape[],
    _selectedIds: string[],
    canvasWidth: number,
    canvasHeight: number
): Promise<{ suggestions: Suggestion[]; error?: string }> => {
    console.log('[Gemini] Generating suggestions...');
    
    if (!geminiClient) {
        return { suggestions: [], error: 'Gemini not initialized' };
    }

    // Check rate limits
    const status = getRateLimitStatus();
    if (!status.canMakeRequest) {
        console.warn('[Gemini] Rate limited:', status.error);
        return { suggestions: [], error: status.error };
    }

    try {
        const prompt = buildPrompt(shapes, canvasWidth, canvasHeight);
        
        const response = await geminiClient.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                maxOutputTokens: 1000,
                temperature: 0.7,
            },
        });

        // Record usage (estimate ~500 tokens for this request)
        recordUsage(500);

        const text = response.text;
        console.log('[Gemini] Response received');

        if (!text) {
            return { suggestions: [] };
        }

        const suggestions = parseResponse(text);
        console.log('[Gemini] Parsed', suggestions.length, 'suggestions');
        
        return { suggestions };
    } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        console.error('[Gemini] API error:', msg);
        
        if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
            return { suggestions: [], error: 'Rate limit exceeded. Please wait.' };
        }
        
        return { suggestions: [], error: msg };
    }
};

export default {
    initializeGemini,
    isGeminiInitialized,
    validateApiKey,
    generateGeminiSuggestions,
    getRateLimitStatus,
};
