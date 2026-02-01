/**
 * Password Utilities
 * Shared password validation and strength calculation
 */

export interface PasswordStrength {
    isValid: boolean;
    strength: 'weak' | 'fair' | 'good' | 'strong';
    score: number;      // 0-5
    label: string;      // 'Weak', 'Fair', 'Good', 'Strong'
    color: 'red' | 'amber' | 'blue' | 'emerald' | '';
    requirements: {
        minLength: boolean;
        hasUppercase: boolean;
        hasLowercase: boolean;
        hasNumber: boolean;
        hasSpecial: boolean;
    };
}

/**
 * Validate password - returns full password strength info
 */
export function validatePassword(password: string): PasswordStrength {
    const requirements = {
        minLength: password.length >= 8,
        hasUppercase: /[A-Z]/.test(password),
        hasLowercase: /[a-z]/.test(password),
        hasNumber: /\d/.test(password),
        hasSpecial: /[^a-zA-Z0-9]/.test(password),
    };

    let score = 0;
    if (requirements.minLength) score++;
    if (password.length >= 12) score++;
    if (requirements.hasUppercase && requirements.hasLowercase) score++;
    if (requirements.hasNumber) score++;
    if (requirements.hasSpecial) score++;

    const isValid = requirements.minLength &&
        requirements.hasUppercase &&
        requirements.hasLowercase &&
        requirements.hasNumber;

    let strength: 'weak' | 'fair' | 'good' | 'strong';
    let label: string;
    let color: 'red' | 'amber' | 'blue' | 'emerald' | '';

    if (score <= 2) {
        strength = 'weak';
        label = 'Weak';
        color = 'red';
    } else if (score === 3) {
        strength = 'fair';
        label = 'Fair';
        color = 'amber';
    } else if (score === 4) {
        strength = 'good';
        label = 'Good';
        color = 'blue';
    } else {
        strength = 'strong';
        label = 'Strong';
        color = 'emerald';
    }

    return { isValid, strength, score, label, color, requirements };
}

/**
 * Calculate password strength - alias for validatePassword
 */
export function getPasswordStrength(password: string): PasswordStrength {
    return validatePassword(password);
}

/**
 * Check if password meets minimum requirements
 */
export function isPasswordValid(password: string): boolean {
    return validatePassword(password).isValid;
}

/**
 * Get password requirements list with status
 */
export function getPasswordRequirements(password: string) {
    const req = validatePassword(password).requirements;
    return [
        { label: 'At least 8 characters', met: req.minLength },
        { label: 'Uppercase letter', met: req.hasUppercase },
        { label: 'Lowercase letter', met: req.hasLowercase },
        { label: 'Number', met: req.hasNumber },
        { label: 'Special character', met: req.hasSpecial },
    ];
}

/**
 * Get password strength color for UI
 */
export function getPasswordStrengthColor(password: string): string {
    const strength = validatePassword(password);
    const colorMap: Record<string, string> = {
        'red': 'text-red-500',
        'amber': 'text-amber-500',
        'blue': 'text-blue-500',
        'emerald': 'text-emerald-500',
        '': 'text-gray-400',
    };
    return colorMap[strength.color] || 'text-gray-400';
}

/**
 * Get password strength label for UI
 */
export function getPasswordStrengthLabel(password: string): string {
    return validatePassword(password).label;
}
