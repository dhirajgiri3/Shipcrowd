/**
 * Delhivery Status Mapping Unit Tests
 */

import { DELHIVERY_STATUS_MAPPINGS } from '../../../src/core/application/services/courier/status-mappings/delhivery-status-mappings';
import { StatusMapperService } from '../../../src/core/application/services/courier/status-mappings/status-mapper.service';

describe('Delhivery Status Mapping', () => {
    beforeAll(() => {
        StatusMapperService.clear();
        StatusMapperService.register(DELHIVERY_STATUS_MAPPINGS);
    });

    it('maps delivered', () => {
        const mapping = StatusMapperService.map('delhivery', 'DL|DELIVERED');
        expect(mapping.internalStatus).toBe('delivered');
        expect(mapping.isTerminal).toBe(true);
    });

    it('maps dispatched to out_for_delivery', () => {
        const mapping = StatusMapperService.map('delhivery', 'UD|DISPATCHED');
        expect(mapping.internalStatus).toBe('out_for_delivery');
    });

    it('maps NDR based on NSL code', () => {
        const mapping = StatusMapperService.map('delhivery', 'UD|IN TRANSIT|EOD-74');
        expect(mapping.internalStatus).toBe('ndr');
        expect(mapping.allowsReattempt).toBe(true);
    });
});
