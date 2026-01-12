/**
 * Business Logic and Resource-Specific Messages
 * Domain-specific error messages for business operations
 */

export const BUSINESS_MESSAGES = {
    // Not Found Errors
    USER_NOT_FOUND: 'User not found.',
    ORDER_NOT_FOUND: 'Order not found.',
    COMPANY_NOT_FOUND: 'Company not found.',
    WAREHOUSE_NOT_FOUND: 'Warehouse not found.',
    SHIPMENT_NOT_FOUND: 'Shipment not found.',
    TEAM_MEMBER_NOT_FOUND: 'Team member not found.',
    PRODUCT_NOT_FOUND: 'Product not found.',
    INVENTORY_NOT_FOUND: 'Inventory item not found.',
    DISPUTE_NOT_FOUND: 'Dispute not found.',
    COMMISSION_NOT_FOUND: 'Commission record not found.',

    // Conflict Errors
    USER_EXISTS: 'User with this email already exists.',
    COMPANY_EXISTS: 'Company with this name already exists.',
    ORDER_NUMBER_EXISTS: 'Order with this number already exists.',
    WAREHOUSE_EXISTS: 'Warehouse with this name already exists.',
    SKU_EXISTS: 'Product with this SKU already exists.',

    // Operation Errors
    CANNOT_DELETE_ORDER: (reason: string) => `Cannot delete order: ${reason}`,
    CANNOT_UPDATE_STATUS: (from: string, to: string) =>
        `Cannot change status from ${from} to ${to}.`,
    ORDER_NUMBER_FAILED: 'Failed to generate unique order number. Please try again.',
    OPERATION_NOT_ALLOWED: (operation: string) => `${operation} is not allowed at this time.`,

    // Permissions
    NO_COMPANY: 'You are not associated with any company. Please create or join a company first.',
    INSUFFICIENT_PERMISSIONS: 'You do not have permission to perform this action.',
    ACCESS_DENIED_COMPANY: 'Access denied to this company.',
    ACCESS_DENIED_RESOURCE: (resource: string) => `Access denied to this ${resource}.`,
    ADMIN_ONLY: 'This action requires admin privileges.',

    // KYC
    KYC_ALREADY_SUBMITTED: 'KYC documents have already been submitted.',
    KYC_NOT_FOUND: 'No KYC record found.',
    KYC_VERIFICATION_FAILED: 'Document verification failed. Please check your details and try again.',
    KYC_PENDING: 'KYC verification is pending. Please wait for approval.',
    KYC_REJECTED: 'KYC verification was rejected. Please resubmit with correct documents.',
    PAN_VERIFICATION_FAILED: 'PAN verification failed. Please verify the PAN number and try again.',
    GSTIN_VERIFICATION_FAILED: 'GSTIN verification failed. Please verify the GSTIN and try again.',

    // Inventory
    INSUFFICIENT_STOCK: (sku: string, available: number) =>
        `Insufficient stock for ${sku}. Only ${available} units available.`,
    LOCATION_NOT_FOUND: 'Storage location not found.',
    STATION_OCCUPIED: 'This packing station is already occupied.',
    INVENTORY_LOCKED: 'Inventory is locked and cannot be modified.',

    // Orders
    ORDER_ALREADY_SHIPPED: 'Order has already been shipped and cannot be modified.',
    ORDER_CANCELLED: 'Order has been cancelled.',
    ORDER_ALREADY_CANCELLED: 'Order is already cancelled.',
    CANNOT_CANCEL_ORDER: 'Order cannot be cancelled at this stage.',

    // Shipments
    SHIPMENT_ALREADY_DELIVERED: 'Shipment has already been delivered.',
    TRACKING_NOT_AVAILABLE: 'Tracking information is not yet available.',
    COURIER_NOT_ASSIGNED: 'No courier has been assigned to this shipment.',

    // Team Management
    MEMBER_ALREADY_EXISTS: 'Team member with this email already exists.',
    CANNOT_REMOVE_OWNER: 'Cannot remove company owner from team.',
    CANNOT_REMOVE_SELF: 'You cannot remove yourself from the team.',
    INVITATION_LIMIT_REACHED: 'Maximum number of team invitations reached.',
} as const;
