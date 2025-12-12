"use client";

import { Card, CardContent } from '@/components/ui/Card';
import { Sparkles, ArrowRight, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { useState } from 'react';

export function SmartAIWidget() {
    const [isVisible, setIsVisible] = useState(true);

    if (!isVisible) return null;

    return (
        <Card className="bg-[#2525FF] text-white border-0 overflow-hidden relative">
            {/* Subtle pattern overlay */}
            <div className="absolute inset-0 opacity-[0.03]" style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
            }} />

            <CardContent className="p-5 pr-12 relative z-10">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    {/* Left section */}
                    <div className="flex items-start gap-3.5 flex-1">
                        <div className="p-2.5 bg-white/10 rounded-lg flex-shrink-0">
                            <Sparkles className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <h3 className="text-sm font-semibold">AI Insight</h3>
                                <span className="px-2 py-0.5 text-[10px] font-medium bg-white/20 rounded-full">New</span>
                            </div>
                            <p className="text-white/80 text-sm leading-relaxed">
                                Switch priority for North Zone shipments to save <span className="font-semibold text-white">₹12,400</span> this month.
                            </p>
                        </div>
                    </div>

                    {/* Right section */}
                    <Link href="/admin/intelligence" className="flex-shrink-0 self-start sm:self-center">
                        <Button
                            variant="secondary"
                            size="sm"
                            className="whitespace-nowrap bg-white text-[#2525FF] hover:bg-white/90 border-0 font-medium"
                        >
                            Apply
                            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                        </Button>
                    </Link>
                </div>
            </CardContent>

            {/* Close button - positioned absolutely in top right */}
            <button
                onClick={() => setIsVisible(false)}
                className="absolute top-3 right-3 p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors z-20"
            >
                <X className="h-3.5 w-3.5" />
            </button>
        </Card>
    );
}
