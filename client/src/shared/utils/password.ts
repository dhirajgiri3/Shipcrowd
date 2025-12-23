/**
 * Password Utilities
 * Shared password validation and strength calculation
 */

export interface PasswordStrength {
    score: number;      // 0-5
    label: string;      // 'Weak', 'Fair', 'Good', 'Strong'
    color: 'red' | 'amber' | 'blue' | 'emerald' | '';
}

/**
 * Calculate password strength
 * Returns score (0-5), label, and color
 */
export function getPasswordStrength(password: string): PasswordStrength {
    if (!password) return { score: 0, label: '', color: '' };

    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;

    if (score <= 2) return { score, label: 'Weak', color: 'red' };
    if (score === 3) return { score, label: 'Fair', color: 'amber' };
    if (score === 4) return { score, label: 'Good', color: 'blue' };
    return { score, label: 'Strong', color: 'emerald' };
}

/**
 * Check if password meets minimum requirements
 */
export function isPasswordValid(password: string): boolean {
    return password.length >= 8;
}

/**
 * Get password requirements list with status
 */
export function getPasswordRequirements(password: string) {
    return [
        { label: 'At least 8 characters', met: password.length >= 8 },
        { label: 'Uppercase letter', met: /[A-Z]/.test(password) },
        { label: 'Lowercase letter', met: /[a-z]/.test(password) },
        { label: 'Number', met: /\d/.test(password) },
        { label: 'Special character', met: /[^a-zA-Z0-9]/.test(password) },
    ];
}
