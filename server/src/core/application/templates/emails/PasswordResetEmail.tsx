import * as React from 'react';
import { Section } from '@react-email/section';
import { Text } from '@react-email/text';
import { Button } from '@react-email/button';
import { EmailLayout } from './components/EmailLayout';
import { EmailHeader } from './components/EmailHeader';
import { EmailFooter } from './components/EmailFooter';

export interface PasswordResetEmailProps {
    name: string;
    resetUrl: string;
}

export const PasswordResetEmail = ({
    name,
    resetUrl,
}: PasswordResetEmailProps) => {
    return (
        <EmailLayout previewText="Reset your Shipcrowd password">
            <EmailHeader />
            <Section>
                <Text className="text-black text-[14px] leading-[24px]">
                    Hi {name},
                </Text>
                <Text className="text-black text-[14px] leading-[24px]">
                    We received a request to reset your password. Click the button below to reset it:
                </Text>
                <Section className="text-center mt-[32px] mb-[32px]">
                    <Button
                        className="bg-[#007bff] rounded text-white text-[12px] font-semibold no-underline text-center px-5 py-3"
                        href={resetUrl}
                    >
                        Reset Password
                    </Button>
                </Section>
                <Text className="text-black text-[14px] leading-[24px]">
                    Or copy and paste this link into your browser:
                    <br />
                    <a href={resetUrl} className="text-blue-600 no-underline">
                        {resetUrl}
                    </a>
                </Text>
                <Text className="text-black text-[14px] leading-[24px]">
                    This link will expire in 1 hour. If you didn't request a password reset, please ignore this email.
                </Text>
            </Section>
            <EmailFooter />
        </EmailLayout>
    );
};

export default PasswordResetEmail;
