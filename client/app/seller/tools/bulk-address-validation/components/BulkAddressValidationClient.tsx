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
import Papa from 'papaparse';
import { useBulkValidateAddresses } from '@/src/core/api/hooks/logistics/useAddress';
import { showSuccessToast, handleApiError } from '@/src/lib/error';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  Download,
  FileOutput,
  X,
} from 'lucide-react';
import { Button } from '@/src/components/ui/core/Button';
import { StatsCard } from '@/src/components/ui/dashboard/StatsCard';
import { Loader } from '@/src/components/ui/feedback/Loader';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/src/components/ui/core/Table';
import type { Address, BulkAddressValidationResult } from '@/src/types/api/logistics';

type ValidationStatus = 'idle' | 'parsing' | 'validating' | 'complete' | 'error';

export function BulkAddressValidationClient() {
    const [file, setFile] = useState<File | null>(null);
    const [parsedAddresses, setParsedAddresses] = useState<Address[]>([]);
    const [status, setStatus] = useState<ValidationStatus>('idle');
    const [results, setResults] = useState<BulkAddressValidationResult | null>(null);
    const [parseError, setParseError] = useState<string | null>(null);

    const { mutate: validateAddresses, isPending } = useBulkValidateAddresses();

    const downloadTemplate = () => {
        const link = document.createElement('a');
        link.href = '/samples/shipcrowd_address_validation_template.csv';
        link.download = 'shipcrowd_address_validation_template.csv';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Parse CSV function
    const parseCSV = useCallback((csvText: string): Address[] => {
        const parsed = Papa.parse<Record<string, string>>(csvText, {
            header: true,
            skipEmptyLines: true,
            transformHeader: (header) => header.trim().toLowerCase(),
        });

        if (parsed.errors.length > 0) {
            const firstError = parsed.errors[0];
            throw new Error(`CSV parse error: ${firstError.message}`);
        }

        const rows = parsed.data || [];
        if (rows.length === 0) {
            throw new Error('CSV must have at least a header row and one data row');
        }

        const headers = Object.keys(rows[0] || {});

        // Required columns
        const requiredColumns = ['pincode', 'city', 'state'];
        const missingColumns = requiredColumns.filter(col => !headers.includes(col));
        if (missingColumns.length > 0) {
            throw new Error(`Missing required columns: ${missingColumns.join(', ')}`);
        }

        const getValue = (row: Record<string, string>, aliases: string[]): string => {
            for (const key of aliases) {
                const value = row[key];
                if (value !== undefined && value !== null && String(value).trim() !== '') {
                    return String(value).trim();
                }
            }
            return '';
        };

        const addresses: Address[] = [];
        for (const row of rows) {
            const address: Address = {
                line1: getValue(row, ['address', 'line1', 'address_line_1']),
                line2: getValue(row, ['address2', 'line2', 'address_line_2']),
                city: getValue(row, ['city']),
                state: getValue(row, ['state']),
                pincode: getValue(row, ['pincode', 'zip', 'postal_code']),
                country: getValue(row, ['country']) || 'India',
                contactName: getValue(row, ['name', 'contact_name']),
                contactPhone: getValue(row, ['phone', 'mobile', 'contact_phone']),
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
                showSuccessToast(`Parsed ${addresses.length} addresses from CSV`);
            } catch (err) {
                setParseError((err as Error).message);
                setStatus('error');
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
                    showSuccessToast(`Validated ${data.totalAddresses} addresses`);
                },
                onError: (error) => {
                    setStatus('error');
                    handleApiError(error, 'Address validation failed');
                },
            }
        );
    };

    // Export invalid addresses
    const handleExportInvalid = () => {
        if (!results) return;

        const invalidResults = results.results.filter(r => !r.isValid);
        const escapeCsv = (value: string | number) => `"${String(value ?? '').replace(/"/g, '""')}"`;
        const csv = [
            ['Row Number', 'Contact Name', 'Contact Phone', 'Address Line 1', 'Address Line 2', 'City', 'State', 'Pincode', 'Errors'].join(','),
            ...invalidResults.map((r, index) => [
                index + 1,
                r.originalAddress.contactName || '',
                r.originalAddress.contactPhone || '',
                r.originalAddress.line1,
                r.originalAddress.line2 || '',
                r.originalAddress.city,
                r.originalAddress.state,
                r.originalAddress.pincode,
                r.errors.map(e => e.message).join('; '),
            ].map(escapeCsv).join(','))
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
        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-primary)] shadow-sm overflow-hidden">
            {/* Upload Section */}
            {status === 'idle' && parsedAddresses.length === 0 && (
                <div className="p-8">
                    <div
                        {...getRootProps()}
                        className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all
                  ${isDragActive
                                ? 'border-[var(--primary-blue)] bg-[var(--primary-blue)]/5'
                                : 'border-[var(--border-default)] hover:border-[var(--primary-blue)] hover:bg-[var(--bg-secondary)]'
                            }`}
                    >
                        <input {...getInputProps()} />
                        <Upload className="w-16 h-16 mx-auto mb-4 text-[var(--text-muted)]" />
                        {isDragActive ? (
                            <p className="text-lg font-medium text-[var(--primary-blue)]">
                                Drop your CSV file here...
                            </p>
                        ) : (
                            <>
                                <p className="text-lg font-medium text-[var(--text-primary)] mb-2">
                                    Drag & drop your CSV file here
                                </p>
                                <p className="text-sm text-[var(--text-secondary)] mb-4">
                                    or click to browse
                                </p>
                                <p className="text-xs text-[var(--text-muted)]">
                                    Maximum file size: 5MB • Supported format: CSV
                                </p>
                            </>
                        )}
                    </div>

                    {/* CSV Format Guide */}
                    <div className="mt-8 bg-[var(--primary-blue)]/5 rounded-lg p-6 border border-[var(--primary-blue)]/20">
                        <h3 className="font-semibold text-[var(--primary-blue)] mb-3 flex items-center gap-2">
                            <FileSpreadsheet className="w-5 h-5" />
                            CSV Format Requirements
                        </h3>
                        <p className="text-sm text-[var(--text-secondary)] mb-4">
                            Your CSV file should have the following columns (headers in first row):
                        </p>
                        <div className="bg-[var(--bg-primary)] rounded-lg p-4 font-mono text-sm overflow-x-auto">
                            <code className="text-[var(--text-primary)]">
                                address,city,state,pincode,name,phone
                            </code>
                        </div>
                        <p className="text-xs text-[var(--primary-blue)] mt-3">
                            Required columns: <strong>pincode, city, state</strong>
                        </p>
                        <div className="mt-4">
                            <Button variant="outline" size="sm" onClick={downloadTemplate}>
                                <Download className="w-4 h-4 mr-2" />
                                Download Template
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Parsing Status */}
            {status === 'parsing' && (
                <div className="p-12">
                    <Loader variant="spinner" size="lg" message="Parsing CSV file..." centered />
                </div>
            )}

            {/* Parse Error */}
            {status === 'error' && parseError && (
                <div className="p-8">
                    <div className="rounded-xl border border-[var(--error)]/20 bg-[var(--error-bg)] p-6 text-center">
                        <XCircle className="mx-auto mb-4 h-12 w-12 text-[var(--error)]" />
                        <h3 className="mb-2 font-semibold text-[var(--error)]">
                            Failed to Parse CSV
                        </h3>
                        <p className="mb-4 text-sm text-[var(--text-secondary)]">
                            {parseError}
                        </p>
                        <Button variant="danger" onClick={handleReset}>
                            Try Again
                        </Button>
                    </div>
                </div>
            )}

            {/* Parsed Addresses Preview */}
            {parsedAddresses.length > 0 && !results && (
                <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-[var(--success)]/10 flex items-center justify-center">
                                <FileSpreadsheet className="w-5 h-5 text-[var(--success)]" />
                            </div>
                            <div>
                                <p className="font-medium text-[var(--text-primary)]">{file?.name}</p>
                                <p className="text-sm text-[var(--text-secondary)]">
                                    {parsedAddresses.length} addresses found
                                </p>
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={handleReset} aria-label="Clear file">
                            <X className="h-5 w-5" />
                        </Button>
                    </div>

                    {/* Preview Table */}
                    <div className="mb-6 overflow-hidden rounded-lg border border-[var(--border-default)]">
                        <Table>
                            <TableHeader>
                                <TableRow className="border-[var(--border-default)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-secondary)]">
                                    <TableHead className="text-[var(--text-muted)]">#</TableHead>
                                    <TableHead className="text-[var(--text-muted)]">Address</TableHead>
                                    <TableHead className="text-[var(--text-muted)]">City</TableHead>
                                    <TableHead className="text-[var(--text-muted)]">State</TableHead>
                                    <TableHead className="text-[var(--text-muted)]">Pincode</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {parsedAddresses.slice(0, 5).map((addr, idx) => (
                                    <TableRow key={idx} className="border-[var(--border-default)]">
                                        <TableCell className="text-[var(--text-muted)]">{idx + 1}</TableCell>
                                        <TableCell className="max-w-[200px] truncate text-[var(--text-primary)]">
                                            {addr.line1 || '-'}
                                        </TableCell>
                                        <TableCell className="text-[var(--text-secondary)]">{addr.city}</TableCell>
                                        <TableCell className="text-[var(--text-secondary)]">{addr.state}</TableCell>
                                        <TableCell className="font-mono text-[var(--text-primary)]">{addr.pincode}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        {parsedAddresses.length > 5 && (
                            <div className="bg-[var(--bg-secondary)] px-4 py-2 text-center text-sm text-[var(--text-muted)]">
                                and {parsedAddresses.length - 5} more...
                            </div>
                        )}
                    </div>

                    {/* Validate Button */}
                    <Button
                        onClick={handleValidate}
                        disabled={isPending}
                        isLoading={isPending}
                        className="w-full"
                        size="lg"
                    >
                        <CheckCircle2 className="mr-2 h-5 w-5" />
                        Validate {parsedAddresses.length} Addresses
                    </Button>
                </div>
            )}

            {/* Validation Results */}
            {results && (
                <div className="p-6">
                    {/* Summary Cards */}
                    <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <StatsCard
                            title="Total"
                            value={results.totalAddresses}
                            icon={FileSpreadsheet}
                            variant="default"
                        />
                        <StatsCard
                            title="Valid"
                            value={results.validAddresses}
                            icon={CheckCircle2}
                            variant="success"
                        />
                        <StatsCard
                            title="Invalid"
                            value={results.invalidAddresses}
                            icon={XCircle}
                            variant="critical"
                        />
                    </div>

                    {/* Results Table */}
                    <div className="mb-6 max-h-[400px] overflow-auto rounded-lg border border-[var(--border-default)]">
                        <Table>
                            <TableHeader>
                                <TableRow className="sticky top-0 z-10 border-[var(--border-default)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-secondary)]">
                                    <TableHead className="text-[var(--text-muted)]">Status</TableHead>
                                    <TableHead className="text-[var(--text-muted)]">Address</TableHead>
                                    <TableHead className="text-[var(--text-muted)]">Pincode</TableHead>
                                    <TableHead className="text-[var(--text-muted)]">Issues</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {results.results.map((result, idx) => (
                                    <TableRow
                                        key={idx}
                                        className={
                                            result.isValid
                                                ? 'border-[var(--border-default)]'
                                                : 'border-[var(--border-default)] bg-[var(--error)]/5'
                                        }
                                    >
                                        <TableCell>
                                            {result.isValid ? (
                                                <CheckCircle2 className="h-5 w-5 text-[var(--success)]" />
                                            ) : (
                                                <XCircle className="h-5 w-5 text-[var(--error)]" />
                                            )}
                                        </TableCell>
                                        <TableCell className="text-[var(--text-primary)]">
                                            {result.originalAddress.city}, {result.originalAddress.state}
                                        </TableCell>
                                        <TableCell className="font-mono text-[var(--text-secondary)]">
                                            {result.originalAddress.pincode}
                                        </TableCell>
                                        <TableCell className="text-[var(--error)]">
                                            {result.errors.map((e) => e.message).join(', ') || '-'}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <Button variant="ghost" onClick={handleReset}>
                            Validate Another File
                        </Button>
                        {results.invalidAddresses > 0 && (
                            <Button variant="danger" onClick={handleExportInvalid}>
                                <FileOutput className="mr-2 h-4 w-4" />
                                Export Invalid ({results.invalidAddresses})
                            </Button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
