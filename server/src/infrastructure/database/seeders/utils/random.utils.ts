/**
 * Random Data Generation Utilities
 * 
 * Core utilities for generating random values with various distributions.
 */

import crypto from 'crypto';

/**
 * Generate a random integer between min and max (inclusive)
 */
export function randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generate a random float between min and max with specified decimal places
 */
export function randomFloat(min: number, max: number, decimals: number = 2): number {
    const value = Math.random() * (max - min) + min;
    return Number(value.toFixed(decimals));
}

/**
 * Select a random element from an array
 */
export function selectRandom<T>(array: T[]): T {
    if (array.length === 0) {
        throw new Error('Cannot select from empty array');
    }
    return array[Math.floor(Math.random() * array.length)];
}

/**
 * Select multiple unique random elements from an array
 */
export function selectMultipleRandom<T>(array: T[], count: number): T[] {
    if (count > array.length) {
        throw new Error('Cannot select more elements than array length');
    }
    const shuffled = [...array].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
}

/**
 * Select a random element based on weighted probabilities
 * @param items Array of items to choose from
 * @param weights Array of weights corresponding to each item (should sum to 100)
 */
export function selectWeighted<T>(items: T[], weights: number[]): T {
    if (items.length !== weights.length) {
        throw new Error('Items and weights arrays must have the same length');
    }

    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    let random = Math.random() * totalWeight;

    for (let i = 0; i < items.length; i++) {
        random -= weights[i];
        if (random <= 0) {
            return items[i];
        }
    }

    return items[items.length - 1];
}

/**
 * Select from an object with keys as items and values as weights
 */
export function selectWeightedFromObject<T extends string>(
    distribution: Record<T, number>
): T {
    const items = Object.keys(distribution) as T[];
    const weights = Object.values(distribution) as number[];
    return selectWeighted(items, weights);
}

/**
 * Generate a UUID v4
 */
export function generateUUID(): string {
    return crypto.randomUUID();
}

/**
 * Generate a random hex string of specified length
 */
export function generateHexString(length: number): string {
    return crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
}

/**
 * Generate a random alphanumeric string
 */
export function generateAlphanumeric(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

/**
 * Generate a random numeric string
 */
export function generateNumericString(length: number): string {
    let result = '';
    for (let i = 0; i < length; i++) {
        result += Math.floor(Math.random() * 10).toString();
    }
    return result;
}

/**
 * Generate a random hex color
 */
export function generateHexColor(): string {
    return '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
}

/**
 * Maybe return a value with given probability
 */
export function maybe<T>(value: T, probability: number = 0.5): T | undefined {
    return Math.random() < probability ? value : undefined;
}

/**
 * Maybe execute a function with given probability
 */
export function maybeExecute<T>(fn: () => T, probability: number = 0.5): T | undefined {
    return Math.random() < probability ? fn() : undefined;
}

/**
 * Shuffle an array (Fisher-Yates algorithm)
 */
export function shuffleArray<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

/**
 * Split an array into chunks
 */
export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
        chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
}

/**
 * Generate a random boolean with given probability of true
 */
export function randomBoolean(probabilityTrue: number = 0.5): boolean {
    return Math.random() < probabilityTrue;
}

/**
 * Generate a random amount variation (for realistic pricing)
 */
export function varyAmount(baseAmount: number, variancePercent: number = 10): number {
    const variance = baseAmount * (variancePercent / 100);
    return Math.round(baseAmount + (Math.random() * 2 - 1) * variance);
}

/**
 * Pick a random date between two dates
 */
export function randomDateBetween(start: Date, end: Date): Date {
    const startTime = start.getTime();
    const endTime = end.getTime();
    const randomTime = startTime + Math.random() * (endTime - startTime);
    return new Date(randomTime);
}

/**
 * Generate a sequence of numbers
 */
export function sequence(start: number, count: number): number[] {
    return Array.from({ length: count }, (_, i) => start + i);
}
