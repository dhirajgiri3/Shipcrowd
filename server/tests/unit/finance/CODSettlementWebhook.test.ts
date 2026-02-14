import mongoose from 'mongoose';
import { CODRemittanceService } from '../../../src/core/application/services/finance/cod-remittance.service';
import { Shipment } from '../../../src/infrastructure/database/mongoose/models';
import CODRemittance from '../../../src/infrastructure/database/mongoose/models/finance/payouts/cod-remittance.model';

jest.mock('../../../src/infrastructure/database/mongoose/models', () => ({
  Shipment: {
    find: jest.fn(),
  },
  SellerBankAccount: {},
}));

jest.mock('../../../src/infrastructure/database/mongoose/models/finance/payouts/cod-remittance.model', () => ({
  __esModule: true,
  default: {
    find: jest.fn(),
  },
}));

jest.mock('../../../src/core/application/services/communication/email.service', () => ({
  __esModule: true,
  default: {
    sendOperationalAlert: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../../../src/core/application/services/communication/email.service.js', () => ({
  __esModule: true,
  default: {
    sendOperationalAlert: jest.fn().mockResolvedValue(undefined),
  },
}), { virtual: true });

describe('COD Settlement Webhook Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reconciles shipments and updates related remittance batches', async () => {
    const companyId = new mongoose.Types.ObjectId();
    const shipment1Id = new mongoose.Types.ObjectId();
    const shipment2Id = new mongoose.Types.ObjectId();

    const shipment1 = {
      _id: shipment1Id,
      trackingNumber: 'VEL123456789',
      companyId,
      paymentDetails: { type: 'cod' },
      remittance: { included: false },
      save: jest.fn().mockResolvedValue(undefined),
    };

    const shipment2 = {
      _id: shipment2Id,
      trackingNumber: 'VEL987654321',
      companyId,
      paymentDetails: { type: 'cod' },
      remittance: { included: false },
      save: jest.fn().mockResolvedValue(undefined),
    };

    const batch = {
      _id: new mongoose.Types.ObjectId(),
      companyId,
      status: 'approved',
      shipments: [{ shipmentId: shipment1Id }, { shipmentId: shipment2Id }],
      save: jest.fn().mockResolvedValue(undefined),
    };

    (Shipment.find as jest.Mock).mockResolvedValueOnce([shipment1, shipment2]);
    (CODRemittance.find as jest.Mock).mockResolvedValueOnce([batch]);

    const result = await CODRemittanceService.handleSettlementWebhook({
      settlement_id: 'SETTLE-123',
      settlement_date: '2026-02-03T10:00:00Z',
      total_amount: 2790,
      currency: 'INR',
      utr_number: 'UTR123456',
      shipments: [
        {
          awb: 'VEL123456789',
          cod_amount: 1000,
          shipping_deduction: 50,
          cod_charge: 20,
          rto_charge: 0,
          net_amount: 930,
        },
        {
          awb: 'VEL987654321',
          cod_amount: 2000,
          shipping_deduction: 100,
          cod_charge: 40,
          rto_charge: 0,
          net_amount: 1860,
        },
      ],
    });

    expect(result.success).toBe(true);
    expect(result.reconciledBatches).toBe(1);
    expect(result.discrepancies).toHaveLength(0);
    expect(shipment1.save).toHaveBeenCalled();
    expect(shipment2.save).toHaveBeenCalled();
    expect(batch.status).toBe('settled');
    expect((batch as any).settlementDetails.settlementId).toBe('SETTLE-123');
    expect(batch.save).toHaveBeenCalled();
  });

  it('reports mismatch for already-included shipment with different remitted amount', async () => {
    const companyId = new mongoose.Types.ObjectId();
    const shipment = {
      _id: new mongoose.Types.ObjectId(),
      trackingNumber: 'VEL111222333',
      companyId,
      paymentDetails: { type: 'cod' },
      remittance: {
        included: true,
        remittedAmount: 800,
      },
      save: jest.fn().mockResolvedValue(undefined),
    };

    (Shipment.find as jest.Mock).mockResolvedValueOnce([shipment]);
    (CODRemittance.find as jest.Mock).mockResolvedValueOnce([]);

    const result = await CODRemittanceService.handleSettlementWebhook({
      settlement_id: 'SETTLE-456',
      settlement_date: '2026-02-03T10:00:00Z',
      total_amount: 1000,
      shipments: [
        {
          awb: 'VEL111222333',
          cod_amount: 1000,
          shipping_deduction: 50,
          cod_charge: 20,
          net_amount: 930,
        },
      ],
    });

    expect(result.discrepancies).toHaveLength(1);
    expect(result.discrepancies[0].awb).toBe('VEL111222333');
    expect(result.discrepancies[0].reason).toContain('Amount mismatch');
    expect(shipment.save).not.toHaveBeenCalled();
  });

  it('reports shipment not found in system', async () => {
    (Shipment.find as jest.Mock).mockResolvedValueOnce([]);
    (CODRemittance.find as jest.Mock).mockResolvedValueOnce([]);

    const result = await CODRemittanceService.handleSettlementWebhook({
      settlement_id: 'SETTLE-789',
      settlement_date: '2026-02-03T10:00:00Z',
      total_amount: 500,
      shipments: [
        {
          awb: 'NOTFOUND123',
          cod_amount: 500,
          shipping_deduction: 25,
          cod_charge: 10,
          net_amount: 465,
        },
      ],
    });

    expect(result.success).toBe(true);
    expect(result.discrepancies).toHaveLength(1);
    expect(result.discrepancies[0].reason).toBe('Shipment not found in system');
    expect(result.reconciledBatches).toBe(0);
  });
});

