import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "@/components/auth/session-provider";
import { auth } from "@/lib/auth";
import { CookieConsentBanner } from "@/components/cookies/cookie-consent-banner";
import { ErrorBoundary } from "@/components/error-boundary";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "EquiSplit - Community Property Calculator for All 50 States",
  description: "Professional community property division calculations for divorce proceedings. Generate court-ready documents and save thousands in legal fees with accurate, state-specific property division analysis.",
  keywords: [
    "community property calculator",
    "divorce settlement calculator", 
    "property division",
    "marital property",
    "divorce calculator",
    "legal calculator",
    "family law",
    "asset division"
  ],
  authors: [{ name: "EquiSplit", url: "https://equisplit.com" }],
  creator: "EquiSplit",
  publisher: "EquiSplit",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    title: "EquiSplit - Community Property Calculator",
    description: "Professional property division calculations for all 50 states. Generate court-ready documents and save thousands in legal fees.",
    url: "https://equisplit.com",
    siteName: "EquiSplit",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "EquiSplit - Community Property Calculator",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "EquiSplit - Community Property Calculator",
    description: "Professional property division calculations for all 50 states.",
    images: ["/og-image.png"],
  },
  verification: {
    google: "your-google-verification-code",
  },
  category: "Legal Technology",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ErrorBoundary feature="Application">
          <SessionProvider session={session}>
            {children}
            <CookieConsentBanner />
          </SessionProvider>
        </ErrorBoundary>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Initialize Web Vitals tracking
              if (typeof window !== 'undefined') {
                import('/src/lib/web-vitals.js')
                  .then(({ trackWebVitals }) => trackWebVitals())
                  .catch(console.error);
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
