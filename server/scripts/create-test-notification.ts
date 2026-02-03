/**
 * Test Script: Create Sample Notification
 * 
 * This script creates a test notification in the database
 * so we can verify the notification endpoints work.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Notification from '../src/infrastructure/database/mongoose/models/crm/communication/notification.model';

dotenv.config();

async function createTestNotification() {
    try {
        // Connect to MongoDB
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/shipcrowd';
        await mongoose.connect(mongoUri);
        console.log('✅ Connected to MongoDB');

        // You'll need to replace this with an actual user ID from your database
        // For now, we'll use a placeholder - you should update this with a real user ID
        const testUserId = '697e1b1b5570a6960bcb7084'; // Replace with actual user ID

        // Create a test notification
        const notification = await Notification.create({
            recipientId: new mongoose.Types.ObjectId(testUserId),
            type: 'system',
            title: 'Welcome to Notifications!',
            message: 'Your in-app notification system is now working. This is a test notification to verify the implementation.',
            priority: 'medium',
            read: false,
            actionUrl: '/dashboard',
            actionLabel: 'Go to Dashboard',
            metadata: {
                source: 'test-script',
                createdBy: 'system',
            },
        });

        console.log('✅ Test notification created:');
        console.log(JSON.stringify(notification, null, 2));

        // Create a few more for testing
        await Notification.create({
            recipientId: new mongoose.Types.ObjectId(testUserId),
            type: 'shipment',
            title: 'Shipment Update',
            message: 'Your shipment #12345 has been delivered successfully.',
            priority: 'high',
            read: false,
            actionUrl: '/shipments/12345',
            actionLabel: 'View Shipment',
        });

        await Notification.create({
            recipientId: new mongoose.Types.ObjectId(testUserId),
            type: 'order',
            title: 'New Order Received',
            message: 'You have received a new order #ORD-98765.',
            priority: 'urgent',
            read: false,
            actionUrl: '/orders/98765',
            actionLabel: 'View Order',
        });

        console.log('✅ Created 3 test notifications total');

        // Disconnect
        await mongoose.disconnect();
        console.log('✅ Disconnected from MongoDB');

        console.log('\n📝 Next steps:');
        console.log('1. Update the testUserId in this script with your actual user ID');
        console.log('2. Test the API endpoints:');
        console.log('   GET /api/v1/notifications');
        console.log('   GET /api/v1/notifications/unread-count');
        console.log('   POST /api/v1/notifications/:id/read');
        console.log('   POST /api/v1/notifications/mark-all-read');

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

createTestNotification();
