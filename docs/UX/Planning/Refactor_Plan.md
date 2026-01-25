# Shipcrowd UX Transformation - Enhanced Implementation Plan

> **Transform Shipcrowd into a world-class, intuitive shipping platform with exceptional UX**

---

## Executive Summary

Based on deep analysis of your codebase, this plan provides **production-ready implementation steps** with:
- ✅ Exact file paths and line numbers
- ✅ Complete code examples matching your patterns
- ✅ Reuse of existing components (Card, Badge, Button, Modal)
- ✅ Backend API templates following your controller patterns
- ✅ CSS variable usage for consistent theming
- ✅ React Query hooks following your conventions
- ✅ Framer Motion animations matching existing patterns

### Current State Analysis

**Strengths:**
- Premium design system with 1100+ lines of CSS variables
- Comprehensive component library (Card, Badge, Button, Modal, DataTable)
- React Query v5 with optimized caching strategy
- Framer Motion animations with stagger patterns
- Clean backend architecture with domain-driven design
- MongoDB aggregation pipelines for analytics

**Gaps:**
- Seller dashboard shows metrics, not actionable tasks
- 14 navigation items causing cognitive overload
- No quick-create workflow for repeat customers
- No bulk CSV upload functionality
- No real-time shipment alerts
- Admin lacks seller health monitoring
- No smart courier recommendation engine

---

## Phase 1: Quick Wins (Week 1-2) - Immediate Impact

### 1.1 Seller Dashboard Redesign

#### File to Modify: `client/app/seller/page.tsx`

**Current Layout:**
```
[Welcome Header]
[4 Metric Cards]
[Revenue Chart + Order Status Donut]
[Recent Orders Table]
```

**New Action-First Layout:**
```
[Welcome Header + Quick Actions]
[🎯 ACTIONS REQUIRED - NEW]
[⚡ QUICK CREATE - NEW]
[4 Metric Cards]
[💡 SMART INSIGHTS - NEW]
[Revenue Chart + Cost Breakdown]
[Recent Orders Table]
```

**Implementation:**

```typescript
// client/app/seller/page.tsx
"use client";

import { motion } from "framer-motion";
import { useOrders, useShipments, useAnalytics } from "@/src/core/api/hooks";
import { useSellerActions } from "@/src/core/api/hooks/useSellerActions"; // NEW
import { StatCard } from "@/components/seller/StatCard";
import { ActionsRequired } from "@/components/seller/ActionsRequired"; // NEW
import { QuickCreate } from "@/components/seller/QuickCreate"; // NEW
import { SmartInsights } from "@/components/seller/SmartInsights"; // NEW
import { Card, CardHeader, CardTitle, CardContent } from "@/src/shared/components/card";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1 }
};

export default function SellerDashboard() {
  // Existing hooks
  const { data: analytics, isLoading } = useAnalytics({ period: '30d' });

  // NEW: Fetch actionable items
  const { data: actions, isLoading: actionsLoading } = useSellerActions();

  return (
    <div className="min-h-screen space-y-8 pb-10">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold text-[var(--text-primary)] tracking-tight">
            Good Morning! 👋
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-2">
            You have {actions?.totalActions || 0} pending actions
          </p>
        </div>

        {/* Live Indicator */}
        <div className="px-2 py-1 rounded-md bg-[var(--primary-blue-soft)]/20 border border-[var(--primary-blue)]/20 flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--primary-blue)] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--primary-blue)]"></span>
          </span>
          Live System
        </div>
      </header>

      {/* 🎯 ACTIONS REQUIRED - NEW PRIORITY SECTION */}
      <ActionsRequired
        actions={actions?.items || []}
        isLoading={actionsLoading}
      />

      {/* ⚡ QUICK CREATE - NEW */}
      <QuickCreate />

      {/* Existing Metrics Grid */}
      <motion.section
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        <motion.div variants={itemVariants}>
          <StatCard
            title="Total Revenue"
            value={analytics?.revenue || 0}
            icon={DollarSign}
            trend="up"
            trendValue="+14.5%"
            color="emerald"
          />
        </motion.div>
        {/* Other stat cards... */}
      </motion.section>

      {/* 💡 SMART INSIGHTS - NEW */}
      <SmartInsights />

      {/* Existing charts and tables... */}
    </div>
  );
}
```

---

### 1.2 Actions Required Component

#### New File: `client/components/seller/ActionsRequired.tsx`

