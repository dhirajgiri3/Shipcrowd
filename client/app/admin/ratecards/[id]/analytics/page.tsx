import { RateCardAnalytics } from './components/RateCardAnalytics';

export default function RateCardAnalyticsPage({ params }: { params: { id: string } }) {
    return <RateCardAnalytics rateCardId={params.id} />;
}
