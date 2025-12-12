import { Request, Response, NextFunction } from 'express';
import { rateLimit } from 'express-rate-limit';
import { verifyAccessToken } from '../../../shared/helpers/jwt';
import User from '../../../infrastructure/database/mongoose/models/User';
import { AuthRequest } from '../../../types/express';
import logger from '../../../shared/logger/winston.logger';

// Re-export the AuthRequest interface for backward compatibility
export type { AuthRequest };

/**
 * Middleware to verify JWT token
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const token = authHeader.split(' ')[1];

    // Verify token
    const payload = await verifyAccessToken(token);

    // Set user in request from token payload
    (req as AuthRequest).user = {
      _id: payload.userId,
      role: payload.role,
      companyId: payload.companyId,
    };

    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
};

/**
 * Middleware to check if user has required role
 */
export const authorize = (roles: string | string[]): ((req: Request, res: Response, next: NextFunction) => void) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as AuthRequest).user;
    if (!user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    if (!allowedRoles.includes(user.role)) {
      res.status(403).json({ message: 'Insufficient permissions' });
      return;
    }

    next();
  };
};

/**
 * Middleware to check if user belongs to the specified company
 */
export const checkCompany = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const user = (req as AuthRequest).user;
  if (!user) {
    res.status(401).json({ message: 'Authentication required' });
    return;
  }

  // Admin can access any company
  if (user.role === 'admin') {
    next();
    return;
  }

  const companyId = req.params.companyId || req.body.companyId;

  if (!companyId) {
    res.status(400).json({ message: 'Company ID is required' });
    return;
  }

  try {
    // Get the latest user data from the database
    const dbUser = await User.findById(user._id);

    if (!dbUser || !dbUser.companyId) {
      res.status(403).json({ message: 'User is not associated with any company' });
      return;
    }

    if (dbUser.companyId.toString() !== companyId.toString()) {
      res.status(403).json({ message: 'Access denied to this company' });
      return;
    }

    // Update the request user object with the latest companyId
    user.companyId = dbUser.companyId.toString();

    next();
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Rate limiter for login attempts
 */
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 5, // 5 requests per windowMs
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Too many login attempts, please try again later' },
});

/**
 * CSRF protection middleware
 */
export const csrfProtection = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Skip for test environment
  if (process.env.NODE_ENV === 'test') {
    next();
    return;
  }

  // Skip for GET, HEAD, OPTIONS requests
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    next();
    return;
  }

  const csrfToken = req.headers['x-csrf-token'];
  const origin = req.headers.origin || '';
  const referer = req.headers.referer || '';
  const userAgent = req.headers['user-agent'] || '';

  // Check if request is coming from Postman in development mode
  const isPostmanRequest = userAgent.includes('PostmanRuntime');
  const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;

  // Allow Postman requests in development mode
  if (isDevelopment && isPostmanRequest) {
    next();
    return;
  }

  // Check if request is coming from our frontend
  const allowedOrigins = [
    process.env.CLIENT_URL || 'http://localhost:3000',
    // Add other allowed origins here
  ];

  const isValidOrigin = allowedOrigins.some(
    (allowed) => origin === allowed || referer.startsWith(allowed)
  );

  if (!isValidOrigin || !csrfToken) {
    logger.warn('CSRF protection triggered', {
      origin,
      referer,
      csrfToken: !!csrfToken,
      userAgent,
      ip: req.ip,
    });
    res.status(403).json({ message: 'CSRF protection: Invalid request origin' });
    return;
  }

  next();
};

export default {
  authenticate,
  authorize,
  checkCompany,
  loginRateLimiter,
  csrfProtection,
};
