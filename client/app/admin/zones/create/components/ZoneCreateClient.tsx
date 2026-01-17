'use client';

import { useRouter } from 'next/navigation';
import { ZoneCreateWizard } from '@/src/features/admin/zones';
import { Button } from '@/src/components/ui/core/Button';
import { ChevronLeft } from 'lucide-react';
import { showSuccessToast } from '@/src/lib/error';
export function ZoneCreateClient() {
    const router = useRouter();

    const handleSuccess = () => {
        showSuccessToast('Zone created successfully');
        router.push('/admin/zones');
    };

    const handleCancel = () => {
        router.push('/admin/zones');
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.push('/admin/zones')}>
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h1 className="text-3xl font-bold">Create New Zone</h1>
                    <p className="text-muted-foreground mt-1">Configure a new pricing zone</p>
                </div>
            </div>

            <ZoneCreateWizard onSuccess={handleSuccess} onCancel={handleCancel} />
        </div>
    );
}