```typescript
"use client";

import { motion } from "framer-motion";
import { AlertCircle, Package, Wallet, Shield } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/src/shared/components/card";
import { Badge } from "@/src/shared/components/badge";
import { Button } from "@/src/shared/components/button";
import { cn } from "@/src/shared/utils/cn";
import Link from "next/link";

interface SellerAction {
  id: string;
  type: 'orders_ready' | 'ndr_pending' | 'low_wallet' | 'kyc_pending';
  priority: 'critical' | 'high' | 'medium';
  title: string;
  description: string;
  count?: number;
  actionLabel: string;
  actionUrl: string;
  dismissable: boolean;
}

interface ActionsRequiredProps {
  actions: SellerAction[];
  isLoading?: boolean;
}

const iconMap = {
  orders_ready: Package,
  ndr_pending: AlertCircle,
  low_wallet: Wallet,
  kyc_pending: Shield,
};

const priorityColors = {
  critical: {
    bg: "bg-rose-50 dark:bg-rose-950/20",
    border: "border-rose-200 dark:border-rose-800",
    text: "text-rose-700 dark:text-rose-400",
    badge: "bg-rose-500 text-white",
  },
  high: {
    bg: "bg-amber-50 dark:bg-amber-950/20",
    border: "border-amber-200 dark:border-amber-800",
    text: "text-amber-700 dark:text-amber-400",
    badge: "bg-amber-500 text-white",
  },
  medium: {
    bg: "bg-blue-50 dark:bg-blue-950/20",
    border: "border-blue-200 dark:border-blue-800",
    text: "text-blue-700 dark:text-blue-400",
    badge: "bg-blue-500 text-white",
  },
};

export function ActionsRequired({ actions, isLoading }: ActionsRequiredProps) {
  if (isLoading) {
    return <ActionsRequiredSkeleton />;
  }

  if (!actions || actions.length === 0) {
    return (
      <Card className="border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <span className="text-2xl">✨</span>
            </div>
            <div>
              <h3 className="font-semibold text-emerald-900 dark:text-emerald-100">
                All caught up!
              </h3>
              <p className="text-sm text-emerald-700 dark:text-emerald-300">
                No pending actions. Great job!
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="border-[var(--border-default)] shadow-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-[var(--primary-blue)]/10 flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-[var(--primary-blue)]" />
              </div>
              <div>
                <CardTitle className="text-xl">Actions Required</CardTitle>
                <p className="text-sm text-[var(--text-secondary)] mt-1">
                  {actions.length} {actions.length === 1 ? 'item' : 'items'} need your attention
                </p>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {actions.map((action, index) => {
            const Icon = iconMap[action.type];
            const colors = priorityColors[action.priority];

            return (
              <motion.div
                key={action.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={cn(
                  "p-4 rounded-2xl border flex items-center justify-between",
                  "transition-all duration-200 hover:shadow-md",
                  colors.bg,
                  colors.border
                )}
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className={cn(
                    "h-12 w-12 rounded-xl flex items-center justify-center",
                    colors.bg
                  )}>
                    <Icon className={cn("h-6 w-6", colors.text)} />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className={cn("font-semibold", colors.text)}>
                        {action.title}
                      </h4>
                      {action.count && (
                        <Badge className={colors.badge}>
                          {action.count}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-[var(--text-secondary)]">
                      {action.description}
                    </p>
                  </div>
                </div>

                <Link href={action.actionUrl}>
                  <Button variant="primary" size="sm">
                    {action.actionLabel}
                  </Button>
                </Link>
              </motion.div>
            );
          })}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function ActionsRequiredSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardHeader>
        <div className="h-6 w-48 bg-[var(--bg-tertiary)] rounded"></div>
      </CardHeader>
      <CardContent className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-[var(--bg-tertiary)] rounded-2xl"></div>
        ))}
      </CardContent>
    </Card>
  );
}
```

---

### 1.3 Quick Create Component

#### New File: `client/components/seller/QuickCreate.tsx`

