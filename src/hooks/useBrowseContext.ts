"use client";

import { useMemo, useSyncExternalStore } from "react";
import {
  BROWSE_CONTEXT_CHANGE_EVENT,
  BROWSE_CONTEXT_STORAGE_KEY,
  parseBrowseContext,
  resolveFallbackBrowseContext,
  type BrowseContext,
} from "@/lib/browse-context";

function subscribe(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};

  const handleStorage = (event: StorageEvent) => {
    if (event.key === BROWSE_CONTEXT_STORAGE_KEY) onStoreChange();
  };

  window.addEventListener(BROWSE_CONTEXT_CHANGE_EVENT, onStoreChange);
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener(BROWSE_CONTEXT_CHANGE_EVENT, onStoreChange);
    window.removeEventListener("storage", handleStorage);
  };
}

function getSnapshot() {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(BROWSE_CONTEXT_STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * Reads the stored browse context. Returns `{ context, isStored }` where
 * `context` always falls back to the default so callers can render
 * immediately, and `isStored` indicates whether the user has chosen one.
 */
export function useBrowseContext(): { context: BrowseContext; isStored: boolean } {
  const raw = useSyncExternalStore(subscribe, getSnapshot, () => null);
  return useMemo(() => {
    const parsed = parseBrowseContext(raw);
    return {
      context: parsed ?? resolveFallbackBrowseContext(),
      isStored: parsed !== null,
    };
  }, [raw]);
}
