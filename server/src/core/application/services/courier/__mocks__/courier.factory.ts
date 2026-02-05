/**
 * Manual mock for CourierFactory - used by NDR action executor tests
 * so dynamic import('../../courier/courier.factory.js') gets this mock.
 */
const mockRequestReattempt = jest.fn().mockResolvedValue({
    success: true,
    message: 'Reattempt scheduled',
});

export class CourierFactory {
    static getProvider = jest.fn().mockResolvedValue({
        requestReattempt: mockRequestReattempt,
    });
}
