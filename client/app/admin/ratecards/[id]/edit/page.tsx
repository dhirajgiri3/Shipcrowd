import { EditRatecardClient } from './components/EditRatecardClient';

export default async function EditRateCardPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return <EditRatecardClient rateCardId={id} />;
}
