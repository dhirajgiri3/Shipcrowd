/**
 * Export Controller
 * 
 * Handles export requests for CSV, Excel, and PDF formats.
 */

import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../../middleware/auth/auth.js';
import { guardChecks } from '../../../../shared/helpers/controller.helpers.js';
import { sendSuccess, sendError } from '../../../../shared/utils/responseHelper.js';
import logger from '../../../../shared/logger/winston.logger.js';
import Order from '../../../../infrastructure/database/mongoose/models/Order.js';
import Shipment from '../../../../infrastructure/database/mongoose/models/Shipment.js';
import CSVExportService from '../../../../shared/services/export/CSVExportService.js';
import ExcelExportService from '../../../../shared/services/export/ExcelExportService.js';
import PDFExportService from '../../../../shared/services/export/PDFExportService.js';
import CloudinaryStorageService from '../../../../infrastructure/storage/CloudinaryStorageService.js';
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

/**
 * Export to CSV
 * @route POST /api/v1/export/csv
 */
export const exportToCSV = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const auth = guardChecks(req, res, { requireCompany: true });
        if (!auth) return;

        const validation = exportRequestSchema.safeParse(req.body);
        if (!validation.success) {
            sendError(res, validation.error.errors[0].message, 400, 'VALIDATION_ERROR');
            return;
        }

        const { dataType, filters } = validation.data;
        const data = await fetchData(auth.companyId!, dataType, filters);

        if (data.length === 0) {
            sendError(res, 'No data to export', 400, 'NO_DATA');
            return;
        }

        const columns = dataType === 'orders'
            ? CSVExportService.getOrderColumns()
            : CSVExportService.getShipmentColumns();

        const buffer = await CSVExportService.exportToCSV(data, columns);
        const filename = `${dataType}_export_${Date.now()}.csv`;

        // Upload to Cloudinary if configured, otherwise stream directly
        if (CloudinaryStorageService.isConfigured()) {
            const result = await CloudinaryStorageService.uploadFile(buffer, filename, 'csv');
            sendSuccess(res, {
                downloadUrl: result.secureUrl,
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
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const auth = guardChecks(req, res, { requireCompany: true });
        if (!auth) return;

        const validation = exportRequestSchema.safeParse(req.body);
        if (!validation.success) {
            sendError(res, validation.error.errors[0].message, 400, 'VALIDATION_ERROR');
            return;
        }

        const { dataType, filters } = validation.data;
        const data = await fetchData(auth.companyId!, dataType, filters);

        if (data.length === 0) {
            sendError(res, 'No data to export', 400, 'NO_DATA');
            return;
        }

        const columns = dataType === 'orders'
            ? ExcelExportService.getOrderColumns()
            : ExcelExportService.getShipmentColumns();
        const buffer = await ExcelExportService.exportToExcel(data, columns, {
            title: `${dataType.charAt(0).toUpperCase() + dataType.slice(1)} Report`,
            sheetName: dataType.charAt(0).toUpperCase() + dataType.slice(1)
        });

        const filename = `${dataType}_export_${Date.now()}.xlsx`;

        if (CloudinaryStorageService.isConfigured()) {
            const result = await CloudinaryStorageService.uploadFile(buffer, filename, 'xlsx');
            sendSuccess(res, {
                downloadUrl: result.secureUrl,
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
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const auth = guardChecks(req, res, { requireCompany: true });
        if (!auth) return;

        const validation = exportRequestSchema.safeParse(req.body);
        if (!validation.success) {
            sendError(res, validation.error.errors[0].message, 400, 'VALIDATION_ERROR');
            return;
        }

        const { dataType, filters } = validation.data;
        const data = await fetchData(auth.companyId!, dataType, filters);

        if (data.length === 0) {
            sendError(res, 'No data to export', 400, 'NO_DATA');
            return;
        }

        const columns = dataType === 'orders'
            ? PDFExportService.getOrderColumns()
            : PDFExportService.getShipmentColumns();
        const buffer = await PDFExportService.exportToPDF(data, columns, {
            title: `${dataType.charAt(0).toUpperCase() + dataType.slice(1)} Report`,
            subtitle: `Generated for your company`
        });

        const filename = `${dataType}_export_${Date.now()}.pdf`;

        if (CloudinaryStorageService.isConfigured()) {
            const result = await CloudinaryStorageService.uploadFile(buffer, filename, 'pdf');
            sendSuccess(res, {
                downloadUrl: result.secureUrl,
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

    if (dataType === 'orders') {
        const orders = await Order.find(query)
            .sort({ createdAt: -1 })
            .limit(10000)
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
            .limit(10000)
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
