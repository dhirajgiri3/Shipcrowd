import mongoose, { Document, Schema } from 'mongoose';

/**
 * Scheduled Report Model
 * Automated report generation and delivery
 */

export interface IScheduledReport extends Document {
    name: string;
    description?: string;
    companyId: mongoose.Types.ObjectId;

    // Report Configuration
    reportType: 'orders' | 'shipments' | 'finance' | 'analytics' | 'performance' | 'custom';

    // Filters & Parameters
    filters: {
        dateRange?: 'today' | 'yesterday' | 'last_7_days' | 'last_30_days' | 'this_month' | 'last_month' | 'custom';
        customStartDate?: Date;
        customEndDate?: Date;
        status?: string[];
        couriers?: string[];
        paymentMethod?: string[];
        customFilters?: Record<string, any>;
    };

    // Data Selection
    columns: string[]; // Fields to include in report
    groupBy?: string[]; // Group data by fields
    sortBy?: {
        field: string;
        order: 'asc' | 'desc';
    }[];

    // Aggregations
    aggregations?: {
        type: 'sum' | 'avg' | 'count' | 'min' | 'max';
        field: string;
        label: string;
    }[];

    // Schedule Configuration
    schedule: {
        frequency: 'once' | 'daily' | 'weekly' | 'monthly' | 'custom';
        time?: string; // HH:mm format (24-hour)
        dayOfWeek?: number[]; // 0-6 (Sunday-Saturday) for weekly
        dayOfMonth?: number[]; // 1-31 for monthly
        cronExpression?: string; // For custom schedules
        timezone?: string; // e.g., 'Asia/Kolkata'
    };

    // Next scheduled run
    nextRunAt?: Date;
    lastRunAt?: Date;

    // Delivery Configuration
    delivery: {
        method: 'email' | 'webhook' | 'both';
        email?: {
            recipients: string[]; // Email addresses
            subject?: string;
            body?: string;
            attachmentFormat: 'csv' | 'excel' | 'pdf';
        };
        webhook?: {
            url: string;
            method: 'POST' | 'PUT';
            headers?: Record<string, string>;
            format: 'json' | 'csv';
        };
    };

    // Output Format
    format: 'csv' | 'excel' | 'pdf' | 'json';
    includeCharts?: boolean;
    includeNarrative?: boolean; // AI-generated insights

    // Status
    isActive: boolean;
    isPaused: boolean;

    // Execution History
    lastExecution?: {
        executedAt: Date;
        status: 'success' | 'failed' | 'partial';
        recordCount?: number;
        fileUrl?: string;
        error?: string;
    };

    executionCount: number;
    successCount: number;
    failureCount: number;

    // Metadata
    createdBy: mongoose.Types.ObjectId;
    updatedBy?: mongoose.Types.ObjectId;

    createdAt: Date;
    updatedAt: Date;

    calculateNextRun(): Date | undefined;
}

