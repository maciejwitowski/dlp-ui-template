import { AuthProvider } from "@/components/providers/AuthProvider";
import {
  WalletProvider
} from "@/components/providers/WalletProvider";
import { Toaster } from "@/components/ui/sonner";
import "@getpara/react-sdk/styles.css";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Google Drive Connector",
  description: "Connect your Google account and view your information",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieHeader = (await headers()).get("cookie") ?? "";

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <WalletProvider cookieHeader={cookieHeader}>
            {children}
          </WalletProvider>
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
