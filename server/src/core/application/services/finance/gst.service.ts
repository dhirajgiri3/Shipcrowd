/**
 * GST Service
 * Handles GST calculations for invoicing
 * 
 * GST Rate for Courier Services (SAC 996812): 18%
 * - Intra-state: CGST 9% + SGST 9%
 * - Inter-state: IGST 18%
 */

// State code to name mapping (first 2 digits of GSTIN)
const STATE_CODES: { [key: string]: string } = {
    '01': 'Jammu and Kashmir',
    '02': 'Himachal Pradesh',
    '03': 'Punjab',
    '04': 'Chandigarh',
    '05': 'Uttarakhand',
    '06': 'Haryana',
    '07': 'Delhi',
    '08': 'Rajasthan',
    '09': 'Uttar Pradesh',
    '10': 'Bihar',
    '11': 'Sikkim',
    '12': 'Arunachal Pradesh',
    '13': 'Nagaland',
    '14': 'Manipur',
    '15': 'Mizoram',
    '16': 'Tripura',
    '17': 'Meghalaya',
    '18': 'Assam',
    '19': 'West Bengal',
    '20': 'Jharkhand',
    '21': 'Odisha',
    '22': 'Chhattisgarh',
    '23': 'Madhya Pradesh',
    '24': 'Gujarat',
    '25': 'Daman and Diu',
    '26': 'Dadra and Nagar Haveli',
    '27': 'Maharashtra',
    '28': 'Andhra Pradesh (Old)',
    '29': 'Karnataka',
    '30': 'Goa',
    '31': 'Lakshadweep',
    '32': 'Kerala',
    '33': 'Tamil Nadu',
    '34': 'Puducherry',
    '35': 'Andaman and Nicobar Islands',
    '36': 'Telangana',
    '37': 'Andhra Pradesh',
    '38': 'Ladakh',
    '97': 'Other Territory',
};

interface GSTCalculation {
    cgst: number;
    sgst: number;
    igst: number;
    totalGST: number;
    isInterState: boolean;
}

class GSTService {
    private readonly GST_RATE = 0.18; // 18% for courier services

    /**
     * Calculate GST based on seller and buyer states
     */
    calculateGST(
        taxableAmount: number,
        sellerStateCode: string,
        buyerStateCode: string
    ): GSTCalculation {
        const isInterState = sellerStateCode !== buyerStateCode;
        const totalGST = taxableAmount * this.GST_RATE;

        if (isInterState) {
            // Inter-state: IGST only
            return {
                cgst: 0,
                sgst: 0,
                igst: Math.round(totalGST * 100) / 100, // Round to 2 decimals
                totalGST: Math.round(totalGST * 100) / 100,
                isInterState: true,
            };
        } else {
            // Intra-state: CGST + SGST
            const halfGST = totalGST / 2;
            return {
                cgst: Math.round(halfGST * 100) / 100, // 9%
                sgst: Math.round(halfGST * 100) / 100, // 9%
                igst: 0,
                totalGST: Math.round(totalGST * 100) / 100,
                isInterState: false,
            };
        }
    }

    /**
     * Extract state code from GSTIN
     * GSTIN format: 22AAAAA0000A1Z5 (first 2 digits = state code)
     */
    getStateCodeFromGSTIN(gstin: string): string {
        if (!gstin || gstin.length < 2) {
            throw new Error('Invalid GSTIN format');
        }
        return gstin.substring(0, 2);
    }

    /**
     * Get state name from state code
     */
    getStateName(stateCode: string): string {
        const stateName = STATE_CODES[stateCode];
        if (!stateName) {
            throw new Error(`Invalid state code: ${stateCode}`);
        }
        return stateName;
    }

    /**
     * Get state name from GSTIN
     */
    getStateFromGSTIN(gstin: string): { code: string; name: string } {
        const code = this.getStateCodeFromGSTIN(gstin);
        const name = this.getStateName(code);
        return { code, name };
    }

    /**
     * Validate GSTIN format
     */
    validateGSTIN(gstin: string): boolean {
        // GSTIN format: 22AAAAA0000A1Z5 (15 characters)
        const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
        return gstinRegex.test(gstin);
    }

    /**
     * Calculate line item GST
     */
    calculateLineItemGST(
        quantity: number,
        unitPrice: number,
        sellerStateCode: string,
        buyerStateCode: string
    ): {
        taxableAmount: number;
        cgst: number;
        sgst: number;
        igst: number;
        totalAmount: number;
    } {
        const taxableAmount = quantity * unitPrice;
        const gst = this.calculateGST(taxableAmount, sellerStateCode, buyerStateCode);

        return {
            taxableAmount: Math.round(taxableAmount * 100) / 100,
            cgst: gst.cgst,
            sgst: gst.sgst,
            igst: gst.igst,
            totalAmount: Math.round((taxableAmount + gst.totalGST) * 100) / 100,
        };
    }
}

export default new GSTService();
