"use client";

import { useMemo, useSyncExternalStore } from "react";
import {
  LOCATION_PREFERENCE_CHANGE_EVENT,
  LOCATION_PREFERENCE_STORAGE_KEY,
  parseLocationPreference,
} from "@/lib/location-preference";

function subscribeToLocationPreference(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};

  const handleStorage = (event: StorageEvent) => {
    if (event.key === LOCATION_PREFERENCE_STORAGE_KEY) {
      onStoreChange();
    }
  };

  window.addEventListener(LOCATION_PREFERENCE_CHANGE_EVENT, onStoreChange);
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener(LOCATION_PREFERENCE_CHANGE_EVENT, onStoreChange);
    window.removeEventListener("storage", handleStorage);
  };
}

function getLocationPreferenceSnapshot() {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(LOCATION_PREFERENCE_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function useLocationPreference() {
  const rawPreference = useSyncExternalStore(
    subscribeToLocationPreference,
    getLocationPreferenceSnapshot,
    () => null,
  );

  return useMemo(() => parseLocationPreference(rawPreference), [rawPreference]);
}
