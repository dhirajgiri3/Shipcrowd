'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/core/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/core/Card';
import { Input } from '@/components/ui/core/Input';
import { Textarea } from '@/components/ui/core/Textarea';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/feedback/Dialog';
import { useAddPincodesToZone, useRemovePincodesFromZone } from '@/src/core/api/hooks/useZones';
import type { Zone } from '@/src/types/api/zones.types';
import { Search, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface PincodeManagerProps {
    zoneId: string;
    pincodes: string[];
}

export function PincodeManager({ zoneId, pincodes }: PincodeManagerProps) {
    const { mutate: addPincodes } = useAddPincodesToZone();
    const { mutate: removePincodes } = useRemovePincodesFromZone();

    const [showAddPincodesDialog, setShowAddPincodesDialog] = useState(false);
    const [pincodeSearch, setPincodeSearch] = useState('');
    const [selectedPincodes, setSelectedPincodes] = useState<string[]>([]);
    const [newPincodes, setNewPincodes] = useState('');

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
            { id: zoneId, data: { pincodes: pincodesArray } },
            {
                onSuccess: () => {
                    setShowAddPincodesDialog(false);
                    setNewPincodes('');
                    toast.success(`Added ${pincodesArray.length} pincodes`);
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
                { id: zoneId, data: { pincodes: selectedPincodes } },
                {
                    onSuccess: () => {
                        setSelectedPincodes([]);
                        toast.success('Pincodes removed successfully');
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

    const filteredPincodes = pincodes.filter((p) => p.includes(pincodeSearch)) || [];

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Pincodes</CardTitle>
                        <CardDescription>{pincodes.length} pincodes in this zone</CardDescription>
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
                        <Input
                            icon={<Search className="h-4 w-4" />}
                            placeholder="Search pincodes..."
                            value={pincodeSearch}
                            onChange={(e) => setPincodeSearch(e.target.value)}
                        />
                    </div>
                    <div className="border rounded-lg max-h-[400px] overflow-y-auto">
                        <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 p-4">
                            {filteredPincodes.map((pincode) => (
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
        </Card>
    );
}
