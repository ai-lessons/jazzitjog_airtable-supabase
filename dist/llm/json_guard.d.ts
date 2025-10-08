import type { SneakerSpec } from './types';
/**
 * Validate and sanitize LLM JSON response
 */
export declare function validateLLMResponse(response: any): {
    valid: boolean;
    errors: string[];
    data?: any;
};
/**
 * Sanitize field values to prevent injection attacks
 */
export declare function sanitizeField(value: any, fieldType: 'string' | 'number' | 'boolean'): any;
/**
 * Sanitize entire sneaker object
 */
export declare function sanitizeSneaker(raw: any): Partial<SneakerSpec>;
/**
 * Detect potential injection attempts in response
 */
export declare function detectInjectionAttempt(response: any): boolean;
/**
 * Safe JSON parse with error handling
 */
export declare function safeJSONParse(text: string): {
    success: boolean;
    data?: any;
    error?: string;
};
//# sourceMappingURL=json_guard.d.ts.map