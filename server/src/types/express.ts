/**
 * Global Type Augmentation for Express
 * 
 * This file extends the Express Request interface globally to include
 * the `user` property that is added by authentication middleware.
 * 
 * With this augmentation, you can use the standard `Request` type everywhere
 * and TypeScript will know about `req.user` automatically.
 * 
 * Usage:
 *   import { Request, Response, NextFunction } from 'express';
 *   
 *   function handler(req: Request, res: Response) {
 *     const userId = req.user._id;  // ✅ TypeScript knows about user!
 *   }
 */

import { Request } from 'express';
import * as winston from 'winston';

declare global {
  namespace Express {
    /**
     * User object added to Request by authentication middleware
     * Extends Express's built-in User interface
     */
    interface User {
      _id: string;
      email?: string;
      name?: string;
      role: string;
      companyId?: string;
      teamRole?: 'owner' | 'admin' | 'manager' | 'member' | 'viewer';
      teamStatus?: 'active' | 'invited' | 'suspended';
    }

    /**
     * Additional properties added to Request
     */
    interface Request {
      correlationId?: string;
      requestLogger?: winston.Logger;
    }
  }
}

/**
 * @deprecated Use the standard Request type from 'express' instead
 * This type is kept for backward compatibility but is no longer needed
 * since we use global type augmentation above.
 * 
 * If you see `AuthRequest` in imports, you can safely replace it with `Request`.
 */
export interface AuthRequest extends Request {
  user?: {
    _id: string;
    email?: string;
    name?: string;
    role: string;
    companyId?: string;
    teamRole?: 'owner' | 'admin' | 'manager' | 'member' | 'viewer';
    teamStatus?: 'active' | 'invited' | 'suspended';
  };
}

// This export is required for TypeScript to treat this file as a module
// and apply the global augmentation properly
export { };
