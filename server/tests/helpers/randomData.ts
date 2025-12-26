/**
 * Random Data Utilities for Tests
 * Lightweight random data generators to avoid ESM faker.js dependency
 */

/**
 * Generate a random string of alphanumeric characters
 */
export const randomString = (length: number = 8): string => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

/**
 * Generate a random numeric string
 */
export const randomNumeric = (length: number = 10): string => {
    const chars = '0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

/**
 * Generate a random email
 */
export const randomEmail = (domain: string = 'test.com'): string => {
    return `user_${randomString(8).toLowerCase()}@${domain}`;
};

/**
 * Generate a random phone number (Indian format)
 */
export const randomPhone = (): string => {
    return `+91${randomNumeric(10)}`;
};

/**
 * Generate a random name
 */
export const randomName = (): string => {
    const firstNames = ['John', 'Jane', 'Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Wilson', 'Taylor'];
    const first = firstNames[Math.floor(Math.random() * firstNames.length)];
    const last = lastNames[Math.floor(Math.random() * lastNames.length)];
    return `${first} ${last}`;
};

/**
 * Generate a random company name
 */
export const randomCompanyName = (): string => {
    const prefixes = ['Global', 'Prime', 'Elite', 'Express', 'Quick', 'Swift', 'Pro', 'Smart'];
    const suffixes = ['Solutions', 'Logistics', 'Trading', 'Commerce', 'Enterprises', 'Corp', 'Ltd', 'Ventures'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    return `${prefix} ${suffix}`;
};

/**
 * Generate a random address line
 */
export const randomAddress = (): string => {
    const num = Math.floor(Math.random() * 999) + 1;
    const streets = ['Main Street', 'Park Avenue', 'Oak Road', 'Maple Lane', 'Cedar Drive', 'Pine Street'];
    const street = streets[Math.floor(Math.random() * streets.length)];
    return `${num} ${street}`;
};

/**
 * Generate a random city
 */
export const randomCity = (): string => {
    const cities = ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata', 'Hyderabad', 'Pune', 'Ahmedabad'];
    return cities[Math.floor(Math.random() * cities.length)];
};

/**
 * Generate a random Indian state
 */
export const randomState = (): string => {
    const states = ['Maharashtra', 'Karnataka', 'Tamil Nadu', 'Delhi', 'Gujarat', 'West Bengal', 'Rajasthan', 'Telangana'];
    return states[Math.floor(Math.random() * states.length)];
};

/**
 * Generate a random pincode
 */
export const randomPincode = (): string => {
    return randomNumeric(6);
};

/**
 * Generate a random product name
 */
export const randomProductName = (): string => {
    const adjectives = ['Premium', 'Deluxe', 'Essential', 'Classic', 'Modern', 'Eco'];
    const products = ['T-Shirt', 'Jeans', 'Watch', 'Bag', 'Shoes', 'Electronics', 'Book', 'Toy'];
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const prod = products[Math.floor(Math.random() * products.length)];
    return `${adj} ${prod}`;
};

/**
 * Generate a random integer between min and max (inclusive)
 */
export const randomInt = (min: number, max: number): number => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

/**
 * Generate a random float between min and max
 */
export const randomFloat = (min: number, max: number, decimals: number = 2): number => {
    const value = Math.random() * (max - min) + min;
    return parseFloat(value.toFixed(decimals));
};

/**
 * Generate a unique ID (timestamp + random)
 */
export const uniqueId = (prefix: string = ''): string => {
    return `${prefix}${Date.now().toString(36)}${randomString(6)}`;
};

/**
 * Generate a random GSTIN (for testing)
 */
export const randomGstin = (): string => {
    const stateCode = randomNumeric(2);
    const pan = randomString(10).toUpperCase();
    const entityCode = randomNumeric(1);
    const checksum = randomString(1).toUpperCase();
    return `${stateCode}${pan}${entityCode}Z${checksum}`;
};

/**
 * Generate a random date in the future
 */
export const randomFutureDate = (daysAhead: number = 30): Date => {
    const now = new Date();
    const futureMs = now.getTime() + (Math.random() * daysAhead * 24 * 60 * 60 * 1000);
    return new Date(futureMs);
};

/**
 * Generate a random date in the past
 */
export const randomPastDate = (daysBack: number = 30): Date => {
    const now = new Date();
    const pastMs = now.getTime() - (Math.random() * daysBack * 24 * 60 * 60 * 1000);
    return new Date(pastMs);
};
