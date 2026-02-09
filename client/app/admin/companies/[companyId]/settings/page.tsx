import { RateCardSettings } from './components/RateCardSettings';

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

            <RateCardSettings companyId={companyId} />
        </div>
    );
}
