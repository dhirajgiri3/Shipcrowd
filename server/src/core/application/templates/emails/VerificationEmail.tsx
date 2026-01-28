import * as React from 'react';
import { Section } from '@react-email/section';
import { Text } from '@react-email/text';
import { Button } from '@react-email/button';
import { EmailLayout } from './components/EmailLayout';
import { EmailHeader } from './components/EmailHeader';
import { EmailFooter } from './components/EmailFooter';

export interface VerificationEmailProps {
    name: string;
    verificationUrl: string;
}

export const VerificationEmail = ({
    name,
    verificationUrl,
}: VerificationEmailProps) => {
    return (
        <EmailLayout previewText="Verify your email address for Shipcrowd">
            <EmailHeader />
            <Section>
                <Text className="text-black text-[14px] leading-[24px]">
                    Welcome to Shipcrowd, {name}!
                </Text>
                <Text className="text-black text-[14px] leading-[24px]">
                    Please verify your email address by clicking the button below:
                </Text>
                <Section className="text-center mt-[32px] mb-[32px]">
                    <Button
                        className="bg-[#007bff] rounded text-white text-[12px] font-semibold no-underline text-center px-5 py-3"
                        href={verificationUrl}
                    >
                        Verify Email
                    </Button>
                </Section>
                <Text className="text-black text-[14px] leading-[24px]">
                    Or copy and paste this link into your browser:
                    <br />
                    <a href={verificationUrl} className="text-blue-600 no-underline">
                        {verificationUrl}
                    </a>
                </Text>
                <Text className="text-black text-[14px] leading-[24px]">
                    This link will expire in 24 hours. If you didn't create an account, please ignore this email.
                </Text>
            </Section>
            <EmailFooter />
        </EmailLayout>
    );
};

export default VerificationEmail;
