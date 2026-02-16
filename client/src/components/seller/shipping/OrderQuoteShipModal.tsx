"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, RefreshCw, Wallet } from 'lucide-react';
import { Modal } from '@/src/components/ui/feedback/Modal';
import { Button } from '@/src/components/ui/core/Button';
import { cn, formatCurrency } from '@/src/lib/utils';
import { useToast } from '@/src/components/ui/feedback/Toast';
import { useWalletBalance } from '@/src/core/api/hooks/finance/useWallet';
import { useWarehouses } from '@/src/core/api/hooks/logistics/useWarehouses';
import { useGetCourierRates, useShipOrder } from '@/src/core/api/hooks/admin/useAdminOrders';
import { useOrder } from '@/src/core/api/hooks/orders/useOrders';
import { Order, CourierRate } from '@/src/types/domain/order';
import { trackEvent, EVENTS } from '@/src/lib/analytics';

interface OrderQuoteShipModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onShipSuccess?: (orderId: string) => void;
}

const EMPTY_WAREHOUSES: Array<{ _id: string; address?: { postalCode?: string } }> = [];
const PINCODE_REGEX = /^\d{6}$/;

const resolveOrderWarehouseId = (order: Order): string | null => {
  const warehouseId = order?.warehouseId;
  if (!warehouseId) return null;

  if (typeof warehouseId === 'string') return warehouseId;
  return warehouseId._id || warehouseId.id || null;
};

const resolveOrderOriginPincode = (order: Order, warehouses: Array<{ _id: string; address?: { postalCode?: string } }>): string | null => {
  const warehouseRef = order?.warehouseId;
  if (!warehouseRef) return null;

  if (typeof warehouseRef !== 'string') {
    const orderWarehousePostal = warehouseRef.address?.postalCode;
    if (orderWarehousePostal) return orderWarehousePostal;
  }

  const orderWarehouseId = resolveOrderWarehouseId(order);
  if (!orderWarehouseId) return null;

  const matchedWarehouse = warehouses.find((warehouse) => warehouse._id === orderWarehouseId);
  return matchedWarehouse?.address?.postalCode || null;
};

const deriveOrderWeight = (order: Order): number => {
  const totalWeight = order.products.reduce((sum, product) => {
    const weight = product.weight && product.weight > 0 ? product.weight : 0.5;
    return sum + weight * product.quantity;
  }, 0);
  return totalWeight > 0 ? totalWeight : 0.5;
};

const deriveOrderDimensions = (order: Order): { length: number; width: number; height: number } => {
  let maxLength = 0;
  let maxWidth = 0;
  let maxHeight = 0;

  for (const product of order.products) {
    if (product.dimensions) {
      maxLength = Math.max(maxLength, product.dimensions.length || 0);
      maxWidth = Math.max(maxWidth, product.dimensions.width || 0);
      maxHeight = Math.max(maxHeight, product.dimensions.height || 0);
    }
  }

  // Fallback to sensible defaults if no dimensions available
  return {
    length: maxLength > 0 ? maxLength : 20,
    width: maxWidth > 0 ? maxWidth : 15,
    height: maxHeight > 0 ? maxHeight : 10,
  };
};

