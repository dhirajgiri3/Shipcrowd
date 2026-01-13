/**
 * IRN Types and Interfaces
 * Type definitions for GSTN e-Invoice API integration
 */

/**
 * GSTN Invoice Payload (INV-01 Schema)
 * Official format for IRN generation as per GSTN specifications
 */
export interface GSTNInvoicePayload {
    Version: string; // API version (e.g., "1.1")

    TranDtls: {
        TaxSch: 'GST'; // Tax scheme
        SupTyp: 'B2B' | 'SEZWP' | 'SEZWOP' | 'EXPWP' | 'EXPWOP'; // Supply type
        RegRev: 'Y' | 'N'; // Reverse charge applicable
        EcmGstin?: string; // E-commerce GSTIN
        IgstOnIntra?: 'Y' | 'N'; // IGST on intra-state
    };

    DocDtls: {
        Typ: 'INV' | 'CRN' | 'DBN'; // Document type
        No: string; // Invoice number
        Dt: string; // Invoice date (DD/MM/YYYY)
    };

    SellerDtls: {
        Gstin: string;
        LglNm: string; // Legal name
        TrdNm?: string; // Trade name
        Addr1: string;
        Addr2?: string;
        Loc: string; // City/Town
        Pin: number;
        Stcd: string; // State code
        Ph?: string;
        Em?: string;
    };

    BuyerDtls: {
        Gstin: string;
        LglNm: string;
        TrdNm?: string;
        Pos: string; // Place of supply (state code)
        Addr1: string;
        Addr2?: string;
        Loc: string;
        Pin: number;
        Stcd: string;
        Ph?: string;
        Em?: string;
    };

    ItemList: Array<{
        SlNo: string; // Serial number
        PrdDesc?: string; // Product description
        IsServc: 'Y' | 'N'; // Is service
        HsnCd?: string; // HSN code (for goods)
        Barcde?: string;
        Qty?: number;
        FreeQty?: number;
        Unit?: string;
        UnitPrice?: number;
        TotAmt: number; // Total amount
        Discount?: number;
        PreTaxVal?: number;
        AssAmt: number; // Assessable amount
        GstRt: number; // GST rate
        IgstAmt?: number;
        CgstAmt?: number;
        SgstAmt?: number;
        CesRt?: number;
        CesAmt?: number;
        CesNonAdvlAmt?: number;
        StateCesRt?: number;
        StateCesAmt?: number;
        StateCesNonAdvlAmt?: number;
        OthChrg?: number;
        TotItemVal: number; // Total item value
    }>;

    ValDtls: {
        AssVal: number; // Assessable value
        CgstVal?: number;
        SgstVal?: number;
        IgstVal?: number;
        CesVal?: number;
        StCesVal?: number;
        Discount?: number;
        OthChrg?: number;
        RndOffAmt?: number;
        TotInvVal: number; // Total invoice value
    };
}

/**
 * IRN Response from GSTN
 * Data returned after successful IRN generation
 */
export interface IRNResponse {
    irn: string; // 64-character Invoice Reference Number
    ackNo: string; // Acknowledgement number
    ackDate: string; // Acknowledgement date-time
    qrCode: string; // Base64 encoded QR code image (PNG)
    signedInvoice: string; // Digitally signed invoice JSON
    signedQrCode?: string; // Signed QR code data
    status: string; // Status (e.g., "ACT" for active)
    ewbNo?: string; // E-way bill number (if generated)
    ewbDt?: string; // E-way bill date
    ewbValidTill?: string; // E-way bill validity
}

/**
 * IRN Cancellation Request
 */
export interface IRNCancelRequest {
    irn: string; // IRN to cancel
    cnlRsn: string; // Cancellation reason code
    cnlRem: string; // Cancellation remarks
}

/**
 * IRN Cancellation Response
 */
export interface IRNCancelResponse {
    irn: string;
    cancelDate: string;
    status: string; // "CNL" for cancelled
}

/**
 * GSTN Error Response
 */
export interface GSTNErrorResponse {
    error_cd: string; // Error code (e.g., "2150", "2151")
    message: string; // Error message
}
