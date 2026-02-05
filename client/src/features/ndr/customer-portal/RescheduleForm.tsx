import React, { useState } from 'react';
import { useNDRCustomerPortal } from '../../../core/api/hooks/ndr/useNDRCustomerPortal';

interface Props {
    token: string;
    onSuccess: () => void;
}

const RescheduleForm: React.FC<Props> = ({ token, onSuccess }) => {
    const { rescheduleDelivery, loading, error } = useNDRCustomerPortal();
    const [selectedDate, setSelectedDate] = useState<string>('');

    // Generate next 3 dates
    const dates = Array.from({ length: 3 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() + i + 1);
        return d;
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedDate) return;

        const success = await rescheduleDelivery(token, selectedDate);
        if (success) {
            onSuccess();
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="text-red-500 text-sm">{error}</div>}

            <div className="text-sm text-gray-600 mb-2">
                When would you like us to reattempt the delivery?
            </div>

            <div className="space-y-2">
                {dates.map((date) => {
                    const dateStr = date.toISOString().split('T')[0];
                    const displayStr = date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

                    return (
                        <label key={dateStr} className={`block p-3 border rounded-lg cursor-pointer flex items-center justify-between ${selectedDate === dateStr ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                            <div className="flex items-center">
                                <input
                                    type="radio"
                                    name="deliveryDate"
                                    value={dateStr}
                                    checked={selectedDate === dateStr}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                                />
                                <span className="ml-3 text-sm font-medium text-gray-900">{displayStr}</span>
                            </div>
                        </label>
                    );
                })}
            </div>

            <div className="pt-2">
                <button
                    type="submit"
                    disabled={loading || !selectedDate}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                    {loading ? 'Processing...' : 'Confirm Reschedule'}
                </button>
            </div>
        </form>
    );
};

export default RescheduleForm;
