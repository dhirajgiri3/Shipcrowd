"use client";

import React from 'react';
import { Loader } from '@/components/ui';

export default function LoaderTestPage() {
    return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[var(--bg-primary)]">
            <Loader
                variant="truck"
                size="xl"
                message="Testing Primary Truck Loader..."
            />

            <div className="mt-8 text-center text-[var(--text-secondary)]">
                <p className="text-sm">This is a test page for the primary loading animation.</p>
                <p className="text-xs mt-2 opacity-50">/loader-test</p>
            </div>
        </div>
    );
}
