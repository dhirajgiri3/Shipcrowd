import React, { useState } from 'react';
import { useNDRCustomerPortal } from '../../../core/api/hooks/ndr/useNDRCustomerPortal';

interface Props {
    token: string;
    currentAddress: {
        line1: string;
        line2?: string;
        city: string;
        state: string;
        pincode: string;
        phone: string;
    };
    onSuccess: () => void;
}

const AddressUpdateForm: React.FC<Props> = ({ token, currentAddress, onSuccess }) => {
    const { updateAddress, loading, error } = useNDRCustomerPortal();
    const [formData, setFormData] = useState({
        line1: currentAddress.line1,
        line2: currentAddress.line2 || '',
        landmark: '',
        alternatePhone: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const success = await updateAddress(token, formData);
        if (success) {
            onSuccess();
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="text-red-500 text-sm">{error}</div>}

            <div className="text-sm text-gray-600 mb-2">
                It seems like the courier had trouble finding this address. Please correct it below.
            </div>

            <div>
                <label className="block text-xs font-medium text-gray-700">Address Line 1 *</label>
                <input
                    type="text"
                    required
                    value={formData.line1}
                    onChange={(e) => setFormData({ ...formData, line1: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2 border"
                />
            </div>

            <div>
                <label className="block text-xs font-medium text-gray-700">Address Line 2 (Area/Locality)</label>
                <input
                    type="text"
                    value={formData.line2}
                    onChange={(e) => setFormData({ ...formData, line2: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2 border"
                />
            </div>

            <div>
                <label className="block text-xs font-medium text-gray-700">Landmark</label>
                <input
                    type="text"
                    value={formData.landmark}
                    onChange={(e) => setFormData({ ...formData, landmark: e.target.value })}
                    placeholder="Near..."
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2 border"
                />
            </div>

            <div>
                <label className="block text-xs font-medium text-gray-700">Alternate Phone (Optional)</label>
                <input
                    type="tel"
                    value={formData.alternatePhone}
                    onChange={(e) => setFormData({ ...formData, alternatePhone: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2 border"
                />
            </div>

            <div className="pt-2">
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                    {loading ? 'Updating...' : 'Update Address & Retry'}
                </button>
            </div>
        </form>
    );
};

export default AddressUpdateForm;
