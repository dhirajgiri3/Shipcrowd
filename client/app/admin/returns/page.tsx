"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { PackageX, AlertTriangle, Phone, RefreshCcw, XCircle } from 'lucide-react';

const mockNDRData = [
    { awb: 'AWB234567890', customer: 'Priya Sharma', reason: 'Customer Unavailable', attempts: 2, lastAttempt: '2 hours ago', phone: '+91 98765 43210' },
    { awb: 'AWB345678901', customer: 'Rahul Verma', reason: 'Address Incomplete', attempts: 1, lastAttempt: '5 hours ago', phone: '+91 87654 32109' },
    { awb: 'AWB456789012', customer: 'Sneha Patel', reason: 'Refused to Accept', attempts: 3, lastAttempt: '1 day ago', phone: '+91 76543 21098' },
    { awb: 'AWB567890123', customer: 'Amit Kumar', reason: 'Out of Delivery Area', attempts: 1, lastAttempt: '3 hours ago', phone: '+91 65432 10987' },
];

export default function ReturnsPage() {
    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <PackageX className="h-6 w-6 text-amber-600" />
                        Returns & NDR Management
                    </h2>
                    <p className="text-gray-500 text-sm mt-1">Handle non-delivery reports and reverse logistics</p>
                </div>
            </div>

            {/* 1. NDR Stats */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">Pending NDRs</p>
                                <p className="text-2xl font-bold text-gray-900 mt-1">24</p>
                            </div>
                            <div className="p-3 bg-amber-50 rounded-lg">
                                <AlertTriangle className="h-6 w-6 text-amber-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">RTO in Progress</p>
                                <p className="text-2xl font-bold text-gray-900 mt-1">12</p>
                            </div>
                            <div className="p-3 bg-rose-50 rounded-lg">
                                <RefreshCcw className="h-6 w-6 text-rose-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">Delivered After NDR</p>
                                <p className="text-2xl font-bold text-gray-900 mt-1">156</p>
                            </div>
                            <div className="p-3 bg-emerald-50 rounded-lg">
                                <PackageX className="h-6 w-6 text-emerald-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">RTO Rate</p>
                                <p className="text-2xl font-bold text-gray-900 mt-1">4.2%</p>
                            </div>
                            <div className="p-3 bg-gray-50 rounded-lg">
                                <XCircle className="h-6 w-6 text-gray-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* 2. NDR Action Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Pending NDR Actions</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 border-b border-gray-100 text-gray-500">
                                <tr>
                                    <th className="px-6 py-3 font-medium">AWB</th>
                                    <th className="px-6 py-3 font-medium">Customer</th>
                                    <th className="px-6 py-3 font-medium">NDR Reason</th>
                                    <th className="px-6 py-3 font-medium">Attempts</th>
                                    <th className="px-6 py-3 font-medium">Last Attempt</th>
                                    <th className="px-6 py-3 font-medium text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {mockNDRData.map((ndr, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 font-mono text-xs text-gray-600">{ndr.awb}</td>
                                        <td className="px-6 py-4">
                                            <div>
                                                <p className="font-medium text-gray-900">{ndr.customer}</p>
                                                <p className="text-xs text-gray-500">{ndr.phone}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <Badge variant={
                                                ndr.reason === 'Refused to Accept' ? 'warning' : 'info'
                                            }>
                                                {ndr.reason}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4 font-medium">{ndr.attempts}/3</td>
                                        <td className="px-6 py-4 text-gray-500">{ndr.lastAttempt}</td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex gap-2 justify-end">
                                                <Button size="sm" variant="outline" className="text-xs h-8">
                                                    <RefreshCcw className="h-3 w-3 mr-1" /> Reattempt
                                                </Button>
                                                <Button size="sm" variant="outline" className="text-xs h-8">
                                                    <Phone className="h-3 w-3 mr-1" /> Call
                                                </Button>
                                                <Button size="sm" variant="ghost" className="text-xs h-8 text-rose-600">
                                                    <XCircle className="h-3 w-3 mr-1" /> RTO
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
