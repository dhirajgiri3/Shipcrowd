import { Hr } from '@react-email/hr';
import { Section } from '@react-email/section';
import { Text } from '@react-email/text';
import * as React from 'react';

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
