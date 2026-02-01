export * from './geography';
export * from './carriers';

export const isUsingMockData = process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true';

export const getCourierLogo = (courierName: string) => {
    // Placeholder function based on usage in ShipmentsClient
    return `/assets/couriers/${courierName.toLowerCase()}.png`;
};
