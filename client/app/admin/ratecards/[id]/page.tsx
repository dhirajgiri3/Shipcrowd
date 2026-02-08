import { RateCardDetailView } from './components/RateCardDetailView';

export default async function RateCardDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return <RateCardDetailView rateCardId={id} />;
}
