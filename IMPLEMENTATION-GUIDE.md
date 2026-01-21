# Step-by-Step Implementation Guide
## Integrating 5 Features with Real APIs + Mock Data Fallback

**Date:** January 21, 2026
**Goal:** Complete end-to-end integration of 5 features with real backend APIs while maintaining mock data fallback

---

## 📋 Overview

This guide will walk you through integrating each of the 5 features with real backend APIs while keeping existing mock data as a fallback using the `USE_MOCK_DATA` environment variable.

### Features to Implement
1. 📊 Dashboard Analytics
2. 💰 Wallet & Transactions
3. 📦 Order Management
4. 📈 Pipeline Visualization
5. 🔍 Search & Filtering

---

## 🛠️ Prerequisites

### 1. Environment Setup

Create or update your `.env` file in the frontend root:

```bash
# Frontend .env file
REACT_APP_API_BASE_URL=http://localhost:5005/api/v1
REACT_APP_USE_MOCK_DATA=false  # Set to 'true' for mock data, 'false' for real API
```

### 2. Create API Configuration File

**File:** `src/config/api.config.ts`

```typescript
// API Configuration
export const API_CONFIG = {
  baseURL: process.env.REACT_APP_API_BASE_URL || 'http://localhost:5005/api/v1',
  useMockData: process.env.REACT_APP_USE_MOCK_DATA === 'true',
  timeout: 10000, // 10 seconds
};

// Request configuration with credentials
export const apiRequestConfig: RequestInit = {
  credentials: 'include', // IMPORTANT: Include cookies for authentication
  headers: {
    'Content-Type': 'application/json',
  },
};

console.log('🔧 API Config:', {
  baseURL: API_CONFIG.baseURL,
  useMockData: API_CONFIG.useMockData,
  mode: API_CONFIG.useMockData ? '🎭 MOCK MODE' : '🚀 LIVE API MODE',
});
```

### 3. Create API Utility Helper

**File:** `src/utils/api.utils.ts`

```typescript
import { API_CONFIG, apiRequestConfig } from '../config/api.config';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Fetch data from API with automatic fallback to mock data
 */
export async function fetchFromAPI<T>(
  endpoint: string,
  mockData: T,
  options?: RequestInit
): Promise<T> {
  // If mock mode is enabled, return mock data immediately
  if (API_CONFIG.useMockData) {
    console.log(`🎭 Using mock data for: ${endpoint}`);
    // Simulate network delay for realistic testing
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockData;
  }

  try {
    console.log(`🚀 Fetching from API: ${endpoint}`);

    const url = `${API_CONFIG.baseURL}${endpoint}`;
    const response = await fetch(url, {
      ...apiRequestConfig,
      ...options,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result: ApiResponse<T> = await response.json();

    if (!result.success) {
      throw new Error(result.message || 'API request failed');
    }

    console.log(`✅ API success: ${endpoint}`);
    return result.data;

  } catch (error) {
    console.error(`❌ API Error for ${endpoint}:`, error);

    // Fallback to mock data on error
    console.log(`⚠️ Falling back to mock data for: ${endpoint}`);
    return mockData;
  }
}

/**
 * Build query string from params object
 */
export function buildQueryString(params: Record<string, any>): string {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.append(key, String(value));
    }
  });

  const queryString = query.toString();
  return queryString ? `?${queryString}` : '';
}
```

---

## 🎯 FEATURE 1: Dashboard Analytics

### Step 1: Create API Service

**File:** `src/services/analytics.service.ts`

