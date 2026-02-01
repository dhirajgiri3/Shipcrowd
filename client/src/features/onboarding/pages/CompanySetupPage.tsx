import { useState } from 'react';
import { useAuth } from '@/src/features/auth/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useToast } from '@/src/components/ui/feedback/Toast';
import { Loader } from '@/src/components/ui/feedback/Loader';

/**
 * Company Setup Page
 * First step in onboarding for users without a company.
 * Collects company details and creates the company profile.
 */
export const CompanySetupPage = () => {
    const { createCompany, isLoading } = useAuth();
    const router = useRouter();
    const { addToast } = useToast();

    const [formData, setFormData] = useState({
        name: '',
        address: {
            line1: '',
            line2: '',
            city: '',
            state: '',
            country: 'India',
            postalCode: '',
        },
        billingInfo: {
            gstin: '',
            pan: '',
        },
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        if (!formData.name.trim()) {
            newErrors.name = 'Company name is required';
        }
        if (!formData.address.line1.trim()) {
            newErrors.line1 = 'Address line 1 is required';
        }
        if (!formData.address.city.trim()) {
            newErrors.city = 'City is required';
        }
        if (!formData.address.state.trim()) {
            newErrors.state = 'State is required';
        }
        if (!formData.address.postalCode.trim()) {
            newErrors.postalCode = 'Postal code is required';
        } else if (!/^\d{6}$/.test(formData.address.postalCode)) {
            newErrors.postalCode = 'Postal code must be 6 digits';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            addToast('Please fix the errors in the form', 'error');
            return;
        }

        const result = await createCompany(formData);

        if (result.success) {
            router.push('/seller/dashboard');
        }
    };

    const handleInputChange = (field: string, value: string) => {
        if (field.startsWith('address.')) {
            const addressField = field.split('.')[1];
            setFormData({
                ...formData,
                address: {
                    ...formData.address,
                    [addressField]: value,
                },
            });
        } else if (field.startsWith('billingInfo.')) {
            const billingField = field.split('.')[1];
            setFormData({
                ...formData,
                billingInfo: {
                    ...formData.billingInfo,
                    [billingField]: value,
                },
            });
        } else {
            setFormData({
                ...formData,
                [field]: value,
            });
        }
        // Clear error when user starts typing
        if (errors[field.split('.').pop() || field]) {
            setErrors({ ...errors, [field.split('.').pop() || field]: '' });
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            {isLoading && (
                <Loader
                    variant="truck"
                    fullScreen
                    message="Setting up your workspace..."
                    subMessage="We're configuring your dashboard and preferences"
                />
            )}
            <div className="max-w-2xl w-full space-y-8 bg-white p-8 rounded-lg shadow-md">
                <div>
                    <h2 className="text-3xl font-bold text-gray-900 text-center">
                        Setup Your Company
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        Let's get started by creating your company profile
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                    {/* Company Name */}
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                            Company Name *
                        </label>
                        <input
                            id="name"
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) => handleInputChange('name', e.target.value)}
                            className={`mt-1 block w-full px-3 py-2 border ${errors.name ? 'border-red-500' : 'border-gray-300'
                                } rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                            placeholder="Acme Corporation"
                        />
                        {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
                    </div>

                    {/* Address Section */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium text-gray-900">Company Address</h3>

                        <div>
                            <label htmlFor="line1" className="block text-sm font-medium text-gray-700">
                                Address Line 1 *
                            </label>
                            <input
                                id="line1"
                                type="text"
                                required
                                value={formData.address.line1}
                                onChange={(e) => handleInputChange('address.line1', e.target.value)}
                                className={`mt-1 block w-full px-3 py-2 border ${errors.line1 ? 'border-red-500' : 'border-gray-300'
                                    } rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                                placeholder="123 Main Street"
                            />
                            {errors.line1 && <p className="mt-1 text-sm text-red-600">{errors.line1}</p>}
                        </div>

                        <div>
                            <label htmlFor="line2" className="block text-sm font-medium text-gray-700">
                                Address Line 2
                            </label>
                            <input
                                id="line2"
                                type="text"
                                value={formData.address.line2}
                                onChange={(e) => handleInputChange('address.line2', e.target.value)}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Suite 100"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="city" className="block text-sm font-medium text-gray-700">
                                    City *
                                </label>
                                <input
                                    id="city"
                                    type="text"
                                    required
                                    value={formData.address.city}
                                    onChange={(e) => handleInputChange('address.city', e.target.value)}
                                    className={`mt-1 block w-full px-3 py-2 border ${errors.city ? 'border-red-500' : 'border-gray-300'
                                        } rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                                    placeholder="Mumbai"
                                />
                                {errors.city && <p className="mt-1 text-sm text-red-600">{errors.city}</p>}
                            </div>

                            <div>
                                <label htmlFor="state" className="block text-sm font-medium text-gray-700">
                                    State *
                                </label>
                                <input
                                    id="state"
                                    type="text"
                                    required
                                    value={formData.address.state}
                                    onChange={(e) => handleInputChange('address.state', e.target.value)}
                                    className={`mt-1 block w-full px-3 py-2 border ${errors.state ? 'border-red-500' : 'border-gray-300'
                                        } rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                                    placeholder="Maharashtra"
                                />
                                {errors.state && <p className="mt-1 text-sm text-red-600">{errors.state}</p>}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="postalCode" className="block text-sm font-medium text-gray-700">
                                    Postal Code *
                                </label>
                                <input
                                    id="postalCode"
                                    type="text"
                                    required
                                    value={formData.address.postalCode}
                                    onChange={(e) => handleInputChange('address.postalCode', e.target.value)}
                                    className={`mt-1 block w-full px-3 py-2 border ${errors.postalCode ? 'border-red-500' : 'border-gray-300'
                                        } rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                                    placeholder="400001"
                                    maxLength={6}
                                />
                                {errors.postalCode && (
                                    <p className="mt-1 text-sm text-red-600">{errors.postalCode}</p>
                                )}
                            </div>

                            <div>
                                <label htmlFor="country" className="block text-sm font-medium text-gray-700">
                                    Country
                                </label>
                                <input
                                    id="country"
                                    type="text"
                                    value={formData.address.country}
                                    readOnly
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-gray-50 rounded-md shadow-sm"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Billing Information (Optional) */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium text-gray-900">
                            Billing Information <span className="text-sm text-gray-500">(Optional)</span>
                        </h3>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="gstin" className="block text-sm font-medium text-gray-700">
                                    GSTIN
                                </label>
                                <input
                                    id="gstin"
                                    type="text"
                                    value={formData.billingInfo.gstin}
                                    onChange={(e) => handleInputChange('billingInfo.gstin', e.target.value.toUpperCase())}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="22AAAAA0000A1Z5"
                                    maxLength={15}
                                />
                            </div>

                            <div>
                                <label htmlFor="pan" className="block text-sm font-medium text-gray-700">
                                    PAN
                                </label>
                                <input
                                    id="pan"
                                    type="text"
                                    value={formData.billingInfo.pan}
                                    onChange={(e) => handleInputChange('billingInfo.pan', e.target.value.toUpperCase())}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="AAAAA0000A"
                                    maxLength={10}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {/* We can keep this spinner for button-level feedback if the full screen loader is not covering everything immediately or if we want dual feedback */}
                            {isLoading ? (
                                <>
                                    <svg
                                        className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                    >
                                        <circle
                                            className="opacity-25"
                                            cx="12"
                                            cy="12"
                                            r="10"
                                            stroke="currentColor"
                                            strokeWidth="4"
                                        ></circle>
                                        <path
                                            className="opacity-75"
                                            fill="currentColor"
                                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                        ></path>
                                    </svg>
                                    Creating Company...
                                </>
                            ) : (
                                'Create Company & Continue'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
