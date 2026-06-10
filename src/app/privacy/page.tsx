import type { Metadata } from "next";
import { LegalPage } from "@/components/pages/LegalPage";
import { privacyCenterContent } from "@/lib/legal-pages";
import { resolveSupportEmail } from "@/lib/support-email";
import { env } from "@/server/env";

export const metadata: Metadata = {
  title: "Privacy Center | BookSwap",
  description: "Learn how BookSwap collects, uses, shares, and protects marketplace data.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      content={privacyCenterContent}
      supportEmail={resolveSupportEmail(env.supportEmail)}
    />
  );
}
