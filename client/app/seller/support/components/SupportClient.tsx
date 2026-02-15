'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    Button,
    Input,
    Badge,
    CardSkeleton,
    Loader,
    PageHeader,
    PillTabs,
    Select,
    Textarea,
    Label,
    EmptyState,
    SearchInput,
    Modal,
} from '@/src/components/ui';
import { StatsCard } from '@/src/components/ui/dashboard/StatsCard';
import {
    HelpCircle,
    MessageSquare,
    Phone,
    Mail,
    ChevronDown,
    ChevronRight,
    Plus,
    X,
    Send,
    Paperclip,
} from 'lucide-react';
import { StatusBadge } from '@/src/components/ui/data/StatusBadge';
import { cn } from '@/src/lib/utils';
import {
    useSupportTickets,
    useCreateSupportTicket,
    useSupportTicket,
    useAddSupportTicketNote,
    uploadSupportAttachments,
} from '@/src/core/api/hooks/support/useSupport';
import { useToast } from '@/src/components/ui/feedback/Toast';
import { handleApiError } from '@/src/lib/error';
import { formatDistanceToNow } from 'date-fns';
import type { CreateTicketPayload } from '@/src/types/domain/support';

const MAX_ATTACHMENTS = 5;
const MAX_FILE_SIZE_MB = 5;
const ACCEPTED_TYPES = '.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp,.txt,.csv';

/* -----------------------------------------------------------------------------
 * NewTicketForm - Isolated form state prevents SupportClient re-renders on
 * every keystroke, which was causing inputs to lose focus (React unmount/remount).
 * ----------------------------------------------------------------------------- */
