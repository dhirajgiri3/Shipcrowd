export const isOrderCentricShippingEnabled = (): boolean => {
  return process.env.NEXT_PUBLIC_SELLER_ORDER_CENTRIC_SHIPPING !== 'false';
};

