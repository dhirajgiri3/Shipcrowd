"use client";
export const dynamic = "force-dynamic";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/src/components/ui/core/Card';
import { Button } from '@/src/components/ui/core/Button';
import { Badge } from '@/src/components/ui/core/Badge';
import {
    GripVertical,
    Truck,
    Save,
    RotateCcw,
    CheckCircle,
    Star,
    Zap,
    Clock,
    IndianRupee,
    ToggleLeft,
    ToggleRight,
    Info
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useToast } from '@/src/components/ui/feedback/Toast';

// Mock courier priorities
const mockCouriers = [
    { id: 'del', name: 'Delhivery', enabled: true, priority: 1, avgDelivery: '4-5 days', rate: 'Low', rating: 4.2 },
    { id: 'xb', name: 'Xpressbees', enabled: true, priority: 2, avgDelivery: '3-4 days', rate: 'Medium', rating: 4.4 },
    { id: 'bd', name: 'Bluedart', enabled: true, priority: 3, avgDelivery: '1-2 days', rate: 'High', rating: 4.7 },
    { id: 'dtdc', name: 'DTDC', enabled: false, priority: 4, avgDelivery: '5-7 days', rate: 'Low', rating: 3.8 },
    { id: 'ec', name: 'Ecom Express', enabled: true, priority: 5, avgDelivery: '4-6 days', rate: 'Medium', rating: 4.1 },
    { id: 'ss', name: 'Shadowfax', enabled: false, priority: 6, avgDelivery: '2-3 days', rate: 'Medium', rating: 4.3 },
];

