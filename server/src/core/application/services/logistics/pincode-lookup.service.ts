import csv from 'csv-parser';
import fs from 'fs';
import path from 'path';
import SystemConfiguration from '../../../../infrastructure/database/mongoose/models/configuration/system-configuration.model';
import logger from '../../../../shared/logger/winston.logger';

/**
 * Pincode Details from CSV
 */
export interface PincodeDetails {
    pincode: string;
    city: string;
    state: string;
}

/**
 * Zone Information for rate calculation
 */
export interface ZoneInfo {
    zone: 'zoneA' | 'zoneB' | 'zoneC' | 'zoneD' | 'zoneE';
    isSameCity: boolean;
    isSameState: boolean;
    distance?: number;
}

/**
 * Pincode Lookup Service
 * 
 * Singleton service that loads pincode data from CSV file into memory
 * for ultra-fast lookups without database queries.
 * 
 * Architecture:
 * - Loads CSV ONCE at startup (not per request)
 * - Stores in Map for O(1) lookup performance
 * - ~30MB memory footprint for 154k pincodes
 * - Fallback to database if CSV unavailable
 */
class PincodeLookupService {
    private static instance: PincodeLookupService;
    private pincodeCache: Map<string, PincodeDetails> = new Map();
    private isLoaded: boolean = false;
    private csvPath: string;

    // Metro cities for zone calculation (loaded from config)
    private metroCities: string[] = [
        'NEW DELHI', 'DELHI', 'MUMBAI', 'KOLKATA', 'CHENNAI',
        'BENGALURU', 'BANGALORE', 'HYDERABAD', 'PUNE', 'AHMEDABAD'
    ]; // Default fallback

    // J&K and Northeast states for special zone
    private readonly JKNE_STATES = [
        'JAMMU AND KASHMIR', 'ARUNACHAL PRADESH', 'ASSAM',
        'MANIPUR', 'MEGHALAYA', 'MIZORAM', 'NAGALAND',
        'TRIPURA', 'SIKKIM'
    ];

    private constructor() {
        // Path from: src/core/application/services/logistics/
        // To: src/assets/pincodes.csv
        this.csvPath = path.join(__dirname, '../../../../assets/pincodes.csv');
    }

    /**
     * Get singleton instance
     */
    public static getInstance(): PincodeLookupService {
        if (!PincodeLookupService.instance) {
            PincodeLookupService.instance = new PincodeLookupService();
        }
        return PincodeLookupService.instance;
    }

    /**
     * Load configuration from database (e.g. Metro cities)
     */
    public async loadConfig(): Promise<void> {
        try {
            const config = await SystemConfiguration.findOne({ key: 'metro_cities', isActive: true }).lean();
            if (config && Array.isArray(config.value)) {
                this.metroCities = config.value.map((city: string) => city.toUpperCase());
                logger.info(`[PincodeLookup] Loaded ${this.metroCities.length} metro cities from config`);
            } else {
                logger.info('[PincodeLookup] No metro config found, using defaults');

                // Optional: Seed the config if missing
                try {
                    await SystemConfiguration.create({
                        key: 'metro_cities',
                        value: this.metroCities, // Current defaults
                        description: 'List of Metro cities for Zone C calculation',
                        isActive: true,
                        meta: {
                            source: 'system_init',
                            updatedAt: new Date()
                        }
                    });
                    logger.info('[PincodeLookup] Seeded default metro configuration');
                } catch (seedError) {
                    // Ignore duplicate key error if race condition
                    logger.warn('[PincodeLookup] Failed to seed metro config (might already exist)');
                }
            }
        } catch (error) {
            logger.error('[PincodeLookup] Failed to load config:', error);
            // Non-blocking, continue with defaults
        }
    }

    /**
     * Load pincodes from CSV file into memory
     * Called once during server startup
     */
    public async loadPincodesFromCSV(): Promise<void> {
        // Load config in parallel or before
        await this.loadConfig();

        if (this.isLoaded) {
            logger.info('Pincode cache already loaded, skipping...');
            return;
        }

        const startTime = Date.now();
        logger.info('Loading pincodes from CSV...');

        return new Promise((resolve, reject) => {
            const results: PincodeDetails[] = [];

            fs.createReadStream(this.csvPath)
                .pipe(csv())
                .on('data', (row: any) => {
                    // Normalize the data
                    const pincode = row.pincode?.trim();
                    const city = row.city?.trim().toUpperCase();
                    const state = row.state?.trim().toUpperCase();

                    if (pincode && city && state) {
                        results.push({ pincode, city, state });
                    }
                })
                .on('end', () => {
                    // Build the Map for O(1) lookups
                    results.forEach(item => {
                        this.pincodeCache.set(item.pincode, item);
                    });

                    this.isLoaded = true;
                    const duration = Date.now() - startTime;
                    logger.info(
                        `✅ Loaded ${this.pincodeCache.size} pincodes into memory in ${duration}ms (~${Math.round(this.pincodeCache.size * 200 / 1024 / 1024)}MB)`
                    );
                    resolve();
                })
                .on('error', (error) => {
                    logger.error('Failed to load pincodes from CSV:', error);
                    reject(error);
                });
        });
    }

    /**
     * Get pincode details from cache
     */
    public getPincodeDetails(pincode: string): PincodeDetails | null {
        if (!this.isLoaded) {
            logger.warn('Pincode cache not loaded yet, returning null');
            return null;
        }

        return this.pincodeCache.get(pincode) || null;
    }

    /**
     * Get all pincodes (use with caution - large dataset)
     */
    public getAllPincodes(): PincodeDetails[] {
        return Array.from(this.pincodeCache.values());
    }

