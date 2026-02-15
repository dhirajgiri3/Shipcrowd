import { Hr } from '@react-email/hr';
import { Section } from '@react-email/section';
import { Text } from '@react-email/text';
import * as React from 'react';

export const EmailFooter = () => {
    return (
        <Section>
            <Hr className="border border-solid border-[#eaeaea] my-[26px] mx-0 w-full" />
            <Text className="text-[#666666] text-[12px] leading-[24px]">
                This message was sent to you by Shipcrowd. If you didn't request this, please ignore this email.
            </Text>
        </Section>
    );
};

export default EmailFooter;
