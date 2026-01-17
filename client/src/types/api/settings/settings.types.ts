/**
 * Settings & Admin Type Definitions
 * 
 * Types for webhooks, team management, audit logs, and subscriptions.
 */

// ==================== Webhooks ====================

export type WebhookEvent =
    | 'shipment.created'
    | 'shipment.updated'
    | 'shipment.delivered'
    | 'shipment.rto'
    | 'shipment.ndr'
    | 'order.created'
    | 'order.cancelled'
    | 'manifest.created'
    | 'payment.received'
    | 'dispute.created'
    | 'dispute.resolved';

export type WebhookStatus = 'active' | 'inactive' | 'error';

export interface Webhook {
    id: string;
    url: string;
    events: WebhookEvent[];
    status: WebhookStatus;
    secret: string; // For HMAC signature
    description?: string;
    headers?: Record<string, string>;
    retryConfig?: {
        maxRetries: number;
        retryDelay: number;
    };
    createdAt: string;
    updatedAt: string;
    lastTriggeredAt?: string;
    stats?: {
        totalCalls: number;
        successfulCalls: number;
        failedCalls: number;
    };
}

export interface WebhookLog {
    id: string;
    webhookId: string;
    event: WebhookEvent;
    payload: any;
    response?: {
        status: number;
        body: string;
    };
    error?: string;
    attemptNumber: number;
    createdAt: string;
}

export interface CreateWebhookPayload {
    url: string;
    events: WebhookEvent[];
    description?: string;
    headers?: Record<string, string>;
}

export interface TestWebhookPayload {
    webhookId: string;
    event: WebhookEvent;
}

// ==================== Team Management ====================

export type TeamRole = 'owner' | 'admin' | 'manager' | 'member' | 'viewer';

export interface Permission {
    id: string;
    name: string;
    description: string;
    category: 'shipments' | 'orders' | 'finance' | 'settings' | 'reports' | 'team';
}

export interface RolePermissions {
    role: TeamRole;
    permissions: string[]; // Permission IDs
}

export interface TeamMember {
    _id: string;
    userId: string;
    name: string;
    email: string;
    teamRole: TeamRole;
    avatar?: string;
    teamStatus: 'active' | 'invited' | 'suspended';
    joinedAt: string;
    lastActive?: string;
    invitedBy?: string;
}

export interface TeamInvitation {
    id: string;
    email: string;
    role: TeamRole;
    status: 'pending' | 'accepted' | 'expired' | 'cancelled';
    invitedBy: string;
    expiresAt: string;
    createdAt: string;
}

export interface InviteTeamMemberPayload {
    email: string;
    name: string;
    teamRole: Exclude<TeamRole, 'owner'>; // Cannot invite as owner
    message?: string;
}

export interface UpdateMemberRolePayload {
    memberId: string;
    teamRole: TeamRole;
}

// ==================== Audit Logs ====================

export type AuditAction =
    | 'create'
    | 'update'
    | 'delete'
    | 'login'
    | 'logout'
    | 'password_change'
    | 'email_change'
    | 'role_change'
    | 'permission_change'
    | 'export'
    | 'import'
    | 'other';

export type AuditResource =
    | 'shipment'
    | 'order'
    | 'user'
    | 'webhook'
    | 'team_member'
    | 'company'
    | 'manifest'
    | 'dispute'
    | 'settings';

export interface AuditLog {
    _id: string;
    userId: string;
    userName: string;
    userEmail: string;
    action: AuditAction;
    entity: AuditResource;
    entityId: string;
    details?: Record<string, any>;
    ipAddress: string;
    userAgent: string;
    timestamp: string;
}

export interface AuditLogFilters {
    startDate?: string;
    endDate?: string;
    userId?: string;
    action?: AuditAction;
    resource?: AuditResource;
    search?: string;
}

// ==================== Subscriptions ====================

export type PlanTier = 'starter' | 'growth' | 'pro' | 'enterprise';
export type BillingCycle = 'monthly' | 'annual';

export interface PlanFeature {
    name: string;
    included: boolean;
    limit?: number | string; // e.g., "Unlimited", 1000
    note?: string;
}

