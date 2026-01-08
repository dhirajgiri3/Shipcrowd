"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
    Building2,
    Plus,
    MapPin,
    Phone,
    Edit,
    Trash2,
    CheckCircle2,
    Star
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/core/Card';
import { Button } from '@/components/ui/core/Button';
import { Badge } from '@/components/ui/core/Badge';
import { cn } from '@/src/shared/utils';
import Link from 'next/link';

// Mock warehouses data
const mockWarehouses = [
    {
        id: 'WH001',
        name: 'Mumbai Central Hub',
        address: {
            line1: '123 MG Road',
            city: 'Mumbai',
            state: 'Maharashtra',
            postalCode: '400001',
        },
        contactPerson: 'Rajesh Kumar',
        phone: '9876543210',
        isDefault: true,
        isVerified: true,
        ordersThisMonth: 245,
    },
    {
        id: 'WH002',
        name: 'Delhi Warehouse',
        address: {
            line1: '456 Connaught Place',
            city: 'New Delhi',
            state: 'Delhi',
            postalCode: '110001',
        },
        contactPerson: 'Priya Singh',
        phone: '9123456789',
        isDefault: false,
        isVerified: true,
        ordersThisMonth: 189,
    },
    {
        id: 'WH003',
        name: 'Bangalore Storage',
        address: {
            line1: '789 Electronic City',
            city: 'Bangalore',
            state: 'Karnataka',
            postalCode: '560100',
        },
        contactPerson: 'Amit Patel',
        phone: '9988776655',
        isDefault: false,
        isVerified: false,
        ordersThisMonth: 67,
    },
];

export function WarehousesClient() {
    const [warehouses] = useState(mockWarehouses);

    return (
        <div className="min-h-screen space-y-6 pb-10">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <motion.h1
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="text-3xl font-bold text-[var(--text-primary)] tracking-tight"
                    >
                        Warehouses
                    </motion.h1>
                    <p className="text-sm text-[var(--text-secondary)] mt-2">
                        Manage your pickup locations and warehouses
                    </p>
                </div>

                <Link href="/seller/warehouses/add">
                    <Button variant="primary" className="shadow-lg shadow-blue-500/20">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Warehouse
                    </Button>
                </Link>
            </header>

            {/* Warehouses Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {warehouses.map((warehouse, index) => (
                    <motion.div
                        key={warehouse.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                    >
                        <Card className="border-[var(--border-default)] hover:shadow-lg transition-shadow h-full">
                            <CardContent className="p-6 space-y-4">
                                {/* Header */}
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "h-12 w-12 rounded-2xl flex items-center justify-center",
                                            warehouse.isDefault
                                                ? "bg-gradient-to-br from-[var(--primary-blue)] to-[var(--primary-blue-light)] text-white shadow-lg shadow-blue-500/20"
                                                : "bg-[var(--bg-tertiary)] text-[var(--text-muted)]"
                                        )}>
                                            <Building2 className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
                                                {warehouse.name}
                                                {warehouse.isDefault && (
                                                    <Star className="h-4 w-4 text-[var(--warning)] fill-[var(--warning)]" />
                                                )}
                                            </h3>
                                            <p className="text-xs text-[var(--text-muted)]">
                                                {warehouse.id}
                                            </p>
                                        </div>
                                    </div>

                                    {warehouse.isVerified ? (
                                        <Badge className="bg-[var(--success-bg)] text-[var(--success)]">
                                            <CheckCircle2 className="h-3 w-3 mr-1" />
                                            Verified
                                        </Badge>
                                    ) : (
                                        <Badge className="bg-[var(--warning-bg)] text-[var(--warning)]">
                                            Pending
                                        </Badge>
                                    )}
                                </div>

                                {/* Address */}
                                <div className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                                    <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-[var(--text-muted)]" />
                                    <div>
                                        <p>{warehouse.address.line1}</p>
                                        <p>{warehouse.address.city}, {warehouse.address.state} - {warehouse.address.postalCode}</p>
                                    </div>
                                </div>

                                {/* Contact */}
                                <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                                    <Phone className="h-4 w-4 text-[var(--text-muted)]" />
                                    <span>{warehouse.contactPerson} • {warehouse.phone}</span>
                                </div>

                                {/* Stats */}
                                <div className="pt-4 border-t border-[var(--border-subtle)]">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-[var(--text-muted)]">Orders this month</span>
                                        <span className="font-semibold text-[var(--text-primary)]">{warehouse.ordersThisMonth}</span>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-2 pt-2">
                                    <Button variant="outline" size="sm" className="flex-1">
                                        <Edit className="h-4 w-4 mr-1" />
                                        Edit
                                    </Button>
                                    {!warehouse.isDefault && (
                                        <Button variant="outline" size="sm" className="text-[var(--error)] hover:bg-[var(--error-bg)]">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}

                {/* Add New Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: warehouses.length * 0.1 }}
                >
                    <Link href="/seller/warehouses/add">
                        <Card className="border-dashed border-2 border-[var(--border-default)] hover:border-[var(--primary-blue)] hover:bg-[var(--primary-blue-soft)]/10 transition-all h-full min-h-[300px] cursor-pointer group">
                            <CardContent className="h-full flex flex-col items-center justify-center p-6 text-center">
                                <div className="h-16 w-16 rounded-2xl bg-[var(--bg-tertiary)] group-hover:bg-[var(--primary-blue)]/10 flex items-center justify-center mb-4 transition-colors">
                                    <Plus className="h-8 w-8 text-[var(--text-muted)] group-hover:text-[var(--primary-blue)]" />
                                </div>
                                <h3 className="font-semibold text-[var(--text-secondary)] group-hover:text-[var(--primary-blue)]">
                                    Add New Warehouse
                                </h3>
                                <p className="text-sm text-[var(--text-muted)] mt-1">
                                    Set up a new pickup location
                                </p>
                            </CardContent>
                        </Card>
                    </Link>
                </motion.div>
            </div>
        </div>
    );
}
