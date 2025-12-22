/**
 * Custom Error Types
 * Extends Error to include error code property
 */

export interface AppError extends Error {
    code?: string;
}

export const createAppError = (message: string, code?: string): AppError => {
    const error = new Error(message) as AppError;
    if (code) {
        error.code = code;
    }
    return error;
};
