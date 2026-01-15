import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../infrastructure/database/mongoose/models';

dotenv.config();

const checkTokens = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/shipcrowd');
    
    const users = await User.find({
      'security.verificationToken': { $exists: true },
      isEmailVerified: false
    }).limit(5);
    
    console.log('Found', users.length, 'users with pending verification\n');
    
    users.forEach((user: any) => {
      console.log('---');
      console.log('Email:', user.email);
      console.log('Stored hash:', user.security.verificationToken);
      console.log('Token length:', user.security.verificationToken?.length);
      console.log('Expiry:', user.security.verificationTokenExpiry);
      console.log('');
    });
    
    await mongoose.disconnect();
  } catch (error: any) {
    console.error('Error:', error.message);
  }
  process.exit(0);
};

checkTokens();
