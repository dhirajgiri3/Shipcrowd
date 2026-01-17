import Link from 'next/link';
import Image from 'next/image';
import { ReactNode, memo } from 'react';
import { cn } from '@/src/lib/utils';

/**
 * AuthLayout Component
 * 
 * Shared layout for login and signup pages.
 * Server Component - renders static content.
 */

interface AuthLayoutProps {
    children: ReactNode;
    title: string;
    subtitle: string;
    testimonial?: {
        quote: string;
        author: string;
        role: string;
        initials: string;
    };
    features?: string[];
    variant?: 'login' | 'signup';
}

export const AuthLayout = memo(function AuthLayout({
    children,
    title,
    subtitle,
    testimonial,
    features,
    variant = 'login'
}: AuthLayoutProps) {
    return (
        <div className="flex min-h-screen bg-[--card-background]">
            {/* Left Side - Form */}
            <div className="w-full lg:w-[45%] flex flex-col justify-between p-8 md:p-12 lg:p-16 xl:p-24 relative z-10">
                {/* Logo */}
                <div>
                    <Link href="/" className="inline-block">
                        <Image
                            src="https://res.cloudinary.com/divbobkmd/image/upload/v1767468077/Helix_logo_yopeh9.png"
                            alt="ShipCrowd"
                            width={120}
                            height={32}
                            className="h-8 w-auto object-contain rounded-full"
                            priority
                        />
                    </Link>
                </div>

                {/* Form Content */}
                <div className="flex-1 flex flex-col justify-center max-w-[440px] mx-auto w-full py-10 lg:py-0">
                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-3xl md:text-4xl font-bold text-[--color-gray-900] mb-3 tracking-tight">
                            {title}
                        </h1>
                        <p className="text-[--color-gray-500] text-base md:text-lg">
                            {subtitle}
                        </p>
                    </div>

                    {children}
                </div>

                {/* Footer Link */}
                <div className="mt-8 text-center sm:text-left">
                    <p className="text-sm text-[--color-gray-600]">
                        {variant === 'login' ? (
                            <>
                                Don't have an account?{' '}
                                <Link
                                    href="/signup"
                                    className="font-semibold text-[--color-primary] hover:text-[--color-primary-hover] transition-colors"
                                >
                                    Sign up for free
                                </Link>
                            </>
                        ) : (
                            <>
                                Already have an account?{' '}
                                <Link
                                    href="/login"
                                    className="font-semibold text-[--color-primary] hover:text-[--color-primary-hover] transition-colors"
                                >
                                    Sign in
                                </Link>
                            </>
                        )}
                    </p>
                </div>
            </div>

            {/* Right Side - Image/Branding */}
            <div className="hidden lg:block lg:w-[55%] relative overflow-hidden bg-[--color-gray-900]">
                {/* Background Image */}
                <div className="absolute inset-0 z-0">
                    <Image
                        src="/images/auth-bg.png"
                        alt="Background"
                        fill
                        className={cn(
                            "object-cover opacity-80",
                            variant === 'signup' && "scale-x-[-1]"
                        )}
                        priority
                    />
                    {/* Gradients */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[--color-gray-950]/80 via-[--color-gray-900]/20 to-transparent mix-blend-multiply" />
                    <div className="absolute inset-0 bg-gradient-to-r from-[--color-gray-950] via-transparent to-transparent" />
                </div>

                {/* Content */}
                <div className="absolute bottom-0 left-0 right-0 p-16 z-10 text-white">
                    <div className="max-w-xl">
                        {/* Testimonial (for login) */}
                        {testimonial && (
                            <>
                                <blockquote className="text-2xl font-medium leading-relaxed mb-6">
                                    "{testimonial.quote}"
                                </blockquote>
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[--color-primary] to-indigo-500 flex items-center justify-center font-bold">
                                        {testimonial.initials}
                                    </div>
                                    <div>
                                        <div className="font-semibold">{testimonial.author}</div>
                                        <div className="text-[--color-gray-300] text-sm">{testimonial.role}</div>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Features (for signup) */}
                        {features && (
                            <div className="space-y-8">
                                <div className="grid gap-6">
                                    {features.map((feature, i) => (
                                        <div key={i} className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-[--radius-xl] bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                                                <svg className="w-6 h-6 text-[--color-success]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                            </div>
                                            <span className="text-lg font-medium">{feature}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="pt-4">
                                    <h3 className="text-2xl font-bold mb-2">Start shipping smarter today.</h3>
                                    <p className="text-[--color-gray-300]">Join the fastest growing shipping aggregator platform.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
});

export default AuthLayout;
