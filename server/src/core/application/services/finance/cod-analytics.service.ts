import mongoose from 'mongoose';
import CODDiscrepancy from '../../../../infrastructure/database/mongoose/models/finance/cod-discrepancy.model';
import Shipment from '../../../../infrastructure/database/mongoose/models/logistics/shipping/core/shipment.model';

/**
 * COD Analytics Service
 *
 * Provides health metrics for COD operations (RTO rates, dispute rates, collection efficiency).
 * Used internally by seller analytics for courier comparison and SLA performance.
 */
export class CODAnalyticsService {

    /**
     * Get Health Metrics (Period-based)
     * RTO Rate, Dispute Rate, Collection Efficiency
     */
    static async getHealthMetrics(companyId: string, startDate: Date, endDate: Date) {
        const query = {
            companyId: new mongoose.Types.ObjectId(companyId),
            createdAt: { $gte: startDate, $lte: endDate }
        };

        // 1. Total COD Orders
        const totalOrders = await Shipment.countDocuments({ ...query, 'paymentDetails.type': 'cod' });

        if (totalOrders === 0) {
            return {
                totalOrders: 0, rtoRate: 0, disputeRate: 0, collectionRate: 0, averageRemittanceTime: 0
            };
        }

        // 2. RTO Orders
        const rtoOrders = await Shipment.countDocuments({
            ...query,
            'paymentDetails.type': 'cod',
            currentStatus: 'rto'
        });

        // 3. Disputed Shipments (using discrepancy count or collectionStatus)
        const disputedOrders = await CODDiscrepancy.countDocuments({
            companyId: new mongoose.Types.ObjectId(companyId),
            createdAt: { $gte: startDate, $lte: endDate }
        });

        // 4. Delivered & Remitted
        const remittedOrders = await Shipment.find({
            ...query,
            'paymentDetails.collectionStatus': 'remitted'
        }, 'createdAt remittance.remittedAt');

        // 5. Avg Remittance Time
        let totalTime = 0;
        let timeCount = 0;
        remittedOrders.forEach((order: any) => {
            if (order.remittance?.remittedAt) {
                const diff = (new Date(order.remittance.remittedAt).getTime() - new Date(order.createdAt).getTime());
                totalTime += diff;
                timeCount++;
            }
        });

        const avgRemittanceTimeDays = timeCount > 0 ? (totalTime / timeCount) / (1000 * 60 * 60 * 24) : 0;

        return {
            totalOrders,
            rtoRate: parseFloat(((rtoOrders / totalOrders) * 100).toFixed(2)),
            disputeRate: parseFloat(((disputedOrders / totalOrders) * 100).toFixed(2)),
            collectionRate: parseFloat((((totalOrders - rtoOrders) / totalOrders) * 100).toFixed(2)), // Gross assumption for collections
            averageRemittanceTime: parseFloat(avgRemittanceTimeDays.toFixed(1))
        };
    }
}
