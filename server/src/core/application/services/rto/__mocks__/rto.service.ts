/**
 * Manual mock for RTOService - used by NDR action executor tests
 * so dynamic import('../../rto/rto.service.js') gets this mock.
 */
export default {
    triggerRTO: jest.fn().mockResolvedValue({
        rtoEventId: 'rto-123',
        reverseAwb: 'REV-AWB-456',
    }),
};
