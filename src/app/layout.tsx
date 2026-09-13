import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter, Poppins } from "next/font/google";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-loaded-interface",
  display: "swap",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["600"],
  variable: "--font-loaded-display",
  display: "swap",
});

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-loaded-marketing",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-loaded-marketing-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  ),
  title: {
    default: "Web Content Flow",
    template: "%s · Web Content Flow",
  },
  description:
    "A content operations platform that turns one strategic brief into a connected system of brand-consistent marketing content.",
  icons: {
    icon: "/brand/symbol/favicon.svg",
    apple: "/brand/social/apple-touch-icon.png",
  },
  openGraph: {
    title: "Web Content Flow",
    description: "From one brief to your entire content system.",
    type: "website",
    images: [
      {
        url: "/og/og-default.png",
        width: 1200,
        height: 630,
        alt: "Web Content Flow — Create once. Flow everywhere.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Web Content Flow",
    description: "From one brief to your entire content system.",
    images: ["/og/og-default.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${poppins.variable} ${geist.variable} ${geistMono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
