/**
 * User Factory
 * Creates test data for User and Company models
 */
import mongoose from 'mongoose';
import {
    randomEmail,
    randomName,
    randomPhone,
    randomCompanyName,
    randomAddress,
    randomCity,
    randomState,
    randomPincode,
    randomGstin,
} from '../helpers/randomData';

// Import models lazily to avoid circular dependencies
const getUserModel = () => mongoose.model('User');
const getCompanyModel = () => mongoose.model('Company');

export interface CreateTestUserOptions {
    email?: string;
    password?: string;
    name?: string;
    role?: 'admin' | 'seller' | 'staff';
    isEmailVerified?: boolean;
    isActive?: boolean;
    companyId?: mongoose.Types.ObjectId;
}

export interface CreateTestCompanyOptions {
    companyName?: string;
    gstin?: string;
    owner?: mongoose.Types.ObjectId;
    status?: 'pending' | 'verified' | 'rejected';
}

/**
 * Create a test user with optional overrides
 */
export const createTestUser = async (
    overrides: CreateTestUserOptions = {}
): Promise<any> => {
    const User = getUserModel();

    // Note: We pass plain password - the User model's pre-save hook handles hashing
    const userData = {
        email: overrides.email || randomEmail(),
        password: overrides.password || 'Test@1234',
        name: overrides.name || randomName(),
        role: overrides.role || 'seller',
        isEmailVerified: overrides.isEmailVerified ?? true,
        isActive: overrides.isActive ?? true,
        phone: randomPhone(),
        profileCompletion: {
            status: 50,
            requiredFieldsCompleted: true,
        },
        ...overrides,
    };

    return User.create(userData);
};

/**
 * Create a test company with optional overrides
 */
export const createTestCompany = async (
    ownerId: mongoose.Types.ObjectId | string,
    overrides: CreateTestCompanyOptions = {}
): Promise<any> => {
    const Company = getCompanyModel();

    const companyData = {
        companyName: overrides.companyName || randomCompanyName(),
        gstin: overrides.gstin || randomGstin(),
        owner: new mongoose.Types.ObjectId(ownerId),
        status: overrides.status || 'verified',
        businessType: 'ecommerce',
        registeredAddress: {
            line1: randomAddress(),
            city: randomCity(),
            state: randomState(),
            country: 'India',
            postalCode: randomPincode(),
        },
        contactInfo: {
            email: randomEmail(),
            phone: randomPhone(),
        },
        ...overrides,
    };

    return Company.create(companyData);
};

/**
 * Create a user with associated company
 */
export const createTestUserWithCompany = async (
    userOverrides: CreateTestUserOptions = {},
    companyOverrides: CreateTestCompanyOptions = {}
): Promise<{ user: any; company: any }> => {
    const user = await createTestUser(userOverrides);
    const company = await createTestCompany(user._id, companyOverrides);

    // Update user with company ID
    user.companyId = company._id;
    await user.save();

    return { user, company };
};

/**
 * Create multiple test users
 */
export const createTestUsers = async (
    count: number,
    overrides: CreateTestUserOptions = {}
): Promise<any[]> => {
    const users = [];
    for (let i = 0; i < count; i++) {
        users.push(await createTestUser(overrides));
    }
    return users;
};

/**
 * Create an admin user
 */
export const createTestAdmin = async (
    overrides: CreateTestUserOptions = {}
): Promise<any> => {
    return createTestUser({
        ...overrides,
        role: 'admin',
        email: overrides.email || 'admin@test.com',
    });
};
