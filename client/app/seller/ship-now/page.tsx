import { DashboardErrorBoundary } from '@/src/components/errors/DashboardErrorBoundary';
import { ShipQueueClient } from './components/ShipQueueClient';

export default function SellerShipQueuePage() {
    return (
        <DashboardErrorBoundary>
            <ShipQueueClient />
        </DashboardErrorBoundary>
    );
}
