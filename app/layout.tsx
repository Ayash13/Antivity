import type React from "react";
import type { Metadata, Viewport } from "next";
import { Ubuntu } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/auth-context";
import { SplashScreen } from "@/components/splash-screen";
import { PWAStatusBar } from "@/components/pwa-status-bar";

const ubuntu = Ubuntu({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://antivity.vercel.app"),
  applicationName: "Antivity",
  title: {
    default: "Antivity — Walk with purpose",
    template: "%s · Antivity",
  },
  description:
    "Antivity gives more purpose to your walk. Discover thing, notice your surroundings, and make every step more meaningful.",
  keywords: [
    "Antivity",
    "walking",
    "walk",
    "mindful walking",
    "health",
    "fitness",
    "outdoor",
    "habit",
  ],
  authors: [{ name: "Antivity" }],
  creator: "Antivity",
  publisher: "Antivity",
  robots: { index: true, follow: true },
  icons: {
    icon: "/logo/favicon.webp",
    shortcut: "/logo/favicon.webp",
    apple: "/logo/favicon.webp",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Antivity",
    startupImage: "/logo/antjvity-logo.webp",
  },
  openGraph: {
    type: "website",
    siteName: "Antivity",
    title: "Antivity — Walk with purpose",
    description:
      "Antivity gives more purpose to your walk. Discover thing, notice your surroundings, and make every step more meaningful.",
    url: "https://antivity.vercel.app",
    images: [
      {
        url: "/logo/antjvity-logo.webp",
        width: 1200,
        height: 630,
        alt: "Antivity",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Antivity — Walk with purpose",
    description:
      "Antivity gives more purpose to your walk. Discover thing, notice your surroundings, and make every step more meaningful.",
    images: ["/logo/antjvity-logo.webp"],
  },
  category: "health",
};

export const viewport: Viewport = {
  themeColor: "#6CD3FF",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={ubuntu.className}>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <meta name="apple-mobile-web-app-title" content="Antivity" />
        <meta name="msapplication-TileColor" content="#6CD3FF" />
        <meta name="msapplication-tap-highlight" content="no" />
        <link rel="apple-touch-icon" href="/logo/favicon.webp" />
      </head>
      <body>
        <PWAStatusBar />
        <AuthProvider>
          <SplashScreen>{children}</SplashScreen>
        </AuthProvider>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js')
                    .then(function(registration) {
                      console.log('SW registered: ', registration);
                    })
                    .catch(function(registrationError) {
                      console.log('SW registration failed: ', registrationError);
                    });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
