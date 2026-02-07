import { EditRatecardClient } from './components/EditRatecardClient';

export default function EditRateCardPage({ params }: { params: { id: string } }) {
    return <EditRatecardClient rateCardId={params.id} />;
}
