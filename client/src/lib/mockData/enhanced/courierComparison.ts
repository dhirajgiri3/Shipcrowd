/**
 * Courier Comparison Data - Realistic Indian courier performance
 * Psychology: Help sellers make informed courier selection decisions
 */

export interface CourierPerformance {
    name: string;
    logo?: string;
    stats: {
        ordersShipped: number;
        avgCost: number;
        avgDeliveryTime: number; // in days
        successRate: number; // percentage
        rtoRate: number; // percentage
        codRemittanceTime: number; // in days
    };
    zonePerformance: {
        zone: string;
        avgCost: number;
        avgDeliveryTime: number;
        successRate: number;
    }[];
    serviceTypes: {
        type: 'Express' | 'Surface' | 'Same Day';
        available: boolean;
        avgCost?: number;
        avgDeliveryTime?: number;
    }[];
    strengths: string[];
    weaknesses: string[];
    bestFor: string;
    rating: number; // 1-5
}

export const mockCourierData: CourierPerformance[] = [
    {
        name: 'Delhivery',
        stats: {
            ordersShipped: 1245,
            avgCost: 65,
            avgDeliveryTime: 2.5,
            successRate: 94.5,
            rtoRate: 4.8,
            codRemittanceTime: 7
        },
        zonePerformance: [
            { zone: 'A', avgCost: 55, avgDeliveryTime: 2.0, successRate: 96.2 },
            { zone: 'B', avgCost: 65, avgDeliveryTime: 2.5, successRate: 94.8 },
            { zone: 'C', avgCost: 75, avgDeliveryTime: 3.0, successRate: 93.1 },
            { zone: 'D', avgCost: 85, avgDeliveryTime: 3.5, successRate: 91.5 }
        ],
        serviceTypes: [
            { type: 'Express', available: true, avgCost: 85, avgDeliveryTime: 1.5 },
            { type: 'Surface', available: true, avgCost: 50, avgDeliveryTime: 4.0 },
            { type: 'Same Day', available: false }
        ],
        strengths: [
            'Wide network coverage',
            'Competitive pricing for Zones B & C',
            'Fast COD remittance',
            'Reliable tracking'
        ],
        weaknesses: [
            'Slightly higher RTO in Tier 3 cities',
            'Customer support delays during peak season'
        ],
        bestFor: 'High-volume sellers shipping to Zones B & C',
        rating: 4.3
    },
    {
        name: 'BlueDart',
        stats: {
            ordersShipped: 850,
            avgCost: 87,
            avgDeliveryTime: 1.8,
            successRate: 96.8,
            rtoRate: 3.2,
            codRemittanceTime: 10
        },
        zonePerformance: [
            { zone: 'A', avgCost: 75, avgDeliveryTime: 1.5, successRate: 98.1 },
            { zone: 'B', avgCost: 87, avgDeliveryTime: 1.8, successRate: 97.2 },
            { zone: 'C', avgCost: 98, avgDeliveryTime: 2.5, successRate: 95.4 },
            { zone: 'D', avgCost: 110, avgDeliveryTime: 3.0, successRate: 94.0 }
        ],
        serviceTypes: [
            { type: 'Express', available: true, avgCost: 110, avgDeliveryTime: 1.0 },
            { type: 'Surface', available: true, avgCost: 65, avgDeliveryTime: 3.5 },
            { type: 'Same Day', available: true, avgCost: 150, avgDeliveryTime: 0.3 }
        ],
        strengths: [
            'Fastest delivery times',
            'Highest success rate',
            'Premium service quality',
            'Same-day delivery in metros',
            'Best for high-value shipments'
        ],
        weaknesses: [
            'Most expensive option',
            'Slower COD remittance',
            'Limited coverage in Tier 3 cities'
        ],
        bestFor: 'Premium products requiring fast, reliable delivery',
        rating: 4.6
    },
    {
        name: 'Ecom Express',
        stats: {
            ordersShipped: 680,
            avgCost: 62,
            avgDeliveryTime: 2.8,
            successRate: 92.3,
            rtoRate: 6.5,
            codRemittanceTime: 8
        },
        zonePerformance: [
            { zone: 'A', avgCost: 52, avgDeliveryTime: 2.3, successRate: 94.5 },
            { zone: 'B', avgCost: 62, avgDeliveryTime: 2.8, successRate: 92.8 },
            { zone: 'C', avgCost: 70, avgDeliveryTime: 3.2, successRate: 91.2 },
            { zone: 'D', avgCost: 78, avgDeliveryTime: 3.8, successRate: 89.5 }
        ],
        serviceTypes: [
            { type: 'Express', available: true, avgCost: 80, avgDeliveryTime: 2.0 },
            { type: 'Surface', available: true, avgCost: 48, avgDeliveryTime: 4.5 },
            { type: 'Same Day', available: false }
        ],
        strengths: [
            'Great for e-commerce integration',
            'Competitive Zone A & B pricing',
            'Good for COD-heavy sellers',
            'Strong in South India'
        ],
        weaknesses: [
            'Higher RTO rates',
            'Slower delivery in North zones',
            'Inconsistent tracking updates'
        ],
        bestFor: 'E-commerce sellers with high COD volumes',
        rating: 3.9
    },
    {
        name: 'DTDC',
        stats: {
            ordersShipped: 420,
            avgCost: 58,
            avgDeliveryTime: 3.5,
            successRate: 90.2,
            rtoRate: 7.8,
            codRemittanceTime: 12
        },
        zonePerformance: [
            { zone: 'A', avgCost: 48, avgDeliveryTime: 3.0, successRate: 92.5 },
            { zone: 'B', avgCost: 58, avgDeliveryTime: 3.5, successRate: 90.8 },
            { zone: 'C', avgCost: 68, avgDeliveryTime: 4.0, successRate: 88.5 },
            { zone: 'D', avgCost: 75, avgDeliveryTime: 4.5, successRate: 86.2 }
        ],
        serviceTypes: [
            { type: 'Express', available: true, avgCost: 75, avgDeliveryTime: 2.5 },
            { type: 'Surface', available: true, avgCost: 45, avgDeliveryTime: 5.0 },
            { type: 'Same Day', available: false }
        ],
        strengths: [
            'Most affordable option',
            'Wide reach including rural areas',
            'Good for non-urgent shipments',
            'Established network'
        ],
        weaknesses: [
            'Slowest delivery times',
            'Highest RTO rates',
            'Longer COD remittance',
            'Less reliable tracking'
        ],
        bestFor: 'Budget-conscious sellers with non-urgent shipments',
        rating: 3.5
    },
    {
        name: 'Xpressbees',
        stats: {
            ordersShipped: 520,
            avgCost: 63,
            avgDeliveryTime: 2.6,
            successRate: 93.1,
            rtoRate: 5.5,
            codRemittanceTime: 7
        },
        zonePerformance: [
            { zone: 'A', avgCost: 53, avgDeliveryTime: 2.2, successRate: 95.0 },
            { zone: 'B', avgCost: 63, avgDeliveryTime: 2.6, successRate: 93.5 },
            { zone: 'C', avgCost: 73, avgDeliveryTime: 3.1, successRate: 92.0 },
            { zone: 'D', avgCost: 80, avgDeliveryTime: 3.6, successRate: 90.2 }
        ],
        serviceTypes: [
            { type: 'Express', available: true, avgCost: 82, avgDeliveryTime: 1.8 },
            { type: 'Surface', available: true, avgCost: 49, avgDeliveryTime: 4.2 },
            { type: 'Same Day', available: false }
        ],
        strengths: [
            'Good balance of cost and speed',
            'Strong in East India',
            'Growing network',
            'Responsive customer support'
        ],
        weaknesses: [
            'Limited same-day delivery',
            'Coverage gaps in some Tier 3 cities'
        ],
        bestFor: 'Sellers looking for balanced cost and performance',
        rating: 4.1
    }
];

