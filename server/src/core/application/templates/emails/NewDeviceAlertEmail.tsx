import * as React from 'react';
import { Section } from '@react-email/section';
import { Text } from '@react-email/text';
import { EmailLayout } from './components/EmailLayout';
import { EmailHeader } from './components/EmailHeader';
import { EmailFooter } from './components/EmailFooter';

export interface NewDeviceAlertEmailProps {
    name: string;
    deviceType: string;
    browser: string;
    location: string;
    ip: string;
    timestamp: string;
}

export const NewDeviceAlertEmail = ({
    name,
    deviceType,
    browser,
    location,
    ip,
    timestamp,
}: NewDeviceAlertEmailProps) => {
    return (
        <EmailLayout previewText="New Device Sign-in Alert">
            <EmailHeader />
            <Section>
                <Text className="text-black text-[14px] leading-[24px]">
                    Hi {name},
                </Text>
                <Text className="text-black text-[14px] leading-[24px]">
                    We detected a sign-in to your account from a new device:
                </Text>
                <ul className="text-black text-[14px] leading-[24px]">
                    <li><strong>Device:</strong> {deviceType}</li>
                    <li><strong>Browser:</strong> {browser}</li>
                    <li><strong>Location:</strong> {location}</li>
                    <li><strong>IP Address:</strong> {ip}</li>
                    <li><strong>Time:</strong> {timestamp}</li>
                </ul>
                <Text className="text-black text-[14px] leading-[24px]">
                    If this was you, you can safely ignore this email.
                </Text>
                <Text className="text-black text-[14px] leading-[24px]">
                    If this wasn't you, please secure your account immediately by changing your password.
                </Text>
            </Section>
            <EmailFooter />
        </EmailLayout>
    );
};

export default NewDeviceAlertEmail;
