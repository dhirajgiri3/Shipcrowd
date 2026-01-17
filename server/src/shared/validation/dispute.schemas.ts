/**
 * Dispute Validation Schemas
 *
 * Joi validation schemas for all dispute-related operations:
 * - Create dispute
 * - Add evidence
 * - Update status
 * - Resolve dispute
 * - Assign dispute
 * - Query parameters for filtering and pagination
 *
 * These schemas ensure data integrity and provide clear error messages.
 */

import Joi from 'joi';

/**
 * Create dispute schema
 */
export const createDisputeSchema = Joi.object({
    shipmentId: Joi.string()
        .required()
        .regex(/^[0-9a-fA-F]{24}$/)
        .messages({
            'string.pattern.base': 'Invalid shipment ID format',
            'any.required': 'Shipment ID is required',
        }),

    type: Joi.string()
        .valid('delivery', 'damage', 'lost', 'other')
        .required()
        .messages({
            'any.only': 'Type must be one of: delivery, damage, lost, other',
            'any.required': 'Dispute type is required',
        }),

    category: Joi.string()
        .valid(
            'not_delivered',
            'partial_delivery',
            'damaged_product',
            'wrong_item',
            'missing_item',
            'lost_in_transit',
            'delayed'
        )
        .required()
        .messages({
            'any.only':
                'Category must be one of: not_delivered, partial_delivery, damaged_product, wrong_item, missing_item, lost_in_transit, delayed',
            'any.required': 'Dispute category is required',
        }),

    description: Joi.string()
        .min(10)
        .max(2000)
        .required()
        .messages({
            'string.min': 'Description must be at least 10 characters',
            'string.max': 'Description cannot exceed 2000 characters',
            'any.required': 'Description is required',
        }),

    evidence: Joi.array()
        .items(
            Joi.object({
                type: Joi.string()
                    .valid('image', 'document', 'video', 'note')
                    .required(),
                url: Joi.string().uri().allow(''),
                description: Joi.string().max(500).required(),
            })
        )
        .max(10)
        .messages({
            'array.max': 'Cannot add more than 10 evidence items at once',
        }),
});

/**
 * Add evidence schema
 */
export const addEvidenceSchema = Joi.object({
    type: Joi.string()
        .valid('image', 'document', 'video', 'note')
        .required()
        .messages({
            'any.only': 'Evidence type must be one of: image, document, video, note',
            'any.required': 'Evidence type is required',
        }),

    url: Joi.string()
        .uri()
        .allow('')
        .messages({
            'string.uri': 'Invalid URL format',
        }),

    description: Joi.string()
        .min(5)
        .max(500)
        .required()
        .messages({
            'string.min': 'Description must be at least 5 characters',
            'string.max': 'Description cannot exceed 500 characters',
            'any.required': 'Description is required',
        }),
});

/**
 * Update status schema
 */
export const updateStatusSchema = Joi.object({
    status: Joi.string()
        .valid('pending', 'investigating', 'resolved', 'closed', 'escalated')
        .required()
        .messages({
            'any.only':
                'Status must be one of: pending, investigating, resolved, closed, escalated',
            'any.required': 'Status is required',
        }),

    notes: Joi.string()
        .max(1000)
        .allow('')
        .messages({
            'string.max': 'Notes cannot exceed 1000 characters',
        }),
});

/**
 * Resolve dispute schema
 */
export const resolveDisputeSchema = Joi.object({
    resolution: Joi.object({
        type: Joi.string()
            .valid('refund', 'replacement', 'compensation', 'rejected')
            .required()
            .messages({
                'any.only':
                    'Resolution type must be one of: refund, replacement, compensation, rejected',
                'any.required': 'Resolution type is required',
            }),

        amount: Joi.number()
            .min(0)
            .max(1000000)
            .when('type', {
                is: Joi.valid('refund', 'compensation'),
                then: Joi.required(),
                otherwise: Joi.forbidden(),
            })
            .messages({
                'number.min': 'Amount must be at least 0',
                'number.max': 'Amount cannot exceed ₹10,00,000',
                'any.required': 'Amount is required for refund/compensation',
            }),

        reason: Joi.string()
            .min(10)
            .max(1000)
            .required()
            .messages({
                'string.min': 'Reason must be at least 10 characters',
                'string.max': 'Reason cannot exceed 1000 characters',
                'any.required': 'Resolution reason is required',
            }),
    }).required(),
});

