import React, { useState } from 'react';
import { useRateCalculation } from '@/src/hooks/shipping/use-rate-calculation';
import { Card, CardHeader, CardTitle, CardContent } from '@/src/components/ui/core/Card';
import { Button } from '@/src/components/ui/core/Button';
import { Input } from '@/src/components/ui/core/Input';
import { Label } from '@/src/components/ui/core/Label';
import { Select } from '@/src/components/ui/form/Select';
import { Loader2, Calculator } from 'lucide-react';
import { toast } from 'sonner';

export const RatesClient = () => {
    const [calcData, setCalcData] = useState({
        originPincode: '110001',
        destinationPincode: '',
        weight: 0.5,
        carrier: 'Delhivery',
        serviceType: 'Standard'
    });

    const { mutate: calculateRate, isPending, data: result } = useRateCalculation();

    const handleCalculate = () => {
        if (!calcData.destinationPincode) {
            toast.error('Please enter a destination pincode');
            return;
        }
        calculateRate(calcData);
    };

    return (
        <div className="grid gap-6 md:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Calculator className="h-5 w-5" />
                        Rate Calculator
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Origin Pincode</Label>
                            <Input
                                value={calcData.originPincode}
                                onChange={(e) => setCalcData({ ...calcData, originPincode: e.target.value })}
                                placeholder="110001"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Destination Pincode</Label>
                            <Input
                                value={calcData.destinationPincode}
                                onChange={(e) => setCalcData({ ...calcData, destinationPincode: e.target.value })}
                                placeholder="400001"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Weight (kg)</Label>
                        <Input
                            type="number"
                            step="0.1"
                            value={calcData.weight}
                            onChange={(e) => setCalcData({ ...calcData, weight: parseFloat(e.target.value) })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Carrier</Label>
                            <Select
                                value={calcData.carrier}
                                onChange={(e) => setCalcData({ ...calcData, carrier: e.target.value })}
                                options={[
                                    { label: 'Delhivery', value: 'Delhivery' },
                                    { label: 'BlueDart', value: 'BlueDart' },
                                    { label: 'EcomExpress', value: 'EcomExpress' },
                                    { label: 'Xpressbees', value: 'Xpressbees' },
                                ]}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Service Type</Label>
                            <Select
                                value={calcData.serviceType}
                                onChange={(e) => setCalcData({ ...calcData, serviceType: e.target.value })}
                                options={[
                                    { label: 'Standard', value: 'Standard' },
                                    { label: 'Express', value: 'Express' },
                                ]}
                            />
                        </div>
                    </div>

                    <Button
                        onClick={handleCalculate}
                        className="w-full"
                        disabled={isPending}
                    >
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Calculate Shipping Cost
                    </Button>
                </CardContent>
            </Card>

            {result && (
                <Card className="bg-muted/30">
                    <CardHeader>
                        <CardTitle>Calculation Result</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center justify-between border-b pb-4">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Total Estimated Cost</p>
                                <h2 className="text-3xl font-bold text-primary">₹{result.rate}</h2>
                            </div>
                            <div className="text-right">
                                <p className="text-sm text-muted-foreground">Zone</p>
                                <p className="font-semibold">{result.zone}</p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <h4 className="font-semibold text-sm">Cost Breakdown</h4>

                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Base Rate (0.5kg)</span>
                                <span>₹{result.breakdown.base}</span>
                            </div>

                            {result.breakdown.weightCharge > 0 && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Additional Weight Charge</span>
                                    <span>₹{result.breakdown.weightCharge}</span>
                                </div>
                            )}

                            {result.breakdown.zoneCharge > 0 && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Zone Surcharge</span>
                                    <span>₹{result.breakdown.zoneCharge}</span>
                                </div>
                            )}

                            <div className="flex justify-between text-sm pt-2 border-t">
                                <span className="text-muted-foreground">GST (18%)</span>
                                <span>₹{result.breakdown.tax}</span>
                            </div>
                        </div>

                        <div className="rounded-md bg-blue-50 p-3 text-xs text-blue-700">
                            Rates calculated based on active rate card: <strong>{result.rateCardName}</strong>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};