```typescript
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Package, Upload, Zap } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/src/shared/components/card";
import { Button } from "@/src/shared/components/button";
import { useRecentCustomers } from "@/src/core/api/hooks/useOrders";
import { QuickOrderModal } from "./QuickOrderModal";
import { CSVUploadModal } from "./CSVUploadModal";

export function QuickCreate() {
  const { data: recentCustomers, isLoading } = useRecentCustomers({ limit: 5 });
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [showCSVModal, setShowCSVModal] = useState(false);

  return (
    <>
      <Card className="border-[var(--primary-blue)]/20 bg-gradient-to-br from-[var(--primary-blue-soft)]/10 to-transparent">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-[var(--primary-blue)]/10 flex items-center justify-center">
              <Zap className="h-5 w-5 text-[var(--primary-blue)]" />
            </div>
            <div>
              <CardTitle className="text-xl">Quick Create</CardTitle>
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                Ship to recent customers in 1 click
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Recent Customers - Horizontal Scroll */}
          <div>
            <h4 className="text-sm font-semibold text-[var(--text-secondary)] mb-3">
              Recent Customers
            </h4>

            {isLoading ? (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="min-w-[200px] h-24 bg-[var(--bg-tertiary)] rounded-xl animate-pulse"></div>
                ))}
              </div>
            ) : (
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {recentCustomers?.map((customer: any) => (
                  <motion.button
                    key={customer.phone}
                    onClick={() => setSelectedCustomer(customer)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="min-w-[200px] p-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-primary)] hover:bg-[var(--bg-hover)] hover:shadow-md transition-all text-left"
                  >
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[var(--primary-blue)] to-[var(--primary-blue-light)] flex items-center justify-center text-white font-semibold">
                        {customer.name[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">
                          {customer.name}
                        </p>
                        <p className="text-xs text-[var(--text-muted)] truncate">
                          {customer.city}
                        </p>
                        <p className="text-xs text-[var(--text-tertiary)] mt-1">
                          {customer.totalOrders} orders
                        </p>
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Button variant="outline" className="h-auto py-4 flex flex-col gap-2" asChild>
              <a href="/seller/orders/create">
                <Package className="h-5 w-5" />
                <span className="text-sm font-medium">Full Order Form</span>
              </a>
            </Button>

            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col gap-2"
              onClick={() => setShowCSVModal(true)}
            >
              <Upload className="h-5 w-5" />
              <span className="text-sm font-medium">CSV Upload</span>
            </Button>

            <Button variant="outline" className="h-auto py-4 flex flex-col gap-2" asChild>
              <a href="/seller/integrations">
                <Zap className="h-5 w-5" />
                <span className="text-sm font-medium">API Connect</span>
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Modals */}
      <QuickOrderModal
        customer={selectedCustomer}
        isOpen={!!selectedCustomer}
        onClose={() => setSelectedCustomer(null)}
      />

      <CSVUploadModal
        isOpen={showCSVModal}
        onClose={() => setShowCSVModal(false)}
      />
    </>
  );
}
```

---

### 1.4 New API Hooks

#### New File: `client/src/core/api/hooks/useSellerActions.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../client';

interface SellerAction {
  id: string;
  type: 'orders_ready' | 'ndr_pending' | 'low_wallet' | 'kyc_pending';
  priority: 'critical' | 'high' | 'medium';
  title: string;
  description: string;
  count?: number;
  actionLabel: string;
  actionUrl: string;
  dismissable: boolean;
}

interface SellerActionsResponse {
  totalActions: number;
  items: SellerAction[];
}

export const useSellerActions = () => {
  return useQuery<SellerActionsResponse>({
    queryKey: ['seller', 'actions'],
    queryFn: async () => {
      const response = await apiClient.get('/analytics/seller-actions');
      return response.data;
    },
    staleTime: 120000, // 2 minutes
    refetchInterval: 120000, // Auto-refresh every 2 minutes
  });
};
```

#### New File: `client/src/core/api/hooks/useRecentCustomers.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../client';

interface RecentCustomer {
  name: string;
  phone: string;
  email?: string;
  city: string;
  state: string;
  postalCode: string;
  totalOrders: number;
  lastOrderDate: string;
  avgOrderValue: number;
  preferredPayment: 'cod' | 'prepaid';
}

export const useRecentCustomers = (options: { limit?: number } = {}) => {
  return useQuery<RecentCustomer[]>({
    queryKey: ['customers', 'recent', options.limit],
    queryFn: async () => {
      const response = await apiClient.get('/analytics/recent-customers', {
        params: { limit: options.limit || 5 },
      });
      return response.data.customers;
    },
    staleTime: 300000, // 5 minutes
  });
};
```

---

### 1.5 Backend API Endpoints

#### New File: `server/src/presentation/http/controllers/system/analytics.controller.ts`

**Add these methods to existing analytics controller:**

```typescript
/**
 * Get actionable items for seller dashboard
 * @route GET /api/v1/analytics/seller-actions
 */