```typescript
import { fetchFromAPI, buildQueryString } from '../utils/api.utils';

// Mock data (keep your existing mock data)
const mockDashboardData = {
  totalOrders: 22,
  totalRevenue: 1902291,
  activeShipments: 15,
  pendingActions: 3,
  // ... rest of your existing mock data
};

const mockOrderTrendsData = {
  totalOrders: 22,
  statusBreakdown: {
    pending: 2,
    confirmed: 3,
    shipped: 8,
    delivered: 7,
    cancelled: 1,
    rto: 1,
  },
  // ... rest of mock data
};

const mockShipmentPerformanceData = {
  totalShipments: 18,
  onTimeDelivery: 85,
  averageDeliveryTime: 4.2,
  // ... rest of mock data
};

const mockSellerActionsData = {
  urgentItems: [
    { type: 'ndr', count: 2, priority: 'high' },
    { type: 'dispute', count: 1, priority: 'medium' },
  ],
  // ... rest of mock data
};

// API Service
export const AnalyticsService = {
  /**
   * Get seller dashboard overview
   */
  async getDashboardOverview() {
    return fetchFromAPI('/analytics/dashboard/seller', mockDashboardData);
  },

  /**
   * Get order trends
   */
  async getOrderTrends(days: number = 30) {
    const endpoint = `/analytics/orders${buildQueryString({ days })}`;
    return fetchFromAPI(endpoint, mockOrderTrendsData);
  },

  /**
   * Get shipment performance
   */
  async getShipmentPerformance(days: number = 30) {
    const endpoint = `/analytics/shipments${buildQueryString({ days })}`;
    return fetchFromAPI(endpoint, mockShipmentPerformanceData);
  },

  /**
   * Get seller action items
   */
  async getSellerActions() {
    return fetchFromAPI('/analytics/seller-actions', mockSellerActionsData);
  },
};
```

### Step 2: Update Dashboard Component

**File:** `src/pages/Dashboard/Dashboard.tsx` (or similar)

```typescript
import React, { useEffect, useState } from 'react';
import { AnalyticsService } from '../../services/analytics.service';

interface DashboardData {
  totalOrders: number;
  totalRevenue: number;
  activeShipments: number;
  pendingActions: number;
  // ... other fields
}

export const Dashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await AnalyticsService.getDashboardOverview();
      setDashboardData(data);
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading dashboard...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="dashboard">
      <h1>Dashboard Analytics</h1>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total Orders</h3>
          <p>{dashboardData?.totalOrders || 0}</p>
        </div>

        <div className="stat-card">
          <h3>Total Revenue</h3>
          <p>₹{dashboardData?.totalRevenue?.toLocaleString('en-IN') || 0}</p>
        </div>

        <div className="stat-card">
          <h3>Active Shipments</h3>
          <p>{dashboardData?.activeShipments || 0}</p>
        </div>

        <div className="stat-card">
          <h3>Pending Actions</h3>
          <p>{dashboardData?.pendingActions || 0}</p>
        </div>
      </div>

      {/* Rest of your dashboard UI */}
    </div>
  );
};
```

### Step 3: Test Dashboard

```bash
# Test with real API
REACT_APP_USE_MOCK_DATA=false npm start

# Test with mock data
REACT_APP_USE_MOCK_DATA=true npm start
```

---

## 💰 FEATURE 2: Wallet & Transactions

### Step 1: Create Wallet Service

**File:** `src/services/wallet.service.ts`

```typescript
import { fetchFromAPI, buildQueryString } from '../utils/api.utils';

// Mock data
const mockWalletBalance = {
  balance: 2992923,
  currency: 'INR',
  lastUpdated: new Date().toISOString(),
};

const mockTransactions = {
  transactions: [
    {
      _id: '1',
      type: 'credit',
      amount: 15000,
      description: 'COD Remittance',
      date: new Date().toISOString(),
      balance: 2992923,
    },
    // ... more mock transactions
  ],
  pagination: {
    page: 1,
    limit: 10,
    total: 140,
    totalPages: 14,
  },
};

export const WalletService = {
  /**
   * Get wallet balance
   */
  async getBalance() {
    return fetchFromAPI('/finance/wallet/balance', mockWalletBalance);
  },

  /**
   * Get transaction history
   */
  async getTransactions(params: {
    page?: number;
    limit?: number;
    type?: 'credit' | 'debit';
  } = {}) {
    const endpoint = `/finance/wallet/transactions${buildQueryString({
      page: params.page || 1,
      limit: params.limit || 10,
      ...(params.type && { type: params.type }),
    })}`;

    return fetchFromAPI(endpoint, mockTransactions);
  },
};
```

