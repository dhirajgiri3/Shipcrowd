'use client';

import { useState } from 'react';
import Link from 'next/link';
import { RotateCcw, Search, Loader2, Truck } from 'lucide-react';
import { apiClient } from '@/src/core/api/http';

interface RTOTrackResult {
    orderNumber: string | null;
    forwardAwb: string | null;
    reverseAwb: string | null;
    status: string;
    statusLabel: string;
    initiatedAt: string;
    expectedReturnDate: string | null;
    reverseTracking: {
        reverseAwb?: string;
        originalAwb?: string;
        status?: string;
        currentLocation?: string;
        trackingHistory?: Array<{ timestamp?: string; status?: string; location?: string }>;
        estimatedDelivery?: string;
        message?: string;
    } | null;
    refundStatus: string;
}

export function RTOTrackClient() {
    const [mode, setMode] = useState<'awb' | 'order'>('awb');
    const [awb, setAwb] = useState('');
    const [orderNumber, setOrderNumber] = useState('');
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<RTOTrackResult | null>(null);

    const handleSearch = async () => {
        setError(null);
        setResult(null);
        if (mode === 'awb' && !awb.trim()) {
            setError('Please enter AWB number.');
            return;
        }
        if (mode === 'order' && (!orderNumber.trim() || !phone.trim())) {
            setError('Please enter order number and phone.');
            return;
        }

        setLoading(true);
        try {
            const params =
                mode === 'awb'
                    ? { awb: awb.trim() }
                    : { orderNumber: orderNumber.trim(), phone: phone.trim() };
            const res = await apiClient.get<{ success: boolean; data: RTOTrackResult }>(
                '/public/rto/track',
                { params }
            );
            const data = res.data?.data ?? (res.data as unknown as { data?: RTOTrackResult })?.data;
            if (data) setResult(data);
            else setError('No data returned.');
        } catch (err: any) {
            const msg =
                err.response?.data?.error ?? err.response?.data?.message ?? err.message ?? 'Lookup failed.';
            setError(typeof msg === 'string' ? msg : 'Lookup failed.');
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (d: string | null | undefined) => {
        if (!d) return '—';
        try {
            return new Date(d).toLocaleString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            });
        } catch {
            return '—';
        }
    };

    return (
        <div className="min-h-screen bg-[var(--bg-secondary)] py-8 px-4">
            <div className="max-w-xl mx-auto">
                <Link
                    href="/track"
                    className="text-sm text-[var(--text-secondary)] hover:underline mb-4 inline-block"
                >
                    ← Back to Track
                </Link>
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-xl bg-[var(--error-bg)] flex items-center justify-center">
                        <RotateCcw className="w-6 h-6 text-[var(--error)]" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                            RTO / Return Tracking
                        </h1>
                        <p className="text-sm text-[var(--text-secondary)]">
                            Track your return shipment status
                        </p>
                    </div>
                </div>

                <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-6 mb-6">
                    <div className="flex gap-4 mb-4">
                        <button
                            type="button"
                            onClick={() => setMode('awb')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium ${
                                mode === 'awb'
                                    ? 'bg-[var(--primary-blue)] text-white'
                                    : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'
                            }`}
                        >
                            Search by AWB
                        </button>
                        <button
                            type="button"
                            onClick={() => setMode('order')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium ${
                                mode === 'order'
                                    ? 'bg-[var(--primary-blue)] text-white'
                                    : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'
                            }`}
                        >
                            Search by Order
                        </button>
                    </div>

                    {mode === 'awb' && (
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-[var(--text-primary)]">
                                AWB / Tracking number
                            </label>
                            <input
                                type="text"
                                value={awb}
                                onChange={(e) => setAwb(e.target.value)}
                                placeholder="Enter forward or reverse AWB"
                                className="w-full px-4 py-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-primary)]"
                            />
                        </div>
                    )}
                    {mode === 'order' && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                                    Order number
                                </label>
                                <input
                                    type="text"
                                    value={orderNumber}
                                    onChange={(e) => setOrderNumber(e.target.value)}
                                    placeholder="e.g. ORD123456"
                                    className="w-full px-4 py-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-primary)]"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                                    Registered phone (last 10 digits)
                                </label>
                                <input
                                    type="text"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    placeholder="e.g. 9876543210"
                                    className="w-full px-4 py-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-primary)]"
                                />
                            </div>
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={handleSearch}
                        disabled={loading}
                        className="mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-[var(--primary-blue)] text-white font-medium disabled:opacity-60"
                    >
                        {loading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <Search className="w-5 h-5" />
                        )}
                        {loading ? 'Searching...' : 'Track'}
                    </button>
                </div>

                {error && (
                    <div className="rounded-xl border border-[var(--error)]/30 bg-[var(--error-bg)] p-4 text-[var(--error)] text-sm mb-6">
                        {error}
                    </div>
                )}

                {result && (
                    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-6 space-y-4">
                        <h2 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
                            <Truck className="w-5 h-5" />
                            Return Status
                        </h2>
                        <div className="grid gap-3 text-sm">
                            {result.orderNumber && (
                                <p>
                                    <span className="text-[var(--text-muted)]">Order: </span>
                                    <span className="font-medium">{result.orderNumber}</span>
                                </p>
                            )}
                            {result.forwardAwb && (
                                <p>
                                    <span className="text-[var(--text-muted)]">Forward AWB: </span>
                                    <span className="font-mono">{result.forwardAwb}</span>
                                </p>
                            )}
                            {result.reverseAwb && (
                                <p>
                                    <span className="text-[var(--text-muted)]">Reverse AWB: </span>
                                    <span className="font-mono">{result.reverseAwb}</span>
                                </p>
                            )}
                            <p>
                                <span className="text-[var(--text-muted)]">Status: </span>
                                <span className="font-medium text-[var(--primary-blue)]">
                                    {result.statusLabel}
                                </span>
                            </p>
                            <p>
                                <span className="text-[var(--text-muted)]">Initiated: </span>
                                {formatDate(result.initiatedAt)}
                            </p>
                            {result.expectedReturnDate && (
                                <p>
                                    <span className="text-[var(--text-muted)]">Expected return: </span>
                                    {formatDate(result.expectedReturnDate)}
                                </p>
                            )}
                            <p>
                                <span className="text-[var(--text-muted)]">Refund: </span>
                                {result.refundStatus}
                            </p>
                        </div>
                        {result.reverseTracking?.trackingHistory &&
                            result.reverseTracking.trackingHistory.length > 0 && (
                                <div className="pt-4 border-t border-[var(--border-subtle)]">
                                    <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2">
                                        Tracking history
                                    </h3>
                                    <ul className="space-y-2">
                                        {result.reverseTracking.trackingHistory.map((t, i) => (
                                            <li key={i} className="text-sm flex gap-2">
                                                <span className="text-[var(--text-muted)] shrink-0">
                                                    {formatDate(t.timestamp)}
                                                </span>
                                                <span>{t.status ?? t.location ?? '—'}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                    </div>
                )}
            </div>
        </div>
    );
}
