// ============================================
// VIBE DESIGN - Gemini AI Suggestion Engine
// LLM-powered suggestions using Google Gemini 2.5 Flash
// with Structured Output for reliable JSON responses
// ============================================

import { GoogleGenAI, Type } from '@google/genai';
import type { Shape, Suggestion, SemanticLabel } from '../types';
import { v4 as uuidv4 } from 'uuid';

// ============================================
// Gemini 2.5 Flash Rate Limits (Free Tier)
// ============================================
// RPM: 10 requests per minute
// RPD: 1500 requests per day
// TPM: 250,000 tokens per minute
// TPD: 1,000,000 tokens per day
// ============================================

// API Key - loaded from environment variable (.env file)
// In Vite, environment variables must be prefixed with VITE_
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

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

// Gemini client instance (auto-initialized with hardcoded key)
let geminiClient: GoogleGenAI | null = null;

// User's design intent/description
let userDesignIntent: string = '';

// Rate limiting state
let minuteRequestCount = 0;
let dayRequestCount = 0;
let minuteTokenCount = 0;
let dayTokenCount = 0;
let minuteResetTime = 0;
let dayResetTime = 0;

// Auto-initialize Gemini client with hardcoded key
const autoInitialize = (): void => {
    if (!geminiClient && GEMINI_API_KEY) {
        geminiClient = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
        resetRateLimits();
        console.log('[Gemini] Auto-initialized with hardcoded API key');
    }
};

// Initialize Gemini client (kept for backwards compatibility)
export const initializeGemini = (key?: string): void => {
    const keyToUse = key || GEMINI_API_KEY;
    if (keyToUse) {
        geminiClient = new GoogleGenAI({ apiKey: keyToUse });
        resetRateLimits();
    }
};

// Set user's design intent
export const setDesignIntent = (intent: string): void => {
    userDesignIntent = intent;
    console.log('[Gemini] Design intent set:', intent);
};

// Get current design intent
export const getDesignIntent = (): string => {
    return userDesignIntent;
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
    autoInitialize(); // Try to auto-initialize if not done

    if (!geminiClient) {
        if (!GEMINI_API_KEY) {
            console.error('[Gemini] API key not configured! Please set GEMINI_API_KEY in GeminiSuggestionEngine.ts');
        } else {
            console.error('[Gemini] Client failed to initialize');
        }
        return false;
    }
    return true;
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
        ? shapes.map(s => `- ${s.type} "${s.name}" at (${Math.round(s.x)}, ${Math.round(s.y)}) size ${Math.round(s.width)}x${Math.round(s.height)}`).join('\n')
        : 'Empty canvas - suggest initial UI elements';

    // Include user's design intent if available
    const designContext = userDesignIntent
        ? `\nUser's Design Goal: "${userDesignIntent}"\nPlease suggest shapes that help achieve this design goal.\n`
        : '';

    return `You are a UI design assistant. Analyze the current canvas and suggest 1-2 complementary shapes that would improve the design.
${designContext}
Canvas dimensions: ${canvasWidth}x${canvasHeight}

Current shapes:
${shapeDescriptions}

Guidelines:
- Suggest shapes that complement the existing layout${userDesignIntent ? ` and help build: ${userDesignIntent}` : ''}
- Avoid overlapping with existing shapes
- Keep shapes within canvas bounds (0 to ${canvasWidth} for x, 0 to ${canvasHeight} for y)
- Use pleasant, accessible colors
- Consider visual hierarchy and spacing
- For empty canvas, suggest foundational elements like containers or buttons`;
};

// Schema for structured output - defines the expected response format
const suggestionSchema = {
    type: Type.OBJECT,
    properties: {
        suggestions: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    title: {
                        type: Type.STRING,
                        description: 'Short descriptive title for the suggestion',
                    },
                    description: {
                        type: Type.STRING,
                        description: 'Brief explanation of why this suggestion improves the design',
                    },
                    shapes: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                type: {
                                    type: Type.STRING,
                                    enum: ['rect', 'circle', 'frame'],
                                    description: 'Shape type - use frame for containers/groups that hold other elements',
                                },
                                x: {
                                    type: Type.NUMBER,
                                    description: 'X position of the shape',
                                },
                                y: {
                                    type: Type.NUMBER,
                                    description: 'Y position of the shape',
                                },
                                width: {
                                    type: Type.NUMBER,
                                    description: 'Width of the shape',
                                },
                                height: {
                                    type: Type.NUMBER,
                                    description: 'Height of the shape',
                                },
                                fill: {
                                    type: Type.STRING,
                                    description: 'Fill color in hex format (e.g., #E8F5E9). Use transparent for frames.',
                                },
                                stroke: {
                                    type: Type.STRING,
                                    description: 'Stroke color in hex format (e.g., #4CAF50)',
                                },
                            },
                            required: ['type', 'x', 'y', 'width', 'height', 'fill', 'stroke'],
                        },
                    },
                },
                required: ['title', 'description', 'shapes'],
            },
        },
    },
    required: ['suggestions'],
};

// Type for the structured response
interface GeminiStructuredResponse {
    suggestions: Array<{
        title: string;
        description: string;
        shapes: Array<{
            type: 'rect' | 'circle' | 'frame';
            x: number;
            y: number;
            width: number;
            height: number;
            fill: string;
            stroke: string;
        }>;
    }>;
}

// Generate suggestions using Gemini with Structured Output
export const generateGeminiSuggestions = async (
    shapes: Shape[],
    _selectedIds: string[],
    canvasWidth: number,
    canvasHeight: number
): Promise<{ suggestions: Suggestion[]; error?: string }> => {
    console.log('[Gemini] Generating suggestions with structured output...');

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

        // Use structured output with responseSchema
        const response = await geminiClient.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                maxOutputTokens: 50000,
                temperature: 0.7,
                responseMimeType: 'application/json',
                responseSchema: suggestionSchema,
            },
        });

        // Record usage (estimate ~500 tokens for this request)
        recordUsage(500);

        const text = response.text;
        console.log('[Gemini] Structured response received');

        if (!text) {
            return { suggestions: [] };
        }

        // Parse the structured JSON response directly (no need for complex parsing)
        const parsed: GeminiStructuredResponse = JSON.parse(text);

        if (!parsed.suggestions || !Array.isArray(parsed.suggestions)) {
            console.warn('[Gemini] Invalid response structure');
            return { suggestions: [] };
        }

        // Convert to internal Suggestion format
        const suggestions: Suggestion[] = parsed.suggestions.map((s, i) => ({
            id: uuidv4(),
            type: 'ai-suggestion' as const,
            title: s.title || `Suggestion ${i + 1}`,
            description: s.description || 'AI suggestion',
            confidence: 'high' as const,
            priority: 80 - i * 10,
            shapes: s.shapes
                .filter(shape =>
                    (shape.type === 'rect' || shape.type === 'circle' || shape.type === 'frame') &&
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
                    fill: shape.fill || (shape.type === 'frame' ? 'transparent' : '#E8F5E9'),
                    stroke: shape.stroke || (shape.type === 'frame' ? '#9E9E9E' : '#4CAF50'),
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
    setDesignIntent,
    getDesignIntent,
};
