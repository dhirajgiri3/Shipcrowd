import * as React from 'react';
import { Section } from '@react-email/section';
import { Text } from '@react-email/text';
import { Hr } from '@react-email/hr';

export const EmailHeader = () => {
    return (
        <Section className="mt-[32px]">
            <Text className="text-black text-[24px] font-normal text-center p-0 my-[30px] mx-0">
                <strong>Shipcrowd</strong>
            </Text>
            <Hr className="border border-solid border-[#eaeaea] my-[26px] mx-0 w-full" />
        </Section>
    );
};

export default EmailHeader;
