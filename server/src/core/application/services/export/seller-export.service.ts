import mongoose from 'mongoose';
import { Parser } from 'json2csv';
import {
  AuditLog,
  CODRemittance,
  NDREvent,
  Order,
  RTOEvent,
  Shipment,
  WalletTransaction,
} from '../../../../infrastructure/database/mongoose/models';
import CODDiscrepancy from '../../../../infrastructure/database/mongoose/models/finance/cod-discrepancy.model';
import ReturnOrder from '../../../../infrastructure/database/mongoose/models/logistics/returns/return-order.model';

export type SellerExportModule =
  | 'orders'
  | 'shipments'
  | 'cod_remittance_pending'
  | 'cod_remittance_history'
  | 'wallet_transactions'
  | 'returns'
  | 'ndr'
  | 'rto'
  | 'cod_discrepancies'
  | 'audit_logs'
  | 'analytics_dashboard';

interface ExportContext {
  companyId: string;
  canViewPii: boolean;
}

const MAX_EXPORT_ROWS = 500000;

const maskPhone = (value?: string): string => {
  if (!value) return '';
  const last4 = value.slice(-4);
  return `******${last4}`;
};

const maskEmail = (value?: string): string => {
  if (!value) return '';
  const [local, domain] = value.split('@');
  if (!domain) return '***';
  const prefix = (local || '').slice(0, 2);
  return `${prefix}***@${domain}`;
};

const maskName = (value?: string): string => {
  if (!value) return '';
  return `${value.slice(0, 1)}***`;
};

const maybeMask = (value: string, kind: 'phone' | 'email' | 'name', canViewPii: boolean): string => {
  if (canViewPii) return value;
  if (kind === 'phone') return maskPhone(value);
  if (kind === 'email') return maskEmail(value);
  return maskName(value);
};

