'use client';

/**
 * Shopify Integration Landing Page
 *
 * Entry point when users open the app from Shopify Admin.
 * Redirects to appropriate page based on connection status.
 * UI aligned with Shopify brand (green accent) + Shipcrowd design system.
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Store, ArrowRight } from 'lucide-react';
import { useIntegrations } from '@/src/core/api/hooks/integrations/useEcommerceIntegrations';
import { Card, CardContent } from '@/src/components/ui/core/Card';

export default function ShopifyLandingPage() {
  const router = useRouter();
  const { data: integrations, isLoading } = useIntegrations({ type: 'SHOPIFY' });

  useEffect(() => {
    if (!isLoading) {
      if (integrations && integrations.length > 0) {
        const firstStore = integrations[0];
        const storeId = firstStore.integrationId ?? (firstStore as { id?: string }).id ?? (firstStore as { _id?: string })._id;
        router.push(`/seller/integrations/shopify/${storeId}`);
      } else {
        router.push('/seller/integrations/shopify/setup');
      }
    }
  }, [integrations, isLoading, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 bg-[var(--bg-primary)]">
      <div className="w-full max-w-md animate-in fade-in duration-300">
        <Card className="overflow-hidden border-[var(--border-subtle)] bg-[var(--bg-primary)] shadow-[var(--shadow-md)]">
          <CardContent className="p-8 sm:p-10">
            {/* Shopify Branded Header */}
            <div className="flex flex-col items-center text-center">
              <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-[#95BF47]/15 to-[#95BF47]/5 flex items-center justify-center flex-shrink-0 border border-[#95BF47]/20 mb-6 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-tr from-white/30 via-transparent to-transparent opacity-50" />
                <img
                  src="/logos/shopify.svg"
                  alt="Shopify"
                  className="w-12 h-12 relative object-contain"
                />
              </div>

              <h1 className="text-xl font-bold text-[var(--text-primary)] tracking-tight mb-2">
                Connecting to Shipcrowd
              </h1>
              <p className="text-sm text-[var(--text-secondary)] max-w-[280px]">
                Checking your Shopify integration status...
              </p>
            </div>

            {/* Loading Indicator - Shopify green accent */}
            <div className="mt-8 flex flex-col items-center gap-4">
              <Loader2
                className="w-12 h-12 text-[#95BF47] animate-spin"
                aria-hidden
              />
              <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
                <span className="inline-block w-2 h-2 rounded-full bg-[#95BF47] animate-pulse" />
                Redirecting you to the right place
              </div>
            </div>

            {/* Subtle Brand Touch */}
            <div className="mt-8 pt-6 border-t border-[var(--border-subtle)] flex items-center justify-center gap-2 text-[var(--text-muted)]">
              <Store className="w-4 h-4" />
              <span className="text-xs font-medium">Powered by Shipcrowd</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </CardContent>
        </Card>

        {/* Accessibility: announce loading state */}
        <p className="sr-only" role="status" aria-live="polite">
          Loading Shopify integration, please wait...
        </p>
      </div>
    </div>
  );
}
