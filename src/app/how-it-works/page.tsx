import type { Metadata } from "next";
import HowItWorksPage from "@/components/pages/HowItWorksPage";

export const metadata: Metadata = {
  title: "How BookSwap Works | BookSwap",
  description:
    "Learn how to list, swap, give away, sell, request, and complete book transactions on BookSwap.",
};

export default function Page() {
  return <HowItWorksPage />;
}
