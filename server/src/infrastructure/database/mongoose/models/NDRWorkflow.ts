import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * NDRWorkflow Model
 *
 * Defines resolution workflows for different NDR types.
 * Each workflow contains a sequence of actions to execute.
 *
 * Action Types:
 * - call_customer: Initiate automated call via Exotel
 * - send_whatsapp: Send WhatsApp message
 * - send_email: Send email notification
 * - update_address: Request customer to update address
 * - request_reattempt: Request courier to reattempt delivery
 * - trigger_rto: Trigger return to origin
 */

export interface IWorkflowAction {
    sequence: number;
    actionType: 'call_customer' | 'send_whatsapp' | 'send_email' | 'update_address' | 'request_reattempt' | 'trigger_rto';
    delayMinutes: number;
    autoExecute: boolean;
    actionConfig: Record<string, any>;
    description?: string;
}

export interface IEscalationRules {
    afterHours: number;
    escalateTo: 'supervisor' | 'admin' | 'support';
    notifyVia: ('email' | 'whatsapp' | 'sms')[];
}

export interface IRTOTriggerConditions {
    maxAttempts: number;
    maxHours: number;
    autoTrigger: boolean;
}

export interface INDRWorkflow extends Document {
    ndrType: 'address_issue' | 'customer_unavailable' | 'refused' | 'payment_issue' | 'other';
    company?: mongoose.Types.ObjectId;
    isDefault: boolean;
    name: string;
    description?: string;
    actions: IWorkflowAction[];
    escalationRules: IEscalationRules;
    rtoTriggerConditions: IRTOTriggerConditions;
    isActive: boolean;
    createdBy?: string;
    createdAt: Date;
    updatedAt: Date;
}

interface INDRWorkflowModel extends Model<INDRWorkflow> {
    getWorkflowForNDR(ndrType: string, companyId?: string): Promise<INDRWorkflow | null>;
    seedDefaultWorkflows(): Promise<void>;
}

const WorkflowActionSchema = new Schema<IWorkflowAction>(
    {
        sequence: { type: Number, required: true },
        actionType: {
            type: String,
            enum: ['call_customer', 'send_whatsapp', 'send_email', 'update_address', 'request_reattempt', 'trigger_rto'],
            required: true,
        },
        delayMinutes: { type: Number, default: 0 },
        autoExecute: { type: Boolean, default: true },
        actionConfig: { type: Schema.Types.Mixed, default: {} },
        description: { type: String },
    },
    { _id: false }
);

const EscalationRulesSchema = new Schema<IEscalationRules>(
    {
        afterHours: { type: Number, default: 24 },
        escalateTo: {
            type: String,
            enum: ['supervisor', 'admin', 'support'],
            default: 'supervisor',
        },
        notifyVia: {
            type: [String],
            enum: ['email', 'whatsapp', 'sms'],
            default: ['email'],
        },
    },
    { _id: false }
);

const RTOTriggerConditionsSchema = new Schema<IRTOTriggerConditions>(
    {
        maxAttempts: { type: Number, default: 3 },
        maxHours: { type: Number, default: 48 },
        autoTrigger: { type: Boolean, default: true },
    },
    { _id: false }
);

