/**
 * Export Controller
 * 
 * Handles export requests for CSV, Excel, and PDF formats.
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { guardChecks } from '../../../../shared/helpers/controller.helpers';
import { sendSuccess } from '../../../../shared/utils/responseHelper';
import { ValidationError, NotFoundError } from '../../../../shared/errors/app.error';
import { ErrorCode } from '../../../../shared/errors/errorCodes';
import logger from '../../../../shared/logger/winston.logger';
import { Order } from '../../../../infrastructure/database/mongoose/models';
import { Shipment } from '../../../../infrastructure/database/mongoose/models';
import CSVExportService from '../../../../core/application/services/analytics/export/csv-export.service';
import ExcelExportService from '../../../../core/application/services/analytics/export/excel-export.service';
import PDFExportService from '../../../../core/application/services/analytics/export/pdf-export.service';
import StorageService from '../../../../core/application/services/storage/storage.service';
import mongoose from 'mongoose';

// Validation schema for export requests
const exportRequestSchema = z.object({
    dataType: z.enum(['orders', 'shipments']),
    filters: z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        status: z.array(z.string()).optional()
    }).optional()
});

type ExportRequestBody = z.infer<typeof exportRequestSchema>;

const isSpacesConfigured = () => {
    return process.env.SPACES_ENDPOINT &&
        process.env.SPACES_ACCESS_KEY &&
        process.env.SPACES_SECRET_KEY &&
        process.env.SPACES_BUCKET;
};

/**
 * Export to CSV
 * @route POST /api/v1/export/csv
 */
export const exportToCSV = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const auth = guardChecks(req, { requireCompany: true });

        const validation = exportRequestSchema.safeParse(req.body);
        if (!validation.success) {
            throw new ValidationError(validation.error.errors[0].message);
        }

        const { dataType, filters } = validation.data;
        const data = await fetchData(auth.companyId!, dataType, filters);

        if (data.length === 0) {
            throw new NotFoundError('No data to export', ErrorCode.BIZ_NOT_FOUND);
        }

        const columns = dataType === 'orders'
            ? CSVExportService.getOrderColumns()
            : CSVExportService.getShipmentColumns();

        const buffer = await CSVExportService.exportToCSV(data, columns);
        const filename = `${dataType}_export_${Date.now()}.csv`;

        // Upload to Spaces if configured, otherwise stream directly
        if (isSpacesConfigured()) {
            const key = `exports/${auth.companyId}/${filename}`;
            await StorageService.upload(buffer, {
                folder: `exports/${auth.companyId}`,
                fileName: filename,
                contentType: 'text/csv'
            });

            // Generate signed URL
            const signedUrl = await StorageService.getFileUrl(key);
            const expiresAt = new Date(Date.now() + 86400 * 1000); // 24 hours

            sendSuccess(res, {
                downloadUrl: signedUrl,
                expiresAt: expiresAt.toISOString(),
                filename,
                format: 'csv',
                recordCount: data.length
            }, 'Export generated successfully');
        } else {
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.send(buffer);
        }
    } catch (error) {
        logger.error('Error exporting to CSV:', error);
        next(error);
    }
};

/**
 * Export to Excel
 * @route POST /api/v1/export/excel
 */
export const exportToExcel = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const auth = guardChecks(req, { requireCompany: true });

        const validation = exportRequestSchema.safeParse(req.body);
        if (!validation.success) {
            throw new ValidationError(validation.error.errors[0].message);
        }

        const { dataType, filters } = validation.data;
        const data = await fetchData(auth.companyId!, dataType, filters);

        if (data.length === 0) {
            throw new NotFoundError('No data to export', ErrorCode.BIZ_NOT_FOUND);
        }

        const columns = dataType === 'orders'
            ? ExcelExportService.getOrderColumns()
            : ExcelExportService.getShipmentColumns();
        const buffer = await ExcelExportService.exportToExcel(data, columns, {
            title: `${dataType.charAt(0).toUpperCase() + dataType.slice(1)} Report`,
            sheetName: dataType.charAt(0).toUpperCase() + dataType.slice(1)
        });

        const filename = `${dataType}_export_${Date.now()}.xlsx`;

        if (isSpacesConfigured()) {
            const key = `exports/${auth.companyId}/${filename}`;
            await StorageService.upload(buffer, {
                folder: `exports/${auth.companyId}`,
                fileName: filename,
                contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            });

            // Generate signed URL
            const signedUrl = await StorageService.getFileUrl(key);
            const expiresAt = new Date(Date.now() + 86400 * 1000);

            sendSuccess(res, {
                downloadUrl: signedUrl,
                expiresAt: expiresAt.toISOString(),
                filename,
                format: 'xlsx',
                recordCount: data.length
            }, 'Export generated successfully');
        } else {
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.send(buffer);
        }
    } catch (error) {
        logger.error('Error exporting to Excel:', error);
        next(error);
    }
};

