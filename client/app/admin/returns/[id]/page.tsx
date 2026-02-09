import { ReturnDetailClient } from "./components/ReturnDetailClient";

export const metadata = {
    title: 'Return Details | ShipCrowd Admin',
    description: 'View and manage return details'
};

export default async function ReturnDetailPage({
    params
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    return <ReturnDetailClient returnId={id} />;
}
