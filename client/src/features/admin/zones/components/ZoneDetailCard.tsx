'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/core/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/core/Card';
import { Input } from '@/components/ui/core/Input';
import { Label } from '@/components/ui/core/Label';
import { Textarea } from '@/components/ui/core/Textarea';
import { Badge } from '@/components/ui/core/Badge';
import { useUpdateZone } from '@/src/core/api/hooks/useZones';
import type { ZoneType, Zone } from '@/src/types/api/zones.types';
import { Edit } from 'lucide-react';

interface ZoneDetailCardProps {
    zone: Zone;
}

export function ZoneDetailCard({ zone }: ZoneDetailCardProps) {
    const { mutate: updateZone } = useUpdateZone();
    const [isEditing, setIsEditing] = useState(false);

    // Edit form state
    const [editForm, setEditForm] = useState({
        name: zone.name,
        type: zone.type,
        description: zone.description || '',
        transitDays: zone.transitDays,
        isActive: zone.isActive,
    });

    const handleEdit = () => {
        setEditForm({
            name: zone.name,
            type: zone.type,
            description: zone.description || '',
            transitDays: zone.transitDays,
            isActive: zone.isActive,
        });
        setIsEditing(true);
    };

    const handleSaveEdit = () => {
        updateZone(
            { id: zone._id, data: editForm },
            {
                onSuccess: () => {
                    setIsEditing(false);
                },
            }
        );
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle>Zone Information</CardTitle>
                {!isEditing && (
                    <Button variant="outline" size="sm" onClick={handleEdit}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                    </Button>
                )}
            </CardHeader>
            <CardContent className="pt-4">
                {isEditing ? (
                    <div className="space-y-4">
                        {/* Edit Form */}
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
                        {/* Display View */}
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
                                <dd className="mt-1">{zone.description || 'No description provided'}</dd>
                            </div>
                        )}
                    </dl>
                )}
            </CardContent>
        </Card>
    );
}
