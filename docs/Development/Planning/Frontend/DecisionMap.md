# ShipCrowd Dashboard: Decision Map

**Purpose:** Canonical visual hierarchy rules that ALL dashboard PRs must reference and follow.

**Version:** 1.0
**Last Updated:** 2026-01-21

---

## Above-the-Fold Wireframes

### Desktop (1440px+)

```
┌─────────────────────────────────────────────────────────────────────┐
│ Header: ShipCrowd | Dashboard | Last synced: 10:00 AM              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│ ⚠️ TIER 1: URGENT ACTIONS (if exist)                                │
│ ┌──────────────────────────────────────────────────────────────┐   │
│ │ 🚨 3 pickups pending | ₹850 wallet low | 2 failed shipments  │   │
│ │ [Schedule Pickup] [Recharge] [Review Failures]               │   │
│ └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│ 📊 TIER 1: PERFORMANCE BAR (With Sparklines)                        │
│ ┌───────────┬───────────┬───────────┬──────────────┐              │
│ │ Revenue   │ Profit    │ Orders    │ Wallet       │              │
│ │ ₹52,340   │ ₹8,124    │ 42        │ ₹4,230       │              │
│ │ ↑ 12% vs  │ ↑ 8% vs   │ ↓ 3% vs   │ Low balance  │              │
│ │ last week │ last week │ last week │ [Recharge]   │              │
│ │ ▁▃▅▇█▅▇  │ ▂▃▄▅▆▅█  │ █▆▅▃▂▃▂  │              │              │
│ └───────────┴───────────┴───────────┴──────────────┘              │
│                                                                      │
│ 📈 TIER 1: DOMINANT ORDER TREND (30 Days)                           │
│ ┌──────────────────────────────────────────────────────────────┐   │
│ │ Order Volume Trend (Last 30 Days)                            │   │
│ │                                          ╱╲                  │   │
│ │                                ╱╲      ╱  ╲                 │   │
│ │                 ╱╲          ╱  ╲    ╱    ╲                │   │
│ │           ╱╲  ╱  ╲  ╱╲  ╱    ╲╱      ╲              │   │
│ │     ╱╲  ╱  ╲╱    ╲╱  ╲╱                ╲              │   │
│ │ ────┴──┴───────────────────────────────────────────────     │   │
│ │ Jan 1    Jan 8    Jan 15   Jan 22   Jan 30                  │   │
│ └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
├─ SCROLL LINE (Above fold ends here) ─────────────────────────────────┤
│                                                                      │
│ 🚢 TIER 2: SHIPMENT PIPELINE                                        │
│ ┌──────────────────────────────────────────────────────────────┐   │
│ │ Pending→Picked→Transit→OFD→Delivered→RTO                     │   │
│ │   12     5      42     8     156     3                       │   │
│ │ [███] [█] [████████] [██] [████████] [█]                     │   │
│ └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│ 🌍 TIER 2: GEOGRAPHIC INSIGHTS                                      │
│ ┌────────────────────┬──────────────────────────────────────────┐  │
│ │ 🔍 Select City     │ Top 10 Cities (by volume)                │  │
│ │ [Mumbai ▾]         │ ██████████ Mumbai (145)                  │  │
│ │                    │ ████████ Delhi (132)                     │  │
│ │                    │ ██████ Bangalore (98)                    │  │
│ └────────────────────┴──────────────────────────────────────────┘  │
│                                                                      │
│ 💡 TIER 3: SMART INSIGHTS                                           │
│ ┌──────────────────────────────────────────────────────────────┐   │
│ │ Save ₹2,400/week: Switch Zone B to Delhivery [Apply]        │   │
│ │ RTO Risk: 8.2% (↑40%) - Enable IVR [Enable]                 │   │
│ └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│ 💰 TIER 3: COD & QUICK ACTIONS                                      │
│ (Cards remain as-is for now)                                        │
│                                                                      │
│ ▼ TIER 4: DETAILED ANALYTICS (Collapsed on mobile, expanded desktop)│
│ ┌──────────────────────────────────────────────────────────────┐   │
│ │ Carrier Comparison | Zone Distribution | etc.                │   │
│ └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### Mobile (360px)

```
┌──────────────────────┐
│ ShipCrowd            │
│ Last synced: 10:00   │
├──────────────────────┤
│                      │
│ ⚠️ URGENT (if exist) │
│ ┌──────────────────┐ │
│ │ 🚨 3 pending     │ │
│ │ [Schedule]       │ │
│ └──────────────────┘ │
│                      │
│ 📊 PERFORMANCE       │
│ ┌────────┬─────────┐ │
│ │Revenue │ Profit  │ │
│ │₹52.3K  │ ₹8.1K   │ │
│ │↑12%    │ ↑8%     │ │
│ │▁▃▅▇█▅▇│ ▂▃▄▅▆▅█ │ │
│ └────────┴─────────┘ │
│ ┌────────┬─────────┐ │
│ │Orders  │ Wallet  │ │
│ │42      │ ₹4.2K   │ │
│ │↓3%     │ Low!    │ │
│ │█▆▅▃▂▃▂│[Recharge]│ │
│ └────────┴─────────┘ │
│                      │
│ 📈 ORDER TREND       │
│ ┌──────────────────┐ │
│ │ Last 30 Days     │ │
│ │      ╱╲          │ │
│ │    ╱  ╲   ╱╲    │ │
│ │  ╱    ╲ ╱  ╲   │ │
│ │╱      ╲╱    ╲  │ │
│ │              ╲  │ │
│ └──────────────────┘ │
│                      │
│ ─ SCROLL ────────────│
│                      │
│ 🚢 PIPELINE          │
│ (Vertical stepper)   │
│                      │
│ 💡 INSIGHTS          │
│ 🌍 GEO (Phase 2)     │
│ 💰 COD               │
│ ⚡ ACTIONS           │
│                      │
│ ▼ ANALYTICS          │
│ (Collapsed)          │
└──────────────────────┘
```

---

## Visual Hierarchy Rules (Non-Negotiable)

### Tier 1: Decision-Critical (Above Fold)

**What:** Information that answers "What needs my attention NOW?" and "Is my business healthy?"

**Components:**
1. UrgentActionsBar (if alerts exist)
2. PerformanceBar (with sparklines)
3. OrderTrendChart (30 days, always visible)

**Visual Treatment:**
- **Size:** 1.5× larger than Tier 2
- **Position:** Top of page, no scroll required
- **Weight:** Bold headings, prominent numbers
- **Color:** Use accent colors for alerts, primary for KPIs
- **Animation:** Subtle entrance (stagger by 100ms)

**Enforcement:**
```typescript
// Example: PerformanceBar must be visually dominant
className="rounded-3xl p-8 shadow-md" // Larger padding than Tier 2/3
fontSize="text-4xl font-bold" // KPI values must be 4xl
```

---

### Tier 2: Operational Clarity (First Scroll)

**What:** Visual representations that answer "Where are bottlenecks?" and "Which cities need attention?"

**Components:**
1. ShipmentPipeline (Phase 2 — replaces OrderStatusGrid)
2. GeographicInsights (Phase 2)

**Visual Treatment:**
- **Size:** Standard (1× baseline)
- **Position:** After Tier 1, visible with 1 scroll
- **Weight:** Medium headings
- **Color:** Contextual (health-based for pipeline)
- **Interaction:** Clickable for filters

**Enforcement:**
```typescript
className="rounded-2xl p-6 shadow-sm" // Smaller than Tier 1
```

---

### Tier 3: Context & Actions

**What:** Insights and secondary actions that answer "How can I improve?" and "What should I do next?"

**Components:**
1. SmartInsightsPanel
2. CODStatusCard
3. QuickActionsGrid

**Visual Treatment:**
- **Size:** Compact (0.85× baseline)
- **Position:** After operational clarity
- **Weight:** Regular headings
- **Color:** Subtle backgrounds
- **Layout:** Grid or cards

**Enforcement:**
```typescript
className="rounded-xl p-4 shadow-xs" // Compact, subtle
fontSize="text-sm" // Smaller text
```

---

### Tier 4: Deep Dive (Expandable)

**What:** Detailed analytics that answer "What are the patterns?"

**Components:**
1. DetailedAnalytics (courier comparison, zone distribution)

**Visual Treatment:**
- **Size:** Expandable section
- **Position:** Bottom of page
- **Behavior:** Collapsed on mobile, expanded on desktop
- **Interaction:** Click to expand

**Enforcement:**
```typescript
<Collapsible defaultExpanded={!isMobile}>
  <DetailedAnalytics />
