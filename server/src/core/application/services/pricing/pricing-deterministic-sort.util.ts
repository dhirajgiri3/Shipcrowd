import { IServiceRateCard } from '@/infrastructure/database/mongoose/models/logistics/shipping/configuration/service-rate-card.model';

type RateCardForSort = Pick<IServiceRateCard, 'effectiveDates' | 'createdAt'>;

const toEpoch = (value: Date | string | undefined): number => {
    if (!value) return 0;
    const date = value instanceof Date ? value : new Date(value);
    const time = date.getTime();
    return Number.isFinite(time) ? time : 0;
};

/**
 * Deterministic comparator stub for active/effective rate cards.
 * This is introduced as non-functional plumbing and will be wired in selection logic in follow-up PRs.
 */
export const compareRateCardsDeterministically = (
    a: RateCardForSort,
    b: RateCardForSort
): number => {
    const startDiff = toEpoch(b.effectiveDates?.startDate as Date | string | undefined) -
        toEpoch(a.effectiveDates?.startDate as Date | string | undefined);
    if (startDiff !== 0) return startDiff;

    return toEpoch(b.createdAt as Date | string | undefined) - toEpoch(a.createdAt as Date | string | undefined);
};

export default {
    compareRateCardsDeterministically,
};
