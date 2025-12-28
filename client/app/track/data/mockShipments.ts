/**
 * Comprehensive Mock Data for Track Page Testing
 * Covers all possible states and edge cases
 */

export interface MockShipmentData {
  trackingNumber: string;
  carrier: string;
  serviceType: string;
  currentStatus: string;
  estimatedDelivery?: string;
  actualDelivery?: string;
  createdAt: string;
  weight?: string;
  dimensions?: string;
  recipient: {
    name?: string;
    city: string;
    state: string;
    postalCode?: string;
  };
  sender?: {
    name?: string;
    city: string;
    state: string;
  };
  timeline: Array<{
    status: string;
    timestamp: string;
    location?: string;
    description?: string;
    agentName?: string;
    agentContact?: string;
  }>;
}

// Helper to generate timestamps
const daysAgo = (days: number, hours = 0) =>
  new Date(Date.now() - days * 86400000 - hours * 3600000).toISOString();
const daysFromNow = (days: number) =>
  new Date(Date.now() + days * 86400000).toISOString();

export const MOCK_SHIPMENTS: Record<string, MockShipmentData> = {
  // 1. OUT FOR DELIVERY - Most exciting state
  DEMO: {
    trackingNumber: 'SHP-2025-0001',
    carrier: 'BlueDart Express',
    serviceType: 'Express Air',
    currentStatus: 'OUT_FOR_DELIVERY',
    estimatedDelivery: new Date().toISOString(),
    createdAt: daysAgo(3),
    weight: '2.5 kg',
    dimensions: '30 × 25 × 15 cm',
    recipient: {
      name: 'Rajesh Kumar',
      city: 'Mumbai',
      state: 'Maharashtra',
      postalCode: '400001',
    },
    sender: {
      name: 'TechStore India',
      city: 'Bengaluru',
      state: 'Karnataka',
    },
    timeline: [
      {
        status: 'OUT_FOR_DELIVERY',
        timestamp: daysAgo(0, 2),
        location: 'Andheri West, Mumbai',
        description: 'Package is out for delivery. Estimated arrival by 6:00 PM today.',
        agentName: 'Suresh Patil',
        agentContact: '+91 98765 43210',
      },
      {
        status: 'ARRIVED_AT_DESTINATION',
        timestamp: daysAgo(0, 8),
        location: 'Mumbai Central Hub',
        description: 'Shipment arrived at destination facility and sorted for delivery.',
      },
      {
        status: 'IN_TRANSIT',
        timestamp: daysAgo(1, 14),
        location: 'Pune Distribution Center',
        description: 'Package in transit to destination city.',
      },
      {
        status: 'IN_TRANSIT',
        timestamp: daysAgo(2, 6),
        location: 'Bengaluru Sorting Facility',
        description: 'Processed through sorting facility.',
      },
      {
        status: 'PICKED_UP',
        timestamp: daysAgo(2, 18),
        location: 'Koramangala, Bengaluru',
        description: 'Shipment picked up from seller warehouse.',
        agentName: 'Venkatesh M.',
      },
      {
        status: 'ORDER_CREATED',
        timestamp: daysAgo(3),
        location: 'Bengaluru',
        description: 'Shipment order created and ready for pickup.',
      },
    ],
  },

  // 2. DELIVERED - Success state
  DELIVERED: {
    trackingNumber: 'SHP-2025-0002',
    carrier: 'Delhivery',
    serviceType: 'Standard Delivery',
    currentStatus: 'DELIVERED',
    estimatedDelivery: daysAgo(1),
    actualDelivery: daysAgo(0, 10),
    createdAt: daysAgo(5),
    weight: '1.2 kg',
    dimensions: '25 × 20 × 10 cm',
    recipient: {
      name: 'Priya Sharma',
      city: 'Delhi',
      state: 'Delhi',
      postalCode: '110001',
    },
    sender: {
      name: 'Fashion Hub',
      city: 'Mumbai',
      state: 'Maharashtra',
    },
    timeline: [
      {
        status: 'DELIVERED',
        timestamp: daysAgo(0, 10),
        location: 'Connaught Place, Delhi',
        description: 'Package successfully delivered and signed by recipient.',
        agentName: 'Amit Singh',
        agentContact: '+91 98123 45678',
      },
      {
        status: 'OUT_FOR_DELIVERY',
        timestamp: daysAgo(0, 14),
        location: 'Karol Bagh Hub, Delhi',
        description: 'Out for delivery.',
      },
      {
        status: 'ARRIVED_AT_DESTINATION',
        timestamp: daysAgo(1, 8),
        location: 'Delhi Regional Hub',
        description: 'Arrived at destination facility.',
      },
      {
        status: 'IN_TRANSIT',
        timestamp: daysAgo(2, 12),
        location: 'Jaipur Transit Hub',
        description: 'In transit via road transport.',
      },
      {
        status: 'IN_TRANSIT',
        timestamp: daysAgo(3, 16),
        location: 'Mumbai Processing Center',
        description: 'Processed and dispatched.',
      },
      {
        status: 'PICKED_UP',
        timestamp: daysAgo(4, 10),
        location: 'Andheri, Mumbai',
        description: 'Picked up from merchant location.',
      },
      {
        status: 'ORDER_CREATED',
        timestamp: daysAgo(5),
        location: 'Mumbai',
        description: 'Order created and confirmed.',
      },
    ],
  },

  // 3. IN TRANSIT - Mid-journey
  TRANSIT: {
    trackingNumber: 'SHP-2025-0003',
    carrier: 'DTDC Express',
    serviceType: 'Economy Shipping',
    currentStatus: 'IN_TRANSIT',
    estimatedDelivery: daysFromNow(2),
    createdAt: daysAgo(4),
    weight: '5.8 kg',
    dimensions: '45 × 35 × 25 cm',
    recipient: {
      name: 'Ananya Reddy',
      city: 'Hyderabad',
      state: 'Telangana',
      postalCode: '500001',
    },
    sender: {
      name: 'Electronics World',
      city: 'Chennai',
      state: 'Tamil Nadu',
    },
    timeline: [
      {
        status: 'IN_TRANSIT',
        timestamp: daysAgo(1, 4),
        location: 'Vijayawada Junction',
        description: 'Package in transit to destination. On schedule.',
      },
      {
        status: 'IN_TRANSIT',
        timestamp: daysAgo(2, 8),
        location: 'Nellore Distribution Center',
        description: 'Processed through distribution center.',
      },
      {
        status: 'IN_TRANSIT',
        timestamp: daysAgo(3, 6),
        location: 'Chennai Sorting Hub',
        description: 'Sorted and dispatched to next facility.',
      },
      {
        status: 'PICKED_UP',
        timestamp: daysAgo(3, 20),
        location: 'Velachery, Chennai',
        description: 'Package collected from origin warehouse.',
        agentName: 'Karthik R.',
      },
      {
        status: 'ORDER_CREATED',
        timestamp: daysAgo(4),
        location: 'Chennai',
        description: 'Shipment registered in system.',
      },
    ],
  },

  // 4. PICKED UP - Early stage
  PICKED: {
    trackingNumber: 'SHP-2025-0004',
    carrier: 'Ecom Express',
    serviceType: 'Surface Delivery',
    currentStatus: 'PICKED_UP',
    estimatedDelivery: daysFromNow(5),
    createdAt: daysAgo(1),
    weight: '0.8 kg',
    dimensions: '20 × 15 × 8 cm',
    recipient: {
      name: 'Vikram Malhotra',
      city: 'Chandigarh',
      state: 'Chandigarh',
      postalCode: '160001',
    },
    sender: {
      name: 'Book Paradise',
      city: 'Jaipur',
      state: 'Rajasthan',
    },
    timeline: [
      {
        status: 'PICKED_UP',
        timestamp: daysAgo(0, 6),
        location: 'Malviya Nagar, Jaipur',
        description: 'Shipment successfully picked up and on its way to processing facility.',
        agentName: 'Ramesh Kumar',
        agentContact: '+91 97654 32109',
      },
      {
        status: 'ORDER_CREATED',
        timestamp: daysAgo(1),
        location: 'Jaipur',
        description: 'New shipment order created by merchant.',
      },
    ],
  },

  // 5. ORDER CREATED - Initial stage
  CREATED: {
    trackingNumber: 'SHP-2025-0005',
    carrier: 'XpressBees',
    serviceType: 'Standard Shipping',
    currentStatus: 'ORDER_CREATED',
    estimatedDelivery: daysFromNow(7),
    createdAt: daysAgo(0, 2),
    weight: '3.2 kg',
    dimensions: '35 × 30 × 20 cm',
    recipient: {
      name: 'Sneha Gupta',
      city: 'Kolkata',
      state: 'West Bengal',
      postalCode: '700001',
    },
    sender: {
      name: 'Home Decor Studio',
      city: 'Ahmedabad',
      state: 'Gujarat',
    },
    timeline: [
      {
        status: 'ORDER_CREATED',
        timestamp: daysAgo(0, 2),
        location: 'Ahmedabad',
        description: 'Shipment order created. Awaiting pickup from seller.',
      },
    ],
  },

  // 6. DELAYED - Exception state
  DELAYED: {
    trackingNumber: 'SHP-2025-0006',
    carrier: 'India Post',
    serviceType: 'Speed Post',
    currentStatus: 'DELAYED',
    estimatedDelivery: daysFromNow(1),
    createdAt: daysAgo(8),
    weight: '1.5 kg',
    dimensions: '28 × 22 × 12 cm',
    recipient: {
      name: 'Arjun Menon',
      city: 'Kochi',
      state: 'Kerala',
      postalCode: '682001',
    },
    sender: {
      name: 'Gadget Store',
      city: 'Pune',
      state: 'Maharashtra',
    },
    timeline: [
      {
        status: 'DELAYED',
        timestamp: daysAgo(1, 6),
        location: 'Ernakulam Sorting Office',
        description: 'Shipment delayed due to weather conditions. Will resume transit shortly.',
      },
      {
        status: 'IN_TRANSIT',
        timestamp: daysAgo(3, 10),
        location: 'Kozhikode Transit Center',
        description: 'Package in transit.',
      },
      {
        status: 'IN_TRANSIT',
        timestamp: daysAgo(5, 14),
        location: 'Bengaluru Mail Hub',
        description: 'Processed through mail hub.',
      },
      {
        status: 'PICKED_UP',
        timestamp: daysAgo(7, 8),
        location: 'Wakad, Pune',
        description: 'Picked up from origin.',
      },
      {
        status: 'ORDER_CREATED',
        timestamp: daysAgo(8),
        location: 'Pune',
        description: 'Order registered.',
      },
    ],
  },

  // 7. EXCEPTION - Error state
  EXCEPTION: {
    trackingNumber: 'SHP-2025-0007',
    carrier: 'FedEx India',
    serviceType: 'Priority Overnight',
    currentStatus: 'EXCEPTION',
    estimatedDelivery: daysFromNow(1),
    createdAt: daysAgo(2),
    weight: '0.5 kg',
    dimensions: '15 × 12 × 5 cm',
    recipient: {
      name: 'Kavya Nair',
      city: 'Thiruvananthapuram',
      state: 'Kerala',
      postalCode: '695001',
    },
    sender: {
      name: 'Medical Supplies Co.',
      city: 'Mumbai',
      state: 'Maharashtra',
    },
    timeline: [
      {
        status: 'EXCEPTION',
        timestamp: daysAgo(0, 8),
        location: 'Thiruvananthapuram Hub',
        description: 'Delivery attempted but recipient unavailable. Will reattempt delivery.',
        agentName: 'Sunil Kumar',
        agentContact: '+91 94567 89012',
      },
      {
        status: 'OUT_FOR_DELIVERY',
        timestamp: daysAgo(0, 12),
        location: 'Thiruvananthapuram',
        description: 'Out for delivery.',
      },
      {
        status: 'ARRIVED_AT_DESTINATION',
        timestamp: daysAgo(1, 6),
        location: 'Thiruvananthapuram Regional Hub',
        description: 'Arrived at destination.',
      },
      {
        status: 'IN_TRANSIT',
        timestamp: daysAgo(1, 18),
        location: 'Kochi Airport',
        description: 'Air transit.',
      },
      {
        status: 'PICKED_UP',
        timestamp: daysAgo(2, 4),
        location: 'Kurla, Mumbai',
        description: 'Express pickup completed.',
      },
      {
        status: 'ORDER_CREATED',
        timestamp: daysAgo(2),
        location: 'Mumbai',
        description: 'Priority shipment created.',
      },
    ],
  },

  // 8. ROCKET - Easter Egg (Space theme)
  ROCKET: {
    trackingNumber: 'SPACE-X-042',
    carrier: 'Interstellar Logistics',
    serviceType: 'Orbital Express',
    currentStatus: 'IN_TRANSIT',
    estimatedDelivery: daysFromNow(0, 0),
    createdAt: daysAgo(0, 4),
    weight: '50 kg',
    dimensions: '100 × 80 × 60 cm',
    recipient: {
      name: 'ISS Commander',
      city: 'Low Earth Orbit',
      state: 'Space',
      postalCode: 'LEO-001',
    },
    sender: {
      name: 'Earth Supply Co.',
      city: 'Cape Canaveral',
      state: 'Florida',
    },
    timeline: [
      {
        status: 'ORBITAL_INSERTION',
        timestamp: daysAgo(0, 1),
        location: '400 km above Earth',
        description: '🚀 Package achieved orbital velocity! Approaching ISS docking port.',
      },
      {
        status: 'STAGE_SEPARATION',
        timestamp: daysAgo(0, 2),
        location: '200 km altitude',
        description: '🔥 Stage 2 ignition successful. Entering orbital trajectory.',
      },
      {
        status: 'LAUNCHED',
        timestamp: daysAgo(0, 3),
        location: 'Launch Complex 39A',
        description: '🔥 Liftoff confirmed! All systems nominal. T+ 00:00:05',
      },
      {
        status: 'PRE_LAUNCH',
        timestamp: daysAgo(0, 4),
        location: 'Cape Canaveral Space Force Station',
        description: '⚡ Final countdown initiated. Weather conditions: GO.',
      },
    ],
  },
};

// Get mock shipment by tracking number
export function getMockShipment(trackingNumber: string): MockShipmentData | null {
  const key = trackingNumber.toUpperCase();
  return MOCK_SHIPMENTS[key] || null;
}