    /**
     * Search pincodes by city or state
     */
    public searchPincodes(query: { city?: string; state?: string }): PincodeDetails[] {
        const results: PincodeDetails[] = [];
        const cityQuery = query.city?.trim().toUpperCase();
        const stateQuery = query.state?.trim().toUpperCase();

        for (const details of this.pincodeCache.values()) {
            let matches = true;

            if (cityQuery && !details.city.includes(cityQuery)) {
                matches = false;
            }

            if (stateQuery && !details.state.includes(stateQuery)) {
                matches = false;
            }

            if (matches) {
                results.push(details);
            }
        }

        return results;
    }

    /**
     * Calculate zone between two pincodes (Blueship-style)
     * 
     * Zone Logic:
     * - Zone A: Same city
     * - Zone B: Same state OR distance <= 500km
     * - Zone C: Both metro cities
     * - Zone D: Rest of India
     * - Zone E: J&K or Northeast states
     */
    public getZoneFromPincodes(
        fromPincode: string,
        toPincode: string,
        zoneBType: 'state' | 'distance' = 'state',
        distance?: number
    ): ZoneInfo {
        const fromDetails = this.getPincodeDetails(fromPincode);
        const toDetails = this.getPincodeDetails(toPincode);

        if (!fromDetails || !toDetails) {
            // Default to highest zone if pincode not found
            return {
                zone: 'zoneE',
                isSameCity: false,
                isSameState: false
            };
        }

        const isSameCity = fromDetails.city === toDetails.city;
        const isSameState = fromDetails.state === toDetails.state;

        // Zone A: Same city
        if (isSameCity) {
            return { zone: 'zoneA', isSameCity: true, isSameState: true };
        }

        // Zone B: Same state OR distance-based
        if (zoneBType === 'state' && isSameState) {
            return { zone: 'zoneB', isSameCity: false, isSameState: true };
        } else if (zoneBType === 'distance' && distance && distance <= 500) {
            return { zone: 'zoneB', isSameCity: false, isSameState, distance };
        }

        // Check for special zones
        const isFromMetro = this.metroCities.includes(fromDetails.city);
        const isToMetro = this.metroCities.includes(toDetails.city);
        const isFromJKNE = this.JKNE_STATES.includes(fromDetails.state);
        const isToJKNE = this.JKNE_STATES.includes(toDetails.state);

        // Zone C: Both metro cities
        if (isFromMetro && isToMetro) {
            return { zone: 'zoneC', isSameCity: false, isSameState: false };
        }

        // Zone E: J&K or Northeast
        if (isFromJKNE || isToJKNE) {
            return { zone: 'zoneE', isSameCity: false, isSameState: false };
        }

        // Zone D: Rest of India
        return { zone: 'zoneD', isSameCity: false, isSameState: false };
    }

    /**
     * Validate pincode format
     */
    public isValidPincodeFormat(pincode: string): boolean {
        return /^[1-9][0-9]{5}$/.test(pincode);
    }

    /**
     * Check if pincode exists in cache
     */
    public exists(pincode: string): boolean {
        return this.pincodeCache.has(pincode);
    }

    /**
     * Get cache statistics
     */
    public getStats(): { totalPincodes: number; isLoaded: boolean; memorySizeMB: number } {
        return {
            totalPincodes: this.pincodeCache.size,
            isLoaded: this.isLoaded,
            memorySizeMB: Math.round(this.pincodeCache.size * 200 / 1024 / 1024)
        };
    }


    /**
     * Search for address suggestions (city/state) based on query string
     * Used for autocomplete in address fields
     * 
     * Returns both pincode-based and text-matched results
     */
    public searchAddressSuggestions(query: string): PincodeDetails[] {
        if (!query || query.length < 1) {
            return [];
        }

        const q = query.trim().toUpperCase();
        const results: Map<string, PincodeDetails> = new Map(); // Use map to avoid duplicates
        const seenCities: Set<string> = new Set();

        // Search through all pincodes
        for (const [pincode, details] of this.pincodeCache) {
            const { city, state } = details;

            // Match by pincode
            if (pincode.includes(q)) {
                const key = `${city}|${state}|${pincode}`;
                if (!results.has(key)) {
                    results.set(key, details);
                }
                seenCities.add(city);
            }

            // Match by city name
            if (city.includes(q)) {
                const key = `${city}|${state}|${pincode}`;
                if (!results.has(key)) {
                    results.set(key, details);
                }
                seenCities.add(city);
            }

            // Match by state name
            if (state.includes(q)) {
                const key = `${city}|${state}|${pincode}`;
                if (!results.has(key)) {
                    results.set(key, details);
                }
                seenCities.add(city);
            }

            // Limit results to prevent large responses
            if (results.size >= 50) {
                break;
            }
        }

        // Convert map to array and sort
        const suggestions = Array.from(results.values());

        // Sort by relevance: exact match first, then by city name
        suggestions.sort((a, b) => {
            // If query matches city exactly, prioritize it
            if (a.city.startsWith(q) && !b.city.startsWith(q)) return -1;
            if (!a.city.startsWith(q) && b.city.startsWith(q)) return 1;

            // Otherwise sort alphabetically by city
            return a.city.localeCompare(b.city);
        });

        return suggestions.slice(0, 50); // Return top 50 results
    }
    /**
     * Clear cache (for testing purposes)
     */
    public clearCache(): void {
        this.pincodeCache.clear();
        this.isLoaded = false;
        logger.info('Pincode cache cleared');
    }
}

// Export singleton instance
export default PincodeLookupService.getInstance();