/**
 * Export to PDF
 * @route POST /api/v1/export/pdf
 */
export const exportToPDF = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const auth = guardChecks(req, { requireCompany: true });

        const validation = exportRequestSchema.safeParse(req.body);
        if (!validation.success) {
            throw new ValidationError(validation.error.errors[0].message);
        }

        const { dataType, filters } = validation.data;
        const data = await fetchData(auth.companyId!, dataType, filters);

        if (data.length === 0) {
            throw new NotFoundError('No data to export', ErrorCode.BIZ_NOT_FOUND);
        }

        const columns = dataType === 'orders'
            ? PDFExportService.getOrderColumns()
            : PDFExportService.getShipmentColumns();
        const buffer = await PDFExportService.exportToPDF(data, columns, {
            title: `${dataType.charAt(0).toUpperCase() + dataType.slice(1)} Report`,
            subtitle: `Generated for your company`
        });

        const filename = `${dataType}_export_${Date.now()}.pdf`;

        if (isSpacesConfigured()) {
            const key = `exports/${auth.companyId}/${filename}`;
            await StorageService.upload(buffer, {
                folder: `exports/${auth.companyId}`,
                fileName: filename,
                contentType: 'application/pdf'
            });

            // Generate signed URL
            const signedUrl = await StorageService.getFileUrl(key);
            const expiresAt = new Date(Date.now() + 86400 * 1000);

            sendSuccess(res, {
                downloadUrl: signedUrl,
                expiresAt: expiresAt.toISOString(),
                filename,
                format: 'pdf',
                recordCount: data.length
            }, 'Export generated successfully');
        } else {
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.send(buffer);
        }
    } catch (error) {
        logger.error('Error exporting to PDF:', error);
        next(error);
    }
};

/**
 * Fetch data for export based on type and filters
 */
async function fetchData(
    companyId: string,
    dataType: 'orders' | 'shipments',
    filters?: ExportRequestBody['filters']
): Promise<any[]> {
    const MAX_EXPORT_RECORDS = 10000;
    const companyObjectId = new mongoose.Types.ObjectId(companyId);
    const query: any = { companyId: companyObjectId, isDeleted: false };

    if (filters?.startDate && filters?.endDate) {
        query.createdAt = {
            $gte: new Date(filters.startDate),
            $lte: new Date(filters.endDate)
        };
    }

    if (filters?.status?.length) {
        query.currentStatus = { $in: filters.status };
    }

    // Check total count before fetching to warn user if truncation will occur
    const Model = dataType === 'orders' ? Order : Shipment;
    const totalCount = await Model.countDocuments(query);

    if (totalCount > MAX_EXPORT_RECORDS) {
        logger.warn('Export exceeds limit', {
            companyId,
            dataType,
            totalCount,
            limit: MAX_EXPORT_RECORDS
        });
        throw new Error(
            `Export contains ${totalCount} records, which exceeds the maximum of ${MAX_EXPORT_RECORDS}. ` +
            `Please apply filters to reduce the dataset size.`
        );
    }

    if (dataType === 'orders') {
        const orders = await Order.find(query)
            .sort({ createdAt: -1 })
            .limit(MAX_EXPORT_RECORDS)
            .lean();

        return orders.map((o: any) => ({
            orderNumber: o.orderNumber,
            customerName: o.customerInfo?.name || '',
            customerPhone: o.customerInfo?.phone || '',
            currentStatus: o.currentStatus,
            paymentMethod: o.paymentMethod,
            total: o.totals?.total || 0,
            createdAt: o.createdAt
        }));
    } else {
        const shipments = await Shipment.find(query)
            .sort({ createdAt: -1 })
            .limit(MAX_EXPORT_RECORDS)
            .lean();

        return shipments.map((s: any) => ({
            trackingNumber: s.trackingNumber,
            carrier: s.carrier,
            currentStatus: s.currentStatus,
            createdAt: s.createdAt,
            actualDelivery: s.actualDelivery
        }));
    }
}

export default {
    exportToCSV,
    exportToExcel,
    exportToPDF
};
