# Helix PDF Generation System

## Overview

The Helix PDF generation system provides production-ready PDF templates for all critical business documents in the logistics workflow. Each template is built on a robust base service with reusable components, ensuring consistency, maintainability, and compliance with Indian GST regulations.

## Architecture

### Three-Layer Architecture

```
┌─────────────────────────────────────────────────────┐
│         PDF Template Classes (Layer 3)              │
│  - InvoicePDFTemplate                               │
│  - LabelPDFTemplate                                 │
│  - ManifestPDFTemplate                              │
│  - CreditNotePDFTemplate                            │
│  - RemittancePDFTemplate                            │
│  - WalletStatementPDFTemplate                       │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│       Base PDF Service (Layer 2)                    │
│  - Text rendering, tables, boxes                    │
│  - Barcode/QR code generation                       │
│  - Page management & layout                         │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│    PDF Styles & Configuration (Layer 1)             │
│  - Color palettes (RGB & CMYK)                      │
│  - Typography (Helvetica, monospace)                │
│  - Spacing & margins                                │
│  - Print specifications (DPI, barcode sizes)        │
└─────────────────────────────────────────────────────┘
```

## PDF Templates

### 1. Tax Invoice (GST Rule 46 Compliant)

**File**: `templates/invoice-pdf.template.ts`

**Use Case**: Billing customers for shipping services

**Features**:
- GST Rule 46 compliant layout
- Dynamic CGST/SGST vs IGST calculation based on place of supply
- IRN (Invoice Registration Number) and QR code support
- Amount in Indian English (Lakhs, Crores)
- Invoice numbering system
- Company and billing party details
- Line item table with SAC codes
- Tax breakup section

**Key Compliance Elements**:
- Place of supply validation (state codes from GSTIN)
- Reverse charge indicator
- SAC code (996812 for courier services)
- Digital signature support for IRN-enabled invoices

**Output**: A4 Portrait PDF

---

### 2. Shipping Label (Thermal Printer Optimized)

**File**: `templates/label-pdf.template.ts`

**Use Case**: Thermal printer labels for package identification

**Features**:
- 4x6 inch (105mm × 148mm) thermal printer optimized
- Code 128 barcode for AWB number
- Carrier branding (Velocity, Delhivery, Ekart, India Post)
- From/To addresses with proper hierarchy
- Weight, pieces, service type, zone information
- COD amount highlighted in red
- Carrier-specific codes (zone, hub, RMS)

**Technical Specifications**:
- Barcode: Code 128 format, readable at 203 DPI
- Layout: 4x6 inch thermal dimensions
- Font: Helvetica (no serifs for better readability)
- Color: Optimized for thermal printing

**Output**: A6 Portrait PDF (4x6 inches)

---

### 3. Shipping Manifest

**File**: `templates/manifest-pdf.template.ts`

**Use Case**: Pickup documentation and carrier handover

**Features**:
- Code 128 barcode for manifest number
- Warehouse and pickup details
- Detailed shipments table (AWB, Order ID, Consignee, Weight, Packages, COD)
- Multi-page support (auto-pagination for large manifests)
- Signature sections (handed over by warehouse, received by courier)
- Summary section (total shipments, weight, packages, COD amount)
- Pickup scheduling information

**Key Compliance Elements**:
- State machine validation (open → closed → handed_over)
- Audit trail for manifest status
- Signature capture sections
- Date/time tracking

**Output**: A4 Portrait PDF (multi-page)

---

### 4. Credit Note

**File**: `templates/credit-note-pdf.template.ts`

**Use Case**: Invoice reversals and adjustments

**Features**:
- Linked to original invoice (number and date)
- Reason tracking (sales return, service deficiency, price adjustment, cancellation)
- Tax reversal calculation (CGST/SGST/IGST reversed)
- Approval workflow status (pending/approved/rejected)
- Approver name and date
- Rejection reason (if applicable)
- Red highlighting for credit amounts

**Tax Implications**:
- Reverses original invoice tax amounts
- Maintains GST compliance with credit note rules
- Place of supply validation

**Output**: A4 Portrait PDF

---

### 5. COD Remittance Statement

**File**: `templates/remittance-pdf.template.ts`

**Use Case**: Weekly/bi-weekly COD settlement statements

**Features**:
- Landscape format for detailed transaction table
- Collection date, collected amount, freight charges (3.5%), net payable
- Bank transfer details (account number, IFSC, UTR, transfer date)
- Settlement status (pending/processed/completed/failed)
- Status badges with color coding
- Multi-page support for large manifests
- Summary with total collected, total charges, net remittance

**Key Details**:
- Freight charges: 3.5% of collected amount (industry standard)
- No GST on COD collection charges (service provided by courier)
- Insurance and RTO deductions tracked separately

**Output**: A4 Landscape PDF (multi-page)

---

### 6. Wallet Statement

**File**: `templates/wallet-statement-pdf.template.ts`

**Use Case**: Account ledger and transaction history