export function CouriersClient() {
    const [couriers, setCouriers] = useState(mockCouriers);
    const [draggedId, setDraggedId] = useState<string | null>(null);
    const { addToast } = useToast();

    const handleDragStart = (e: React.DragEvent, id: string) => {
        setDraggedId(id);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent, id: string) => {
        e.preventDefault();
        if (draggedId && draggedId !== id) {
            const newCouriers = [...couriers];
            const draggedIndex = newCouriers.findIndex(c => c.id === draggedId);
            const targetIndex = newCouriers.findIndex(c => c.id === id);

            const [draggedItem] = newCouriers.splice(draggedIndex, 1);
            newCouriers.splice(targetIndex, 0, draggedItem);

            // Update priorities
            newCouriers.forEach((c, i) => c.priority = i + 1);
            setCouriers(newCouriers);
        }
    };

    const handleDragEnd = () => {
        setDraggedId(null);
    };

    const toggleCourier = (id: string) => {
        setCouriers(prev => prev.map(c =>
            c.id === id ? { ...c, enabled: !c.enabled } : c
        ));
    };

    const handleSave = () => {
        addToast('Courier priorities saved successfully!', 'success');
    };

    const handleReset = () => {
        setCouriers(mockCouriers);
        addToast('Priorities reset to default', 'info');
    };

    const enabledCount = couriers.filter(c => c.enabled).length;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                        <Truck className="h-6 w-6 text-[var(--primary-blue)]" />
                        Courier Priority Settings
                    </h1>
                    <p className="text-[var(--text-muted)] text-sm mt-1">
                        Drag to reorder couriers by preference for automatic selection
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleReset}>
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Reset
                    </Button>
                    <Button onClick={handleSave}>
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                    </Button>
                </div>
            </div>

            {/* Info Banner */}
            <div className="bg-[var(--primary-blue-soft)] border border-[var(--primary-blue)]/20 rounded-xl p-4 flex items-start gap-3">
                <Info className="h-5 w-5 text-[var(--primary-blue)] flex-shrink-0 mt-0.5" />
                <div>
                    <h3 className="font-medium text-[var(--text-primary)]">How Priority Works</h3>
                    <p className="text-sm text-[var(--text-secondary)] mt-1">
                        When shipping an order, enabled couriers are checked in priority order.
                        The first courier that offers the best rate and serviceable pincode is automatically selected.
                    </p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-[var(--text-muted)]">Total Couriers</p>
                                <p className="text-2xl font-bold text-[var(--text-primary)]">{couriers.length}</p>
                            </div>
                            <div className="h-10 w-10 rounded-lg bg-[var(--primary-blue-soft)] flex items-center justify-center">
                                <Truck className="h-5 w-5 text-[var(--primary-blue)]" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-[var(--text-muted)]">Enabled</p>
                                <p className="text-2xl font-bold text-[var(--success)]">{enabledCount}</p>
                            </div>
                            <div className="h-10 w-10 rounded-lg bg-[var(--success-bg)] flex items-center justify-center">
                                <CheckCircle className="h-5 w-5 text-[var(--success)]" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-[var(--text-muted)]">Disabled</p>
                                <p className="text-2xl font-bold text-[var(--text-secondary)]">{couriers.length - enabledCount}</p>
                            </div>
                            <div className="h-10 w-10 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center">
                                <ToggleLeft className="h-5 w-5 text-[var(--text-muted)]" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-[var(--text-muted)]">Top Choice</p>
                                <p className="text-2xl font-bold text-[var(--text-primary)]">
                                    {couriers.filter(c => c.enabled).sort((a, b) => a.priority - b.priority)[0]?.name || 'None'}
                                </p>
                            </div>
                            <div className="h-10 w-10 rounded-lg bg-[var(--warning-bg)] flex items-center justify-center">
                                <Star className="h-5 w-5 text-[var(--warning)]" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Courier List */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Courier Priority Order</CardTitle>
                    <CardDescription>Drag and drop to reorder • Higher position = Higher priority</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                    {couriers.map((courier, index) => (
                        <div
                            key={courier.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, courier.id)}
                            onDragOver={(e) => handleDragOver(e, courier.id)}
                            onDragEnd={handleDragEnd}
                            className={cn(
                                "p-4 rounded-xl border transition-all cursor-grab active:cursor-grabbing",
                                draggedId === courier.id
                                    ? "border-[var(--primary-blue)] bg-[var(--primary-blue-soft)] shadow-lg scale-[1.02]"
                                    : courier.enabled
                                        ? "border-[var(--border-subtle)] bg-[var(--bg-primary)] hover:border-[var(--border-default)]"
                                        : "border-[var(--border-subtle)] bg-[var(--bg-secondary)]/50 opacity-60"
                            )}
                        >
                            <div className="flex items-center gap-4">
                                {/* Drag Handle */}
                                <div className="flex items-center gap-2">
                                    <GripVertical className="h-5 w-5 text-[var(--text-muted)]" />
                                    <div className={cn(
                                        "h-8 w-8 rounded-lg flex items-center justify-center text-sm font-bold",
                                        index === 0 && courier.enabled
                                            ? "bg-[var(--warning-bg)] text-[var(--warning)]"
                                            : "bg-[var(--bg-secondary)] text-[var(--text-secondary)]"
                                    )}>
                                        {index + 1}
                                    </div>
                                </div>

                                {/* Courier Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h4 className="font-semibold text-[var(--text-primary)]">{courier.name}</h4>
                                        {index === 0 && courier.enabled && (
                                            <Badge variant="warning" className="text-xs">
                                                <Star className="h-3 w-3 mr-1" />
                                                Top Choice
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-4 mt-1 text-sm text-[var(--text-secondary)]">
                                        <span className="flex items-center gap-1">
                                            <Clock className="h-3.5 w-3.5" />
                                            {courier.avgDelivery}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <IndianRupee className="h-3.5 w-3.5" />
                                            {courier.rate} Rate
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Star className="h-3.5 w-3.5 text-[var(--warning)]" />
                                            {courier.rating}
                                        </span>
                                    </div>
                                </div>

                                {/* Toggle */}
                                <button
                                    onClick={() => toggleCourier(courier.id)}
                                    className="flex items-center gap-2"
                                >
                                    {courier.enabled ? (
                                        <>
                                            <span className="text-sm text-[var(--success)] font-medium">Enabled</span>
                                            <ToggleRight className="h-6 w-6 text-[var(--success)]" />
                                        </>
                                    ) : (
                                        <>
                                            <span className="text-sm text-[var(--text-muted)] font-medium">Disabled</span>
                                            <ToggleLeft className="h-6 w-6 text-[var(--text-muted)]" />
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>
        </div>
    );
}
