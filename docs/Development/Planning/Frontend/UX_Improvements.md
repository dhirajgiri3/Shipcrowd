# Helix: Dashboard Transformation Plan

**Mission:** Transform seller dashboard from card-heavy UI into decision-first operational cockpit that answers "What should I do?" in < 3 seconds.

**Target:** Indian e-commerce sellers (70% mobile, price-sensitive, COD-heavy, RTO-averse)

**Approach:** Incremental, measured, rollback-ready phases with strict acceptance criteria

---

## Current State Assessment (Brutal Truth)

### What We Have (Phase 0 Status: ~60% Complete)

✅ **Completed:**
- PerformanceBar exists (compact KPI layout)
- SmartInsightsPanel redesigned (no emojis/sparkles)
- QuickActionsGrid reduced (8→6 items)
- DashboardSetupBanner (gamified onboarding)
- Component code quality improved

❌ **Critical Gaps (Must Fix):**
- **No visual data hierarchy** — everything looks same weight
- **No trend visualization** — KPIs show static numbers, no context
- **No geographic insights** — city data not visualized
- **Card-heavy layout** — 85% text/cards, 15% charts
- **Charts hidden** — Order Trend buried in collapsed section (Priority 7)
- **No shipment flow visualization** — 6 equal status cards instead of pipeline
- **No data freshness indicators** — users don't know if data is stale
- **No instrumentation** — can't measure UX improvements
- **No decision clarity** — can't answer "Is revenue up?" or "Where are bottlenecks?" quickly

### Research-Backed Problems