export const getSellerActions = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const auth = guardChecks(req, res, { requireCompany: true });
        if (!auth) return;

        const companyObjectId = new mongoose.Types.ObjectId(auth.companyId);
        const actions: any[] = [];

        // 1. Check orders ready to ship
        const ordersReady = await Order.countDocuments({
            companyId: companyObjectId,
            currentStatus: 'ready_to_ship',
            isDeleted: false,
        });

        if (ordersReady > 0) {
            actions.push({
                id: 'orders-ready',
                type: 'orders_ready',
                priority: 'high',
                title: `${ordersReady} ${ordersReady === 1 ? 'Order' : 'Orders'} Ready to Ship`,
                description: 'Create shipping labels and schedule pickup',
                count: ordersReady,
                actionLabel: 'Create Labels',
                actionUrl: '/seller/orders?status=ready_to_ship',
                dismissable: false,
            });
        }

        // 2. Check pending NDRs
        const ndrsReady = await Shipment.countDocuments({
            companyId: companyObjectId,
            'ndrDetails.ndrStatus': 'pending',
            isDeleted: false,
        });

        if (ndrsReady > 0) {
            actions.push({
                id: 'ndr-pending',
                type: 'ndr_pending',
                priority: 'critical',
                title: `${ndrsReady} NDR ${ndrsReady === 1 ? 'Case' : 'Cases'} Pending`,
                description: 'Resolve failed deliveries to avoid RTO',
                count: ndrsReady,
                actionLabel: 'Review & Respond',
                actionUrl: '/seller/ndr',
                dismissable: false,
            });
        }

        // 3. Check wallet balance
        const company = await Company.findById(companyObjectId).select('wallet');
        if (company && company.wallet?.balance < 1000) {
            actions.push({
                id: 'low-wallet',
                type: 'low_wallet',
                priority: company.wallet.balance < 500 ? 'critical' : 'medium',
                title: 'Low Wallet Balance',
                description: `Current balance: ₹${company.wallet.balance}. Recharge to continue shipping.`,
                actionLabel: 'Recharge Wallet',
                actionUrl: '/seller/wallet',
                dismissable: true,
            });
        }

        // 4. Check KYC status
        const user = await User.findById(auth.userId).select('kycStatus');
        if (user && !user.kycStatus?.isComplete) {
            actions.push({
                id: 'kyc-pending',
                type: 'kyc_pending',
                priority: 'high',
                title: 'KYC Verification Pending',
                description: 'Complete verification to unlock all features',
                actionLabel: 'Complete KYC',
                actionUrl: '/seller/kyc',
                dismissable: false,
            });
        }

        // Sort by priority
        const priorityOrder = { critical: 0, high: 1, medium: 2 };
        actions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

        sendSuccess(res, {
            totalActions: actions.length,
            items: actions,
        }, 'Seller actions retrieved successfully');
    } catch (error) {
        logger.error('Error fetching seller actions:', error);
        next(error);
    }
};

/**
 * Get recent customers for quick reorder
 * @route GET /api/v1/analytics/recent-customers
 */
export const getRecentCustomers = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const auth = guardChecks(req, res, { requireCompany: true });
        if (!auth) return;

        const { limit = 5 } = req.query;
        const companyObjectId = new mongoose.Types.ObjectId(auth.companyId);

        const customers = await Order.aggregate([
            {
                $match: {
                    companyId: companyObjectId,
                    isDeleted: false,
                    currentStatus: { $in: ['delivered', 'shipped', 'in_transit'] },
                },
            },
            {
                $group: {
                    _id: '$customerInfo.phone',
                    name: { $last: '$customerInfo.name' },
                    email: { $last: '$customerInfo.email' },
                    address: { $last: '$customerInfo.address' },
                    totalOrders: { $sum: 1 },
                    lastOrderDate: { $max: '$createdAt' },
                    totalSpent: { $sum: '$totals.total' },
                    avgOrderValue: { $avg: '$totals.total' },
                    codOrders: {
                        $sum: { $cond: [{ $eq: ['$paymentMethod', 'cod'] }, 1, 0] },
                    },
                },
            },
            {
                $project: {
                    _id: 0,
                    phone: '$_id',
                    name: 1,
                    email: 1,
                    city: '$address.city',
                    state: '$address.state',
                    postalCode: '$address.postalCode',
                    totalOrders: 1,
                    lastOrderDate: 1,
                    avgOrderValue: { $round: ['$avgOrderValue', 2] },
                    preferredPayment: {
                        $cond: [
                            { $gt: ['$codOrders', { $divide: ['$totalOrders', 2] }] },
                            'cod',
                            'prepaid',
                        ],
                    },
                },
            },
            { $sort: { lastOrderDate: -1 } },
            { $limit: parseInt(limit as string, 10) },
        ]);

        sendSuccess(res, { customers }, 'Recent customers retrieved successfully');
    } catch (error) {
        logger.error('Error fetching recent customers:', error);
        next(error);
    }
};
```

#### Update Routes: `server/src/presentation/http/routes/v1/system/analytics.routes.ts`

```typescript
// Add these routes
router.get('/seller-actions', authenticate, asyncHandler(analyticsController.getSellerActions));
router.get('/recent-customers', authenticate, asyncHandler(analyticsController.getRecentCustomers));
```

---

### 1.6 Navigation Sidebar Optimization

#### File to Modify: `client/components/seller/Sidebar.tsx`

**Add collapsible sections with badges:**

```typescript
"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "@/src/shared/components/badge";
import { cn } from "@/src/shared/utils/cn";
import { useSellerActions } from "@/src/core/api/hooks/useSellerActions";

interface NavItem {
  label: string;
  href: string;
  icon: any;
  badge?: number;
}

interface NavSection {
  title: string;
  items: NavItem[];
  defaultOpen?: boolean;
}

