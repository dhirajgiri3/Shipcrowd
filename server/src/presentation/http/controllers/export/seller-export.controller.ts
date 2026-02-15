import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import SellerExportService, { SellerExportModule } from '../../../../core/application/services/export/seller-export.service';
import { ValidationError } from '../../../../shared/errors/app.error';
import { guardChecks, requireCompanyContext } from '../../../../shared/helpers/controller.helpers';
import { isCompanyAdmin, isCompanyOwner } from '../../../../shared/utils/role-helpers';

const exportSchema = z.object({
  module: z.enum([
    'orders',
    'shipments',
    'cod_remittance_pending',
    'cod_remittance_history',
    'wallet_transactions',
    'returns',
    'ndr',
    'rto',
    'cod_discrepancies',
    'audit_logs',
    'analytics_dashboard',
    'pincode_checker',
    'bulk_address_validation',
  ]),
  filters: z.record(z.unknown()).optional(),
});

export const exportSellerModule = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const auth = guardChecks(req);
    requireCompanyContext(auth);

    const parsed = exportSchema.safeParse(req.body);
    if (!parsed.success) {
      const details = parsed.error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }));
      throw new ValidationError('Validation failed', details);
    }

    const module: SellerExportModule = parsed.data.module;
    const filters = parsed.data.filters || {};

    const user: any = req.user || {};
    const canViewPii = isCompanyOwner(user) || isCompanyAdmin(user);

    const { csv, filename, rowCount } = await SellerExportService.generateCSV(module, filters, {
      companyId: auth.companyId,
      canViewPii,
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('X-Export-Module', module);
    res.setHeader('X-Export-Row-Count', String(rowCount));
    res.setHeader('X-Export-Pii-Masked', String(!canViewPii));
    res.status(200).send(csv);
  } catch (error) {
    next(error);
  }
};

const sellerExportController = {
  exportSellerModule,
};

export default sellerExportController;
