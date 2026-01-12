/**
 * Success Messages for Operations
 * Positive feedback messages for successful operations
 */

export const SUCCESS_MESSAGES = {
    // Generic CRUD Operations
    CREATED: (resource: string) => `${resource} created successfully.`,
    UPDATED: (resource: string) => `${resource} updated successfully.`,
    DELETED: (resource: string) => `${resource} deleted successfully.`,
    RETRIEVED: (resource: string) => `${resource} retrieved successfully.`,
    SAVED: (resource: string) => `${resource} saved successfully.`,

    // Authentication
    USER_REGISTERED: 'Account created successfully. Please check your email to verify your account.',
    LOGIN_SUCCESS: 'Logged in successfully.',
    LOGOUT_SUCCESS: 'Logged out successfully.',
    PASSWORD_RESET_SENT: 'Password reset link sent to your email.',
    PASSWORD_RESET_SUCCESS: 'Password reset successfully. Please login with your new password.',
    PASSWORD_CHANGED: 'Password changed successfully.',
    EMAIL_VERIFIED: 'Email verified successfully. You can now login.',
    EMAIL_RESENT: 'Verification email sent. Please check your inbox.',
    MAGIC_LINK_SENT: 'Magic link sent to your email. Please check your inbox.',

    // Orders
    ORDER_CREATED: 'Order created successfully.',
    ORDER_IMPORTED: (count: number) =>
        `Successfully imported ${count} order${count !== 1 ? 's' : ''}.`,
    ORDER_UPDATED: 'Order updated successfully.',
    ORDER_DELETED: 'Order deleted successfully.',
    ORDER_CANCELLED: 'Order cancelled successfully.',
    ORDER_CONFIRMED: 'Order confirmed successfully.',

    // Shipments
    SHIPMENT_CREATED: 'Shipment created successfully.',
    SHIPMENT_UPDATED: 'Shipment status updated successfully.',
    SHIPMENT_CANCELLED: 'Shipment cancelled successfully.',
    LABEL_GENERATED: 'Shipping label generated successfully.',
    TRACKING_UPDATED: 'Tracking information updated successfully.',

    // Company
    COMPANY_CREATED: 'Company created successfully.',
    COMPANY_UPDATED: 'Company profile updated successfully.',
    COMPANY_DELETED: 'Company deleted successfully.',

    // Warehouse
    WAREHOUSE_CREATED: 'Warehouse created successfully.',
    WAREHOUSE_UPDATED: 'Warehouse updated successfully.',
    WAREHOUSE_DELETED: 'Warehouse deleted successfully.',

    // Inventory
    INVENTORY_UPDATED: 'Inventory updated successfully.',
    STOCK_ADJUSTED: 'Stock adjusted successfully.',
    PRODUCT_ADDED: 'Product added to inventory successfully.',

    // KYC
    KYC_SUBMITTED: 'KYC documents submitted successfully. We will review them shortly.',
    KYC_VERIFIED: 'KYC documents verified successfully.',
    KYC_UPDATED: 'KYC information updated successfully.',
    DOCUMENT_VERIFIED: (type: string) => `${type} verified successfully.`,
    DOCUMENT_UPLOADED: (type: string) => `${type} uploaded successfully.`,

    // Team Management
    INVITATION_SENT: 'Team invitation sent successfully.',
    INVITATION_ACCEPTED: 'Invitation accepted successfully.',
    INVITATION_CANCELLED: 'Invitation cancelled successfully.',
    MEMBER_ADDED: 'Team member added successfully.',
    MEMBER_REMOVED: 'Team member removed successfully.',
    MEMBER_UPDATED: 'Team member updated successfully.',
    ROLE_UPDATED: 'Role updated successfully.',

    // Disputes
    DISPUTE_CREATED: 'Dispute created successfully.',
    DISPUTE_RESOLVED: 'Dispute resolved successfully.',
    DISPUTE_UPDATED: 'Dispute updated successfully.',

    // Analytics & Reports
    REPORT_GENERATED: 'Report generated successfully.',
    EXPORT_COMPLETED: 'Export completed successfully.',
    DATA_SYNCED: 'Data synchronized successfully.',

    // Settings
    SETTINGS_UPDATED: 'Settings updated successfully.',
    PREFERENCES_SAVED: 'Preferences saved successfully.',
    NOTIFICATION_SETTINGS_UPDATED: 'Notification settings updated successfully.',
} as const;