### Step 2: Create Wallet Component

**File:** `src/pages/Wallet/Wallet.tsx`

```typescript
import React, { useEffect, useState } from 'react';
import { WalletService } from '../../services/wallet.service';

interface WalletBalance {
  balance: number;
  currency: string;
  lastUpdated: string;
}

interface Transaction {
  _id: string;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  date: string;
  balance: number;
}

export const Wallet: React.FC = () => {
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadWalletData();
  }, [page]);

  const loadWalletData = async () => {
    try {
      setLoading(true);

      // Load balance and transactions in parallel
      const [balanceData, transactionsData] = await Promise.all([
        WalletService.getBalance(),
        WalletService.getTransactions({ page, limit: 10 }),
      ]);

      setBalance(balanceData);
      setTransactions(transactionsData.transactions);
      setTotalPages(transactionsData.pagination?.totalPages || 1);
    } catch (error) {
      console.error('Wallet error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="wallet">
      <h1>Wallet & Transactions</h1>

      {/* Balance Card */}
      <div className="balance-card">
        <h2>Current Balance</h2>
        <p className="balance-amount">
          ₹{balance?.balance.toLocaleString('en-IN') || 0}
        </p>
        <small>Last updated: {new Date(balance?.lastUpdated || '').toLocaleString()}</small>
      </div>

      {/* Transactions Table */}
      <div className="transactions">
        <h2>Transaction History</h2>

        {loading ? (
          <p>Loading transactions...</p>
        ) : (
          <>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Description</th>
                  <th>Amount</th>
                  <th>Balance</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((txn) => (
                  <tr key={txn._id}>
                    <td>{new Date(txn.date).toLocaleDateString()}</td>
                    <td className={txn.type}>{txn.type}</td>
                    <td>{txn.description}</td>
                    <td className={txn.type}>
                      {txn.type === 'credit' ? '+' : '-'}₹{txn.amount.toLocaleString('en-IN')}
                    </td>
                    <td>₹{txn.balance.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="pagination">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </button>
              <span>Page {page} of {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
```

---

## 📦 FEATURE 3: Order Management

### Step 1: Create Orders Service

**File:** `src/services/orders.service.ts`

```typescript
import { fetchFromAPI, buildQueryString } from '../utils/api.utils';

// Mock data
const mockOrders = {
  orders: [
    {
      _id: '1',
      orderNumber: 'ORD-2026-001',
      customerName: 'John Doe',
      customerPhone: '+91-9876543210',
      status: 'delivered',
      paymentMethod: 'cod',
      amount: 2500,
      createdAt: new Date().toISOString(),
    },
    // ... more mock orders
  ],
  pagination: {
    page: 1,
    limit: 10,
    total: 150,
    totalPages: 15,
  },
};

interface OrderFilters {
  page?: number;
  limit?: number;
  status?: string;
  paymentMethod?: 'cod' | 'prepaid';
  search?: string;
  phone?: string;
}

export const OrdersService = {
  /**
   * Get orders list with filters
   */
  async getOrders(filters: OrderFilters = {}) {
    const endpoint = `/orders${buildQueryString({
      page: filters.page || 1,
      limit: filters.limit || 10,
      ...(filters.status && { status: filters.status }),
      ...(filters.paymentMethod && { paymentMethod: filters.paymentMethod }),
      ...(filters.search && { search: filters.search }),
      ...(filters.phone && { phone: filters.phone }),
    })}`;

    return fetchFromAPI(endpoint, mockOrders);
  },

  /**
   * Get order by ID
   */
  async getOrderById(orderId: string) {
    return fetchFromAPI(`/orders/${orderId}`, mockOrders.orders[0]);
  },
};
```

### Step 2: Create Orders Component

**File:** `src/pages/Orders/Orders.tsx`

