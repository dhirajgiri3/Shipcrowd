/**
 * Velocity Shipfast Data Mapper
 *
 * Transforms data between Helix models and Velocity API format
 *
 * Layer 1: Helix Order/Shipment → Generic CourierShipmentData (handled by ShipmentService)
 * Layer 2: Generic CourierShipmentData → Velocity-specific format (this file)
 *
 * @see docs/Development/Backend/Integrations/VELOCITY_SHIPFAST_INTEGRATION.md Section 5
 */

import {
  VelocityForwardOrderRequest,
  VelocityOrderItem,
  VelocityVendorDetails,
  VelocityWarehouseRequest,
  VELOCITY_STATUS_MAP
} from './velocity.types';
import { CourierShipmentData } from '../base/courier.adapter';

export class VelocityMapper {
  /**
   * Format date to Velocity format: "YYYY-MM-DD HH:mm"
   */
  static formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}`;
  }

  /**
   * Normalize phone number to 10 digits (remove country code, spaces, dashes)
   */
  static normalizePhone(phone: string): string {
    // Remove all non-numeric characters
    const digits = phone.replace(/\D/g, '');

    // If starts with country code (91 for India), remove it
    if (digits.startsWith('91') && digits.length > 10) {
      return digits.substring(digits.length - 10);
    }

    // Return last 10 digits
    return digits.substring(Math.max(0, digits.length - 10));
  }

  /**
   * Split full name into first and last name
   */
  static splitName(fullName: string): { firstName: string; lastName: string } {
    const parts = fullName.trim().split(' ');

    if (parts.length === 1) {
      return { firstName: parts[0], lastName: '' };
    }

    return {
      firstName: parts[0],
      lastName: parts.slice(1).join(' ')
    };
  }

  /**
   * Calculate total weight from package data (convert to kg if needed)
   */
  static calculateWeight(weight: number, unit: 'kg' | 'g' = 'kg'): number {
    if (unit === 'g') {
      return weight / 1000;
    }
    return weight;
  }

  /**
   * Map generic CourierShipmentData to Velocity Forward Order Request
   */
  static mapToForwardOrder(
    data: CourierShipmentData,
    warehouseName: string,
    warehouseId: string,
    warehouseDetails?: {
      email: string;
      phone: string;
      contactName: string;
      address: {
        line1: string;
        line2?: string;
        city: string;
        state: string;
        country: string;
        postalCode: string;
      };
    }
  ): VelocityForwardOrderRequest {
    const { firstName, lastName } = this.splitName(data.destination.name);

    // Calculate subtotal from package declared value
    const subTotal = data.package.declaredValue || 0;

    // Create order items (single item if no detailed breakdown)
    const orderItems: VelocityOrderItem[] = [
      {
        name: data.package.description || 'Product',
        sku: `SKU-${data.orderNumber}`,
        units: 1,
        selling_price: subTotal,
        discount: 0,
        tax: 0
      }
    ];

    // Build vendor details
    let vendorDetails: VelocityVendorDetails | undefined;
    if (warehouseDetails) {
      vendorDetails = {
        email: warehouseDetails.email,
        phone: this.normalizePhone(warehouseDetails.phone),
        name: warehouseDetails.contactName,
        address: warehouseDetails.address.line1,
        address_2: warehouseDetails.address.line2 || '',
        city: warehouseDetails.address.city,
        state: warehouseDetails.address.state,
        country: warehouseDetails.address.country,
        pin_code: warehouseDetails.address.postalCode,
        pickup_location: warehouseName
      };
    }

    const request: VelocityForwardOrderRequest = {
      order_id: data.orderNumber,
      order_date: this.formatDate(new Date()),
      channel_id: process.env.VELOCITY_CHANNEL_ID || '27202',  // Required by Velocity API
      billing_customer_name: firstName,
      billing_last_name: lastName,
      billing_address: data.destination.address,
      billing_city: data.destination.city,
      billing_pincode: data.destination.pincode,
      billing_state: data.destination.state,
      billing_country: data.destination.country,
      billing_email: (data.destination as any).email || warehouseDetails?.email || 'noreply@Helix.com',
      billing_phone: this.normalizePhone(data.destination.phone),
      shipping_is_billing: true,
      print_label: true,
      order_items: orderItems,
      payment_method: data.paymentMode === 'cod' ? 'COD' : 'PREPAID',
      sub_total: subTotal,
      length: data.package.length || 20,
      breadth: data.package.width || 15,
      height: data.package.height || 10,
      weight: this.calculateWeight(data.package.weight),
      cod_collectible: data.paymentMode === 'cod' ? data.codAmount : undefined,
      pickup_location: warehouseName,
      warehouse_id: warehouseId,
      vendor_details: vendorDetails
    };

    return request;
  }

  /**
   * Map Velocity status code to Helix shipment status
   */
  static mapStatus(velocityStatusCode: string): {
    status: string;
    description: string;
  } {
    const statusMap: Record<string, { status: string; description: string }> = {
      'NEW': { status: 'created', description: 'Shipment created' },
      'PKP': { status: 'picked_up', description: 'Picked up from warehouse' },
      'IT': { status: 'in_transit', description: 'In transit' },
      'OFD': { status: 'out_for_delivery', description: 'Out for delivery' },
      'DEL': { status: 'delivered', description: 'Delivered' },
      'NDR': { status: 'ndr', description: 'Non-delivery report' },
      'RTO': { status: 'rto', description: 'Return to origin' },
      'LOST': { status: 'lost', description: 'Shipment lost' },
      'DAMAGED': { status: 'damaged', description: 'Shipment damaged' },
      'CANCELLED': { status: 'cancelled', description: 'Shipment cancelled' }
    };

    return statusMap[velocityStatusCode] || {
      status: 'unknown',
      description: `Unknown status: ${velocityStatusCode}`
    };
  }

  /**
   * Map Warehouse model to Velocity Warehouse Request
   */
  static mapToWarehouseRequest(warehouse: {
    name: string;
    contactInfo: {
      name: string;
      phone: string;
      email?: string;
    };
    address: {
      line1: string;
      line2?: string;
      city: string;
      state: string;
      country: string;
      postalCode: string;
    };
  }): VelocityWarehouseRequest {
    return {
      name: warehouse.name,
      phone: this.normalizePhone(warehouse.contactInfo.phone),
      email: warehouse.contactInfo.email || 'noreply@Helix.com',
      address: warehouse.address.line1,
      address_2: warehouse.address.line2 || '',
      city: warehouse.address.city,
      state: warehouse.address.state,
      country: warehouse.address.country,
      pin_code: warehouse.address.postalCode,
      return_address: warehouse.address.line1,
      return_city: warehouse.address.city,
      return_state: warehouse.address.state,
      return_country: warehouse.address.country,
      return_pin_code: warehouse.address.postalCode
    };
  }

  /**
   * Validate pincode format (6 digits for India)
   */
  static validatePincode(pincode: string): boolean {
    return /^\d{6}$/.test(pincode);
  }

  /**
   * Validate phone format (10 digits after normalization)
   */
  static validatePhone(phone: string): boolean {
    const normalized = this.normalizePhone(phone);
    return /^\d{10}$/.test(normalized);
  }

  /**
   * Validate required fields for forward order
   */
  static validateForwardOrderData(data: CourierShipmentData): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!data.orderNumber) {
      errors.push('Order number is required');
    }

    if (!data.destination.name) {
      errors.push('Customer name is required');
    }

    if (!data.destination.phone || !this.validatePhone(data.destination.phone)) {
      errors.push('Valid 10-digit phone number is required');
    }

    if (!data.destination.pincode || !this.validatePincode(data.destination.pincode)) {
      errors.push('Valid 6-digit pincode is required');
    }

    if (!data.destination.address) {
      errors.push('Delivery address is required');
    }

    if (!data.destination.city) {
      errors.push('Delivery city is required');
    }

    if (!data.destination.state) {
      errors.push('Delivery state is required');
    }

    if (!data.package.weight || data.package.weight <= 0) {
      errors.push('Valid package weight is required');
    }

    if (data.package.weight > 30) {
      errors.push('Package weight cannot exceed 30 kg');
    }

    if (data.paymentMode === 'cod' && (!data.codAmount || data.codAmount <= 0)) {
      errors.push('COD amount is required for COD orders');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}