const NDRWorkflowSchema = new Schema<INDRWorkflow>(
    {
        ndrType: {
            type: String,
            enum: ['address_issue', 'customer_unavailable', 'refused', 'payment_issue', 'other'],
            required: true,
        },
        company: {
            type: Schema.Types.ObjectId,
            ref: 'Company',
            index: true,
        },
        isDefault: {
            type: Boolean,
            default: false,
        },
        name: {
            type: String,
            required: true,
        },
        description: {
            type: String,
        },
        actions: {
            type: [WorkflowActionSchema],
            default: [],
        },
        escalationRules: {
            type: EscalationRulesSchema,
            default: {},
        },
        rtoTriggerConditions: {
            type: RTOTriggerConditionsSchema,
            default: {},
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        createdBy: {
            type: String,
        },
    },
    {
        timestamps: true,
        collection: 'ndr_workflows',
    }
);

// Indexes
NDRWorkflowSchema.index({ ndrType: 1, isDefault: 1 });
NDRWorkflowSchema.index({ company: 1, ndrType: 1 });

// Static: Get workflow for NDR type (company-specific or default)
NDRWorkflowSchema.statics.getWorkflowForNDR = async function (
    ndrType: string,
    companyId?: string
): Promise<INDRWorkflow | null> {
    // First try company-specific workflow
    if (companyId) {
        const companyWorkflow = await this.findOne({
            ndrType,
            company: companyId,
            isActive: true,
        });
        if (companyWorkflow) {
            return companyWorkflow;
        }
    }

    // Fall back to default workflow
    return this.findOne({
        ndrType,
        isDefault: true,
        isActive: true,
    });
};

// Static: Seed default workflows
NDRWorkflowSchema.statics.seedDefaultWorkflows = async function (): Promise<void> {
    const defaultWorkflows: Partial<INDRWorkflow>[] = [
        {
            ndrType: 'address_issue',
            isDefault: true,
            name: 'Address Issue Resolution',
            description: 'Default workflow for address-related NDRs',
            actions: [
                {
                    sequence: 1,
                    actionType: 'send_whatsapp',
                    delayMinutes: 0,
                    autoExecute: true,
                    actionConfig: { template: 'ndr_address_update' },
                    description: 'Send WhatsApp with address update link',
                },
                {
                    sequence: 2,
                    actionType: 'call_customer',
                    delayMinutes: 60,
                    autoExecute: true,
                    actionConfig: { ivrFlow: 'ndr_address' },
                    description: 'Call customer for address confirmation',
                },
                {
                    sequence: 3,
                    actionType: 'send_email',
                    delayMinutes: 120,
                    autoExecute: true,
                    actionConfig: { template: 'ndr_address_email' },
                    description: 'Send email if no response',
                },
                {
                    sequence: 4,
                    actionType: 'trigger_rto',
                    delayMinutes: 2880, // 48 hours
                    autoExecute: true,
                    actionConfig: {},
                    description: 'Auto-trigger RTO if unresolved',
                },
            ],
            escalationRules: { afterHours: 24, escalateTo: 'supervisor', notifyVia: ['email'] },
            rtoTriggerConditions: { maxAttempts: 3, maxHours: 48, autoTrigger: true },
        },
        {
            ndrType: 'customer_unavailable',
            isDefault: true,
            name: 'Customer Unavailable Resolution',
            description: 'Default workflow for customer unavailable NDRs',
            actions: [
                {
                    sequence: 1,
                    actionType: 'call_customer',
                    delayMinutes: 0,
                    autoExecute: true,
                    actionConfig: { ivrFlow: 'ndr_reschedule' },
                    description: 'Call customer to reschedule',
                },
                {
                    sequence: 2,
                    actionType: 'send_whatsapp',
                    delayMinutes: 30,
                    autoExecute: true,
                    actionConfig: { template: 'ndr_reschedule' },
                    description: 'Send WhatsApp with reschedule options',
                },
                {
                    sequence: 3,
                    actionType: 'request_reattempt',
                    delayMinutes: 1440, // 24 hours
                    autoExecute: false,
                    actionConfig: {},
                    description: 'Request courier reattempt',
                },
            ],
            escalationRules: { afterHours: 48, escalateTo: 'supervisor', notifyVia: ['email'] },
            rtoTriggerConditions: { maxAttempts: 3, maxHours: 72, autoTrigger: true },
        },
        {
            ndrType: 'refused',
            isDefault: true,
            name: 'Refused Delivery Resolution',
            description: 'Workflow for refused deliveries',
            actions: [
                {
                    sequence: 1,
                    actionType: 'call_customer',
                    delayMinutes: 0,
                    autoExecute: true,
                    actionConfig: { ivrFlow: 'ndr_refused' },
                    description: 'Call to confirm refusal',
                },
                {
                    sequence: 2,
                    actionType: 'trigger_rto',
                    delayMinutes: 60,
                    autoExecute: false,
                    actionConfig: {},
                    description: 'Trigger RTO if confirmed refused',
                },
            ],
            escalationRules: { afterHours: 12, escalateTo: 'admin', notifyVia: ['email', 'whatsapp'] },
            rtoTriggerConditions: { maxAttempts: 1, maxHours: 24, autoTrigger: true },
        },
        {
            ndrType: 'payment_issue',
            isDefault: true,
            name: 'Payment Issue Resolution',
            description: 'Workflow for COD payment issues',
            actions: [
                {
                    sequence: 1,
                    actionType: 'send_whatsapp',
                    delayMinutes: 0,
                    autoExecute: true,
                    actionConfig: { template: 'ndr_payment' },
                    description: 'Send WhatsApp about payment options',
                },
                {
                    sequence: 2,
                    actionType: 'call_customer',
                    delayMinutes: 30,
                    autoExecute: true,
                    actionConfig: { ivrFlow: 'ndr_payment' },
                    description: 'Call to arrange payment',
                },
                {
                    sequence: 3,
                    actionType: 'request_reattempt',
                    delayMinutes: 120,
                    autoExecute: false,
                    actionConfig: {},
                    description: 'Request reattempt when payment ready',
                },
            ],
            escalationRules: { afterHours: 24, escalateTo: 'supervisor', notifyVia: ['email'] },
            rtoTriggerConditions: { maxAttempts: 2, maxHours: 48, autoTrigger: true },
        },
        {
            ndrType: 'other',
            isDefault: true,
            name: 'General NDR Resolution',
            description: 'Default workflow for unclassified NDRs',
            actions: [
                {
                    sequence: 1,
                    actionType: 'send_whatsapp',
                    delayMinutes: 0,
                    autoExecute: true,
                    actionConfig: { template: 'ndr_general' },
                    description: 'Send general NDR notification',
                },
                {
                    sequence: 2,
                    actionType: 'call_customer',
                    delayMinutes: 60,
                    autoExecute: true,
                    actionConfig: { ivrFlow: 'ndr_general' },
                    description: 'Call customer',
                },
            ],
            escalationRules: { afterHours: 24, escalateTo: 'supervisor', notifyVia: ['email'] },
            rtoTriggerConditions: { maxAttempts: 3, maxHours: 48, autoTrigger: true },
        },
    ];

    for (const workflow of defaultWorkflows) {
        const existing = await this.findOne({
            ndrType: workflow.ndrType,
            isDefault: true,
        });

        if (!existing) {
            await this.create(workflow);
        }
    }
};

const NDRWorkflow = mongoose.model<INDRWorkflow, INDRWorkflowModel>('NDRWorkflow', NDRWorkflowSchema);

export default NDRWorkflow;
