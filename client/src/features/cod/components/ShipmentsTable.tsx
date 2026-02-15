/**
 * Shipments Table Component for COD Remittance Detail
 * 
 * Shows detailed breakdown of all shipments in a remittance batch:
 * - AWB and order details
 * - COD amount collected
 * - Deductions per shipment
 * - Net amount per shipment
 * - Delivery status and date
 */

'use client';

import React, { useState } from 'react';
import { formatCurrency, formatDate } from '@/src/lib/utils';
import { StatusBadge } from '@/src/components/ui/data/StatusBadge';
import { SourceBadge } from '@/src/components/ui/data/SourceBadge';
import type { ShipmentInRemittance } from '@/src/types/api/finance';

interface ShipmentsTableProps {
    shipments: ShipmentInRemittance[];
}

export function ShipmentsTable({ shipments }: ShipmentsTableProps) {
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

    const toggleRow = (awb: string) => {
        const newExpanded = new Set(expandedRows);
        if (newExpanded.has(awb)) {
            newExpanded.delete(awb);
        } else {
            newExpanded.add(awb);
        }
        setExpandedRows(newExpanded);
    };

    if (!shipments || shipments.length === 0) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Shipments in Batch
                </h2>
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                    No shipments found in this batch
                </p>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Shipments in Batch ({shipments.length})
                </h2>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700/50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                AWB / Order
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Customer
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Source
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Delivered
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                COD Amount
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Deductions
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Net Amount
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Status
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Details
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {shipments.map((shipment) => {
                            const isExpanded = expandedRows.has(shipment.awb);

                            return (
                                <React.Fragment key={shipment.awb}>
                                    <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm">
                                                <div className="font-mono font-medium text-gray-900 dark:text-white">
                                                    {shipment.shipmentId?.awb || shipment.awb}
                                                </div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                                    {shipment.shipmentId?.orderId?.orderNumber || 'N/A'}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900 dark:text-white">
                                                {shipment.shipmentId?.orderId?.customerDetails?.name || 'N/A'}
                                            </div>
                                            {shipment.shipmentId?.orderId?.customerDetails?.phone && (
                                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                                    {shipment.shipmentId.orderId.customerDetails.phone}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <SourceBadge source={(shipment.shipmentId as any)?.orderId?.source} size="sm" />
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                            {formatDate(shipment.deliveredAt)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                            {formatCurrency(shipment.codAmount)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 dark:text-red-400">
                                            -{formatCurrency(shipment.deductions.total)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600 dark:text-green-400">
                                            {formatCurrency(shipment.netAmount)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <StatusBadge domain="shipment" status={shipment.status} size="sm" />
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            <button
                                                onClick={() => toggleRow(shipment.awb)}
                                                className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                                            >
                                                {isExpanded ? (
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                                    </svg>
                                                ) : (
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                    </svg>
                                                )}
                                            </button>
                                        </td>
                                    </tr>

                                    {/* Expanded Row - Deduction Breakdown */}
                                    {isExpanded && (
                                        <tr className="bg-gray-50 dark:bg-gray-700/30">
                                            <td colSpan={9} className="px-6 py-4">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    {/* Left Column - Deduction Details */}
                                                    <div>
                                                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                                                            Deduction Breakdown
                                                        </h4>
                                                        <div className="space-y-2">
                                                            <div className="flex justify-between text-sm">
                                                                <span className="text-gray-600 dark:text-gray-400">Shipping Charge:</span>
                                                                <span className="font-medium text-gray-900 dark:text-white">
                                                                    {formatCurrency(shipment.deductions.shippingCharge)}
                                                                </span>
                                                            </div>
                                                            {shipment.deductions.weightDispute && shipment.deductions.weightDispute > 0 && (
                                                                <div className="flex justify-between text-sm">
                                                                    <span className="text-gray-600 dark:text-gray-400">Weight Dispute:</span>
                                                                    <span className="font-medium text-gray-900 dark:text-white">
                                                                        {formatCurrency(shipment.deductions.weightDispute)}
                                                                    </span>
                                                                </div>
                                                            )}
                                                            {shipment.deductions.rtoCharge && shipment.deductions.rtoCharge > 0 && (
                                                                <div className="flex justify-between text-sm">
                                                                    <span className="text-gray-600 dark:text-gray-400">RTO Charge:</span>
                                                                    <span className="font-medium text-gray-900 dark:text-white">
                                                                        {formatCurrency(shipment.deductions.rtoCharge)}
                                                                    </span>
                                                                </div>
                                                            )}
                                                            {shipment.deductions.platformFee && shipment.deductions.platformFee > 0 && (
                                                                <div className="flex justify-between text-sm">
                                                                    <span className="text-gray-600 dark:text-gray-400">Platform Fee:</span>
                                                                    <span className="font-medium text-gray-900 dark:text-white">
                                                                        {formatCurrency(shipment.deductions.platformFee)}
                                                                    </span>
                                                                </div>
                                                            )}
                                                            {shipment.deductions.otherFees && shipment.deductions.otherFees > 0 && (
                                                                <div className="flex justify-between text-sm">
                                                                    <span className="text-gray-600 dark:text-gray-400">Other Fees:</span>
                                                                    <span className="font-medium text-gray-900 dark:text-white">
                                                                        {formatCurrency(shipment.deductions.otherFees)}
                                                                    </span>
                                                                </div>
                                                            )}
                                                            <div className="flex justify-between text-sm pt-2 border-t border-gray-200 dark:border-gray-600">
                                                                <span className="font-semibold text-gray-900 dark:text-white">Total Deductions:</span>
                                                                <span className="font-bold text-red-600 dark:text-red-400">
                                                                    {formatCurrency(shipment.deductions.total)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Right Column - Shipment Details */}
                                                    <div>
                                                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                                                            Shipment Details
                                                        </h4>
                                                        <div className="space-y-2">
                                                            {shipment.shipmentId?.courierPartner && (
                                                                <div className="flex justify-between text-sm">
                                                                    <span className="text-gray-600 dark:text-gray-400">Courier:</span>
                                                                    <span className="font-medium text-gray-900 dark:text-white">
                                                                        {shipment.shipmentId.courierPartner}
                                                                    </span>
                                                                </div>
                                                            )}
                                                            {shipment.shipmentId?.weight && (
                                                                <>
                                                                    <div className="flex justify-between text-sm">
                                                                        <span className="text-gray-600 dark:text-gray-400">Actual Weight:</span>
                                                                        <span className="font-medium text-gray-900 dark:text-white">
                                                                            {shipment.shipmentId.weight.actual} kg
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex justify-between text-sm">
                                                                        <span className="text-gray-600 dark:text-gray-400">Charged Weight:</span>
                                                                        <span className="font-medium text-gray-900 dark:text-white">
                                                                            {shipment.shipmentId.weight.charged} kg
                                                                        </span>
                                                                    </div>
                                                                </>
                                                            )}
                                                            {shipment.shipmentId?.orderId?.productDetails && (
                                                                <div className="flex justify-between text-sm">
                                                                    <span className="text-gray-600 dark:text-gray-400">Product:</span>
                                                                    <span className="font-medium text-gray-900 dark:text-white">
                                                                        {shipment.shipmentId.orderId.productDetails.name}
                                                                        {shipment.shipmentId.orderId.productDetails.quantity > 1 &&
                                                                            ` (x${shipment.shipmentId.orderId.productDetails.quantity})`
                                                                        }
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Summary Footer */}
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30">
                <div className="flex justify-between items-center">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                        Total {shipments.length} shipments
                    </div>
                    <div className="flex gap-6 text-sm">
                        <div>
                            <span className="text-gray-600 dark:text-gray-400">Total COD: </span>
                            <span className="font-semibold text-gray-900 dark:text-white">
                                {formatCurrency(shipments.reduce((sum, s) => sum + s.codAmount, 0))}
                            </span>
                        </div>
                        <div>
                            <span className="text-gray-600 dark:text-gray-400">Total Deductions: </span>
                            <span className="font-semibold text-red-600 dark:text-red-400">
                                -{formatCurrency(shipments.reduce((sum, s) => sum + s.deductions.total, 0))}
                            </span>
                        </div>
                        <div>
                            <span className="text-gray-600 dark:text-gray-400">Net Total: </span>
                            <span className="font-bold text-green-600 dark:text-green-400">
                                {formatCurrency(shipments.reduce((sum, s) => sum + s.netAmount, 0))}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
