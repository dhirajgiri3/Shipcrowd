import { Body } from '@react-email/body';
import { Container } from '@react-email/container';
import { Font } from '@react-email/font';
import { Head } from '@react-email/head';
import { Html } from '@react-email/html';
import { Tailwind } from '@react-email/tailwind';
import * as React from 'react';

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
                    {previewText ? (
                        <span style={{ display: 'none', maxHeight: 0, overflow: 'hidden' }}>
                            {previewText}
                        </span>
                    ) : null}
                    <Container className="border border-solid border-[#eaeaea] rounded my-[40px] mx-auto p-[20px] max-w-[465px] bg-white">
                        {children}
                    </Container>
                </Body>
            </Tailwind>
        </Html>
    );
};

export default EmailLayout;
