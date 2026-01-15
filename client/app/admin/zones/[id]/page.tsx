'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/core/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/core/Card';
import { Input } from '@/components/ui/core/Input';
import { Label } from '@/components/ui/core/Label';
import { Textarea } from '@/components/ui/core/Textarea';
import { Badge } from '@/components/ui/core/Badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/feedback/Dialog';
import {
    useZone,
    useUpdateZone,
    useDeleteZone,
    useAddPincodesToZone,
    useRemovePincodesFromZone,
} from '@/src/core/api/hooks/useZones';
import type { ZoneType } from '@/src/types/api/zones.types';
import { ChevronLeft, Edit, Trash2, Plus, X, Search } from 'lucide-react';
import { toast } from 'sonner';

export default function ZoneDetailPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const { data: zone, isLoading } = useZone(params.id);
    const { mutate: updateZone } = useUpdateZone();
    const { mutate: deleteZone } = useDeleteZone();
    const { mutate: addPincodes } = useAddPincodesToZone();
    const { mutate: removePincodes } = useRemovePincodesFromZone();

    const [isEditing, setIsEditing] = useState(false);
    const [showAddPincodesDialog, setShowAddPincodesDialog] = useState(false);
    const [pincodeSearch, setPincodeSearch] = useState('');
    const [selectedPincodes, setSelectedPincodes] = useState<string[]>([]);
    const [newPincodes, setNewPincodes] = useState('');

    // Edit form state
    const [editForm, setEditForm] = useState({
        name: zone?.name || '',
        type: zone?.type || 'REGIONAL',
        description: zone?.description || '',
        transitDays: zone?.transitDays || 3,
        isActive: zone?.isActive ?? true,
    });

    const handleEdit = () => {
        setEditForm({
            name: zone?.name || '',
            type: zone?.type || 'REGIONAL',
            description: zone?.description || '',
            transitDays: zone?.transitDays || 3,
            isActive: zone?.isActive ?? true,
        });
        setIsEditing(true);
    };

    const handleSaveEdit = () => {
        updateZone(
            { id: params.id, data: editForm },
            {
                onSuccess: () => {
                    setIsEditing(false);
                },
            }
        );
    };

    const handleDelete = () => {
        if (confirm(`Are you sure you want to delete zone "${zone?.name}"? This action cannot be undone.`)) {
            deleteZone(params.id, {
                onSuccess: () => {
                    router.push('/admin/zones');
                },
            });
        }
    };

    const handleAddPincodes = () => {
        const pincodesArray = newPincodes
            .split(/[\n,\s]+/)
            .map((p) => p.trim())
            .filter((p) => /^\d{6}$/.test(p));

        if (pincodesArray.length === 0) {
            toast.error('Please enter valid 6-digit pincodes');
            return;
        }

        addPincodes(
            { id: params.id, data: { pincodes: pincodesArray } },
            {
                onSuccess: () => {
                    setShowAddPincodesDialog(false);
                    setNewPincodes('');
                },
            }
        );
    };

    const handleRemovePincodes = () => {
        if (selectedPincodes.length === 0) {
            toast.error('Please select pincodes to remove');
            return;
        }

        if (confirm(`Remove ${selectedPincodes.length} selected pincodes?`)) {
            removePincodes(
                { id: params.id, data: { pincodes: selectedPincodes } },
                {
                    onSuccess: () => {
                        setSelectedPincodes([]);
                    },
                }
            );
        }
    };

    const togglePincodeSelection = (pincode: string) => {
        setSelectedPincodes((prev) =>
            prev.includes(pincode) ? prev.filter((p) => p !== pincode) : [...prev, pincode]
        );
    };

    const filteredPincodes = zone?.pincodes.filter((p: string) => p.includes(pincodeSearch)) || [];

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <p className="text-muted-foreground">Loading zone details...</p>
            </div>
        );
    }

    if (!zone) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <p className="text-muted-foreground mb-4">Zone not found</p>
                    <Button onClick={() => router.push('/admin/zones')}>Back to Zones</Button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.push('/admin/zones')}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold">{zone.name}</h1>
                        <p className="text-muted-foreground mt-1">Zone Details</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    {!isEditing && (
                        <>
                            <Button variant="outline" onClick={handleEdit}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                            </Button>
                            <Button variant="danger" onClick={handleDelete}>
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* Zone Info Card */}
            <Card>
                <CardHeader>
                    <CardTitle>Zone Information</CardTitle>
                </CardHeader>
                <CardContent>
                    {isEditing ? (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Zone Name</Label>
                                <Input
                                    id="name"
                                    value={editForm.name}
                                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="type">Type</Label>
                                <select
                                    id="type"
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    value={editForm.type}
                                    onChange={(e) => setEditForm({ ...editForm, type: e.target.value as ZoneType })}
                                >
                                    <option value="LOCAL">Local</option>
                                    <option value="REGIONAL">Regional</option>
                                    <option value="NATIONAL">National</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="transitDays">Transit Days</Label>
                                <Input
                                    id="transitDays"
                                    type="number"
                                    value={editForm.transitDays}
                                    onChange={(e) => setEditForm({ ...editForm, transitDays: parseInt(e.target.value) || 1 })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                    id="description"
                                    value={editForm.description}
                                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                    rows={3}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="isActive">Status</Label>
                                <select
                                    id="isActive"
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    value={editForm.isActive ? 'active' : 'inactive'}
                                    onChange={(e) => setEditForm({ ...editForm, isActive: e.target.value === 'active' })}
                                >
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                            </div>
                            <div className="flex gap-2">
                                <Button onClick={handleSaveEdit}>Save Changes</Button>
                                <Button variant="outline" onClick={() => setIsEditing(false)}>
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <dl className="grid grid-cols-2 gap-4">
                            <div>
                                <dt className="text-sm font-medium text-muted-foreground">Type</dt>
                                <dd className="mt-1">
                                    <Badge>{zone.type}</Badge>
                                </dd>
                            </div>
                            <div>
                                <dt className="text-sm font-medium text-muted-foreground">Transit Days</dt>
                                <dd className="mt-1">{zone.transitDays} days</dd>
                            </div>
                            <div>
                                <dt className="text-sm font-medium text-muted-foreground">Status</dt>
                                <dd className="mt-1">
                                    <Badge variant={zone.isActive ? 'default' : 'outline'}>
                                        {zone.isActive ? 'Active' : 'Inactive'}
                                    </Badge>
                                </dd>
                            </div>
                            <div>
                                <dt className="text-sm font-medium text-muted-foreground">Total Pincodes</dt>
                                <dd className="mt-1 font-mono">{zone.pincodes.length}</dd>
                            </div>
                            {zone.description && (
                                <div className="col-span-2">
                                    <dt className="text-sm font-medium text-muted-foreground">Description</dt>
                                    <dd className="mt-1">{zone.description}</dd>
                                </div>
                            )}
                        </dl>
                    )}
                </CardContent>
            </Card>

            {/* Pincodes Card */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Pincodes</CardTitle>
                            <CardDescription>{zone.pincodes.length} pincodes in this zone</CardDescription>
                        </div>
                        <div className="flex gap-2">
                            {selectedPincodes.length > 0 && (
                                <Button variant="danger" size="sm" onClick={handleRemovePincodes}>
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Remove ({selectedPincodes.length})
                                </Button>
                            )}
                            <Button size="sm" onClick={() => setShowAddPincodesDialog(true)}>
                                <Plus className="h-4 w-4 mr-2" />
                                Add Pincodes
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search pincodes..."
                                value={pincodeSearch}
                                onChange={(e) => setPincodeSearch(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <div className="border rounded-lg max-h-[400px] overflow-y-auto">
                            <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 p-4">
                                {filteredPincodes.map((pincode: string) => (
                                    <button
                                        key={pincode}
                                        onClick={() => togglePincodeSelection(pincode)}
                                        className={`p-2 text-center text-sm font-mono rounded border transition-colors ${selectedPincodes.includes(pincode)
                                            ? 'bg-primary text-primary-foreground border-primary'
                                            : 'hover:bg-muted'
                                            }`}
                                    >
                                        {pincode}
                                    </button>
                                ))}
                            </div>
                            {filteredPincodes.length === 0 && (
                                <p className="text-center py-8 text-muted-foreground">No pincodes found</p>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Add Pincodes Dialog */}
            <Dialog open={showAddPincodesDialog} onOpenChange={setShowAddPincodesDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add Pincodes</DialogTitle>
                        <DialogDescription>
                            Enter pincodes to add to this zone (comma or newline separated)
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2">
                        <Textarea
                            placeholder="400001, 400002, 400003..."
                            value={newPincodes}
                            onChange={(e) => setNewPincodes(e.target.value)}
                            rows={6}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAddPincodesDialog(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleAddPincodes}>Add Pincodes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
