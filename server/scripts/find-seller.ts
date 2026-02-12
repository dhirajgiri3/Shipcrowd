import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import path from 'path';

const envPath = process.cwd().endsWith('server')
    ? path.join(process.cwd(), '.env')
    : path.join(process.cwd(), 'server', '.env');

dotenv.config({ path: envPath });

const DB_URL = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/Shipcrowd';

async function listSellers() {
    try {
        await mongoose.connect(DB_URL);
        const { Schema } = mongoose;
        const userSchema = new Schema({}, { strict: false });
        const User = mongoose.models.User || mongoose.model('User', userSchema);
        
        const sellers = await User.find({ role: 'seller' }).limit(5).select('email profileCompletion companyId');
        
        console.log('--- Sellers ---');
        sellers.forEach(s => {
            console.log(JSON.stringify(s));
        });
        console.log('---------------');
        
    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

listSellers();
