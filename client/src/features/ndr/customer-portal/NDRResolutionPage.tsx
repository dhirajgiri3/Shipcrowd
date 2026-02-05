import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useNDRCustomerPortal } from '../../../core/api/hooks/ndr/useNDRCustomerPortal';
import AddressUpdateForm from './AddressUpdateForm';
import RescheduleForm from './RescheduleForm';
import CancelForm from './CancelForm';

// Simple Alert Component (can be replaced with UI library component)
const Alert = ({ type, message }: { type: 'error' | 'success'; message: string }) => (
    <div className={`p-4 mb-4 rounded ${type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
        {message}
    </div>
);

const NDRResolutionPage: React.FC = () => {
    const { token } = useParams<{ token: string }>();
    const { loading, error, ndrDetails, fetchDetails } = useNDRCustomerPortal();
    const [activeTab, setActiveTab] = useState<'update' | 'reschedule' | 'cancel'>('update');
    const [actionSuccess, setActionSuccess] = useState<string | null>(null);

    useEffect(() => {
        if (token) {
            fetchDetails(token);
        }
    }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

    if (loading && !ndrDetails) {
        return <div className="flex justify-center items-center h-screen">Loading...</div>;
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-center h-screen">
                <div className="text-red-500 text-xl font-bold mb-4">Error</div>
                <p>{error}</p>
            </div>
        );
    }

    if (!ndrDetails) {
        return null; // Should ideally show 404
    }

    if (actionSuccess) {
        return (
            <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-md text-center">
                <div className="text-green-500 text-5xl mb-4">✓</div>
                <h2 className="text-2xl font-bold mb-2">Request Submitted</h2>
                <p className="text-gray-600">{actionSuccess}</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden">
                {/* Header */}
                <div className="bg-blue-600 p-6 text-white">
                    <h1 className="text-xl font-bold">Delivery Issue</h1>
                    <p className="text-blue-100 text-sm mt-1">Order #{ndrDetails.orderNumber}</p>
                </div>

                {/* Tracking Info */}
                <div className="p-6 border-b border-gray-100">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-xs text-gray-500 uppercase">Status</p>
                            <p className="text-red-600 font-semibold">{ndrDetails.reason}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-gray-500 uppercase">Attempt</p>
                            <p className="font-semibold">{ndrDetails.attemptNumber}</p>
                        </div>
                    </div>

                    {/* Order Items Preview */}
                    <div className="bg-gray-50 p-3 rounded-lg flex items-center space-x-3">
                        {ndrDetails.orderItems[0]?.image && (
                            <img src={ndrDetails.orderItems[0].image} alt="Product" className="w-12 h-12 rounded object-cover" />
                        )}
                        <div>
                            <p className="text-sm font-medium text-gray-900">{ndrDetails.orderItems[0]?.name}</p>
                            <p className="text-xs text-gray-500">
                                {ndrDetails.orderItems.length > 1 ? `+${ndrDetails.orderItems.length - 1} more items` : `Qty: ${ndrDetails.orderItems[0]?.quantity}`}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Actions Tabs */}
                <div className="flex border-b border-gray-200">
                    <button
                        onClick={() => setActiveTab('update')}
                        className={`flex-1 py-3 text-sm font-medium ${activeTab === 'update' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Correct Address
                    </button>
                    <button
                        onClick={() => setActiveTab('reschedule')}
                        className={`flex-1 py-3 text-sm font-medium ${activeTab === 'reschedule' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Reschedule
                    </button>
                    <button
                        onClick={() => setActiveTab('cancel')}
                        className={`flex-1 py-3 text-sm font-medium ${activeTab === 'cancel' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Cancel
                    </button>
                </div>

                {/* Forms */}
                <div className="p-6">
                    {activeTab === 'update' && (
                        <AddressUpdateForm
                            token={token!}
                            currentAddress={ndrDetails.shippingAddress}
                            onSuccess={() => setActionSuccess('Your Request for Delivery Re-attempt has been received. We will try to deliver your shipment on priority.')}
                        />
                    )}
                    {activeTab === 'reschedule' && (
                        <RescheduleForm
                            token={token!}
                            onSuccess={() => setActionSuccess('Delivery has been rescheduled successfully.')}
                        />
                    )}
                    {activeTab === 'cancel' && (
                        <CancelForm
                            token={token!}
                            onSuccess={() => setActionSuccess('Order Cancellation Request Received.')}
                            totalAmount={ndrDetails.totalAmount}
                        />
                    )}
                </div>
            </div>

            <div className="text-center mt-6 text-gray-400 text-xs">
                Powered by Shipcrowd
            </div>
        </div>
    );
};

export default NDRResolutionPage;