/**
 * Get courier recommendation based on criteria
 */
export interface RecommendationCriteria {
    zone?: string;
    priority: 'cost' | 'speed' | 'reliability' | 'balanced';
    orderValue?: number; // in ₹
    isCOD?: boolean;
}

export function getCourierRecommendation(criteria: RecommendationCriteria): {
    recommended: CourierPerformance;
    alternatives: CourierPerformance[];
    reason: string;
} {
    let recommended: CourierPerformance;
    let reason: string;

    if (criteria.priority === 'cost') {
        recommended = mockCourierData.find(c => c.name === 'DTDC')!;
        reason = 'Lowest cost per shipment across all zones';
    } else if (criteria.priority === 'speed') {
        recommended = mockCourierData.find(c => c.name === 'BlueDart')!;
        reason = 'Fastest delivery times with highest success rate';
    } else if (criteria.priority === 'reliability') {
        recommended = mockCourierData.find(c => c.name === 'BlueDart')!;
        reason = 'Highest success rate and lowest RTO';
    } else {
        // Balanced - Delhivery or Xpressbees
        recommended = mockCourierData.find(c => c.name === 'Delhivery')!;
        reason = 'Best balance of cost, speed, and reliability for most zones';
    }

    const alternatives = mockCourierData.filter(c => c.name !== recommended.name)
        .sort((a, b) => b.rating - a.rating)
        .slice(0, 2);

    return {
        recommended,
        alternatives,
        reason
    };
}

/**
 * Compare two couriers side by side
 */
export function compareCouriers(
    courier1: string,
    courier2: string
): {
    courier1: CourierPerformance;
    courier2: CourierPerformance;
    winner: {
        cost: string;
        speed: string;
        reliability: string;
        overall: string;
    };
} {
    const c1 = mockCourierData.find(c => c.name === courier1)!;
    const c2 = mockCourierData.find(c => c.name === courier2)!;

    return {
        courier1: c1,
        courier2: c2,
        winner: {
            cost: c1.stats.avgCost < c2.stats.avgCost ? c1.name : c2.name,
            speed: c1.stats.avgDeliveryTime < c2.stats.avgDeliveryTime ? c1.name : c2.name,
            reliability: c1.stats.successRate > c2.stats.successRate ? c1.name : c2.name,
            overall: c1.rating > c2.rating ? c1.name : c2.name
        }
    };
}

/**
 * Get all couriers sorted by criteria
 */
export function getCouriersSortedBy(
    criteria: 'cost' | 'speed' | 'reliability' | 'rating'
): CourierPerformance[] {
    const sorted = [...mockCourierData];

    switch (criteria) {
        case 'cost':
            return sorted.sort((a, b) => a.stats.avgCost - b.stats.avgCost);
        case 'speed':
            return sorted.sort((a, b) => a.stats.avgDeliveryTime - b.stats.avgDeliveryTime);
        case 'reliability':
            return sorted.sort((a, b) => b.stats.successRate - a.stats.successRate);
        case 'rating':
            return sorted.sort((a, b) => b.rating - a.rating);
        default:
            return sorted;
    }
}