```typescript
import React, { useEffect, useState } from 'react';
import { OrdersService } from '../../services/orders.service';

interface Order {
  _id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  status: string;
  paymentMethod: string;
  amount: number;
  createdAt: string;
}

export const Orders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadOrders();
  }, [page, statusFilter, paymentFilter, searchQuery]);

  const loadOrders = async () => {
    try {
      setLoading(true);

      const data = await OrdersService.getOrders({
        page,
        limit: 10,
        status: statusFilter || undefined,
        paymentMethod: paymentFilter || undefined,
        search: searchQuery || undefined,
      });

      setOrders(data.orders);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (error) {
      console.error('Orders error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1); // Reset to first page on search
    loadOrders();
  };

  return (
    <div className="orders">
      <h1>Order Management</h1>

      {/* Filters */}
      <div className="filters">
        <form onSubmit={handleSearch}>
          <input
            type="text"
            placeholder="Search orders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button type="submit">Search</button>
        </form>

        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
          <option value="rto">RTO</option>
        </select>

        <select
          value={paymentFilter}
          onChange={(e) => { setPaymentFilter(e.target.value); setPage(1); }}
        >
          <option value="">All Payment Methods</option>
          <option value="cod">COD</option>
          <option value="prepaid">Prepaid</option>
        </select>
      </div>

      {/* Orders Table */}
      {loading ? (
        <p>Loading orders...</p>
      ) : (
        <>
          <table>
            <thead>
              <tr>
                <th>Order Number</th>
                <th>Customer</th>
                <th>Phone</th>
                <th>Status</th>
                <th>Payment</th>
                <th>Amount</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order._id}>
                  <td>{order.orderNumber}</td>
                  <td>{order.customerName}</td>
                  <td>{order.customerPhone}</td>
                  <td>
                    <span className={`status-badge ${order.status}`}>
                      {order.status}
                    </span>
                  </td>
                  <td>{order.paymentMethod.toUpperCase()}</td>
                  <td>₹{order.amount.toLocaleString('en-IN')}</td>
                  <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="pagination">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </button>
            <span>Page {page} of {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
};
```

---

## 📈 FEATURE 4: Pipeline Visualization

### Step 1: Update Analytics Service

Add to `src/services/analytics.service.ts`:

```typescript
// Add these methods to existing AnalyticsService

export const AnalyticsService = {
  // ... existing methods ...

  /**
   * Get order pipeline data
   */
  async getOrderPipeline(days: number = 30) {
    const endpoint = `/analytics/orders${buildQueryString({ days })}`;
    const mockPipelineData = {
      stages: [
        { name: 'Pending', count: 2, percentage: 9 },
        { name: 'Confirmed', count: 3, percentage: 14 },
        { name: 'Shipped', count: 8, percentage: 36 },
        { name: 'Delivered', count: 7, percentage: 32 },
        { name: 'Cancelled/RTO', count: 2, percentage: 9 },
      ],
    };
    return fetchFromAPI(endpoint, mockPipelineData);
  },

  /**
   * Get shipment pipeline data
   */
  async getShipmentPipeline(days: number = 30) {
    const endpoint = `/analytics/shipments${buildQueryString({ days })}`;
    const mockShipmentPipeline = {
      stages: [
        { name: 'Picked Up', count: 5, percentage: 28 },
        { name: 'In Transit', count: 6, percentage: 33 },
        { name: 'Out for Delivery', count: 4, percentage: 22 },
        { name: 'Delivered', count: 3, percentage: 17 },
      ],
    };
    return fetchFromAPI(endpoint, mockShipmentPipeline);
  },
};
```

### Step 2: Create Pipeline Component

**File:** `src/pages/Pipeline/Pipeline.tsx`

