import type { Metadata } from "next";
import { LegalPage } from "@/components/pages/LegalPage";
import { termsContent } from "@/lib/legal-pages";
import { resolveSupportEmail } from "@/lib/support-email";
import { env } from "@/server/env";

export const metadata: Metadata = {
  title: "Terms & Conditions | BookSwap",
  description: "Read the marketplace terms for using BookSwap.",
};

export default function TermsPage() {
  return (
    <LegalPage
      content={termsContent}
      supportEmail={resolveSupportEmail(env.supportEmail)}
    />
  );
}
