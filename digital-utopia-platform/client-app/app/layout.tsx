import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { Toaster } from 'react-hot-toast';
import { ErrorBoundary } from '@/components/error-boundary';

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Digital Utopia - Professional Trading Platform',
    template: '%s | Digital Utopia',
  },
  description: 'Trade forex, cryptocurrencies, stocks, and commodities with institutional-grade tools and real-time market data.',
  keywords: [
    'trading',
    'forex',
    'cryptocurrency',
    'stocks',
    'commodities',
    'financial markets',
    'online trading',
    'investment platform',
    'digital trading',
    'professional trading',
  ],
  authors: [{ name: 'MiniMax Agent' }],
  creator: 'Digital Utopia',
  publisher: 'Digital Utopia',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://digitalutopia.app'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://digitalutopia.app',
    title: 'Digital Utopia - Professional Trading Platform',
    description: 'Trade forex, cryptocurrencies, stocks, and commodities with institutional-grade tools and real-time market data.',
    siteName: 'Digital Utopia',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Digital Utopia - Professional Trading Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Digital Utopia - Professional Trading Platform',
    description: 'Trade forex, cryptocurrencies, stocks, and commodities with institutional-grade tools and real-time market data.',
    images: ['/og-image.jpg'],
    creator: '@digitalutopia',
  },
  robots: {
    index: true,
    follow: true,
    nocache: true,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
    yandex: process.env.YANDEX_VERIFICATION,
    yahoo: process.env.YAHOO_VERIFICATION,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html 
      lang="en" 
      className={inter.variable}
      suppressHydrationWarning
    >
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
        <meta name="theme-color" content="#3b82f6" />
        <meta name="msapplication-TileColor" content="#3b82f6" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Digital Utopia" />
        
        {/* Favicons */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        
        {/* Preconnect to external domains */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://api.digitalutopia.app" />
        <link rel="preconnect" href="https://ws.digitalutopia.app" />
        
        {/* DNS prefetch for better performance */}
        <link rel="dns-prefetch" href="https://tradingview.com" />
        <link rel="dns-prefetch" href="https://api.binance.com" />
      </head>
      <body className={`${inter.className} antialiased bg-background text-foreground min-h-screen`}>
        <ErrorBoundary>
          <Providers>
            <div className="relative flex min-h-screen flex-col">
              {/* Background gradient */}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/5" />
              
              {/* Main content */}
              <div className="relative flex flex-1 flex-col">
                {children}
              </div>
              
              {/* Toast notifications */}
              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 4000,
                  className: 'bg-surface text-foreground border border-border',
                  style: {
                    background: 'hsl(var(--surface))',
                    color: 'hsl(var(--foreground))',
                    border: '1px solid hsl(var(--border))',
                  },
                  success: {
                    iconTheme: {
                      primary: 'hsl(var(--success))',
                      secondary: 'hsl(var(--surface))',
                    },
                  },
                  error: {
                    iconTheme: {
                      primary: 'hsl(var(--error))',
                      secondary: 'hsl(var(--surface))',
                    },
                  },
                }}
              />
            </div>
          </Providers>
        </ErrorBoundary>
      </body>
    </html>
  );
}
