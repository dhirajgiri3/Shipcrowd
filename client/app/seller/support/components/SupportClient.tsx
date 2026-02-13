"use client";
export const dynamic = "force-dynamic";

import { useState } from 'react';
import {
    Card, CardContent, CardHeader, CardTitle, CardDescription,
    Button,
    Input,
    Badge,
    CardSkeleton,
    Loader
} from '@/src/components/ui';
import { useLoader } from '@/src/hooks/utility/useLoader';
import {
    HelpCircle,
    MessageSquare,
    Phone,
    Mail,
    FileText,
    ChevronRight,
    Search,
    ExternalLink,
    Plus,
    Clock,
    CheckCircle2,
    AlertCircle,
    X,
    Send,
    Paperclip
} from 'lucide-react';
import { StatusBadge } from '@/src/components/ui/data/StatusBadge';
import { useToast } from '@/src/components/ui/feedback/Toast';
import { cn } from '@/src/lib/utils';
import { useSupportTickets, useCreateSupportTicket } from '@/src/core/api/hooks/support/useSupport';
import { formatDistanceToNow } from 'date-fns';

const faqItems = [
    { question: 'How do I create a shipment?', category: 'Shipments' },
    { question: 'What are the accepted weight limits?', category: 'Shipments' },
    { question: 'How does COD remittance work?', category: 'Payments' },
    { question: 'How to connect my Shopify store?', category: 'Integrations' },
    { question: 'What is NDR and how to resolve it?', category: 'NDR' },
    { question: 'How to track my shipment?', category: 'Tracking' },
];

