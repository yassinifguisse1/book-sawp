"use client";

import { useState } from "react";
import { BookOpen, MapPin, X } from "lucide-react";
import { useLocationPreference } from "@/hooks/useLocationPreference";
import {
  countryOptions,
  dismissLocationPreference,
  getCountryName,
  saveLocationPreference,
  shouldShowLocationPrompt,
} from "@/lib/location-preference";

export function LocationPreferencePrompt() {
  const preference = useLocationPreference();
  const savedCountry = preference?.savedAt ? preference.country : null;
  const [selectedCountry, setSelectedCountry] = useState("US");
  const [isEditing, setIsEditing] = useState(false);
  const shouldPrompt = isEditing || shouldShowLocationPrompt(preference);

  if (!shouldPrompt && savedCountry) {
    return (
      <section className="border-b border-[#E0E0E0] bg-white">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2 text-sm text-[#555]">
            <MapPin className="h-4 w-4 shrink-0 text-[#007782]" />
            <span className="font-medium text-[#111]">Browsing all books</span>
            <span className="text-[#777]">Country preference: {getCountryName(savedCountry)}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setSelectedCountry(savedCountry);
              setIsEditing(true);
            }}
            className="text-sm font-semibold text-[#007782] hover:text-[#005f66]"
          >
            Change location
          </button>
        </div>
      </section>
    );
  }

  if (!shouldPrompt) return null;

  return (
    <section className="border-b border-[#D7E7EA] bg-[#F2FAFA]">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:justify-between">
        <div className="flex gap-3">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-[#007782] shadow-sm">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#111]">
              Find books near your reading community
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-[#555]">
              Choose your country to make future book swaps easier. You can still browse all books.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <select
            value={selectedCountry}
            onChange={(event) => setSelectedCountry(event.target.value)}
            className="h-10 rounded-md border border-[#C9DADD] bg-white px-3 text-sm font-medium text-[#111] focus:border-[#007782] focus:outline-none focus:ring-2 focus:ring-[#007782]/20"
            aria-label="Country preference"
          >
            {countryOptions.map((country) => (
              <option key={country.code} value={country.code}>
                {country.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => {
              saveLocationPreference(selectedCountry);
              setIsEditing(false);
            }}
            className="h-10 rounded-md bg-[#007782] px-4 text-sm font-bold text-white transition-colors hover:bg-[#005f66]"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => {
              dismissLocationPreference(selectedCountry);
              setIsEditing(false);
            }}
            className="inline-flex h-10 items-center justify-center gap-1 rounded-md border border-[#C9DADD] bg-white px-3 text-sm font-semibold text-[#555] transition-colors hover:border-[#007782] hover:text-[#007782]"
          >
            <X className="h-4 w-4" />
            Not now
          </button>
        </div>
      </div>
    </section>
  );
}
