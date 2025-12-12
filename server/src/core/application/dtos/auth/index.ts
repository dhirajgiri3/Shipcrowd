import { z } from 'zod';

// Login DTO Schema
export const LoginDtoSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
});

export type LoginDto = z.infer<typeof LoginDtoSchema>;

// Register DTO Schema
export const RegisterDtoSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    password: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number'),
    phone: z.string().regex(/^[0-9]{10}$/, 'Phone number must be 10 digits').optional(),
});

export type RegisterDto = z.infer<typeof RegisterDtoSchema>;

// Forgot Password DTO Schema
export const ForgotPasswordDtoSchema = z.object({
    email: z.string().email('Invalid email address'),
});

export type ForgotPasswordDto = z.infer<typeof ForgotPasswordDtoSchema>;

// Reset Password DTO Schema
export const ResetPasswordDtoSchema = z.object({
    token: z.string().min(1, 'Token is required'),
    newPassword: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number'),
});

export type ResetPasswordDto = z.infer<typeof ResetPasswordDtoSchema>;
