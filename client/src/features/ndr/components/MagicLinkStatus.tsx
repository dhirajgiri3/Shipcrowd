
import { Badge } from '@/src/components/ui/core/Badge';
import { Tooltip } from '@/src/components/ui/feedback/Tooltip';
import { Clock, Eye, CheckCircle2, Send, AlertCircle } from 'lucide-react';

interface MagicLinkStatusProps {
    sent?: boolean;
    clicked?: boolean;
    clickedAt?: string;
    responded?: boolean;
}

export const MagicLinkStatus = ({ sent, clicked, clickedAt, responded }: MagicLinkStatusProps) => {
    if (!sent) {
        return (
            <Badge variant="neutral" className="gap-1.5">
                <AlertCircle className="w-3 h-3" />
                Not Sent
            </Badge>
        );
    }

    if (responded) {
        return (
            <Tooltip content="Customer has submitted a response">
                <Badge variant="success" className="gap-1.5 cursor-help">
                    <CheckCircle2 className="w-3 h-3" />
                    Responded
                </Badge>
            </Tooltip>
        );
    }

    if (clicked) {
        // Format "clickedAt" relative time if possible, or just date
        const dateStr = clickedAt ? new Date(clickedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

        return (
            <Tooltip content={`Customer viewed link at ${dateStr}`}>
                <Badge variant="info" className="gap-1.5 cursor-help">
                    <Eye className="w-3 h-3" />
                    Viewed
                </Badge>
            </Tooltip>
        );
    }

    return (
        <Tooltip content="Link sent via WhatsApp/SMS/Email">
            <Badge variant="warning" className="gap-1.5 cursor-help">
                <Send className="w-3 h-3" />
                Sent
            </Badge>
        </Tooltip>
    );
};
