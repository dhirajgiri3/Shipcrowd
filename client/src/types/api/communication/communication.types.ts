/**
 * Communication & Notifications Types
 * 
 * Type definitions for SMS/Email templates, notification rules,
 * and automated communication features.
 */

// ==================== Template Types ====================

export type TemplateType = 'SMS' | 'EMAIL' | 'WHATSAPP';

export type TemplateCategory =
    | 'ORDER_CONFIRMATION'
    | 'SHIPPED'
    | 'OUT_FOR_DELIVERY'
    | 'DELIVERED'
    | 'NDR'
    | 'RETURN_INITIATED'
    | 'RETURN_RECEIVED'
    | 'REFUND_PROCESSED'
    | 'PICKUP_SCHEDULED'
    | 'CUSTOM';

export interface CommunicationTemplate {
    _id: string;
    templateId: string;
    name: string;
    type: TemplateType;
    category: TemplateCategory;
    subject?: string; // For EMAIL
    content: string;
    variables: string[]; // e.g., ['customerName', 'trackingNumber', 'deliveryDate']
    isActive: boolean;
    isDefault: boolean;
    createdAt: string;
    updatedAt: string;
    createdBy?: string;
}

// ==================== Notification Rule Types ====================

export type RuleTrigger =
    | 'ORDER_CREATED'
    | 'SHIPMENT_CREATED'
    | 'STATUS_CHANGED'
    | 'NDR_RAISED'
    | 'RETURN_REQUESTED'
    | 'PICKUP_SCHEDULED'
    | 'DELIVERY_ATTEMPTED'
    | 'DELIVERED'
    | 'SLA_BREACH';

export type RuleConditionOperator = 'EQUALS' | 'NOT_EQUALS' | 'CONTAINS' | 'GREATER_THAN' | 'LESS_THAN';

export interface RuleCondition {
    field: string;
    operator: RuleConditionOperator;
    value: string | number;
}

export type RuleActionType = 'SEND_TEMPLATE' | 'SEND_WEBHOOK' | 'CREATE_TICKET';

export interface RuleAction {
    type: RuleActionType;
    templateId?: string; // For SEND_TEMPLATE
    webhookUrl?: string; // For SEND_WEBHOOK
    recipients?: string[]; // Email addresses or phone numbers
}

export interface NotificationRule {
    _id: string;
    ruleId: string;
    name: string;
    description?: string;
    trigger: RuleTrigger;
    conditions: RuleCondition[];
    conditionLogic: 'AND' | 'OR';
    actions: RuleAction[];
    isActive: boolean;
    priority: number; // 1-10, higher = more important
    createdAt: string;
    updatedAt: string;
    createdBy?: string;
    stats?: {
        totalExecutions: number;
        successCount: number;
        failureCount: number;
        lastExecutedAt?: string;
    };
}

// ==================== Variable System ====================

export interface TemplateVariable {
    name: string;
    displayName: string;
    category: 'ORDER' | 'SHIPMENT' | 'CUSTOMER' | 'DATE' | 'COMPANY';
    example: string;
    description: string;
}

export const AVAILABLE_VARIABLES: TemplateVariable[] = [
    // Customer Variables
    { name: 'customerName', displayName: 'Customer Name', category: 'CUSTOMER', example: 'John Doe', description: 'Customer full name' },
    { name: 'customerPhone', displayName: 'Customer Phone', category: 'CUSTOMER', example: '+91 98765 43210', description: 'Customer phone number' },
    { name: 'customerEmail', displayName: 'Customer Email', category: 'CUSTOMER', example: 'john@example.com', description: 'Customer email address' },

    // Order Variables
    { name: 'orderId', displayName: 'Order ID', category: 'ORDER', example: 'ORD-12345', description: 'Unique order identifier' },
    { name: 'orderDate', displayName: 'Order Date', category: 'ORDER', example: '15 Jan 2026', description: 'Order creation date' },
    { name: 'orderAmount', displayName: 'Order Amount', category: 'ORDER', example: '₹1,499', description: 'Total order value' },

    // Shipment Variables
    { name: 'trackingNumber', displayName: 'Tracking Number', category: 'SHIPMENT', example: 'TRK123456789', description: 'Shipment tracking number' },
    { name: 'awbNumber', displayName: 'AWB Number', category: 'SHIPMENT', example: 'AWB987654321', description: 'Air waybill number' },
    { name: 'courierName', displayName: 'Courier Name', category: 'SHIPMENT', example: 'Delhivery', description: 'Courier partner name' },
    { name: 'deliveryDate', displayName: 'Estimated Delivery', category: 'SHIPMENT', example: '18 Jan 2026', description: 'Expected delivery date' },
    { name: 'currentStatus', displayName: 'Current Status', category: 'SHIPMENT', example: 'Out for Delivery', description: 'Current shipment status' },

    // Date Variables
    { name: 'today', displayName: 'Today\'s Date', category: 'DATE', example: '15 Jan 2026', description: 'Current date' },

    // Company Variables
    { name: 'companyName', displayName: 'Company Name', category: 'COMPANY', example: 'Helix', description: 'Your company name' },
    { name: 'supportEmail', displayName: 'Support Email', category: 'COMPANY', example: 'support@Helix.com', description: 'Support email address' },
    { name: 'supportPhone', displayName: 'Support Phone', category: 'COMPANY', example: '+91 1234567890', description: 'Support phone number' },
];

// ==================== API Request/Response Types ====================

export interface TemplateListFilters {
    type?: TemplateType;
    category?: TemplateCategory;
    isActive?: boolean;
    search?: string;
}

export interface CreateTemplatePayload {
    name: string;
    type: TemplateType;
    category: TemplateCategory;
    subject?: string;
    content: string;
    isActive?: boolean;
}

export interface UpdateTemplatePayload extends Partial<CreateTemplatePayload> {
    templateId: string;
}

export interface RuleListFilters {
    trigger?: RuleTrigger;
    isActive?: boolean;
    search?: string;
}

export interface CreateRulePayload {
    name: string;
    description?: string;
    trigger: RuleTrigger;
    conditions: RuleCondition[];
    conditionLogic: 'AND' | 'OR';
    actions: RuleAction[];
    isActive?: boolean;
    priority?: number;
}

export interface UpdateRulePayload extends Partial<CreateRulePayload> {
    ruleId: string;
}

export interface TestTemplatePayload {
    templateId: string;
    sampleData: Record<string, string>;
    recipientPhone?: string; // For SMS/WhatsApp
    recipientEmail?: string; // For EMAIL
}

export interface RenderedTemplate {
    subject?: string;
    content: string;
    characterCount: number;
    smsCount?: number; // For SMS (160 chars per SMS)
}

// ==================== Component Prop Types ====================

export interface TemplateEditorProps {
    initialTemplate?: CommunicationTemplate;
    onSave: (template: CreateTemplatePayload | UpdateTemplatePayload) => void;
    onCancel: () => void;
}

export interface RuleBuilderProps {
    initialRule?: NotificationRule;
    onSave: (rule: CreateRulePayload | UpdateRulePayload) => void;
    onCancel: () => void;
}

export interface VariableInserterProps {
    onVariableSelect: (variable: string) => void;
}

export interface TemplatePreviewProps {
    template: string;
    variables: Record<string, string>;
}
