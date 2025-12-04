import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-inter"
});

export const metadata: Metadata = {
  title: "Digital Utopia Admin Dashboard",
  description: "Comprehensive admin panel for Digital Utopia trading platform management",
  keywords: "admin, dashboard, trading, management, digital utopia",
  authors: [{ name: "MiniMax Agent" }],
  viewport: "width=device-width, initial-scale=1",
  robots: "noindex, nofollow",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} antialiased bg-slate-900 text-white min-h-screen`}
      >
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