const ScheduledReportSchema = new Schema<IScheduledReport>(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        description: String,
        companyId: {
            type: Schema.Types.ObjectId,
            ref: 'Company',
            required: true,
            index: true,
        },
        reportType: {
            type: String,
            enum: ['orders', 'shipments', 'finance', 'analytics', 'performance', 'custom'],
            required: true,
        },
        filters: {
            dateRange: {
                type: String,
                enum: ['today', 'yesterday', 'last_7_days', 'last_30_days', 'this_month', 'last_month', 'custom'],
            },
            customStartDate: Date,
            customEndDate: Date,
            status: [String],
            couriers: [String],
            paymentMethod: [String],
            customFilters: Schema.Types.Mixed,
        },
        columns: {
            type: [String],
            required: true,
        },
        groupBy: [String],
        sortBy: [
            {
                field: String,
                order: {
                    type: String,
                    enum: ['asc', 'desc'],
                },
            },
        ],
        aggregations: [
            {
                type: {
                    type: String,
                    enum: ['sum', 'avg', 'count', 'min', 'max'],
                },
                field: String,
                label: String,
            },
        ],
        schedule: {
            frequency: {
                type: String,
                enum: ['once', 'daily', 'weekly', 'monthly', 'custom'],
                required: true,
            },
            time: String,
            dayOfWeek: [Number],
            dayOfMonth: [Number],
            cronExpression: String,
            timezone: {
                type: String,
                default: 'Asia/Kolkata',
            },
        },
        nextRunAt: {
            type: Date,
            index: true,
        },
        lastRunAt: Date,
        delivery: {
            method: {
                type: String,
                enum: ['email', 'webhook', 'both'],
                required: true,
            },
            email: {
                recipients: [String],
                subject: String,
                body: String,
                attachmentFormat: {
                    type: String,
                    enum: ['csv', 'excel', 'pdf'],
                },
            },
            webhook: {
                url: String,
                method: {
                    type: String,
                    enum: ['POST', 'PUT'],
                },
                headers: Schema.Types.Mixed,
                format: {
                    type: String,
                    enum: ['json', 'csv'],
                },
            },
        },
        format: {
            type: String,
            enum: ['csv', 'excel', 'pdf', 'json'],
            required: true,
        },
        includeCharts: {
            type: Boolean,
            default: false,
        },
        includeNarrative: {
            type: Boolean,
            default: false,
        },
        isActive: {
            type: Boolean,
            default: true,
            index: true,
        },
        isPaused: {
            type: Boolean,
            default: false,
        },
        lastExecution: {
            executedAt: Date,
            status: {
                type: String,
                enum: ['success', 'failed', 'partial'],
            },
            recordCount: Number,
            fileUrl: String,
            error: String,
        },
        executionCount: {
            type: Number,
            default: 0,
        },
        successCount: {
            type: Number,
            default: 0,
        },
        failureCount: {
            type: Number,
            default: 0,
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        updatedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
        },
    },
    {
        timestamps: true,
    }
);

// Indexes
ScheduledReportSchema.index({ companyId: 1, isActive: 1 });
ScheduledReportSchema.index({ companyId: 1, reportType: 1 });
ScheduledReportSchema.index({ nextRunAt: 1, isActive: 1, isPaused: 1 });

// Calculate next run time before save
ScheduledReportSchema.pre('save', function (next) {
    if (this.isModified('schedule') || this.isNew) {
        this.nextRunAt = (this as any).calculateNextRun();
    }
    next();
});

// Method to calculate next run time
ScheduledReportSchema.methods.calculateNextRun = function (): Date | undefined {
    if (!this.isActive || this.isPaused) {
        return undefined;
    }

    const now = new Date();
    const { frequency, time, dayOfWeek, dayOfMonth, cronExpression } = this.schedule;

    switch (frequency) {
        case 'once':
            return this.nextRunAt || now;

        case 'daily': {
            const [hours, minutes] = (time || '09:00').split(':').map(Number);
            const next = new Date(now);
            next.setHours(hours, minutes, 0, 0);
            if (next <= now) {
                next.setDate(next.getDate() + 1);
            }
            return next;
        }

        case 'weekly': {
            const [hours, minutes] = (time || '09:00').split(':').map(Number);
            const next = new Date(now);
            next.setHours(hours, minutes, 0, 0);

            const targetDays = dayOfWeek || [1]; // Default to Monday
            const currentDay = next.getDay();

            // Find next occurrence
            let daysToAdd = targetDays.find((day: number) => day > currentDay) || targetDays[0];
            if (daysToAdd <= currentDay) {
                daysToAdd += 7;
            }

            next.setDate(next.getDate() + (daysToAdd - currentDay));
            return next;
        }

        case 'monthly': {
            const [hours, minutes] = (time || '09:00').split(':').map(Number);
            const next = new Date(now);
            next.setHours(hours, minutes, 0, 0);

            const targetDays = dayOfMonth || [1]; // Default to 1st of month
            const currentDay = next.getDate();

            // Find next occurrence
            let targetDay = targetDays.find((day: number) => day > currentDay);
            if (!targetDay) {
                // Move to next month
                next.setMonth(next.getMonth() + 1);
                targetDay = targetDays[0];
            }

            next.setDate(targetDay);
            return next;
        }

        case 'custom':
            // For custom cron expressions, would need a cron parser library
            // For now, default to daily
            return this.calculateNextRun.call({ ...this, schedule: { ...this.schedule, frequency: 'daily' } });

        default:
            return undefined;
    }
};

const ScheduledReport = mongoose.model<IScheduledReport>('ScheduledReport', ScheduledReportSchema);

export default ScheduledReport;
