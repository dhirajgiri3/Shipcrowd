"use client";
export const dynamic = "force-dynamic";

import { useState } from 'react';
import { Card, CardContent } from '@/src/components/ui/core/Card';
import { Button } from '@/src/components/ui/core/Button';
import { Input } from '@/src/components/ui/core/Input';
import { StatusBadge } from '@/src/components/ui/data/StatusBadge';
import { Select } from '@/src/components/ui/form/Select';
import {
    Search,
    MessageSquare,
    AlertCircle,
    CheckCircle,
    Clock,
    Filter,
    MoreVertical,
    Send,
    Download,
    Plus,
    ChevronLeft,
    ChevronRight,
    Loader2
} from 'lucide-react';
import { useToast } from '@/src/components/ui/feedback/Toast';
import { cn } from '@/src/lib/utils';
import {
    useSupportTickets,
    useSupportMetrics,
    useSupportTicketDetail,
    useUpdateTicket,
    useAddTicketNote
} from '@/src/core/api/hooks/support/useSupportTickets';
import { SupportTicket } from '@/src/types/domain/support';
import { Loader } from '@/src/components/ui/feedback/Loader';
import { format } from 'date-fns';

export function SupportClient() {
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [priorityFilter, setPriorityFilter] = useState('all');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [page, setPage] = useState(1);
    const [limit] = useState(10);
    const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
    const [replyMessage, setReplyMessage] = useState('');

    const { addToast } = useToast();

    // Queries
    const {
        data: ticketsData,
        isLoading: isTicketsLoading
    } = useSupportTickets({
        page,
        limit,
        status: statusFilter,
        priority: priorityFilter,
        category: categoryFilter,
        search
    });

    const {
        data: metricsData,
        isLoading: isMetricsLoading
    } = useSupportMetrics();

    // Hook for detail view (lazy fetched when modal open)
    const {
        data: selectedTicket,
        isLoading: isTicketLoading
    } = useSupportTicketDetail(selectedTicketId, { enabled: !!selectedTicketId });

    // Mutations
    const { mutate: updateTicket, isPending: isUpdating } = useUpdateTicket(selectedTicketId || '');
    const { mutate: addNote, isPending: isSendingReply } = useAddTicketNote(selectedTicketId || '');

    const handleSendReply = () => {
        if (!replyMessage.trim() || !selectedTicketId) return;

        addNote({
            message: replyMessage,
            type: 'reply'
        }, {
            onSuccess: () => {
                setReplyMessage('');
                // Status update logic could be automatic (e.g. set to 'in_progress' or 'resolved' based on action)
            }
        });
    };

    const handleStatusChange = (newStatus: string) => {
        if (!selectedTicketId) return;
        updateTicket({ status: newStatus });
    };

    const stats = [
        { title: 'Total Tickets', value: metricsData?.totalTickets || 0, icon: MessageSquare, color: 'blue' },
        { title: 'Pending', value: metricsData?.openTickets || 0, icon: Clock, color: 'amber' },
        { title: 'Resolved', value: metricsData?.resolvedTickets || 0, icon: CheckCircle, color: 'green' },
        { title: 'SLA Breach Rate', value: `${metricsData?.slaBreachRate || 0}%`, icon: AlertCircle, color: 'red' },
    ];

    // Helper functions removed in favor of StatusBadge

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)]">Help & Support</h1>
                    <p className="text-[var(--text-muted)] text-sm">Manage support tickets and inquiries</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline">
                        <Download className="w-4 h-4 mr-2" /> Export
                    </Button>
                    <Button>
                        <Plus className="w-4 h-4 mr-2" /> New Ticket
                    </Button>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {stats.map((stat, i) => (
                    <Card key={i} className="border border-[var(--border-subtle)] bg-[var(--bg-primary)]">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className={cn(
                                    "p-2 rounded-lg",
                                    stat.color === 'blue' ? "bg-[var(--info-bg)] text-[var(--info)]" :
                                        stat.color === 'amber' ? "bg-[var(--warning-bg)] text-[var(--warning)]" :
                                            stat.color === 'green' ? "bg-[var(--success-bg)] text-[var(--success)]" :
                                                "bg-[var(--error-bg)] text-[var(--error)]"
                                )}>
                                    <stat.icon className="w-5 h-5" />
                                </div>
                                <span className={cn(
                                    "text-xs font-bold px-2 py-1 rounded-full",
                                    "bg-[var(--bg-secondary)] text-[var(--text-secondary)]"
                                )}>
                                    +12%
                                </span>
                            </div>
                            <h3 className="text-2xl font-bold text-[var(--text-primary)]">{isMetricsLoading ? '-' : stat.value}</h3>
                            <p className="text-[var(--text-muted)] text-sm">{stat.title}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 bg-[var(--bg-primary)] p-4 rounded-xl border border-[var(--border-subtle)]">
                <div className="relative w-full md:w-96">
                    <Input
                        placeholder="Search tickets..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        icon={<Search className="w-4 h-4" />}
                        className="bg-[var(--bg-secondary)] border-transparent"
                    />
                </div>
                <div className="flex flex-wrap gap-3">
                    <Select
                        className="w-[140px]"
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        options={[
                            { label: 'All Categories', value: 'all' },
                            { label: 'Technical', value: 'technical' },
                            { label: 'Billing', value: 'billing' },
                            { label: 'Logistics', value: 'logistics' }
                        ]}
                    />

                    <Select
                        className="w-[140px]"
                        value={priorityFilter}
                        onChange={(e) => setPriorityFilter(e.target.value)}
                        options={[
                            { label: 'All Priorities', value: 'all' },
                            { label: 'High', value: 'high' },
                            { label: 'Medium', value: 'medium' },
                            { label: 'Low', value: 'low' }
                        ]}
                    />
                </div>
            </div>

            {/* Status Tabs */}
            <div className="flex gap-2 border-b border-[var(--border-subtle)] overflow-x-auto pb-1">
                {[
                    { id: 'all', label: 'All Tickets' },
                    { id: 'open', label: 'Open' },
                    { id: 'in_progress', label: 'In Progress' },
                    { id: 'resolved', label: 'Resolved' },
                ].map((status) => (
                    <Button
                        key={status.id}
                        variant={statusFilter === status.id ? 'primary' : 'ghost'}
                        onClick={() => setStatusFilter(status.id)}
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-[var(--primary-blue)] hover:bg-transparent"
                        data-state={statusFilter === status.id ? 'active' : ''}
                    >
                        {status.label}
                    </Button>
                ))}
            </div>

            {/* Tickets List */}
            <div className="space-y-4">
                {isTicketsLoading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="w-8 h-8 text-[var(--primary-blue)] animate-spin" />
                    </div>
                ) : ticketsData?.tickets?.length === 0 ? (
                    <div className="text-center py-12 text-[var(--text-muted)]">
                        No tickets found matching your filters.
                    </div>
                ) : (
                    ticketsData?.tickets?.map((ticket: SupportTicket) => (
                        <div
                            key={ticket._id}
                            onClick={() => setSelectedTicketId(ticket._id)}
                            className="bg-[var(--bg-primary)] p-4 rounded-xl border border-[var(--border-subtle)] hover:border-[var(--primary-blue)] hover:shadow-md transition-all cursor-pointer group"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex gap-4">
                                    <div className="w-10 h-10 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center text-[var(--text-secondary)] font-bold group-hover:bg-[var(--primary-blue-soft)] group-hover:text-[var(--primary-blue)] transition-colors">
                                        {(ticket.assignedTo || ticket.ticketId || '#').substring(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-semibold text-[var(--text-primary)]">{ticket.subject}</h3>
                                            <StatusBadge domain="support_priority" status={ticket.priority} />
                                        </div>
                                        <p className="text-sm text-[var(--text-secondary)] line-clamp-1 mb-2">
                                            {ticket.description}
                                        </p>
                                        <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
                                            <span className="flex items-center gap-1">
                                                <div className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)]" />
                                                #{ticket.ticketId}
                                            </span>
                                            <span>•</span>
                                            <span>{format(new Date(ticket.createdAt), 'MMM d, yyyy')}</span>
                                            <span>•</span>
                                            <span>{ticket.category}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <StatusBadge domain="support_ticket" status={ticket.status} />
                                    <span className="text-xs text-[var(--text-muted)]">
                                        Last update: {format(new Date(ticket.updatedAt), 'MMM d')}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))
                )}

                {/* Pagination */}
                {ticketsData?.pagination && ticketsData.pagination.pages > 1 && (
                    <div className="flex items-center justify-between pt-4">
                        <div className="text-sm text-[var(--text-muted)]">
                            Showing page {page} of {ticketsData.pagination.pages}
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage(p => Math.min(ticketsData.pagination.pages, p + 1))}
                                disabled={page === ticketsData.pagination.pages}
                            >
                                <ChevronRight className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Ticket Detail Modal */}
            {selectedTicketId && (
                <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/20 backdrop-blur-sm">
                    <div className="w-full max-w-2xl h-full bg-[var(--bg-primary)] shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">

                        {/* Modal Header */}
                        <div className="p-6 border-b border-[var(--border-subtle)] flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-bold text-[var(--text-primary)]">
                                    {isTicketLoading ? 'Loading...' : `Ticket #${selectedTicket?.ticketId}`}
                                </h2>
                                <p className="text-sm text-[var(--text-muted)]">customer@example.com</p>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => setSelectedTicketId(null)}>
                                Close
                            </Button>
                        </div>

                        {/* Modal Content */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {isTicketLoading || !selectedTicket ? (
                                <div className="flex justify-center py-12">
                                    <Loader2 className="w-8 h-8 text-[var(--primary-blue)] animate-spin" />
                                </div>
                            ) : (
                                <>
                                    {/* Ticket Context */}
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <p className="text-[var(--text-muted)] mb-1">Status</p>
                                            <Select
                                                className="h-8"
                                                defaultValue={selectedTicket.status}
                                                onChange={(e) => handleStatusChange(e.target.value)}
                                                disabled={isUpdating}
                                                options={[
                                                    { label: 'Open', value: 'open' },
                                                    { label: 'In Progress', value: 'in_progress' },
                                                    { label: 'Resolved', value: 'resolved' },
                                                    { label: 'Closed', value: 'closed' }
                                                ]}
                                            />
                                        </div>
                                        <div>
                                            <p className="text-[var(--text-muted)] mb-1">Priority</p>
                                            <StatusBadge domain="support_priority" status={selectedTicket.priority} />
                                        </div>
                                    </div>

                                    {/* Conversation */}
                                    <div className="space-y-6">
                                        {/* Original Issue */}
                                        <div className="flex gap-4">
                                            <div className="w-8 h-8 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center text-xs font-bold flex-shrink-0">
                                                CS
                                            </div>
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold text-[var(--text-primary)]">Customer</span>
                                                    <span className="text-xs text-[var(--text-muted)]">{format(new Date(selectedTicket.createdAt), 'MMM d, h:mm a')}</span>
                                                </div>
                                                <div className="bg-[var(--bg-secondary)] p-4 rounded-xl text-sm text-[var(--text-secondary)]">
                                                    <p className="font-semibold mb-2">{selectedTicket.subject}</p>
                                                    <p>{selectedTicket.description}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Discussion / Notes */}
                                        {selectedTicket.notes?.map((note: any) => (
                                            <div key={note.id || note._id} className={cn(
                                                "flex gap-4",
                                                note.type === 'reply' ? "flex-row-reverse" : ""
                                            )}>
                                                <div className={cn(
                                                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0",
                                                    note.type === 'reply' ? "bg-[var(--primary-blue)] text-white" : "bg-[var(--bg-tertiary)]"
                                                )}>
                                                    {note.type === 'reply' ? 'ME' : 'ST'}
                                                </div>
                                                <div className={cn(
                                                    "space-y-2 max-w-[80%]",
                                                    note.type === 'reply' ? "items-end" : "items-start"
                                                )}>
                                                    <div className={cn(
                                                        "flex items-center gap-2",
                                                        note.type === 'reply' ? "flex-row-reverse" : ""
                                                    )}>
                                                        <span className="font-semibold text-[var(--text-primary)]">
                                                            {note.userName || (note.type === 'reply' ? 'You' : 'Staff')}
                                                        </span>
                                                        <span className="text-xs text-[var(--text-muted)]">
                                                            {format(new Date(note.createdAt), 'MMM d, h:mm a')}
                                                        </span>
                                                    </div>
                                                    <div className={cn(
                                                        "p-4 rounded-xl text-sm",
                                                        note.type === 'reply'
                                                            ? "bg-[var(--primary-blue-soft)] text-[var(--primary-blue)]"
                                                            : "bg-[var(--bg-tertiary)] text-[var(--text-secondary)]"
                                                    )}>
                                                        <p>{note.message}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Reply Box */}
                        <div className="p-6 border-t border-[var(--border-subtle)] bg-[var(--bg-primary)]">
                            <div className="space-y-4">
                                <div className="relative">
                                    <textarea
                                        value={replyMessage}
                                        onChange={(e) => setReplyMessage(e.target.value)}
                                        placeholder="Type your reply here..."
                                        className="w-full h-32 p-4 rounded-xl bg-[var(--bg-secondary)] border-none focus:ring-1 focus:ring-[var(--primary-blue)] resize-none text-sm placeholder:text-[var(--text-muted)]"
                                    />
                                    <div className="absolute bottom-3 right-3 flex gap-2">
                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                            <PaperclipIcon className="w-4 h-4 text-[var(--text-muted)]" />
                                        </Button>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center">
                                    <div className="text-xs text-[var(--text-muted)]">
                                        Press Enter to send
                                    </div>
                                    <Button
                                        onClick={handleSendReply}
                                        disabled={!replyMessage.trim() || isSendingReply}
                                    >
                                        {isSendingReply ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                Sending...
                                            </>
                                        ) : (
                                            <>
                                                Send Reply
                                                <Send className="w-4 h-4 ml-2" />
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
}

// Simple Icon component for the textarea
function PaperclipIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
        </svg>
    )
}
