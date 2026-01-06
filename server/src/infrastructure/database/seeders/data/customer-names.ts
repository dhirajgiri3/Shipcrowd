/**
 * Customer Names Database
 * 
 * Realistic Indian names and phone number generation.
 */

import { selectRandom } from '../utils/random.utils';

// Indian male first names
const MALE_FIRST_NAMES = [
    'Raj', 'Amit', 'Vikram', 'Arjun', 'Rahul', 'Karan', 'Rohan', 'Aditya', 'Sanjay', 'Suresh',
    'Pradeep', 'Rajesh', 'Vijay', 'Ajay', 'Sunil', 'Anil', 'Manoj', 'Deepak', 'Ashok', 'Ramesh',
    'Krishna', 'Gopal', 'Mohan', 'Shyam', 'Ravi', 'Sachin', 'Nikhil', 'Gaurav', 'Ankit', 'Varun',
    'Vivek', 'Siddharth', 'Aarav', 'Vihaan', 'Aditya', 'Reyansh', 'Ayaan', 'Atharv', 'Ishaan', 'Dhruv',
    'Kabir', 'Advait', 'Arnav', 'Arjun', 'Laksh', 'Shivansh', 'Ayansh', 'Rudra', 'Veer', 'Yash',
];

// Indian female first names
const FEMALE_FIRST_NAMES = [
    'Priya', 'Ananya', 'Sneha', 'Kavya', 'Anjali', 'Neha', 'Riya', 'Pooja', 'Shalini', 'Deepika',
    'Sunita', 'Meena', 'Geeta', 'Rekha', 'Rani', 'Lakshmi', 'Sarita', 'Asha', 'Nisha', 'Swati',
    'Divya', 'Shruti', 'Aishwarya', 'Aditi', 'Kritika', 'Pallavi', 'Megha', 'Jyoti', 'Rashmi', 'Poonam',
    'Aadhya', 'Diya', 'Pihu', 'Anvi', 'Aanya', 'Myra', 'Sara', 'Ira', 'Navya', 'Anika',
    'Isha', 'Kiara', 'Siya', 'Tara', 'Nayra', 'Avni', 'Khushi', 'Trisha', 'Shanaya', 'Zara',
];

// Indian last names (family names)
const LAST_NAMES = [
    'Sharma', 'Patel', 'Kumar', 'Singh', 'Gupta', 'Reddy', 'Agarwal', 'Jain', 'Verma', 'Rao',
    'Mehta', 'Shah', 'Kapoor', 'Malhotra', 'Bajaj', 'Choudhary', 'Chauhan', 'Pandey', 'Mishra', 'Saxena',
    'Trivedi', 'Dubey', 'Shukla', 'Tiwari', 'Srivastava', 'Joshi', 'Nair', 'Menon', 'Pillai', 'Iyer',
    'Iyengar', 'Naidu', 'Chowdhury', 'Banerjee', 'Mukherjee', 'Chatterjee', 'Das', 'Ghosh', 'Bose', 'Sen',
    'Desai', 'Patil', 'Kulkarni', 'Deshpande', 'Jog', 'Gokhale', 'Marathe', 'Pawar', 'Jadhav', 'Sawant',
];

// Common email providers
const EMAIL_PROVIDERS = [
    'gmail.com',
    'yahoo.com',
    'hotmail.com',
    'outlook.com',
    'rediffmail.com',
];

export type Gender = 'male' | 'female';

/**
 * Generate a random Indian name
 */
export function generateIndianName(gender?: Gender): string {
    const g = gender || selectRandom(['male', 'female'] as Gender[]);
    const firstNames = g === 'male' ? MALE_FIRST_NAMES : FEMALE_FIRST_NAMES;
    const firstName = selectRandom(firstNames);
    const lastName = selectRandom(LAST_NAMES);
    return `${firstName} ${lastName}`;
}

/**
 * Generate a random first name
 */
export function generateFirstName(gender?: Gender): string {
    const g = gender || selectRandom(['male', 'female'] as Gender[]);
    const firstNames = g === 'male' ? MALE_FIRST_NAMES : FEMALE_FIRST_NAMES;
    return selectRandom(firstNames);
}

/**
 * Generate a random last name
 */
export function generateLastName(): string {
    return selectRandom(LAST_NAMES);
}

/**
 * Generate an Indian phone number (+91-XXXXX-XXXXX)
 */
export function generateIndianPhone(): string {
    // Indian mobile numbers start with 6, 7, 8, or 9
    const prefix = selectRandom(['6', '7', '8', '9']);
    const part1 = prefix + Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const part2 = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
    return `+91-${part1}-${part2}`;
}

/**
 * Generate a simple phone number (10 digits)
 */
export function generatePhone(): string {
    const prefix = selectRandom(['6', '7', '8', '9']);
    const rest = Math.floor(Math.random() * 1000000000).toString().padStart(9, '0');
    return prefix + rest;
}

/**
 * Generate an email address
 */
export function generateEmail(name?: string): string {
    const nameBase = name
        ? name.toLowerCase().replace(/\s+/g, '.').replace(/[^a-z.]/g, '')
        : `${generateFirstName().toLowerCase()}.${generateLastName().toLowerCase()}`;

    const random = Math.floor(Math.random() * 1000);
    const provider = selectRandom(EMAIL_PROVIDERS);

    return `${nameBase}${random}@${provider}`;
}

/**
 * Generate a business email
 */
export function generateBusinessEmail(name: string, domain: string): string {
    const firstName = name.split(' ')[0].toLowerCase();
    return `${firstName}@${domain}`;
}

/**
 * Generate a random gender
 */
export function generateGender(): Gender {
    return selectRandom(['male', 'female']);
}

/**
 * Generate multiple unique names
 */
export function generateUniqueNames(count: number): string[] {
    const names = new Set<string>();
    while (names.size < count) {
        names.add(generateIndianName());
    }
    return Array.from(names);
}

/**
 * Generate a contact person with full details
 */
export function generateContactPerson() {
    const gender = generateGender();
    const name = generateIndianName(gender);
    const email = generateEmail(name);
    const phone = generateIndianPhone();

    return {
        name,
        email,
        phone,
        gender,
    };
}

/**
 * Generate a customer with address
 */
export function generateCustomer(city: string, state: string, pincode: string) {
    const gender = generateGender();
    const name = generateIndianName(gender);
    const email = generateEmail(name);
    const phone = generateIndianPhone();

    return {
        name,
        email,
        phone,
        gender,
        address: {
            city,
            state,
            pincode,
        },
    };
}
