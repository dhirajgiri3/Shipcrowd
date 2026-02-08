
import { WarehouseDetailClient } from './components/WarehouseDetailClient';

interface WarehouseDetailPageProps {
    params: {
        id: string;
    };
}

export default async function WarehouseDetailPage({ params }: WarehouseDetailPageProps) {
    const { id } = await params;
    return <WarehouseDetailClient warehouseId={id} />;
}
