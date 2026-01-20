/**
 * Indian Market Data - Realistic names, cities, pincodes for mock data
 * Used across all mock data generation for authentic Indian context
 */

export const INDIAN_FIRST_NAMES = {
    male: [
        'Aarav', 'Aditya', 'Arjun', 'Aryan', 'Dhruv', 'Ishaan', 'Kabir', 'Krishna',
        'Lakshay', 'Mihir', 'Nikhil', 'Pranav', 'Rahul', 'Rohan', 'Sai', 'Shaurya',
        'Vihaan', 'Vivaan', 'Yash', 'Ayaan', 'Arnav', 'Atharv', 'Darsh', 'Dev',
        'Jai', 'Kian', 'Reyansh', 'Rudra', 'Shivansh', 'Veer'
    ],
    female: [
        'Aadhya', 'Ananya', 'Anika', 'Diya', 'Isha', 'Kavya', 'Kiara', 'Myra',
        'Navya', 'Pari', 'Prisha', 'Riya', 'Saanvi', 'Sara', 'Shanaya', 'Tara',
        'Zara', 'Aanya', 'Aditi', 'Anvi', 'Avni', 'Ishita', 'Khushi', 'Mira',
        'Nisha', 'Pooja', 'Riya', 'Siya', 'Tanvi', 'Vanya'
    ]
};

export const INDIAN_LAST_NAMES = [
    'Sharma', 'Verma', 'Patel', 'Kumar', 'Singh', 'Gupta', 'Agarwal', 'Jain',
    'Reddy', 'Nair', 'Iyer', 'Rao', 'Mehta', 'Shah', 'Desai', 'Kapoor',
    'Malhotra', 'Chopra', 'Bansal', 'Joshi', 'Kulkarni', 'Pandey', 'Mishra',
    'Saxena', 'Sinha', 'Bhatia', 'Sethi', 'Arora', 'Khanna', 'Chawla'
];

export interface IndianCity {
    name: string;
    state: string;
    zone: 'A' | 'B' | 'C' | 'D' | 'E';
    tier: 1 | 2 | 3;
    pincodes: string[];
}

export const INDIAN_CITIES: IndianCity[] = [
    // Tier 1 - Metro Cities
    { name: 'Mumbai', state: 'Maharashtra', zone: 'A', tier: 1, pincodes: ['400001', '400002', '400020', '400050', '400069'] },
    { name: 'Delhi', state: 'Delhi', zone: 'A', tier: 1, pincodes: ['110001', '110016', '110025', '110044', '110092'] },
    { name: 'Bangalore', state: 'Karnataka', zone: 'B', tier: 1, pincodes: ['560001', '560038', '560066', '560100'] },
    { name: 'Hyderabad', state: 'Telangana', zone: 'B', tier: 1, pincodes: ['500001', '500033', '500081'] },
    { name: 'Chennai', state: 'Tamil Nadu', zone: 'B', tier: 1, pincodes: ['600001', '600028', '600096'] },
    { name: 'Kolkata', state: 'West Bengal', zone: 'C', tier: 1, pincodes: ['700001', '700016', '700091'] },
    { name: 'Pune', state: 'Maharashtra', zone: 'A', tier: 1, pincodes: ['411001', '411038', '411057'] },

    // Tier 2 - Major Cities
    { name: 'Ahmedabad', state: 'Gujarat', zone: 'B', tier: 2, pincodes: ['380001', '380015', '380054'] },
    { name: 'Jaipur', state: 'Rajasthan', zone: 'B', tier: 2, pincodes: ['302001', '302017', '302039'] },
    { name: 'Lucknow', state: 'Uttar Pradesh', zone: 'C', tier: 2, pincodes: ['226001', '226010', '226028'] },
    { name: 'Chandigarh', state: 'Chandigarh', zone: 'B', tier: 2, pincodes: ['160001', '160017', '160036'] },
    { name: 'Indore', state: 'Madhya Pradesh', zone: 'C', tier: 2, pincodes: ['452001', '452010', '452020'] },
    { name: 'Bhopal', state: 'Madhya Pradesh', zone: 'C', tier: 2, pincodes: ['462001', '462016', '462042'] },
    { name: 'Nagpur', state: 'Maharashtra', zone: 'C', tier: 2, pincodes: ['440001', '440010', '440025'] },
    { name: 'Visakhapatnam', state: 'Andhra Pradesh', zone: 'D', tier: 2, pincodes: ['530001', '530016', '530040'] },

    // Tier 3 - Smaller Cities
    { name: 'Aligarh', state: 'Uttar Pradesh', zone: 'D', tier: 3, pincodes: ['202001', '202002'] },
    { name: 'Rohtak', state: 'Haryana', zone: 'D', tier: 3, pincodes: ['124001', '124010'] },
    { name: 'Panipat', state: 'Haryana', zone: 'D', tier: 3, pincodes: ['132103', '132140'] },
    { name: 'Meerut', state: 'Uttar Pradesh', zone: 'D', tier: 3, pincodes: ['250001', '250002'] },
    { name: 'Varanasi', state: 'Uttar Pradesh', zone: 'E', tier: 3, pincodes: ['221001', '221010'] }
];

