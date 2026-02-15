import { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';

const mockBootstrapForCompany = jest.fn();
const mockCountActiveSellers = jest.fn();
const mockGetAsyncThreshold = jest.fn();
const mockEnqueue = jest.fn();

jest.mock('@/core/application/services/organization/seller-policy-bootstrap.service', () => ({
  __esModule: true,
  default: {
    bootstrapForCompany: (...args: any[]) => mockBootstrapForCompany(...args),
    countActiveSellers: (...args: any[]) => mockCountActiveSellers(...args),
    getAsyncThreshold: (...args: any[]) => mockGetAsyncThreshold(...args),
  },
}));

jest.mock('@/infrastructure/jobs/organization/seller-policy-bootstrap.job', () => ({
  __esModule: true,
  default: {
    enqueue: (...args: any[]) => mockEnqueue(...args),
  },
}));

import companyController from '@/presentation/http/controllers/organization/company.controller';

function createRes() {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
}

describe('company.controller bootstrapSellerPolicies', () => {
  const adminUser = {
    _id: new mongoose.Types.ObjectId().toString(),
    role: 'admin',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAsyncThreshold.mockReturnValue(100);
  });

  it('runs sync bootstrap when active sellers are below threshold', async () => {
    const companyId = new mongoose.Types.ObjectId().toString();
    const req = {
      params: { companyId },
      body: {},
      user: adminUser,
    } as unknown as Request;
    const res = createRes();
    const next = jest.fn() as NextFunction;

    mockCountActiveSellers.mockResolvedValue(12);
    mockBootstrapForCompany.mockResolvedValue({
      companyId,
      totalSellers: 12,
      created: 10,
      skipped: 2,
      errors: [],
    });

    await companyController.bootstrapSellerPolicies(req, res, next);

    expect(mockBootstrapForCompany).toHaveBeenCalledWith(
      companyId,
      adminUser._id,
      { preserveExisting: true }
    );
    expect(mockEnqueue).not.toHaveBeenCalled();
    expect((res.status as any)).toHaveBeenCalledWith(200);
    expect((res.json as any)).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          queued: false,
          created: 10,
          skipped: 2,
        }),
      })
    );
  });

  it('queues async bootstrap when active sellers meet threshold', async () => {
    const companyId = new mongoose.Types.ObjectId().toString();
    const req = {
      params: { companyId },
      body: {},
      user: adminUser,
    } as unknown as Request;
    const res = createRes();
    const next = jest.fn() as NextFunction;

    mockCountActiveSellers.mockResolvedValue(120);
    mockEnqueue.mockResolvedValue(undefined);

    await companyController.bootstrapSellerPolicies(req, res, next);

    expect(mockBootstrapForCompany).not.toHaveBeenCalled();
    expect(mockEnqueue).toHaveBeenCalledWith({
      companyId,
      triggeredBy: adminUser._id,
      preserveExisting: true,
    });
    expect((res.status as any)).toHaveBeenCalledWith(200);
    expect((res.json as any)).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          queued: true,
          totalSellers: 120,
        }),
      })
    );
  });

  it('rejects non-admin users', async () => {
    const req = {
      params: { companyId: new mongoose.Types.ObjectId().toString() },
      body: {},
      user: { _id: adminUser._id, role: 'seller' },
    } as unknown as Request;
    const res = createRes();
    const next = jest.fn() as NextFunction;

    await companyController.bootstrapSellerPolicies(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'AUTHZ_FORBIDDEN',
      })
    );
  });

  it('rejects invalid company id', async () => {
    const req = {
      params: { companyId: 'invalid-id' },
      body: {},
      user: adminUser,
    } as unknown as Request;
    const res = createRes();
    const next = jest.fn() as NextFunction;

    await companyController.bootstrapSellerPolicies(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'VAL_INVALID_INPUT',
      })
    );
  });
});
