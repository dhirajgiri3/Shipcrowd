/**
 * Create Order Page (Server Component)
 * 
 * Server Component wrapper for order creation form.
 * All form logic and validation is in components/CreateOrderClient.tsx
 */

import { CreateOrderClient } from './components/CreateOrderClient';

export default function CreateOrderPage() {
    return <CreateOrderClient />;
}
