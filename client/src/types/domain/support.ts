export interface TicketNote {
    id?: string;
    userId: string;
    userName?: string; // Optional if not populated immediately
    message: string;
    type: 'internal_note' | 'reply';
    createdAt: string;
}

export interface SupportTicket {
    _id: string; // MongoDB ID from controller
    ticketId: string; // Display ID e.g. TKT-001
    companyId: string;
    userId: string;
    subject: string;
    category: 'technical' | 'billing' | 'logistics' | 'other';
    priority: 'low' | 'medium' | 'high' | 'critical';
    status: 'open' | 'in_progress' | 'resolved' | 'closed';
    description: string;
    attachments?: string[];
    assignedTo?: string;
    relatedOrderId?: string;
    relatedNDREventId?: string;
    slaBreached?: boolean;
    createdAt: string;
    updatedAt: string;
    notes?: TicketNote[];
}

export interface SupportTicketFilters {
    page?: number;
    limit?: number;
    status?: string;
    priority?: string;
    category?: string;
    assignedTo?: string;
    relatedOrderId?: string;
    search?: string; // Added search filter to match UI needs
}

export interface CreateTicketPayload {
    subject: string;
    category: string;
    priority?: string;
    description: string;
    attachments?: string[];
    relatedOrderId?: string;
    relatedNDREventId?: string;
}

export interface UpdateTicketPayload {
    status?: string;
    priority?: string;
    assignedTo?: string;
    slaBreached?: boolean;
}

export interface AddNotePayload {
    message: string;
    type: 'internal_note' | 'reply';
}

export interface SupportMetrics {
    totalTickets: number;
    openTickets: number;
    inProgressTickets: number;
    resolvedTickets: number;
    avgResolutionTime: number; // in hours
    slaBreachRate: number; // percentage
}
