import { redirect } from 'next/navigation';

export default async function LegacyCourierServiceDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    redirect(`/admin/couriers/services/${encodeURIComponent(id)}`);
}
