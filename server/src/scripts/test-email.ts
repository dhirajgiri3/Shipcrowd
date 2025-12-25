import dotenv from 'dotenv';
import { sendEmail } from '../core/application/services/communication/email.service';
import logger from '../shared/logger/winston.logger';

// Load environment variables
dotenv.config();

/**
 * Test script to verify ZeptoMail email configuration
 * Usage: ts-node src/scripts/test-email.ts
 */
async function testEmail() {
    try {
        logger.info('Starting email test...');
        logger.info('Email Service:', process.env.EMAIL_SERVICE);
        logger.info('SMTP Host:', process.env.SMTP_HOST);
        logger.info('SMTP Port:', process.env.SMTP_PORT);
        logger.info('From Address:', process.env.EMAIL_FROM);

        const testResult = await sendEmail(
            'info@cyperstudio.in', // Replace with your test email
            'ZeptoMail Test Email - ShipCrowd',
            `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #2525FF;">ZeptoMail Test Email</h1>
          <p>Hello!</p>
          <p>This is a test email sent from <strong>ShipCrowd</strong> using ZeptoMail SMTP service.</p>
          <p>If you're receiving this email, it means the email configuration is working correctly!</p>
          <hr style="border: 1px solid #eee; margin: 20px 0;" />
          <p style="color: #666; font-size: 12px;">
            <strong>Configuration Details:</strong><br>
            SMTP Host: ${process.env.SMTP_HOST}<br>
            SMTP Port: ${process.env.SMTP_PORT}<br>
            From: ${process.env.EMAIL_FROM}<br>
            Service: ${process.env.EMAIL_SERVICE}<br>
            Sent at: ${new Date().toISOString()}
          </p>
          <p style="color: #666; font-size: 12px;">
            Best regards,<br>
            <strong>The ShipCrowd Team</strong>
          </p>
        </div>
      `,
            'ZeptoMail Test Email - If you are receiving this email, the configuration is working correctly!'
        );

        if (testResult) {
            logger.info('✅ Email sent successfully! Check your inbox at info@cyperstudio.in');
            process.exit(0);
        } else {
            logger.error('❌ Email failed to send. Check the logs above for details.');
            process.exit(1);
        }
    } catch (error) {
        logger.error('❌ Error during email test:', error);
        process.exit(1);
    }
}

// Run the test
testEmail();