/**
 * Assign dispute schema
 */
export const assignDisputeSchema = Joi.object({
    assignedTo: Joi.string()
        .required()
        .regex(/^[0-9a-fA-F]{24}$/)
        .messages({
            'string.pattern.base': 'Invalid user ID format',
            'any.required': 'Assigned user ID is required',
        }),
});

/**
 * Query parameters schema (for filtering and pagination)
 */
export const queryParamsSchema = Joi.object({
    page: Joi.number()
        .integer()
        .min(1)
        .default(1)
        .messages({
            'number.min': 'Page must be at least 1',
            'number.base': 'Page must be a number',
        }),

    limit: Joi.number()
        .integer()
        .min(1)
        .max(100)
        .default(20)
        .messages({
            'number.min': 'Limit must be at least 1',
            'number.max': 'Limit cannot exceed 100',
            'number.base': 'Limit must be a number',
        }),

    status: Joi.string()
        .valid('pending', 'investigating', 'resolved', 'closed', 'escalated')
        .messages({
            'any.only':
                'Status must be one of: pending, investigating, resolved, closed, escalated',
        }),

    priority: Joi.string()
        .valid('low', 'medium', 'high', 'urgent')
        .messages({
            'any.only': 'Priority must be one of: low, medium, high, urgent',
        }),

    type: Joi.string()
        .valid('delivery', 'damage', 'lost', 'other')
        .messages({
            'any.only': 'Type must be one of: delivery, damage, lost, other',
        }),

    category: Joi.string()
        .valid(
            'not_delivered',
            'partial_delivery',
            'damaged_product',
            'wrong_item',
            'missing_item',
            'lost_in_transit',
            'delayed'
        )
        .messages({
            'any.only':
                'Category must be one of: not_delivered, partial_delivery, damaged_product, wrong_item, missing_item, lost_in_transit, delayed',
        }),

    startDate: Joi.date()
        .iso()
        .messages({
            'date.format': 'Start date must be in ISO 8601 format',
        }),

    endDate: Joi.date()
        .iso()
        .min(Joi.ref('startDate'))
        .messages({
            'date.format': 'End date must be in ISO 8601 format',
            'date.min': 'End date must be after start date',
        }),

    search: Joi.string()
        .max(100)
        .messages({
            'string.max': 'Search query cannot exceed 100 characters',
        }),
});

/**
 * Escalate dispute schema
 */
export const escalateDisputeSchema = Joi.object({
    reason: Joi.string()
        .min(10)
        .max(1000)
        .required()
        .messages({
            'string.min': 'Escalation reason must be at least 10 characters',
            'string.max': 'Escalation reason cannot exceed 1000 characters',
            'any.required': 'Escalation reason is required',
        }),
});

/**
 * Analytics date range schema
 */
export const analyticsDateRangeSchema = Joi.object({
    startDate: Joi.date()
        .iso()
        .messages({
            'date.format': 'Start date must be in ISO 8601 format',
        }),

    endDate: Joi.date()
        .iso()
        .min(Joi.ref('startDate'))
        .messages({
            'date.format': 'End date must be in ISO 8601 format',
            'date.min': 'End date must be after start date',
        }),

    groupBy: Joi.string()
        .valid('day', 'week', 'month')
        .default('day')
        .messages({
            'any.only': 'Group by must be one of: day, week, month',
        }),

    limit: Joi.number()
        .integer()
        .min(1)
        .max(50)
        .default(10)
        .messages({
            'number.min': 'Limit must be at least 1',
            'number.max': 'Limit cannot exceed 50',
        }),
});
