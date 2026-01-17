'use client';

import { useState } from 'react';
import { Button } from '@/src/components/ui/core/Button';
import { Card, CardContent } from '@/src/components/ui/core/Card';
import { Input } from '@/src/components/ui/core/Input';
import { Label } from '@/src/components/ui/core/Label';
import { Textarea } from '@/src/components/ui/core/Textarea';
import { useCreateZone } from '@/src/core/api/hooks/logistics/useZones';
import type { ZoneType, CreateZoneRequest } from '@/src/types/api/logistics';
import { ChevronRight, Check, Upload, ChevronLeft } from 'lucide-react';
import { showSuccessToast, handleApiError } from '@/src/lib/error';
const STEPS = ['Basic Info', 'Pincodes', 'Review'];

interface ZoneCreateWizardProps {
    onSuccess: () => void;
    onCancel: () => void;
}

export function ZoneCreateWizard({ onSuccess, onCancel }: ZoneCreateWizardProps) {
    const [currentStep, setCurrentStep] = useState(0);
    const { mutate: createZone, isPending } = useCreateZone();

    // Form state
    const [formData, setFormData] = useState<CreateZoneRequest>({
        name: '',
        type: 'REGIONAL',
        description: '',
        pincodes: [],
        transitDays: 3,
    });

    const [pincodeInput, setPincodeInput] = useState('');
    const [csvFile, setCsvFile] = useState<File | null>(null);

    const updateFormData = (updates: Partial<CreateZoneRequest>) => {
        setFormData((prev) => ({ ...prev, ...updates }));
    };

    const handleAddPincodes = () => {
        const pincodes = pincodeInput
            .split(/[\n,\s]+/)
            .map((p) => p.trim())
            .filter((p) => /^\d{6}$/.test(p));

        if (pincodes.length === 0) {
                        return;
        }

        const uniquePincodes = Array.from(new Set([...formData.pincodes, ...pincodes]));
        updateFormData({ pincodes: uniquePincodes });
        setPincodeInput('');
        showSuccessToast(`Added ${pincodes.length} pincodes`);
    };

    const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const text = await file.text();
            const pincodes = text
                .split(/[\n,\r]+/)
                .map((p) => p.trim())
                .filter((p) => /^\d{6}$/.test(p));

            if (pincodes.length === 0) {
                                return;
            }

            const uniquePincodes = Array.from(new Set([...formData.pincodes, ...pincodes]));
            updateFormData({ pincodes: uniquePincodes });
            setCsvFile(file);
            showSuccessToast(`Imported ${pincodes.length} pincodes from CSV`);
        } catch (error) {
                    }
    };

    const handleRemovePincode = (pincode: string) => {
        updateFormData({
            pincodes: formData.pincodes.filter((p) => p !== pincode),
        });
    };

    const handleNext = () => {
        if (currentStep === 0) {
            if (!formData.name || !formData.type || !formData.transitDays) {
                                return;
            }
        }
        if (currentStep === 1) {
            if (formData.pincodes.length === 0) {
                                return;
            }
        }
        setCurrentStep((s) => Math.min(s + 1, STEPS.length - 1));
    };

    const handleBack = () => {
        setCurrentStep((s) => Math.max(s - 1, 0));
    };

    const handleCreate = () => {
        createZone(formData, {
            onSuccess,
        });
    };

    return (
        <div className="space-y-6">
            {/* Progress Steps */}
            <div className="flex items-center justify-between">
                {STEPS.map((step, index) => (
                    <div key={step} className="flex items-center flex-1">
                        <div className="flex flex-col items-center flex-1">
                            <div
                                className={`w-10 h-10 rounded-full flex items-center justify-center font-medium ${index <= currentStep
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted text-muted-foreground'
                                    }`}
                            >
                                {index < currentStep ? <Check className="h-5 w-5" /> : index + 1}
                            </div>
                            <span className="text-sm mt-2 font-medium">{step}</span>
                        </div>
                        {index < STEPS.length - 1 && (
                            <div
                                className={`h-0.5 flex-1 ${index < currentStep ? 'bg-primary' : 'bg-muted'
                                    }`}
                            />
                        )}
                    </div>
                ))}
            </div>

            {/* Step Content */}
            <Card>
                <CardContent className="pt-6 min-h-[400px]">
                    {/* Step 1: Basic Info */}
                    {currentStep === 0 && (
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="name">Zone Name *</Label>
                                <Input
                                    id="name"
                                    placeholder="e.g., Mumbai Local, North India"
                                    value={formData.name}
                                    onChange={(e) => updateFormData({ name: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="type">Zone Type *</Label>
                                <select
                                    id="type"
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    value={formData.type}
                                    onChange={(e) => updateFormData({ type: e.target.value as ZoneType })}
                                >
                                    <option value="LOCAL">Local (Same city/district)</option>
                                    <option value="REGIONAL">Regional (Same state/region)</option>
                                    <option value="NATIONAL">National (Across India)</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="transitDays">Transit Days *</Label>
                                <Input
                                    id="transitDays"
                                    type="number"
                                    min="1"
                                    max="30"
                                    placeholder="e.g., 3"
                                    value={formData.transitDays}
                                    onChange={(e) => updateFormData({ transitDays: parseInt(e.target.value) || 1 })}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Expected delivery time for this zone
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">Description (Optional)</Label>
                                <Textarea
                                    id="description"
                                    placeholder="Brief description of this zone..."
                                    value={formData.description}
                                    onChange={(e) => updateFormData({ description: e.target.value })}
                                    rows={3}
                                />
                            </div>
                        </div>
                    )}

                    {/* Step 2: Pincodes */}
                    {currentStep === 1 && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold mb-4">Add Pincodes</h3>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="pincodes">Manual Entry</Label>
                                        <Textarea
                                            id="pincodes"
                                            placeholder="Enter pincodes (comma or newline separated)&#10;e.g., 400001, 400002, 400003"
                                            value={pincodeInput}
                                            onChange={(e) => setPincodeInput(e.target.value)}
                                            rows={4}
                                        />
                                        <Button type="button" variant="secondary" onClick={handleAddPincodes}>
                                            Add Pincodes
                                        </Button>
                                    </div>

                                    <div className="relative">
                                        <div className="absolute inset-0 flex items-center">
                                            <span className="w-full border-t" />
                                        </div>
                                        <div className="relative flex justify-center text-xs uppercase">
                                            <span className="bg-background px-2 text-muted-foreground">Or</span>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="csv">Upload CSV File</Label>
                                        <div className="flex items-center gap-2">
                                            <Input
                                                id="csv"
                                                type="file"
                                                accept=".csv,.txt"
                                                onChange={handleCsvUpload}
                                                className="flex-1"
                                            />
                                            <Upload className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            CSV should contain one pincode per line or comma-separated
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {formData.pincodes.length > 0 && (
                                <div>
                                    <h4 className="font-medium mb-3">
                                        Added Pincodes ({formData.pincodes.length})
                                    </h4>
                                    <div className="max-h-[200px] overflow-y-auto border rounded-lg p-4 space-y-1">
                                        {formData.pincodes.map((pincode) => (
                                            <div
                                                key={pincode}
                                                className="flex items-center justify-between py-1 text-sm"
                                            >
                                                <span className="font-mono">{pincode}</span>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleRemovePincode(pincode)}
                                                >
                                                    Remove
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 3: Review */}
                    {currentStep === 2 && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold mb-4">Review Zone Details</h3>
                                <dl className="space-y-3">
                                    <div>
                                        <dt className="text-sm font-medium text-muted-foreground">Zone Name</dt>
                                        <dd className="text-base mt-1">{formData.name}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-sm font-medium text-muted-foreground">Type</dt>
                                        <dd className="text-base mt-1">{formData.type}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-sm font-medium text-muted-foreground">Transit Days</dt>
                                        <dd className="text-base mt-1">{formData.transitDays} days</dd>
                                    </div>
                                    {formData.description && (
                                        <div>
                                            <dt className="text-sm font-medium text-muted-foreground">Description</dt>
                                            <dd className="text-base mt-1">{formData.description}</dd>
                                        </div>
                                    )}
                                    <div>
                                        <dt className="text-sm font-medium text-muted-foreground">
                                            Total Pincodes
                                        </dt>
                                        <dd className="text-base mt-1">{formData.pincodes.length}</dd>
                                    </div>
                                </dl>
                            </div>

                            <div className="bg-muted/50 rounded-lg p-4 text-sm">
                                <p className="font-medium mb-2">✓ Ready to create zone</p>
                                <p className="text-muted-foreground">
                                    Once created, this zone will be available for rate card configuration.
                                </p>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Navigation Buttons */}
            <div className="flex justify-between">
                <Button variant="outline" onClick={handleBack} disabled={currentStep === 0}>
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Back
                </Button>

                {currentStep < STEPS.length - 1 ? (
                    <Button onClick={handleNext}>
                        Next
                        <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                ) : (
                    <Button onClick={handleCreate} disabled={isPending}>
                        {isPending ? 'Creating...' : 'Create Zone'}
                    </Button>
                )}
            </div>
        </div>
    );
}
