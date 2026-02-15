const mongoose = require('mongoose');
require('dotenv').config();

async function checkOrders() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const Order = require('./src/infrastructure/database/mongoose/models/orders/core/order.model').default;

    // Find recent Shopify orders
    const orders = await Order.find({
      platform: 'shopify'
    }).sort({ createdAt: -1 }).limit(5).lean();

    console.log('📦 Recent Shopify Orders:');
    console.log('Total found:', orders.length, '\n');

    orders.forEach((order, i) => {
      console.log(`${i+1}. Order ID: ${order.orderId || order._id}`);
      console.log(`   Platform Order ID: ${order.platformOrderId}`);
      console.log(`   Customer: ${order.customerName || 'N/A'}`);
      console.log(`   Status: ${order.status}`);
      console.log(`   Created: ${order.createdAt}\n`);
    });

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

checkOrders();
