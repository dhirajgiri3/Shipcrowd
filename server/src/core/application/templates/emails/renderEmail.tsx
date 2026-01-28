import { render } from '@react-email/render';
import React from 'react';
import logger from '../../../../shared/logger/winston.logger';
import VerificationEmail, { VerificationEmailProps } from './VerificationEmail';
import PasswordResetEmail, { PasswordResetEmailProps } from './PasswordResetEmail';
import NewDeviceAlertEmail, { NewDeviceAlertEmailProps } from './NewDeviceAlertEmail';
import MagicLinkEmail, { MagicLinkEmailProps } from './MagicLinkEmail';

/**
 * Render email template using React Email
 */
export function renderEmailTemplate(template: string, data: Record<string, any>): Promise<string> {
    try {
        let component: React.ReactElement | null = null;

        switch (template) {
            case 'verification':
                component = <VerificationEmail {...(data as VerificationEmailProps)} />;
                break;
            case 'password_reset':
                component = <PasswordResetEmail {...(data as PasswordResetEmailProps)} />;
                break;
            case 'new_device_alert':
                component = <NewDeviceAlertEmail {...(data as NewDeviceAlertEmailProps)} />;
                break;
            case 'magic_link':
                component = <MagicLinkEmail {...(data as MagicLinkEmailProps)} />;
                break;
            default:
                logger.warn(`Unknown email template: ${template}`);
                return Promise.resolve(`<p>${data.message || 'No content provided'}</p>`);
        }

        // Render the React component to HTML
        return Promise.resolve(render(component, { pretty: true }));
    } catch (error) {
        logger.error(`Failed to render email template '${template}':`, error);
        return Promise.resolve(`<p>Error rendering email. Please contact support.</p>`);
    }
}