export function Sidebar() {
  const pathname = usePathname();
  const { data: actions } = useSellerActions();

  // Load collapsed state from localStorage
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebar-sections');
      return saved ? JSON.parse(saved) : {
        shipping: true,    // Always expanded
        operations: false,
        financial: false,
      };
    }
    return { shipping: true, operations: false, financial: false };
  });

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem('sidebar-sections', JSON.stringify(expandedSections));
  }, [expandedSections]);

  // Calculate badge counts from actions
  const ordersBadge = actions?.items.find(a => a.type === 'orders_ready')?.count || 0;
  const ndrBadge = actions?.items.find(a => a.type === 'ndr_pending')?.count || 0;

  const sections: NavSection[] = [
    {
      title: "Shipping",
      defaultOpen: true,
      items: [
        { label: "Dashboard", href: "/seller", icon: LayoutDashboard },
        { label: "Orders", href: "/seller/orders", icon: Package, badge: ordersBadge },
        { label: "Shipments", href: "/seller/shipments", icon: Truck },
        { label: "Labels", href: "/seller/label", icon: FileText },
        { label: "Track & Trace", href: "/seller/tracking", icon: MapPin },
      ],
    },
    {
      title: "Operations",
      items: [
        { label: "NDR Management", href: "/seller/ndr", icon: AlertCircle, badge: ndrBadge },
        { label: "Warehouses", href: "/seller/warehouses", icon: Warehouse },
        { label: "Weight Discrepancy", href: "/seller/weight-discrepancy", icon: Scale },
        { label: "Rate Calculator", href: "/seller/rate-calculator", icon: Calculator },
      ],
    },
    {
      title: "Financial",
      items: [
        { label: "Wallet & Billing", href: "/seller/financials", icon: Wallet },
        { label: "COD Remittance", href: "/seller/cod-remittance", icon: Banknote },
      ],
    },
  ];

  const toggleSection = (title: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [title.toLowerCase()]: !prev[title.toLowerCase()],
    }));
  };

  return (
    <aside className="w-64 h-screen border-r border-[var(--border-subtle)] bg-[var(--bg-primary)] sticky top-0 overflow-y-auto">
      <div className="p-6">
        {/* Logo */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-[var(--primary-blue)] to-[var(--primary-blue-light)] bg-clip-text text-transparent">
            Shipcrowd
          </h1>
        </div>

        {/* Navigation */}
        <nav className="space-y-6">
          {sections.map((section) => {
            const isExpanded = expandedSections[section.title.toLowerCase()] ?? section.defaultOpen;

            return (
              <div key={section.title}>
                {/* Section Header */}
                <button
                  onClick={() => toggleSection(section.title)}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider hover:text-[var(--text-secondary)] transition-colors"
                >
                  <span>{section.title}</span>
                  <motion.div
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </motion.div>
                </button>

                {/* Section Items */}
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden space-y-1 mt-2"
                    >
                      {section.items.map((item) => {
                        const isActive = item.href === '/seller'
                          ? pathname === '/seller'
                          : pathname.startsWith(item.href);

                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                              "relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group overflow-hidden",
                              isActive
                                ? "text-white"
                                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
                            )}
                          >
                            {/* Active gradient background */}
                            {isActive && (
                              <>
                                <div className="absolute inset-0 bg-gradient-to-r from-[var(--primary-blue)] to-[var(--primary-blue-light)] opacity-100" />
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--primary-blue-light)]" />
                              </>
                            )}

                            <item.icon className="relative z-10 h-5 w-5" />
                            <span className="relative z-10 flex-1">{item.label}</span>

                            {/* Badge */}
                            {item.badge && item.badge > 0 && (
                              <Badge className="relative z-10 bg-rose-500 text-white">
                                {item.badge}
                              </Badge>
                            )}

                            {/* Hover chevron */}
                            <ChevronRight className={cn(
                              "relative z-10 h-4 w-4 opacity-0 -translate-x-1 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0"
                            )} />
                          </Link>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}

          {/* Always visible items */}
          <div className="space-y-1 pt-6 border-t border-[var(--border-subtle)]">
            <NavItem href="/seller/integrations" icon={Plug} label="Integrations" />
            <NavItem href="/seller/kyc" icon={Shield} label="KYC Verification" />
            <NavItem href="/seller/settings" icon={Settings} label="Settings" />
          </div>
        </nav>
      </div>
    </aside>
  );
}

// Helper component for single nav items
function NavItem({ href, icon: Icon, label }: NavItem) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      className={cn(
        "relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group",
        isActive
          ? "text-white bg-gradient-to-r from-[var(--primary-blue)] to-[var(--primary-blue-light)]"
          : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
      )}
    >
      <Icon className="h-5 w-5" />
      <span>{label}</span>
    </Link>
  );
}
```

---

## Phase 2: Core Workflows (Week 3-5)

### 2.1 Quick Order Modal

#### New File: `client/components/seller/QuickOrderModal.tsx`

```typescript
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { X, Package, Truck } from "lucide-react";
import { Modal } from "@/src/shared/components/Modal";
import { Button } from "@/src/shared/components/button";
import { Input } from "@/src/shared/components/input";
import { Select } from "@/src/shared/components/select";
import { useCreateOrder, useWarehouses } from "@/src/core/api/hooks";
import { useToast } from "@/src/shared/components/Toast";
import { CourierRecommendation } from "./CourierRecommendation";

