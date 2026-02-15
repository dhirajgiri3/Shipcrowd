/**
 * Platform metadata for integration store pages
 */

export type PlatformId = 'shopify' | 'amazon' | 'woocommerce' | 'flipkart';

export interface PlatformMeta {
    id: PlatformId;
    name: string;
    icon: string;
    color: string;
    bgClass: string;
    borderClass: string;
}

export const PLATFORM_META: Record<PlatformId, PlatformMeta> = {
    shopify: {
        id: 'shopify',
        name: 'Shopify',
        icon: '/logos/shopify.svg',
        color: '#95BF47',
        bgClass: 'bg-[#95BF47]/10',
        borderClass: 'border-[#95BF47]/20',
    },
    amazon: {
        id: 'amazon',
        name: 'Amazon',
        icon: '/logos/amazon.svg',
        color: '#FF9900',
        bgClass: 'bg-[#FF9900]/10',
        borderClass: 'border-[#FF9900]/20',
    },
    woocommerce: {
        id: 'woocommerce',
        name: 'WooCommerce',
        icon: '/logos/woocommerce.svg',
        color: '#96588A',
        bgClass: 'bg-[#96588A]/10',
        borderClass: 'border-[#96588A]/20',
    },
    flipkart: {
        id: 'flipkart',
        name: 'Flipkart',
        icon: '/logos/flipkart.png',
        color: '#2874F0',
        bgClass: 'bg-[#2874F0]/10',
        borderClass: 'border-[#2874F0]/20',
    },
};
