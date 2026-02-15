/**
 * Ekart Data Mapper & Validator
 * 
 * Handles data transformation and validation for Ekart API requests:
 * - Phone number normalization (remove country code, ensure 10 digits)
 * - Pincode validation (exactly 6 digits)
 * - Weight conversion (kg to grams)
 * - Address sanitization
 * - Shipment data mapping (forward & reverse)
 * 
 * @example
 * ```typescript
 * const phone = EkartMapper.normalizePhone('+91-9999999999'); // '9999999999'
 * const weight = EkartMapper.toGrams(1.5); // 1500
 * const shipment = EkartMapper.mapToForwardShipment(data);
 * ```
 */

import { CourierReverseShipmentData, CourierShipmentData } from '../base/courier.adapter';
import {
EKART_CONSTRAINTS,
EkartAddressRequest,
EkartLocation,
EkartShipmentRequest,
} from './ekart.types';

export class EkartMapper {
    /**
     * Normalize phone number to 10 digits
     * 
     * Removes:
     * - Country code (+91, 91)
     * - Special characters (-, spaces, parentheses)
     * 
     * @param phone Raw phone number
     * @returns 10-digit phone number
     * @throws Error if phone is invalid
     */
    static normalizePhone(phone: string): string {
        // Remove all non-digit characters
        const digits = phone.replace(/\D/g, '');

        // Remove country code if present
        let normalized: string;
        if (digits.startsWith('91') && digits.length > 10) {
            normalized = digits.substring(digits.length - 10);
        } else {
            normalized = digits.substring(Math.max(0, digits.length - 10));
        }

        // Validate length
        if (normalized.length !== 10) {
            throw new Error(`Invalid phone number: ${phone}. Must be 10 digits after normalization.`);
        }

        return normalized;
    }

    /**
     * Validate phone number
     * 
     * Checks if phone is within Ekart's accepted range
     * 
     * @param phone 10-digit phone number
     * @returns true if valid
     * @throws Error if invalid
     */
    static validatePhone(phone: string): boolean {
        const phoneNum = parseInt(phone, 10);

        if (phoneNum < EKART_CONSTRAINTS.PHONE_MIN || phoneNum > EKART_CONSTRAINTS.PHONE_MAX) {
            throw new Error(
                `Phone number ${phone} is out of valid range [${EKART_CONSTRAINTS.PHONE_MIN}..${EKART_CONSTRAINTS.PHONE_MAX}]`
            );
        }

        return true;
    }

    /**
     * Validate pincode
     * 
     * Ensures pincode is exactly 6 digits
     * 
     * @param pincode Pincode string
     * @returns true if valid
     * @throws Error if invalid
     */
    static validatePincode(pincode: string): boolean {
        const digits = pincode.replace(/\D/g, '');

        if (digits.length !== EKART_CONSTRAINTS.PINCODE_LENGTH) {
            throw new Error(`Invalid pincode: ${pincode}. Must be exactly 6 digits.`);
        }

        return true;
    }

    /**
     * Convert weight from kg to grams
     * 
     * @param weightKg Weight in kilograms
     * @returns Weight in grams (rounded)
     */
    static toGrams(weightKg: number): number {
        return Math.max(1, Math.round(weightKg * 1000));
    }