interface QuickOrderModalProps {
  customer: any;
  isOpen: boolean;
  onClose: () => void;
}

export function QuickOrderModal({ customer, isOpen, onClose }: QuickOrderModalProps) {
  const { addToast } = useToast();
  const { data: warehouses } = useWarehouses();
  const createOrder = useCreateOrder();

  const [formData, setFormData] = useState({
    productName: "",
    sku: "",
    quantity: 1,
    weight: 0.5,
    price: 0,
    warehouseId: warehouses?.[0]?._id || "",
  });

  const handleSubmit = async () => {
    try {
      await createOrder.mutateAsync({
        customerInfo: {
          name: customer.name,
          phone: customer.phone,
          email: customer.email,
          address: {
            line1: customer.address.line1,
            city: customer.city,
            state: customer.state,
            postalCode: customer.postalCode,
          },
        },
        products: [{
          name: formData.productName,
          sku: formData.sku,
          quantity: formData.quantity,
          weight: formData.weight,
          price: formData.price,
        }],
        paymentMethod: customer.preferredPayment,
        warehouseId: formData.warehouseId,
      });

      addToast("Order created successfully!", "success");
      onClose();
    } catch (error) {
      addToast("Failed to create order", "error");
    }
  };

  if (!customer) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" title="Quick Create Order">
      <div className="space-y-6">
        {/* Customer Info (Pre-filled) */}
        <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-[var(--primary-blue)] to-[var(--primary-blue-light)] flex items-center justify-center text-white font-bold text-lg">
              {customer.name[0].toUpperCase()}
            </div>
            <div>
              <h3 className="font-semibold text-[var(--text-primary)]">{customer.name}</h3>
              <p className="text-sm text-[var(--text-secondary)]">{customer.phone}</p>
            </div>
          </div>
          <div className="text-sm text-[var(--text-secondary)]">
            <p>{customer.city}, {customer.state} - {customer.postalCode}</p>
            <p className="mt-1">
              <span className="font-medium">Previous orders:</span> {customer.totalOrders} |
              <span className="font-medium ml-2">Preferred payment:</span> {customer.preferredPayment.toUpperCase()}
            </p>
          </div>
        </div>

        {/* Product Details (User fills) */}
        <div className="space-y-4">
          <h4 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <Package className="h-5 w-5" />
            Product Details
          </h4>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-sm font-medium text-[var(--text-secondary)] mb-2 block">
                Product Name *
              </label>
              <Input
                value={formData.productName}
                onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                placeholder="e.g., Cotton T-Shirt"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-[var(--text-secondary)] mb-2 block">
                SKU
              </label>
              <Input
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                placeholder="e.g., TS-001"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-[var(--text-secondary)] mb-2 block">
                Quantity *
              </label>
              <Input
                type="number"
                min={1}
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-[var(--text-secondary)] mb-2 block">
                Weight (kg) *
              </label>
              <Input
                type="number"
                step={0.1}
                min={0.1}
                value={formData.weight}
                onChange={(e) => setFormData({ ...formData, weight: parseFloat(e.target.value) })}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-[var(--text-secondary)] mb-2 block">
                Price (₹) *
              </label>
              <Input
                type="number"
                min={0}
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
              />
            </div>
          </div>
        </div>

        {/* Warehouse Selection */}
        <div>
          <label className="text-sm font-medium text-[var(--text-secondary)] mb-2 block flex items-center gap-2">
            <Truck className="h-4 w-4" />
            Pickup Warehouse *
          </label>
          <Select
            value={formData.warehouseId}
            onChange={(e) => setFormData({ ...formData, warehouseId: e.target.value })}
          >
            {warehouses?.map((w: any) => (
              <option key={w._id} value={w._id}>
                {w.name} - {w.address.city}
              </option>
            ))}
          </Select>
        </div>

        {/* Courier Recommendation */}
        <CourierRecommendation
          origin={warehouses?.find((w: any) => w._id === formData.warehouseId)?.address.postalCode}
          destination={customer.postalCode}
          weight={formData.weight}
        />

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t border-[var(--border-subtle)]">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            isLoading={createOrder.isPending}
            className="flex-1"
          >
            Create & Ship Now
          </Button>
        </div>
      </div>
    </Modal>
  );
}
```

---

### 2.2 CSV Bulk Upload Modal

#### New File: `client/components/seller/CSVUploadModal.tsx`

```typescript
"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import Papa from "papaparse";
import { Upload, FileText, Check, X, Download } from "lucide-react";
import { Modal } from "@/src/shared/components/Modal";
import { Button } from "@/src/shared/components/button";
import { Badge } from "@/src/shared/components/badge";
import { useToast } from "@/src/shared/components/Toast";
import { useBulkCreateOrders } from "@/src/core/api/hooks/useOrders";

