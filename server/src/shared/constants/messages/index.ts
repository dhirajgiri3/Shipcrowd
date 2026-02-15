/**
 * Message Constants - Central Export
 * 
 * All user-facing messages are centralized here for:
 * - Consistency across the application
 * - Easy updates and maintenance
 * - Future i18n support
 * - Better testing
 */

export { AUTH_MESSAGES } from './auth.messages';
export { BUSINESS_MESSAGES } from './business.messages';
export { SUCCESS_MESSAGES } from './success.messages';
export { SYSTEM_MESSAGES } from './system.messages';
export { VALIDATION_MESSAGES } from './validation.messages';

import { AUTH_MESSAGES } from './auth.messages';
import { BUSINESS_MESSAGES } from './business.messages';
import { SUCCESS_MESSAGES } from './success.messages';
import { SYSTEM_MESSAGES } from './system.messages';
import { VALIDATION_MESSAGES } from './validation.messages';

/**
 * Combined messages object for convenient access
 * 
 * @example
 * ```typescript
 * import { MESSAGES } from '@/shared/constants/messages';
 * 
 * // In controllers
 * sendError(res, MESSAGES.AUTH.INVALID_CREDENTIALS, 401, ErrorCode.AUTH_INVALID_CREDENTIALS);
 * sendSuccess(res, data, MESSAGES.SUCCESS.LOGIN_SUCCESS);
 * 
 * // In services
 * throw new NotFoundError(MESSAGES.BUSINESS.USER_NOT_FOUND, ErrorCode.RES_USER_NOT_FOUND);
 * 
 * // Dynamic messages
 * sendError(res, MESSAGES.VALIDATION.MIN_LENGTH('Password', 8), 400, ErrorCode.VAL_MIN_LENGTH);
 * sendSuccess(res, data, MESSAGES.SUCCESS.CREATED('Order'));
 * ```
 */
export const MESSAGES = {
    AUTH: AUTH_MESSAGES,
    VALIDATION: VALIDATION_MESSAGES,
    BUSINESS: BUSINESS_MESSAGES,
    SYSTEM: SYSTEM_MESSAGES,
    SUCCESS: SUCCESS_MESSAGES,
} as const;

/**
 * Type helper for message keys
 * Useful for type-safe message access
 */
export type MessageCategory = keyof typeof MESSAGES;
export type AuthMessageKey = keyof typeof AUTH_MESSAGES;
export type ValidationMessageKey = keyof typeof VALIDATION_MESSAGES;
export type BusinessMessageKey = keyof typeof BUSINESS_MESSAGES;
export type SystemMessageKey = keyof typeof SYSTEM_MESSAGES;
export type SuccessMessageKey = keyof typeof SUCCESS_MESSAGES;
