import CODRemittanceService from '../../../../src/core/application/services/finance/cod-remittance.service';
import CODRemittance from '../../../../src/infrastructure/database/mongoose/models/finance/payouts/cod-remittance.model';

jest.mock('../../../../src/core/application/services/system/mock-data.service', () => ({
  __esModule: true,
  default: {
    simulateDelay: jest.fn(),
    generateSettlement: jest.fn(),
    generatePayoutStatus: jest.fn(),
  },
}));

const CODRemittanceJob = require('../../../../src/infrastructure/jobs/finance/cod-remittance.job').default;

describe('CODRemittanceJob.runAutoPayouts', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should throw when all auto-payout attempts fail', async () => {
    jest.spyOn(CODRemittance, 'find').mockReturnValue({
      limit: jest.fn().mockResolvedValue([
        { remittanceId: 'REM-1' },
        { remittanceId: 'REM-2' },
      ]),
    } as any);

    jest
      .spyOn(CODRemittanceService, 'initiatePayout')
      .mockRejectedValue(new Error('Cannot find module'));

    await expect((CODRemittanceJob as any).runAutoPayouts()).rejects.toThrow(
      'Auto-payout failed for all 2 approved remittances'
    );
  });

  it('should not throw when at least one payout succeeds', async () => {
    jest.spyOn(CODRemittance, 'find').mockReturnValue({
      limit: jest.fn().mockResolvedValue([
        { remittanceId: 'REM-1' },
        { remittanceId: 'REM-2' },
      ]),
    } as any);

    const payoutSpy = jest.spyOn(CODRemittanceService, 'initiatePayout');
    payoutSpy.mockRejectedValueOnce(new Error('temporary failure'));
    payoutSpy.mockResolvedValueOnce({
      success: true,
      status: 'processing',
      razorpayPayoutId: 'pout_123',
    });

    await expect((CODRemittanceJob as any).runAutoPayouts()).resolves.toBeUndefined();
  });
});
