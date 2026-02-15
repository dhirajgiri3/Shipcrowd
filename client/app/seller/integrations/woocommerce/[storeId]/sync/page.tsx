'use client';

import { useParams } from 'next/navigation';
import IntegrationSyncPage from '@/app/seller/integrations/components/IntegrationSyncPage';

export const dynamic = 'force-dynamic';

export default function WooCommerceSyncPage() {
    const params = useParams();
    return <IntegrationSyncPage platform="woocommerce" type="WOOCOMMERCE" storeId={params.storeId as string} />;
}
