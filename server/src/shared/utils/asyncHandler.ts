import { NextFunction, Request, RequestHandler, Response } from 'express';

/**
 * Type-safe async handler wrapper
 * Wraps async controller functions and forwards errors to Express error handler
 * 
 * @param fn - Async controller function
 * @returns Express RequestHandler
 * 
 * @example
 * router.get('/users', asyncHandler(async (req, res) => {
 *   const users = await getUsersService();
 *   res.json({ success: true, data: users });
 * }));
 */
export const asyncHandler = (
    fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
): RequestHandler => {
    return (req: Request, res: Response, next: NextFunction): void => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

/**
 * Type-safe async handler with custom request type
 * Useful for handlers with extended request objects (e.g., AuthRequest)
 * 
 * @param fn - Async controller function with custom request type
 * @returns Express RequestHandler
 * 
 * @example
 * router.get('/profile', authenticate, asyncHandler<AuthRequest>(async (req, res) => {
 *   const user = await getUserById(req.user._id);
 *   res.json({ success: true, data: user });
 * }));
 */
export const asyncHandlerWithType = <T extends Request = Request>(
    fn: (req: T, res: Response, next: NextFunction) => Promise<any>
): RequestHandler => {
    return (req: Request, res: Response, next: NextFunction): void => {
        Promise.resolve(fn(req as T, res, next)).catch(next);
    };
};

export default asyncHandler;
