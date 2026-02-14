/**
 * Legacy import compatibility.
 * Canonical notification template schema lives in `models/communication/notification-template.model.ts`.
 */
import NotificationTemplate from '@/infrastructure/database/mongoose/models/communication/notification-template.model';

export type NotificationChannel = 'email' | 'whatsapp' | 'sms';
export type NotificationTrigger =
  | 'ticket_created'
  | 'ticket_assigned'
  | 'ticket_status_changed'
  | 'ticket_escalated'
  | 'dispute_created'
  | 'dispute_resolved'
  | 'callback_pending'
  | 'sla_breached'
  | 'manual';

export type { INotificationTemplate } from '@/infrastructure/database/mongoose/models/communication/notification-template.model';
export default NotificationTemplate;
