/**
 * Test script để kiểm tra Order Stats API
 * Chạy: node test-order-stats.js
 */

import mongoose from 'mongoose';
import { Order } from './src/models/order/order.model.js';
import { orderService } from './src/models/order/order.service.js';

// Kết nối MongoDB (thay đổi connection string nếu cần)
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/lmobile';

async function testOrderStats() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Test với userId cụ thể (thay đổi userId nếu cần)
    const testUserId = process.argv[2] || null;
    console.log(`\n=== Testing Order Stats for userId: ${testUserId || 'ALL'} ===\n`);

    // Đếm tổng số orders
    const totalCount = await Order.countDocuments(testUserId ? { user: testUserId } : {});
    console.log(`Total orders in DB: ${totalCount}`);

    // Đếm theo từng status
    const statusCounts = await Order.aggregate([
      { $match: testUserId ? { user: new mongoose.Types.ObjectId(testUserId) } : {} },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    console.log('\nOrders by status:');
    statusCounts.forEach(item => {
      console.log(`  ${item._id}: ${item.count}`);
    });

    // Tính tổng revenue
    const revenueStats = await Order.aggregate([
      { 
        $match: testUserId 
          ? { user: new mongoose.Types.ObjectId(testUserId) } 
          : {}
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalAmount' },
          revenueFromDelivered: {
            $sum: {
              $cond: [{ $eq: ['$status', 'delivered'] }, '$totalAmount', 0]
            }
          },
          revenueFromShipping: {
            $sum: {
              $cond: [{ $eq: ['$status', 'shipping'] }, '$totalAmount', 0]
            }
          },
          revenueFromProcessing: {
            $sum: {
              $cond: [{ $eq: ['$status', 'processing'] }, '$totalAmount', 0]
            }
          },
          revenueFromConfirmed: {
            $sum: {
              $cond: [{ $eq: ['$status', 'confirmed'] }, '$totalAmount', 0]
            }
          }
        }
      }
    ]);

    if (revenueStats.length > 0) {
      console.log('\nRevenue stats:');
      console.log(`  Total revenue (all orders): ${revenueStats[0].totalRevenue}`);
      console.log(`  Revenue from delivered: ${revenueStats[0].revenueFromDelivered}`);
      console.log(`  Revenue from shipping: ${revenueStats[0].revenueFromShipping}`);
      console.log(`  Revenue from processing: ${revenueStats[0].revenueFromProcessing}`);
      console.log(`  Revenue from confirmed: ${revenueStats[0].revenueFromConfirmed}`);
    }

    // Gọi service getOrderStats
    console.log('\n=== Calling orderService.getOrderStats() ===');
    const stats = await orderService.getOrderStats(testUserId);
    console.log('\nStats returned:');
    console.log(JSON.stringify(stats, null, 2));

    // Verify
    console.log('\n=== Verification ===');
    const sumOfStatuses = (stats.pendingOrders || 0) + 
                         (stats.confirmedOrders || 0) + 
                         (stats.processingOrders || 0) + 
                         (stats.shippingOrders || 0) + 
                         (stats.deliveredOrders || 0) + 
                         (stats.cancelledOrders || 0) + 
                         (stats.returnedOrders || 0);
    
    console.log(`Total orders: ${stats.totalOrders}`);
    console.log(`Sum of statuses: ${sumOfStatuses}`);
    console.log(`Match: ${stats.totalOrders === sumOfStatuses ? '✓ OK' : '✗ MISMATCH'}`);
    console.log(`Total revenue: ${stats.totalRevenue}`);

    await mongoose.disconnect();
    console.log('\nTest completed!');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testOrderStats();