export function SupportClient() {
    // API Hooks
    const [ticketFilter, setTicketFilter] = useState<'all' | 'open' | 'resolved'>('all');
    const { data: ticketsData, isLoading } = useSupportTickets({
        status: ticketFilter === 'all' ? undefined : ticketFilter === 'open' ? 'open,in_progress' : 'resolved,closed',
        page: 1,
        limit: 20,
    });
    const createTicket = useCreateSupportTicket();

    // Local State
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'help' | 'tickets'>('help');
    const [showNewTicket, setShowNewTicket] = useState(false);
    const [ticketForm, setTicketForm] = useState({
        subject: '',
        category: '',
        priority: 'medium',
        description: '',
        awbNumber: '',
    });
    const { addToast } = useToast();

    // Loader state
    const { isLoading: isSubmitLoading, showLoader, startLoading, stopLoading } = useLoader({
        minDelay: 300,
        minDisplay: 500
    });

    const tickets = ticketsData?.tickets || [];
    const filteredTickets = tickets;

    // Helper removed - using StatusBadge component


    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'high': return 'border-l-[var(--error)]';
            case 'medium': return 'border-l-[var(--warning)]';
            case 'low': return 'border-l-[var(--success)]';
            default: return 'border-l-[var(--border-subtle)]';
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header with Tabs */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                        <HelpCircle className="h-6 w-6 text-[var(--primary-blue)]" />
                        Help & Support
                    </h1>
                    <p className="text-[var(--text-muted)] text-sm mt-1">Get help or manage your support tickets</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex bg-[var(--bg-tertiary)] rounded-lg p-1">
                        <button
                            onClick={() => setActiveTab('help')}
                            className={cn(
                                "px-4 py-2 text-sm font-medium rounded-md transition-all",
                                activeTab === 'help' ? "bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-sm" : "text-[var(--text-secondary)]"
                            )}
                        >
                            Help Center
                        </button>
                        <button
                            onClick={() => setActiveTab('tickets')}
                            className={cn(
                                "px-4 py-2 text-sm font-medium rounded-md transition-all",
                                activeTab === 'tickets' ? "bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-sm" : "text-[var(--text-secondary)]"
                            )}
                        >
                            My Tickets
                        </button>
                    </div>
                    <Button onClick={() => setShowNewTicket(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        New Ticket
                    </Button>
                </div>
            </div>

            {/* New Ticket Form */}
            {showNewTicket && (
                <Card className="border-[var(--primary-blue)]/20 bg-[var(--primary-blue-soft)]">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-lg">Create Support Ticket</CardTitle>
                            <CardDescription>Describe your issue and we'll get back to you shortly</CardDescription>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => setShowNewTicket(false)}>
                            <X className="h-4 w-4" />
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-[var(--text-primary)]">Issue Category *</label>
                                <select
                                    value={ticketForm.category}
                                    onChange={(e) => setTicketForm({ ...ticketForm, category: e.target.value })}
                                    className="flex h-10 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-default)] transition-colors"
                                >
                                    <option value="">Select category</option>
                                    <option value="technical">Technical Issue</option>
                                    <option value="billing">Billing / Payment</option>
                                    <option value="logistics">Logistics / Shipment</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-[var(--text-primary)]">Priority</label>
                                <select
                                    value={ticketForm.priority}
                                    onChange={(e) => setTicketForm({ ...ticketForm, priority: e.target.value })}
                                    className="flex h-10 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-default)] transition-colors"
                                >
                                    <option value="low">Low</option>
                                    <option value="medium">Medium</option>
                                    <option value="high">High</option>
                                    <option value="urgent">Urgent</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[var(--text-primary)]">Subject *</label>
                            <Input
                                placeholder="Brief description of your issue"
                                value={ticketForm.subject}
                                onChange={(e) => setTicketForm({ ...ticketForm, subject: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[var(--text-primary)]">Description *</label>
                            <textarea
                                value={ticketForm.description}
                                onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })}
                                className="flex min-h-[120px] w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3 py-2 text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--border-default)] transition-colors resize-none"
                                placeholder="Provide detailed information about your issue..."
                            />
                        </div>

                        <div className="border-2 border-dashed border-[var(--border-subtle)] rounded-lg p-4 text-center hover:border-[var(--primary-blue)]/50 transition-colors cursor-pointer">
                            <Paperclip className="h-5 w-5 text-[var(--text-muted)] mx-auto mb-1" />
                            <p className="text-sm text-[var(--text-muted)]">Attach files (optional)</p>
                            <p className="text-xs text-[var(--text-muted)]">Max 5MB per file</p>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-subtle)]">
                            <Button variant="outline" onClick={() => setShowNewTicket(false)}>Cancel</Button>
                            <Button
                                disabled={isSubmitLoading || !ticketForm.subject || !ticketForm.category || !ticketForm.description}
                                isLoading={showLoader}
                                onClick={async () => {
                                    startLoading();
                                    try {
                                        await createTicket.mutateAsync({
                                            subject: ticketForm.subject,
                                            category: ticketForm.category,
                                            priority: ticketForm.priority,
                                            description: ticketForm.description,
                                        });
                                        setShowNewTicket(false);
                                        setTicketForm({
                                            subject: '',
                                            category: '',
                                            priority: 'medium',
                                            description: '',
                                            awbNumber: '',
                                        });
                                        addToast('Ticket created successfully', 'success');
                                    } catch (error) {
                                        console.error(error);
                                    } finally {
                                        stopLoading();
                                    }
                                }}
                            >
                                <Send className="h-4 w-4 mr-2" />
                                Submit Ticket
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Help Center Tab */}
            {activeTab === 'help' && (
                <>
                    {/* Search */}
                    <Card className="bg-[var(--primary-blue-soft)] border-[var(--primary-blue)]/20">
                        <CardContent className="pt-6">
                            <div className="max-w-xl mx-auto">
                                <Input
                                    placeholder="Search for help articles..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    icon={<Search className="h-4 w-4" />}
                                    className="bg-[var(--bg-primary)]"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Contact Options */}
                    <div className="grid gap-4 md:grid-cols-3">
                        <Card className="hover:shadow-md transition-shadow cursor-pointer group" onClick={() => addToast('Opening WhatsApp...', 'info')}>
                            <CardContent className="p-6 text-center">
                                <div className="w-12 h-12 bg-[var(--success-bg)] rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                                    <MessageSquare className="h-6 w-6 text-[var(--success)]" />
                                </div>
                                <h3 className="font-semibold text-[var(--text-primary)]">WhatsApp</h3>
                                <p className="text-sm text-[var(--text-muted)] mt-1">Quick chat support</p>
                                <p className="text-xs text-[var(--success)] mt-2">● Online now</p>
                            </CardContent>
                        </Card>

                        <Card className="hover:shadow-md transition-shadow cursor-pointer group" onClick={() => addToast('Calling support...', 'info')}>
                            <CardContent className="p-6 text-center">
                                <div className="w-12 h-12 bg-[var(--primary-blue-soft)] rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                                    <Phone className="h-6 w-6 text-[var(--primary-blue)]" />
                                </div>
                                <h3 className="font-semibold text-[var(--text-primary)]">Call Us</h3>
                                <p className="text-sm text-[var(--text-muted)] mt-1">+91 1800-XXX-XXXX</p>
                                <p className="text-xs text-[var(--text-muted)] mt-2">Mon-Sat, 9AM-6PM</p>
                            </CardContent>
                        </Card>

                        <Card className="hover:shadow-md transition-shadow cursor-pointer group" onClick={() => addToast('Opening email client...', 'info')}>
                            <CardContent className="p-6 text-center">
                                <div className="w-12 h-12 bg-[var(--warning-bg)] rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                                    <Mail className="h-6 w-6 text-[var(--warning)]" />
                                </div>
                                <h3 className="font-semibold text-[var(--text-primary)]">Email Support</h3>
                                <p className="text-sm text-[var(--text-muted)] mt-1">support@Shipcrowd.in</p>
                                <p className="text-xs text-[var(--text-muted)] mt-2">Response within 24hrs</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* FAQs */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <HelpCircle className="h-5 w-5 text-[var(--text-secondary)]" />
                                Frequently Asked Questions
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {faqItems.map((item, idx) => (
                                <div
                                    key={idx}
                                    className="flex items-center justify-between p-3 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer"
                                    onClick={() => addToast('Opening FAQ article...', 'info')}
                                >
                                    <div className="flex items-center gap-3">
                                        <FileText className="h-4 w-4 text-[var(--text-muted)]" />
                                        <span className="text-[var(--text-primary)]">{item.question}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-[var(--text-muted)]">{item.category}</span>
                                        <ChevronRight className="h-4 w-4 text-[var(--text-muted)]" />
                                    </div>
                                </div>
                            ))}
                            <Button variant="ghost" className="w-full text-[var(--primary-blue)] mt-2">
                                View All FAQs
                                <ExternalLink className="h-4 w-4 ml-2" />
                            </Button>
                        </CardContent>
                    </Card>
                </>
            )}

            {/* Tickets Tab */}
            {activeTab === 'tickets' && (
                <>
                    {/* Filter Tabs */}
                    <div className="flex items-center gap-2">
                        {(['all', 'open', 'resolved'] as const).map((filter) => (
                            <button
                                key={filter}
                                onClick={() => setTicketFilter(filter)}
                                className={cn(
                                    "px-4 py-2 text-sm font-medium rounded-full transition-all capitalize",
                                    ticketFilter === filter
                                        ? "bg-[var(--primary-blue)] text-white"
                                        : "bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-active)]"
                                )}
                            >
                                {filter}
                            </button>
                        ))}
                    </div>

                    {/* Tickets List */}
                    {isLoading ? (
                        <div className="space-y-4">
                            {[1, 2, 3].map((i) => (
                                <CardSkeleton key={i} />
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredTickets.map((ticket) => (
                                <Card
                                    key={ticket._id}
                                    className={cn(
                                        "hover:shadow-md transition-all cursor-pointer border-l-4",
                                        getPriorityColor(ticket.priority)
                                    )}
                                    onClick={() => addToast(`Opening ticket ${ticket.ticketId}...`, 'info')}
                                >
                                    <CardContent className="p-5">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-mono text-[var(--text-muted)]">{ticket.ticketId}</span>
                                                    <StatusBadge domain="support_ticket" status={ticket.status} />
                                                    <Badge variant="outline" className="text-xs capitalize">{ticket.category}</Badge>
                                                </div>
                                                <h3 className="font-medium text-[var(--text-primary)]">{ticket.subject}</h3>
                                                <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)]">
                                                    <span>Created: {new Date(ticket.createdAt).toLocaleDateString()}</span>
                                                    <Badge variant="outline" className="text-xs capitalize">{ticket.priority}</Badge>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-xs text-[var(--text-muted)]">
                                                    Updated {formatDistanceToNow(new Date(ticket.updatedAt), { addSuffix: true })}
                                                </span>
                                                <ChevronRight className="h-5 w-5 text-[var(--text-muted)]" />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}

                    {/* Empty State */}
                    {filteredTickets.length === 0 && (
                        <Card>
                            <CardContent className="py-12 text-center">
                                <MessageSquare className="h-12 w-12 text-[var(--text-muted)] mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-[var(--text-primary)]">No tickets found</h3>
                                <p className="text-[var(--text-muted)] mt-1">
                                    {ticketFilter === 'all'
                                        ? "You haven't created any support tickets yet"
                                        : `No ${ticketFilter} tickets`
                                    }
                                </p>
                                <Button className="mt-4" onClick={() => setShowNewTicket(true)}>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Create Ticket
                                </Button>
                            </CardContent>
                        </Card>
                    )}
                </>
            )}
        </div>
    );
}

