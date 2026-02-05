/**
 * Public RTO (Return to Origin) tracking page.
 * Customers can look up reverse shipment status by AWB or order number + phone.
 */

import { RTOTrackClient } from './RTOTrackClient';

export default function RTOTrackPage() {
    return <RTOTrackClient />;
}
