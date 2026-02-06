
import dotenv from 'dotenv';
import path from 'path';

// Load env vars FIRST
const envPath = path.resolve(__dirname, '../../.env');
console.log('Loading .env from:', envPath);
dotenv.config({ path: envPath });

// Fallback for encryption key if missing in .env (for local debug script)
if (!process.env.ENCRYPTION_KEY) {
    console.warn('⚠️ ENCRYPTION_KEY not found in .env, using mock key for debug script to prevent crash.');
    process.env.ENCRYPTION_KEY = '12345678901234567890123456789012';
}

async function debugSellers() {
    try {
        // Dynamic imports to ensure env vars are loaded before models
        const mongoose = (await import('mongoose')).default;
        const { default: connectDB } = await import('../config/database');
        // Import User model dynamically
        const { default: User } = await import('../infrastructure/database/mongoose/models/iam/users/user.model');

        console.log('Connecting to database...');
        await connectDB();
        console.log('Connected to database.');

        const totalUsers = await User.countDocuments();
        console.log(`Total Users: ${totalUsers}`);

        const sellers = await User.find({ role: 'seller' });
        console.log(`Users with role='seller': ${sellers.length}`);

        const sellersWithCompany = await User.find({ role: 'seller', companyId: { $ne: null } });
        console.log(`Sellers with companyId != null: ${sellersWithCompany.length}`);

        if (sellers.length > 0 && sellersWithCompany.length === 0) {
            console.log('WARNING: Sellers exist but have no companyId.');
            console.log('First 3 sellers without company:', JSON.stringify(sellers.slice(0, 3), null, 2));

            // Helpful tip
            console.log('\n💡 Tip: You might need to link these sellers to a company manually or run a seed script.');
        } else if (sellersWithCompany.length > 0) {
            console.log('Sample seller with company:', JSON.stringify(sellersWithCompany[0], null, 2));
        } else {
            console.log('No sellers found. You may need to create a seller user.');
        }

        process.exit(0);
    } catch (error) {
        console.error('Error debugging sellers:', error);
        process.exit(1);
    }
}

debugSellers();
