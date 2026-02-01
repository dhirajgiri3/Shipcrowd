"use client"

import { motion } from "framer-motion"
import { getPasswordStrength, PasswordStrength } from "@/src/lib/utils/password"

interface PasswordStrengthIndicatorProps {
    password: string;
    className?: string;
}

const colorMap = {
    red: { bar: 'bg-red-500', text: 'text-red-500' },
    amber: { bar: 'bg-amber-500', text: 'text-amber-500' },
    blue: { bar: 'bg-primaryBlue', text: 'text-primaryBlue' },
    emerald: { bar: 'bg-emerald-500', text: 'text-emerald-500' },
    '': { bar: 'bg-gray-200', text: 'text-gray-500' },
};

/**
 * Password Strength Indicator
 * Shows visual strength bars and label
 */
export function PasswordStrengthIndicator({ password, className = "" }: PasswordStrengthIndicatorProps) {
    if (!password) return null;

    const strength = getPasswordStrength(password);
    const colors = colorMap[strength.color];

    return (
        <motion.div
            className={`mt-3 space-y-2 ${className}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
        >
            <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((level) => (
                    <div
                        key={level}
                        className={`h-1 flex-1 rounded-full transition-all ${strength.score >= level ? colors.bar : 'bg-gray-200'
                            }`}
                    />
                ))}
            </div>
            <div className="flex justify-between items-center">
                <p className="text-xs text-gray-500">
                    Must be at least 8 characters
                </p>
                <span className={`text-xs font-semibold ${colors.text}`}>
                    {strength.label}
                </span>
            </div>
        </motion.div>
    );
}
