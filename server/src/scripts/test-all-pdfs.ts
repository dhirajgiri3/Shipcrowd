/**
 * Test Script for PDF Generation
 * Tests all PDF templates with comprehensive mock data
 * 
 * Usage: npx ts-node-dev src/scripts/test-all-pdfs.ts
 * Output: server/public/test-pdfs/
 */

import * as fs from 'fs';
import * as path from 'path';
import mongoose from 'mongoose';
import QRCode from 'qrcode';
import { InvoicePDFTemplate } from '../core/application/services/pdf/templates/invoice-pdf.template';
import { IInvoice } from '../infrastructure/database/mongoose/models/finance/billing/invoice.model';
import { ICompany } from '../infrastructure/database/mongoose/models/organization/core/company.model';

/**
 * Ensure output directory exists
 */
function ensureOutputDirectory(): string {
    const outputDir = path.join(process.cwd(), 'public', 'test-pdfs');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
        console.log(`✅ Created output directory: ${outputDir}`);
    }
    return outputDir;
}

/**
 * Create mock company data
 */
function createMockCompany(): ICompany {
    return {
        _id: new mongoose.Types.ObjectId(),
        name: 'Acme E-Commerce Pvt Ltd',
        address: {
            line1: 'Plot No. 42, Sector 18',
            line2: 'Udyog Vihar, Phase IV',
            city: 'Gurugram',
            state: 'Haryana',
            country: 'India',
            postalCode: '122015',
        },
        billingInfo: {
            gstin: '06AABCU9603R1ZX',
            pan: 'AABCU9603R',
            bankName: 'HDFC Bank',
            accountNumber: '50200012345678',
            ifscCode: 'HDFC0001234',
            upiId: 'acme@paytm',
        },
        branding: {
            logo: '',
            primaryColor: '#0066cc',
            secondaryColor: '#f0f0f0',
        },
        integrations: {
            shopify: undefined,
            woocommerce: undefined,
        },
        settings: {
            defaultWarehouseId: undefined,
            defaultRateCardId: undefined,
            notificationEmail: 'billing@acme.com',
            notificationPhone: '+91-9876543210',
            autoGenerateInvoice: true,
            currency: 'INR',
            timezone: 'Asia/Kolkata',
        },
        wallet: {
            balance: 25000,
            currency: 'INR',
            lastUpdated: new Date(),
            lowBalanceThreshold: 500,
        },
        status: 'approved',
        verificationLevel: 3,
        limits: {
            canCreateShipments: true,
            requiresKYC: false,
        },
        isActive: true,
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
    } as ICompany;
}

/**
 * Create mock invoice data (Intra-state transaction)
 */
async function createMockInvoiceIntraState(): Promise<IInvoice> {
    const subtotal = 10000;
    const cgst = subtotal * 0.09; // 9%
    const sgst = subtotal * 0.09; // 9%
    const grandTotal = subtotal + cgst + sgst;

    // Generate real QR code (simulating GSTN QR format)
    const irnValue = 'ad89ce05de1d446e9f99e9cbf2c480eb52e2e33e8e72431a9e2b7d33efcb6a12';
    const qrData = JSON.stringify({
        irn: irnValue,
        sellerGstin: '06AAKCS7527K1ZG',
        buyerGstin: '06AABCU9603R1ZX',
        invoiceNo: 'INV-202601-0001',
        invoiceDate: '13/01/2026',
        amount: grandTotal.toFixed(2),
    });

    const qrCodeDataURL = await QRCode.toDataURL(qrData, {
        errorCorrectionLevel: 'M',
        type: 'image/png',
        width: 400,
        margin: 1,
    });

    return {
        _id: new mongoose.Types.ObjectId(),
        invoiceId: 'INV-20260113-001',
        invoiceNumber: 'INV-202601-0001',
        invoiceType: 'invoice',
        companyId: new mongoose.Types.ObjectId(),
        billingPeriod: {
            startDate: new Date('2026-01-01'),
            endDate: new Date('2026-01-07'),
        },
        lineItems: [
            {
                description: 'Courier Services - Surface Delivery (Zone A)',
                sacCode: '996812',
                quantity: 150,
                unitPrice: 45,
                taxableAmount: 6750,
                cgst: 607.5,
                sgst: 607.5,
                igst: 0,
                totalAmount: 7965,
            },
            {
                description: 'Courier Services - Express Delivery (Zone B)',
                sacCode: '996812',
                quantity: 50,
                unitPrice: 65,
                taxableAmount: 3250,
                cgst: 292.5,
                sgst: 292.5,
                igst: 0,
                totalAmount: 3835,
            },
        ],
        financialSummary: {
            subtotal,
            cgstTotal: cgst,
            sgstTotal: sgst,
            igstTotal: 0,
            grandTotal,
        },
        gstDetails: {
            sellerGSTIN: '06AAKCS7527K1ZG',
            buyerGSTIN: '06AABCU9603R1ZX',
            placeOfSupply: '06',
            placeOfSupplyState: 'Haryana',
            isInterState: false,
            reverseCharge: false,
        },
        status: 'sent',
        irn: irnValue,
        irnGeneratedAt: new Date('2026-01-13T10:30:00Z'),
        irnStatus: 'generated',
        qrCodeData: qrCodeDataURL,
        pdfUrl: '',
        csvUrl: '',
        sentAt: new Date('2026-01-13T11:00:00Z'),
        sentTo: ['billing@acme.com'],
        dueDate: new Date('2026-02-12'),
        createdBy: new mongoose.Types.ObjectId(),
        createdAt: new Date('2026-01-13T10:00:00Z'),
        updatedAt: new Date('2026-01-13T11:00:00Z'),
    } as unknown as IInvoice;
}

