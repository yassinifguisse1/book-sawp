"use client";

import { useEffect, useRef, useState } from "react";
import { SlidersHorizontal, ArrowUpDown, X } from "lucide-react";
import { FilterDrawer } from "./FilterDrawer";

const transactionFilters = [
  { label: "All", value: "" },
  { label: "Swap", value: "swap" },
  { label: "Giveaway", value: "giveaway" },
  { label: "For Sale", value: "sale" },
];

const sortLabels: Record<string, string> = {
  relevance: "Best match",
  recent: "Recently Added",
  distance: "Closest first",
  price_asc: "Price: Low to High",
  price_desc: "Price: High to Low",
};

const deliveryLabels: Record<string, string> = {
  both: "Pickup or shipping",
  pickup: "Pickup only",
  ship: "Shipping only",
};

interface FilterBarProps {
  transactionType: string;
  sort: string;
  delivery: string;
  includeDomesticShipping: boolean;
  includeInternationalShipping: boolean;
  genreParam: string;
  searchParam: string;
  categoryParam: string;
  onParamChange: (updates: Record<string, string | null>) => void;
}

export function FilterBar({
  transactionType,
  sort,
  delivery,
  includeDomesticShipping,
  includeInternationalShipping,
  genreParam,
  searchParam,
  categoryParam,
  onParamChange,
}: FilterBarProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<"filters" | "sort">("filters");
  const [isStuck, setIsStuck] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        // Sentinel leaves the top offset area => the bar is stuck.
        setIsStuck(!entry.isIntersecting);
      },
      {
        rootMargin: "-110px 0px 0px 0px",
        threshold: 0,
      }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);
  const activeFilters: Array<{ label: string; key: string; value: string | null }> = [];
  if (genreParam) activeFilters.push({ label: genreParam, key: "genre", value: null });
  if (searchParam) activeFilters.push({ label: `\"${searchParam}\"`, key: "search", value: null });
  if (categoryParam) activeFilters.push({ label: categoryParam, key: "category", value: null });
  if (transactionType) {
    const txLabel = transactionFilters.find((f) => f.value === transactionType)?.label ?? transactionType;
    activeFilters.push({ label: txLabel, key: "transactionType", value: null });
  }
  if (sort !== "relevance") activeFilters.push({ label: sortLabels[sort] ?? sort, key: "sort", value: "relevance" });
  if (delivery !== "both") activeFilters.push({ label: deliveryLabels[delivery] ?? delivery, key: "delivery", value: "both" });
  if (!includeDomesticShipping) activeFilters.push({ label: "No domestic shipping", key: "domestic", value: "1" });
  if (includeInternationalShipping) activeFilters.push({ label: "International", key: "intl", value: "0" });

  const openDrawer = (tab: "filters" | "sort") => {
    setDrawerTab(tab);
    setDrawerOpen(true);
  };

  return (
    <>
      <FilterDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        activeTab={drawerTab}
        sort={sort}
        delivery={delivery}
        includeDomesticShipping={includeDomesticShipping}
        includeInternationalShipping={includeInternationalShipping}
        onParamChange={onParamChange}
      />

      <div ref={sentinelRef} className="h-px" aria-hidden="true" />
      <section
        className={`sticky top-[110px] z-40 transition-colors duration-200 ${
          isStuck ? "border-b border-[#E0E0E0] bg-white/95 backdrop-blur-sm" : "bg-transparent"
        }`}
      >
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-3 px-4 py-3">
          {/* Transaction pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {transactionFilters.map((filter) => (
              <button
                key={filter.value}
                onClick={() => onParamChange({ transactionType: filter.value || null })}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                  transactionType === filter.value
                    ? "bg-[#007782] text-white shadow-sm"
                    : "bg-[#F7F7F7] text-[#2C2C2C] hover:bg-[#EEEEEE]"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <div className="flex-1" />

          {/* Filter & Sort buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => openDrawer("filters")}
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                delivery !== "both" || !includeDomesticShipping || includeInternationalShipping
                  ? "bg-[#E6F3F4] text-[#007782]"
                  : "bg-[#F7F7F7] text-[#2C2C2C] hover:bg-[#EEEEEE]"
              }`}
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filters
            </button>
            <button
              type="button"
              onClick={() => openDrawer("sort")}
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                sort !== "relevance"
                  ? "bg-[#E6F3F4] text-[#007782]"
                  : "bg-[#F7F7F7] text-[#2C2C2C] hover:bg-[#EEEEEE]"
              }`}
            >
              <ArrowUpDown className="h-4 w-4" />
              {sortLabels[sort] ?? "Sort"}
            </button>
          </div>
        </div>

        {/* Active filter chips */}
        {activeFilters.length > 0 && (
          <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-2 px-4 pb-3">
            <span className="text-xs text-[#999]">Filters:</span>
            {activeFilters.map((filter) => (
              <button
                key={`${filter.key}-${filter.label}`}
                onClick={() => onParamChange({ [filter.key]: filter.value })}
                className="inline-flex items-center gap-1 rounded-full bg-[#E6F3F4] px-2.5 py-1 text-xs font-medium text-[#007782] transition-colors hover:bg-[#D0EBED]"
              >
                {filter.label}
                <X className="h-3 w-3" />
              </button>
            ))}
            <button
              type="button"
              onClick={() =>
                onParamChange({
                  genre: null,
                  search: null,
                  category: null,
                  transactionType: null,
                  sort: "relevance",
                  delivery: "both",
                  domestic: "1",
                  intl: "0",
                })
              }
              className="text-xs font-medium text-[#666] underline-offset-2 hover:text-[#007782] hover:underline"
            >
              Clear all
            </button>
          </div>
        )}
      </section>
    </>
  );
}
