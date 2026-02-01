"use client";
export const dynamic = "force-dynamic";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/src/components/ui/core/Card';
import { Button } from '@/src/components/ui/core/Button';
import { Input } from '@/src/components/ui/core/Input';
import { Badge } from '@/src/components/ui/core/Badge';
import {
    HeadphonesIcon,
    Search,
    Filter,
    MessageSquare,
    Clock,
    CheckCircle,
    AlertCircle,
    User,
    ChevronRight,
    Send,
    Paperclip,
    X
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useToast } from '@/src/components/ui/feedback/Toast';

// Mock tickets data (Admin view)
const mockTickets = [
    {
        id: 'TKT-001',
        sellerId: 'SLR-123',
        sellerName: 'Fashion Hub India',
        subject: 'Shipment stuck in transit for 5 days',
        category: 'Shipment Issue',
        priority: 'high',
        status: 'open',
        awbNumber: 'DL123456789',
        createdAt: '2024-12-11 10:30',
        lastUpdate: '2 hours ago',
        messages: 3,
    },
    {
        id: 'TKT-002',
        sellerId: 'SLR-456',
        sellerName: 'ElectroMart',
        subject: 'COD remittance not received for Week 48',
        category: 'Payment / COD',
        priority: 'medium',
        status: 'in_progress',
        awbNumber: null,
        createdAt: '2024-12-10 14:22',
        lastUpdate: '5 hours ago',
        messages: 5,
        assignedTo: 'Support Team A',
    },
    {
        id: 'TKT-003',
        sellerId: 'SLR-789',
        sellerName: 'HomeDecor Plus',
        subject: 'Weight discrepancy dispute - AWB #XB987654321',
        category: 'Weight Discrepancy',
        priority: 'low',
        status: 'resolved',
        awbNumber: 'XB987654321',
        createdAt: '2024-12-08 09:15',
        lastUpdate: '2 days ago',
        messages: 8,
        assignedTo: 'Billing Team',
    },
    {
        id: 'TKT-004',
        sellerId: 'SLR-234',
        sellerName: 'Gadget Galaxy',
        subject: 'Unable to connect Shopify store',
        category: 'Integration Help',
        priority: 'medium',
        status: 'open',
        awbNumber: null,
        createdAt: '2024-12-11 08:45',
        lastUpdate: '4 hours ago',
        messages: 2,
    },
    {
        id: 'TKT-005',
        sellerId: 'SLR-567',
        sellerName: 'BookWorm Store',
        subject: 'Customer not receiving OTP for delivery',
        category: 'NDR Related',
        priority: 'high',
        status: 'in_progress',
        awbNumber: 'EC555666777',
        createdAt: '2024-12-09 16:30',
        lastUpdate: '1 day ago',
        messages: 6,
        assignedTo: 'NDR Team',
    },
];

const categories = ['All', 'Shipment Issue', 'Payment / COD', 'Weight Discrepancy', 'Integration Help', 'NDR Related'];
const priorities = ['all', 'high', 'medium', 'low'];
const statuses = ['all', 'open', 'in_progress', 'resolved'];

