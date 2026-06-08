"use client";

import { useCallback, useMemo } from "react";
import { useAuth as useClerkAuth, useClerk } from "@clerk/nextjs";
import { trpc } from "@/providers/app-providers";

export function useAuth() {
  const { isLoaded, isSignedIn } = useClerkAuth();
  const { signOut } = useClerk();
  const {
    data: user,
    isLoading,
    error,
    refetch,
  } = trpc.auth.me.useQuery(undefined, {
    enabled: isLoaded && isSignedIn,
    staleTime: 1000 * 60 * 5,
    retry: false,
  });

  const logout = useCallback(() => signOut({ redirectUrl: "/" }), [signOut]);

  return useMemo(
    () => ({
      user: user ?? null,
      isAuthenticated: Boolean(isSignedIn),
      isLoading: !isLoaded || (Boolean(isSignedIn) && isLoading),
      error,
      logout,
      refresh: refetch,
    }),
    [error, isLoaded, isLoading, isSignedIn, logout, refetch, user],
  );
}
