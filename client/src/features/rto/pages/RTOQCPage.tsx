'use client';

import { useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Check, Loader2, Upload, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/core/Card';
import { Button } from '@/src/components/ui/core/Button';
import { Input } from '@/src/components/ui/core/Input';
import { Label } from '@/src/components/ui/core/Label';
import { Textarea } from '@/src/components/ui/core/Textarea';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/src/components/ui/feedback/Dialog';
import { useRTODetails, usePerformRTOQC, useUploadRTOQCPhotos } from '@/src/core/api/hooks/rto/useRTOManagement';
import type { RTOOrderRef, RTOShipmentRef } from '@/src/types/api/rto.types';

const DAMAGE_TYPE_OPTIONS = [
    'Crushed Box',
    'Water Damage',
    'Torn Packaging',
    'Product Scratch',
    'Missing Parts',
    'Broken',
    'Wrong Item',
    'Other',
];

function getOrderNumber(rto: { order?: unknown }): string {
    const o = rto.order;
    if (!o || typeof o !== 'object') return '';
    return (o as RTOOrderRef).orderNumber ?? (o as RTOOrderRef)._id ?? '';
}

function getAwb(rto: { shipment?: unknown }): string {
    const s = rto.shipment;
    if (!s || typeof s !== 'object') return '';
    return (s as RTOShipmentRef).awb ?? (s as RTOShipmentRef).trackingNumber ?? '';
}

function getProductName(rto: { order?: unknown }): string {
    const o = rto.order;
    if (!o || typeof o !== 'object') return '—';
    const items = (o as RTOOrderRef).products ?? (o as RTOOrderRef).items;
    if (!Array.isArray(items) || items.length === 0) return '—';
    const first = items[0] as { name?: string; productName?: string; sku?: string };
    return first?.name ?? first?.productName ?? first?.sku ?? '—';
}

export function RTOQCPage() {
    const params = useParams();
    const router = useRouter();
    const rtoId = params?.id as string;

    const [result, setResult] = useState<'passed' | 'failed'>('passed');
    const [remarks, setRemarks] = useState('');
    const [condition, setCondition] = useState('');
    const [damageTypes, setDamageTypes] = useState<string[]>([]);
    const [photos, setPhotos] = useState<{ url: string; label?: string }[]>([]);
    const [showPhotoDialog, setShowPhotoDialog] = useState(false);
    const [photoUrl, setPhotoUrl] = useState('');
    const [photoLabel, setPhotoLabel] = useState('');

    const fileInputRef = useRef<HTMLInputElement>(null);
    const { data: rto, isLoading } = useRTODetails(rtoId);
    const performQC = usePerformRTOQC();
    const uploadPhotos = useUploadRTOQCPhotos();

    const handleSubmit = () => {
        if (!remarks.trim()) return;
        const imageUrls = photos.map((p) => p.url);
        performQC.mutate(
            {
                rtoId,
                qcResult: {
                    passed: result === 'passed',
                    remarks: remarks.trim(),
                    images: imageUrls.length ? imageUrls : undefined,
                    condition: condition.trim() || undefined,
                    damageTypes: damageTypes.length ? damageTypes : undefined,
                    photos: photos.length ? photos : undefined,
                    inspectedBy: undefined,
                },
            },
            {
                onSuccess: () => router.push(`/seller/rto/${rtoId}`),
            }
        );
    };

    const toggleDamageType = (type: string) => {
        setDamageTypes((prev) =>
            prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
        );
    };

    const addPhoto = () => {
        setShowPhotoDialog(true);
    };

    const removePhoto = (index: number) => {
        setPhotos((prev) => prev.filter((_, i) => i !== index));
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files?.length) return;
        const fileList = Array.from(files).slice(0, 20 - photos.length);
        if (fileList.length === 0) return;
        uploadPhotos.mutate(
            { rtoId, files: fileList },
            {
                onSuccess: (data) => {
                    setPhotos((prev) => [...prev, ...data.urls.map((url) => ({ url, label: undefined as string | undefined }))]);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                },
            }
        );
    };

    if (isLoading || !rto) {
        return (
            <div className="flex items-center justify-center py-24">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--primary-blue)]" />
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div>
                <button
                    type="button"
                    onClick={() => router.push(`/seller/rto/${rtoId}`)}
                    className="text-sm text-[var(--text-secondary)] hover:underline mb-2"
                >
                    ← Back to RTO
                </button>
                <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                    Quality Check — RTO #{rto._id.slice(-8).toUpperCase()}
                </h1>
            </div>

            <Card className="border-[var(--border-subtle)]">
                <CardHeader>
                    <CardTitle className="text-base">Product</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-[var(--text-secondary)]">
                    <p className="font-medium text-[var(--text-primary)]">{getProductName(rto)}</p>
                    <p>Order: {getOrderNumber(rto)}</p>
                    <p className="font-mono">AWB: {getAwb(rto)}</p>
                </CardContent>
            </Card>

            <Card className="border-[var(--border-subtle)]">
                <CardHeader>
                    <CardTitle className="text-base">Inspection Result</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <Label className="mb-2 block">QC Result *</Label>
                        <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="result"
                                    checked={result === 'passed'}
                                    onChange={() => setResult('passed')}
                                    className="rounded-full"
                                />
                                <span>Passed — Restock</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="result"
                                    checked={result === 'failed'}
                                    onChange={() => setResult('failed')}
                                    className="rounded-full"
                                />
                                <span>Failed — Do not restock</span>
                            </label>
                        </div>
                    </div>

                    {(result === 'failed' || damageTypes.length > 0) && (
                        <div>
                            <Label className="mb-2 block">Damage type(s)</Label>
                            <div className="grid grid-cols-2 gap-2">
                                {DAMAGE_TYPE_OPTIONS.map((type) => (
                                    <label
                                        key={type}
                                        className="flex items-center gap-2 cursor-pointer text-sm"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={damageTypes.includes(type)}
                                            onChange={() => toggleDamageType(type)}
                                            className="rounded"
                                        />
                                        {type}
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}

                    <div>
                        <Label htmlFor="condition" className="mb-2 block">
                            Condition description *
                        </Label>
                        <Textarea
                            id="condition"
                            value={condition}
                            onChange={(e) => setCondition(e.target.value)}
                            placeholder="Describe the condition of the product and packaging..."
                            rows={3}
                            className="w-full"
                        />
                    </div>

                    <div>
                        <Label htmlFor="remarks" className="mb-2 block">
                            Remarks * (min 5 characters)
                        </Label>
                        <Textarea
                            id="remarks"
                            value={remarks}
                            onChange={(e) => setRemarks(e.target.value)}
                            placeholder="Additional notes, observations, or recommendations..."
                            rows={3}
                            className="w-full"
                            required
                        />
                    </div>

                    <div>
                        <Label className="mb-2 block">Photos (optional, up to 20)</Label>
                        <p className="text-xs text-[var(--text-muted)] mb-2">
                            Upload QC photos or add URLs. Recommended: outer packaging, product, any damage.
                        </p>
                        <div className="space-y-3">
                            <div className="flex flex-wrap items-center gap-2">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    className="hidden"
                                    onChange={handleFileSelect}
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={uploadPhotos.isPending || photos.length >= 20}
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    {uploadPhotos.isPending ? (
                                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                    ) : (
                                        <Upload className="w-4 h-4 mr-2" />
                                    )}
                                    Upload photos
                                </Button>
                                <Button type="button" variant="outline" size="sm" onClick={addPhoto}>
                                    + Add photo URL
                                </Button>
                            </div>
                            {photos.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {photos.map((p, i) => (
                                        <div
                                            key={i}
                                            className="relative group rounded-lg border border-[var(--border-subtle)] overflow-hidden w-20 h-20 bg-[var(--bg-secondary)]"
                                        >
                                            <img
                                                src={p.url.startsWith('http') || p.url.startsWith('/') ? p.url : `${typeof window !== 'undefined' ? window.location.origin : ''}${p.url}`}
                                                alt={p.label ?? `Photo ${i + 1}`}
                                                className="w-full h-full object-cover"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => removePhoto(i)}
                                                className="absolute top-0.5 right-0.5 p-1 rounded bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                                aria-label="Remove"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => router.push(`/seller/rto/${rtoId}`)}>
                    Cancel
                </Button>
                <Button
                    onClick={handleSubmit}
                    disabled={!remarks.trim() || remarks.trim().length < 5 || performQC.isPending}
                >
                    {performQC.isPending ? (
                        <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Submitting...
                        </>
                    ) : (
                        <>
                            <Check className="w-4 h-4 mr-2" />
                            Submit QC Report
                        </>
                    )}
                </Button>
            </div>

            <Dialog open={showPhotoDialog} onOpenChange={setShowPhotoDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Add photo</DialogTitle>
                        <DialogDescription>Provide an image URL and an optional label.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                        <div>
                            <Label htmlFor="photoUrl">Image URL</Label>
                            <Input
                                id="photoUrl"
                                placeholder="https://..."
                                value={photoUrl}
                                onChange={(e) => setPhotoUrl(e.target.value)}
                            />
                        </div>
                        <div>
                            <Label htmlFor="photoLabel">Label (optional)</Label>
                            <Input
                                id="photoLabel"
                                placeholder={`Photo ${photos.length + 1}`}
                                value={photoLabel}
                                onChange={(e) => setPhotoLabel(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowPhotoDialog(false);
                                setPhotoUrl('');
                                setPhotoLabel('');
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={() => {
                                if (!photoUrl.trim()) return;
                                setPhotos((prev) => [...prev, { url: photoUrl.trim(), label: photoLabel.trim() || undefined }]);
                                setShowPhotoDialog(false);
                                setPhotoUrl('');
                                setPhotoLabel('');
                            }}
                        >
                            Add Photo
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
