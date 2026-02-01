import { useShipment } from './useShipments';

/**
 * Compatibility alias for plan docs/components expecting `useShipmentDetail`.
 * Internally, we already have `useShipment` which calls GET /shipments/:shipmentId.
 */
export const useShipmentDetail = useShipment;

