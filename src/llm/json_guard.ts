// JSON validation and sanitization for LLM responses

import type { SneakerSpec } from './types';
import { logger } from '../core/logger';

/**
 * Validate and sanitize LLM JSON response
 */
export function validateLLMResponse(response: any): {
  valid: boolean;
  errors: string[];
  data?: any;
} {
  const errors: string[] = [];

  // Check if response is object
  if (!response || typeof response !== 'object') {
    errors.push('Response is not an object');
    return { valid: false, errors };
  }

  // Check for items array (various formats)
  const hasItems =
    Array.isArray(response.items) ||
    Array.isArray(response.sneakers) ||
    Array.isArray(response.models) ||
    response.model;

  if (!hasItems) {
    errors.push('Response missing items/sneakers/models array');
    return { valid: false, errors };
  }

  return { valid: true, errors: [], data: response };
}

/**
 * Sanitize field values to prevent injection attacks
 */
export function sanitizeField(value: any, fieldType: 'string' | 'number' | 'boolean'): any {
  if (value === null || value === undefined) {
    return null;
  }

  switch (fieldType) {
    case 'string':
      return sanitizeString(value);
    case 'number':
      return sanitizeNumber(value);
    case 'boolean':
      return sanitizeBoolean(value);
    default:
      return null;
  }
}

/**
 * Sanitize string values
 */
function sanitizeString(value: any): string | null {
  if (typeof value !== 'string') {
    value = String(value);
  }

  // Remove control characters and excessive whitespace
  let sanitized = value
    .replace(/[\x00-\x1F\x7F-\x9F]/g, '') // Remove control chars
    .replace(/\s+/g, ' ')                  // Normalize whitespace
    .trim();

  // Limit length to prevent abuse
  const MAX_LENGTH = 500;
  if (sanitized.length > MAX_LENGTH) {
    sanitized = sanitized.substring(0, MAX_LENGTH);
    logger.warn('String truncated to max length', { original: value.length, max: MAX_LENGTH });
  }

  return sanitized || null;
}

/**
 * Sanitize number values
 */
function sanitizeNumber(value: any): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = parseFloat(value.replace(/[^\d.-]/g, ''));
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

/**
 * Sanitize boolean values
 */
function sanitizeBoolean(value: any): boolean | null {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const lower = value.toLowerCase();
    if (lower === 'true' || lower === 'yes' || lower === '1') return true;
    if (lower === 'false' || lower === 'no' || lower === '0') return false;
  }

  if (typeof value === 'number') {
    return value !== 0;
  }

  return null;
}

/**
 * Sanitize entire sneaker object
 */
export function sanitizeSneaker(raw: any): Partial<SneakerSpec> {
  return {
    brand_name: sanitizeField(raw.brand_name || raw.brand, 'string'),
    model: sanitizeField(raw.model || raw.model_name, 'string'),

    heel_height: sanitizeField(raw.heel_height, 'number'),
    forefoot_height: sanitizeField(raw.forefoot_height, 'number'),
    drop: sanitizeField(raw.drop, 'number'),
    weight: sanitizeField(raw.weight, 'number'),
    price: sanitizeField(raw.price_usd || raw.price, 'number'),

    upper_breathability: sanitizeEnum(raw.upper_breathability, ['low', 'medium', 'high']) as "low" | "medium" | "high" | null,
    carbon_plate: sanitizeField(raw.carbon_plate, 'boolean'),
    waterproof: sanitizeField(raw.waterproof, 'boolean'),

    primary_use: sanitizeField(raw.primary_use, 'string'),
    cushioning_type: sanitizeEnum(raw.cushioning_type || raw.cushioning, ['firm', 'balanced', 'max']) as "firm" | "balanced" | "max" | null,
    surface_type: sanitizeEnum(raw.surface_type || raw.surface, ['road', 'trail']) as "road" | "trail" | null,
    foot_width: sanitizeEnum(raw.foot_width || raw.width, ['narrow', 'standard', 'wide']) as "narrow" | "standard" | "wide" | null,

    additional_features: sanitizeField(raw.additional_features, 'string'),
  };
}

/**
 * Sanitize enum values
 */
function sanitizeEnum<T extends string>(value: any, allowedValues: readonly T[]): T | null {
  if (!value) return null;

  const str = String(value).toLowerCase().trim();

  for (const allowed of allowedValues) {
    if (str === allowed.toLowerCase()) {
      return allowed as T;
    }
  }

  return null;
}

/**
 * Detect potential injection attempts in response
 */
export function detectInjectionAttempt(response: any): boolean {
  const jsonStr = JSON.stringify(response);

  // Check for suspicious patterns
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,  // Event handlers
    /eval\s*\(/i,
    /function\s*\(/i,
    /\$\{/,        // Template literals
    /import\s+/i,
    /require\s*\(/i,
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(jsonStr)) {
      logger.warn('Potential injection attempt detected', { pattern: pattern.toString() });
      return true;
    }
  }

  return false;
}

/**
 * Safe JSON parse with error handling
 */
export function safeJSONParse(text: string): { success: boolean; data?: any; error?: string } {
  try {
    const data = JSON.parse(text);

    // Check for injection attempts
    if (detectInjectionAttempt(data)) {
      return {
        success: false,
        error: 'Potential injection attempt detected in response'
      };
    }

    return { success: true, data };
  } catch (error) {
    logger.error('JSON parse failed', { error });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown parse error'
    };
  }
}