From [Dashboard Design Best Practices 2026](https://www.designrush.com/agency/ui-ux-design/dashboard/trends/dashboard-design-principles):
- **Visual hierarchy broken:** Primary KPIs must be 1.5× larger than secondary
- **Charts vs cards ratio wrong:** Should be 40-50% visual, 50-60% cards/text (we're at 15%/85%)
- **Cognitive load high:** No progressive disclosure, everything visible always

From [Shipping Dashboard Examples](https://www.quantizeanalytics.co.uk/shipping-dashboard-examples/):
- **Missing critical visuals:** No heatmap, no timeline, no sparklines, no gauge charts
- **No geographic context:** Shipping dashboards need city-level heatmaps

From [Data Visualization ROI Research](https://sranalytics.io/blog/data-visualization-techniques/):
- **Visual retention:** 65% retention for visual data vs 10% for text
- **Persuasion:** 67% convinced by visual data vs 50% by verbal content

**Verdict:** Current dashboard fails to leverage visual cognition and fails to establish clear hierarchy.

---

## Design Principles (Non-Negotiable)

### 1. Decision-First Hierarchy

Every screen must answer these questions in order:

1. **Urgent:** What needs my attention NOW? (alerts, low balance, failed shipments)
2. **Status:** Is my business healthy? (wallet, orders, revenue with trends)
3. **Insights:** How can I improve? (cost savings, RTO prevention)
4. **Details:** What are the patterns? (charts, analytics — expandable)

### 2. Visual > Text

- **KPIs:** Number + sparkline + delta (not just number)
- **Status:** Pipeline flow (not 6 equal cards)
- **Geography:** Heatmap + bar chart (not hidden)
- **Trends:** Dominant chart always visible (not collapsed)

### 3. Mobile-First (70% Usage)

- Thumb-zone primary actions
- Bottom sheets > modals
- Swipeable KPIs and cards
- Single-column collapsed layout

### 4. Indian Market Psychology

- **Price sensitivity:** Show savings prominently (₹2,400/week saved)
- **Trust:** Transparent cost breakdowns, no hidden fees
- **COD focus:** 65% of orders — needs visibility
- **RTO prevention:** Loss aversion — highlight risk early

### 5. Data Freshness Contract

Every API response MUST include:
```typescript
{
  data: T,
  last_updated_at: string, // ISO 8601
  freshness: 'real_time' | 'cached_60s' | 'stale_5m' | 'stale_15m'
}
```

Show amber badge if stale > 10 minutes.

---

## Phase Breakdown

### Phase 0: Foundation (60% Complete) — FINISH FIRST

**Remaining Tasks:**

1. **Decision Map (1 page)**
   - File: `/docs/Development/Planning/Frontend/DecisionMap.md`
   - Content: Above-the-fold wireframes (desktop + mobile), Tier 1/2/3 rules
   - Acceptance: All PRs must reference this doc

2. **Instrumentation Schema**
   - File: `/client/src/lib/analytics/events.ts`
   - Events:
     ```typescript
     dashboard.viewed
     kpi.clicked (kpi_name, filters)
     trend.clicked (metric, range)
     pipeline.stage.clicked (stage)
     city.selected (city_id)
     insight.actioned (insight_id, action_type)
     ```
   - Acceptance: Events fire and visible in console (dev mode)

3. **Enhanced Mock Data**
   - Files:
     - `/client/src/lib/mockData/enhanced/kpiTrends.ts` (7-day sparklines)
     - `/client/src/lib/mockData/enhanced/geoMetrics.ts` (city aggregates)
     - `/client/src/lib/mockData/enhanced/pipelineFlow.ts` (stage counts)
   - Acceptance: Mock data matches API contract types

4. **Mobile-First Patterns**
   - Files:
     - `/client/src/components/patterns/BottomSheet.tsx`
     - `/client/src/components/patterns/SwipeableCard.tsx`
   - Acceptance: Components work on 360px width

**Gate Criteria:**
- [ ] Decision Map approved and published
- [ ] Analytics events firing
- [ ] Mock data types match API contracts
- [ ] Mobile patterns tested on 360px

---

### Phase 1: Visual Hierarchy + Trends (NEXT — 5 days)

**Objective:** Make dashboard answer "Is business healthy?" and "What's trending?" in < 3 seconds.

**Scope:**

#### 1.1: Add Sparklines to PerformanceBar

**File:** `/client/src/components/seller/dashboard/PerformanceBar.tsx`

**Changes:**
- Add 7-day sparkline per KPI (Revenue, Profit, Orders)
- Add delta text: `+12% vs last 7 days` or `↓ 3% vs last 7 days`
- Add `last_updated_at` badge
- Make each KPI clickable (applies filter to order list)

**Implementation:**
```typescript
interface KPICardProps {
  label: string;
  value: number;
  sparkline: number[]; // 7 data points
  delta: number; // percentage change
  trend: 'up' | 'down' | 'neutral';
  onClick: () => void;
}

// Sparkline: lightweight SVG path (no heavy chart library)
const Sparkline = ({ data }: { data: number[] }) => {
  const points = data.map((v, i) =>
    `${i * 10},${40 - (v / Math.max(...data)) * 30}`
  ).join(' ');
  return <polyline points={points} stroke="var(--primary-blue)" fill="none" />;
};
```

**Mock Data:**
```typescript
// /client/src/lib/mockData/enhanced/kpiTrends.ts
export const mockKPITrends = {
  revenue: {
    today: 52340,
    sparkline: [45200, 48100, 51200, 49800, 52300, 50100, 52340],
    delta: 12.3,
    trend: 'up'
  },
  // ... profit, orders
};
```

**Acceptance:**
- [ ] Sparkline renders correctly on mobile (360px)
- [ ] Delta shows correct % and color (green up, red down)
- [ ] Click KPI filters order list
- [ ] `last_updated_at` visible
- [ ] Analytics event `kpi.clicked` fires

**Instrumentation:**
```typescript
analytics.track('kpi.clicked', {
  kpi_name: 'revenue',
  delta: 12.3,
  trend: 'up',
  filters_applied: { range: '7d' }
});
```

---

#### 1.2: Create Dominant Order Trend Chart

**File:** `/client/src/components/seller/dashboard/OrderTrendChart.tsx` (NEW)

**Design:**
- Large area chart showing 30-day order volume
- Always visible (Tier 1 priority, not collapsed)
- Brushable (select time range)
- Click data point → filter orders by date

**Placement:**
- **Current:** AnalyticsSection (Priority 7, collapsed)
- **New:** Directly after PerformanceBar (Priority 2, expanded)

**Implementation:**
```typescript
export function OrderTrendChart({ data }: { data: TrendData[] }) {
  return (
    <div className="rounded-2xl bg-[var(--bg-primary)] border p-6">
      <h3>Order Volume Trend (Last 30 Days)</h3>
      <ResponsiveContainer width="100%" height={250}>
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Area
            type="monotone"
            dataKey="orders"
            fill="var(--primary-blue)"
            stroke="var(--primary-blue-deep)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
```

**Mock Data:**
```typescript
// /client/src/lib/mockData/enhanced/orderTrend.ts
export const mockOrderTrend = generateRealisticTrend({
  days: 30,
  baseVolume: 42,
  variance: 0.2,
  weekendDrop: 0.3,
  festivalSpikes: [{ day: 15, multiplier: 2.5 }]
});
```

**Acceptance:**
- [ ] Chart visible above fold (no scroll required)
- [ ] Mobile: Chart readable at 360px width
- [ ] Click data point filters order list
- [ ] Chart loads in < 1s
- [ ] Analytics event `trend.clicked` fires

---

#### 1.3: Restructure DashboardClient Hierarchy

**File:** `/client/app/seller/components/DashboardClient.tsx`

**Current Priority Order:**
```
1. UrgentActionsBar
2. PerformanceBar (no sparklines)
3. OrderStatusGrid (6 cards)
4. CODStatusCard
5. QuickActionsGrid
6. SmartInsightsPanel
7. AnalyticsSection (COLLAPSED)
```

**New Priority Order:**
```
TIER 1 (Above fold, no scroll)
1. UrgentActionsBar (if alerts exist)
2. PerformanceBar (WITH sparklines)
3. OrderTrendChart (NEW — 30 days, always visible)

TIER 2 (First scroll)
4. ShipmentPipeline (REPLACES OrderStatusGrid in Phase 2)
5. GeographicInsights (NEW — Phase 2)

TIER 3 (Context & actions)
6. SmartInsightsPanel
7. CODStatusCard
8. QuickActionsGrid

TIER 4 (Expandable)
9. DetailedAnalytics (courier comparison, zone distribution)
```

**Implementation:**
```tsx
return (
  <div className="min-h-screen space-y-8">
    {/* TIER 1: Decision-critical */}
    {urgentActions.length > 0 && <UrgentActionsBar actions={urgentActions} />}

    <PerformanceBar
      kpis={kpisWithSparklines}
      lastUpdated={lastSyncTime}
    />

    <OrderTrendChart data={orderTrend30Days} />

    {/* TIER 2: Operational clarity */}
    <OrderStatusGrid /> {/* Will be replaced with pipeline in Phase 2 */}

    {/* TIER 3: Insights & actions */}
    <SmartInsightsPanel insights={topInsights} />
    <CODStatusCard {...codData} />
    <QuickActionsGrid />

    {/* TIER 4: Deep dive (collapsed by default on mobile) */}
    <AnalyticsSection defaultExpanded={!isMobile}>
      <CourierComparison />
      <ZoneDistribution />
    </AnalyticsSection>
  </div>
);
```

**Acceptance:**
- [ ] Order Trend visible without scroll (desktop)
- [ ] Mobile: Trend visible after 1 scroll
- [ ] Visual hierarchy clear (Tier 1 elements 1.5× larger)
- [ ] Page load < 2s

---

**Phase 1 Gate Criteria:**

Before moving to Phase 2, verify:

1. **Metrics (vs baseline):**
   - [ ] Time to answer "Is revenue up?" reduced by ≥30%
   - [ ] KPI click-through rate > 0% (instrumented)
   - [ ] Trend chart interaction rate > 15% of sessions

2. **Quality:**
   - [ ] Mobile usability score (manual test) ≥ 8/10
   - [ ] No TypeScript errors
   - [ ] Dark mode works
   - [ ] Accessibility: Lighthouse score ≥ 90

3. **Instrumentation:**
   - [ ] All analytics events firing correctly
   - [ ] Baseline metrics captured (pre-Phase 1)
   - [ ] Post-Phase 1 metrics show improvement

**Rollback Trigger:**
- If KPI click-through rate < 5% after 1 week → revert sparklines
- If trend chart causes performance issues (load > 3s) → collapse by default

---

### Phase 2: Visual Pipeline + Geography (7 days)

**Objective:** Replace static status cards with visual shipment flow and add geographic intelligence.

**Scope:**

#### 2.1: Replace OrderStatusGrid with Shipment Pipeline

**Current:** 6 equal cards showing counts
**New:** Horizontal flow visualization

**File:** `/client/src/components/seller/dashboard/ShipmentPipeline.tsx` (NEW)

**Design:**
```
┌──────────────────────────────────────────────────────────────┐
│  Pending → Picked → In Transit → OFD → Delivered → RTO      │
│    12        5         42        8       156       3         │
│  [████]   [██]    [████████]  [███]   [██████]   [█]         │
└──────────────────────────────────────────────────────────────┘
```

- Width proportional to volume
- Click stage → filter orders
- Show % of total
- Color-coded by health (green = good, amber = delayed, red = stuck)

**Implementation:**
```typescript
interface PipelineStage {
  name: string;
  count: number;
  percentage: number;
  health: 'healthy' | 'warning' | 'critical';
  onClick: () => void;
}

export function ShipmentPipeline({ stages }: { stages: PipelineStage[] }) {
  const maxCount = Math.max(...stages.map(s => s.count));

  return (
    <div className="grid grid-cols-6 gap-2">
      {stages.map(stage => (
        <button
          key={stage.name}
          onClick={stage.onClick}
          className="relative rounded-xl p-4 border hover:border-focus"
          style={{
            backgroundColor: healthColors[stage.health],
            height: `${(stage.count / maxCount) * 100}px`
          }}
        >
          <div className="font-bold text-2xl">{stage.count}</div>
          <div className="text-xs">{stage.name}</div>
          <div className="text-xs opacity-70">{stage.percentage}%</div>
        </button>
      ))}
    </div>
  );
}
```

**Mock Data:**
```typescript
// /client/src/lib/mockData/enhanced/pipelineFlow.ts
export const mockPipelineFlow = {
  stages: [
    { name: 'Pending', count: 12, health: 'warning' },
    { name: 'Picked', count: 5, health: 'healthy' },
    { name: 'In Transit', count: 42, health: 'healthy' },
    { name: 'OFD', count: 8, health: 'healthy' },
    { name: 'Delivered', count: 156, health: 'healthy' },
    { name: 'RTO', count: 3, health: 'critical' }
  ]
};
```

**Acceptance:**
- [ ] Pipeline widths match counts (±2% tolerance)
- [ ] Click stage filters orders
- [ ] Mobile: Pipeline stacks vertically or shows stepper
- [ ] Analytics event `pipeline.stage.clicked` fires

---

#### 2.2: Add Geographic Selector + Top Cities

**File:** `/client/src/components/seller/dashboard/GeographicInsights.tsx` (NEW)

**Design:**
- City typeahead selector (fuzzy search)
- Top 10 cities bar chart (by volume or exceptions)
- Click city → filters entire dashboard (KPIs, pipeline, orders)

**Implementation:**
```typescript
export function GeographicInsights() {
  const [selectedCity, setSelectedCity] = useState<City | null>(null);
  const topCities = useTopCities({ metric: 'volume', limit: 10 });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* City Selector */}
      <CityTypeahead
        onSelect={(city) => {
          setSelectedCity(city);
          // Update all dashboard filters
          applyGlobalFilter({ city_id: city.id });
        }}
      />

      {/* Top Cities Bar Chart */}
      <TopCitiesChart
        cities={topCities}
        onClick={(city) => applyGlobalFilter({ city_id: city.id })}
      />
    </div>
  );
}
```

**Mock Data:**
```typescript
// /client/src/lib/mockData/enhanced/geoMetrics.ts
export const mockCityMetrics = [
  { city_id: 'mum', name: 'Mumbai', state: 'MH', orders: 145, exceptions: 8 },
  { city_id: 'del', name: 'Delhi', state: 'DL', orders: 132, exceptions: 12 },
  // ... top 10 cities
];
```

**Acceptance:**
- [ ] City selector filters dashboard in < 1s
- [ ] Top cities chart clickable
- [ ] Mobile: City selector uses bottom sheet
- [ ] Analytics event `city.selected` fires

---

**Phase 2 Gate Criteria:**

1. **Metrics:**
   - [ ] Time to find "stuck shipments in City X" reduced by ≥40%
   - [ ] Pipeline stage click rate > 20%
   - [ ] City filter usage > 10% of sessions

2. **Quality:**
   - [ ] Pipeline proportions accurate (±2%)
   - [ ] City filter doesn't break other components
   - [ ] Mobile UX maintained

**Rollback:**
- If pipeline confuses users (A/B test shows worse metrics) → revert to card grid
- If city filter causes perf issues → disable and optimize

---

### Phase 3: Carrier Intelligence (5 days)

**Objective:** Provide instant carrier comparison and one-click optimization.

**Scope:**

#### 3.1: Carrier Performance Comparison

**File:** `/client/src/components/seller/dashboard/CarrierComparison.tsx`

**Design:**
- Horizontal bar chart: delivery time, cost, success rate per carrier
- Actionable insights: "Switch 18 orders to Delhivery → Save ₹2,400/week"
- One-click apply (with confirmation)

**Implementation:**
```typescript
export function CarrierComparison({ carriers }: { carriers: CarrierMetric[] }) {
  return (
    <div className="space-y-4">
      {carriers.map(carrier => (
        <div key={carrier.id} className="flex items-center gap-4">
          <div className="flex-1">
            <div className="font-bold">{carrier.name}</div>
            <div className="flex items-center gap-4">
              <BarIndicator label="Speed" value={carrier.avgDeliveryDays} max={5} />
              <BarIndicator label="Cost" value={carrier.avgCost} max={100} />
              <BarIndicator label="Success" value={carrier.successRate} max={100} />
            </div>
          </div>
          {carrier.suggestion && (
            <Button onClick={() => applyCarrierSwitch(carrier.suggestion)}>
              Save {carrier.suggestion.savings}
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
```

**Acceptance:**
- [ ] Carrier metrics match aggregates (±3%)
- [ ] One-click apply has undo (10s window)
- [ ] Confirmation modal shows impact clearly
- [ ] Analytics event `carrier.switch.confirmed` fires

---

**Phase 3 Gate Criteria:**

1. **Metrics:**
   - [ ] Carrier switch acceptance rate > 30%
   - [ ] Undo rate < 5% (low = good UX)
   - [ ] Cost savings realized (instrumented)

2. **Quality:**
   - [ ] No financial errors (strict QA)
   - [ ] Idempotency working (no duplicate switches)

**Rollback:**
- If undo rate > 10% → pause feature and investigate confusion
- If errors > 1% → disable one-click, require manual approval

---

## Quality Checklist (Every Phase)

Before marking phase complete:

### Functionality
- [ ] All user tasks completable
- [ ] No broken workflows
- [ ] Error states handled
- [ ] Loading states smooth
- [ ] Empty states helpful

### UX Quality
- [ ] Information hierarchy clear (Tier 1 > Tier 2 > Tier 3)
- [ ] Mobile-first tested (360px, 768px, 1024px)
- [ ] Touch targets ≥ 44px
- [ ] Progressive disclosure used

### Technical Quality
- [ ] TypeScript type-safe (no `any`)
- [ ] Accessible (WCAG 2.1 AA, Lighthouse ≥ 90)
- [ ] Theme colors from global.css
- [ ] Dark mode supported
- [ ] Performance: page load < 2s, no layout shift

### Instrumentation
- [ ] Analytics events firing
- [ ] Baseline metrics captured
- [ ] Post-phase metrics show improvement

### Indian Market Fit
- [ ] Price/savings prominent
- [ ] COD visibility maintained
- [ ] Indian number format (₹1,23,456)
- [ ] Mobile optimized (360px+)

---

## Rollback & Safety Policy

### Feature Flags

Every major change behind flag:
```typescript
// /client/src/lib/featureFlags.ts
export const FEATURES = {
  KPI_SPARKLINES: true,
  DOMINANT_TREND_CHART: true,
  SHIPMENT_PIPELINE: false, // Phase 2
  CITY_SELECTOR: false,
  CARRIER_INTELLIGENCE: false // Phase 3
};
```

### Rollback Triggers

Automatically rollback if:
- Critical metric regression > 10% vs baseline
- Error rate > 2%
- Page load time > 3s (p95)
- Undo rate > 10% (indicates confusion)

### Undo Window

All one-click actions have 10-second undo:
```typescript
const undoTimeout = setTimeout(() => commitAction(), 10000);
// Show toast: "Action applied. Undo?"
```

---

## Instrumentation Schema

```typescript
// /client/src/lib/analytics/events.ts

export const track = (event: string, properties: Record<string, any>) => {
  if (import.meta.env.DEV) {
    console.log('[Analytics]', event, properties);
  }
  // Send to analytics backend
};

// Events
export const EVENTS = {
  DASHBOARD_VIEWED: 'dashboard.viewed',
  KPI_CLICKED: 'kpi.clicked',
  TREND_CLICKED: 'trend.clicked',
  PIPELINE_STAGE_CLICKED: 'pipeline.stage.clicked',
  CITY_SELECTED: 'city.selected',
  INSIGHT_ACTIONED: 'insight.actioned',
  CARRIER_SWITCH_CONFIRMED: 'carrier.switch.confirmed',
  UNDO_ACTION: 'undo.action'
};

// Example usage
track(EVENTS.KPI_CLICKED, {
  kpi_name: 'revenue',
  delta: 12.3,
  trend: 'up',
  viewport_width: 1920
});
```

---

## API Contracts (Backend Reference)

Every endpoint must return:
```typescript
interface APIResponse<T> {
  data: T;
  last_updated_at: string; // ISO 8601
  freshness: 'real_time' | 'cached_60s' | 'stale_5m' | 'stale_15m';
}

// Example: KPIs
GET /api/v1/kpis?range=7d&city_id=mum
Response:
{
  data: {
    revenue: { value: 52340, sparkline: [...], delta: 12.3 },
    orders: { value: 42, sparkline: [...], delta: -3.2 },
    profit: { value: 8124, sparkline: [...], delta: 8.5 }
  },
  last_updated_at: "2026-01-21T10:00:00Z",
  freshness: "cached_60s"
}

// Example: Pipeline
GET /api/v1/pipeline?date=2026-01-21
Response:
{
  data: {
    stages: [
      { name: 'pending', count: 12, percentage: 5.3, health: 'warning' },
      // ...
    ]
  },
  last_updated_at: "2026-01-21T10:05:00Z",
  freshness: "real_time"
}

// Example: Cities
GET /api/v1/cities?metric=volume&limit=10
Response:
{
  data: [
    { city_id: 'mum', name: 'Mumbai', state: 'MH', orders: 145, exceptions: 8 },
    // ...
  ],
  last_updated_at: "2026-01-21T09:00:00Z",
  freshness: "stale_5m"
}
```

---

## Next Steps

1. **Finish Phase 0 (1-2 days):**
   - [ ] Create Decision Map
   - [ ] Set up analytics events
   - [ ] Create enhanced mock data
   - [ ] Build mobile patterns

2. **Implement Phase 1 (5 days):**
   - [ ] Add KPI sparklines
   - [ ] Create dominant trend chart
   - [ ] Restructure hierarchy
   - [ ] Measure improvement

3. **Gate Review:**
   - [ ] Verify acceptance criteria met
   - [ ] Review metrics vs baseline
   - [ ] Decision: proceed to Phase 2 or iterate

4. **Implement Phase 2 (7 days):**
   - [ ] Build shipment pipeline
   - [ ] Add geographic insights
   - [ ] Measure improvement

5. **Implement Phase 3 (5 days):**
   - [ ] Build carrier comparison
   - [ ] Add one-click optimization
   - [ ] Measure improvement

---

## Success Criteria (Final)

After all phases complete:

### User Experience
- [ ] Time to answer "Is revenue up?" < 3 seconds (vs baseline)
- [ ] Time to find "stuck shipments in City X" < 10 seconds
- [ ] Mobile usability score ≥ 8/10

### Business Impact
- [ ] KPI interaction rate > 30%
- [ ] Pipeline usage > 40%
- [ ] City filter usage > 20%
- [ ] Carrier optimization acceptance > 30%

### Technical Quality
- [ ] Page load < 2s (p95)
- [ ] Zero TypeScript errors
- [ ] Lighthouse accessibility ≥ 90
- [ ] Mobile tested on 360px, 768px, 1024px

### Competitive
- [ ] Better than ShipRocket (user testing confirms)
- [ ] Better than DTDC dashboard
- [ ] Clear visual differentiation

---

**End of Plan. Ready for Phase 1 implementation.**
