/**
 * Enhanced Pipeline Flow Mock Data
 *
 * Realistic shipment pipeline stage data for visual flow chart.
 * Includes health indicators and percentage distributions.
 */

export interface PipelineStage {
  id: string;
  name: string;
  label: string; // Display label
  count: number;
  percentage: number; // Of total
  health: 'healthy' | 'warning' | 'critical';
  avgDwellTime?: string; // How long shipments stay in this stage
  icon?: string; // Icon name for UI
}

export interface PipelineFlowData {
  stages: PipelineStage[];
  totalShipments: number;
  lastUpdated: string;
  freshness: 'real_time' | 'cached_60s' | 'stale_5m';
}

// ============================================================================
// Mock Pipeline Data
// ============================================================================

export function getMockPipelineFlow(): PipelineFlowData {
  const stages: PipelineStage[] = [
    {
      id: 'pending',
      name: 'Pending Pickup',
      label: 'Pending',
      count: 12,
      percentage: 5.3,
      health: 'warning', // Some shipments waiting too long
      avgDwellTime: '4 hours',
      icon: 'Package',
    },
    {
      id: 'picked',
      name: 'Picked Up',
      label: 'Picked',
      count: 5,
      percentage: 2.2,
      health: 'healthy',
      avgDwellTime: '2 hours',
      icon: 'PackageCheck',
    },
    {
      id: 'in_transit',
      name: 'In Transit',
      label: 'Transit',
      count: 42,
      percentage: 18.7,
      health: 'healthy',
      avgDwellTime: '1.5 days',
      icon: 'Truck',
    },
    {
      id: 'out_for_delivery',
      name: 'Out for Delivery',
      label: 'OFD',
      count: 8,
      percentage: 3.6,
      health: 'healthy',
      avgDwellTime: '6 hours',
      icon: 'MapPin',
    },
    {
      id: 'delivered',
      name: 'Delivered',
      label: 'Delivered',
      count: 156,
      percentage: 69.3,
      health: 'healthy',
      avgDwellTime: '-',
      icon: 'CheckCircle',
    },
    {
      id: 'rto',
      name: 'RTO (Return to Origin)',
      label: 'RTO',
      count: 3,
      percentage: 1.3,
      health: 'critical', // RTOs are always concerning
      avgDwellTime: '3 days',
      icon: 'RotateCcw',
    },
  ];

  const totalShipments = stages.reduce((sum, stage) => sum + stage.count, 0);

  return {
    stages,
    totalShipments,
    lastUpdated: new Date(Date.now() - 45 * 1000).toISOString(), // 45 sec ago
    freshness: 'real_time',
  };
}

export const mockPipelineFlow = getMockPipelineFlow();