export function SupportClient() {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [selectedPriority, setSelectedPriority] = useState('all');
    const [selectedStatus, setSelectedStatus] = useState('all');
    const [selectedTicket, setSelectedTicket] = useState<typeof mockTickets[0] | null>(null);
    const { addToast } = useToast();

    const filteredTickets = mockTickets.filter(ticket => {
        const matchesSearch = ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
            ticket.sellerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            ticket.id.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === 'All' || ticket.category === selectedCategory;
        const matchesPriority = selectedPriority === 'all' || ticket.priority === selectedPriority;
        const matchesStatus = selectedStatus === 'all' || ticket.status === selectedStatus;
        return matchesSearch && matchesCategory && matchesPriority && matchesStatus;
    });

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'open':
                return <Badge variant="warning" className="gap-1"><AlertCircle className="h-3 w-3" />Open</Badge>;
            case 'in_progress':
                return <Badge variant="info" className="gap-1"><Clock className="h-3 w-3" />In Progress</Badge>;
            case 'resolved':
                return <Badge variant="success" className="gap-1"><CheckCircle className="h-3 w-3" />Resolved</Badge>;
            default:
                return <Badge variant="neutral">{status}</Badge>;
        }
    };

    const getPriorityBadge = (priority: string) => {
        switch (priority) {
            case 'high':
                return <Badge className="bg-[var(--error-bg)] text-[var(--error)] border-none">High</Badge>;
            case 'medium':
                return <Badge className="bg-[var(--warning-bg)] text-[var(--warning)] border-none">Medium</Badge>;
            case 'low':
                return <Badge className="bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-none">Low</Badge>;
            default:
                return null;
        }
    };

    const openTickets = mockTickets.filter(t => t.status === 'open').length;
    const inProgressTickets = mockTickets.filter(t => t.status === 'in_progress').length;
    const highPriorityTickets = mockTickets.filter(t => t.priority === 'high' && t.status !== 'resolved').length;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2 text-[var(--text-primary)]">
                        <HeadphonesIcon className="h-6 w-6 text-[var(--primary-blue)]" />
                        Support Tickets
                    </h1>
                    <p className="text-sm mt-1 text-[var(--text-secondary)]">
                        Manage and respond to seller support requests
                    </p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-[var(--text-secondary)]">Total Tickets</p>
                                <p className="text-2xl font-bold text-[var(--text-primary)]">{mockTickets.length}</p>
                            </div>
                            <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-[var(--primary-blue-soft)]">
                                <MessageSquare className="h-5 w-5 text-[var(--primary-blue)]" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-[var(--text-secondary)]">Open</p>
                                <p className="text-2xl font-bold text-[var(--warning)]">{openTickets}</p>
                            </div>
                            <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-[var(--warning-bg)]">
                                <AlertCircle className="h-5 w-5 text-[var(--warning)]" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-[var(--text-secondary)]">In Progress</p>
                                <p className="text-2xl font-bold text-[var(--info)]">{inProgressTickets}</p>
                            </div>
                            <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-[var(--info-bg)]">
                                <Clock className="h-5 w-5 text-[var(--info)]" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-[var(--text-secondary)]">High Priority</p>
                                <p className="text-2xl font-bold text-[var(--error)]">{highPriorityTickets}</p>
                            </div>
                            <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-[var(--error-bg)]">
                                <AlertCircle className="h-5 w-5 text-[var(--error)]" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex flex-col lg:flex-row gap-4">
                        <div className="flex-1">
                            <Input
                                placeholder="Search tickets..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                icon={<Search className="h-4 w-4" />}
                            />
                        </div>

                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="h-10 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary-blue)]"
                        >
                            {categories.map((c) => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>

                        <select
                            value={selectedPriority}
                            onChange={(e) => setSelectedPriority(e.target.value)}
                            className="h-10 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary-blue)] capitalize"
                        >
                            <option value="all">All Priorities</option>
                            <option value="high">High</option>
                            <option value="medium">Medium</option>
                            <option value="low">Low</option>
                        </select>

                        <div className="flex gap-2">
                            {statuses.map((status) => (
                                <button
                                    key={status}
                                    onClick={() => setSelectedStatus(status)}
                                    className="px-3 py-1.5 text-sm font-medium rounded-full transition-all capitalize whitespace-nowrap"
                                    style={{
                                        background: selectedStatus === status ? 'var(--primary-blue)' : 'var(--bg-secondary)',
                                        color: selectedStatus === status ? 'var(--text-inverse)' : 'var(--text-secondary)'
                                    }}
                                >
                                    {status === 'in_progress' ? 'In Progress' : status}
                                </button>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Tickets List */}
            <div className="grid gap-4">
                {filteredTickets.map((ticket) => (
                    <Card
                        key={ticket.id}
                        className={cn(
                            "hover:shadow-lg transition-all cursor-pointer border-l-4",
                            ticket.priority === 'high' && "border-l-[var(--error)]",
                            ticket.priority === 'medium' && "border-l-[var(--warning)]",
                            ticket.priority === 'low' && "border-l-[var(--border-subtle)]"
                        )}
                        onClick={() => setSelectedTicket(ticket)}
                    >
                        <CardContent className="p-5">
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                <div className="flex-1 space-y-2">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <code className="text-xs font-mono text-[var(--text-muted)]">{ticket.id}</code>
                                        {getStatusBadge(ticket.status)}
                                        {getPriorityBadge(ticket.priority)}
                                        <Badge variant="neutral" className="text-xs">{ticket.category}</Badge>
                                    </div>
                                    <h3 className="font-medium text-[var(--text-primary)]">{ticket.subject}</h3>
                                    <div className="flex items-center gap-4 text-sm text-[var(--text-muted)]">
                                        <span className="flex items-center gap-1">
                                            <User className="h-3.5 w-3.5" />
                                            {ticket.sellerName}
                                        </span>
                                        {ticket.awbNumber && (
                                            <span className="bg-[var(--bg-tertiary)] px-2 py-0.5 rounded text-xs">
                                                AWB: {ticket.awbNumber}
                                            </span>
                                        )}
                                        <span className="flex items-center gap-1">
                                            <MessageSquare className="h-3.5 w-3.5" />
                                            {ticket.messages} messages
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-right">
                                        <p className="text-xs text-[var(--text-muted)]">Created: {ticket.createdAt}</p>
                                        <p className="text-xs text-[var(--text-muted)]">Updated {ticket.lastUpdate}</p>
                                        {ticket.assignedTo && (
                                            <p className="text-xs text-[var(--primary-blue)] mt-1">Assigned: {ticket.assignedTo}</p>
                                        )}
                                    </div>
                                    <ChevronRight className="h-5 w-5 text-[var(--text-muted)]" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Ticket Detail Modal */}
            {selectedTicket && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-20 px-4">
                    <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
                        <CardHeader className="flex flex-row items-start justify-between sticky top-0 bg-[var(--bg-primary)] z-10 border-b">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <code className="text-xs font-mono text-[var(--text-muted)]">{selectedTicket.id}</code>
                                    {getStatusBadge(selectedTicket.status)}
                                </div>
                                <CardTitle className="text-lg">{selectedTicket.subject}</CardTitle>
                                <CardDescription>
                                    {selectedTicket.sellerName} • {selectedTicket.category}
                                </CardDescription>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => setSelectedTicket(null)}>
                                <X className="h-5 w-5" />
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-4">
                            {/* Mock conversation */}
                            <div className="space-y-4">
                                <div className="bg-[var(--bg-secondary)] rounded-lg p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="h-8 w-8 rounded-full bg-[var(--primary-blue)] flex items-center justify-center text-white text-xs font-bold">
                                            FH
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium">{selectedTicket.sellerName}</p>
                                            <p className="text-xs text-[var(--text-muted)]">{selectedTicket.createdAt}</p>
                                        </div>
                                    </div>
                                    <p className="text-sm text-[var(--text-secondary)]">
                                        Hi, my shipment with AWB {selectedTicket.awbNumber || 'N/A'} has been stuck for several days.
                                        Can you please check the status and provide an update?
                                    </p>
                                </div>

                                <div className="bg-[var(--primary-blue-soft)] rounded-lg p-4 ml-8">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="h-8 w-8 rounded-full bg-[var(--success)] flex items-center justify-center text-white text-xs font-bold">
                                            SC
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium">Shipcrowd Support</p>
                                            <p className="text-xs text-[var(--text-muted)]">2 hours ago</p>
                                        </div>
                                    </div>
                                    <p className="text-sm text-[var(--text-secondary)]">
                                        Thank you for reaching out. We've escalated this to the courier partner and are awaiting their response.
                                        We'll update you within 24 hours.
                                    </p>
                                </div>
                            </div>

                            {/* Reply Box */}
                            <div className="border-t pt-4">
                                <div className="flex gap-2">
                                    <textarea
                                        className="flex-1 min-h-[80px] rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3 py-2 text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--primary-blue)] resize-none"
                                        placeholder="Type your reply..."
                                    />
                                </div>
                                <div className="flex items-center justify-between mt-3">
                                    <Button variant="ghost" size="sm">
                                        <Paperclip className="h-4 w-4 mr-1" />
                                        Attach
                                    </Button>
                                    <div className="flex gap-2">
                                        <select className="h-9 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary-blue)]">
                                            <option>Change Status</option>
                                            <option value="in_progress">Mark In Progress</option>
                                            <option value="resolved">Mark Resolved</option>
                                        </select>
                                        <Button onClick={() => {
                                            addToast('Reply sent!', 'success');
                                            setSelectedTicket(null);
                                        }}>
                                            <Send className="h-4 w-4 mr-2" />
                                            Send Reply
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Empty State */}
            {filteredTickets.length === 0 && (
                <Card>
                    <CardContent className="py-12 text-center">
                        <HeadphonesIcon className="h-12 w-12 mx-auto mb-4 text-[var(--text-muted)]" />
                        <h3 className="text-lg font-medium text-[var(--text-primary)]">No tickets found</h3>
                        <p className="mt-1 text-[var(--text-secondary)]">Try adjusting your filters</p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
