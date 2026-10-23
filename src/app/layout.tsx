import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";
import Navbar from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  metadataBase: new URL("https://cryptopool.pages.dev"),
  title: "CryptoPool - Crypto Lucky Draw",
  description: "Daily USDC + USDT raffle. Fair, transparent, on BNB Smart Chain.",
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "CryptoPool - Crypto Lucky Draw",
    description: "Daily USDC + USDT raffle. Fair, transparent, on BNB Smart Chain.",
    type: "website",
    images: ["/og.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "CryptoPool - Crypto Lucky Draw",
    description: "Daily USDC + USDT raffle. Fair, transparent, on BNB Smart Chain.",
  },
};

export const viewport: Viewport = {
  themeColor: "#F5C542",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body className="bg-background text-foreground antialiased">
        <Providers>
          <Navbar />
          <main className="min-h-screen">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