**Features**:
- Period-based statements
- Opening/closing balance summary
- Detailed transaction table (date, type, description, debit, credit, balance)
- Transaction types: RECHARGE, SHIPMENT, TAX, REFUND, ADJUSTMENT, BONUS
- Wallet status (active/suspended/closed)
- Prepaid vs Postpaid wallet types
- Multi-page support
- Compliance notes on GST applicability

**Important Notes Section**:
- Wallet recharge is NOT subject to GST
- GST applied only when wallet used for shipment charges
- Minimum balance policies
- Transaction finality
- Dispute resolution timelines

**Output**: A4 Portrait PDF (multi-page)

---

## Installation & Setup

### Dependencies

The PDF system requires the following npm packages:

```bash
npm install pdfkit
npm install qrcode
npm install bwip-js
npm install --save-dev @types/bwip-js
```

### File Structure

```
server/
├── src/
│   ├── core/
│   │   └── application/
│   │       └── services/
│   │           └── pdf/
│   │               ├── index.ts                          # Central export
│   │               ├── base-pdf.service.ts               # Base class
│   │               ├── pdf-styles.ts                     # Style configuration
│   │               └── templates/
│   │                   ├── invoice-pdf.template.ts
│   │                   ├── label-pdf.template.ts
│   │                   ├── manifest-pdf.template.ts
│   │                   ├── credit-note-pdf.template.ts
│   │                   ├── remittance-pdf.template.ts
│   │                   └── wallet-statement-pdf.template.ts
│   └── scripts/
│       └── test-all-pdfs.ts                             # Test script
└── public/
    └── test-pdfs/                                        # Generated test PDFs
```

## Usage Examples

### Generate a Tax Invoice

```typescript
import { InvoicePDFTemplate, type InvoiceData } from '@/core/application/services/pdf';

const invoiceData: InvoiceData = {
  invoiceId: 'INV-20260113-001',
  invoiceNumber: 'INV-202601-0001',
  invoiceDate: new Date(),
  // ... other invoice fields
};

const template = new InvoicePDFTemplate();
const buffer = await template.generate(invoiceData);

// Save or serve the PDF
fs.writeFileSync('invoice.pdf', buffer);
```

### Generate a Shipping Label

```typescript
import { LabelPDFTemplate, type LabelData } from '@/core/application/services/pdf';

const labelData: LabelData = {
  awb: 'TRK123456789012',
  carrier: 'delhivery',
  from: { /* from address */ },
  to: { /* to address */ },
  shipment: { /* shipment details */ },
};

const template = new LabelPDFTemplate();
const buffer = await template.generate(labelData);

// Serve for thermal printer
response.contentType('application/pdf');
response.send(buffer);
```

### Using the Factory

```typescript
import { PDFGeneratorFactory } from '@/core/application/services/pdf';

// Create any template
const invoiceTemplate = PDFGeneratorFactory.createInvoice();
const labelTemplate = PDFGeneratorFactory.createLabel();
const manifestTemplate = PDFGeneratorFactory.createManifest();
```

## Styling System

All styles are centralized in `pdf-styles.ts` for consistency:

### Colors

```typescript
// RGB colors (for screen display)
PDF_COLORS.primary.rgb      // [26, 26, 26] - Dark charcoal
PDF_COLORS.accent.rgb       // [0, 102, 204] - Helix blue
PDF_COLORS.success.rgb      // [34, 177, 76] - Green
PDF_COLORS.danger.rgb       // [244, 67, 54] - Red

// CMYK colors (for print optimization)
PDF_COLORS.primary.cmyk     // [0, 0, 0, 90]
```

### Typography

```typescript
PDF_TYPOGRAPHY.fontFamily.primary   // 'Helvetica'
PDF_TYPOGRAPHY.fontFamily.mono      // 'Courier'

PDF_TYPOGRAPHY.fontSize.h1         // 24pt - Document titles
PDF_TYPOGRAPHY.fontSize.h2         // 18pt - Section headers
PDF_TYPOGRAPHY.fontSize.body       // 10pt - Body text
PDF_TYPOGRAPHY.fontSize.small      // 8pt - Small text
PDF_TYPOGRAPHY.fontSize.tiny       // 6pt - Footer text
```

### Spacing

```typescript
PDF_SPACING.margin              // { top: 20, right: 20, bottom: 20, left: 20 }
PDF_SPACING.padding             // { xs: 4, sm: 8, md: 12, lg: 16, xl: 20 }
PDF_SPACING.line                // { xs: 2, sm: 4, md: 8, lg: 12, xl: 16 }
PDF_SPACING.columnGutter        // 10
```

## Base Service Methods

The `BasePDFService` provides reusable methods for all templates:

### Text Methods

```typescript
drawText(text, x, y, styleKey, maxWidth)
drawHeading(text, level, x, y)
drawKeyValue(key, value, x, y)
```

### Layout Methods

```typescript
drawLine(y, color, width)
drawBox(x, y, width, height, options)
drawTable(rows, columns, startY, options)
```

