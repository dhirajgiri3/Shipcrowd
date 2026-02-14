/**
 * Communication feature constants
 * Shared config for templates and rules
 */

import type { TemplateType, TemplateCategory } from '@/src/types/api/communication';
import { Mail, MessageSquare } from 'lucide-react';

export const typeOptions: { value: TemplateType; label: string; icon: typeof Mail }[] = [
    { value: 'SMS', label: 'SMS', icon: MessageSquare },
    { value: 'EMAIL', label: 'Email', icon: Mail },
    { value: 'WHATSAPP', label: 'WhatsApp', icon: MessageSquare },
];

export const categoryOptions: { value: TemplateCategory; label: string }[] = [
    { value: 'ORDER_CONFIRMATION', label: 'Order Confirmation' },
    { value: 'SHIPPED', label: 'Shipped' },
    { value: 'OUT_FOR_DELIVERY', label: 'Out for Delivery' },
    { value: 'DELIVERED', label: 'Delivered' },
    { value: 'NDR', label: 'NDR Alert' },
    { value: 'RETURN_INITIATED', label: 'Return Initiated' },
    { value: 'RETURN_RECEIVED', label: 'Return Received' },
    { value: 'REFUND_PROCESSED', label: 'Refund Processed' },
    { value: 'PICKUP_SCHEDULED', label: 'Pickup Scheduled' },
    { value: 'CUSTOM', label: 'Custom' },
];