/**
 * Create mock invoice data (Inter-state transaction)
 */
async function createMockInvoiceInterState(): Promise<IInvoice> {
    const subtotal = 15000;
    const igst = subtotal * 0.18; // 18%
    const grandTotal = subtotal + igst;

    // Generate real QR code (simulating GSTN QR format)
    const irnValue = 'bc78de16ef2e557f0a10f0dae3d591dc63f3f44f9f83542b0f3c8e44f0dcb7b23';
    const qrData = JSON.stringify({
        irn: irnValue,
        sellerGstin: '06AAKCS7527K1ZG',
        buyerGstin: '27AABCU9603R1ZX',
        invoiceNo: 'INV-202601-0002',
        invoiceDate: '13/01/2026',
        amount: grandTotal.toFixed(2),
    });

    const qrCodeDataURL = await QRCode.toDataURL(qrData, {
        errorCorrectionLevel: 'M',
        type: 'image/png',
        width: 400,
        margin: 1,
    });

    return {
        _id: new mongoose.Types.ObjectId(),
        invoiceId: 'INV-20260113-002',
        invoiceNumber: 'INV-202601-0002',
        invoiceType: 'invoice',
        companyId: new mongoose.Types.ObjectId(),
        billingPeriod: {
            startDate: new Date('2026-01-01'),
            endDate: new Date('2026-01-07'),
        },
        lineItems: [
            {
                description: 'Courier Services - Air Delivery (Zone C)',
                sacCode: '996812',
                quantity: 100,
                unitPrice: 85,
                taxableAmount: 8500,
                cgst: 0,
                sgst: 0,
                igst: 1530,
                totalAmount: 10030,
            },
            {
                description: 'Courier Services - Express Air (Zone D)',
                sacCode: '996812',
                quantity: 50,
                unitPrice: 130,
                taxableAmount: 6500,
                cgst: 0,
                sgst: 0,
                igst: 1170,
                totalAmount: 7670,
            },
        ],
        financialSummary: {
            subtotal,
            cgstTotal: 0,
            sgstTotal: 0,
            igstTotal: igst,
            grandTotal,
        },
        gstDetails: {
            sellerGSTIN: '06AAKCS7527K1ZG',
            buyerGSTIN: '27AABCU9603R1ZX',
            placeOfSupply: '27',
            placeOfSupplyState: 'Maharashtra',
            isInterState: true,
            reverseCharge: false,
        },
        status: 'sent',
        irn: irnValue,
        irnGeneratedAt: new Date('2026-01-13T14:30:00Z'),
        irnStatus: 'generated',
        qrCodeData: qrCodeDataURL,
        pdfUrl: '',
        csvUrl: '',
        sentAt: new Date('2026-01-13T15:00:00Z'),
        sentTo: ['accounts@example.com'],
        dueDate: new Date('2026-02-12'),
        createdBy: new mongoose.Types.ObjectId(),
        createdAt: new Date('2026-01-13T14:00:00Z'),
        updatedAt: new Date('2026-01-13T15:00:00Z'),
    } as unknown as IInvoice;
}

