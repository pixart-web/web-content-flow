import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";

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

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  ),
  title: {
    default: "Web Content Flow",
    template: "%s · Web Content Flow",
  },
  description:
    "Create a connected Brand Profile, website content, campaigns and editorial plan from one business Brief.",
  openGraph: {
    title: "Web Content Flow",
    description:
      "One Brief. One connected workflow. A complete digital presence.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${poppins.variable}`}>
      <body>{children}</body>
    </html>
  );
}
