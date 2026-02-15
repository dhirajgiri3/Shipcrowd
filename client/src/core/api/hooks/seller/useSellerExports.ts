import { useMutation, UseMutationOptions } from '@tanstack/react-query';
import { apiClient, ApiError } from '../../http';
import { handleApiError, showSuccessToast } from '@/src/lib/error';

export type SellerExportModule =
  | 'orders'
  | 'shipments'
  | 'cod_remittance_pending'
  | 'cod_remittance_history'
  | 'wallet_transactions'
  | 'returns'
  | 'ndr'
  | 'rto'
  | 'cod_discrepancies'
  | 'audit_logs'
  | 'analytics_dashboard'
  | 'pincode_checker'
  | 'bulk_address_validation';

export interface SellerExportRequest {
  module: SellerExportModule;
  filters?: Record<string, unknown>;
  filename?: string;
}

const filenameFromDisposition = (disposition?: string | null): string | undefined => {
  if (!disposition) return undefined;
  const match = disposition.match(/filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i);
  const encoded = match?.[1];
  const plain = match?.[2];
  if (encoded) return decodeURIComponent(encoded);
  return plain;
};

const downloadBlob = (blob: Blob, fileName: string): void => {
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(url);
};

export const useSellerExport = (
  options?: UseMutationOptions<void, ApiError, SellerExportRequest>
) => {
  return useMutation<void, ApiError, SellerExportRequest>({
    mutationFn: async (request) => {
      const response = await apiClient.post('/seller/exports', {
        module: request.module,
        filters: request.filters || {},
      }, {
        responseType: 'blob',
      });

      const headerFilename = filenameFromDisposition(response.headers['content-disposition']);
      const fallback = `${request.module}-${new Date().toISOString().slice(0, 10)}.csv`;
      const fileName = request.filename || headerFilename || fallback;
      downloadBlob(new Blob([response.data]), fileName);
    },
    onSuccess: () => {
      showSuccessToast('Export generated successfully');
    },
    onError: (error) => handleApiError(error),
    ...options,
  });
};

export default useSellerExport;
