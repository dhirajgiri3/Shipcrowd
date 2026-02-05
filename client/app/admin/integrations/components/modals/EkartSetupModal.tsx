
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/src/components/ui/feedback/Dialog';
import { Button } from '@/src/components/ui/core/Button';
import { Input } from '@/src/components/ui/core/Input';
import { Label } from '@/src/components/ui/core/Label';
import { toast } from 'sonner';
import { apiClient } from '@/src/core/api/http';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

interface EkartSetupModalProps {
    isOpen: boolean;
    onClose: () => void;
    integration?: any; // Existing integration data if connected
}

export function EkartSetupModal({ isOpen, onClose, integration }: EkartSetupModalProps) {
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState({
        clientId: '',
        username: '',
        password: '',
    });

    const isConnected = integration?.status === 'connected';

    // Save Configuration Mutation
    const { mutate: saveConfig, isPending } = useMutation({
        mutationFn: async (data: typeof formData) => {
            const response = await apiClient.post('/integrations/ekart/config', data);
            return response.data;
        },
        onSuccess: () => {
            toast.success('Ekart integration configured successfully');
            queryClient.invalidateQueries({ queryKey: ['integrations'] });
            onClose();
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to configure Ekart');
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        saveConfig(formData);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <img src="/logos/ekart.png" alt="Ekart" className="h-6 w-auto" />
                        Ekart Integration Setup
                    </DialogTitle>
                    <DialogDescription>
                        Enter your Ekart Logistics API credentials to enable shipping.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    {isConnected && (
                        <div className="bg-green-50 border border-green-200 rounded-md p-3 flex items-start gap-3">
                            <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                            <div className="text-sm text-green-800">
                                <p className="font-medium">Integration Active</p>
                                <p>Your Ekart account is connected and ready to process shipments.</p>
                            </div>
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="clientId">Client ID (Merchant Code)</Label>
                        <Input
                            id="clientId"
                            placeholder="Enter your Merchant Code"
                            value={formData.clientId}
                            onChange={(e) => setFormData(prev => ({ ...prev, clientId: e.target.value }))}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="username">Username</Label>
                        <Input
                            id="username"
                            placeholder="API Username"
                            value={formData.username}
                            onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <Input
                            id="password"
                            type="password"
                            placeholder="API Password"
                            value={formData.password}
                            onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                            required
                        />
                    </div>

                    <div className="bg-blue-50 text-blue-800 text-xs p-3 rounded-md flex gap-2">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <p>
                            Credentials are stored securely using field-level encryption.
                            If you are updating existing credentials, enter the new values to overwrite.
                        </p>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isPending}>
                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isConnected ? 'Update Credentials' : 'Connect Account'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