export interface SubscriptionPlan {
    id: string;
    tier: PlanTier;
    name: string;
    description: string;
    price: {
        monthly: number;
        annual: number;
        currency: string;
    };
    features: PlanFeature[];
    limits: {
        shipmentsPerMonth: number;
        teamMembers: number;
        apiCalls: number;
        webhooks: number;
        storage: string; // e.g., "10GB"
    };
    highlights: string[]; // Key selling points
    isPopular?: boolean;
    isEnterprise?: boolean;
}

export interface CurrentSubscription {
    plan: SubscriptionPlan;
    billingCycle: BillingCycle;
    status: 'active' | 'cancelled' | 'expired' | 'trial';
    currentPeriodStart: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
    trialEnd?: string;
    usage: {
        shipments: number;
        teamMembers: number;
        apiCalls: number;
        webhooks: number;
        storage: number; // in bytes
    };
}

export interface BillingHistory {
    id: string;
    amount: number;
    currency: string;
    status: 'paid' | 'pending' | 'failed' | 'refunded';
    description: string;
    invoiceUrl?: string;
    paidAt?: string;
    createdAt: string;
}

export interface ChangePlanPayload {
    planId: string;
    billingCycle: BillingCycle;
}

// ==================== API Response Types ====================

export interface SettingsResponse<T> {
    success: boolean;
    data: T;
}

export interface PaginatedSettingsResponse<T> extends SettingsResponse<T> {
    pagination: {
        page: number;
        limit: number;
        total: number;
    };
}

// ==================== Available Permissions List ====================

export const AVAILABLE_PERMISSIONS: Permission[] = [
    // Shipments
    { id: 'shipments_view', name: 'View Shipments', description: 'View all shipments', category: 'shipments' },
    { id: 'shipments_create', name: 'Create Shipments', description: 'Create new shipments', category: 'shipments' },
    { id: 'shipments_update', name: 'Update Shipments', description: 'Update shipment details', category: 'shipments' },
    { id: 'shipments_cancel', name: 'Cancel Shipments', description: 'Cancel shipments', category: 'shipments' },

    // Orders
    { id: 'orders_view', name: 'View Orders', description: 'View all orders', category: 'orders' },
    { id: 'orders_create', name: 'Create Orders', description: 'Create new orders', category: 'orders' },
    { id: 'orders_update', name: 'Update Orders', description: 'Update order details', category: 'orders' },

    // Finance
    { id: 'finance_view', name: 'View Finance', description: 'View financial data', category: 'finance' },
    { id: 'finance_export', name: 'Export Finance', description: 'Export financial reports', category: 'finance' },
    { id: 'cod_manage', name: 'Manage COD', description: 'Manage COD remittances', category: 'finance' },
    { id: 'disputes_manage', name: 'Manage Disputes', description: 'Handle weight disputes', category: 'finance' },

    // Settings
    { id: 'settings_view', name: 'View Settings', description: 'View company settings', category: 'settings' },
    { id: 'settings_update', name: 'Update Settings', description: 'Update company settings', category: 'settings' },
    { id: 'webhooks_manage', name: 'Manage Webhooks', description: 'Configure webhooks', category: 'settings' },

    // Reports
    { id: 'reports_view', name: 'View Reports', description: 'View analytics reports', category: 'reports' },
    { id: 'reports_export', name: 'Export Reports', description: 'Export reports', category: 'reports' },

    // Team
    { id: 'team_view', name: 'View Team', description: 'View team members', category: 'team' },
    { id: 'team_invite', name: 'Invite Members', description: 'Invite new team members', category: 'team' },
    { id: 'team_remove', name: 'Remove Members', description: 'Remove team members', category: 'team' },
    { id: 'team_permissions', name: 'Manage Permissions', description: 'Manage team permissions', category: 'team' },
];

