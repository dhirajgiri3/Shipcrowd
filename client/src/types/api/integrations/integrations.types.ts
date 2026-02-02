/**
 * E-Commerce Integration Types
 * 
 * Type definitions for marketplace integrations (Shopify, WooCommerce, 
 * Amazon, Flipkart), OAuth flows, field mapping, and sync operations.
 */

// ==================== Core Integration Types ====================

export type IntegrationType =
    | 'SHOPIFY'
    | 'WOOCOMMERCE'
    | 'AMAZON'
    | 'FLIPKART'
    | 'MAGENTO'
    | 'CUSTOM_API';

export type IntegrationStatus =
    | 'CONNECTED'
    | 'DISCONNECTED'
    | 'ERROR'
    | 'SYNCING'
    | 'EXPIRED';

export type SyncFrequency =
    | 'REALTIME'
    | 'EVERY_5_MIN'
    | 'EVERY_15_MIN'
    | 'EVERY_30_MIN'
    | 'HOURLY'
    | 'MANUAL';

export interface EcommerceIntegration {
    _id: string;
    integrationId: string;
    type: IntegrationType;
    name: string; // User-defined name
    storeName: string; // Actual store name
    storeUrl?: string;

    // Connection details
    status: IntegrationStatus;
    isActive?: boolean;
    connectedAt: string;
    lastSyncAt?: string;
    expiresAt?: string;

    // Credentials (encrypted on backend)
    credentials: IntegrationCredentials;

    // Settings
    settings: IntegrationSettings;

    // Field mapping
    fieldMapping: FieldMapping;

    // Stats
    stats: IntegrationStats;

    // Metadata
    createdAt: string;
    updatedAt: string;
    createdBy?: string;
}

// ==================== Credentials Types ====================

export type IntegrationCredentials =
    | ShopifyCredentials
    | WooCommerceCredentials
    | AmazonCredentials
    | FlipkartCredentials
    | CustomApiCredentials;

export interface ShopifyCredentials {
    type: 'SHOPIFY';
    shopDomain: string; // e.g., "mystore.myshopify.com"
    accessToken: string;
    apiKey?: string;
    apiSecret?: string;
}

export interface WooCommerceCredentials {
    type: 'WOOCOMMERCE';
    siteUrl: string;
    consumerKey: string;
    consumerSecret: string;
}

export interface AmazonCredentials {
    type: 'AMAZON';
    sellerId: string;
    mwsAuthToken: string;
    region: 'IN' | 'US' | 'EU' | 'JP';
}

export interface FlipkartCredentials {
    type: 'FLIPKART';
    appId: string;
    appSecret: string;
    accessToken: string;
}

export interface CustomApiCredentials {
    type: 'CUSTOM_API';
    baseUrl: string;
    authType: 'API_KEY' | 'BEARER_TOKEN' | 'BASIC_AUTH';
    authValue: string;
}

// ==================== Settings Types ====================

export interface IntegrationSettings {
    syncFrequency: SyncFrequency;
    autoFulfill: boolean; // Auto-fulfill orders on shipment creation
    autoTrackingUpdate: boolean; // Push tracking updates back to platform
    syncHistoricalOrders: boolean;
    historicalOrderDays?: number; // How many days back to sync

    // Order filters
    orderFilters: {
        minOrderValue?: number;
        maxOrderValue?: number;
        statusFilters?: string[]; // Only sync orders with these statuses
        excludeStatuses?: string[];
    };

    // Notifications
    notifications: {
        syncErrors: boolean;
        connectionIssues: boolean;
        lowInventory: boolean;
    };
}

// ==================== Field Mapping Types ====================

export interface FieldMapping {
    // Order fields
    orderNumber: string; // Platform field → Shipcrowd field
    orderDate: string;
    orderTotal: string;
    paymentMethod: string;

    // Customer fields
    customerName: string;
    customerEmail: string;
    customerPhone: string;

    // Shipping address
    shippingAddress1: string;
    shippingAddress2: string;
    shippingCity: string;
    shippingState: string;
    shippingPincode: string;
    shippingCountry: string;

