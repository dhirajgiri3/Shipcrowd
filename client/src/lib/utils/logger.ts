// Production-ready utility to conditionally log in development only
export const isDevelopment = process.env.NODE_ENV === 'development';

export const devLog = (...args: any[]) => {
    if (isDevelopment) {
        console.log('[DEV]', ...args);
    }
};

export const devWarn = (...args: any[]) => {
    if (isDevelopment) {
        console.warn('[DEV]', ...args);
    }
};

export const devError = (...args: any[]) => {
    if (isDevelopment) {
        console.error('[DEV]', ...args);
    }
};

// Production-safe logger
export const logger = {
    info: (...args: any[]) => {
        if (isDevelopment) {
            console.log('[INFO]', ...args);
        }
    },
    warn: (...args: any[]) => {
        console.warn('[WARN]', ...args);
    },
    error: (...args: any[]) => {
        console.error('[ERROR]', ...args);
        // TODO: Send to error tracking service (Sentry, LogRocket, etc.)
    },
};

export default logger;
