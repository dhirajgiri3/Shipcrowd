/**
 * Analytics Events Schema
 *
 * Centralized event tracking for UX measurement and A/B testing.
 * All dashboard interactions must fire appropriate events.
 *
 * Usage:
 * ```typescript
 * import { track, EVENTS } from '@/lib/analytics/events';
 *
 * track(EVENTS.KPI_CLICKED, {
 *   kpi_name: 'revenue',
 *   delta: 12.3,
 *   trend: 'up'
 * });
 * ```
 */

// ============================================================================
// Event Names (Canonical)
// ============================================================================

export const EVENTS = {
  // Dashboard Events
  DASHBOARD_VIEWED: 'dashboard.viewed',
  DASHBOARD_REFRESHED: 'dashboard.refreshed',

  // KPI Events
  KPI_CLICKED: 'kpi.clicked',
  KPI_SPARKLINE_HOVERED: 'kpi.sparkline.hovered',

  // Trend Chart Events
  TREND_CLICKED: 'trend.clicked',
  TREND_BRUSHED: 'trend.brushed', // Time range selection
  TREND_DATA_POINT_CLICKED: 'trend.data_point.clicked',

  // Pipeline Events
  PIPELINE_STAGE_CLICKED: 'pipeline.stage.clicked',
  PIPELINE_STAGE_HOVERED: 'pipeline.stage.hovered',

  // Geographic Events
  GEOGRAPHIC_CITY_CLICKED: 'geographic.city.clicked',
  GEOGRAPHIC_REGION_CLICKED: 'geographic.region.clicked',
  CITY_SELECTED: 'city.selected',
  CITY_CLEARED: 'city.cleared',
  MAP_CLUSTER_CLICKED: 'map.cluster.clicked',
  TOP_CITIES_CHART_CLICKED: 'top_cities.chart.clicked',

  // Insights Events
  INSIGHT_VIEWED: 'insight.viewed',
  INSIGHT_ACTIONED: 'insight.actioned',
  INSIGHT_DISMISSED: 'insight.dismissed',
  SMART_INSIGHT_APPLIED: 'smart_insight.applied',
  SMART_INSIGHTS_CAROUSEL_NEXT: 'smart_insights.carousel.next',
  SMART_INSIGHTS_CAROUSEL_PREVIOUS: 'smart_insights.carousel.previous',

  // Carrier Events
  CARRIER_COMPARED: 'carrier.compared',
  CARRIER_SWITCH_INITIATED: 'carrier.switch.initiated',
  CARRIER_SWITCH_CONFIRMED: 'carrier.switch.confirmed',
  CARRIER_SWITCH_CANCELLED: 'carrier.switch.cancelled',

  // Action Events
  UNDO_ACTION: 'undo.action',
  BULK_ACTION_STARTED: 'bulk.action.started',
  BULK_ACTION_COMPLETED: 'bulk.action.completed',
  BULK_ACTION_FAILED: 'bulk.action.failed',

  // Error Events
  API_ERROR: 'api.error',
  DATA_STALE_WARNING_SHOWN: 'data.stale_warning.shown',

  // Performance Events
  PAGE_LOAD_TIME: 'page.load_time',
  CHART_RENDER_TIME: 'chart.render_time',
} as const;

// ============================================================================
// Event Property Types
// ============================================================================

interface BaseEventProperties {
  user_id?: string;
  org_id?: string;
  viewport_width: number;
  viewport_height: number;
  device_type: 'mobile' | 'tablet' | 'desktop';
  timestamp: string; // ISO 8601
  session_id?: string;
}

interface DashboardViewedProperties extends BaseEventProperties {
  last_sync_age_ms: number;
  has_urgent_actions: boolean;
  filters_applied?: Record<string, any>;
}

interface KPIClickedProperties extends BaseEventProperties {
  kpi_name: 'revenue' | 'profit' | 'orders' | 'wallet';
  value: number;
  delta: number; // percentage change
  trend: 'up' | 'down' | 'neutral';
  sparkline_data: number[];
  filters_applied?: Record<string, any>;
}

