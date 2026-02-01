import * as React from 'react';
import { Html } from '@react-email/html';
import { Head } from '@react-email/head';
import { Body } from '@react-email/body';
import { Container } from '@react-email/container';
import { Tailwind } from '@react-email/tailwind';
import { Font } from '@react-email/font';

interface EmailLayoutProps {
    children: React.ReactNode;
    previewText?: string;
}

export const EmailLayout = ({ children, previewText }: EmailLayoutProps) => {
    return (
        <Html>
            <Head>
                <Font
                    fontFamily="Roboto"
                    fallbackFontFamily="Verdana"
                    webFont={{
                        url: 'https://fonts.gstatic.com/s/roboto/v27/KFOmCnqEu92Fr1Mu4mxKKTU1Kg.woff2',
                        format: 'woff2',
                    }}
                    fontWeight={400}
                    fontStyle="normal"
                />
            </Head>
            <Tailwind
                config={{
                    theme: {
                        extend: {
                            colors: {
                                brand: '#007bff',
                                offwhite: '#fafafa',
                            },
                        },
                    },
                }}
            >
                <Body className="bg-offwhite my-auto mx-auto font-sans">
                    <Container className="border border-solid border-[#eaeaea] rounded my-[40px] mx-auto p-[20px] max-w-[465px] bg-white">
                        {children}
                    </Container>
                </Body>
            </Tailwind>
        </Html>
    );
};

export default EmailLayout;
