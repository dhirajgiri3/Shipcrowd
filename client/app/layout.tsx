import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/src/features/auth";
import { Providers as QueryProviders } from "@/src/core/providers/query-provider";
import { Toaster } from "@/src/components/ui/feedback/Toaster";
import { ErrorBoundary } from '@/src/components/shared/ErrorBoundary';
import { GlobalErrorProvider } from "@/src/core/providers/GlobalErrorProvider";
import { NetworkStatusProvider } from "@/src/core/providers/NetworkStatusProvider";

// ═══════════════════════════════════════════════════════════════════════════
// SEO METADATA
// Comprehensive metadata for search engines and social sharing
// ═══════════════════════════════════════════════════════════════════════════

export const metadata: Metadata = {
  // Core metadata
  title: {
    default: "Shipcrowd - AI-Powered Shipping Aggregator for India",
    template: "%s | Shipcrowd",
  },
  description:
    "Ship Smarter, Not Harder. Compare rates from Delhivery, Bluedart, Xpressbees, DTDC & more. One dashboard, all couriers, best prices. India's smartest shipping platform for eCommerce sellers.",

  // Keywords for SEO
  keywords: [
    "shipping aggregator",
    "courier aggregator India",
    "eCommerce shipping",
    "Delhivery",
    "Bluedart",
    "Xpressbees",
    "DTDC",
    "shipping rates comparison",
    "COD shipping",
    "bulk shipping",
    "shipment tracking",
    "logistics platform",
  ],

  // Open Graph (Facebook, LinkedIn, etc.)
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "https://Shipcrowd.com",
    siteName: "Shipcrowd",
    title: "Shipcrowd - India's Smartest Shipping Aggregator",
    description:
      "Compare rates, book shipments, and track deliveries across all major couriers. Save up to 40% on shipping costs.",
  },

  // Twitter Card
  twitter: {
    card: "summary_large_image",
    title: "Shipcrowd - Ship Smarter, Not Harder",
    description: "India's smartest shipping aggregator for eCommerce sellers.",
  },

  // Robots
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  // Manifest for PWA
  manifest: "/manifest.json",

  // Icons
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png",
  },

  // Verification (add your IDs when ready)
  // verification: {
  //   google: "your-google-verification-code",
  // },
};

// ═══════════════════════════════════════════════════════════════════════════
// VIEWPORT CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#2525FF",
};

// ═══════════════════════════════════════════════════════════════════════════
// ROOT LAYOUT
// ═══════════════════════════════════════════════════════════════════════════

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light scroll-smooth" suppressHydrationWarning>
      <body className="antialiased">
        <ErrorBoundary>
          <GlobalErrorProvider>
            <NetworkStatusProvider>
              <QueryProviders>
                <AuthProvider>
                  {children}
                </AuthProvider>
              </QueryProviders>
            </NetworkStatusProvider>
          </GlobalErrorProvider>
        </ErrorBoundary>
        <Toaster
          position="top-right"
          richColors
          closeButton
          theme="system"
          className="toaster-layer"
        />
      </body>
    </html>
  );
}
