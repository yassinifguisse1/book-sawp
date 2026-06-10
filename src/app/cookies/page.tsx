import type { Metadata } from "next";
import { LegalPage } from "@/components/pages/LegalPage";
import { cookiePolicyContent } from "@/lib/legal-pages";
import { resolveSupportEmail } from "@/lib/support-email";
import { env } from "@/server/env";

export const metadata: Metadata = {
  title: "Cookie Policy | BookSwap",
  description: "Learn how BookSwap uses cookies and similar technologies.",
};

export default function CookiePolicyPage() {
  return (
    <LegalPage
      content={cookiePolicyContent}
      supportEmail={resolveSupportEmail(env.supportEmail)}
    />
  );
}
