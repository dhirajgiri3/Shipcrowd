/**
 * Warehouse Notification
 * 
 * Purpose: WarehouseNotificationService
 * 
 * DEPENDENCIES:
 * - Logger
 * 
 * TESTING:
 * Unit Tests: tests/unit/services/.../{filename}.test.ts
 * Coverage: TBD
 * 
 * NOTE: This service needs comprehensive documentation.
 * See SERVICE_TEMPLATE.md for documentation standards.
 */

import WhatsAppService from '../../../../infrastructure/external/communication/whatsapp/whatsapp.service';
import logger from '../../../../shared/logger/winston.logger';

/**
 * WarehouseNotificationService
 * 
 * Handles notifications to warehouse for various events
 * including RTO incoming, address changes, and stock updates
 */

interface Address {
    street: string;
    city: string;
    state: string;
    pincode: string;
    country?: string;
    landmark?: string;
}

interface WarehouseContact {
    email?: string;
    phone?: string;
    name?: string;
}

export class WarehouseNotificationService {
    private static whatsapp = new WhatsAppService();

    /**
     * Notify warehouse of incoming RTO shipment
     */
    static async notifyRTOIncoming(
        rtoEventId: string,
        warehouseId: string,
        shipmentDetails: {
            awb: string;
            reverseAwb?: string;
            expectedReturnDate: Date;
            rtoReason: string;
            requiresQC: boolean;
        }
    ): Promise<void> {
        try {
            // TODO: Load warehouse contact details from Warehouse model
            const warehouseContact: WarehouseContact = {
                email: 'warehouse@example.com', // Mock
                phone: '+919876543210', // Mock
                name: 'Warehouse Manager',
            };

            const message = `🔄 **RTO Incoming Alert**

**AWB:** ${shipmentDetails.awb}
${shipmentDetails.reverseAwb ? `**Reverse AWB:** ${shipmentDetails.reverseAwb}\n` : ''}**Reason:** ${shipmentDetails.rtoReason}
**Expected Return:** ${this.formatDate(shipmentDetails.expectedReturnDate)}
**QC Required:** ${shipmentDetails.requiresQC ? 'Yes ✓' : 'No'}

Please prepare for incoming return.

-Helix System`;

            // Send WhatsApp notification
            if (warehouseContact.phone) {
                await this.whatsapp.sendMessage(warehouseContact.phone, message);
                logger.info('WhatsApp notification sent to warehouse', {
                    warehouseId,
                    rtoEventId,
                    phone: warehouseContact.phone,
                });
            }

            // TODO: Send email notification
            // await EmailService.send({
            //     to: warehouseContact.email,
            //     subject: 'RTO Incoming Alert',
            //     template: 'rto-incoming',
            //     data: shipmentDetails,
            // });

            logger.info('Warehouse notified of incoming RTO', {
                warehouseId,
                rtoEventId,
                awb: shipmentDetails.awb,
            });
        } catch (error: any) {
            logger.error('Failed to notify warehouse of RTO', {
                error: error.message,
                warehouseId,
                rtoEventId,
            });
            // Don't throw - notification failure shouldn't block RTO process
        }
    }

    /**
     * Notify warehouse of address change for active shipment
     */
    static async notifyAddressChanged(
        shipmentId: string,
        oldAddress: Address,
        newAddress: Address
    ): Promise<void> {
        try {
            // TODO: Load warehouse ID from shipment
            const warehouseId = 'mock-warehouse-id';
            const warehouseContact: WarehouseContact = {
                phone: '+919876543210', // Mock
                name: 'Warehouse Manager',
            };

            const message = `📍 **Address Updated**

**Shipment:** ${shipmentId}

**Old Address:**
${this.formatAddress(oldAddress)}

**New Address:**
${this.formatAddress(newAddress)}

Delivery will be attempted to new address.

-Helix System`;

            if (warehouseContact.phone) {
                await this.whatsapp.sendMessage(warehouseContact.phone, message);
                logger.info('WhatsApp notification sent for address change', {
                    warehouseId,
                    shipmentId,
                });
            }

            logger.info('Warehouse notified of address change', {
                warehouseId,
                shipmentId,
                oldPincode: oldAddress.pincode,
                newPincode: newAddress.pincode,
            });
        } catch (error: any) {
            logger.error('Failed to notify warehouse of address change', {
                error: error.message,
                shipmentId,
            });
            // Don't throw
        }
    }

    /**
     * Notify warehouse of stock update (already exists in InventoryService)
     * This is a placeholder for future implementation
     */
    static async notifyStockUpdate(
        warehouseId: string,
        sku: string,
        quantity: number,
        operation: 'deduction' | 'addition'
    ): Promise<void> {
        logger.info('Stock update notification', {
            warehouseId,
            sku,
            quantity,
            operation,
        });
        // TODO: Implement when needed
    }

    /**
     * Format address for display
     */
    private static formatAddress(address: Address): string {
        return `${address.street}, ${address.city}, ${address.state} - ${address.pincode}${address.landmark ? `\nLandmark: ${address.landmark}` : ''
            }`;
    }

    /**
     * Format date for display
     */
    private static formatDate(date: Date): string {
        return new Intl.DateTimeFormat('en-IN', {
            dateStyle: 'medium',
            timeStyle: 'short',
        }).format(date);
    }
}

export default WarehouseNotificationService;