    /**
     * Sanitize text for Ekart API
     * 
     * Removes special characters that may cause API errors
     * 
     * @param text Text to sanitize
     * @returns Sanitized text
     */
    static sanitize(text?: string): string | undefined {
        if (!text) return text;

        // Remove special characters, replace with space
        return text
            .replace(/[&#%;\\]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    /**
     * Map location data to Ekart format
     * 
     * @param location Address data
     * @param name Contact name
     * @param phone Contact phone
     * @returns Ekart location object
     */
    /**
     * Map warehouse to Ekart Address API request (POST /api/v2/address)
     * Schema: alias, phone (int), address_line1, address_line2?, pincode (int), city?, state?, country?
     */
    static mapWarehouseToAddressRequest(warehouse: {
        name: string;
        address?: { line1?: string; line2?: string; city?: string; state?: string; country?: string; postalCode?: string };
        contactInfo?: { phone?: string };
    }): EkartAddressRequest {
        const phone = warehouse.contactInfo?.phone || '';
        const normalizedPhone = this.normalizePhone(phone);
        this.validatePhone(normalizedPhone);
        const pincode = warehouse.address?.postalCode || '';
        this.validatePincode(pincode);
        const addressLine1 = this.sanitize(warehouse.address?.line1) || warehouse.address?.line1 || '';
        if (!addressLine1) {
            throw new Error('Warehouse address line1 is required for Ekart address registration');
        }

        return {
            alias: this.sanitize(warehouse.name) || warehouse.name,
            phone: parseInt(normalizedPhone, 10),
            address_line1: addressLine1,
            address_line2: warehouse.address?.line2,
            pincode: parseInt(pincode, 10),
            city: warehouse.address?.city,
            state: warehouse.address?.state,
            country: warehouse.address?.country || 'India',
        };
    }

    static mapLocation(
        location: {
            address: string;
            city: string;
            state: string;
            pincode: string;
            country?: string;
        },
        name: string,
        phone: string
    ): EkartLocation {
        const normalizedPhone = this.normalizePhone(phone);
        this.validatePhone(normalizedPhone);
        this.validatePincode(location.pincode);

        return {
            location_type: 'Office', // Default to Office
            address: this.sanitize(location.address) || location.address,
            city: this.sanitize(location.city) || location.city,
            state: this.sanitize(location.state) || location.state,
            country: location.country || 'India',
            name: this.sanitize(name) || name,
            phone: parseInt(normalizedPhone, 10),
            pin: parseInt(location.pincode, 10),
        };
    }

    /**
     * Map forward shipment data to Ekart request
     * 
     * @param data Courier shipment data
     * @param options Additional options (seller info, GST, etc.)
     * @returns Ekart shipment request
     */
    static mapToForwardShipment(
        data: CourierShipmentData,
        options: {
            sellerName: string;
            sellerAddress: string;
            sellerGstTin: string;
            pickupLocationName: string;
            returnLocationName?: string;
            productsDesc?: string;
            categoryOfGoods?: string;
            hsnCode?: string;
            totalAmount?: number;
            taxValue?: number;
            taxableAmount?: number;
            commodityValue?: string;
            invoiceNumber?: string;
            invoiceDate?: string;
            sellerGstAmount?: number;
            consigneeGstAmount?: number;
            integratedGstAmount?: number;
            ewbn?: string;
            preferredDispatchDate?: string;
            delayedDispatch?: boolean;
            obdShipment?: boolean;
            mps?: boolean;
            items?: any[];
            packages?: any[];
        }
    ): EkartShipmentRequest {
        // Map locations
        const dropLocation = this.mapLocation(
            data.destination,
            data.destination.name,
            data.destination.phone
        );

        // Per Ekart doc: when using registered addresses, send only { name: alias }
        const pickupLocation = { name: options.pickupLocationName } as EkartLocation;
        const returnLocation = (options.returnLocationName
            ? { name: options.returnLocationName }
            : pickupLocation) as EkartLocation;

        // Calculate amounts
        const totalAmount = options.totalAmount || data.codAmount || 0;
        const taxValue = options.taxValue || 0;
        const taxableAmount = options.taxableAmount || totalAmount - taxValue;

        return {
            seller_name: this.sanitize(options.sellerName) || options.sellerName,
            seller_address: this.sanitize(options.sellerAddress) || options.sellerAddress,
            seller_gst_tin: options.sellerGstTin,
            seller_gst_amount: options.sellerGstAmount,
            consignee_gst_amount: options.consigneeGstAmount || 0,
            integrated_gst_amount: options.integratedGstAmount,
            ewbn: options.ewbn,
            order_number: data.orderNumber,
            invoice_number: options.invoiceNumber || data.orderNumber,
            invoice_date: options.invoiceDate || new Date().toISOString().split('T')[0],
            consignee_name: data.destination.name,
            consignee_alternate_phone: this.normalizePhone(data.destination.phone),
            products_desc: this.sanitize(options.productsDesc) || 'General Goods',
            payment_mode: data.paymentMode === 'cod' ? 'COD' : 'Prepaid',
            category_of_goods: this.sanitize(options.categoryOfGoods) || 'General',
            hsn_code: options.hsnCode,
            total_amount: totalAmount,
            tax_value: taxValue,
            taxable_amount: taxableAmount,
            commodity_value: options.commodityValue || taxableAmount.toString(),
            cod_amount: data.paymentMode === 'cod' ? (data.codAmount || 0) : 0,
            quantity: 1,
            weight: this.toGrams(data.package.weight),
            length: data.package.length,
            height: data.package.height,
            width: data.package.width,
            drop_location: dropLocation,
            pickup_location: pickupLocation,
            return_location: returnLocation,
            preferred_dispatch_date: options.preferredDispatchDate,
            delayed_dispatch: options.delayedDispatch,
            obd_shipment: options.obdShipment,
            mps: options.mps,
            items: options.items,
        };
    }

    /**
     * Map reverse shipment data to Ekart request
     * 
     * @param data Reverse shipment data
     * @param options Additional options
     * @returns Ekart shipment request
     */
    static mapToReverseShipment(
        data: CourierReverseShipmentData,
        options: {
            sellerName: string;
            sellerAddress: string;
            sellerGstTin: string;
            returnWarehouseName: string;
            productsDesc?: string;
            categoryOfGoods?: string;
            totalAmount?: number;
            taxValue?: number;
            taxableAmount?: number;
            commodityValue?: string;
            invoiceNumber?: string;
            invoiceDate?: string;
            qcShipment?: boolean;
            qcDetails?: any;
        }
    ): EkartShipmentRequest {
        // For reverse shipments:
        // - drop_location = customer address (where to pick up from)
        // - pickup_location = warehouse (where to deliver to)
        // - payment_mode = 'Pickup'

        const dropLocation = this.mapLocation(
            data.pickupAddress,
            data.pickupAddress.name,
            data.pickupAddress.phone
        );

        const pickupLocation = { name: options.returnWarehouseName } as EkartLocation;

        const totalAmount = options.totalAmount || 0;
        const taxValue = options.taxValue || 0;
        const taxableAmount = options.taxableAmount || totalAmount - taxValue;

        return {
            seller_name: this.sanitize(options.sellerName) || options.sellerName,
            seller_address: this.sanitize(options.sellerAddress) || options.sellerAddress,
            seller_gst_tin: options.sellerGstTin,
            consignee_gst_amount: 0,
            order_number: data.orderId,
            invoice_number: options.invoiceNumber || data.orderId,
            invoice_date: options.invoiceDate || new Date().toISOString().split('T')[0],
            consignee_name: data.pickupAddress.name,
            consignee_alternate_phone: this.normalizePhone(data.pickupAddress.phone),
            products_desc: this.sanitize(options.productsDesc) || data.reason || 'Return',
            payment_mode: 'Pickup', // Always Pickup for reverse
            category_of_goods: this.sanitize(options.categoryOfGoods) || 'General',
            total_amount: totalAmount,
            tax_value: taxValue,
            taxable_amount: taxableAmount,
            commodity_value: options.commodityValue || taxableAmount.toString(),
            cod_amount: 0, // No COD for reverse
            quantity: 1,
            weight: this.toGrams(data.package.weight),
            length: data.package.length || 10,
            height: data.package.height || 10,
            width: data.package.width || 10,
            return_reason: data.reason || 'Customer return',
            drop_location: dropLocation,
            pickup_location: pickupLocation,
            return_location: pickupLocation, // Same as pickup for reverse
            qc_details: options.qcDetails,
        };
    }

    /**
     * Validate forward shipment data
     * 
     * Ensures all required fields are present and valid
     * 
     * @param data Shipment data
     * @throws Error if validation fails
     */
    static validateForwardShipmentData(data: CourierShipmentData): void {
        if (!data.orderNumber) {
            throw new Error('Order number is required');
        }

        if (!data.destination) {
            throw new Error('Destination address is required');
        }

        if (!data.destination.phone) {
            throw new Error('Destination phone is required');
        }

        if (!data.destination.pincode) {
            throw new Error('Destination pincode is required');
        }

        if (!data.package || !data.package.weight) {
            throw new Error('Package weight is required');
        }

        if (data.package.weight <= 0) {
            throw new Error('Package weight must be greater than 0');
        }

        // Validate COD amount if COD payment
        if (data.paymentMode === 'cod') {
            if (!data.codAmount || data.codAmount <= 0) {
                throw new Error('COD amount is required and must be greater than 0');
            }

            if (data.codAmount > EKART_CONSTRAINTS.MAX_COD_AMOUNT) {
                throw new Error(
                    `COD amount ${data.codAmount} exceeds maximum ${EKART_CONSTRAINTS.MAX_COD_AMOUNT}`
                );
            }
        }
    }

    /**
     * Validate reverse shipment data
     * 
     * @param data Reverse shipment data
     * @throws Error if validation fails
     */
    static validateReverseShipmentData(data: CourierReverseShipmentData): void {
        if (!data.orderId) {
            throw new Error('Order ID is required');
        }

        if (!data.pickupAddress) {
            throw new Error('Pickup address is required');
        }

        if (!data.pickupAddress.phone) {
            throw new Error('Pickup phone is required');
        }

        if (!data.pickupAddress.pincode) {
            throw new Error('Pickup pincode is required');
        }

        if (!data.package || !data.package.weight) {
            throw new Error('Package weight is required');
        }

        if (data.package.weight <= 0) {
            throw new Error('Package weight must be greater than 0');
        }
    }
}
