/**
 * Internal Error Types
 */

export enum ErrorSeverity {
    CRITICAL = "critical", // Requires modal + blocking
    ERROR = "error",       // Toast notification
    WARNING = "warning",   // Toast notification
    INFO = "info",         // Toast notification
}

export enum ErrorCategory {
    AUTHENTICATION = "authentication",
    AUTHORIZATION = "authorization",
    VALIDATION = "validation",
    NETWORK = "network",
    SERVER = "server",
    CLIENT = "client",
    UNKNOWN = "unknown",
}

export interface AppError {
    message: string;
    code?: string;
    severity?: ErrorSeverity;
    category?: ErrorCategory;
    originalError?: any;
    context?: Record<string, any>;
}
