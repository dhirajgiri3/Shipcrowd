import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/src/features/auth";
import { Providers as QueryProviders } from "@/src/core/providers/query-provider";
import { Toaster } from "@/components/ui/feedback/Toaster";
import { ErrorBoundary } from "@/src/components/ErrorBoundary";

// ═══════════════════════════════════════════════════════════════════════════
// FONT OPTIMIZATION
// Using display: 'swap' for better LCP, preloading subset
// ═══════════════════════════════════════════════════════════════════════════

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
  preload: false, // Only load when needed
});

// ═══════════════════════════════════════════════════════════════════════════
// SEO METADATA
// Comprehensive metadata for search engines and social sharing
// ═══════════════════════════════════════════════════════════════════════════

export const metadata: Metadata = {
  // Core metadata
  title: {
    default: "ShipCrowd - AI-Powered Shipping Aggregator for India",
    template: "%s | ShipCrowd",
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
    url: "https://shipcrowd.com",
    siteName: "ShipCrowd",
    title: "ShipCrowd - India's Smartest Shipping Aggregator",
    description:
      "Compare rates, book shipments, and track deliveries across all major couriers. Save up to 40% on shipping costs.",
  },

  // Twitter Card
  twitter: {
    card: "summary_large_image",
    title: "ShipCrowd - Ship Smarter, Not Harder",
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
    <html lang="en" className="scroll-smooth" suppressHydrationWarning>
      <head>
        {/* Preconnect to external domains for faster loading */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var storageKey = 'shipcrowd-theme';
                  var savedTheme = localStorage.getItem(storageKey);
                  var systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                  var theme = savedTheme === 'system' || !savedTheme ? systemTheme : savedTheme;
                  document.documentElement.classList.add(theme);
                } catch (e) {}
              })()
            `,
          }}
        />
      </head>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <ErrorBoundary>
          <QueryProviders>
            <AuthProvider>
              {children}
            </AuthProvider>
          </QueryProviders>
        </ErrorBoundary>
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