export function OrderQuoteShipModal({ order, isOpen, onClose, onShipSuccess }: OrderQuoteShipModalProps) {
  const { addToast } = useToast();
  const { data: walletBalance } = useWalletBalance();
  const { data: warehouses = EMPTY_WAREHOUSES } = useWarehouses();

  const [courierRates, setCourierRates] = useState<CourierRate[]>([]);
  const [selectedCourierKey, setSelectedCourierKey] = useState<string | null>(null);
  const [quoteExpiresAt, setQuoteExpiresAt] = useState<Date | null>(null);
  const [quoteTimeLeftSec, setQuoteTimeLeftSec] = useState(0);
  const [shouldFetchOrderDetails, setShouldFetchOrderDetails] = useState(false);
  const [hasMissingOriginError, setHasMissingOriginError] = useState(false);
  const [hasInvalidDestinationError, setHasInvalidDestinationError] = useState(false);

  const {
    mutateAsync: fetchCourierRates,
    isPending: isFetchingCourierRates,
  } = useGetCourierRates({ suppressDefaultErrorHandling: true });
  const {
    mutateAsync: shipOrder,
    isPending: isShipBooking,
  } = useShipOrder({ suppressDefaultErrorHandling: true });

  const bookingInFlightRef = useRef(false);
  const autoRefreshInFlightRef = useRef(false);
  const autoRefreshAttemptedExpiryRef = useRef<number | null>(null);
  const trackedModalOrderIdRef = useRef<string | null>(null);
  const requestedInitialQuotesForOrderRef = useRef<string | null>(null);

  const fallbackOrderId = isOpen && shouldFetchOrderDetails ? (order?._id || '') : '';
  const fallbackOrderQuery = useOrder(fallbackOrderId);

  const effectiveOrder = useMemo<Order | null>(() => {
    return (fallbackOrderQuery.data?.data?.order || order || null);
  }, [fallbackOrderQuery.data, order]);

  const selectedRate = useMemo(
    () => courierRates.find((rate) => (rate.optionId || rate.courierId) === selectedCourierKey),
    [courierRates, selectedCourierKey]
  );

  const estimatedCharge = selectedRate?.rate || 0;
  const availableBalance = walletBalance?.balance || 0;
  const hasSufficientBalance = availableBalance >= estimatedCharge;

  const fetchQuotesForOrder = useCallback(async (
    targetOrder: Order,
    preferredSelectionKey?: string | null,
    source: 'initial' | 'manual_refresh' | 'auto_refresh' = 'initial'
  ) => {
    const fromPincode = resolveOrderOriginPincode(targetOrder, warehouses);
    if (!fromPincode) {
      let needsDetailFetch = false;
      setShouldFetchOrderDetails((previous) => {
        if (!previous) {
          needsDetailFetch = true;
          return true;
        }
        return previous;
      });
      if (needsDetailFetch) return;

      setHasMissingOriginError(true);
      setCourierRates([]);
      setSelectedCourierKey(null);
      addToast('Assign a warehouse to this order first. Go to order settings or contact support.', 'error');
      return;
    }

    setHasMissingOriginError(false);
    const toPincode = String(targetOrder.customerInfo.address.postalCode || '').trim();
    if (!PINCODE_REGEX.test(toPincode)) {
      setHasInvalidDestinationError(true);
      setCourierRates([]);
      setSelectedCourierKey(null);
      setQuoteExpiresAt(null);
      setQuoteTimeLeftSec(0);
      addToast('Destination pincode is invalid for this order. Please update address and retry.', 'error');
      return;
    }
    setHasInvalidDestinationError(false);

    const dims = deriveOrderDimensions(targetOrder);
    const result = await fetchCourierRates({
      fromPincode,
      toPincode,
      weight: deriveOrderWeight(targetOrder),
      paymentMode: targetOrder.paymentMethod === 'cod' ? 'COD' : 'Prepaid',
      orderValue: Number(targetOrder.totals?.total || 0),
      length: dims.length,
      width: dims.width,
      height: dims.height,
    });

    const rates = result.data || [];
    const recommendedKey =
      rates.find((rate) => rate.isRecommended)?.optionId ||
      rates[0]?.optionId ||
      rates[0]?.courierId ||
      null;

    const preservedKey = preferredSelectionKey
      ? rates.find((rate) => (rate.optionId || rate.courierId) === preferredSelectionKey)?.optionId ||
        rates.find((rate) => (rate.optionId || rate.courierId) === preferredSelectionKey)?.courierId ||
        null
      : null;

    const nextSelectedKey = preservedKey || recommendedKey;

    const expiresAtRaw = rates[0]?.expiresAt;
    const expiresAt = expiresAtRaw ? new Date(expiresAtRaw) : null;
    const nextTimeLeft = expiresAt
      ? Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000))
      : 0;

    setCourierRates(rates);
    setSelectedCourierKey(nextSelectedKey);
    setQuoteExpiresAt(expiresAt);
    setQuoteTimeLeftSec(nextTimeLeft);
    autoRefreshAttemptedExpiryRef.current = null;

    trackEvent(
      source === 'initial' ? EVENTS.SHIPPING_QUOTE_FETCHED : EVENTS.SHIPPING_QUOTE_REFRESHED,
      {
        order_id: targetOrder._id,
        rates_count: rates.length,
        quote_session_id: rates[0]?.sessionId || null,
        source,
      }
    );
  }, [addToast, fetchCourierRates, warehouses]);

  const refreshQuotes = useCallback(async (source: 'manual_refresh' | 'auto_refresh' = 'manual_refresh') => {
    if (!effectiveOrder) return;
    await fetchQuotesForOrder(effectiveOrder, selectedCourierKey, source);
  }, [effectiveOrder, fetchQuotesForOrder, selectedCourierKey]);

  const resetState = useCallback(() => {
    setCourierRates([]);
    setSelectedCourierKey(null);
    setQuoteExpiresAt(null);
    setQuoteTimeLeftSec(0);
    setShouldFetchOrderDetails(false);
    setHasMissingOriginError(false);
    setHasInvalidDestinationError(false);
    setHasInvalidDestinationError(false);
    bookingInFlightRef.current = false;
    autoRefreshInFlightRef.current = false;
    autoRefreshAttemptedExpiryRef.current = null;
    trackedModalOrderIdRef.current = null;
    requestedInitialQuotesForOrderRef.current = null;
  }, []);

  useEffect(() => {
    if (!isOpen || !order) return;
    resetState();
  }, [isOpen, order?._id, resetState]);

  useEffect(() => {
    if (!isOpen || !order) return;
    if (trackedModalOrderIdRef.current === order._id) return;
    trackedModalOrderIdRef.current = order._id;
    trackEvent(EVENTS.SHIPPING_MODAL_OPENED, {
      order_id: order._id,
      order_status: order.currentStatus,
    });
  }, [isOpen, order?._id, order?.currentStatus]);

  useEffect(() => {
    if (!isOpen || !effectiveOrder) return;
    if (courierRates.length > 0) return;
    if (requestedInitialQuotesForOrderRef.current === effectiveOrder._id) return;
    requestedInitialQuotesForOrderRef.current = effectiveOrder._id;

    fetchQuotesForOrder(effectiveOrder, null, 'initial').catch(() => {
      requestedInitialQuotesForOrderRef.current = null;
      addToast('Unable to fetch courier rates right now', 'error');
    });
  }, [addToast, courierRates.length, effectiveOrder, fetchQuotesForOrder, isOpen]);

  useEffect(() => {
    if (!isOpen || !quoteExpiresAt) return;
    const tick = () => {
      const next = Math.max(0, Math.floor((quoteExpiresAt.getTime() - Date.now()) / 1000));
      setQuoteTimeLeftSec(next);
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [isOpen, quoteExpiresAt]);

  useEffect(() => {
    if (!isOpen || !quoteExpiresAt || quoteTimeLeftSec > 0) return;
    if (autoRefreshInFlightRef.current || isFetchingCourierRates) return;
    const quoteExpiryMs = quoteExpiresAt.getTime();
    if (autoRefreshAttemptedExpiryRef.current === quoteExpiryMs) return;

    autoRefreshInFlightRef.current = true;
    autoRefreshAttemptedExpiryRef.current = quoteExpiryMs;
    refreshQuotes('auto_refresh')
      .catch(() => {
        addToast('Unable to refresh expired quote right now', 'error');
      })
      .finally(() => {
        autoRefreshInFlightRef.current = false;
      });
  }, [addToast, isFetchingCourierRates, isOpen, quoteExpiresAt, quoteTimeLeftSec, refreshQuotes]);

  const handleBookShipment = async () => {
    if (!effectiveOrder || !selectedCourierKey || bookingInFlightRef.current) {
      return;
    }

    if (!hasSufficientBalance) {
      addToast('Insufficient wallet balance. Please recharge wallet and retry.', 'error');
      return;
    }

    if (quoteExpiresAt && quoteExpiresAt.getTime() <= Date.now()) {
      addToast('Quote expired. Refreshing latest rates...', 'error');
      await refreshQuotes();
      return;
    }

    const pickedRate = courierRates.find((rate) => (rate.optionId || rate.courierId) === selectedCourierKey);
    if (!pickedRate?.sessionId || !pickedRate?.optionId) {
      addToast('Invalid quote selection. Please refresh and try again.', 'error');
      return;
    }

    trackEvent(EVENTS.SHIPPING_CONFIRMED, {
      order_id: effectiveOrder._id,
      courier_id: pickedRate.courierId,
      option_id: pickedRate.optionId,
      quote_session_id: pickedRate.sessionId,
      quoted_amount: pickedRate.rate,
      is_recommended: !!pickedRate.isRecommended,
    });

    bookingInFlightRef.current = true;
    try {
      await shipOrder({
        orderId: effectiveOrder._id,
        courierId: pickedRate.courierId || selectedCourierKey,
        serviceType: pickedRate.serviceType || 'standard',
        sessionId: pickedRate.sessionId,
        optionId: pickedRate.optionId,
      });

      addToast(`Shipment created for order ${effectiveOrder.orderNumber}`, 'success');
      trackEvent(EVENTS.SHIPPING_SUCCESS, {
        order_id: effectiveOrder._id,
        courier_id: pickedRate.courierId,
        option_id: pickedRate.optionId,
        quote_session_id: pickedRate.sessionId,
      });
      onShipSuccess?.(effectiveOrder._id);
      onClose();
      resetState();
    } catch (bookingError: any) {
      const message = bookingError?.message || 'Failed to create shipment';
      const code = bookingError?.code || bookingError?.response?.data?.error?.code;

      if (code === 'BIZ_INSUFFICIENT_BALANCE' || /insufficient/i.test(message)) {
        addToast('Insufficient wallet balance. Please recharge wallet and retry.', 'error');
      } else if (
        code === 'BIZ_WALLET_TRANSACTION_FAILED' ||
        /invalid amount:\s*0/i.test(message)
      ) {
        addToast('Quote amount became invalid. Refreshing latest rates...', 'error');
        await refreshQuotes();
      } else if (/expired/i.test(message)) {
        addToast('Quote expired. Refreshing latest rates...', 'error');
        await refreshQuotes();
      } else if (/active shipment/i.test(message)) {
        addToast('An active shipment already exists for this order.', 'error');
      } else if (/status/i.test(message)) {
        addToast('Order is no longer eligible for shipping.', 'error');
      } else {
        addToast(message, 'error');
      }

      trackEvent(EVENTS.SHIPPING_FAILED, {
        order_id: effectiveOrder._id,
        error_code: code || 'UNKNOWN',
        error_message: message,
      });
    } finally {
      bookingInFlightRef.current = false;
    }
  };

  const isBookingDisabled =
    !effectiveOrder ||
    !selectedCourierKey ||
    !hasSufficientBalance ||
    isShipBooking ||
    hasMissingOriginError ||
    hasInvalidDestinationError ||
    isFetchingCourierRates ||
    (quoteExpiresAt ? quoteExpiresAt.getTime() <= Date.now() : false);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Ship Order" size="lg">
      <div className="space-y-5">
        {effectiveOrder && (
          <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-3">
            <p className="text-sm font-semibold text-[var(--text-primary)]">{effectiveOrder.orderNumber}</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              {effectiveOrder.customerInfo.name} • {effectiveOrder.customerInfo.address.city}, {effectiveOrder.customerInfo.address.state}
            </p>
          </div>
        )}

        <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-[var(--text-secondary)]">
              <Wallet className="w-4 h-4" />
              Wallet Balance
            </span>
            <span className="font-semibold text-[var(--text-primary)]">{formatCurrency(availableBalance)}</span>
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[var(--text-secondary)]">Estimated Shipping Charge</span>
            <span className="font-semibold text-[var(--text-primary)]">{formatCurrency(estimatedCharge)}</span>
          </div>
          {!hasSufficientBalance && (
            <div className="mt-2 text-xs text-[var(--error)]">
              Insufficient balance for booking.
              <button
                type="button"
                className="ml-2 underline"
                onClick={() => window.location.assign('/seller/wallet')}
                aria-label="Recharge wallet"
              >
                Recharge wallet
              </button>
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-[var(--text-primary)]">Select a courier</p>
            <div className="flex items-center gap-2">
              {quoteExpiresAt && (
                <span
                  className="text-xs text-[var(--text-muted)]"
                  title="Rates refresh automatically when expired"
                >
                  Expires in {Math.floor(quoteTimeLeftSec / 60)}:{String(quoteTimeLeftSec % 60).padStart(2, '0')}
                </span>
              )}
              <Button
                variant="outline"
                size="sm"
                disabled={!effectiveOrder || isFetchingCourierRates}
                onClick={() => refreshQuotes('manual_refresh')}
              >
                <RefreshCw className={cn('w-3.5 h-3.5 mr-1.5', isFetchingCourierRates && 'animate-spin')} />
                Refresh rates
              </Button>
            </div>
          </div>

          {isFetchingCourierRates ? (
            <div className="flex items-center justify-center py-8 text-sm text-[var(--text-secondary)]" aria-live="polite">
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Loading courier quotes...
            </div>
          ) : courierRates.length === 0 ? (
            <div className="py-8 text-center text-sm text-[var(--text-muted)] border border-dashed border-[var(--border-subtle)] rounded-lg">
              {hasMissingOriginError
                ? 'Assign a warehouse to this order to load serviceable courier quotes.'
                : 'No quotes available for this order right now.'}
            </div>
          ) : (
            <div
              role="radiogroup"
              aria-label="Select courier option"
              className="space-y-2 max-h-[260px] overflow-y-auto pr-1"
            >
              {courierRates.map((rate) => {
                const key = rate.optionId || rate.courierId;
                const isSelected = selectedCourierKey === key;
                const ariaLabel = `${rate.courierName}, ${formatCurrency(rate.rate)}, ETA ${rate.estimatedDeliveryDays} day(s)${rate.isRecommended ? ', Recommended' : ''}`;
                return (
                  <button
                    key={key}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    aria-label={ariaLabel}
                    onClick={() => setSelectedCourierKey(key)}
                    className={cn(
                      'w-full rounded-lg border p-3 text-left transition-all',
                      isSelected
                        ? 'border-[var(--primary-blue)] bg-[var(--primary-blue-soft)]/20'
                        : 'border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)]'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-[var(--text-primary)]">{rate.courierName}</p>
                        <p className="text-xs text-[var(--text-muted)]">
                          ETA: {rate.estimatedDeliveryDays} day(s)
                          {rate.isRecommended ? ' • Recommended' : ''}
                        </p>
                        {rate.recommendationReason && (
                          <p className="text-[10px] text-[var(--primary-blue)] mt-0.5">
                            {rate.recommendationReason}
                          </p>
                        )}
                      </div>
                      <p className="font-semibold text-[var(--text-primary)]">{formatCurrency(rate.rate)}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border-subtle)]">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleBookShipment}
            disabled={isBookingDisabled}
            title={isBookingDisabled && !isShipBooking ? 'Select a courier and ensure sufficient wallet balance' : undefined}
            className="bg-[var(--primary-blue)] hover:bg-[var(--primary-blue-deep)] text-white"
          >
            {isShipBooking ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating shipment...
              </>
            ) : (
              <>
                Ship Now
                {selectedRate?.isRecommended && (
                  <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-white/20">
                    Recommended
                  </span>
                )}
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default OrderQuoteShipModal;