    // Product fields
    productSku: string;
    productName: string;
    productQuantity: string;
    productPrice: string;
    productWeight: string;

    // Custom fields (optional)
    customFields?: Record<string, string>;
}

// ==================== Stats Types ====================

export interface IntegrationStats {
    totalOrders: number;
    ordersToday: number;
    ordersThisWeek: number;
    ordersThisMonth: number;

    lastSyncStatus: 'SUCCESS' | 'PARTIAL' | 'FAILED';
    lastSyncOrderCount: number;
    lastSyncErrorCount: number;

    totalSyncs: number;
    successfulSyncs: number;
    failedSyncs: number;

    // Shopify-specific stats
    totalOrdersSynced?: number;
    syncSuccessRate?: number;
    lastSyncAt?: string;
}

// ==================== Sync Types ====================

export interface SyncLog {
    _id: string;
    integrationId: string;
    syncId: string;

    triggerType: 'MANUAL' | 'SCHEDULED' | 'WEBHOOK';
    triggeredBy?: string;

    status: 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'PARTIAL';

    startedAt: string;
    completedAt?: string;
    durationMs?: number; // milliseconds

    ordersProcessed: number;
    ordersSuccess?: number;
    ordersFailed?: number;

    details?: {
        message?: string;
        errors?: any[];
    };
}

export interface SyncError {
    orderId?: string;
    errorCode: string;
    errorMessage: string;
    timestamp: string;
}

// ==================== Wizard Types ====================

export interface IntegrationWizardStep1Data {
    integrationType: IntegrationType | null;
    storeName: string;
    storeUrl: string;
}

export interface IntegrationWizardStep2Data {
    credentials: Partial<IntegrationCredentials>;
}

export interface IntegrationWizardStep3Data {
    settings: Partial<IntegrationSettings>;
}

export interface IntegrationWizardStep4Data {
    fieldMapping: Partial<FieldMapping>;
}

export interface IntegrationWizardData {
    step1: IntegrationWizardStep1Data;
    step2: IntegrationWizardStep2Data;
    step3: IntegrationWizardStep3Data;
    step4: IntegrationWizardStep4Data;
}

// ==================== API Request/Response Types ====================

export interface CreateIntegrationPayload {
    type: IntegrationType;
    name: string;
    storeName: string;
    storeUrl?: string;
    credentials: IntegrationCredentials;
    settings: IntegrationSettings;
    fieldMapping: FieldMapping;
}

export interface UpdateIntegrationPayload {
    integrationId: string;
    settings?: Partial<IntegrationSettings>;
    fieldMapping?: Partial<FieldMapping>;
}

export interface TestConnectionPayload {
    type: IntegrationType;
    credentials: IntegrationCredentials;
}

export interface TestConnectionResponse {
    success: boolean;
    storeName?: string;
    message: string;
    details?: {
        ordersFound?: number;
        productsFound?: number;
        apiVersion?: string;
    };
}

export interface TriggerSyncPayload {
    integrationId: string;
    syncType?: string;
    sinceDate?: string;
    syncHistorical?: boolean;
    historicalDays?: number;
}

export interface IntegrationListFilters {
    type?: IntegrationType;
    status?: IntegrationStatus;
    search?: string;
}

// ==================== OAuth Types ====================

export interface OAuthInitiateResponse {
    authUrl: string;
    state: string; // CSRF protection
}

export interface OAuthCallbackPayload {
    code: string;
    state: string;
    shop?: string; // For Shopify
}

export interface OAuthCompleteResponse {
    success: boolean;
    accessToken: string;
    expiresAt?: string;
    refreshToken?: string;
}

// ==================== Component Prop Types ====================

export interface IntegrationCardProps {
    integration: EcommerceIntegration;
    onEdit?: (integration: EcommerceIntegration) => void;
    onSync?: (integrationId: string) => void;
    onDisconnect?: (integrationId: string) => void;
}

export interface IntegrationWizardProps {
    type: IntegrationType;
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: (integration: EcommerceIntegration) => void;
}

export interface FieldMappingEditorProps {
    platformType: IntegrationType;
    initialMapping: Partial<FieldMapping>;
    onChange: (mapping: FieldMapping) => void;
}
