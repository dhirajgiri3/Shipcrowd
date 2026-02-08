import React, { useState } from 'react';
import { useNDRCustomerPortal } from '@/src/core/api/hooks/ndr/useNDRCustomerPortal';
import { ConfirmDialog } from '@/src/components/ui/feedback/ConfirmDialog';

interface Props {
    token: string;
    totalAmount: number;
    onSuccess: () => void;
}

const CancelForm: React.FC<Props> = ({ token, totalAmount, onSuccess }) => {
    const { cancelOrder, loading, error } = useNDRCustomerPortal();
    const [reason, setReason] = useState<string>('');
    const [showConfirm, setShowConfirm] = useState(false);

    const reasons = [
        "Changed my mind",
        "Ordered by mistake",
        "Found a better price",
        "Delivery took too long",
        "Address is incorrect",
        "Other"
    ];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!reason) return;
        setShowConfirm(true);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="text-red-500 text-sm">{error}</div>}

            <div className="p-3 bg-yellow-50 text-yellow-800 text-xs rounded-md">
                ⚠️ Cancelling this order will initiate a return to origin (RTO).
            </div>

            <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">Reason for Cancellation</label>
                <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md border"
                >
                    <option value="">Select a reason</option>
                    {reasons.map(r => (
                        <option key={r} value={r}>{r}</option>
                    ))}
                </select>
            </div>

            <div className="pt-2">
                <button
                    type="submit"
                    disabled={loading || !reason}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                >
                    {loading ? 'Cancelling...' : `Cancel Order (₹${totalAmount})`}
                </button>
            </div>

            <ConfirmDialog
                open={showConfirm}
                title="Cancel order"
                description="Are you sure you want to cancel this order? This action cannot be undone."
                confirmText="Cancel order"
                confirmVariant="danger"
                onCancel={() => setShowConfirm(false)}
                onConfirm={async () => {
                    const success = await cancelOrder(token, reason);
                    if (success) {
                        onSuccess();
                    }
                    setShowConfirm(false);
                }}
                isLoading={loading}
            />
        </form>
    );
};

export default CancelForm;
