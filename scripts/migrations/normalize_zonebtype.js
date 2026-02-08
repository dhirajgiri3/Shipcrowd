const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../server/.env') });

const RateCardSchema = new mongoose.Schema(
    {
        zoneBType: String,
    },
    { strict: false }
);

const RateCard = mongoose.model('RateCard', RateCardSchema);

async function normalizeZoneBType() {
    try {
        if (!process.env.MONGODB_URI) {
            throw new Error('MONGODB_URI not found in .env');
        }

        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const result = await RateCard.updateMany(
            { zoneBType: 'region' },
            { $set: { zoneBType: 'distance' } }
        );

        const matched = result.matchedCount ?? result.n ?? 0;
        const modified = result.modifiedCount ?? result.nModified ?? 0;

        console.log(`Matched ${matched} rate cards; updated ${modified} to zoneBType='distance'.`);
    } catch (error) {
        console.error('Error normalizing zoneBType:', error);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected');
    }
}

normalizeZoneBType();