interface TrendClickedProperties extends BaseEventProperties {
  metric: string;
  range: '7d' | '30d' | '90d';
  data_point_index?: number;
  data_point_value?: number;
}

interface PipelineStageClickedProperties extends BaseEventProperties {
  stage_name: string;
  stage_count: number;
  stage_percentage: number;
  health: 'healthy' | 'warning' | 'critical';
}

interface CitySelectedProperties extends BaseEventProperties {
  city_id: string;
  city_name: string;
  state: string;
  previous_city_id?: string;
  source: 'typeahead' | 'chart_click' | 'map_click';
}

interface InsightActionedProperties extends BaseEventProperties {
  insight_id: string;
  insight_type: 'cost_saving' | 'rto_prevention' | 'carrier_optimization';
  action_type: 'auto_apply' | 'manual_apply' | 'view_details';
  projected_impact_value: number;
  projected_impact_metric: string;
}

interface CarrierSwitchConfirmedProperties extends BaseEventProperties {
  from_carrier: string;
  to_carrier: string;
  order_count: number;
  projected_savings: number;
  confirmation_time_ms: number; // Time from initiate to confirm
}

interface UndoActionProperties extends BaseEventProperties {
  action_id: string;
  action_type: string;
  undo_time_ms: number; // Time from action to undo
}

interface BulkActionProperties extends BaseEventProperties {
  action_type: string;
  total_count: number;
  success_count?: number;
  error_count?: number;
  errors?: Array<{ row_index: number; error_message: string }>;
}

interface APIErrorProperties extends BaseEventProperties {
  endpoint: string;
  error_code: string;
  error_message: string;
  retry_attempted: boolean;
}

interface PerformanceProperties extends BaseEventProperties {
  metric_name: string;
  duration_ms: number;
  p50?: number;
  p95?: number;
}

// ============================================================================
// Track Function
// ============================================================================

/**
 * Track an analytics event
 *
 * @param event - Event name (use EVENTS constant)
 * @param properties - Event-specific properties
 *
 * @example
 * ```typescript
 * track(EVENTS.KPI_CLICKED, {
 *   kpi_name: 'revenue',
 *   value: 52340,
 *   delta: 12.3,
 *   trend: 'up',
 *   sparkline_data: [45200, 48100, 51200, 49800, 52300, 50100, 52340],
 *   viewport_width: 1920,
 *   viewport_height: 1080,
 *   device_type: 'desktop',
 *   timestamp: new Date().toISOString()
 * });
 * ```
 */
