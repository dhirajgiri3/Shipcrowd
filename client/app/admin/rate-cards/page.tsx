import { RateCardsClient } from './components/RateCardsClient';

export default async function RateCardsPage({
    searchParams,
}: {
    searchParams: Promise<{ new?: string }>;
}) {
    const params = await searchParams;
    const autoCreate = params?.new === '1';

    return <RateCardsClient autoStartCreate={autoCreate} />;
}
