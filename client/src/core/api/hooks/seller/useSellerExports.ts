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

interface AsyncExportAccepted {
  mode: 'async';
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'expired';
  downloadUrl?: string;
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

const parseAsyncResponse = async (responseBlob: Blob): Promise<AsyncExportAccepted | null> => {
  try {
    const text = await responseBlob.text();
    if (!text) return null;
    const parsed = JSON.parse(text);
    const payload = parsed?.data || parsed;
    if (payload?.mode === 'async' && payload?.jobId) {
      return payload as AsyncExportAccepted;
    }
    return null;
  } catch {
    return null;
  }
};

const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));
const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 240;

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

      const contentType = String(response.headers['content-type'] || '');
      const shouldParseAsync = response.status === 202 || contentType.includes('application/json');
      const asyncAccepted = shouldParseAsync
        ? await parseAsyncResponse(response.data as Blob)
        : null;
      if (response.status === 202 && asyncAccepted) {
        let finalStatus: any = null;
        for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt += 1) {
          await sleep(POLL_INTERVAL_MS);
          const statusResponse = await apiClient.get(`/seller/exports/jobs/${asyncAccepted.jobId}`);
          finalStatus = statusResponse.data?.data || statusResponse.data;

          if (finalStatus?.status === 'completed') {
            break;
          }

          if (finalStatus?.status === 'failed') {
            throw {
              code: 'EXPORT_JOB_FAILED',
              message: finalStatus?.errorMessage || 'Export job failed',
            } as ApiError;
          }

          if (finalStatus?.status === 'expired') {
            throw {
              code: 'EXPORT_JOB_EXPIRED',
              message: 'Export file expired. Please generate a new export.',
            } as ApiError;
          }
        }

        if (finalStatus?.status !== 'completed') {
          throw {
            code: 'EXPORT_JOB_TIMEOUT',
            message: 'Export is taking longer than expected. Please try again in a few minutes.',
          } as ApiError;
        }

        const downloadResponse = await apiClient.get(
          `/seller/exports/jobs/${asyncAccepted.jobId}/download`,
          { responseType: 'blob' }
        );
        const asyncFilename = filenameFromDisposition(downloadResponse.headers['content-disposition']);
        const asyncFallback = `${request.module}-${new Date().toISOString().slice(0, 10)}.csv`;
        const asyncFileName = request.filename || asyncFilename || asyncFallback;
        downloadBlob(downloadResponse.data as Blob, asyncFileName);
        return;
      }

      const headerFilename = filenameFromDisposition(response.headers['content-disposition']);
      const fallback = `${request.module}-${new Date().toISOString().slice(0, 10)}.csv`;
      const fileName = request.filename || headerFilename || fallback;
      const syncBlob = response.data instanceof Blob ? response.data : new Blob([response.data]);
      downloadBlob(syncBlob, fileName);
    },
    onSuccess: () => {
      showSuccessToast('Export generated successfully');
    },
    onError: (error) => handleApiError(error),
    ...options,
  });
};

export default useSellerExport;