### Component Methods

```typescript
generateBarcode(value, options)      // Code 128 barcode
generateQRCode(value, options)       // QR code generation
drawImage(buffer, x, y, options)
```

### Page Management

```typescript
addPage()
checkPageBreak(requiredSpace)
getCurrentY()
setCurrentY(y)
```

## Testing

### Run All PDF Tests

```bash
cd server
npx ts-node-dev src/scripts/test-all-pdfs.ts
```

This generates 6 sample PDFs:
1. `1-TAX-INVOICE.pdf` - Complete invoice with IRN
2. `2-SHIPPING-LABEL.pdf` - 4x6 thermal label
3. `3-SHIPPING-MANIFEST.pdf` - Multi-page manifest
4. `4-CREDIT-NOTE.pdf` - Approved credit note
5. `5-COD-REMITTANCE.pdf` - Settlement statement
6. `6-WALLET-STATEMENT.pdf` - Account ledger

**Output Location**: `server/public/test-pdfs/`

## Print Quality Specifications

### Thermal Printer (203 DPI)

- **Label Size**: 4x6 inches (105mm × 148mm)
- **Barcode Width**: Minimum 19mm (90 module width)
- **Barcode Height**: Minimum 15mm
- **Font Size**: 8pt for barcode text
- **Quiet Zone**: 2.5mm on all sides

### Desktop Printer (300 DPI)

- **Page Size**: A4 (210mm × 297mm)
- **Margins**: 20mm on all sides
- **QR Code Size**: 25-40mm
- **Color Scheme**: CMYK optimized

## GST Compliance

### Invoice (GST Rule 46)

✅ Mandatory Fields:
- Seller GSTIN
- Buyer GSTIN
- Invoice serial number (sequential, transaction-safe)
- Invoice date
- Place of supply (state code)
- Reverse charge indicator
- SAC code (996812 for courier services)
- Taxable value
- Tax breakdown (CGST, SGST, or IGST)
- Amount in words (Indian English)
- GSTR-1 export compatibility

### Credit Note

✅ Compliance:
- Links to original invoice
- Reversal of original tax amounts
- Reason documentation
- Approval trail
- GST Act Section 34 compliance

### Place of Supply Logic

```typescript
function calculateGST(amount: number, sellerState: string, buyerState: string) {
  const isInterState = sellerState !== buyerState;

  if (isInterState) {
    return { cgst: 0, sgst: 0, igst: amount * 0.18 };
  } else {
    return {
      cgst: amount * 0.09,
      sgst: amount * 0.09,
      igst: 0,
    };
  }
}
```

## Performance Optimization

### File Size

- **Invoice**: ~80-120 KB
- **Label**: ~40-60 KB
- **Manifest**: ~150-200 KB (5-30 pages)
- **Credit Note**: ~90-130 KB
- **Remittance**: ~120-180 KB (10-30 pages)
- **Wallet Statement**: ~100-150 KB (5-25 pages)

### Optimization Techniques

1. **Compression**: Enabled by default
2. **Font Subsetting**: Only embedded fonts used
3. **Image Compression**: JPEG at 85% quality
4. **Barcode Caching**: Generated once, reused

## Error Handling

All templates include robust error handling:

```typescript
try {
  const buffer = await template.generate(data);
} catch (error) {
  if (error instanceof ValidationError) {
    // Handle validation errors
  } else if (error instanceof BarcodeError) {
    // Fallback to text display
  } else {
    // Log and re-throw
    console.error('PDF generation failed:', error);
    throw error;
  }
}
```

## Future Enhancements

- [ ] GSTR-1 JSON export template
- [ ] Multi-language support (Hindi, Tamil, etc.)
- [ ] Digital signature integration
- [ ] Email attachment delivery
- [ ] Batch PDF generation
- [ ] Custom branding per company
- [ ] Logo upload support
- [ ] PDF archival system

## Common Issues & Solutions

### Issue: Barcode not rendering

**Solution**: Ensure `bwip-js` is installed. Fallback to text display:

```typescript
if (!barcodeBuffer) {
  this.doc.text(awb); // Fallback to text
}
```

### Issue: Thermal printer cutting labels incorrectly

**Solution**: Adjust margins and ensure page size is exactly 4x6 inches (288x432 points).

### Issue: GST calculation incorrect

**Solution**: Verify place of supply derivation from GSTIN first 2 digits:

```typescript
const placeOfSupplyCode = gstin.substring(0, 2); // e.g., "06" = Haryana
```

## Support & Documentation

For issues or questions:
1. Check the test script: `src/scripts/test-all-pdfs.ts`
2. Review template examples in comments
3. Consult style configuration: `pdf-styles.ts`
4. Check base service methods: `base-pdf.service.ts`

---

**Last Updated**: 2026-01-13
**Version**: 1.0.0 (Production Ready)
**Compliance**: GST Rule 46 ✅ | Indian Standards ✅ | Thermal Printing ✅