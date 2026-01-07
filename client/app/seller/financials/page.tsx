/**
 * Financials Page (Server Component)
 * 
 * Server Component wrapper for wallet and billing.
 * All interactive logic is in components/FinancialsClient.tsx
 */

import { FinancialsClient } from './components/FinancialsClient';

export default function FinancialsPage() {
    // TODO: Fetch financial data server-side
    // const data = await getFinancialData();
    // return <FinancialsClient initialData={data} />;

    return <FinancialsClient />;
}