</Collapsible>
```

---

## Component Size Reference

| Tier | Padding | Font Size (Value) | Shadow | Border Radius |
|------|---------|-------------------|--------|---------------|
| 1    | p-8     | text-4xl          | shadow-md | rounded-3xl |
| 2    | p-6     | text-2xl          | shadow-sm | rounded-2xl |
| 3    | p-4     | text-xl           | shadow-xs | rounded-xl  |
| 4    | p-4     | text-base         | shadow-xs | rounded-lg  |

---

## Color & State Guidelines

### KPI Trends
- **Up (positive):** `text-[var(--success)]`
- **Down (negative):** `text-[var(--error)]`
- **Neutral:** `text-[var(--text-secondary)]`

### Pipeline Health
- **Healthy:** `bg-[var(--success-bg)]` with green accent
- **Warning:** `bg-[var(--warning-bg)]` with amber accent
- **Critical:** `bg-[var(--error-bg)]` with red accent

### Data Freshness
- **Real-time:** Green dot + "Live"
- **Cached (< 5min):** Gray dot + timestamp
- **Stale (> 10min):** Amber badge + "Data may be outdated"

---

## Mobile-First Contracts

### Breakpoints
```typescript
mobile: 360px - 767px
tablet: 768px - 1023px
desktop: 1024px+
```

### Layout Rules

**Mobile (360px):**
- Single column
- Swipeable KPI cards (horizontal scroll)
- Bottom sheets for filters (not modals)
- FAB for primary action
- Pipeline as vertical stepper

**Tablet (768px):**
- 2-column grid for KPIs
- Pipeline horizontal (6 stages)
- Bottom sheet or inline filters

**Desktop (1024px+):**
- 4-column grid for KPIs
- Pipeline horizontal
- Inline filters
- Expanded analytics by default

---

## Sparkline Implementation (Lightweight)

**Required:** Every KPI must include a 7-day sparkline.

**Implementation:**
```typescript
// Lightweight SVG (no chart library)
const Sparkline = ({ data }: { data: number[] }) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = 100 - ((value - min) / range) * 100;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg
      width="80"
      height="24"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="opacity-70"
    >
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
};
```

**Usage:**
```typescript
<div className="flex items-center gap-2">
  <div className="text-4xl font-bold">₹52,340</div>
  <Sparkline data={last7Days} />
  <div className="text-sm text-[var(--success)]">↑ 12%</div>
