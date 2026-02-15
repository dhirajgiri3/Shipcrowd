import { Button } from '@react-email/button';
import { Section } from '@react-email/section';
import { Text } from '@react-email/text';
import * as React from 'react';
import { EmailFooter } from './components/EmailFooter';
import { EmailHeader } from './components/EmailHeader';
import { EmailLayout } from './components/EmailLayout';

export interface MagicLinkEmailProps {
    name: string;
    magicLinkUrl: string;
}

export const MagicLinkEmail = ({
    name,
    magicLinkUrl,
}: MagicLinkEmailProps) => {
    return (
        <EmailLayout previewText="Sign in to Shipcrowd">
            <EmailHeader />
            <Section>
                <Text className="text-black text-[14px] leading-[24px]">
                    Hi {name},
                </Text>
                <Text className="text-black text-[14px] leading-[24px]">
                    Click the button below to sign in to your account:
                </Text>
                <Section className="text-center mt-[32px] mb-[32px]">
                    <Button
                        className="bg-[#007bff] rounded text-white text-[12px] font-semibold no-underline text-center px-5 py-3"
                        href={magicLinkUrl}
                    >
                        Sign In
                    </Button>
                </Section>
                <Text className="text-black text-[14px] leading-[24px]">
                    Or copy and paste this link into your browser:
                    <br />
                    <a href={magicLinkUrl} className="text-blue-600 no-underline">
                        {magicLinkUrl}
                    </a>
                </Text>
                <Text className="text-black text-[14px] leading-[24px]">
                    This link will expire in 15 minutes. If you didn't request this link, please ignore this email.
                </Text>
            </Section>
            <EmailFooter />
        </EmailLayout>
    );
};

export default MagicLinkEmail;
