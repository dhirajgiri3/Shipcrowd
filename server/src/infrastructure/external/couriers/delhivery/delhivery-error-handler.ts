import logger from '../../../../shared/logger/winston.logger';

export class DelhiveryError extends Error {
    statusCode: number;
    isRetryable: boolean;

    constructor(statusCode: number, message: string, isRetryable: boolean) {
        super(message);
        this.statusCode = statusCode;
        this.isRetryable = isRetryable;
    }
}

export function handleDelhiveryError(error: any, context?: string): DelhiveryError {
    const errorContext = context || 'Delhivery API';

    if (error instanceof DelhiveryError) {
        return error;
    }

    if (error.response) {
        const status = error.response.status;
        const data = error.response.data;

        switch (status) {
            case 401:
                return new DelhiveryError(401, 'Delhivery authentication failed', false);
            case 400:
                return new DelhiveryError(400, data?.message || 'Validation failed', false);
            case 404:
                return new DelhiveryError(404, data?.message || 'Resource not found', false);
            case 422:
                return new DelhiveryError(422, data?.message || 'Unprocessable entity', false);
            case 429:
                return new DelhiveryError(429, 'Rate limit exceeded', true);
            case 500:
            case 502:
            case 503:
            case 504:
                return new DelhiveryError(status, 'Delhivery server error', true);
            default:
                return new DelhiveryError(status, `${errorContext} error`, status >= 500);
        }
    }

    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        return new DelhiveryError(408, 'Request timeout', true);
    }

    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        return new DelhiveryError(503, 'Network error - service unavailable', true);
    }

    return new DelhiveryError(500, `${errorContext} error`, true);
}

export async function retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000,
    context?: string
): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error: any) {
            lastError = error;

            const delhiveryError = error instanceof DelhiveryError
                ? error
                : handleDelhiveryError(error, context);

            if (!delhiveryError.isRetryable || attempt === maxRetries - 1) {
                throw delhiveryError;
            }

            const delay = baseDelay * Math.pow(2, attempt);
            const jitter = Math.random() * 0.3 * delay;
            const totalDelay = Math.floor(delay + jitter);

            logger.warn('Delhivery API error, retrying', {
                context,
                attempt: attempt + 1,
                maxRetries,
                delay: totalDelay,
                error: delhiveryError.message,
                statusCode: delhiveryError.statusCode
            });

            await new Promise((resolve) => setTimeout(resolve, totalDelay));
        }
    }

    throw lastError || new Error('Unknown error');
}