export const PRODUCT_CATEGORIES = [
    'Clothing & Apparel',
    'Electronics & Gadgets',
    'Jewelry & Accessories',
    'Home & Kitchen',
    'Books & Stationery',
    'Beauty & Personal Care',
    'Sports & Fitness',
    'Toys & Games',
    'Mobile Accessories',
    'Footwear'
];

export const COURIER_NAMES = [
    'Delhivery',
    'BlueDart',
    'DTDC',
    'Ecom Express',
    'Xpressbees',
    'Shadowfax'
];

// Helper functions
export function getRandomIndianName(): { firstName: string; lastName: string; fullName: string } {
    const gender = Math.random() > 0.5 ? 'male' : 'female';
    const firstName = INDIAN_FIRST_NAMES[gender][Math.floor(Math.random() * INDIAN_FIRST_NAMES[gender].length)];
    const lastName = INDIAN_LAST_NAMES[Math.floor(Math.random() * INDIAN_LAST_NAMES.length)];
    return { firstName, lastName, fullName: `${firstName} ${lastName}` };
}

export function getRandomCity(): IndianCity {
    return INDIAN_CITIES[Math.floor(Math.random() * INDIAN_CITIES.length)];
}

export function getRandomPincode(city?: IndianCity): string {
    const targetCity = city || getRandomCity();
    return targetCity.pincodes[Math.floor(Math.random() * targetCity.pincodes.length)];
}

export function getRandomMobileNumber(): string {
    const prefix = ['+91 ', ''];
    const selectedPrefix = prefix[Math.floor(Math.random() * prefix.length)];
    const number = Math.floor(6000000000 + Math.random() * 3999999999);
    return `${selectedPrefix}${number}`;
}

// Product Names by Category
export const PRODUCTS = [
    'Cotton T-Shirt', 'Denim Jeans', 'Silk Saree', 'Kurta Pajama',
    'Wireless Earbuds', 'Smart Watch', 'Power Bank', 'USB Cable',
    'Lipstick', 'Face Wash', 'Shampoo', 'Hair Oil',
    'Wall Clock', 'Bedsheet Set', 'Water Bottle', 'Lunch Box',
    'Notebook', 'Gel Pen Set', 'Sticky Notes',
    'Running Shoes', 'Yoga Mat', 'Dumbbells',
    'Action Figure', 'Puzzle Set', 'Board Game'
];

export function getRandomProductCategory(): string {
    return PRODUCT_CATEGORIES[Math.floor(Math.random() * PRODUCT_CATEGORIES.length)];
}

export function getRandomProduct(): string {
    return PRODUCTS[Math.floor(Math.random() * PRODUCTS.length)];
}

export function getRandomCourier(): string {
    return COURIER_NAMES[Math.floor(Math.random() * COURIER_NAMES.length)];
}

