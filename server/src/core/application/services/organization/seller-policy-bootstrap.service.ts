import mongoose from 'mongoose';
import {
Company,
SellerCourierPolicy,
User,
} from '../../../../infrastructure/database/mongoose/models';
import { NotFoundError, ValidationError } from '../../../../shared/errors/app.error';
import { ErrorCode } from '../../../../shared/errors/errorCodes';
import logger from '../../../../shared/logger/winston.logger';
import CourierProviderRegistry from '../courier/courier-provider-registry';

export interface SellerPolicyBootstrapOptions {
    preserveExisting?: boolean;
}

export interface SellerPolicyBootstrapResult {
    companyId: string;
    totalSellers: number;
    created: number;
    skipped: number;
    errors: string[];
}

class SellerPolicyBootstrapService {
    static readonly ASYNC_THRESHOLD = 100;

    getAsyncThreshold(): number {
        return SellerPolicyBootstrapService.ASYNC_THRESHOLD;
    }

    async countActiveSellers(companyId: string): Promise<number> {
        this.assertObjectId(companyId, 'Invalid company ID format');

        return User.countDocuments({
            companyId: new mongoose.Types.ObjectId(companyId),
            role: 'seller',
            isActive: true,
            isDeleted: false,
        });
    }

    async bootstrapForCompany(
        companyId: string,
        triggeredBy: string,
        options: SellerPolicyBootstrapOptions = {}
    ): Promise<SellerPolicyBootstrapResult> {
        this.assertObjectId(companyId, 'Invalid company ID format');

        const preserveExisting = options.preserveExisting !== false;
        const companyObjectId = new mongoose.Types.ObjectId(companyId);

        const company = await Company.findOne({
            _id: companyObjectId,
            isDeleted: false,
        })
            .select('_id')
            .lean();

        if (!company) {
            throw new NotFoundError('Company', ErrorCode.RES_COMPANY_NOT_FOUND);
        }

        const sellers = await User.find({
            companyId: companyObjectId,
            role: 'seller',
            isActive: true,
            isDeleted: false,
        })
            .select('_id')
            .lean();

        if (!sellers.length) {
            return {
                companyId,
                totalSellers: 0,
                created: 0,
                skipped: 0,
                errors: [],
            };
        }

        const updatedBy = this.toObjectIdOrNull(triggeredBy);
        const now = new Date();
        const allowedProviders = [...CourierProviderRegistry.getSupportedProviders()];

        const operations = sellers.map((seller) => {
            const sellerId = new mongoose.Types.ObjectId(String(seller._id));
            const filter = {
                companyId: companyObjectId,
                sellerId,
            };

            if (preserveExisting) {
                return {
                    updateOne: {
                        filter,
                        update: {
                            $setOnInsert: {
                                companyId: companyObjectId,
                                sellerId,
                                allowedProviders,
                                allowedServiceIds: [],
                                blockedProviders: [],
                                blockedServiceIds: [],
                                rateCardType: 'default',
                                rateCardCategory: 'default',
                                selectionMode: 'manual_with_recommendation',
                                autoPriority: 'balanced',
                                balancedDeltaPercent: 5,
                                isActive: true,
                                metadata: {
                                    notes: 'Auto-bootstrapped from migration',
                                    updatedBy: updatedBy || undefined,
                                    lastEvaluatedAt: now,
                                },
                            },
                        },
                        upsert: true,
                    },
                };
            }

            return {
                updateOne: {
                    filter,
                    update: {
                        $set: {
                            companyId: companyObjectId,
                            sellerId,
                            allowedProviders,
                            allowedServiceIds: [],
                            blockedProviders: [],
                            blockedServiceIds: [],
                            rateCardType: 'default',
                            rateCardCategory: 'default',
                            selectionMode: 'manual_with_recommendation',
                            autoPriority: 'balanced',
                            balancedDeltaPercent: 5,
                            isActive: true,
                            metadata: {
                                notes: 'Auto-bootstrapped from migration',
                                updatedBy: updatedBy || undefined,
                                lastEvaluatedAt: now,
                            },
                        },
                    },
                    upsert: true,
                },
            };
        });

        const result = await SellerCourierPolicy.bulkWrite(operations as any, {
            ordered: false,
        });

        const created = Number(result.upsertedCount || 0);
        const skipped = Math.max(0, sellers.length - created);

        logger.info('Seller courier policy bootstrap completed', {
            companyId,
            totalSellers: sellers.length,
            created,
            skipped,
            preserveExisting,
        });

        return {
            companyId,
            totalSellers: sellers.length,
            created,
            skipped,
            errors: [],
        };
    }

    private assertObjectId(value: string, message: string): void {
        if (!mongoose.Types.ObjectId.isValid(value)) {
            throw new ValidationError(message, ErrorCode.VAL_INVALID_INPUT);
        }
    }

    private toObjectIdOrNull(value: string): mongoose.Types.ObjectId | null {
        if (!mongoose.Types.ObjectId.isValid(value)) {
            return null;
        }
        return new mongoose.Types.ObjectId(value);
    }
}

export default new SellerPolicyBootstrapService();