const regex = (value?: unknown): RegExp | undefined => {
  if (!value || typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return new RegExp(trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
};

const parseDate = (value?: unknown): Date | undefined => {
  if (!value || typeof value !== 'string') return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date;
};

const ensureLimit = <T>(rows: T[]): T[] => rows.slice(0, MAX_EXPORT_ROWS);

export class SellerExportService {
  static async generateCSV(module: SellerExportModule, filters: Record<string, unknown>, context: ExportContext): Promise<{ filename: string; csv: string; rowCount: number }> {
    let rows: Record<string, unknown>[] = [];

    switch (module) {
      case 'orders':
        rows = await this.exportOrders(filters, context);
        break;
      case 'shipments':
        rows = await this.exportShipments(filters, context.companyId);
        break;
      case 'cod_remittance_pending':
        rows = await this.exportCodPending(filters, context.companyId);
        break;
      case 'cod_remittance_history':
        rows = await this.exportCodHistory(filters, context.companyId);
        break;
      case 'wallet_transactions':
        rows = await this.exportWalletTransactions(filters, context.companyId);
        break;
      case 'returns':
        rows = await this.exportReturns(filters, context);
        break;
      case 'ndr':
        rows = await this.exportNdr(filters, context);
        break;
      case 'rto':
        rows = await this.exportRto(filters, context.companyId);
        break;
      case 'cod_discrepancies':
        rows = await this.exportCodDiscrepancies(filters, context.companyId);
        break;
      case 'audit_logs':
        rows = await this.exportAuditLogs(filters, context);
        break;
      case 'analytics_dashboard':
        rows = await this.exportAnalytics(filters, context.companyId);
        break;
      default:
        rows = [];
    }

    const safeRows = ensureLimit(rows);
    const parser = new Parser({ fields: safeRows.length > 0 ? Object.keys(safeRows[0]) : [] });
    const csv = safeRows.length > 0 ? parser.parse(safeRows) : '';
    return {
      filename: `${module}-${new Date().toISOString().slice(0, 10)}.csv`,
      csv,
      rowCount: safeRows.length,
    };
  }

  private static async exportOrders(filters: Record<string, unknown>, context: ExportContext): Promise<Record<string, unknown>[]> {
    const query: any = { companyId: context.companyId, isDeleted: false };

    const status = filters.status as string | undefined;
    if (status && status !== 'all') {
      if (status === 'unshipped') query.currentStatus = { $in: ['pending', 'ready_to_ship', 'confirmed'] };
      else if (status === 'shipped') query.currentStatus = { $in: ['shipped', 'in_transit', 'picked_up'] };
      else query.currentStatus = status;
    }

    const paymentStatus = filters.paymentStatus as string | undefined;
    if (paymentStatus && paymentStatus !== 'all') query.paymentStatus = paymentStatus;

    const startDate = parseDate(filters.startDate);
    const endDate = parseDate(filters.endDate);
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = startDate;
      if (endDate) query.createdAt.$lte = endDate;
    }

    const searchRegex = regex(filters.search);
    if (searchRegex) {
      query.$or = [
        { orderNumber: searchRegex },
        { 'customerInfo.name': searchRegex },
        { 'customerInfo.phone': searchRegex },
      ];
    }

    const data = await Order.find(query).sort({ createdAt: -1 }).limit(MAX_EXPORT_ROWS).lean();

    return data.map((order: any) => ({
      order_id: String(order._id),
      order_number: order.orderNumber || '',
      source: order.source || '',
      source_order_id: order.sourceId || '',
      created_at: order.createdAt ? new Date(order.createdAt).toISOString() : '',
      customer_name: maybeMask(order.customerInfo?.name || '', 'name', context.canViewPii),
      customer_phone: maybeMask(order.customerInfo?.phone || '', 'phone', context.canViewPii),
      customer_email: maybeMask(order.customerInfo?.email || '', 'email', context.canViewPii),
      item_count: Array.isArray(order.products) ? order.products.length : 0,
      product_titles: Array.isArray(order.products) ? order.products.map((p: any) => p.name).join('|') : '',
      payment_method: order.paymentMethod || '',
      payment_status: order.paymentStatus || '',
      order_status: order.currentStatus || '',
      total_amount: Number(order.totals?.total || 0),
      currency: order.currency || 'INR',
    }));
  }

  private static async exportShipments(filters: Record<string, unknown>, companyId: string): Promise<Record<string, unknown>[]> {
    const query: any = { companyId, isDeleted: false };

    const status = filters.status as string | undefined;
    if (status && status !== 'all') {
      if (status === 'pending') query.currentStatus = { $in: ['created', 'ready_to_ship'] };
      else if (status === 'in_transit') query.currentStatus = { $in: ['picked', 'picked_up', 'in_transit', 'out_for_delivery'] };
      else if (status === 'rto') query.currentStatus = { $in: ['rto', 'returned', 'rto_delivered', 'return_initiated'] };
      else query.currentStatus = status;
    }

    const startDate = parseDate(filters.startDate);
    const endDate = parseDate(filters.endDate);
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = startDate;
      if (endDate) query.createdAt.$lte = endDate;
    }

    const searchRegex = regex(filters.search);
    if (searchRegex) query.trackingNumber = searchRegex;

    const rows = await Shipment.find(query)
      .populate('orderId', 'orderNumber source')
      .sort({ createdAt: -1 })
      .limit(MAX_EXPORT_ROWS)
      .lean();

    return rows.map((shipment: any) => ({
      shipment_id: String(shipment._id),
      awb_number: shipment.trackingNumber || '',
      order_id: shipment.orderId?._id ? String(shipment.orderId._id) : '',
      order_number: shipment.orderId?.orderNumber || '',
      source: shipment.orderId?.source || '',
      carrier: shipment.carrier || '',
      service_type: shipment.serviceType || '',
      shipment_status: shipment.currentStatus || '',
      cod_amount: Number(shipment.paymentDetails?.codAmount || 0),
      created_at: shipment.createdAt ? new Date(shipment.createdAt).toISOString() : '',
      shipped_at: shipment.pickupDetails?.pickupDate ? new Date(shipment.pickupDetails.pickupDate).toISOString() : '',
      delivered_at: shipment.actualDelivery ? new Date(shipment.actualDelivery).toISOString() : '',
    }));
  }

  private static async exportCodPending(filters: Record<string, unknown>, companyId: string): Promise<Record<string, unknown>[]> {
    const query: any = {
      companyId,
      isDeleted: false,
      'paymentDetails.type': 'cod',
      currentStatus: 'delivered',
      $or: [{ 'remittance.included': { $ne: true } }, { remittance: { $exists: false } }],
    };

    const searchRegex = regex(filters.search);
    if (searchRegex) query.trackingNumber = searchRegex;

    const rows = await Shipment.find(query)
      .populate('orderId', 'orderNumber')
      .sort({ actualDelivery: -1 })
      .limit(MAX_EXPORT_ROWS)
      .lean();

    return rows.map((shipment: any) => ({
      shipment_id: String(shipment._id),
      awb_number: shipment.trackingNumber || '',
      order_number: shipment.orderId?.orderNumber || '',
      carrier: shipment.carrier || '',
      delivered_at: shipment.actualDelivery ? new Date(shipment.actualDelivery).toISOString() : '',
      cod_collected_amount: Number(shipment.paymentDetails?.actualCollection || shipment.paymentDetails?.codAmount || 0),
      expected_remittance_date: '',
      remittance_status: shipment.remittance?.status || 'pending',
    }));
  }

  private static async exportCodHistory(filters: Record<string, unknown>, companyId: string): Promise<Record<string, unknown>[]> {
    const query: any = { companyId, isDeleted: { $ne: true } };
    const status = filters.status as string | undefined;
    if (status && status !== 'all') query.status = status;

    const searchRegex = regex(filters.search);
    if (searchRegex) query.remittanceId = searchRegex;

    const startDate = parseDate(filters.startDate);
    const endDate = parseDate(filters.endDate);
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = startDate;
      if (endDate) query.createdAt.$lte = endDate;
    }

    const rows = await CODRemittance.find(query).sort({ createdAt: -1 }).limit(MAX_EXPORT_ROWS).lean();
    return rows.map((item: any) => ({
      remittance_id: String(item._id),
      remittance_reference: item.remittanceId || '',
      period_start: item.batch?.shippingPeriod?.start ? new Date(item.batch.shippingPeriod.start).toISOString() : '',
      period_end: item.batch?.shippingPeriod?.end ? new Date(item.batch.shippingPeriod.end).toISOString() : '',
      total_shipments: Number(item.financial?.totalShipments || 0),
      total_cod_amount: Number(item.financial?.totalCODCollected || 0),
      total_remitted_amount: Number(item.financial?.netPayable || 0),
      deductions_amount: Number(item.financial?.deductionsSummary?.grandTotal || 0),
      status: item.status || '',
      processed_at: item.payout?.completedAt ? new Date(item.payout.completedAt).toISOString() : '',
    }));
  }

  private static async exportWalletTransactions(filters: Record<string, unknown>, companyId: string): Promise<Record<string, unknown>[]> {
    const query: any = { company: companyId, isDeleted: false };
    if (filters.type && filters.type !== 'all') query.type = filters.type;
    if (filters.reason && filters.reason !== 'all') query.reason = filters.reason;

    const startDate = parseDate(filters.startDate);
    const endDate = parseDate(filters.endDate);
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = startDate;
      if (endDate) query.createdAt.$lte = endDate;
    }

    const rows = await WalletTransaction.find(query).sort({ createdAt: -1 }).limit(MAX_EXPORT_ROWS).lean();
    return rows.map((tx: any) => ({
      transaction_id: String(tx._id),
      created_at: tx.createdAt ? new Date(tx.createdAt).toISOString() : '',
      type: tx.type || '',
      category: tx.reason || '',
      description: tx.description || '',
      amount: Number(tx.amount || 0),
      balance_after: Number(tx.balanceAfter || 0),
      reference_type: tx.reference?.type || '',
      reference_id: tx.reference?.id ? String(tx.reference.id) : '',
      provider_reference: tx.reference?.externalId || '',
      status: tx.status || '',
    }));
  }

  private static async exportReturns(filters: Record<string, unknown>, context: ExportContext): Promise<Record<string, unknown>[]> {
    const query: any = { companyId: context.companyId, isDeleted: { $ne: true } };
    if (filters.status && filters.status !== 'all') query.status = filters.status;

    const rows = await ReturnOrder.find(query)
      .populate('orderId', 'orderNumber source')
      .populate('shipmentId', 'trackingNumber deliveryDetails')
      .sort({ createdAt: -1 })
      .limit(MAX_EXPORT_ROWS)
      .lean();

    return rows.map((item: any) => ({
      return_id: String(item._id),
      return_number: item.returnId || '',
      created_at: item.createdAt ? new Date(item.createdAt).toISOString() : '',
      order_id: item.orderId?._id ? String(item.orderId._id) : '',
      order_number: item.orderId?.orderNumber || '',
      source: item.orderId?.source || '',
      customer_name: maybeMask(item.shipmentId?.deliveryDetails?.recipientName || '', 'name', context.canViewPii),
      customer_phone: maybeMask(item.shipmentId?.deliveryDetails?.recipientPhone || '', 'phone', context.canViewPii),
      item_count: Array.isArray(item.items) ? item.items.length : 0,
      item_skus: Array.isArray(item.items) ? item.items.map((row: any) => row.sku || '').filter(Boolean).join('|') : '',
      return_reason: item.returnReason || '',
      seller_review_status: item.sellerReview?.status || '',
      return_status: item.status || '',
      refund_amount: Number(item.refundAmount || 0),
      currency: 'INR',
    }));
  }

  private static async exportNdr(filters: Record<string, unknown>, context: ExportContext): Promise<Record<string, unknown>[]> {
    const query: any = { company: context.companyId };
    if (filters.status && filters.status !== 'all') query.status = filters.status;
    if (filters.ndrType) query.ndrType = filters.ndrType;

    const startDate = parseDate(filters.startDate);
    const endDate = parseDate(filters.endDate);
    if (startDate || endDate) {
      query.detectedAt = {};
      if (startDate) query.detectedAt.$gte = startDate;
      if (endDate) query.detectedAt.$lte = endDate;
    }

    const rows = await NDREvent.find(query)
      .populate('shipment', 'trackingNumber')
      .populate('order', 'orderNumber customerInfo')
      .sort({ detectedAt: -1 })
      .limit(MAX_EXPORT_ROWS)
      .lean();

    return rows.map((item: any) => ({
      ndr_id: String(item._id),
      awb_number: item.awb || item.shipment?.trackingNumber || '',
      order_number: item.order?.orderNumber || '',
      customer_name: maybeMask(item.order?.customerInfo?.name || '', 'name', context.canViewPii),
      customer_phone: maybeMask(item.order?.customerInfo?.phone || '', 'phone', context.canViewPii),
      ndr_type: item.ndrType || '',
      reason_code: item.ndrReasonClassified || '',
      reason: item.ndrReason || '',
      ndr_status: item.status || '',
      customer_action: item.customerResponse || '',
      risk_score: Number(item.classificationConfidence || 0),
      created_at: item.createdAt ? new Date(item.createdAt).toISOString() : '',
      updated_at: item.updatedAt ? new Date(item.updatedAt).toISOString() : '',
    }));
  }

  private static async exportRto(filters: Record<string, unknown>, companyId: string): Promise<Record<string, unknown>[]> {
    const query: any = { company: companyId };
    if (filters.returnStatus && filters.returnStatus !== 'all') query.returnStatus = filters.returnStatus;
    if (filters.rtoReason) query.rtoReason = filters.rtoReason;

    const startDate = parseDate(filters.startDate);
    const endDate = parseDate(filters.endDate);
    if (startDate || endDate) {
      query.triggeredAt = {};
      if (startDate) query.triggeredAt.$gte = startDate;
      if (endDate) query.triggeredAt.$lte = endDate;
    }

    const rows = await RTOEvent.find(query)
      .populate('shipment', 'trackingNumber')
      .populate('order', 'orderNumber')
      .populate('warehouse', 'name')
      .sort({ triggeredAt: -1 })
      .limit(MAX_EXPORT_ROWS)
      .lean();

    return rows.map((item: any) => ({
      rto_id: String(item._id),
      shipment_id: item.shipment?._id ? String(item.shipment._id) : '',
      awb_number: item.shipment?.trackingNumber || '',
      order_number: item.order?.orderNumber || '',
      rto_reason: item.rtoReason || '',
      return_status: item.returnStatus || '',
      warehouse_id: item.warehouse?._id ? String(item.warehouse._id) : '',
      warehouse_name: item.warehouse?.name || '',
      initiated_at: item.triggeredAt ? new Date(item.triggeredAt).toISOString() : '',
      received_at: item.actualReturnDate ? new Date(item.actualReturnDate).toISOString() : '',
      carrier: item.metadata?.carrier || '',
    }));
  }

  private static async exportCodDiscrepancies(filters: Record<string, unknown>, companyId: string): Promise<Record<string, unknown>[]> {
    const query: any = { companyId };
    if (filters.status && filters.status !== 'all') query.status = filters.status;
    if (filters.type) query.type = filters.type;

    const startDate = parseDate(filters.startDate);
    const endDate = parseDate(filters.endDate);
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = startDate;
      if (endDate) query.createdAt.$lte = endDate;
    }

    const searchRegex = regex(filters.search);
    if (searchRegex) {
      query.$or = [
        { discrepancyNumber: searchRegex },
        { awb: searchRegex },
      ];
    }

    const rows = await CODDiscrepancy.find(query).sort({ createdAt: -1 }).limit(MAX_EXPORT_ROWS).lean();

    return rows.map((item: any) => ({
      discrepancy_id: String(item._id),
      shipment_id: item.shipmentId ? String(item.shipmentId) : '',
      awb_number: item.awb || '',
      discrepancy_type: item.type || '',
      expected_amount: Number(item.amounts?.expected?.total || 0),
      actual_amount: Number(item.amounts?.actual?.collected || 0),
      difference_amount: Number(item.amounts?.difference || 0),
      status: item.status || '',
      created_at: item.createdAt ? new Date(item.createdAt).toISOString() : '',
      resolved_at: item.resolution?.resolvedAt ? new Date(item.resolution.resolvedAt).toISOString() : '',
      resolution_note: item.resolution?.remarks || '',
    }));
  }

  private static async exportAuditLogs(filters: Record<string, unknown>, context: ExportContext): Promise<Record<string, unknown>[]> {
    const query: any = { companyId: context.companyId, isDeleted: false };
    if (filters.action) query.action = filters.action;
    if (filters.resource) query.resource = filters.resource;

    const startDate = parseDate(filters.startDate);
    const endDate = parseDate(filters.endDate);
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = startDate;
      if (endDate) query.timestamp.$lte = endDate;
    }

    const searchRegex = regex(filters.search);
    if (searchRegex) {
      query.$or = [
        { resource: searchRegex },
        { 'details.message': searchRegex },
      ];
    }

    const rows = await AuditLog.find(query).populate('userId', 'name email').sort({ timestamp: -1 }).limit(MAX_EXPORT_ROWS).lean();

    return rows.map((item: any) => ({
      audit_log_id: String(item._id),
      occurred_at: item.timestamp ? new Date(item.timestamp).toISOString() : '',
      actor_user_id: item.userId?._id ? String(item.userId._id) : String(item.userId || ''),
      actor_name: maybeMask(item.userId?.name || '', 'name', context.canViewPii),
      actor_email: maybeMask(item.userId?.email || '', 'email', context.canViewPii),
      action: item.action || '',
      resource_type: item.resource || '',
      resource_id: item.resourceId ? String(item.resourceId) : '',
      ip_address: maybeMask(item.ipAddress || '', 'phone', context.canViewPii),
      user_agent: item.userAgent || '',
      status: item.details?.success === false ? 'failed' : 'success',
      metadata_json: JSON.stringify(item.details || {}),
    }));
  }

  private static async exportAnalytics(filters: Record<string, unknown>, companyId: string): Promise<Record<string, unknown>[]> {
    const startDate = parseDate(filters.startDate);
    const endDate = parseDate(filters.endDate);
    const match: any = { companyId: new mongoose.Types.ObjectId(companyId), isDeleted: false };
    if (startDate || endDate) {
      match.createdAt = {};
      if (startDate) match.createdAt.$gte = startDate;
      if (endDate) match.createdAt.$lte = endDate;
    }

    const bySource = await Order.aggregate([
      { $match: match },
      { $group: { _id: '$source', orders: { $sum: 1 }, revenue: { $sum: '$totals.total' } } },
      { $sort: { orders: -1 } },
    ]);

    const totalShipments = await Shipment.countDocuments({ companyId, isDeleted: false });

    const generatedAt = new Date().toISOString();
    const rows: Record<string, unknown>[] = bySource.map((row: any) => ({
      section: 'orders',
      metric_id: 'orders_by_source',
      metric_label: 'Orders by Source',
      period_start: startDate ? startDate.toISOString() : '',
      period_end: endDate ? endDate.toISOString() : '',
      dimension: 'source',
      dimension_value: row._id || 'unknown',
      value: Number(row.orders || 0),
      generated_at: generatedAt,
    }));

    rows.push({
      section: 'shipments',
      metric_id: 'total_shipments',
      metric_label: 'Total Shipments',
      period_start: startDate ? startDate.toISOString() : '',
      period_end: endDate ? endDate.toISOString() : '',
      dimension: 'all',
      dimension_value: 'all',
      value: totalShipments,
      generated_at: generatedAt,
    });

    return rows;
  }
}

export default SellerExportService;
