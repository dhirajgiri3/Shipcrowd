/**
 * Bulk Address Validation Client Component
 * 
 * Handles all client-side logic for bulk address validation:
 * - File upload and parsing
 * - CSV validation
 * - Results display
 * - Export functionality
 */

'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useBulkValidateAddresses } from '@/src/core/api/hooks/useAddress';
import { toast } from 'sonner';
import {
    Upload,
    FileSpreadsheet,
    CheckCircle2,
    XCircle,
    Download,
    Loader2,
    X,
} from 'lucide-react';
import type { Address, BulkAddressValidationResult } from '@/src/types/api/address.types';

type ValidationStatus = 'idle' | 'parsing' | 'validating' | 'complete' | 'error';

export function BulkAddressValidationClient() {
    const [file, setFile] = useState<File | null>(null);
    const [parsedAddresses, setParsedAddresses] = useState<Address[]>([]);
    const [status, setStatus] = useState<ValidationStatus>('idle');
    const [results, setResults] = useState<BulkAddressValidationResult | null>(null);
    const [parseError, setParseError] = useState<string | null>(null);

    const { mutate: validateAddresses, isPending } = useBulkValidateAddresses();

    // Parse CSV function
    const parseCSV = useCallback((csvText: string): Address[] => {
        const lines = csvText.split('\n').filter(line => line.trim());
        if (lines.length < 2) {
            throw new Error('CSV must have at least a header row and one data row');
        }

        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

        // Required columns
        const requiredColumns = ['pincode', 'city', 'state'];
        const missingColumns = requiredColumns.filter(col => !headers.includes(col));
        if (missingColumns.length > 0) {
            throw new Error(`Missing required columns: ${missingColumns.join(', ')}`);
        }

        // Column indices
        const colIndex: Record<string, number> = {};
        headers.forEach((header, idx) => {
            colIndex[header] = idx;
        });

        const addresses: Address[] = [];
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim());

            const address: Address = {
                line1: values[colIndex['address'] ?? colIndex['line1'] ?? colIndex['address_line_1']] || '',
                line2: values[colIndex['address2'] ?? colIndex['line2'] ?? colIndex['address_line_2']] || '',
                city: values[colIndex['city']] || '',
                state: values[colIndex['state']] || '',
                pincode: values[colIndex['pincode'] ?? colIndex['zip'] ?? colIndex['postal_code']] || '',
                country: values[colIndex['country']] || 'India',
                contactName: values[colIndex['name'] ?? colIndex['contact_name']] || '',
                contactPhone: values[colIndex['phone'] ?? colIndex['mobile'] ?? colIndex['contact_phone']] || '',
            };

            // Skip empty rows
            if (!address.pincode) continue;

            addresses.push(address);
        }

        if (addresses.length === 0) {
            throw new Error('No valid addresses found in CSV');
        }

        return addresses;
    }, []);

    // Handle file drop
    const onDrop = useCallback((acceptedFiles: File[]) => {
        const csvFile = acceptedFiles[0];
        if (!csvFile) return;

        setFile(csvFile);
        setStatus('parsing');
        setParseError(null);

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target?.result as string;
                const addresses = parseCSV(text);
                setParsedAddresses(addresses);
                setStatus('idle');
                toast.success(`Parsed ${addresses.length} addresses from CSV`);
            } catch (err) {
                setParseError((err as Error).message);
                setStatus('error');
                toast.error('Failed to parse CSV');
            }
        };
        reader.onerror = () => {
            setParseError('Failed to read file');
            setStatus('error');
        };
        reader.readAsText(csvFile);
    }, [parseCSV]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'text/csv': ['.csv'],
            'application/vnd.ms-excel': ['.csv'],
        },
        maxFiles: 1,
        maxSize: 5 * 1024 * 1024, // 5MB
    });

    // Validate addresses
    const handleValidate = () => {
        if (parsedAddresses.length === 0) return;

        setStatus('validating');
        validateAddresses(
            { addresses: parsedAddresses },
            {
                onSuccess: (data) => {
                    setResults(data);
                    setStatus('complete');
                },
                onError: () => {
                    setStatus('error');
                },
            }
        );
    };

    // Export invalid addresses
    const handleExportInvalid = () => {
        if (!results) return;

        const invalidResults = results.results.filter(r => !r.isValid);
        const csv = [
            ['Address Line 1', 'City', 'State', 'Pincode', 'Errors'].join(','),
            ...invalidResults.map(r => [
                r.originalAddress.line1,
                r.originalAddress.city,
                r.originalAddress.state,
                r.originalAddress.pincode,
                r.errors.map(e => e.message).join('; '),
            ].map(v => `"${v}"`).join(','))
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'invalid-addresses.csv';
        a.click();
        URL.revokeObjectURL(url);
    };

    // Reset state
    const handleReset = () => {
        setFile(null);
        setParsedAddresses([]);
        setStatus('idle');
        setResults(null);
        setParseError(null);
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Upload Section */}
            {status === 'idle' && parsedAddresses.length === 0 && (
                <div className="p-8">
                    <div
                        {...getRootProps()}
                        className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all
                  ${isDragActive
                                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                                : 'border-gray-300 dark:border-gray-600 hover:border-primary-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                            }`}
                    >
                        <input {...getInputProps()} />
                        <Upload className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                        {isDragActive ? (
                            <p className="text-lg font-medium text-primary-600 dark:text-primary-400">
                                Drop your CSV file here...
                            </p>
                        ) : (
                            <>
                                <p className="text-lg font-medium text-gray-700 dark:text-gray-200 mb-2">
                                    Drag & drop your CSV file here
                                </p>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                                    or click to browse
                                </p>
                                <p className="text-xs text-gray-400 dark:text-gray-500">
                                    Maximum file size: 5MB • Supported format: CSV
                                </p>
                            </>
                        )}
                    </div>

                    {/* CSV Format Guide */}
                    <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
                        <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2">
                            <FileSpreadsheet className="w-5 h-5" />
                            CSV Format Requirements
                        </h3>
                        <p className="text-sm text-blue-800 dark:text-blue-200 mb-4">
                            Your CSV file should have the following columns (headers in first row):
                        </p>
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 font-mono text-sm overflow-x-auto">
                            <code className="text-gray-700 dark:text-gray-300">
                                address,city,state,pincode,name,phone
                            </code>
                        </div>
                        <p className="text-xs text-blue-700 dark:text-blue-300 mt-3">
                            Required columns: <strong>pincode, city, state</strong>
                        </p>
                    </div>
                </div>
            )}

            {/* Parsing Status */}
            {status === 'parsing' && (
                <div className="p-12 text-center">
                    <Loader2 className="w-12 h-12 mx-auto mb-4 text-primary-500 animate-spin" />
                    <p className="text-gray-600 dark:text-gray-400">Parsing CSV file...</p>
                </div>
            )}

            {/* Parse Error */}
            {status === 'error' && parseError && (
                <div className="p-8">
                    <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-6 border border-red-200 dark:border-red-800 text-center">
                        <XCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
                        <h3 className="font-semibold text-red-800 dark:text-red-200 mb-2">
                            Failed to Parse CSV
                        </h3>
                        <p className="text-sm text-red-600 dark:text-red-400 mb-4">
                            {parseError}
                        </p>
                        <button
                            onClick={handleReset}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                        >
                            Try Again
                        </button>
                    </div>
                </div>
            )}

            {/* Parsed Addresses Preview */}
            {parsedAddresses.length > 0 && !results && (
                <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                <FileSpreadsheet className="w-5 h-5 text-green-600 dark:text-green-400" />
                            </div>
                            <div>
                                <p className="font-medium text-gray-900 dark:text-white">{file?.name}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {parsedAddresses.length} addresses found
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handleReset}
                            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Preview Table */}
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden mb-6">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 dark:bg-gray-700">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">#</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Address</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">City</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">State</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Pincode</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                    {parsedAddresses.slice(0, 5).map((addr, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                            <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{idx + 1}</td>
                                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-white truncate max-w-[200px]">
                                                {addr.line1 || '-'}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{addr.city}</td>
                                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{addr.state}</td>
                                            <td className="px-4 py-3 text-sm font-mono text-gray-900 dark:text-white">{addr.pincode}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {parsedAddresses.length > 5 && (
                            <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700 text-sm text-gray-500 dark:text-gray-400 text-center">
                                and {parsedAddresses.length - 5} more...
                            </div>
                        )}
                    </div>

                    {/* Validate Button */}
                    <button
                        onClick={handleValidate}
                        disabled={isPending}
                        className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {isPending ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Validating addresses...
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="w-5 h-5" />
                                Validate {parsedAddresses.length} Addresses
                            </>
                        )}
                    </button>
                </div>
            )}

            {/* Validation Results */}
            {results && (
                <div className="p-6">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-3 gap-4 mb-6">
                        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 text-center">
                            <p className="text-3xl font-bold text-gray-900 dark:text-white">{results.totalAddresses}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Total</p>
                        </div>
                        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center border border-green-200 dark:border-green-800">
                            <p className="text-3xl font-bold text-green-600 dark:text-green-400">{results.validAddresses}</p>
                            <p className="text-sm text-green-600 dark:text-green-400">Valid</p>
                        </div>
                        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 text-center border border-red-200 dark:border-red-800">
                            <p className="text-3xl font-bold text-red-600 dark:text-red-400">{results.invalidAddresses}</p>
                            <p className="text-sm text-red-600 dark:text-red-400">Invalid</p>
                        </div>
                    </div>

                    {/* Results Table */}
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden mb-6">
                        <div className="overflow-x-auto max-h-[400px]">
                            <table className="w-full">
                                <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Address</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Pincode</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Issues</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                    {results.results.map((result, idx) => (
                                        <tr
                                            key={idx}
                                            className={`${result.isValid ? '' : 'bg-red-50 dark:bg-red-900/10'}`}
                                        >
                                            <td className="px-4 py-3">
                                                {result.isValid ? (
                                                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                                                ) : (
                                                    <XCircle className="w-5 h-5 text-red-500" />
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                                                {result.originalAddress.city}, {result.originalAddress.state}
                                            </td>
                                            <td className="px-4 py-3 text-sm font-mono text-gray-600 dark:text-gray-300">
                                                {result.originalAddress.pincode}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-red-600 dark:text-red-400">
                                                {result.errors.map(e => e.message).join(', ') || '-'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between">
                        <button
                            onClick={handleReset}
                            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                        >
                            Validate Another File
                        </button>
                        {results.invalidAddresses > 0 && (
                            <button
                                onClick={handleExportInvalid}
                                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                            >
                                <Download className="w-4 h-4" />
                                Export Invalid ({results.invalidAddresses})
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