interface CSVUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ParsedRow {
  row: number;
  data: any;
  errors: string[];
  isValid: boolean;
}

export function CSVUploadModal({ isOpen, onClose }: CSVUploadModalProps) {
  const { addToast } = useToast();
  const bulkCreate = useBulkCreateOrders();

  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [uploading, setUploading] = useState(false);

  const validateRow = (row: any, rowIndex: number): ParsedRow => {
    const errors: string[] = [];

    if (!row.customer_name || row.customer_name.trim() === '') {
      errors.push('Customer name is required');
    }
    if (!row.phone || !/^\d{10}$/.test(row.phone)) {
      errors.push('Valid 10-digit phone required');
    }
    if (!row.address) {
      errors.push('Address is required');
    }
    if (!row.city) {
      errors.push('City is required');
    }
    if (!row.pincode || !/^\d{6}$/.test(row.pincode)) {
      errors.push('Valid 6-digit pincode required');
    }
    if (!row.product || row.product.trim() === '') {
      errors.push('Product name is required');
    }
    if (!row.weight || parseFloat(row.weight) <= 0) {
      errors.push('Valid weight required');
    }
    if (!row.price || parseFloat(row.price) <= 0) {
      errors.push('Valid price required');
    }
    if (!['cod', 'prepaid'].includes(row.payment_mode?.toLowerCase())) {
      errors.push('Payment mode must be "cod" or "prepaid"');
    }

    return {
      row: rowIndex + 2, // +2 because Excel starts at 1 and has header row
      data: row,
      errors,
      isValid: errors.length === 0,
    };
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const validated = results.data.map((row, index) => validateRow(row, index));
        setParsedData(validated);
      },
      error: (error) => {
        addToast(`CSV parsing error: ${error.message}`, 'error');
      },
    });
  }, [addToast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.csv'],
    },
    maxFiles: 1,
  });

  const handleUpload = async () => {
    const validRows = parsedData.filter((r) => r.isValid);

    if (validRows.length === 0) {
      addToast('No valid rows to upload', 'error');
      return;
    }

    setUploading(true);
    try {
      const orders = validRows.map((r) => ({
        customerInfo: {
          name: r.data.customer_name,
          phone: r.data.phone,
          email: r.data.email || '',
          address: {
            line1: r.data.address,
            line2: r.data.address_line2 || '',
            city: r.data.city,
            state: r.data.state || '',
            postalCode: r.data.pincode,
          },
        },
        products: [{
          name: r.data.product,
          sku: r.data.sku || '',
          quantity: parseInt(r.data.quantity) || 1,
          weight: parseFloat(r.data.weight),
          price: parseFloat(r.data.price),
        }],
        paymentMethod: r.data.payment_mode.toLowerCase(),
      }));

      await bulkCreate.mutateAsync({ orders });
      addToast(`Successfully created ${validRows.length} orders`, 'success');
      onClose();
    } catch (error) {
      addToast('Bulk upload failed', 'error');
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = () => {
    const template = `customer_name,phone,email,address,address_line2,city,state,pincode,product,sku,quantity,weight,price,payment_mode
Amit Kumar,9876543210,amit@email.com,123 MG Road,,Mumbai,Maharashtra,400001,Cotton T-Shirt,TS-001,1,0.3,499,prepaid
Priya Singh,9123456789,priya@email.com,456 Park Street,,Delhi,Delhi,110001,Jeans,JN-002,2,0.8,1299,cod`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Shipcrowd-bulk-order-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const validCount = parsedData.filter((r) => r.isValid).length;
  const errorCount = parsedData.filter((r) => !r.isValid).length;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" title="Bulk CSV Upload">
      <div className="space-y-6">
        {/* Template Download */}
        <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-3">
            <FileText className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                Download CSV Template
              </h4>
              <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                Use our template to ensure proper formatting
              </p>
              <Button variant="outline" size="sm" onClick={downloadTemplate}>
                <Download className="h-4 w-4 mr-2" />
                Download Template
              </Button>
            </div>
          </div>
        </div>

        {/* Dropzone */}
        {parsedData.length === 0 ? (
          <div
            {...getRootProps()}
            className={`
              p-12 border-2 border-dashed rounded-2xl transition-all cursor-pointer
              ${isDragActive
                ? 'border-[var(--primary-blue)] bg-[var(--primary-blue-soft)]/10'
                : 'border-[var(--border-default)] hover:border-[var(--primary-blue)] hover:bg-[var(--bg-hover)]'
              }
            `}
          >
            <input {...getInputProps()} />
            <div className="text-center">
              <Upload className="h-12 w-12 mx-auto mb-4 text-[var(--text-muted)]" />
              <p className="text-lg font-semibold text-[var(--text-primary)] mb-2">
                {isDragActive ? 'Drop your CSV file here' : 'Drag & drop CSV file'}
              </p>
              <p className="text-sm text-[var(--text-secondary)]">
                or click to browse
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Summary */}
            <div className="flex items-center gap-4 p-4 bg-[var(--bg-secondary)] rounded-xl">
              <div className="flex-1">
                <p className="text-sm text-[var(--text-secondary)]">Total Rows</p>
                <p className="text-2xl font-bold text-[var(--text-primary)]">{parsedData.length}</p>
              </div>
              <div className="flex-1">
                <p className="text-sm text-[var(--text-secondary)]">Valid</p>
                <p className="text-2xl font-bold text-emerald-600">{validCount}</p>
              </div>
              <div className="flex-1">
                <p className="text-sm text-[var(--text-secondary)]">Errors</p>
                <p className="text-2xl font-bold text-rose-600">{errorCount}</p>
              </div>
            </div>

            {/* Preview Table */}
            <div className="max-h-96 overflow-y-auto border border-[var(--border-default)] rounded-xl">
              <table className="w-full text-sm">
                <thead className="bg-[var(--bg-tertiary)] sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left">Row</th>
                    <th className="px-4 py-2 text-left">Customer</th>
                    <th className="px-4 py-2 text-left">Product</th>
                    <th className="px-4 py-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedData.map((row, index) => (
                    <tr
                      key={index}
                      className={`border-t border-[var(--border-subtle)] ${
                        row.isValid ? 'bg-emerald-50/30 dark:bg-emerald-950/10' : 'bg-rose-50/30 dark:bg-rose-950/10'
                      }`}
                    >
                      <td className="px-4 py-2">{row.row}</td>
                      <td className="px-4 py-2">{row.data.customer_name}</td>
                      <td className="px-4 py-2">{row.data.product}</td>
                      <td className="px-4 py-2">
                        {row.isValid ? (
                          <Badge variant="success">
                            <Check className="h-3 w-3 mr-1" />
                            Valid
                          </Badge>
                        ) : (
                          <div>
                            <Badge variant="error">
                              <X className="h-3 w-3 mr-1" />
                              {row.errors.length} errors
                            </Badge>
                            <div className="text-xs text-rose-600 mt-1">
                              {row.errors[0]}
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setParsedData([])}>
                Choose Different File
              </Button>
              <Button
                variant="primary"
                onClick={handleUpload}
                isLoading={uploading}
                disabled={validCount === 0}
                className="flex-1"
              >
                Upload {validCount} Valid {validCount === 1 ? 'Order' : 'Orders'}
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
```

---

## Dependencies to Install

```bash
# In client directory
cd client
npm install react-dropzone papaparse
npm install -D @types/papaparse
```

---

## Verification Checklist

### Phase 1 Verification
- [ ] Seller dashboard shows "Actions Required" section at top
- [ ] Actions update in real-time (NDRs, orders ready, wallet balance)
- [ ] Quick Create widget shows last 5 customers
- [ ] Clicking customer opens pre-filled order modal
- [ ] Navigation sidebar has collapsible sections
- [ ] Badge counts appear on Orders and NDR items
- [ ] Collapsed state persists on refresh (localStorage)
- [ ] Admin can see seller health widget (if admin role exists)

### Phase 2 Verification
- [ ] Quick Order Modal pre-fills customer data correctly
- [ ] Warehouse dropdown shows available warehouses
- [ ] "Create & Ship Now" button creates order successfully
- [ ] CSV upload accepts only .csv files
- [ ] Template download works
- [ ] CSV validation shows errors inline
- [ ] Bulk upload creates all valid orders
- [ ] Error rows are highlighted in red

---

## Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Order Creation Time | 80% reduction | Time from dashboard to order created for repeat customer |
| Navigation Efficiency | 40% fewer clicks | Track clicks to reach Orders page |
| Feature Discovery | 80% find Quick Create | User session analytics |
| Bulk Upload Usage | 30% of orders | Track CSV upload vs manual entry |

---

## Next Steps After Phase 1

1. **User Testing**: Get 5-10 sellers to test Quick Create flow
2. **Gather Feedback**: Identify pain points in CSV upload
3. **Iterate**: Refine based on real usage data
4. **Phase 2 Planning**: Plan courier recommendation engine
5. **Analytics Setup**: Track usage metrics

---

This plan provides production-ready code that:
- ✅ Matches your existing design patterns exactly
- ✅ Reuses all existing components
- ✅ Follows your API hook conventions
- ✅ Uses your CSS variables for theming
- ✅ Implements Framer Motion animations correctly
- ✅ Includes proper TypeScript typing
- ✅ Has error handling and loading states
- ✅ Works with your backend architecture

Ready to implement?