import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { AppProviders } from "@/providers/app-providers";
import { env } from "@/server/env";
import { generateOrganizationSchema, generateWebSiteSchema } from "@/lib/seo/schemas";
import { JsonLd } from "@/components/seo/JsonLd";
import "./globals.css";
import { ServiceBanner } from "@/components/layout/ServiceBanner";

export const metadata: Metadata = {
  metadataBase: new URL(env.appUrl),
  title: {
    default: "BookSwap — Share Stories, Build Community, Swap Books",
    template: "%s | BookSwap",
  },
  description:
    "BookSwap is a community marketplace for books. Swap, give away, or sell your books with readers near you. Discover your next favorite read today.",
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "BookSwap",
    url: env.appUrl,
  },
  twitter: {
    card: "summary_large_image",
    site: "@bookswap",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: env.appUrl,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const site = { url: env.appUrl, name: "BookSwap" };
  const schema = {
    "@context": "https://schema.org",
    "@graph": [generateOrganizationSchema(site), generateWebSiteSchema(site)],
  };

  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <AppProviders>
          <ServiceBanner />
          <JsonLd data={schema} />
          {children}
        </AppProviders>
        <Analytics />
      </body>
    </html>
  );
}
