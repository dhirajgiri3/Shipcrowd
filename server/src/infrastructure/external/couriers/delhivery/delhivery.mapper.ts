import { CourierReverseShipmentData, CourierShipmentData } from '../base/courier.adapter';
import { DelhiveryShipmentRequest } from './delhivery.types';

/**
 * Delhivery Data Mapper
 */
export class DelhiveryMapper {
    static normalizePhone(phone: string): string {
        const digits = phone.replace(/\D/g, '');
        if (digits.startsWith('91') && digits.length > 10) {
            return digits.substring(digits.length - 10);
        }
        return digits.substring(Math.max(0, digits.length - 10));
    }

    static sanitize(text?: string): string | undefined {
        if (!text) return text;
        return text.replace(/[&#%;\\]/g, ' ').replace(/\s+/g, ' ').trim();
    }

    static toGrams(weightKg: number): number {
        return Math.max(0, Math.round(weightKg * 1000));
    }

    static mapForwardShipment(data: CourierShipmentData, options?: any): DelhiveryShipmentRequest {
        const destination = data.destination;
        const address = this.sanitize(destination.address) || destination.address;
        const phone = this.normalizePhone(destination.phone);

        return {
            name: this.sanitize(destination.name) || destination.name,
            add: address,
            pin: destination.pincode,
            city: this.sanitize(destination.city),
            state: this.sanitize(destination.state),
            country: this.sanitize(destination.country || 'India') || 'India',
            phone: phone,
            order: data.orderNumber,
            payment_mode: data.paymentMode === 'cod' ? 'COD' : 'Prepaid',
            weight: data.package?.weight ? this.toGrams(data.package.weight) : undefined,
            shipping_mode: options?.shippingMode || 'Surface',
            cod_amount: data.paymentMode === 'cod' ? data.codAmount : undefined,
            waybill: options?.waybill,
            return_name: options?.returnAddress?.name,
            return_add: this.sanitize(options?.returnAddress?.address),
            return_pin: options?.returnAddress?.pincode,
            return_city: this.sanitize(options?.returnAddress?.city),
            return_state: this.sanitize(options?.returnAddress?.state),
            return_country: this.sanitize(options?.returnAddress?.country || 'India'),
            return_phone: options?.returnAddress?.phone ? this.normalizePhone(options?.returnAddress?.phone) : undefined,
            products_desc: this.sanitize(options?.productsDesc),
            hsn_code: options?.hsn,
            seller_inv: options?.sellerInv,
            total_amount: options?.totalAmount,
            seller_name: this.sanitize(options?.sellerName),
            seller_add: this.sanitize(options?.sellerAddress),
            quantity: options?.quantity,
            shipment_width: data.package?.width,
            shipment_height: data.package?.height,
            shipment_length: data.package?.length,
            ewbn: options?.ewaybill,
            transport_speed: options?.transportSpeed
        };
    }

    static mapReverseShipment(data: CourierReverseShipmentData, options?: any): DelhiveryShipmentRequest {
        const pickup = data.pickupAddress;
        const address = this.sanitize(pickup.address) || pickup.address;
        const phone = this.normalizePhone(pickup.phone);

        return {
            name: this.sanitize(pickup.name) || pickup.name,
            add: address,
            pin: pickup.pincode,
            city: this.sanitize(pickup.city),
            state: this.sanitize(pickup.state),
            country: this.sanitize(pickup.country || 'India') || 'India',
            phone: phone,
            order: data.orderId,
            payment_mode: 'Pickup',
            weight: data.package?.weight ? this.toGrams(data.package.weight) : undefined,
            shipping_mode: options?.shippingMode || 'Surface',
            waybill: options?.waybill,
            return_name: options?.returnAddress?.name,
            return_add: this.sanitize(options?.returnAddress?.address),
            return_pin: options?.returnAddress?.pincode,
            return_city: this.sanitize(options?.returnAddress?.city),
            return_state: this.sanitize(options?.returnAddress?.state),
            return_country: this.sanitize(options?.returnAddress?.country || 'India'),
            return_phone: options?.returnAddress?.phone ? this.normalizePhone(options?.returnAddress?.phone) : undefined,
            products_desc: this.sanitize(options?.productsDesc),
            hsn_code: options?.hsn,
            seller_inv: options?.sellerInv,
            total_amount: options?.totalAmount,
            seller_name: this.sanitize(options?.sellerName),
            seller_add: this.sanitize(options?.sellerAddress),
            quantity: options?.quantity,
            shipment_width: data.package?.width,
            shipment_height: data.package?.height,
            shipment_length: data.package?.length,
            ewbn: options?.ewaybill,
            transport_speed: options?.transportSpeed
        };
    }

    static buildMpsFields(shipment: DelhiveryShipmentRequest, mps?: {
        mps_amount?: number;
        mps_children?: number;
        master_id?: string;
        waybill?: string;
    }): DelhiveryShipmentRequest {
        if (!mps) return shipment;
        return {
            ...shipment,
            shipment_type: 'MPS',
            mps_amount: mps.mps_amount,
            mps_children: mps.mps_children,
            master_id: mps.master_id,
            waybill: mps.waybill || shipment.waybill
        };
    }
}
