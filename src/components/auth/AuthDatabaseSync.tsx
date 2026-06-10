"use client";

import { useAuth as useClerkAuth } from "@clerk/nextjs";
import { trpc } from "@/providers/app-providers";

export function AuthDatabaseSync() {
  const { isLoaded, isSignedIn } = useClerkAuth();

  trpc.auth.me.useQuery(undefined, {
    enabled: isLoaded && isSignedIn,
    staleTime: 1000 * 60 * 2,
    retry: 1,
  });

  return null;
}
