import { IPincode, Pincode } from '../../../../infrastructure/database/mongoose/models/logistics/pincode.model';
import { ValidationError } from '../../../../shared/errors/app.error';
import { ErrorCode } from '../../../../shared/errors/errorCodes';
import PincodeLookupService from './pincode-lookup.service';

export interface AddressInput {
    line1: string;
    line2?: string;
    landmark?: string;
    city: string;
    state: string;
    pincode: string;
    country?: string;
}

export interface StandardizedAddress extends AddressInput {
    district?: string;
    region?: string;
}

export default class AddressValidationService {
    /**
     * Validate Indian pincode and return location details
     * Uses CSV cache for fast lookup, falls back to database for serviceability
     */
    static async validatePincode(pincode: string): Promise<{
        valid: boolean;
        city?: string;
        state?: string;
        district?: string;
        serviceability: {
            delhivery: boolean;
            bluedart: boolean;
            ecom: boolean;
            dtdc: boolean;
            xpressbees: boolean;
            shadowfax: boolean;
        };
    }> {
        // Basic format check
        if (!/^[1-9][0-9]{5}$/.test(pincode)) {
            return {
                valid: false,
                serviceability: {
                    delhivery: false,
                    bluedart: false,
                    ecom: false,
                    dtdc: false,
                    xpressbees: false,
                    shadowfax: false
                }
            };
        }

        // Try CSV cache first (fast)
        const csvDetails = PincodeLookupService.getPincodeDetails(pincode);

        if (!csvDetails) {
            return {
                valid: false,
                serviceability: {
                    delhivery: false,
                    bluedart: false,
                    ecom: false,
                    dtdc: false,
                    xpressbees: false,
                    shadowfax: false
                }
            };
        }

        // Get serviceability from database (dynamic data)
        const pincodeData = await Pincode.findOne({ pincode });

        return {
            valid: true,
            city: csvDetails.city,
            state: csvDetails.state,
            district: csvDetails.city, // Using city as district from CSV
            serviceability: pincodeData ? {
                delhivery: pincodeData.serviceability.delhivery.available,
                bluedart: pincodeData.serviceability.bluedart.available,
                ecom: pincodeData.serviceability.ecom.available,
                dtdc: pincodeData.serviceability.dtdc.available,
                xpressbees: pincodeData.serviceability.xpressbees.available,
                shadowfax: pincodeData.serviceability.shadowfax.available,
            } : {
                // Default to false if not in database yet
                delhivery: false,
                bluedart: false,
                ecom: false,
                dtdc: false,
                xpressbees: false,
                shadowfax: false
            }
        };
    }

    /**
     * Standardize address for courier API submission
     */
    static async standardizeAddress(
        address: AddressInput
    ): Promise<StandardizedAddress> {
        const validation = await this.validatePincode(address.pincode);

        if (!validation.valid) {
            throw new ValidationError(
                'Invalid pincode provided for address standardization',
                ErrorCode.VAL_PINCODE_INVALID
            );
        }

        // Use official city/state from pincode database if available to ensure consistency
        return {
            ...address,
            city: validation.city || address.city,
            state: validation.state || address.state,
            district: validation.district,
            country: 'India', // Enforce India for now
            line1: address.line1.trim(),
            line2: address.line2?.trim(),
            landmark: address.landmark?.trim(),
        };
    }

    /**
     * Check if both pincodes are serviceable by specific courier
     */
    static async checkServiceability(
        fromPincode: string,
        toPincode: string,
        courierId: string
    ): Promise<{
        serviceable: boolean;
        estimatedDays?: number;
        restrictions?: string[];
    }> {
        const fromData = await Pincode.findOne({ pincode: fromPincode });
        const toData = await Pincode.findOne({ pincode: toPincode });

        if (!fromData || !toData) {
            return { serviceable: false, restrictions: ['Invalid Pincode'] };
        }

        // Map courierId to our internal serviceability keys
        // Assuming courierId matches keys or we have a mapping logic
        // Simple mapping for now:
        const courierKey = courierId.toLowerCase();

        // Check if supported courier
        const validCouriers = ['delhivery', 'bluedart', 'ecom', 'dtdc', 'xpressbees', 'shadowfax'];
        if (!validCouriers.includes(courierKey)) {
            // If courier not tracked explicitly, we might default to true or false depending on policy
            // Here defaulting to false for safety
            return { serviceable: false, restrictions: ['Courier not supported for serviceability check'] };
        }

        const typedCourierKey = courierKey as keyof IPincode['serviceability'];

        const pickupAvailable = fromData.serviceability[typedCourierKey]?.available;
        const deliveryAvailable = toData.serviceability[typedCourierKey]?.available;

        if (pickupAvailable && deliveryAvailable) {
            // Calculate estimated days based on regions (simplified logic)
            let estimatedDays = 3;
            if (fromData.city === toData.city) estimatedDays = 1;
            else if (fromData.state === toData.state) estimatedDays = 2;
            else if (fromData.region === toData.region) estimatedDays = 3;
            else estimatedDays = 5;

            return { serviceable: true, estimatedDays };
        }

        return { serviceable: false, restrictions: ['Route not serviceable by selected courier'] };
    }

    /**
     * Calculate distance between two pincodes (for rate calculation)
     */
    static async calculateDistance(
        fromPincode: string,
        toPincode: string
    ): Promise<{
        distanceKm: number;
        zone: 'local' | 'regional' | 'national';
    }> {
        const fromData = await Pincode.findOne({ pincode: fromPincode });
        const toData = await Pincode.findOne({ pincode: toPincode });

        if (!fromData?.coordinates || !toData?.coordinates) {
            // Fallback to zone logic if coordinates missing
            if (fromData?.city === toData?.city) return { distanceKm: 10, zone: 'local' };
            if (fromData?.state === toData?.state) return { distanceKm: 200, zone: 'regional' };
            return { distanceKm: 1000, zone: 'national' };
        }

        const distance = this.getDistanceFromLatLonInKm(
            fromData.coordinates.latitude,
            fromData.coordinates.longitude,
            toData.coordinates.latitude,
            toData.coordinates.longitude
        );

        let zone: 'local' | 'regional' | 'national' = 'national';
        if (fromData.city === toData.city) zone = 'local';
        else if (fromData.state === toData.state) zone = 'regional';

        return { distanceKm: Math.round(distance), zone };
    }

    // Haversine formula
    private static getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
        var R = 6371; // Radius of the earth in km
        var dLat = this.deg2rad(lat2 - lat1);  // deg2rad below
        var dLon = this.deg2rad(lon2 - lon1);
        var a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2)
            ;
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        var d = R * c; // Distance in km
        return d;
    }

    private static deg2rad(deg: number) {
        return deg * (Math.PI / 180);
    }
}
