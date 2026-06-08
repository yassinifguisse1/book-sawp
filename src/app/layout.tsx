import type { Metadata } from "next";
import { AppProviders } from "@/providers/app-providers";
import "./globals.css";
import { ServiceBanner } from "@/components/layout/ServiceBanner";

export const metadata: Metadata = {
  title: "BookSwap",
  description: "Share stories, build community, and swap books.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <AppProviders>
          <ServiceBanner />
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