/**
 * Main test execution
 */
async function main() {
    console.log('\n🧪 PDF Generation Test Suite\n');
    console.log('='.repeat(60));

    const outputDir = ensureOutputDirectory();
    const results: { name: string; success: boolean; path?: string; error?: string }[] = [];

    try {
        // Test 1: Invoice PDF (Intra-state)
        console.log('\n📄 Test 1: Tax Invoice (Intra-State - CGST/SGST)');
        console.log('-'.repeat(60));

        const company1 = createMockCompany();
        const invoice1 = await createMockInvoiceIntraState();
        const invoiceTemplate1 = new InvoicePDFTemplate();

        const buffer1 = await invoiceTemplate1.generatePDF(invoice1, company1);
        const outputPath1 = path.join(outputDir, '1-TAX-INVOICE-INTRA-STATE.pdf');
        fs.writeFileSync(outputPath1, buffer1);

        console.log(`✅ Generated: ${outputPath1}`);
        console.log(`   Invoice Number: ${invoice1.invoiceNumber}`);
        console.log(`   Buyer: ${company1.name}`);
        console.log(`   GSTIN: ${invoice1.gstDetails.buyerGSTIN}`);
        console.log(`   Place of Supply: ${invoice1.gstDetails.placeOfSupplyState}`);
        console.log(`   Grand Total: ₹${invoice1.financialSummary.grandTotal.toFixed(2)}`);
        console.log(`   File Size: ${(buffer1.length / 1024).toFixed(2)} KB`);

        results.push({ name: 'Tax Invoice (Intra-State)', success: true, path: outputPath1 });

        // Test 2: Invoice PDF (Inter-state)
        console.log('\n📄 Test 2: Tax Invoice (Inter-State - IGST)');
        console.log('-'.repeat(60));

        const company2 = createMockCompany();
        company2.billingInfo.gstin = '27AABCU9603R1ZX';
        company2.address!.state = 'Maharashtra';

        const invoice2 = await createMockInvoiceInterState();
        const invoiceTemplate2 = new InvoicePDFTemplate();

        const buffer2 = await invoiceTemplate2.generatePDF(invoice2, company2);
        const outputPath2 = path.join(outputDir, '2-TAX-INVOICE-INTER-STATE.pdf');
        fs.writeFileSync(outputPath2, buffer2);

        console.log(`✅ Generated: ${outputPath2}`);
        console.log(`   Invoice Number: ${invoice2.invoiceNumber}`);
        console.log(`   Buyer: ${company2.name}`);
        console.log(`   GSTIN: ${invoice2.gstDetails.buyerGSTIN}`);
        console.log(`   Place of Supply: ${invoice2.gstDetails.placeOfSupplyState}`);
        console.log(`   Grand Total: ₹${invoice2.financialSummary.grandTotal.toFixed(2)}`);
        console.log(`   File Size: ${(buffer2.length / 1024).toFixed(2)} KB`);

        results.push({ name: 'Tax Invoice (Inter-State)', success: true, path: outputPath2 });

    } catch (error) {
        console.error('\n❌ Error during PDF generation:', error);
        results.push({ name: 'PDF Generation', success: false, error: (error as Error).message });
    }

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Test Summary');
    console.log('='.repeat(60));

    const passed = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    results.forEach(result => {
        if (result.success) {
            console.log(`✅ ${result.name}`);
            console.log(`   → ${result.path}`);
        } else {
            console.log(`❌ ${result.name}`);
            console.log(`   → Error: ${result.error}`);
        }
    });

    console.log('\n' + '='.repeat(60));
    console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`);
    console.log('='.repeat(60));

    if (failed === 0) {
        console.log('\n🎉 All PDF tests passed successfully!\n');
        console.log(`📁 Output directory: ${outputDir}`);
        process.exit(0);
    } else {
        console.log('\n⚠️ Some tests failed. Please review the errors above.\n');
        process.exit(1);
    }
}

// Execute
main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
