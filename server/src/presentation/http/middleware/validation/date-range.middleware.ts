/**
 * Date Validation Middleware
 * ISSUE #20: Validate date range filters to prevent performance issues
 */

import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '../../../../shared/errors/app.error';
import { ErrorCode } from '../../../../shared/errors/errorCodes';

/**
 * Validate date range query parameters
 * Ensures dates are valid and range is not excessive (max 1 year)
 */
export const validateDateRange = (req: Request, res: Response, next: NextFunction): void => {
    const { startDate, endDate, from, to } = req.query;

    const start = startDate || from;
    const end = endDate || to;

    if (!start && !end) {
        // No date filters, continue
        next();
        return;
    }

    try {
        // Parse dates
        const startDateObj = start ? new Date(start as string) : null;
        const endDateObj = end ? new Date(end as string) : null;

        // Validate date objects
        if (startDateObj && isNaN(startDateObj.getTime())) {
            throw new ValidationError('Invalid start date format', ErrorCode.VAL_INVALID_FORMAT);
        }

        if (endDateObj && isNaN(endDateObj.getTime())) {
            throw new ValidationError('Invalid end date format', ErrorCode.VAL_INVALID_FORMAT);
        }

        // Ensure start is before end
        if (startDateObj && endDateObj && startDateObj > endDateObj) {
            throw new ValidationError('Start date must be before end date', ErrorCode.VAL_INVALID_INPUT);
        }

        // Limit range to 1 year to prevent performance issues
        if (startDateObj && endDateObj) {
            const diffMs = endDateObj.getTime() - startDateObj.getTime();
            const diffDays = diffMs / (1000 * 60 * 60 * 24);
            const maxDays = 365;

            if (diffDays > maxDays) {
                res.status(400).json({
                    success: false,
                    code: 'DATE_RANGE_TOO_LARGE',
                    message: `Date range cannot exceed ${maxDays} days. Please narrow your search.`,
                });
                return;
            }
        }

        // Prevent future dates for historical queries
        const now = new Date();
        if (startDateObj && startDateObj > now) {
            throw new ValidationError('Start date cannot be in the future', ErrorCode.VAL_INVALID_INPUT);
        }

        next();
    } catch (error) {
        next(error);
    }
};

export default validateDateRange;
