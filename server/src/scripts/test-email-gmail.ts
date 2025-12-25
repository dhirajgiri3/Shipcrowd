import dotenv from 'dotenv';
import { sendEmail } from '../core/application/services/communication/email.service';
import logger from '../shared/logger/winston.logger';

// Load environment variables
dotenv.config();

/**
 * Test script to send email to Gmail address
 */
async function testEmailToGmail() {
    try {
        logger.info('Sending test email to dhirajg934@gmail.com...');

        const testResult = await sendEmail(
            'dhirajg934@gmail.com',
            '🚀 ShipCrowd - ZeptoMail Test Successful!',
            `
        <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; border-radius: 12px;">
          <div style="background: white; border-radius: 8px; padding: 30px; box-shadow: 0 10px 30px rgba(0,0,0,0.1);">
            <h1 style="color: #2525FF; margin: 0 0 20px 0; font-size: 28px;">
              🚀 ZeptoMail Integration Successful!
            </h1>
            
            <p style="color: #333; font-size: 16px; line-height: 1.6;">
              Hey Dhiraj! 👋
            </p>
            
            <p style="color: #333; font-size: 16px; line-height: 1.6;">
              Great news! Your <strong>ShipCrowd</strong> backend is now successfully configured with 
              <strong>ZeptoMail</strong> and can send transactional emails to any email address worldwide!
            </p>
            
            <div style="background: #f8f9ff; border-left: 4px solid #2525FF; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <h3 style="color: #2525FF; margin: 0 0 10px 0; font-size: 18px;">✅ What's Working:</h3>
              <ul style="color: #555; margin: 0; padding-left: 20px;">
                <li>SMTP Connection: <strong>smtp.zeptomail.in:587 (TLS)</strong></li>
                <li>Sender Domain: <strong>cyperstudio.in</strong></li>
                <li>Authentication: <strong>Verified ✓</strong></li>
                <li>Delivery Status: <strong>Active ✓</strong></li>
              </ul>
            </div>
            
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; margin: 20px 0; border-radius: 8px;">
              <h3 style="margin: 0 0 10px 0; font-size: 18px;">🎯 Next Steps:</h3>
              <ol style="margin: 0; padding-left: 20px; line-height: 1.8;">
                <li>✅ Email service fully configured</li>
                <li>✅ Can send to any email address</li>
                <li>✅ All email functions ready to use:
                  <ul style="margin-top: 5px;">
                    <li>Email verification</li>
                    <li>Password reset</li>
                    <li>Welcome emails</li>
                    <li>Shipment notifications</li>
                    <li>Team invitations</li>
                    <li>Order updates</li>
                  </ul>
                </li>
              </ol>
            </div>
            
            <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;" />
            
            <p style="color: #666; font-size: 13px; margin: 0;">
              <strong>Sent at:</strong> ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}<br>
              <strong>Service:</strong> ZeptoMail (Zoho Transactional Email)<br>
              <strong>From:</strong> ${process.env.EMAIL_FROM}<br>
              <strong>Application:</strong> ShipCrowd Backend
            </p>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
              <p style="color: #999; font-size: 12px; margin: 0; text-align: center;">
                This is a test email from your ShipCrowd application.<br>
                © 2025 ShipCrowd by Cyper Studio. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      `,
            `
        ZeptoMail Integration Successful!
        
        Hey Dhiraj!
        
        Great news! Your ShipCrowd backend is now successfully configured with ZeptoMail 
        and can send transactional emails to any email address worldwide!
        
        What's Working:
        - SMTP Connection: smtp.zeptomail.in:587 (TLS)
        - Sender Domain: cyperstudio.in
        - Authentication: Verified ✓
        - Delivery Status: Active ✓
        
        Next Steps:
        1. ✅ Email service fully configured
        2. ✅ Can send to any email address
        3. ✅ All email functions ready to use
        
        Sent at: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
        Service: ZeptoMail (Zoho Transactional Email)
        From: ${process.env.EMAIL_FROM}
        Application: ShipCrowd Backend
        
        © 2025 ShipCrowd by Cyper Studio. All rights reserved.
      `
        );

        if (testResult) {
            logger.info('✅ Email sent successfully to dhirajg934@gmail.com!');
            logger.info('📬 Please check your Gmail inbox (and spam folder just in case)');
            process.exit(0);
        } else {
            logger.error('❌ Email failed to send');
            process.exit(1);
        }
    } catch (error) {
        logger.error('❌ Error during email test:', error);
        process.exit(1);
    }
}

// Run the test
testEmailToGmail();
