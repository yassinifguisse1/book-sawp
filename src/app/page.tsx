import { Suspense } from "react";
import HomePage from "@/components/pages/HomePage";

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <HomePage />
    </Suspense>
  );
}