</div>
```

---

## Data Freshness Display

**Required:** Every data-driven component must show `last_updated_at`.

**Implementation:**
```typescript
const FreshnessIndicator = ({
  lastUpdated,
  freshness
}: {
  lastUpdated: string;
  freshness: 'real_time' | 'cached_60s' | 'stale_5m' | 'stale_15m';
}) => {
  const isStale = freshness.includes('stale');

  return (
    <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
      <span className={`h-2 w-2 rounded-full ${
        freshness === 'real_time' ? 'bg-[var(--success)] animate-pulse' :
        isStale ? 'bg-[var(--warning)]' : 'bg-[var(--text-muted)]'
      }`} />
      <span>
        {freshness === 'real_time' ? 'Live' : `Updated ${formatRelativeTime(lastUpdated)}`}
      </span>
    </div>
  );
};
```

---

## PR Checklist (Mandatory)

Before submitting any dashboard PR, verify:

- [ ] Component follows Tier 1/2/3/4 visual hierarchy
- [ ] Size, padding, shadow match tier specification
- [ ] Mobile layout tested at 360px width
- [ ] Touch targets ≥ 44px on mobile
- [ ] Sparklines use lightweight SVG (no heavy chart libs)
- [ ] Data freshness indicator present
- [ ] Colors use CSS variables (no hardcoded hex)
- [ ] Dark mode tested and working
- [ ] Analytics event instrumented
- [ ] TypeScript types defined (no `any`)
- [ ] Accessibility: keyboard navigation + screen reader labels

---

## Examples (Pass/Fail)

### ❌ FAIL: Equal Visual Weight
```tsx
<div className="grid grid-cols-4 gap-4">
  <Card className="p-4"> {/* All same size */}
    <div className="text-xl">Revenue</div>
    <div>₹52,340</div>
  </Card>
  <Card className="p-4"> {/* No hierarchy */}
    <div className="text-xl">Orders</div>
    <div>42</div>
  </Card>
  {/* ... */}
</div>
```
**Problem:** No visual hierarchy. All cards look identical.

---

### ✅ PASS: Clear Hierarchy
```tsx
{/* TIER 1: Larger, more prominent */}
<div className="rounded-3xl p-8 shadow-md bg-[var(--bg-primary)] border">
  <div className="text-sm text-[var(--text-secondary)]">Revenue</div>
  <div className="flex items-center gap-3">
    <div className="text-4xl font-bold">₹52,340</div>
    <Sparkline data={last7Days} />
    <div className="text-sm text-[var(--success)]">↑ 12%</div>
  </div>
  <FreshnessIndicator lastUpdated={timestamp} freshness="cached_60s" />
</div>

{/* TIER 3: Smaller, less prominent */}
<div className="rounded-xl p-4 shadow-xs">
  <div className="text-xs">Quick Actions</div>
  {/* ... */}
</div>
```
**Why it passes:** Clear size difference, sparkline present, freshness shown.

---

## Enforcement

This Decision Map is **mandatory**. All PRs affecting dashboard components MUST:

1. Reference this document in PR description
2. Explain which tier the component belongs to
3. Show mobile screenshots (360px)
4. Confirm hierarchy rules followed

**Reviewers:** Reject any PR that violates these rules.

---

**End of Decision Map. Last Updated: 2026-01-21**
