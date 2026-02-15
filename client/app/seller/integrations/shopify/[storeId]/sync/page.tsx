'use client';

import { useParams } from 'next/navigation';
import IntegrationSyncPage from '@/app/seller/integrations/components/IntegrationSyncPage';

export const dynamic = 'force-dynamic';

export default function ShopifySyncPage() {
    const params = useParams();
    const storeId = params.storeId as string;

    return (
        <IntegrationSyncPage platform="shopify" type="SHOPIFY" storeId={storeId} />
    );
}