function NewTicketForm({
    onSubmit,
    onCancel,
    isPending,
}: {
    onSubmit: (payload: CreateTicketPayload) => Promise<void>;
    onCancel: () => void;
    isPending: boolean;
}) {
    const { addToast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [form, setForm] = useState({
        subject: '',
        category: '',
        priority: 'medium',
        description: '',
    });
    const [attachments, setAttachments] = useState<File[]>([]);
    const [isUploading, setIsUploading] = useState(false);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        const valid: File[] = [];
        for (const f of files) {
            if (f.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
                addToast(`"${f.name}" exceeds ${MAX_FILE_SIZE_MB}MB. Skipped.`, 'error');
                continue;
            }
            valid.push(f);
        }
        setAttachments((prev) => {
            const combined = [...prev, ...valid].slice(0, MAX_ATTACHMENTS);
            if (combined.length > MAX_ATTACHMENTS) {
                addToast(`Maximum ${MAX_ATTACHMENTS} files allowed.`, 'warning');
            }
            return combined;
        });
        e.target.value = '';
    };

    const removeAttachment = (index: number) => {
        setAttachments((prev) => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        if (!form.subject || !form.category || !form.description) return;
        try {
            setIsUploading(true);
            let attachmentUrls: string[] = [];
            if (attachments.length > 0) {
                try {
                    attachmentUrls = await uploadSupportAttachments(attachments);
                } catch (err) {
                    handleApiError(err, 'Failed to upload attachments');
                    setIsUploading(false);
                    return;
                }
            }
            await onSubmit({
                subject: form.subject,
                category: form.category,
                priority: form.priority as 'low' | 'medium' | 'high' | 'critical',
                description: form.description,
                attachments: attachmentUrls.length > 0 ? attachmentUrls : undefined,
            });
            setForm({ subject: '', category: '', priority: 'medium', description: '' });
            setAttachments([]);
        } finally {
            setIsUploading(false);
        }
    };

    const handleAttachClick = () => fileInputRef.current?.click();

    const isSubmitting = isPending || isUploading;

    return (
        <div className="space-y-4">
            <p className="text-sm text-[var(--text-secondary)] -mt-2">
                Describe your issue and we&apos;ll get back to you shortly
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="category">Issue Category *</Label>
                    <Select
                        id="category"
                        value={form.category}
                        onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                        options={CATEGORY_OPTIONS}
                        className="w-full"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="priority">Priority</Label>
                    <Select
                        id="priority"
                        value={form.priority}
                        onChange={(e) => setForm((prev) => ({ ...prev, priority: e.target.value }))}
                        options={PRIORITY_OPTIONS}
                        className="w-full"
                    />
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="subject">Subject *</Label>
                <Input
                    id="subject"
                    placeholder="Brief description of your issue"
                    value={form.subject}
                    onChange={(e) => setForm((prev) => ({ ...prev, subject: e.target.value }))}
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                    id="description"
                    value={form.description}
                    onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Provide detailed information about your issue..."
                    className="min-h-[120px] resize-none"
                />
            </div>

            <div className="space-y-2">
                <input
                    ref={fileInputRef}
                    type="file"
                    accept={ACCEPTED_TYPES}
                    multiple
                    className="sr-only"
                    onChange={handleFileSelect}
                    aria-label="Attach files"
                />
                <div
                    role="button"
                    tabIndex={0}
                    onClick={handleAttachClick}
                    onKeyDown={(e) => e.key === 'Enter' && handleAttachClick()}
                    className="border-2 border-dashed border-[var(--border-subtle)] rounded-[var(--radius-lg)] p-4 text-center hover:border-[var(--primary-blue)]/50 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-blue)] focus-visible:ring-offset-2"
                >
                    <Paperclip className="h-5 w-5 text-[var(--text-muted)] mx-auto mb-1" />
                    <p className="text-sm text-[var(--text-muted)]">Click to attach files (optional)</p>
                    <p className="text-xs text-[var(--text-muted)]">Max {MAX_FILE_SIZE_MB}MB per file • PDF, images, docs</p>
                </div>
                {attachments.length > 0 && (
                    <ul className="space-y-1">
                        {attachments.map((f, i) => (
                            <li
                                key={`${f.name}-${i}`}
                                className="flex items-center justify-between text-sm py-2 px-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)]"
                            >
                                <span className="truncate text-[var(--text-primary)]">{f.name}</span>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 shrink-0"
                                    onClick={() => removeAttachment(i)}
                                    aria-label={`Remove ${f.name}`}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t border-[var(--border-subtle)]">
                <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
                    Cancel
                </Button>
                <Button
                    disabled={isSubmitting || !form.subject || !form.category || !form.description}
                    isLoading={isSubmitting}
                    onClick={handleSubmit}
                >
                    <Send className="h-4 w-4 mr-2" />
                    {isUploading ? 'Uploading...' : 'Submit Ticket'}
                </Button>
            </div>
        </div>
    );
}

/* -----------------------------------------------------------------------------
 * FAQHelpSection - Isolated search state prevents SupportClient re-renders when
 * typing in SearchInput, which was causing the input to lose focus.
 * Contains both search and FAQ list so only this component re-renders on keystroke.
 * ----------------------------------------------------------------------------- */
function FAQHelpSection() {
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

    const filteredFaqs = FAQ_ITEMS.filter(
        (item) =>
            !searchQuery ||
            item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.answer.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <>
            <section
                role="search"
                aria-label="Search help articles"
                className="space-y-2 max-w-md"
            >
                <label htmlFor="faq-search" className="sr-only">
                    Search help articles and FAQs
                </label>
                <SearchInput
                    id="faq-search"
                    placeholder="Search FAQs…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    widthClass="w-full"
                    aria-label="Search help articles and FAQs"
                    aria-describedby={searchQuery ? 'faq-results-count' : undefined}
                    autoComplete="off"
                />
                {searchQuery && (
                    <p
                        id="faq-results-count"
                        className="text-sm text-[var(--text-muted)]"
                        aria-live="polite"
                    >
                        {filteredFaqs.length} result{filteredFaqs.length !== 1 ? 's' : ''}
                    </p>
                )}
            </section>

            <section aria-labelledby="quick-contact-heading">
                <h2
                    id="quick-contact-heading"
                    className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-4"
                >
                    Quick Contact
                </h2>
                <div className="grid gap-4 md:grid-cols-3">
                    <StatsCard
                        title="WhatsApp"
                        value="Quick chat support"
                        icon={MessageSquare}
                        variant="success"
                        description="● Online now"
                        onClick={() => window.open('https://wa.me/919876543210', '_blank')}
                        delay={0}
                    />
                    <StatsCard
                        title="Call Us"
                        value="1800-123-4567"
                        icon={Phone}
                        variant="info"
                        description="Mon-Sat, 9AM-6PM"
                        onClick={() => window.open('tel:+911800123456', '_self')}
                        delay={1}
                    />
                    <StatsCard
                        title="Email Support"
                        value="support@shipcrowd.in"
                        icon={Mail}
                        variant="default"
                        description="Response within 24hrs"
                        onClick={() =>
                            window.open('mailto:support@shipcrowd.in?subject=Support Request', '_self')
                        }
                        delay={2}
                    />
                </div>
            </section>

            <section aria-labelledby="faq-heading">
                <Card className="border border-[var(--border-subtle)] overflow-hidden">
                    <CardHeader className="pb-4">
                        <CardTitle
                            id="faq-heading"
                            className="flex items-center gap-2 text-lg font-semibold text-[var(--text-primary)]"
                        >
                            <HelpCircle className="h-5 w-5 text-[var(--text-muted)]" aria-hidden />
                            Frequently Asked Questions
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                        {filteredFaqs.length === 0 ? (
                            <EmptyState
                                variant="search"
                                title="No FAQs found"
                                description="Try different keywords like shipments, COD, or tracking."
                            />
                        ) : (
                            <ul className="space-y-1" role="list">
                                {filteredFaqs.map((item, idx) => {
                                    const isExpanded = expandedFaq === idx;
                                    const triggerId = `faq-trigger-${idx}`;
                                    const panelId = `faq-panel-${idx}`;
                                    return (
                                        <li
                                            key={`${item.question}-${idx}`}
                                            className="rounded-xl border border-[var(--border-subtle)] overflow-hidden transition-colors hover:border-[var(--border-default)]"
                                        >
                                            <button
                                                id={triggerId}
                                                type="button"
                                                aria-expanded={isExpanded}
                                                aria-controls={panelId}
                                                onClick={() =>
                                                    setExpandedFaq(isExpanded ? null : idx)
                                                }
                                                className={cn(
                                                    'w-full flex items-start gap-4 p-4 text-left',
                                                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-blue)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-primary)]',
                                                    'transition-colors duration-[var(--duration-fast)]',
                                                    isExpanded
                                                        ? 'bg-[var(--bg-secondary)]'
                                                        : 'bg-[var(--bg-primary)] hover:bg-[var(--bg-secondary)]'
                                                )}
                                            >
                                                <span className="flex-1 min-w-0">
                                                    <span className="block font-medium text-[var(--text-primary)]">
                                                        {item.question}
                                                    </span>
                                                    <span className="mt-1 block text-xs text-[var(--text-muted)]">
                                                        {item.category}
                                                    </span>
                                                </span>
                                                <span
                                                    className={cn(
                                                        'shrink-0 w-8 h-8 rounded-lg flex items-center justify-center',
                                                        'bg-[var(--bg-tertiary)] text-[var(--text-muted)]',
                                                        'transition-transform duration-[var(--duration-base)]',
                                                        isExpanded && 'rotate-180'
                                                    )}
                                                    aria-hidden
                                                >
                                                    <ChevronDown className="h-4 w-4" />
                                                </span>
                                            </button>
                                            <AnimatePresence initial={false}>
                                                {isExpanded && (
                                                    <motion.div
                                                        id={panelId}
                                                        role="region"
                                                        aria-labelledby={triggerId}
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{
                                                            height: 'auto',
                                                            opacity: 1,
                                                            transition: {
                                                                height: {
                                                                    duration: 0.25,
                                                                    ease: [0.4, 0, 0.2, 1],
                                                                },
                                                                opacity: {
                                                                    duration: 0.2,
                                                                    delay: 0.05,
                                                                },
                                                            },
                                                        }}
                                                        exit={{
                                                            height: 0,
                                                            opacity: 0,
                                                            transition: {
                                                                height: {
                                                                    duration: 0.2,
                                                                    ease: [0.4, 0, 0.2, 1],
                                                                },
                                                                opacity: { duration: 0.15 },
                                                            },
                                                        }}
                                                        className="overflow-hidden"
                                                    >
                                                        <div className="px-4 pb-4 pt-0">
                                                            <p className="text-sm text-[var(--text-secondary)] leading-relaxed pl-0">
                                                                {item.answer}
                                                            </p>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </CardContent>
                </Card>
            </section>
        </>
    );
}

/* -----------------------------------------------------------------------------
 * TicketReplyForm - Isolated reply state prevents SupportClient re-renders
 * when typing in the reply textarea, which was causing focus loss.
 * ----------------------------------------------------------------------------- */
function TicketReplyForm({
    ticketId,
    onReplySent,
}: {
    ticketId: string;
    onReplySent: () => void;
}) {
    const [replyMessage, setReplyMessage] = useState('');
    const addNoteMutation = useAddSupportTicketNote(ticketId);

    const handleSend = () => {
        if (!replyMessage.trim()) return;
        addNoteMutation.mutate(
            { message: replyMessage, type: 'reply' },
            {
                onSuccess: () => {
                    setReplyMessage('');
                    onReplySent();
                },
            }
        );
    };

    return (
        <div className="p-6 border-t border-[var(--border-subtle)] bg-[var(--bg-primary)]">
            <div className="space-y-4">
                <Textarea
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    placeholder="Type your reply here..."
                    className="h-32 resize-none"
                />
                <div className="flex justify-between items-center">
                    <p className="text-xs text-[var(--text-muted)]">
                        Your message will be sent to the support team
                    </p>
                    <Button
                        onClick={handleSend}
                        disabled={!replyMessage.trim() || addNoteMutation.isPending}
                        isLoading={addNoteMutation.isPending}
                    >
                        <Send className="h-4 w-4 mr-2" />
                        Send Reply
                    </Button>
                </div>
            </div>
        </div>
    );
}

const SUPPORT_TABS = [
    { key: 'help', label: 'Help Center' },
    { key: 'tickets', label: 'My Tickets' },
] as const;

const TICKET_FILTER_TABS = [
    { key: 'all', label: 'All' },
    { key: 'open', label: 'Open' },
    { key: 'resolved', label: 'Resolved' },
] as const;

const CATEGORY_OPTIONS = [
    { value: '', label: 'Select category' },
    { value: 'technical', label: 'Technical Issue' },
    { value: 'billing', label: 'Billing / Payment' },
    { value: 'logistics', label: 'Logistics / Shipment' },
    { value: 'other', label: 'Other' },
];

const PRIORITY_OPTIONS = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'critical', label: 'Critical' },
];

const FAQ_ITEMS = [
    {
        question: 'How do I create a shipment?',
        category: 'Shipments',
        answer:
            'Go to Orders, select an order, and click "Ship Now". Choose a courier and confirm the shipment details. You can also create bulk shipments by uploading a CSV file.',
    },
    {
        question: 'What are the accepted weight and dimension limits?',
        category: 'Shipments',
        answer:
            'Standard parcels can weigh up to 25 kg. Maximum dimensions are 100cm x 75cm x 75cm. For heavier items or special requirements, please contact our support team.',
    },
    {
        question: 'How does COD remittance work?',
        category: 'Payments',
        answer:
            'COD amounts are collected by the courier partner on delivery. Remittance is processed within 3-5 business days after delivery confirmation to your registered bank account.',
    },
    {
        question: 'How to connect my Shopify or WooCommerce store?',
        category: 'Integrations',
        answer:
            'Navigate to Settings > Integrations, select your e-commerce platform, and follow the authentication steps to securely connect your store. Orders will sync automatically once connected.',
    },
    {
        question: 'What is NDR and how do I handle it?',
        category: 'NDR',
        answer:
            'NDR (Non-Delivery Report) is raised when a delivery attempt fails. Go to the NDR section, review the reason (wrong address, customer unavailable, etc.), and take action to reschedule, update the address, or process RTO.',
    },
    {
        question: 'How do I track my shipments?',
        category: 'Tracking',
        answer:
            'Use the Tracking page to search by AWB number or order ID. You can also click on any shipment in the Shipments page to see real-time status updates and delivery timeline.',
    },
];

function getPriorityBorderColor(priority: string): string {
    switch (priority) {
        case 'high':
            return 'border-l-[var(--error)]';
        case 'critical':
            return 'border-l-[var(--error)]';
        case 'medium':
            return 'border-l-[var(--warning)]';
        case 'low':
            return 'border-l-[var(--success)]';
        default:
            return 'border-l-[var(--border-subtle)]';
    }
}

export function SupportClient() {
    const [activeTab, setActiveTab] = useState<'help' | 'tickets'>('help');
    const [showNewTicket, setShowNewTicket] = useState(false);
    const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
    const [ticketFilter, setTicketFilter] = useState<'all' | 'open' | 'resolved'>('all');

    const statusParam =
        ticketFilter === 'all'
            ? undefined
            : ticketFilter === 'open'
              ? 'open,in_progress'
              : 'resolved,closed';

    const { data: ticketsData, isLoading } = useSupportTickets(
        {
            status: statusParam,
            page: 1,
            limit: 20,
        },
        { enabled: activeTab === 'tickets' }
    );
    const createTicket = useCreateSupportTicket();
    const { data: selectedTicket, isLoading: isTicketDetailLoading } = useSupportTicket(
        selectedTicketId || '',
        { enabled: !!selectedTicketId }
    );

    const tickets = ticketsData?.tickets || [];

    const handleCreateTicket = useCallback(
        async (payload: CreateTicketPayload) => {
            await createTicket.mutateAsync(payload);
            setShowNewTicket(false);
            setActiveTab('tickets');
        },
        [createTicket]
    );

    // Escape key and body scroll lock for ticket detail panel
    useEffect(() => {
        if (!selectedTicketId) return;
        document.body.style.overflow = 'hidden';
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setSelectedTicketId(null);
        };
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.body.style.overflow = 'unset';
            document.removeEventListener('keydown', handleEscape);
        };
    }, [selectedTicketId]);

    return (
        <div className="min-h-screen space-y-8 pb-20 animate-fade-in">
            <PageHeader
                title="Help & Support"
                description="Get help or manage your support tickets"
                breadcrumbs={[
                    { label: 'Dashboard', href: '/seller/dashboard' },
                    { label: 'Help & Support', active: true },
                ]}
                backUrl="/seller"
                actions={
                    <div className="flex flex-wrap items-center gap-3">
                        <PillTabs
                            tabs={SUPPORT_TABS}
                            activeTab={activeTab}
                            onTabChange={(k) => setActiveTab(k as 'help' | 'tickets')}
                        />
                        <Button onClick={() => setShowNewTicket(true)} size="sm">
                            <Plus className="h-4 w-4 mr-2" />
                            New Ticket
                        </Button>
                    </div>
                }
            />

            {/* New Ticket Modal - Form state isolated to prevent focus loss on keystroke */}
            <Modal
                isOpen={showNewTicket}
                onClose={() => setShowNewTicket(false)}
                title="Create Support Ticket"
                size="lg"
            >
                <NewTicketForm
                    onSubmit={handleCreateTicket}
                    onCancel={() => setShowNewTicket(false)}
                    isPending={createTicket.isPending}
                />
            </Modal>

            {/* Help Center Tab - Search/FAQ state isolated to prevent focus loss */}
            {activeTab === 'help' && <FAQHelpSection />}

            {/* Tickets Tab */}
            {activeTab === 'tickets' && (
                <>
                    <div className="flex items-center gap-2">
                        <PillTabs
                            tabs={TICKET_FILTER_TABS}
                            activeTab={ticketFilter}
                            onTabChange={(k) =>
                                setTicketFilter(k as 'all' | 'open' | 'resolved')
                            }
                        />
                    </div>

                    {isLoading ? (
                        <div className="space-y-4">
                            {[1, 2, 3].map((i) => (
                                <CardSkeleton key={i} />
                            ))}
                        </div>
                    ) : tickets.length > 0 ? (
                        <div className="space-y-4">
                            {tickets.map((ticket) => (
                                <Card
                                    key={ticket._id}
                                    className={cn(
                                        'hover:shadow-md transition-all cursor-pointer border-l-4 border border-[var(--border-subtle)]',
                                        getPriorityBorderColor(ticket.priority)
                                    )}
                                    onClick={() => setSelectedTicketId(ticket._id)}
                                >
                                    <CardContent className="p-5">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-mono text-[var(--text-muted)]">
                                                        {ticket.ticketId}
                                                    </span>
                                                    <StatusBadge
                                                        domain="support_ticket"
                                                        status={ticket.status}
                                                        size="sm"
                                                    />
                                                    <Badge
                                                        variant="outline"
                                                        className="text-xs capitalize"
                                                    >
                                                        {ticket.category}
                                                    </Badge>
                                                </div>
                                                <h3 className="font-medium text-[var(--text-primary)]">
                                                    {ticket.subject}
                                                </h3>
                                                <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)]">
                                                    <span>
                                                        Created:{' '}
                                                        {new Date(ticket.createdAt).toLocaleDateString()}
                                                    </span>
                                                    <Badge
                                                        variant="outline"
                                                        className="text-xs capitalize"
                                                    >
                                                        {ticket.priority}
                                                    </Badge>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-xs text-[var(--text-muted)]">
                                                    Updated{' '}
                                                    {formatDistanceToNow(new Date(ticket.updatedAt), {
                                                        addSuffix: true,
                                                    })}
                                                </span>
                                                <ChevronRight className="h-5 w-5 text-[var(--text-muted)]" />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <Card className="border border-[var(--border-subtle)]">
                            <CardContent className="py-12">
                                <EmptyState
                                    variant="noItems"
                                    title="No tickets found"
                                    description={
                                        ticketFilter === 'all'
                                            ? "You haven't created any support tickets yet"
                                            : `No ${ticketFilter} tickets`
                                    }
                                    action={{
                                        label: 'Create Ticket',
                                        onClick: () => setShowNewTicket(true),
                                        variant: 'primary',
                                        icon: <Plus className="h-4 w-4" />,
                                    }}
                                />
                            </CardContent>
                        </Card>
                    )}
                </>
            )}

            {/* Ticket Detail Slide-in Panel (matches OrderDetailsPanel pattern) */}
            {selectedTicketId && (
                <div
                    className="fixed inset-0 flex items-center justify-end bg-black/40 backdrop-blur-sm"
                    style={{ zIndex: 'var(--z-modal)' }}
                    onClick={() => setSelectedTicketId(null)}
                    role="dialog"
                    aria-modal="true"
                    aria-label="Ticket details"
                >
                    <div
                        className="w-full max-w-2xl h-full bg-[var(--bg-primary)] flex flex-col border-l border-[var(--border-subtle)] animate-in slide-in-from-right duration-300"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-6 border-b border-[var(--border-subtle)] flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-bold text-[var(--text-primary)]">
                                    {isTicketDetailLoading
                                        ? 'Loading...'
                                        : `Ticket #${selectedTicket?.ticketId}`}
                                </h2>
                                <p className="text-sm text-[var(--text-muted)] mt-1 flex items-center gap-2">
                                    {selectedTicket?.category && (
                                        <Badge
                                            variant="outline"
                                            className="text-xs capitalize"
                                        >
                                            {selectedTicket.category}
                                        </Badge>
                                    )}
                                    {selectedTicket && (
                                        <StatusBadge
                                            domain="support_ticket"
                                            status={selectedTicket.status}
                                            size="sm"
                                        />
                                    )}
                                </p>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedTicketId(null)}
                                aria-label="Close ticket"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {isTicketDetailLoading ? (
                                <div className="flex justify-center py-12">
                                    <Loader />
                                </div>
                            ) : selectedTicket ? (
                                <>
                                    <div className="grid grid-cols-2 gap-4 text-sm pb-4 border-b border-[var(--border-subtle)]">
                                        <div>
                                            <p className="text-[var(--text-muted)] mb-1">Priority</p>
                                            <StatusBadge
                                                domain="support_priority"
                                                status={selectedTicket.priority}
                                            />
                                        </div>
                                        <div>
                                            <p className="text-[var(--text-muted)] mb-1">Created</p>
                                            <p className="text-[var(--text-primary)]">
                                                {new Date(selectedTicket.createdAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex gap-3">
                                            <div className="w-8 h-8 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center text-xs font-bold flex-shrink-0">
                                                {typeof selectedTicket.userId === 'object' &&
                                                selectedTicket.userId?.firstName
                                                    ? `${selectedTicket.userId.firstName[0]}${(selectedTicket.userId.lastName?.[0] || '')}`.toUpperCase()
                                                    : 'ME'}
                                            </div>
                                            <div className="flex-1 space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold text-[var(--text-primary)]">
                                                        You
                                                    </span>
                                                    <span className="text-xs text-[var(--text-muted)]">
                                                        {formatDistanceToNow(
                                                            new Date(selectedTicket.createdAt),
                                                            { addSuffix: true }
                                                        )}
                                                    </span>
                                                </div>
                                                <div className="bg-[var(--bg-secondary)] p-4 rounded-xl">
                                                    <p className="font-semibold text-[var(--text-primary)] mb-2">
                                                        {selectedTicket.subject}
                                                    </p>
                                                    <p className="text-sm text-[var(--text-secondary)]">
                                                        {selectedTicket.description}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {selectedTicket.notes && selectedTicket.notes.length > 0 && (
                                        <div className="space-y-4">
                                            {selectedTicket.notes.map((note: any, idx: number) => (
                                                <div
                                                    key={note.id || idx}
                                                    className="flex gap-3"
                                                >
                                                    <div
                                                        className={cn(
                                                            'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
                                                            note.type === 'reply'
                                                                ? 'bg-[var(--primary-blue)] text-white'
                                                                : 'bg-[var(--bg-tertiary)]'
                                                        )}
                                                    >
                                                        {note.type === 'reply' ? 'ME' : 'ST'}
                                                    </div>
                                                    <div className="flex-1 space-y-2">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-semibold text-[var(--text-primary)]">
                                                                {note.type === 'reply'
                                                                    ? 'You'
                                                                    : note.userName || 'Support Staff'}
                                                            </span>
                                                            <span className="text-xs text-[var(--text-muted)]">
                                                                {formatDistanceToNow(
                                                                    new Date(note.createdAt),
                                                                    { addSuffix: true }
                                                                )}
                                                            </span>
                                                        </div>
                                                        <div
                                                            className={cn(
                                                                'p-4 rounded-xl text-sm',
                                                                note.type === 'reply'
                                                                    ? 'bg-[var(--primary-blue-soft)] text-[var(--primary-blue)]'
                                                                    : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'
                                                            )}
                                                        >
                                                            <p>{note.message}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </>
                            ) : null}
                        </div>

                        {selectedTicket && selectedTicket.status !== 'closed' && selectedTicketId && (
                            <TicketReplyForm
                                ticketId={selectedTicketId}
                                onReplySent={() => {}}
                            />
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
