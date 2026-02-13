/**
 * Velocity Carrier ID Constants (Latest: Feb 2026)
 * 
 * This file contains the latest carrier IDs provided by Velocity.
 * Use these constants for validation, prioritization, and testing.
 */

export const VELOCITY_CARRIER_IDS = {
  // Latest Active IDs
  DELHIVERY_STANDARD: 'CAR2CHKPXAC5T',
  AMAZON_TRANSPORTATION: 'CAR71OFLZNOSI',
  DELHIVERY_SPECIAL_20KG: 'CARBYISS34LSS',
  SHADOWFAX_STANDARD: 'CAR7RFCSBPAV7',
  DELHIVERY_SPECIAL_10KG: 'CARVPHPLJQJOA',
  BLUEDART_STANDARD: 'CAR2FZNOLGJ2X',
  DELHIVERY_5KG: 'CAR5IXXJVT5MD',
  BLUEDART_AIR: 'CARISGEX1QMVB',
  DELHIVERY_EXPRESS: 'CARFRQQXRTZQ9',
  EKART_STANDARD: 'CARR5H4WQY3PM',
} as const;

/**
 * Deprecated IDs found in older documentation/system logs.
 * These should be monitored and replaced by the latest IDs above.
 */
export const DEPRECATED_VELOCITY_CARRIER_IDS = [
  'CARO0ZZQH1H6U', // Old Delhivery Standard
  'CARCVBWTPRH08', // Old Ekart Standard
  'CARVKGNGNLOCU', // Old Blitz Special
  'CARFYXUKCQHBM', // Old Delhivery Special 20kg
  'CARLTTKCUYWRM', // Old Delhivery Standard 250G
  'CARTS5SW8LSJT', // Old XpressBees Standard
  'CARKX7WW6UNS8', // Old Pikndel NDD
  'CAR0EPDPJXXL4', // Old DTDC Standard
];

/**
 * Best-effort replacements for deprecated IDs observed in legacy integrations.
 * Unknown legacy IDs keep their original value.
 */
export const DEPRECATED_VELOCITY_ID_REPLACEMENTS: Record<string, string> = {
  CARO0ZZQH1H6U: VELOCITY_CARRIER_IDS.DELHIVERY_STANDARD,
  CARCVBWTPRH08: VELOCITY_CARRIER_IDS.EKART_STANDARD,
  CARFYXUKCQHBM: VELOCITY_CARRIER_IDS.DELHIVERY_SPECIAL_20KG,
};

/**
 * Helper to get carrier name from ID
 */
export const getVelocityCarrierName = (carrierId: string): string => {
  const entry = Object.entries(VELOCITY_CARRIER_IDS).find(([_, id]) => id === carrierId);
  if (entry) return entry[0].replace(/_/g, ' ');
  
  if (DEPRECATED_VELOCITY_CARRIER_IDS.includes(carrierId)) {
    return 'DEPRECATED CARRIER';
  }
  
  return 'UNKNOWN CARRIER';
};

/**
 * Helper to check if an ID is deprecated
 */
export const isDeprecatedVelocityId = (carrierId: string): boolean => {
  return DEPRECATED_VELOCITY_CARRIER_IDS.includes(carrierId);
};

/**
 * Normalize deprecated IDs to canonical active IDs where mapping is known.
 */
export const normalizeVelocityCarrierId = (carrierId: string): string => {
  return DEPRECATED_VELOCITY_ID_REPLACEMENTS[carrierId] || carrierId;
};
