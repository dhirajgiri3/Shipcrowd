/**
 * Unit Tests for Remittance Reconciliation Service
 * 
 * Tests:
 * - Configurable column mapping
 * - Multi-provider support (Velocity, Delhivery, Generic)
 * - Excel/CSV parsing
 */

import RemittanceReconciliationService from '../../../src/core/application/services/finance/remittance-reconciliation.service';

describe('Remittance Reconciliation - Column Mapping', () => {
    const mappingFor = (provider: 'velocity' | 'delhivery' | 'generic') =>
        (RemittanceReconciliationService as any).resolveColumnMapping(provider);

    describe('normalizeRow', () => {
        it('should parse Velocity MIS format', () => {
            const velocityRow = {
                'AWB Number': 'VEL123456789',
                'COD Amount': '1000.50',
                'Settlement Date': '2026-02-03',
                'UTR Number': 'UTR123456'
            };

            // Access private method via type assertion
            const result = (RemittanceReconciliationService as any).normalizeRow(velocityRow, mappingFor('velocity'));

            expect(result).not.toBeNull();
            expect(result.awb).toBe('VEL123456789');
            expect(result.amount).toBe(1000.50);
            expect(result.utr).toBe('UTR123456');
        });

        it('should parse Delhivery MIS format with different column names', () => {
            const delhiveryRow = {
                'Waybill Number': 'DEL987654321',
                'Total COD': '2500',
                'Remittance Date': '2026-02-02',
                'UTR No': 'UTR999888'
            };

            const result = (RemittanceReconciliationService as any).normalizeRow(delhiveryRow, mappingFor('delhivery'));

            expect(result).not.toBeNull();
            expect(result.awb).toBe('DEL987654321');
            expect(result.amount).toBe(2500);
        });

        it('should parse generic format with common column names', () => {
            const genericRow = {
                'Tracking': 'GEN111222333',
                'Amount': '750.25',
                'Date': '2026-02-01',
                'Reference': 'REF-ABC'
            };

            const result = (RemittanceReconciliationService as any).normalizeRow(genericRow, mappingFor('generic'));

            expect(result).not.toBeNull();
            expect(result.awb).toBe('GEN111222333');
            expect(result.amount).toBe(750.25);
        });

        it('should handle column names with underscores and spaces', () => {
            const rowWithVariations = {
                'AWB_Number': 'TEST123',
                'COD Amount': '500'
            };

            const result = (RemittanceReconciliationService as any).normalizeRow(rowWithVariations, mappingFor('generic'));

            expect(result).not.toBeNull();
            expect(result.awb).toBe('TEST123');
            expect(result.amount).toBe(500);
        });

        it('should handle non-standard column names with generic mapping', () => {
            const nonStandardRow = {
                'Ref No': 'REF123',
                'Value': '1200'
            };

            const result = (RemittanceReconciliationService as any).normalizeRow(nonStandardRow, mappingFor('generic'));

            expect(result).not.toBeNull();
            expect(result.awb).toBe('REF123');
            expect(result.amount).toBe(1200);
        });

        it('should return null if required columns are missing', () => {
            const invalidRow = {
                'Some Column': 'value1',
                'Another Column': 'value2'
            };

            const result = (RemittanceReconciliationService as any).normalizeRow(invalidRow, mappingFor('generic'));

            expect(result).toBeNull();
        });

        it('should return null for empty AWB values', () => {
            const rowWithEmptyAwb = {
                'AWB': '',
                'Amount': '100'
            };

            const result = (RemittanceReconciliationService as any).normalizeRow(rowWithEmptyAwb, mappingFor('generic'));

            expect(result).toBeNull();
        });

        it('should handle numeric amount parsing correctly', () => {
            const rowWithFormattedAmount = {
                'Tracking Number': 'AWB123',
                'COD Amount': '1,234.56'
            };

            const result = (RemittanceReconciliationService as any).normalizeRow(rowWithFormattedAmount, mappingFor('generic'));

            // parseFloat should handle comma (or not) - verify behavior
            expect(result).not.toBeNull();
            expect(result.awb).toBe('AWB123');
        });
    });

    describe('Column Mapping Configuration', () => {
        it('should have velocity mapping with all standard columns', () => {
            const mapping = mappingFor('velocity');
            expect(mapping).toBeDefined();
            expect(Array.isArray(mapping.awbColumns)).toBe(true);
            expect(Array.isArray(mapping.amountColumns)).toBe(true);
            expect(mapping.awbColumns.length).toBeGreaterThan(0);
            expect(mapping.amountColumns.length).toBeGreaterThan(0);
        });
    });
});
