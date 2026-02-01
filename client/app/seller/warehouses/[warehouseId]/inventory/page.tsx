import { InventoryListClient } from '../../components/InventoryListClient';

interface InventoryPageProps {
    params: Promise<{ warehouseId: string }>;
}

export default async function InventoryPage({ params }: InventoryPageProps) {
    const { warehouseId } = await params;

    return <InventoryListClient warehouseId={warehouseId} />;
}
