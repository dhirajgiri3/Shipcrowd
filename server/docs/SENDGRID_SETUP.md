# SendGrid Email Integration Guide

This guide explains how to set up and use SendGrid for sending emails in the Shipcrowd application.

## Setup Instructions

### 1. Create a SendGrid Account

1. Go to [SendGrid's website](https://sendgrid.com/) and sign up for an account
2. Verify your account and complete the onboarding process

### 2. Create an API Key

1. In your SendGrid dashboard, navigate to **Settings** > **API Keys**
2. Click **Create API Key**
3. Name your key (e.g., "Shipcrowd API Key")
4. Select "Full Access" or customize permissions (at minimum, you need "Mail Send" permissions)
5. Click **Create & View**
6. Copy your API key (you won't be able to see it again)

### 3. Verify a Sender Identity

1. Navigate to **Settings** > **Sender Authentication**
2. Choose either "Single Sender Verification" or "Domain Authentication" (recommended for production)
3. Follow the steps to verify your email or domain

### 4. Configure Environment Variables

Add the following variables to your `.env` file:

```
EMAIL_SERVICE=sendgrid
EMAIL_FROM=your_verified_email@example.com
EMAIL_FROM_NAME=Shipcrowd
SENDGRID_API_KEY=your_api_key_here
EMAIL_MAX_RETRY=3
EMAIL_RETRY_DELAY_MS=1000
```

### 5. (Optional) Set Up Email Templates

SendGrid's Dynamic Templates allow you to create reusable email designs with variable content.

1. In your SendGrid dashboard, navigate to **Email API** > **Dynamic Templates**
2. Click **Create a Dynamic Template**
3. Name your template and click **Create**
4. Design your template using the design editor or code editor
5. Use Handlebars syntax for dynamic content (e.g., `{{name}}`, `{{verification_url}}`)
6. Save your template and copy the Template ID
7. Add the Template ID to your `.env` file:

```
SENDGRID_VERIFICATION_TEMPLATE_ID=d-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SENDGRID_PASSWORD_RESET_TEMPLATE_ID=d-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SENDGRID_WELCOME_TEMPLATE_ID=d-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SENDGRID_SHIPMENT_STATUS_TEMPLATE_ID=d-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## Usage Examples

### Basic Email

```typescript
import emailService from '../services/email.service';

// Send a simple email
await emailService.sendEmail(
  'recipient@example.com',
  'Hello from Shipcrowd',
  '<h1>Welcome!</h1><p>This is an HTML email.</p>'
);
```

### Email with Attachments

```typescript
import emailService from '../services/email.service';
import fs from 'fs';

// Read a file for attachment
const attachment = {
  content: fs.readFileSync('invoice.pdf').toString('base64'),
  filename: 'invoice.pdf',
  mimetype: 'application/pdf',
};

// Send email with attachment
await emailService.sendEmail(
  'recipient@example.com',
  'Your Invoice',
  '<h1>Invoice Attached</h1><p>Please find your invoice attached.</p>',
  undefined, // text version (optional)
  [attachment] // attachments
);
```

### Using Templates

```typescript
import emailService from '../services/email.service';

// Send email using a template
await emailService.sendEmail(
  'recipient@example.com',
  'Welcome to Shipcrowd',
  '', // HTML is not needed when using a template
  '', // Text is not needed when using a template
  undefined, // No attachments
  process.env.SENDGRID_WELCOME_TEMPLATE_ID,
  {
    name: 'John Doe',
    signup_date: new Date().toLocaleDateString(),
  }
);
```

### Sending to Multiple Recipients

```typescript
import emailService from '../services/email.service';

// Send to multiple recipients
await emailService.sendEmail(
  ['recipient1@example.com', 'recipient2@example.com'],
  'Important Announcement',
  '<h1>Announcement</h1><p>This is an important announcement.</p>'
);
```

### Sending Batch Emails (Newsletter)

```typescript
import emailService from '../services/email.service';

// Send a newsletter to multiple recipients
await emailService.sendNewsletterEmail(
  ['user1@example.com', 'user2@example.com', 'user3@example.com'],
  'Weekly Newsletter',
  '<h1>Weekly Newsletter</h1><p>Here are this week\'s updates...</p>',
  process.env.SENDGRID_NEWSLETTER_TEMPLATE_ID // optional
);
```

## Troubleshooting

### Email Not Being Sent

1. Check that your SendGrid API key is correct
2. Verify that your sender email is verified in SendGrid
3. Check the application logs for specific error messages
4. Ensure your SendGrid account is active and not suspended

### Template Variables Not Working

1. Make sure the variable names in your code match exactly with those in your template
2. Check for typos in the template ID
3. Verify that your template is saved and published

### Rate Limiting Issues

If you're sending a large volume of emails, you might hit SendGrid's rate limits. Consider:

1. Implementing a queue system for high-volume sending
2. Upgrading your SendGrid plan
3. Spreading out email sends over time

## Best Practices

1. Always use a verified sender email or domain
2. Include both HTML and plain text versions of your emails
3. Test your emails across different email clients
4. Monitor your email deliverability and engagement metrics in SendGrid
5. Implement proper error handling for email sending failures
6. Use templates for consistent branding and easier maintenance
7. Follow email marketing best practices and regulations (GDPR, CAN-SPAM, etc.)