export function track(
  event: typeof EVENTS[keyof typeof EVENTS],
  properties: Record<string, any>
): void {
  // Enrich with automatic properties
  const enrichedProperties = {
    ...properties,
    viewport_width: window.innerWidth,
    viewport_height: window.innerHeight,
    device_type: getDeviceType(),
    timestamp: new Date().toISOString(),
    session_id: getSessionId(),
  };

  // Development: Log to console
  if (process.env.NODE_ENV === 'development') {
    console.log('[Analytics]', event, enrichedProperties);
  }

  // Production: Send to analytics backend
  if (process.env.NODE_ENV === 'production') {
    sendToAnalytics(event, enrichedProperties);
  }

  // Also send to browser localStorage for debugging
  if (process.env.NODE_ENV === 'development') {
    saveToLocalStorage(event, enrichedProperties);
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Track KPI click with automatic enrichment
 */
export function trackKPIClick(
  kpiName: 'revenue' | 'profit' | 'orders' | 'wallet',
  value: number,
  delta: number,
  trend: 'up' | 'down' | 'neutral',
  sparklineData: number[]
): void {
  track(EVENTS.KPI_CLICKED, {
    kpi_name: kpiName,
    value,
    delta,
    trend,
    sparkline_data: sparklineData,
  });
}

/**
 * Track pipeline stage click
 */
export function trackPipelineClick(
  stageName: string,
  count: number,
  percentage: number,
  health: 'healthy' | 'warning' | 'critical'
): void {
  track(EVENTS.PIPELINE_STAGE_CLICKED, {
    stage_name: stageName,
    stage_count: count,
    stage_percentage: percentage,
    health,
  });
}

/**
 * Track city selection
 */
export function trackCitySelect(
  cityId: string,
  cityName: string,
  state: string,
  source: 'typeahead' | 'chart_click' | 'map_click'
): void {
  track(EVENTS.CITY_SELECTED, {
    city_id: cityId,
    city_name: cityName,
    state,
    source,
  });
}

/**
 * Track insight action
 */
export function trackInsightAction(
  insightId: string,
  insightType: 'cost_saving' | 'rto_prevention' | 'carrier_optimization',
  actionType: 'auto_apply' | 'manual_apply' | 'view_details',
  projectedImpact: { value: number; metric: string }
): void {
  track(EVENTS.INSIGHT_ACTIONED, {
    insight_id: insightId,
    insight_type: insightType,
    action_type: actionType,
    projected_impact_value: projectedImpact.value,
    projected_impact_metric: projectedImpact.metric,
  });
}

/**
 * Track undo action
 */
export function trackUndo(actionId: string, actionType: string, undoTimeMs: number): void {
  track(EVENTS.UNDO_ACTION, {
    action_id: actionId,
    action_type: actionType,
    undo_time_ms: undoTimeMs,
  });
}

// ============================================================================
// Helper Functions
// ============================================================================

function getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  const width = window.innerWidth;
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}

function getSessionId(): string {
  let sessionId = sessionStorage.getItem('analytics_session_id');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('analytics_session_id', sessionId);
  }
  return sessionId;
}

function sendToAnalytics(event: string, properties: Record<string, any>): void {
  // TODO: Integrate with actual analytics backend (Mixpanel, Amplitude, etc.)
  // For now, send to a simple endpoint
  if (typeof window !== 'undefined') {
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, properties }),
    }).catch((error) => {
      console.error('[Analytics] Failed to send event:', error);
    });
  }
}

function saveToLocalStorage(event: string, properties: Record<string, any>): void {
  try {
    const existing = JSON.parse(localStorage.getItem('analytics_events') || '[]');
    existing.push({ event, properties });
    // Keep only last 100 events
    const trimmed = existing.slice(-100);
    localStorage.setItem('analytics_events', JSON.stringify(trimmed));
  } catch (error) {
    console.error('[Analytics] Failed to save to localStorage:', error);
  }
}

// ============================================================================
// Performance Measurement
// ============================================================================

/**
 * Measure and track performance metric
 *
 * @example
 * ```typescript
 * const stopTimer = startPerformanceTimer('page_load');
 * // ... page loads
 * stopTimer(); // Automatically tracks to analytics
 * ```
 */
export function startPerformanceTimer(metricName: string): () => void {
  const startTime = performance.now();

  return () => {
    const duration = performance.now() - startTime;
    track(EVENTS.PAGE_LOAD_TIME, {
      metric_name: metricName,
      duration_ms: Math.round(duration),
    });
  };
}

/**
 * Track render time for a component
 */
export function trackComponentRender(componentName: string, duration: number): void {
  track(EVENTS.CHART_RENDER_TIME, {
    metric_name: `${componentName}_render`,
    duration_ms: Math.round(duration),
  });
}

// ============================================================================
// Export Types (for TypeScript consumers)
// ============================================================================

export type {
  DashboardViewedProperties,
  KPIClickedProperties,
  TrendClickedProperties,
  PipelineStageClickedProperties,
  CitySelectedProperties,
  InsightActionedProperties,
  CarrierSwitchConfirmedProperties,
  UndoActionProperties,
  BulkActionProperties,
  APIErrorProperties,
  PerformanceProperties,
};
