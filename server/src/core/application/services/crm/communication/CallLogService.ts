import CallLog, { ICallLog } from '@/infrastructure/database/mongoose/models/crm/communication/call-log.model';
import SalesRepresentative from '@/infrastructure/database/mongoose/models/crm/sales/sales-representative.model';
import { NotFoundError } from '@/shared/errors/app.error';
import logger from '@/shared/logger/winston.logger';
import mongoose from 'mongoose';

interface CreateCallLogDTO {
    companyId: string;
    shipmentId: string;
    ndrEventId?: string;
    direction?: 'outbound' | 'inbound';
    scheduledAt?: Date;
    notes?: string;
}

class CallLogService {
    private static instance: CallLogService;

    private constructor() { }

    public static getInstance(): CallLogService {
        if (!CallLogService.instance) {
            CallLogService.instance = new CallLogService();
        }
        return CallLogService.instance;
    }

    /**
     * Create a new Call Log and assign to a Sales Rep
     */
    public async createCallLog(data: CreateCallLogDTO): Promise<ICallLog> {
        // 1. Find an available sales rep
        const salesRep = await this.findAvailableRep(data.companyId);

        if (!salesRep) {
            logger.warn(`No available sales rep found for company ${data.companyId}. Creating unassigned or assigning to default fallback.`);
            // For now, fail if no rep found, or we could have a 'Pending Assignment' queue.
            // Let's assume we must have at least one rep.
            // Or we could pick ANY rep even if busy, just to assign.
            // Let's implement robust finding logic below.
        }

        // 2. Create the log
        const callLog = await CallLog.create({
            companyId: new mongoose.Types.ObjectId(data.companyId),
            salesRepId: salesRep?._id, // Might be undefined if logic allows, but schema says required.
            shipmentId: data.shipmentId,
            ndrEventId: data.ndrEventId ? new mongoose.Types.ObjectId(data.ndrEventId) : undefined,
            direction: data.direction || 'outbound',
            status: data.scheduledAt ? 'scheduled' : 'pending',
            scheduledAt: data.scheduledAt,
            notes: data.notes
        });

        logger.info(`CallLog created: ${callLog._id} assigned to ${salesRep?.name || 'Unknown'}`);
        return callLog;
    }

    /**
     * Find best available Sales Rep
     * Strategy:
     * 1. Active & Available status
     * 2. Least number of pending calls today
     * 3. Fallback: Any active rep
     */
    private async findAvailableRep(companyId: string): Promise<any> {
        const companyObjectId = new mongoose.Types.ObjectId(companyId);

        // Try direct available
        // Note: The active SalesRepresentative model uses 'company' (ref) not 'companyId'
        // and does NOT track availabilityStatus (busy/offline) in the schema yet.
        // So we just find any ACTIVE rep.

        // Improve: Add load balancing later.
        const anyRep = await SalesRepresentative.findOne({
            company: companyObjectId,
            status: 'active'
        });

        if (!anyRep) {
            throw new NotFoundError('No active Sales Representatives found for this company');
        }

        return anyRep;
    }

    /**
     * Update call log status/outcome
     */
    public async updateCallOutcome(
        callLogId: string,
        outcome: ICallLog['outcome'],
        notes?: string,
        duration?: number
    ): Promise<ICallLog | null> {
        const update: any = { outcome, status: 'completed' };
        if (notes) update.notes = notes;
        if (duration) update.duration = duration;
        update.endedAt = new Date();

        const log = await CallLog.findByIdAndUpdate(
            callLogId,
            update,
            { new: true }
        );

        if (!log) throw new NotFoundError('Call Log not found');
        return log;
    }

    /**
     * Get logs for a Rep
     */
    public async getLogsForRep(salesRepId: string, status?: string) {
        const query: any = { salesRepId: new mongoose.Types.ObjectId(salesRepId) };
        if (status) query.status = status;

        return CallLog.find(query).sort({ scheduledAt: 1, createdAt: -1 });
    }
}

export default CallLogService;
