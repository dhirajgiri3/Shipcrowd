export type ShipmentStatus =
    | 'pending'
    | 'picked_up'
    | 'in_transit'
    | 'out_for_delivery'
    | 'delivered'
    | 'cancelled'
    | 'returned'
    | 'failed';

export interface IShipmentEntity {
    id: string;
    orderId: string;
    trackingNumber: string;
    carrierId: string;
    status: ShipmentStatus;
    origin: any; // Will be AddressVO
    destination: any; // Will be AddressVO
    packageDetails: any; // Will be PackageVO
    pricing: any; // Will be PricingVO
    timeline: any[]; // Will be TimelineEventVO[]
    createdAt: Date;
    updatedAt: Date;
}

export class ShipmentEntity implements IShipmentEntity {
    constructor(
        public id: string,
        public orderId: string,
        public trackingNumber: string,
        public carrierId: string,
        public status: ShipmentStatus,
        public origin: any,
        public destination: any,
        public packageDetails: any,
        public pricing: any,
        public timeline: any[] = [],
        public createdAt: Date = new Date(),
        public updatedAt: Date = new Date()
    ) { }

    // Domain methods
    updateStatus(newStatus: ShipmentStatus, message: string, location?: string): void {
        this.status = newStatus;
        this.timeline.push({
            status: newStatus,
            message,
            location,
            timestamp: new Date(),
        });
        this.updatedAt = new Date();
    }

    cancel(): void {
        if (this.status === 'delivered') {
            throw new Error('Cannot cancel delivered shipment');
        }
        this.updateStatus('cancelled', 'Shipment cancelled by user');
    }

    isActive(): boolean {
        return !['delivered', 'cancelled', 'returned', 'failed'].includes(this.status);
    }

    isDelivered(): boolean {
        return this.status === 'delivered';
    }
}
