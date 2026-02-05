/**
 * Shared Shipment mock for NDR action executor tests.
 * Used by both models and models/index mocks so dynamic import gets the same reference.
 */
export const mockShipmentFindById = jest.fn().mockReturnValue({
    select: jest.fn().mockResolvedValue({ carrier: 'velocity-shipfast' }),
});

export const mockShipment = {
    findById: mockShipmentFindById,
};
