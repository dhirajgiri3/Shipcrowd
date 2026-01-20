/**
 * Smart Insights - AI-powered actionable recommendations
 * Psychology: Business partner mindset - proactive problem solving
 */

export interface SmartInsight {
    id: string;
    type: 'cost_saving' | 'rto_prevention' | 'delivery_optimization' | 'growth_opportunity';
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    impact: {
        metric: string;
        value: number;
        period: 'day' | 'week' | 'month';
        formatted: string;
    };
    data?: Record<string, unknown>;
    action: {
        type: 'auto_apply' | 'manual' | 'enable_feature';
        label: string;
        endpoint?: string;
        payload?: Record<string, unknown>;
        confirmMessage?: string;
        costImpact?: string;
    };
    socialProof: string;
    confidence: number; // 0-1
    projectedImpact?: {
        savings?: number;
        reduction?: number;
        improvement?: number;
        additionalCost?: number;
    };
    createdAt: string;
}

export const mockSmartInsights: SmartInsight[] = [
    {
        id: 'cost-save-001',
        type: 'cost_saving',
        priority: 'high',
        title: 'Save ₹2,400/week on Zone B deliveries',
        description: '18 orders/week to Zone B. Delhivery is ₹22 cheaper than your current BlueDart selection with same 2-day delivery time.',
        impact: {
            metric: 'savings',
            value: 2400,
            period: 'week',
            formatted: 'Save ₹2,400/week'
        },
        data: {
            currentCourier: 'BlueDart',
            recommendedCourier: 'Delhivery',
            orderCount: 18,
            currentAvgCost: 87,
            recommendedAvgCost: 65,
            savingsPerOrder: 22,
            totalWeeklySavings: 396,
            zone: 'B',
            deliveryTime: '2 days'
        },
        action: {
            type: 'auto_apply',
            label: 'Auto-select Delhivery for Zone B',
            endpoint: '/api/seller/courier-rules',
            payload: {
                zone: 'B',
                preferredCourier: 'delhivery'
            },
            confirmMessage: 'Future Zone B orders will automatically use Delhivery. You can change this anytime in settings.'
        },
        socialProof: '87% of similar sellers made this switch',
        confidence: 0.94,
        projectedImpact: {
            savings: 2400
        },
        createdAt: new Date().toISOString()
    },

    {
        id: 'rto-prevent-001',
        type: 'rto_prevention',
        priority: 'high',
        title: 'RTO rate increased 40% in last 7 days',
        description: 'Most RTOs from Tier 3 cities (Aligarh, Rohtak, Panipat) with reason "Customer unavailable". IVR confirmation could reduce this by ~60%.',
        impact: {
            metric: 'rto_reduction',
            value: 60,
            period: 'month',
            formatted: 'Reduce RTOs by 60%'
        },
        data: {
            currentRTORate: 8.2,
            previousRTORate: 5.8,
            increase: 41.4,
            affectedCities: ['Aligarh', 'Rohtak', 'Panipat'],
            mainReason: 'Customer unavailable',
            recommendedSolution: 'IVR Confirmation',
            tier3Orders: 45
        },
        action: {
            type: 'enable_feature',
            label: 'Enable IVR Confirmation',
            endpoint: '/api/seller/features/ivr-confirmation',
            costImpact: '₹2 per order',
            confirmMessage: 'IVR will call customers before delivery to confirm availability. Costs ₹2 per order but saves ₹150+ per prevented RTO.'
        },
        socialProof: '73% of sellers with high Tier 3 volume use this',
        confidence: 0.87,
        projectedImpact: {
            reduction: 60,
            savings: 8400, // Prevented RTO costs
            additionalCost: 1200 // IVR charges
        },
        createdAt: new Date().toISOString()
    },

    {
        id: 'cost-save-002',
        type: 'cost_saving',
        priority: 'medium',
        title: 'Use Surface shipping for non-urgent orders',
        description: '32% of your orders are marked "Standard" but shipped via Express. Surface shipping could save ₹1,800/week.',
        impact: {
            metric: 'savings',
            value: 1800,
            period: 'week',
            formatted: 'Save ₹1,800/week'
        },
        data: {
            expressOrders: 28,
            standardOrders: 28,
            avgExpressCost: 85,
            avgSurfaceCost: 50,
            savingsPerOrder: 35,
            deliveryTimeDiff: '2 days longer'
        },
        action: {
            type: 'manual',
            label: 'Review Order Settings',
            confirmMessage: 'We\'ll show you which orders can use Surface shipping'
        },
        socialProof: '64% of sellers optimize shipping speed vs cost',
        confidence: 0.82,
        projectedImpact: {
            savings: 1800
        },
        createdAt: new Date().toISOString()
    },

    {
        id: 'delivery-opt-001',
        type: 'delivery_optimization',
        priority: 'medium',
        title: 'Zone C deliveries taking 1.5 days longer',
        description: 'Your Zone C orders average 4.5 days vs 3 days industry standard. Switching to Ecom Express could improve delivery time by 33%.',
        impact: {
            metric: 'delivery_improvement',
            value: 33,
            period: 'week',
            formatted: 'Improve delivery by 33%'
        },
        data: {
            currentAvgTime: 4.5,
            industryAvg: 3,
            recommendedCourier: 'Ecom Express',
            'zoneC Orders': 15,
            costDiff: '+₹8 per order'
        },
        action: {
            type: 'auto_apply',
            label: 'Switch to Ecom Express for Zone C',
            endpoint: '/api/seller/courier-rules',
            payload: {
                zone: 'C',
                preferredCourier: 'ecom_express'
            },
            costImpact: '+₹120/week',
            confirmMessage: 'Faster delivery improves customer satisfaction and reduces complaints.'
        },
        socialProof: '56% of sellers prioritize speed for Zone C',
        confidence: 0.78,
        projectedImpact: {
            improvement: 33,
            additionalCost: 120
        },
        createdAt: new Date().toISOString()
    },

    {
        id: 'growth-opp-001',
        type: 'growth_opportunity',
        priority: 'low',
        title: 'Expand to Zone D - low competition detected',
        description: 'Your product category has 40% less competition in Zone D cities. Consider targeted marketing to Meerut, Aligarh region.',
        impact: {
            metric: 'potential_revenue',
            value: 15000,
            period: 'month',
            formatted: 'Potential ₹15,000/month'
        },
        data: {
            targetZone: 'D',
            competitionLevel: 'low',
            suggestedCities: ['Meerut', 'Aligarh', 'Rohtak'],
            avgOrderValue: 850,
            estimatedOrders: 18
        },
        action: {
            type: 'manual',
            label: 'View Market Analysis',
            confirmMessage: 'We\'ll show you detailed market data for Zone D expansion'
        },
        socialProof: '42% of sellers expanded to new zones in last 6 months',
        confidence: 0.71,
        projectedImpact: {
            savings: 15000
        },
        createdAt: new Date().toISOString()
    },

    {
        id: 'cost-save-003',
        type: 'cost_saving',
        priority: 'high',
        title: 'Upgrade to Business rate card',
        description: 'Your monthly volume (180 orders) qualifies for Business tier. Save ₹3,000/month with better rates across all zones.',
        impact: {
            metric: 'savings',
            value: 3000,
            period: 'month',
            formatted: 'Save ₹3,000/month'
        },
        data: {
            currentTier: 'Standard',
            qualifiedTier: 'Business',
            monthlyOrders: 180,
            requiredOrders: 150,
            avgSavingsPerOrder: 17
        },
        action: {
            type: 'manual',
            label: 'Upgrade Rate Card',
            endpoint: '/api/seller/rate-card/upgrade',
            confirmMessage: 'Contact support to upgrade your rate card. No additional fees.'
        },
        socialProof: '91% of eligible sellers upgraded their rate card',
        confidence: 0.96,
        projectedImpact: {
            savings: 3000
        },
        createdAt: new Date().toISOString()
    },

    {
        id: 'rto-prevent-002',
        type: 'rto_prevention',
        priority: 'medium',
        title: 'Enable address verification for COD orders',
        description: '12% of your COD RTOs are due to incorrect addresses. Address verification reduces this by 45%.',
        impact: {
            metric: 'rto_reduction',
            value: 45,
            period: 'month',
            formatted: 'Reduce address RTOs by 45%'
        },
        data: {
            codRTORate: 12,
            addressIssues: 8,
            recommendedSolution: 'Address Verification',
            costPerVerification: 1
        },
        action: {
            type: 'enable_feature',
            label: 'Enable Address Verification',
            endpoint: '/api/seller/features/address-verification',
            costImpact: '₹1 per order',
            confirmMessage: 'Customers will verify address via SMS before shipment.'
        },
        socialProof: '68% of COD-heavy sellers use address verification',
        confidence: 0.84,
        projectedImpact: {
            reduction: 45,
            savings: 5400,
            additionalCost: 600
        },
        createdAt: new Date().toISOString()
    }
];

// Helper to get insights by priority
export function getInsightsByPriority(priority: 'high' | 'medium' | 'low'): SmartInsight[] {
    return mockSmartInsights.filter(insight => insight.priority === priority);
}

// Helper to get top N insights
export function getTopInsights(count: number = 3): SmartInsight[] {
    return mockSmartInsights
        .sort((a, b) => {
            // Sort by priority first, then confidence
            const priorityOrder = { high: 0, medium: 1, low: 2 };
            if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
                return priorityOrder[a.priority] - priorityOrder[b.priority];
            }
            return b.confidence - a.confidence;
        })
        .slice(0, count);
}
