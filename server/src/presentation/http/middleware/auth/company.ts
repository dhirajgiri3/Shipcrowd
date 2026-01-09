/**
 * Company Middleware
 * 
 * Middleware to ensure authenticated user has a companyId.
 * Used for routes that require company context (e.g., warehouse operations).
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to require company context
 * Returns 403 if user doesn't have a companyId
 */
export const requireCompany = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    const user = req.user;

    if (!user) {
        res.status(401).json({ message: 'Authentication required' });
        return;
    }

    if (!user.companyId) {
        res.status(403).json({
            message: 'Company context required. Please create or join a company first.',
            code: 'COMPANY_REQUIRED'
        });
        return;
    }

    next();
};

export default requireCompany;