```typescript
import React, { useEffect, useState } from 'react';
import { AnalyticsService } from '../../services/analytics.service';

interface PipelineStage {
  name: string;
  count: number;
  percentage: number;
}

export const Pipeline: React.FC = () => {
  const [orderPipeline, setOrderPipeline] = useState<PipelineStage[]>([]);
  const [shipmentPipeline, setShipmentPipeline] = useState<PipelineStage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPipelineData();
  }, []);

  const loadPipelineData = async () => {
    try {
      setLoading(true);

      const [orderData, shipmentData] = await Promise.all([
        AnalyticsService.getOrderPipeline(30),
        AnalyticsService.getShipmentPipeline(30),
      ]);

      setOrderPipeline(orderData.stages);
      setShipmentPipeline(shipmentData.stages);
    } catch (error) {
      console.error('Pipeline error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading pipeline...</div>;
  }

  return (
    <div className="pipeline">
      <h1>Pipeline Visualization</h1>

      {/* Order Pipeline */}
      <section className="pipeline-section">
        <h2>Order Pipeline</h2>
        <div className="pipeline-stages">
          {orderPipeline.map((stage, index) => (
            <div key={index} className="pipeline-stage">
              <div className="stage-header">
                <h3>{stage.name}</h3>
                <span className="stage-count">{stage.count}</span>
              </div>
              <div className="stage-bar">
                <div
                  className="stage-fill"
                  style={{ width: `${stage.percentage}%` }}
                />
              </div>
              <p className="stage-percentage">{stage.percentage}%</p>
            </div>
          ))}
        </div>
      </section>

      {/* Shipment Pipeline */}
      <section className="pipeline-section">
        <h2>Shipment Pipeline</h2>
        <div className="pipeline-stages">
          {shipmentPipeline.map((stage, index) => (
            <div key={index} className="pipeline-stage">
              <div className="stage-header">
                <h3>{stage.name}</h3>
                <span className="stage-count">{stage.count}</span>
              </div>
              <div className="stage-bar">
                <div
                  className="stage-fill"
                  style={{ width: `${stage.percentage}%` }}
                />
              </div>
              <p className="stage-percentage">{stage.percentage}%</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
```

---

## 🔍 FEATURE 5: Search & Filtering

This is already covered in the Orders component above! The search and filtering functionality is built into the Order Management feature.

**Key Features:**
- ✅ Search by keyword (order number, customer name)
- ✅ Search by phone number
- ✅ Filter by status
- ✅ Filter by payment method
- ✅ Combine multiple filters

---

## 🧪 Testing Guide

### Test Checklist

For each feature, test both modes:

#### 1. Mock Data Mode
```bash
# Set environment variable
export REACT_APP_USE_MOCK_DATA=true
npm start
```

**Verify:**
- [ ] Console shows "🎭 MOCK MODE"
- [ ] Console logs "🎭 Using mock data for: ..."
- [ ] Data loads quickly (~300ms)
- [ ] Mock data appears correctly
- [ ] No API errors in console

#### 2. Live API Mode
```bash
# Set environment variable
export REACT_APP_USE_MOCK_DATA=false
npm start
```

**Verify:**
- [ ] Console shows "🚀 LIVE API MODE"
- [ ] Console logs "🚀 Fetching from API: ..."
- [ ] Login works (credentials: demo@Helix.test / Demo@123456)
- [ ] Real data loads from backend
- [ ] Cookies are sent automatically
- [ ] All features work end-to-end

#### 3. Error Fallback Testing
```bash
# Stop the backend server
# Keep REACT_APP_USE_MOCK_DATA=false
```

**Verify:**
- [ ] Console shows "❌ API Error"
- [ ] Console shows "⚠️ Falling back to mock data"
- [ ] Mock data displays as fallback
- [ ] No app crashes

---

## 🎨 Optional: Loading & Error States

### Create Loading Component

**File:** `src/components/LoadingSpinner/LoadingSpinner.tsx`

```typescript
import React from 'react';
import './LoadingSpinner.css';

export const LoadingSpinner: React.FC = () => (
  <div className="loading-spinner">
    <div className="spinner"></div>
    <p>Loading...</p>
  </div>
);
```

### Create Error Component

**File:** `src/components/ErrorMessage/ErrorMessage.tsx`

```typescript
import React from 'react';
import './ErrorMessage.css';

interface Props {
  message: string;
  onRetry?: () => void;
}

export const ErrorMessage: React.FC<Props> = ({ message, onRetry }) => (
  <div className="error-message">
    <h3>⚠️ Error</h3>
    <p>{message}</p>
    {onRetry && (
      <button onClick={onRetry}>Retry</button>
    )}
  </div>
);
```

