/**
 * Enhanced Geographic Metrics Mock Data
 *
 * Realistic Indian city-level shipment data for geographic visualization.
 * Includes top cities, exceptions, and metadata for maps.
 */

export interface CityMetric {
  city_id: string;
  name: string;
  state: string;
  stateCode: string; // e.g., "MH" for Maharashtra
  orders: number;
  exceptions: number;
  exceptionRate: number; // Percentage
  avgDeliveryTime: number; // Days
  topCourier: string;
  centroid?: { lat: number; lng: number }; // For map visualization
  topPincodes: string[]; // Sample pincodes
}

export interface GeoMetricsData {
  topCities: CityMetric[];
  totalCities: number;
  lastUpdated: string;
  freshness: 'real_time' | 'cached_60s' | 'stale_5m';
}

// ============================================================================
// Indian Cities Data (Realistic)
// ============================================================================

const INDIAN_CITIES: CityMetric[] = [
  {
    city_id: 'mumbai',
    name: 'Mumbai',
    state: 'Maharashtra',
    stateCode: 'MH',
    orders: 145,
    exceptions: 8,
    exceptionRate: 5.5,
    avgDeliveryTime: 2.1,
    topCourier: 'Delhivery',
    centroid: { lat: 19.076, lng: 72.8777 },
    topPincodes: ['400001', '400051', '400069'],
  },
  {
    city_id: 'delhi',
    name: 'Delhi',
    state: 'Delhi',
    stateCode: 'DL',
    orders: 132,
    exceptions: 12,
    exceptionRate: 9.1,
    avgDeliveryTime: 1.8,
    topCourier: 'BlueDart',
    centroid: { lat: 28.7041, lng: 77.1025 },
    topPincodes: ['110001', '110019', '110025'],
  },
  {
    city_id: 'bangalore',
    name: 'Bangalore',
    state: 'Karnataka',
    stateCode: 'KA',
    orders: 98,
    exceptions: 5,
    exceptionRate: 5.1,
    avgDeliveryTime: 2.3,
    topCourier: 'Ecom Express',
    centroid: { lat: 12.9716, lng: 77.5946 },
    topPincodes: ['560001', '560038', '560100'],
  },
  {
    city_id: 'hyderabad',
    name: 'Hyderabad',
    state: 'Telangana',
    stateCode: 'TG',
    orders: 87,
    exceptions: 6,
    exceptionRate: 6.9,
    avgDeliveryTime: 2.5,
    topCourier: 'Delhivery',
    centroid: { lat: 17.385, lng: 78.4867 },
    topPincodes: ['500001', '500032', '500081'],
  },
  {
    city_id: 'ahmedabad',
    name: 'Ahmedabad',
    state: 'Gujarat',
    stateCode: 'GJ',
    orders: 76,
    exceptions: 4,
    exceptionRate: 5.3,
    avgDeliveryTime: 2.2,
    topCourier: 'DTDC',
    centroid: { lat: 23.0225, lng: 72.5714 },
    topPincodes: ['380001', '380015', '380052'],
  },
  {
    city_id: 'chennai',
    name: 'Chennai',
    state: 'Tamil Nadu',
    stateCode: 'TN',
    orders: 71,
    exceptions: 7,
    exceptionRate: 9.9,
    avgDeliveryTime: 2.6,
    topCourier: 'Ecom Express',
    centroid: { lat: 13.0827, lng: 80.2707 },
    topPincodes: ['600001', '600017', '600034'],
  },
  {
    city_id: 'kolkata',
    name: 'Kolkata',
    state: 'West Bengal',
    stateCode: 'WB',
    orders: 65,
    exceptions: 9,
    exceptionRate: 13.8,
    avgDeliveryTime: 3.1,
    topCourier: 'Delhivery',
    centroid: { lat: 22.5726, lng: 88.3639 },
    topPincodes: ['700001', '700019', '700053'],
  },
  {
    city_id: 'pune',
    name: 'Pune',
    state: 'Maharashtra',
    stateCode: 'MH',
    orders: 58,
    exceptions: 3,
    exceptionRate: 5.2,
    avgDeliveryTime: 2.0,
    topCourier: 'BlueDart',
    centroid: { lat: 18.5204, lng: 73.8567 },
    topPincodes: ['411001', '411014', '411038'],
  },
  {
    city_id: 'jaipur',
    name: 'Jaipur',
    state: 'Rajasthan',
    stateCode: 'RJ',
    orders: 45,
    exceptions: 5,
    exceptionRate: 11.1,
    avgDeliveryTime: 2.8,
    topCourier: 'DTDC',
    centroid: { lat: 26.9124, lng: 75.7873 },
    topPincodes: ['302001', '302015', '302033'],
  },
  {
    city_id: 'surat',
    name: 'Surat',
    state: 'Gujarat',
    stateCode: 'GJ',
    orders: 42,
    exceptions: 2,
    exceptionRate: 4.8,
    avgDeliveryTime: 2.4,
    topCourier: 'Delhivery',
    centroid: { lat: 21.1702, lng: 72.8311 },
    topPincodes: ['395001', '395007', '395017'],
  },
];

