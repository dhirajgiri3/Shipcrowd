/**
 * Courier Status Mapper Interface
 * 
 * Defines how to extract and map webhook payload data from different courier providers
 * Each courier implementation should provide its own mapper
 */

export interface ICourierStatusMapper {
    /**
     * Extract relevant fields from the raw webhook payload
     * @param payload Raw webhook payload from courier provider
     * @returns Extracted and normalized fields
     */
    extractFields(payload: any): {
        awb: string;
        status: string;
        location?: string;
        description?: string;
    };

    /**
     * Map courier-specific status to internal ShipCrowd status
     * @param courierStatus Status string from courier provider
     * @returns Internal status string ('delivered', 'in_transit', 'ndr', 'rto', 'cancelled', etc.)
     */
    mapStatus(courierStatus: string): string;

    /**
     * Get courier provider name
     */
    getCourierName(): string;
}
