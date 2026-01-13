/**
 * Number to Words Utility
 * Converts numbers to Indian English words with proper grammatical structure
 * Handles Indian numbering system (Lakhs, Crores)
 */

const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

/**
 * Convert a number less than 1000 to words
 */
function convertHundreds(num: number): string {
    if (num === 0) return '';

    let result = '';

    // Hundreds place
    if (num >= 100) {
        result += ones[Math.floor(num / 100)] + ' Hundred ';
        num %= 100;
    }

    // Tens and ones place
    if (num >= 20) {
        result += tens[Math.floor(num / 10)] + ' ';
        num %= 10;
    } else if (num >= 10) {
        result += teens[num - 10] + ' ';
        return result.trim();
    }

    // Ones place
    if (num > 0) {
        result += ones[num] + ' ';
    }

    return result.trim();
}

/**
 * Convert number to Indian words (supports up to 99,99,99,999 - 9 Crore 99 Lakh 99 Thousand 999)
 * @param amount - The number to convert
 * @returns String representation in words
 * @example
 * convertToIndianWords(1183.50) → "Rupees One Thousand One Hundred Eighty-Three and Fifty Paise Only"
 * convertToIndianWords(1234567) → "Rupees Twelve Lakh Thirty-Four Thousand Five Hundred Sixty-Seven Only"
 */
export function convertToIndianWords(amount: number): string {
    if (amount === 0) return 'Zero Rupees Only';
    if (amount < 0) return 'Negative ' + convertToIndianWords(Math.abs(amount));

    // Split into rupees and paise
    const rupees = Math.floor(amount);
    const paise = Math.round((amount - rupees) * 100);

    let result = 'Rupees ';

    // Handle crores (10,000,000)
    if (rupees >= 10000000) {
        const crores = Math.floor(rupees / 10000000);
        result += convertHundreds(crores) + ' Crore ';
        const remainder = rupees % 10000000;
        if (remainder > 0) {
            result += convertToIndianWordsHelper(remainder);
        }
    } else {
        result += convertToIndianWordsHelper(rupees);
    }

    result = result.trim();

    // Add paise if present
    if (paise > 0) {
        result += ' and ' + convertHundreds(paise) + ' Paise';
    }

    result += ' Only';

    return result;
}

/**
 * Helper function to convert numbers less than 1 crore
 */
function convertToIndianWordsHelper(num: number): string {
    if (num === 0) return '';

    let result = '';

    // Lakhs (100,000)
    if (num >= 100000) {
        const lakhs = Math.floor(num / 100000);
        result += convertHundreds(lakhs) + ' Lakh ';
        num %= 100000;
    }

    // Thousands (1,000)
    if (num >= 1000) {
        const thousands = Math.floor(num / 1000);
        result += convertHundreds(thousands) + ' Thousand ';
        num %= 1000;
    }

    // Hundreds, tens, ones
    if (num > 0) {
        result += convertHundreds(num);
    }

    return result.trim();
}

/**
 * Format number with Indian comma placement (1,00,000 instead of 100,000)
 * @param num - The number to format
 * @returns Formatted string with Indian comma placement
 * @example
 * formatIndianNumber(1234567) → "12,34,567"
 * formatIndianNumber(123456789) → "12,34,56,789"
 */
export function formatIndianNumber(num: number): string {
    const numStr = Math.abs(num).toString();
    const lastThree = numStr.substring(numStr.length - 3);
    const otherNumbers = numStr.substring(0, numStr.length - 3);

    if (otherNumbers !== '') {
        const formatted = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree;
        return num < 0 ? '-' + formatted : formatted;
    } else {
        return num.toString();
    }
}

/**
 * Format number with Indian comma placement and decimal places
 * @param num - The number to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted string
 * @example
 * formatIndianNumberWithDecimals(1234567.89) → "12,34,567.89"
 */
export function formatIndianNumberWithDecimals(num: number, decimals: number = 2): string {
    const fixed = num.toFixed(decimals);
    const [integer, decimal] = fixed.split('.');
    const formattedInteger = formatIndianNumber(parseInt(integer));
    return decimal ? `${formattedInteger}.${decimal}` : formattedInteger;
}
