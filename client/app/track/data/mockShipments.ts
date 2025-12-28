/**
 * Comprehensive Mock Data for Track Page Testing
 * Rich India-specific data with detailed timelines
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
  packageType?: string;
  packageValue?: string;
  recipient: {
    name?: string;
    city: string;
    state: string;
    postalCode?: string;
    address?: string;
    contact?: string;
  };
  sender?: {
    name?: string;
    city: string;
    state: string;
    address?: string;
    contact?: string;
  };
  timeline: Array<{
    status: string;
    timestamp: string;
    location?: string;
    description?: string;
    agentName?: string;
    agentContact?: string;
    facilityType?: string;
  }>;
}

// Helper to generate timestamps
const daysAgo = (days: number, hours = 0) =>
  new Date(Date.now() - days * 86400000 - hours * 3600000).toISOString();
const daysFromNow = (days: number) =>
  new Date(Date.now() + days * 86400000).toISOString();

export const MOCK_SHIPMENTS: Record<string, MockShipmentData> = {
  // 1. OUT FOR DELIVERY - Dev Panchal (Delhi to Haryana)
  DEMO: {
    trackingNumber: 'SHP-DLH-2025-0001',
    carrier: 'BlueDart Express',
    serviceType: 'Express Air - Same Day',
    currentStatus: 'OUT_FOR_DELIVERY',
    estimatedDelivery: new Date().toISOString(),
    createdAt: daysAgo(2),
    weight: '3.5 kg',
    dimensions: '40 × 30 × 25 cm',
    packageType: 'Electronics',
    packageValue: '₹45,999',
    recipient: {
      name: 'Dev Panchal',
      city: 'Gurgaon',
      state: 'Haryana',
      postalCode: '122001',
      address: 'Sector 29, DLF Phase 3, Gurgaon, Haryana',
      contact: '+91 98765 43210',
    },
    sender: {
      name: 'TechZone India Pvt Ltd',
      city: 'New Delhi',
      state: 'Delhi',
      address: 'Nehru Place, South Delhi, New Delhi - 110019',
      contact: '+91 11 2654 8899',
    },
    timeline: [
      {
        status: 'OUT_FOR_DELIVERY',
        timestamp: daysAgo(0, 2),
        location: 'Udyog Vihar, Sector 18, Gurgaon',
        description: 'Package out for delivery. Your package will reach you by 5:00 PM today. Delivery partner: Rakesh Kumar.',
        agentName: 'Rakesh Kumar',
        agentContact: '+91 98123 45678',
        facilityType: 'Delivery Hub',
      },
      {
        status: 'ARRIVED_AT_DESTINATION',
        timestamp: daysAgo(0, 8),
        location: 'BlueDart Gurgaon Regional Hub, Sector 37',
        description: 'Shipment arrived at destination facility. Package sorted and assigned to delivery partner.',
        facilityType: 'Regional Hub',
      },
      {
        status: 'IN_TRANSIT',
        timestamp: daysAgo(1, 4),
        location: 'NH-48 (Delhi-Gurgaon Expressway)',
        description: 'Package in transit via express highway route. Expected arrival at Gurgaon hub shortly.',
        facilityType: 'Transit Route',
      },
      {
        status: 'IN_TRANSIT',
        timestamp: daysAgo(1, 12),
        location: 'IGI Airport Cargo Terminal 3, New Delhi',
        description: 'Package cleared customs and loaded for ground transport to destination.',
        facilityType: 'Airport Cargo',
      },
      {
        status: 'PICKED_UP',
        timestamp: daysAgo(1, 18),
        location: 'Nehru Place Electronic Market, New Delhi',
        description: 'Shipment picked up from merchant warehouse by our field executive.',
        agentName: 'Vikas Sharma',
        agentContact: '+91 11 2654 8899',
        facilityType: 'Pickup Point',
      },
      {
        status: 'ORDER_CREATED',
        timestamp: daysAgo(2),
        location: 'TechZone India - Nehru Place, New Delhi',
        description: 'Express shipment order created. Priority processing initiated for same-day delivery.',
        facilityType: 'Origin',
      },
    ],
  },

  // 2. DELIVERED - Premium delivery to Mumbai
  DELIVERED: {
    trackingNumber: 'SHP-MUM-2025-0002',
    carrier: 'Delhivery Premium',
    serviceType: 'Prime Express - Next Day',
    currentStatus: 'DELIVERED',
    estimatedDelivery: daysAgo(1),
    actualDelivery: daysAgo(0, 9),
    createdAt: daysAgo(4),
    weight: '2.2 kg',
    dimensions: '35 × 28 × 18 cm',
    packageType: 'Fashion & Lifestyle',
    packageValue: '₹12,499',
    recipient: {
      name: 'Priya Sharma',
      city: 'Mumbai',
      state: 'Maharashtra',
      postalCode: '400050',
      address: 'Apartment 502, Oberoi Sky Heights, Lokhandwala, Andheri West',
      contact: '+91 98765 12345',
    },
    sender: {
      name: 'Myntra Fashion Studio',
      city: 'Bengaluru',
      state: 'Karnataka',
      address: 'Bellandur, Outer Ring Road, Bengaluru - 560103',
      contact: '1800-208-9898',
    },
    timeline: [
      {
        status: 'DELIVERED',
        timestamp: daysAgo(0, 9),
        location: 'Lokhandwala Complex, Andheri West, Mumbai',
        description: 'Package delivered successfully and signed by recipient. Thank you for choosing Delhivery!',
        agentName: 'Santosh Patil',
        agentContact: '+91 98234 56789',
        facilityType: 'Delivery Point',
      },
      {
        status: 'OUT_FOR_DELIVERY',
        timestamp: daysAgo(0, 14),
        location: 'Delhivery Andheri Hub, MIDC Area',
        description: 'Package loaded in delivery vehicle. 2 stops before your address.',
        agentName: 'Santosh Patil',
        facilityType: 'Delivery Hub',
      },
      {
        status: 'ARRIVED_AT_DESTINATION',
        timestamp: daysAgo(1, 6),
        location: 'Mumbai Central Distribution Center, BKC',
        description: 'Arrived at Mumbai facility. Package processed through automated sorting system.',
        facilityType: 'Distribution Center',
      },
      {
        status: 'IN_TRANSIT',
        timestamp: daysAgo(2, 8),
        location: 'Pune Logistics Park, Chakan',
        description: 'Package in transit. Temperature controlled transport for premium items.',
        facilityType: 'Logistics Park',
      },
      {
        status: 'IN_TRANSIT',
        timestamp: daysAgo(2, 20),
        location: 'Bengaluru Airport Cargo Complex',
        description: 'Package dispatched via air freight. Flight BX-4521 departed at 10:45 PM.',
        facilityType: 'Air Cargo',
      },
      {
        status: 'PICKED_UP',
        timestamp: daysAgo(3, 10),
        location: 'Myntra Fulfillment Center, Bellandur, Bengaluru',
        description: 'Package collected from seller warehouse. Quality check completed.',
        agentName: 'Kiran Kumar',
        facilityType: 'Warehouse',
      },
      {
        status: 'ORDER_CREATED',
        timestamp: daysAgo(4),
        location: 'Bengaluru',
        description: 'Premium order created. Priority processing and express handling applied.',
        facilityType: 'Origin',
      },
    ],
  },

  // 3. IN TRANSIT - Chennai to Bangalore tech delivery
  TRANSIT: {
    trackingNumber: 'SHP-CHN-2025-0003',
    carrier: 'DTDC Express Logistics',
    serviceType: 'Surface Express - 3-4 Days',
    currentStatus: 'IN_TRANSIT',
    estimatedDelivery: daysFromNow(2),
    createdAt: daysAgo(3),
    weight: '8.5 kg',
    dimensions: '55 × 40 × 35 cm',
    packageType: 'Computer Hardware',
    packageValue: '₹78,999',
    recipient: {
      name: 'Ananya Reddy',
      city: 'Bengaluru',
      state: 'Karnataka',
      postalCode: '560034',
      address: 'HSR Layout, Sector 2, Bengaluru',
      contact: '+91 99876 54321',
    },
    sender: {
      name: 'Elcot IT Components',
      city: 'Chennai',
      state: 'Tamil Nadu',
      address: 'Tidel Park, IT Corridor, Taramani, Chennai - 600113',
      contact: '+91 44 2254 0000',
    },
    timeline: [
      {
        status: 'IN_TRANSIT',
        timestamp: daysAgo(0, 6),
        location: 'Hosur Toll Plaza, Tamil Nadu-Karnataka Border',
        description: 'Package crossed state border. Continuing journey to Bengaluru on NH-44.',
        facilityType: 'Interstate Transit',
      },
      {
        status: 'IN_TRANSIT',
        timestamp: daysAgo(1, 4),
        location: 'DTDC Vellore Hub, NH-48',
        description: 'Package processed through hub. Scanning and documentation completed. On schedule.',
        facilityType: 'Transit Hub',
      },
      {
        status: 'IN_TRANSIT',
        timestamp: daysAgo(2, 8),
        location: 'Chennai Central Sorting Facility, Ambattur',
        description: 'Package sorted and loaded for interstate transport. Vehicle departed at 11:30 PM.',
        facilityType: 'Sorting Facility',
      },
      {
        status: 'PICKED_UP',
        timestamp: daysAgo(2, 18),
        location: 'Tidel Park, Taramani, Chennai',
        description: 'Shipment collected from seller. Fragile handling instructions applied.',
        agentName: 'Murugan K.',
        agentContact: '+91 98410 12345',
        facilityType: 'Pickup Point',
      },
      {
        status: 'ORDER_CREATED',
        timestamp: daysAgo(3),
        location: 'Chennai',
        description: 'B2B shipment order created for computer hardware. Insurance coverage: ₹80,000.',
        facilityType: 'Origin',
      },
    ],
  },

  // 4. PICKED UP - Jaipur to Chandigarh
  PICKED: {
    trackingNumber: 'SHP-JAI-2025-0004',
    carrier: 'Ecom Express - Regional',
    serviceType: 'Standard Ground Shipping',
    currentStatus: 'PICKED_UP',
    estimatedDelivery: daysFromNow(4),
    createdAt: daysAgo(0, 12),
    weight: '1.5 kg',
    dimensions: '28 × 22 × 8 cm',
    packageType: 'Books & Stationery',
    packageValue: '₹2,499',
    recipient: {
      name: 'Vikram Malhotra',
      city: 'Chandigarh',
      state: 'Chandigarh',
      postalCode: '160017',
      address: 'Sector 17-B, Near Piccadilly Square, Chandigarh',
      contact: '+91 98765 00001',
    },
    sender: {
      name: 'Jaipur Book House',
      city: 'Jaipur',
      state: 'Rajasthan',
      address: 'MI Road, Near Panch Batti, Jaipur - 302001',
      contact: '+91 141 237 0000',
    },
    timeline: [
      {
        status: 'PICKED_UP',
        timestamp: daysAgo(0, 4),
        location: 'MI Road Commercial Area, Jaipur',
        description: 'Package successfully picked up from bookstore. On its way to our sorting facility.',
        agentName: 'Ramesh Choudhary',
        agentContact: '+91 98290 12345',
        facilityType: 'Pickup Point',
      },
      {
        status: 'ORDER_CREATED',
        timestamp: daysAgo(0, 12),
        location: 'Jaipur',
        description: 'New shipment order registered. Standard delivery timeline: 4-5 business days.',
        facilityType: 'Origin',
      },
    ],
  },

  // 5. ORDER CREATED - Fresh order
  CREATED: {
    trackingNumber: 'SHP-AHM-2025-0005',
    carrier: 'XpressBees Logistics',
    serviceType: 'Economy Shipping - 6-8 Days',
    currentStatus: 'ORDER_CREATED',
    estimatedDelivery: daysFromNow(7),
    createdAt: daysAgo(0, 3),
    weight: '4.8 kg',
    dimensions: '45 × 35 × 30 cm',
    packageType: 'Home Decor',
    packageValue: '₹8,999',
    recipient: {
      name: 'Sneha Gupta',
      city: 'Kolkata',
      state: 'West Bengal',
      postalCode: '700019',
      address: 'Park Street Area, Near South City Mall, Kolkata',
      contact: '+91 98765 99999',
    },
    sender: {
      name: 'Gujarat Handicrafts Emporium',
      city: 'Ahmedabad',
      state: 'Gujarat',
      address: 'CG Road, Navrangpura, Ahmedabad - 380009',
      contact: '+91 79 2640 0000',
    },
    timeline: [
      {
        status: 'ORDER_CREATED',
        timestamp: daysAgo(0, 3),
        location: 'Ahmedabad',
        description: 'Shipment created and registered in our system. Pickup scheduled for tomorrow morning.',
        facilityType: 'Origin',
      },
    ],
  },

  // 6. ROCKET - Easter Egg (ISRO Space theme)
  ROCKET: {
    trackingNumber: 'ISRO-PSLV-C58',
    carrier: 'Indian Space Research Organisation',
    serviceType: 'Orbital Deployment',
    currentStatus: 'IN_TRANSIT',
    estimatedDelivery: daysFromNow(0),
    createdAt: daysAgo(0, 6),
    weight: '1,750 kg',
    dimensions: '4.2m × 2.8m diameter',
    packageType: 'Satellite Payload',
    packageValue: '₹450 Crores',
    recipient: {
      name: 'Mission Control',
      city: 'Low Earth Orbit',
      state: 'Space',
      postalCode: 'LEO-650',
      address: '650 km above Earth surface',
      contact: 'Ground Station Bengaluru',
    },
    sender: {
      name: 'ISRO Satellite Centre',
      city: 'Bengaluru',
      state: 'Karnataka',
      address: 'Airport Road, Vimanapura Post, Bengaluru - 560017',
      contact: '+91 80 2508 4000',
    },
    timeline: [
      {
        status: 'ORBITAL_INSERTION',
        timestamp: daysAgo(0, 1),
        location: '650 km altitude, Sun-synchronous orbit',
        description: '🛰️ Satellite deployed successfully! Solar panels deployed. All systems nominal. Establishing communication link.',
        facilityType: 'Low Earth Orbit',
      },
      {
        status: 'STAGE_SEPARATION',
        timestamp: daysAgo(0, 2),
        location: '420 km altitude, ascending',
        description: '🚀 Fourth stage burn complete. Coasting phase initiated. Preparing for payload deployment.',
        facilityType: 'Upper Atmosphere',
      },
      {
        status: 'THIRD_STAGE',
        timestamp: daysAgo(0, 3),
        location: '180 km altitude',
        description: '🔥 Third stage ignition successful. Vehicle on nominal trajectory. All parameters green.',
        facilityType: 'Mesosphere',
      },
      {
        status: 'LIFTOFF',
        timestamp: daysAgo(0, 4),
        location: 'First Launch Pad, Satish Dhawan Space Centre',
        description: '🚀 LIFTOFF! PSLV-C58 has cleared the launch tower. All six strap-ons functioning perfectly!',
        facilityType: 'Sriharikota, Andhra Pradesh',
      },
      {
        status: 'FINAL_COUNTDOWN',
        timestamp: daysAgo(0, 5),
        location: 'Satish Dhawan Space Centre, Sriharikota',
        description: '⚡ T-10 minutes and counting. All systems GO. Weather conditions: Excellent. Wind speed: 8 km/h.',
        facilityType: 'Launch Complex',
      },
      {
        status: 'PRE_LAUNCH',
        timestamp: daysAgo(0, 6),
        location: 'Vehicle Assembly Building, Sriharikota',
        description: '🇮🇳 Final integration complete. Payload mated with launch vehicle. Mission: Success probable.',
        facilityType: 'Preparation Area',
      },
    ],
  },
};

// Get mock shipment by tracking number
export function getMockShipment(trackingNumber: string): MockShipmentData | null {
  const key = trackingNumber.toUpperCase();
  return MOCK_SHIPMENTS[key] || null;
}
