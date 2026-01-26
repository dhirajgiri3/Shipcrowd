import { RateCardSettings } from './components/RateCardSettings';

export default function CompanySettingsPage({ params }: { params: { companyId: string } }) {
    return (
        <div className="space-y-6 p-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Company Settings</h1>
                <p className="text-gray-600 mt-1">Manage company configuration and preferences</p>
            </div>

            <RateCardSettings companyId={params.companyId} />
        </div>
    );
}
