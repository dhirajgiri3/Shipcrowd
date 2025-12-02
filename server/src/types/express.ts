import { Request } from 'express';
import mongoose from 'mongoose';

/**
 * Extended Express Request interface with authenticated user
 */
export interface AuthRequest extends Request {
  user?: {
    _id: string;
    role: string;
    companyId?: string;
  };
}

// Export the AuthRequest type to make it available to other modules
declare global {
  namespace Express {
    interface User {
      _id: string;
      role: string;
      companyId?: string;
    }
  }
}
