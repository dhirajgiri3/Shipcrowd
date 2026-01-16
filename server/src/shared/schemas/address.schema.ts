import { Schema } from 'mongoose';
import { IndiaValidators } from '../validators/india-validators';

export interface IAddress {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
    coordinates?: {
        latitude: number;
        longitude: number;
    };
}

export const AddressSchema = new Schema<IAddress>({
    line1: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    line2: {
        type: String,
        trim: true,
        maxlength: 200
    },
    city: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    state: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    country: {
        type: String,
        required: true,
        default: 'India',
        maxlength: 100
    },
    postalCode: {
        type: String,
        required: true,
        validate: IndiaValidators.pincode
    },
    coordinates: {
        latitude: { type: Number, min: -90, max: 90 },
        longitude: { type: Number, min: -180, max: 180 }
    }
}, { _id: false });

// Create 2dsphere index on coordinates for geospatial queries
AddressSchema.index({ coordinates: '2dsphere' });
