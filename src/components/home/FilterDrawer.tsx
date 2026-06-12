"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, SlidersHorizontal, ArrowUpDown, MapPin, Truck, Package, Globe, Home } from "lucide-react";

const sortOptions = [
  { label: "Best match", value: "relevance", icon: SlidersHorizontal },
  { label: "Recently Added", value: "recent", icon: ArrowUpDown },
  { label: "Closest first", value: "distance", icon: MapPin },
  { label: "Price: Low to High", value: "price_asc", icon: ArrowUpDown },
  { label: "Price: High to Low", value: "price_desc", icon: ArrowUpDown },
];

const deliveryOptions = [
  { label: "Pickup or shipping", value: "both", icon: Package },
  { label: "Pickup only", value: "pickup", icon: MapPin },
  { label: "Shipping only", value: "ship", icon: Truck },
];

interface FilterDrawerProps {
  open: boolean;
  onClose: () => void;
  activeTab: "filters" | "sort";
  sort: string;
  delivery: string;
  includeDomesticShipping: boolean;
  includeInternationalShipping: boolean;
  onParamChange: (updates: Record<string, string | null>) => void;
}

export function FilterDrawer({
  open,
  onClose,
  activeTab,
  sort,
  delivery,
  includeDomesticShipping,
  includeInternationalShipping,
  onParamChange,
}: FilterDrawerProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.98 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:inset-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-full sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:max-h-[600px]"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#E0E0E0] bg-white px-4 py-3">
              <h3 className="text-base font-bold text-[#2C2C2C]">
                {activeTab === "sort" ? "Sort by" : "Filters"}
              </h3>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-2 text-[#666] transition-colors hover:bg-[#F7F7F7]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4">
              {activeTab === "sort" && (
                <div className="space-y-1">
                  {sortOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        onParamChange({ sort: option.value });
                        onClose();
                      }}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-medium transition-colors ${
                        sort === option.value
                          ? "bg-[#E6F3F4] text-[#007782]"
                          : "text-[#2C2C2C] hover:bg-[#F7F7F7]"
                      }`}
                    >
                      <option.icon className="h-4 w-4 shrink-0" />
                      {option.label}
                      {sort === option.value && (
                        <span className="ml-auto h-2 w-2 rounded-full bg-[#007782]" />
                      )}
                    </button>
                  ))}
                </div>
              )}

              {activeTab === "filters" && (
                <div className="space-y-6">
                  {/* Delivery mode */}
                  <div>
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#666]">
                      Delivery
                    </p>
                    <div className="space-y-1">
                      {deliveryOptions.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => onParamChange({ delivery: option.value })}
                          className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-medium transition-colors ${
                            delivery === option.value
                              ? "bg-[#E6F3F4] text-[#007782]"
                              : "text-[#2C2C2C] hover:bg-[#F7F7F7]"
                          }`}
                        >
                          <option.icon className="h-4 w-4 shrink-0" />
                          {option.label}
                          {delivery === option.value && (
                            <span className="ml-auto h-2 w-2 rounded-full bg-[#007782]" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Shipping scope */}
                  <div>
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#666]">
                      Shipping scope
                    </p>
                    <div className="space-y-2">
                      <label className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-[#F7F7F7]">
                        <input
                          type="checkbox"
                          checked={includeDomesticShipping}
                          onChange={(e) =>
                            onParamChange({ domestic: e.target.checked ? "1" : "0" })
                          }
                          className="h-4 w-4 rounded border-[#C9DADD] text-[#007782] focus:ring-[#007782]"
                        />
                        <Home className="h-4 w-4 text-[#666]" />
                        <span className="text-sm text-[#2C2C2C]">Include domestic shipping</span>
                      </label>
                      <label className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-[#F7F7F7]">
                        <input
                          type="checkbox"
                          checked={includeInternationalShipping}
                          onChange={(e) =>
                            onParamChange({ intl: e.target.checked ? "1" : "0" })
                          }
                          className="h-4 w-4 rounded border-[#C9DADD] text-[#007782] focus:ring-[#007782]"
                        />
                        <Globe className="h-4 w-4 text-[#666]" />
                        <span className="text-sm text-[#2C2C2C]">Include international results</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 border-t border-[#E0E0E0] bg-white p-4">
              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-lg bg-[#007782] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#005f66]"
              >
                Show results
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
