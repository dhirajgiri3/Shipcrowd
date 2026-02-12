import Link from 'next/link';

export default async function CompanySettingsPage({
    params,
}: {
    params: Promise<{ companyId: string }>;
}) {
    const { companyId } = await params;

    return (
        <div className="space-y-6 p-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Company Settings</h1>
                <p className="text-gray-600 mt-1">Manage company configuration and preferences</p>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-4">
                <h2 className="text-lg font-semibold text-gray-900">Pricing Management</h2>
                <p className="mt-2 text-sm text-gray-600">
                    Legacy ratecard assignment has been retired. Configure pricing through service-level cards and policy controls.
                </p>
                <Link
                    href="/admin/pricing-studio"
                    className="mt-3 inline-flex rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                    Open Pricing Studio
                </Link>
                <p className="mt-2 text-xs text-gray-500">Company: {companyId}</p>
            </div>
        </div>
    );
}