---

## 📝 Summary Checklist

### Setup Phase
- [ ] Create `.env` file with `REACT_APP_USE_MOCK_DATA` and `REACT_APP_API_BASE_URL`
- [ ] Create `src/config/api.config.ts`
- [ ] Create `src/utils/api.utils.ts`

### Feature 1: Dashboard Analytics
- [ ] Create `src/services/analytics.service.ts`
- [ ] Update Dashboard component to use `AnalyticsService`
- [ ] Test with mock data
- [ ] Test with real API
- [ ] Test error fallback

### Feature 2: Wallet & Transactions
- [ ] Create `src/services/wallet.service.ts`
- [ ] Create/Update Wallet component
- [ ] Implement pagination
- [ ] Test with mock data
- [ ] Test with real API
- [ ] Test error fallback

### Feature 3: Order Management
- [ ] Create `src/services/orders.service.ts`
- [ ] Create/Update Orders component
- [ ] Implement filters (status, payment method)
- [ ] Implement search (keyword, phone)
- [ ] Implement pagination
- [ ] Test with mock data
- [ ] Test with real API
- [ ] Test error fallback

### Feature 4: Pipeline Visualization
- [ ] Add pipeline methods to `analytics.service.ts`
- [ ] Create Pipeline component
- [ ] Test with mock data
- [ ] Test with real API
- [ ] Test error fallback

### Feature 5: Search & Filtering
- [ ] Already included in Order Management
- [ ] Test keyword search
- [ ] Test phone search
- [ ] Test combined filters

### Final Testing
- [ ] All 5 features work in mock mode
- [ ] All 5 features work in live API mode
- [ ] Error fallback works when backend is down
- [ ] No console errors
- [ ] Authentication works seamlessly
- [ ] Pagination works across features
- [ ] Data refreshes correctly

---

## 🚀 Deployment Notes

### Production Build

```bash
# For production with real API
REACT_APP_USE_MOCK_DATA=false REACT_APP_API_BASE_URL=https://api.yourdomain.com/api/v1 npm run build

# For demo with mock data
REACT_APP_USE_MOCK_DATA=true npm run build
```

### Environment Variables for Different Environments

**.env.development**
```bash
REACT_APP_API_BASE_URL=http://localhost:5005/api/v1
REACT_APP_USE_MOCK_DATA=false
```

**.env.staging**
```bash
REACT_APP_API_BASE_URL=https://staging-api.yourdomain.com/api/v1
REACT_APP_USE_MOCK_DATA=false
```

**.env.production**
```bash
REACT_APP_API_BASE_URL=https://api.yourdomain.com/api/v1
REACT_APP_USE_MOCK_DATA=false
```

**.env.demo**
```bash
REACT_APP_API_BASE_URL=http://localhost:5005/api/v1
REACT_APP_USE_MOCK_DATA=true
```

---

## 🎯 Quick Start Commands

```bash
# Install dependencies
npm install

# Development with real API
npm run dev

# Development with mock data
REACT_APP_USE_MOCK_DATA=true npm run dev

# Build for production
npm run build

# Build for demo (with mock data)
REACT_APP_USE_MOCK_DATA=true npm run build
```

---

## 📞 Support & Debugging

### Common Issues

**Issue: "Invalid or expired token"**
- Solution: Clear browser cookies and login again
- Check: Make sure credentials are correct (demo@Helix.test / Demo@123456)

**Issue: CORS errors**
- Solution: Backend CORS is configured for localhost:3000
- Check: Make sure frontend is running on port 3000

**Issue: Mock data not showing**
- Solution: Check `.env` file has `REACT_APP_USE_MOCK_DATA=true`
- Check: Console should show "🎭 MOCK MODE"

**Issue: Real API not working**
- Solution: Make sure backend server is running on port 5005
- Check: Console should show "🚀 LIVE API MODE"
- Fallback: Data should automatically fall back to mock data on error

---

**Implementation Date:** January 21, 2026
**Status:** Ready for implementation ✅
**Estimated Time:** 2-3 hours for all 5 features
