/**
 * useModalState Hook
 *
 * Centralized modal/dialog state management.
 * Combines open/close toggle with submission state and error handling.
 *
 * Features:
 * - Simple open/close/toggle management
 * - Built-in submission state tracking
 * - Error handling
 * - Auto-close on success
 * - Callback support for lifecycle events
 *
 * Usage:
 * ```typescript
 * const modal = useModalState({
 *   onClose: () => console.log('Modal closed'),
 *   onSuccess: () => console.log('Success!'),
 * });
 *
 * // In component:
 * const handleSubmit = async (data) => {
 *   try {
 *     await modal.submit(async () => {
 *       await api.create(data);
 *     });
 *     modal.close(); // Auto close on success
 *   } catch (err) {
 *     modal.setError(err.message);
 *   }
 * };
 *
 * // In JSX:
 * <Dialog open={modal.isOpen} onOpenChange={modal.setIsOpen}>
 *   {modal.error && <Alert>{modal.error}</Alert>}
 *   {modal.isSubmitting && <Loader />}
 *   <button onClick={() => handleSubmit(data)}>Submit</button>
 * </Dialog>
 * ```
 */

import { useState, useCallback } from 'react';

/**
 * Modal state options
 */
export interface UseModalStateOptions {
  /**
   * Initial open state
   * @default false
   */
  initialOpen?: boolean;

  /**
   * Called when modal opens
   */
  onOpen?: () => void;

  /**
   * Called when modal closes
   */
  onClose?: () => void;

  /**
   * Called when submission succeeds
   */
  onSuccess?: () => void;

  /**
   * Called when submission fails
   */
  onError?: (error: Error) => void;
}

/**
 * Modal state return type
 */
export interface UseModalStateReturn {
  // State
  isOpen: boolean;
  isSubmitting: boolean;
  error: string | null;

  // Open/Close methods
  open: () => void;
  close: () => void;
  setIsOpen: (open: boolean) => void;
  toggle: () => void;

  // Submission methods
  submit: <T>(fn: () => Promise<T>) => Promise<T | undefined>;
  setError: (error: string | null) => void;
  clearError: () => void;
}

/**
 * useModalState Hook
 *
 * Provides complete modal state management with submission handling
 */
export const useModalState = (options: UseModalStateOptions = {}): UseModalStateReturn => {
  const { initialOpen = false, onOpen, onClose, onSuccess, onError } = options;

  const [isOpen, setIsOpenState] = useState(initialOpen);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setErrorState] = useState<string | null>(null);

  /**
   * Set open state with lifecycle callbacks
   */
  const setIsOpen = useCallback(
    (open: boolean) => {
      setIsOpenState(open);

      if (open) {
        onOpen?.();
      } else {
        onClose?.();
      }
    },
    [onOpen, onClose]
  );

  /**
   * Open modal
   */
  const open = useCallback(() => {
    setIsOpen(true);
  }, [setIsOpen]);

  /**
   * Close modal
   */
  const close = useCallback(() => {
    setIsOpen(false);
    setErrorState(null);
  }, [setIsOpen]);

  /**
   * Toggle modal open/closed
   */
  const toggle = useCallback(() => {
    setIsOpen(!isOpen);
  }, [isOpen, setIsOpen]);

  /**
   * Submit with loading and error handling
   * Wraps async function with loading state management
   */
  const submit = useCallback(
    async <T,>(fn: () => Promise<T>): Promise<T | undefined> => {
      try {
        setErrorState(null);
        setIsSubmitting(true);

        const result = await fn();

        setIsSubmitting(false);
        onSuccess?.();

        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setErrorState(error.message);
        setIsSubmitting(false);
        onError?.(error);

        throw error;
      }
    },
    [onSuccess, onError]
  );

  /**
   * Set error message
   */
  const setError = useCallback((errorMsg: string | null) => {
    setErrorState(errorMsg);
  }, []);

  /**
   * Clear error message
   */
  const clearError = useCallback(() => {
    setErrorState(null);
  }, []);

  return {
    isOpen,
    isSubmitting,
    error,
    open,
    close,
    setIsOpen,
    toggle,
    submit,
    setError,
    clearError,
  };
};

export default useModalState;
