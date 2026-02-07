import { RateCardAnalytics } from './analytics/components/RateCardAnalytics';

export default function RateCardDetailsPage({ params }: { params: { id: string } }) {
    return <RateCardAnalytics rateCardId={params.id} />;
}
