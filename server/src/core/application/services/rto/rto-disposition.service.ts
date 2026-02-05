/**
 * RTO Disposition Service
 *
 * Suggests and executes disposition (restock / refurb / dispose / claim) after QC.
 */

import { RTOEvent, IRTOEvent } from '../../../../infrastructure/database/mongoose/models';
import { Order } from '../../../../infrastructure/database/mongoose/models';
import RTOService from './rto.service';
import { AppError } from '../../../../shared/errors/app.error';
import logger from '../../../../shared/logger/winston.logger';
import type { RTODispositionAction } from '../../../../infrastructure/database/mongoose/models/logistics/shipping/exceptions/rto-event.model';

const COURIER_DAMAGE_INDICATORS = ['Crushed Box', 'Water Damage', 'Torn Packaging'];
const REFURB_VALUE_THRESHOLD_INR = 2000;

export interface AutoDispositionResult {
    action: RTODispositionAction;
    reason: string;
    automated: boolean;
}

export class RTODispositionService {
    /**
     * Suggest disposition based on QC result and order value.
     */
    static async suggestDisposition(rtoEventId: string): Promise<AutoDispositionResult> {
        const rtoEvent = await RTOEvent.findById(rtoEventId)
            .populate('order')
            .lean();

        if (!rtoEvent) {
            throw new AppError('RTO event not found', 'RTO_NOT_FOUND', 404);
        }

        if (rtoEvent.returnStatus !== 'qc_completed') {
            throw new AppError(
                'Disposition can only be suggested after QC is completed',
                'INVALID_RTO_STATUS',
                400
            );
        }

        const qc = rtoEvent.qcResult;
        if (!qc) {
            return {
                action: 'dispose',
                reason: 'No QC result – default to dispose',
                automated: true,
            };
        }

        if (qc.passed) {
            return {
                action: 'restock',
                reason: 'QC passed – product in good condition',
                automated: true,
            };
        }

        const damageTypes = (qc.damageTypes ?? []).map((s: string) => s.trim());
        const isLikelyCourierDamage = COURIER_DAMAGE_INDICATORS.some((d) =>
            damageTypes.some((t) => t.toLowerCase().includes(d.toLowerCase()))
        );

        if (isLikelyCourierDamage) {
            return {
                action: 'claim',
                reason: 'Damage consistent with courier handling – recommend filing claim',
                automated: true,
            };
        }

        const order = await Order.findById(rtoEvent.order).select('totals products').lean();
        const orderValue =
            (order as any)?.totals?.total ??
            (Array.isArray((order as any)?.products)
                ? (order as any).products.reduce((s: number, p: any) => s + (p.price || 0) * (p.quantity || 1), 0)
                : 0);
        const valueNum = Number(orderValue) || 0;

        if (valueNum >= REFURB_VALUE_THRESHOLD_INR) {
            return {
                action: 'refurb',
                reason: `High value (₹${valueNum}) – refurbishment may be cost-effective`,
                automated: true,
            };
        }

        return {
            action: 'dispose',
            reason: 'QC failed and refurb not recommended – dispose',
            automated: true,
        };
    }

    /**
     * Execute disposition: update status and optionally run restock.
     */
    static async executeDisposition(
        rtoEventId: string,
        action: RTODispositionAction,
        performedBy: string,
        options?: { notes?: string; reason?: string }
    ): Promise<IRTOEvent> {
        const rtoEvent = await RTOEvent.findById(rtoEventId);

        if (!rtoEvent) {
            throw new AppError('RTO event not found', 'RTO_NOT_FOUND', 404);
        }

        if (rtoEvent.returnStatus !== 'qc_completed') {
            throw new AppError(
                'Disposition can only be executed when status is qc_completed',
                'INVALID_RTO_STATUS',
                400
            );
        }

        if (rtoEvent.disposition) {
            throw new AppError(
                'Disposition already recorded for this RTO',
                'DISPOSITION_ALREADY_SET',
                400
            );
        }

        const disposition = {
            action,
            decidedAt: new Date(),
            decidedBy: performedBy,
            automated: false,
            reason: options?.reason,
            notes: options?.notes,
        };

        switch (action) {
            case 'restock':
                if (!rtoEvent.qcResult?.passed) {
                    throw new AppError(
                        'Cannot restock when QC did not pass',
                        'QC_NOT_PASSED',
                        400
                    );
                }
                await RTOService.performRestock(rtoEventId, performedBy);
                await rtoEvent.updateReturnStatus('restocked');
                break;

            case 'refurb':
                await rtoEvent.updateReturnStatus('refurbishing');
                logger.info('RTO marked for refurbishment', { rtoEventId, performedBy });
                break;

            case 'dispose':
                await rtoEvent.updateReturnStatus('disposed');
                break;

            case 'claim':
                await rtoEvent.updateReturnStatus('claim_filed');
                logger.info('RTO marked as claim filed', { rtoEventId, performedBy });
                break;

            default:
                throw new AppError(`Unknown disposition action: ${action}`, 'INVALID_ACTION', 400);
        }

        await RTOEvent.findByIdAndUpdate(rtoEventId, { $set: { disposition } });
        const updated = await RTOEvent.findById(rtoEventId);
        if (!updated) throw new AppError('RTO event not found after update', 'RTO_NOT_FOUND', 404);
        return updated;
    }
}
