"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { MapPin, X, Locate, Loader2 } from "lucide-react";

import { trpc } from "@/providers/app-providers";
import { useAuth } from "@/hooks/useAuth";
import { useBrowseContext } from "@/hooks/useBrowseContext";
import {
  DEFAULT_BROWSE_CONTEXT,
  RADIUS_OPTIONS,
  saveBrowseContext,
  type BrowseContext,
  type LocationSource,
} from "@/lib/browse-context";
import { COUNTRY_NAMES, countryName, formatBrowseLabel } from "@/lib/location-format";

const countryOptions = Object.entries(COUNTRY_NAMES)
  .map(([code, name]) => ({ code, name }))
  .sort((a, b) => a.name.localeCompare(b.name));

function radiusLabel(radiusKm: number | null) {
  return RADIUS_OPTIONS.find((option) => option.value === radiusKm)?.label ?? `${radiusKm} km`;
}

export function BrowseLocationSelector() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useAuth();
  const { context, isStored } = useBrowseContext();

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<BrowseContext>(context);
  const [cityQuery, setCityQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const savePreferences = trpc.profile.saveBrowsePreferences.useMutation();
  const utils = trpc.useUtils();
  const hydratedRef = useRef(false);

  // One-time hydration for first-time visitors: prefer saved server prefs,
  // otherwise fall back to an IP-based suggestion. Never blocks the UI.
  useEffect(() => {
    if (hydratedRef.current || isStored) return;
    hydratedRef.current = true;

    (async () => {
      if (isAuthenticated) {
        const prefs = await utils.profile.getBrowsePreferences.fetch().catch(() => null);
        if (prefs?.countryCode) {
          saveBrowseContext({
            locationId: prefs.browseLocationId,
            label: prefs.label ?? countryName(prefs.countryCode),
            countryCode: prefs.countryCode,
            regionCode: prefs.regionCode,
            cityName: prefs.cityName,
            radiusKm: prefs.radiusKm,
            includeDomesticShipping: prefs.includeDomesticShipping,
            includeInternationalShipping: prefs.includeInternationalShipping,
            locationSource: prefs.locationSource,
          });
          return;
        }
      }

      const suggestion = await utils.location.ipSuggestion.fetch().catch(() => null);
      if (suggestion?.countryCode) {
        saveBrowseContext({
          ...DEFAULT_BROWSE_CONTEXT,
          locationId: suggestion.locationId ?? null,
          label: suggestion.label,
          countryCode: suggestion.countryCode,
          regionCode: suggestion.regionCode ?? null,
          cityName: suggestion.cityName ?? null,
          locationSource: "ip_suggestion",
        });
      }
    })();
  }, [isAuthenticated, isStored, utils]);

  useEffect(() => {
    if (open) setDraft(context);
  }, [open, context]);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedQuery(cityQuery.trim()), 300);
    return () => window.clearTimeout(timeout);
  }, [cityQuery]);

  const suggestQuery = trpc.location.suggest.useQuery(
    { query: debouncedQuery, countryCode: draft.countryCode },
    { enabled: open && debouncedQuery.length >= 2, staleTime: 60_000 },
  );

  const ipSuggestion = trpc.location.ipSuggestion.useQuery(undefined, { enabled: open });

  function applyAndClose(next: BrowseContext) {
    saveBrowseContext(next);
    if (isAuthenticated) {
      savePreferences.mutate({
        browseLocationId: next.locationId,
        radiusKm: next.radiusKm ?? undefined,
        includeDomesticShipping: next.includeDomesticShipping,
        includeInternationalShipping: next.includeInternationalShipping,
        locationSource: next.locationSource,
      });
    }

    if (pathname === "/") {
      const params = new URLSearchParams(searchParams.toString());
      if (next.locationId) params.set("location", String(next.locationId));
      else params.delete("location");
      params.set("country", next.countryCode);
      params.set("radius", next.radiusKm === null ? "any" : String(next.radiusKm));
      params.set("domestic", next.includeDomesticShipping ? "1" : "0");
      params.set("intl", next.includeInternationalShipping ? "1" : "0");
      const query = params.toString();
      router.replace(query ? `/?${query}` : "/", { scroll: false });
    }
    setOpen(false);
  }

  const suggestions = useMemo(() => suggestQuery.data ?? [], [suggestQuery.data]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium text-[#111] transition-colors hover:bg-[#F7F7F7] hover:text-[#007782]"
        aria-label="Change browsing location"
      >
        <MapPin className="h-4 w-4 text-[#007782]" />
        <span className="hidden max-w-[160px] truncate sm:inline">
          {formatBrowseLabel({ cityName: context.cityName, countryCode: context.countryCode }) ||
            context.label}
        </span>
        <span className="hidden text-xs text-[#999] lg:inline">· {radiusLabel(context.radiusKm)}</span>
      </button>

      {open ? (
        <div className="fixed inset-0 z-60 flex items-start justify-center bg-black/40 p-4 pt-20">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#111]">Browsing location</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full p-1 text-[#666] hover:bg-[#F7F7F7]"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                const suggestion = ipSuggestion.data;
                if (!suggestion?.countryCode) return;
                setDraft((current) => ({
                  ...current,
                  locationId: suggestion.locationId ?? null,
                  label: suggestion.label,
                  countryCode: suggestion.countryCode,
                  regionCode: suggestion.regionCode ?? null,
                  cityName: suggestion.cityName ?? null,
                  locationSource: "ip_suggestion" as LocationSource,
                }));
              }}
              disabled={!ipSuggestion.data?.countryCode}
              className="mb-4 flex w-full items-center gap-2 rounded-md border border-[#D7DDE0] px-3 py-2 text-sm font-medium text-[#007782] transition-colors hover:border-[#007782] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Locate className="h-4 w-4" />
              {ipSuggestion.data?.countryCode
                ? `Use suggested location (${ipSuggestion.data.label})`
                : "Suggested location unavailable"}
            </button>

            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#666]">
              Country
            </label>
            <select
              value={draft.countryCode}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  countryCode: event.target.value,
                  label: countryName(event.target.value),
                  locationId: null,
                  cityName: null,
                  regionCode: null,
                  locationSource: "manual_selection",
                }))
              }
              className="mb-4 h-10 w-full rounded-md border border-[#C9DADD] bg-white px-3 text-sm text-[#111] focus:border-[#007782] focus:outline-none focus:ring-2 focus:ring-[#007782]/20"
            >
              {countryOptions.map((country) => (
                <option key={country.code} value={country.code}>
                  {country.name}
                </option>
              ))}
            </select>

            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#666]">
              City
            </label>
            <input
              type="text"
              value={cityQuery}
              onChange={(event) => setCityQuery(event.target.value)}
              placeholder={draft.cityName ?? "Search for a city..."}
              className="mb-1 h-10 w-full rounded-md border border-[#C9DADD] bg-white px-3 text-sm text-[#111] focus:border-[#007782] focus:outline-none focus:ring-2 focus:ring-[#007782]/20"
            />
            <div className="mb-4 max-h-44 overflow-y-auto rounded-md border border-[#EEE]">
              {suggestQuery.isFetching ? (
                <div className="flex items-center gap-2 px-3 py-2 text-sm text-[#666]">
                  <Loader2 className="h-4 w-4 animate-spin" /> Searching...
                </div>
              ) : debouncedQuery.length >= 2 && suggestions.length === 0 ? (
                <p className="px-3 py-2 text-sm text-[#999]">No cities found.</p>
              ) : (
                suggestions.map((place) => (
                  <button
                    key={place.locationId}
                    type="button"
                    onClick={() => {
                      setDraft((current) => ({
                        ...current,
                        locationId: place.locationId,
                        label: place.label,
                        countryCode: place.countryCode,
                        regionCode: place.regionCode,
                        cityName: place.cityName,
                        locationSource: "manual_selection",
                      }));
                      setCityQuery("");
                      setDebouncedQuery("");
                    }}
                    className={`block w-full px-3 py-2 text-left text-sm transition-colors hover:bg-[#F2FAFB] ${
                      draft.locationId === place.locationId ? "bg-[#E6F3F4] text-[#007782]" : "text-[#111]"
                    }`}
                  >
                    {place.label}
                  </button>
                ))
              )}
            </div>

            {draft.cityName ? (
              <p className="mb-4 text-sm text-[#444]">
                Selected: <span className="font-semibold">{draft.label}</span>
              </p>
            ) : null}

            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#666]">
              Search radius
            </label>
            <select
              value={draft.radiusKm === null ? "any" : String(draft.radiusKm)}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  radiusKm: event.target.value === "any" ? null : Number(event.target.value),
                }))
              }
              className="mb-4 h-10 w-full rounded-md border border-[#C9DADD] bg-white px-3 text-sm text-[#111] focus:border-[#007782] focus:outline-none focus:ring-2 focus:ring-[#007782]/20"
            >
              {RADIUS_OPTIONS.map((option) => (
                <option key={option.label} value={option.value === null ? "any" : String(option.value)}>
                  {option.label}
                </option>
              ))}
            </select>

            <div className="mb-5 space-y-2">
              <label className="flex items-center gap-2 text-sm text-[#111]">
                <input
                  type="checkbox"
                  checked={draft.includeDomesticShipping}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, includeDomesticShipping: event.target.checked }))
                  }
                  className="h-4 w-4 rounded border-[#C9DADD] text-[#007782] focus:ring-[#007782]"
                />
                Include domestic shipping results
              </label>
              <label className="flex items-center gap-2 text-sm text-[#111]">
                <input
                  type="checkbox"
                  checked={draft.includeInternationalShipping}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      includeInternationalShipping: event.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-[#C9DADD] text-[#007782] focus:ring-[#007782]"
                />
                Include international results
              </label>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md px-4 py-2 text-sm font-semibold text-[#555] hover:text-[#111]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => applyAndClose(draft)}
                className="rounded-md bg-[#007782] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#005f66]"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
