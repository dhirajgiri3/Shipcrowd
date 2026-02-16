import mongoose from 'mongoose';
import { DelhiveryAuth } from '../../../src/infrastructure/external/couriers/delhivery/delhivery.auth';
import Integration from '../../../src/infrastructure/database/mongoose/models/system/integrations/integration.model';

jest.mock('../../../src/infrastructure/database/mongoose/models/system/integrations/integration.model', () => ({
    __esModule: true,
    default: {
        collection: {
            find: jest.fn(),
        },
    },
}));

describe('DelhiveryAuth', () => {
    const mockedFind = Integration.collection.find as jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();
        delete process.env.DELHIVERY_API_TOKEN;
        delete process.env.DELHIVERY_API_KEY;
    });

    it('uses platform-scoped integration token when company-scoped token is absent', async () => {
        mockedFind.mockReturnValue({
            toArray: jest.fn().mockResolvedValue([
                {
                    companyId: null,
                    credentials: { apiKey: 'platform-token' },
                },
            ]),
        });

        const auth = new DelhiveryAuth(new mongoose.Types.ObjectId());
        const token = await auth.getToken();

        expect(token).toBe('platform-token');
    });

    it('prefers company-scoped integration token over platform-scoped token', async () => {
        const companyId = new mongoose.Types.ObjectId();
        mockedFind.mockReturnValue({
            toArray: jest.fn().mockResolvedValue([
                {
                    companyId: null,
                    credentials: { apiKey: 'platform-token' },
                },
                {
                    companyId,
                    credentials: { apiKey: 'company-token' },
                },
            ]),
        });

        const auth = new DelhiveryAuth(companyId);
        const token = await auth.getToken();

        expect(token).toBe('company-token');
    });
});
