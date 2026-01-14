'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { authApi } from '@/src/core/api/authApi';

interface PasswordStrengthIndicatorProps {
    password: string;
    userInputs?: string[]; // Additional context like email, name for better analysis
    showSuggestions?: boolean;
    className?: string;
}

const strengthConfig = {
    0: {
        label: 'Very Weak',
        color: 'bg-red-500',
        textColor: 'text-red-600',
        width: '20%',
    },
    1: {
        label: 'Weak',
        color: 'bg-orange-500',
        textColor: 'text-orange-600',
        width: '40%',
    },
    2: {
        label: 'Fair',
        color: 'bg-yellow-500',
        textColor: 'text-yellow-600',
        width: '60%',
    },
    3: {
        label: 'Good',
        color: 'bg-blue-500',
        textColor: 'text-blue-600',
        width: '80%',
    },
    4: {
        label: 'Strong',
        color: 'bg-green-500',
        textColor: 'text-green-600',
        width: '100%',
    },
};

// Simple debounce helper
function debounce<T extends (...args: any[]) => any>(func: T, wait: number) {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

export const PasswordStrengthIndicator: React.FC<PasswordStrengthIndicatorProps> = ({
    password,
    userInputs = [],
    showSuggestions = true,
    className = '',
}) => {
    const [result, setResult] = useState<any | null>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [loading, setLoading] = useState(false);

    // Debounced backend password strength check
    const checkStrength = useCallback(
        debounce(async (pwd: string) => {
            if (!pwd || pwd.length < 3) {
                setResult(null);
                setIsVisible(false);
                return;
            }

            setLoading(true);
            try {
                // Call backend API for password strength
                const strengthData = await authApi.checkPasswordStrength(
                    pwd,
                    userInputs[0], // email if provided
                    userInputs[1]  // name if provided
                );

                setResult(strengthData);
                setIsVisible(true);
            } catch (error) {
                console.error('Password strength check failed:', error);
                // On error, hide indicator
                setResult(null);
                setIsVisible(false);
            } finally {
                setLoading(false);
            }
        }, 500), // 500ms debounce
        [userInputs]
    );

    useEffect(() => {
        checkStrength(password);
    }, [password, checkStrength]);

    if (!isVisible || !result) {
        return null;
    }

    const score = result.score as 0 | 1 | 2 | 3 | 4;
    const config = strengthConfig[score];

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className={`space-y-2 ${className}`}
            >
                {/* Strength Meter */}
                <div className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Password Strength</span>
                        <motion.span
                            key={config.label}
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className={`font-semibold ${config.textColor}`}
                        >
                            {loading ? 'Checking...' : config.label}
                        </motion.span>
                    </div>

                    {/* Progress Bar */}
                    <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: '0%' }}
                            animate={{ width: config.width }}
                            transition={{ duration: 0.3, ease: 'easeOut' }}
                            className={`h-full ${config.color} rounded-full`}
                        />
                    </div>
                </div>

                {/* Backend Feedback */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <span>{result.isStrong ? '✅ Strong password' : '⚠️ Could be stronger'}</span>
                </motion.div>

                {/* Feedback & Suggestions */}
                {showSuggestions && (result.feedback.warning || result.feedback.suggestions.length > 0) && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        transition={{ delay: 0.2 }}
                        className="space-y-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                        {/* Warning */}
                        {result.feedback.warning && (
                            <div className="flex items-start gap-2 text-xs text-amber-600 dark:text-amber-400">
                                <svg
                                    className="w-4 h-4 mt-0.5 flex-shrink-0"
                                    fill="currentColor"
                                    viewBox="0 0 20 20">
                                    <path
                                        fillRule="evenodd"
                                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                                <span>{result.feedback.warning}</span>
                            </div>
                        )}

                        {/* Suggestions */}
                        {result.feedback.suggestions.length > 0 && (
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                    💡 Suggestions:
                                </p>
                                <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                                    {result.feedback.suggestions.map((suggestion: string, index: number) => (
                                        <motion.li
                                            key={index}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.3 + index * 0.1 }}
                                            className="flex items-start gap-2">
                                            <span className="text-blue-500 mt-0.5">•</span>
                                            <span>{suggestion}</span>
                                        </motion.li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </motion.div>
                )}

                {/* Requirements Checklist (Optional) */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="grid grid-cols-2 gap-2 pt-2 text-xs"
                >
                    <RequirementCheck
                        met={password.length >= 8}
                        label="At least 8 characters"
                    />
                    <RequirementCheck
                        met={/[A-Z]/.test(password)}
                        label="Uppercase letter"
                    />
                    <RequirementCheck
                        met={/[a-z]/.test(password)}
                        label="Lowercase letter"
                    />
                    <RequirementCheck
                        met={/[0-9]/.test(password)}
                        label="Number"
                    />
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

interface RequirementCheckProps {
    met: boolean;
    label: string;
}

const RequirementCheck: React.FC<RequirementCheckProps> = ({ met, label }) => {
    return (
        <div className="flex items-center gap-1.5">
            <motion.div
                initial={false}
                animate={{
                    scale: met ? 1 : 0.8,
                    backgroundColor: met ? '#10b981' : '#e5e7eb',
                }}
                transition={{ duration: 0.2 }}
                className="w-4 h-4 rounded-full flex items-center justify-center"
            >
                {met && (
                    <motion.svg
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-3 h-3 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M5 13l4 4L19 7"
                        />
                    </motion.svg>
                )}
            </motion.div>
            <span
                className={`${met ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-500'
                    }`}
            >
                {label}
            </span>
        </div>
    );
};

export default PasswordStrengthIndicator;
