"use client";

import { Card, CardContent } from '@/components/ui/Card';
import { Lightbulb, ArrowRight, X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { useState } from 'react';
import { cn } from '@/lib/utils';

export function SmartAIWidget() {
    const [isVisible, setIsVisible] = useState(true);

    if (!isVisible) return null;

    return (
        <Card className="relative overflow-hidden border-0 bg-gradient-to-r from-[#2525FF] to-[#3B3BFF] shadow-lg shadow-blue-500/20 group animate-in fade-in slide-in-from-top-2 duration-500">
            {/* Abstract Background Shapes */}
            <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-white/10 rounded-full blur-2xl opacity-50 pointer-events-none" />
            <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-24 h-24 bg-purple-500/20 rounded-full blur-2xl opacity-50 pointer-events-none" />

            <CardContent className="p-1 pr-10 relative z-10">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 p-4">
                    {/* Left Icon Section */}
                    <div className="flex-shrink-0">
                        <div className="h-12 w-12 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 flex items-center justify-center shadow-inner">
                            <Lightbulb className="h-6 w-6 text-white animate-pulse" />
                        </div>
                    </div>

                    {/* Content Section */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                            <h3 className="text-sm font-bold text-white tracking-wide">AI Recommendation</h3>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20 border border-white/10 text-[10px] font-bold text-white shadow-sm">
                                <Sparkles className="h-2.5 w-2.5" />
                                NEW
                            </span>
                        </div>
                        <p className="text-sm text-white/90 leading-relaxed font-medium">
                            Optimize North Zone logistics to save <span className="font-bold text-white bg-white/20 px-1 rounded mx-0.5">₹12,400</span> this month.
                        </p>
                    </div>

                    {/* Action Button */}
                    <div className="flex-shrink-0 pt-2 sm:pt-0">
                        <Link href="/admin/intelligence">
                            <Button
                                size="sm"
                                className={cn(
                                    "bg-white text-[#2525FF] hover:bg-blue-50 border-0 font-semibold shadow-md",
                                    "transition-all duration-300 transform hover:scale-105 active:scale-95",
                                    "h-9 px-4 rounded-lg"
                                )}
                            >
                                Apply Now
                                <ArrowRight className="ml-1.5 h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                            </Button>
                        </Link>
                    </div>
                </div>
            </CardContent>

            {/* Close Button - Enhanced */}
            <button
                onClick={() => setIsVisible(false)}
                className="absolute top-2 right-2 p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-all duration-200"
                aria-label="Dismiss"
            >
                <X className="h-4 w-4" />
            </button>
        </Card>
    );
}
