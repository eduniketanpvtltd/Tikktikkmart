import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./layout-geometry.css";
import { Suspense } from "react";
import { AppProviders } from "@/components/providers/AppProviders";
import { SplashScreen } from "@/components/common/SplashScreen";
import { TopProgressBar } from "@/components/common/TopProgressBar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = { viewportFit: "cover" };

export const metadata: Metadata = {
  title: "TIKK TIKK MART — Last Minute Saver | 10-Minute Grocery Delivery",
  description: "India's quick-commerce grocery app. Fresh vegetables, dairy, snacks & household essentials delivered to your doorstep in 10 minutes.",
  manifest: "/manifest.json",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="light">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50 text-gray-900`}>
        <SplashScreen />
        <Suspense fallback={null}>
          <TopProgressBar />
        </Suspense>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
