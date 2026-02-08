import { RateCardAnalytics } from './components/RateCardAnalytics';

export default async function RateCardAnalyticsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return <RateCardAnalytics rateCardId={id} />;
}