// Default permissions per role
export const DEFAULT_ROLE_PERMISSIONS: Record<TeamRole, string[]> = {
    owner: AVAILABLE_PERMISSIONS.map(p => p.id), // All permissions
    admin: AVAILABLE_PERMISSIONS.filter(p => !p.id.startsWith('team_')).map(p => p.id), // All except team management
    manager: [
        'shipments_view', 'shipments_create', 'shipments_update',
        'orders_view', 'orders_create', 'orders_update',
        'finance_view', 'reports_view', 'reports_export',
    ],
    member: [
        'shipments_view', 'shipments_create',
        'orders_view', 'orders_create',
        'reports_view',
    ],
    viewer: [
        'shipments_view', 'orders_view', 'finance_view', 'reports_view',
    ],
};

// ==================== Platform Settings ====================

export interface PlatformSettings {
    business: BusinessSettings;
    financial: FinancialSettings;
    integrations: SystemIntegrationSettings;
    notifications: NotificationSettings;
    updatedAt?: string;
    updatedBy?: string;
}

export interface BusinessSettings {
    name: string;
    email: string;
    phone: string;
    address: string;
    logo?: string;
    website?: string;
}

export interface FinancialSettings {
    currency: string;
    gstEnabled: boolean;
    gstPercentage: number;
    minWalletBalance: number;
    codChargePercentage: number;
    codChargeMin: number;
    codChargeMax: number;
}

export interface SystemIntegrationSettings {
    email: EmailServiceConfig;
    sms: SMSServiceConfig;
    storage: StorageServiceConfig;
    payment: PaymentGatewayConfig;
}

export interface EmailServiceConfig {
    provider: 'SMTP' | 'SENDGRID' | 'AWS_SES' | 'MAILGUN';
    apiKey?: string; // Masked
    fromEmail: string;
    fromName: string;
    isEnabled: boolean;
    smtpHost?: string;
    smtpPort?: number;
    smtpUser?: string;
    smtpPassword?: string; // Masked
}

export interface SMSServiceConfig {
    provider: 'TWILIO' | 'AWS_SNS' | 'MSG91' | 'GUPSHUP';
    apiKey?: string; // Masked
    senderId: string;
    isEnabled: boolean;
}

export interface StorageServiceConfig {
    provider: 'AWS_S3' | 'CLOUDFLARE_R2' | 'LOCAL';
    bucket: string;
    region: string;
    accessKeyId?: string; // Masked
    secretAccessKey?: string; // Masked
    endpoint?: string; // For R2
    isEnabled: boolean;
}

export interface PaymentGatewayConfig {
    provider: 'RAZORPAY' | 'STRIPE' | 'PAYTM' | 'CASHFREE';
    keyId?: string; // Masked
    keySecret?: string; // Masked
    webhookSecret?: string; // Masked
    isEnabled: boolean;
    testMode: boolean;
}

export interface NotificationSettings {
    emailEnabled: boolean;
    smsEnabled: boolean;
    webhookUrl?: string;
    notifyOnOrderCreated: boolean;
    notifyOnShipmentStatusChange: boolean;
    notifyOnPaymentReceived: boolean;
    notifyOnKYCStatusChange: boolean;
}

export interface FeatureFlags {
    returnsEnabled: boolean;
    codEnabled: boolean;
    integrationsEnabled: boolean;
    trackingEnabled: boolean;
    fraudDetectionEnabled: boolean;
    ndrEnabled: boolean;
    rateCardManagement: boolean;
    bulkOperations: boolean;
    apiAccess: boolean;
    maintenanceMode: boolean;
    updatedAt?: string;
    updatedBy?: string;
}

export interface UpdatePlatformSettingsRequest {
    business?: Partial<BusinessSettings>;
    financial?: Partial<FinancialSettings>;
    integrations?: Partial<SystemIntegrationSettings>;
    notifications?: Partial<NotificationSettings>;
}

export interface ToggleFeatureRequest {
    feature: keyof FeatureFlags;
    enabled: boolean;
}

export interface TestIntegrationRequest {
    type: 'email' | 'sms' | 'storage' | 'payment';
    testData?: any;
}

export interface TestIntegrationResponse {
    success: boolean;
    message: string;
    details?: any;
}

export interface PlatformSettingsResponse {
    success: boolean;
    data: PlatformSettings;
}

export interface FeatureFlagsResponse {
    success: boolean;
    data: FeatureFlags;
}
