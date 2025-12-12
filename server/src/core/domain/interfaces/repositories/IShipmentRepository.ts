import { ShipmentEntity } from '../../entities';

export interface IShipmentRepository {
    findById(id: string): Promise<ShipmentEntity | null>;
    findByTrackingNumber(trackingNumber: string): Promise<ShipmentEntity | null>;
    findByOrderId(orderId: string): Promise<ShipmentEntity[]>;
    create(shipment: Omit<ShipmentEntity, 'id' | 'createdAt' | 'updatedAt'>): Promise<ShipmentEntity>;
    update(id: string, data: Partial<ShipmentEntity>): Promise<ShipmentEntity | null>;
    delete(id: string): Promise<boolean>;
    findAll(filters?: any, skip?: number, limit?: number): Promise<ShipmentEntity[]>;
    count(filters?: any): Promise<number>;
}
