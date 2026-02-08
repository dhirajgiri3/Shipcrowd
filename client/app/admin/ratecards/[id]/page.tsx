import { RateCardDetailView } from './components/RateCardDetailView';

export default function RateCardDetailsPage({ params }: { params: { id: string } }) {
    return <RateCardDetailView rateCardId={params.id} />;
}