// ============================================================================
// Get Top Cities (configurable)
// ============================================================================

export function getTopCities(
  metric: 'volume' | 'exceptions' = 'volume',
  limit: number = 10
): CityMetric[] {
  if (metric === 'volume') {
    return INDIAN_CITIES.slice(0, limit);
  }

  // Sort by exception rate descending
  const sortedByExceptions = [...INDIAN_CITIES].sort(
    (a, b) => b.exceptionRate - a.exceptionRate
  );
  return sortedByExceptions.slice(0, limit);
}

// ============================================================================
// Search Cities (for typeahead)
// ============================================================================

export function searchCities(query: string): CityMetric[] {
  const lowerQuery = query.toLowerCase();
  return INDIAN_CITIES.filter(
    (city) =>
      city.name.toLowerCase().includes(lowerQuery) ||
      city.state.toLowerCase().includes(lowerQuery) ||
      city.topPincodes.some((pin) => pin.includes(query))
  );
}

// ============================================================================
// Mock Geographic Metrics
// ============================================================================

export function getMockGeoMetrics(): GeoMetricsData {
  return {
    topCities: getTopCities('volume', 10),
    totalCities: INDIAN_CITIES.length,
    lastUpdated: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 min ago
    freshness: 'stale_5m',
  };
}

export const mockGeoMetrics = getMockGeoMetrics();
export const mockTopCitiesByVolume = getTopCities('volume', 10);
export const mockTopCitiesByExceptions = getTopCities('exceptions', 10);

// ============================================================================
// Geographic Insights Data (for GeographicInsights component)
// ============================================================================

interface RegionMetric {
  region: 'North' | 'South' | 'East' | 'West' | 'Northeast' | 'Central';
  orders: number;
  percentage: number;
  color: string;
}

const REGION_COLORS: Record<string, string> = {
  North: '#3B82F6',      // Blue
  South: '#10B981',      // Green
  East: '#F59E0B',       // Orange
  West: '#8B5CF6',       // Purple
  Northeast: '#EC4899',  // Pink
  Central: '#6366F1'     // Indigo
};

// Map states to regions
const STATE_TO_REGION: Record<string, 'North' | 'South' | 'East' | 'West' | 'Northeast' | 'Central'> = {
  'Delhi': 'North',
  'Maharashtra': 'West',
  'Karnataka': 'South',
  'Telangana': 'South',
  'Gujarat': 'West',
  'Tamil Nadu': 'South',
  'West Bengal': 'East',
  'Rajasthan': 'North',
  'Punjab': 'North',
  'Haryana': 'North',
  'Uttar Pradesh': 'North',
  'Madhya Pradesh': 'Central',
  'Kerala': 'South',
  'Andhra Pradesh': 'South',
  'Odisha': 'East',
  'Bihar': 'East',
  'Assam': 'Northeast',
};

export function getGeographicInsightsData() {
  const cities = getTopCities('volume', 10);
  const totalOrders = cities.reduce((sum, city) => sum + city.orders, 0);

  // Transform cities for GeographicInsights
  const topCities = cities.slice(0, 5).map(city => ({
    city: city.name,
    state: city.state,
    orders: city.orders,
    percentage: parseFloat(((city.orders / totalOrders) * 100).toFixed(1)),
    trend: 'up' as const, // Mock trend - in production, compare with previous period
    trendValue: Math.floor(Math.random() * 15) + 5 // 5-20% growth
  }));

  // Calculate regional distribution
  const regionMap = new Map<string, number>();
  INDIAN_CITIES.forEach(city => {
    const region = STATE_TO_REGION[city.state] || 'Central';
    regionMap.set(region, (regionMap.get(region) || 0) + city.orders);
  });

  const allOrders = INDIAN_CITIES.reduce((sum, city) => sum + city.orders, 0);
  const regions: RegionMetric[] = Array.from(regionMap.entries())
    .map(([region, orders]) => ({
      region: region as RegionMetric['region'],
      orders,
      percentage: parseFloat(((orders / allOrders) * 100).toFixed(1)),
      color: REGION_COLORS[region]
    }))
    .sort((a, b) => b.orders - a.orders);

  return {
    topCities,
    regions,
    totalOrders: allOrders
  };
}

export const mockGeographicInsights = getGeographicInsightsData();
