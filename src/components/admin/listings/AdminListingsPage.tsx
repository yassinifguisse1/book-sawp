"use client";

import Link from "next/link";
import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Eye,
  Flag,
  MoreHorizontal,
  Pencil,
  RotateCcw,
  Search,
  ShieldAlert,
  Trash2,
} from "lucide-react";

import {
  defaultListingFilters,
  duplicateStatuses,
  formatDate,
  formatLabel,
  formatMoney,
  listingConditions,
  listingStatuses,
  listingTypes,
  moderationStatuses,
  photoFilters,
  riskLevels,
  schoolTypes,
  sellerTypes,
} from "./data";
import { trpc } from "@/providers/app-providers";
import type {
  AdminListing,
  ListingAction,
  ListingFilters,
  ListingStatus,
  ModerationStatus,
  SortDirection,
  SortKey,
} from "./types";

type PendingAction = {
  action: ListingAction | "bulk_hide" | "bulk_remove" | "bulk_restore" | "bulk_flag";
  listing?: AdminListing;
  selectedIds?: string[];
};

const pageSize = 5;

const statusTone: Record<ListingStatus | ModerationStatus | "medium_risk" | "high_risk", string> = {
  draft: "bg-[#F2F3F5] text-[#555]",
  active: "bg-[#E8F5E9] text-[#2E7D32]",
  reserved: "bg-[#E5F4F5] text-[#007782]",
  completed: "bg-[#EEF2FF] text-[#3347A0]",
  expired: "bg-[#FFF7E0] text-[#8A5A00]",
  hidden: "bg-[#FFF3E0] text-[#E65100]",
  removed: "bg-[#FFEBEE] text-[#B71C1C]",
  normal: "bg-[#F2F3F5] text-[#555]",
  flagged: "bg-[#FFF3E0] text-[#E65100]",
  reported: "bg-[#FFEBEE] text-[#B71C1C]",
  under_review: "bg-[#E5F4F5] text-[#007782]",
  medium_risk: "bg-[#FFF3E0] text-[#E65100]",
  high_risk: "bg-[#FFEBEE] text-[#B71C1C]",
};

function Badge({ value }: { value: string }) {
  return (
    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${statusTone[value as keyof typeof statusTone] ?? "bg-[#F2F3F5] text-[#555]"}`}>
      {formatLabel(value)}
    </span>
  );
}

function SelectFilter({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-1 text-xs font-semibold text-[#555]">
      <span>{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-lg border border-[#DDE1E5] bg-white px-3 text-sm font-medium text-[#111] outline-none focus:border-[#007782]"
      >
        <option value="all">All</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {formatLabel(option)}
          </option>
        ))}
      </select>
    </label>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-[#E2E4E8] bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#777]">{label}</p>
      <p className="mt-2 text-2xl font-bold text-[#111]">{value}</p>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="rounded-xl border border-[#E2E4E8] bg-white p-4">
      <div className="h-5 w-48 animate-pulse rounded bg-[#EEF0F2]" />
      <div className="mt-5 space-y-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="h-14 animate-pulse rounded-lg bg-[#F2F3F5]" />
        ))}
      </div>
    </div>
  );
}

function exportCsv(listings: AdminListing[], filename: string) {
  const headers = [
    "Listing ID",
    "Title",
    "Author",
    "Type",
    "Seller",
    "Status",
    "Moderation",
    "Risk",
    "Reports",
    "Created",
  ];
  const rows = listings.map((listing) => [
    listing.id,
    listing.title,
    listing.author,
    listing.listingType,
    listing.sellerName,
    listing.listingStatus,
    listing.moderationStatus,
    listing.riskLevel,
    String(listing.reportsCount),
    listing.createdAt,
  ]);
  const csv = [headers, ...rows]
    .map((row) => row.map((value) => `"${value.replaceAll('"', '""')}"`).join(","))
    .join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function AdminListingsPage() {
  const [filters, setFilters] = useState<ListingFilters>(defaultListingFilters);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [page, setPage] = useState(1);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [reason, setReason] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [notifySeller, setNotifySeller] = useState(true);
  const [metadataDraft, setMetadataDraft] = useState({
    title: "",
    author: "",
    genre: "",
    language: "",
    condition: "good" as AdminListing["condition"],
    isbn: "",
  });

  const utils = trpc.useUtils();
  const listingsQuery = trpc.admin.listings.useQuery({
    filters,
    page,
    pageSize,
    sortKey,
    sortDirection,
  });
  const moderateListings = trpc.admin.moderateListings.useMutation({
    onSuccess: () => {
      resetModal();
      setSelectedIds(new Set());
      utils.admin.listings.invalidate();
      utils.admin.listingDetail.invalidate();
      utils.admin.dashboard.invalidate();
    },
  });
  const updateMetadata = trpc.admin.updateListingMetadata.useMutation({
    onSuccess: () => {
      resetModal();
      utils.admin.listings.invalidate();
      utils.admin.listingDetail.invalidate();
    },
  });

  const visibleListings = listingsQuery.data?.rows ?? [];
  const totalListings = listingsQuery.data?.total ?? 0;
  const totalPages = listingsQuery.data?.pageCount ?? 1;
  const summary = listingsQuery.data?.summary ?? {
    active: 0,
    newThisWeek: 0,
    sell: 0,
    swap: 0,
    giveaway: 0,
    flagged: 0,
    reported: 0,
    removed: 0,
  };
  const options = listingsQuery.data?.options;

  function updateFilter<Key extends keyof ListingFilters>(key: Key, value: ListingFilters[Key]) {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
    setSelectedIds(new Set());
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDirection((direction) => (direction === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
    setPage(1);
  }

  function toggleSelected(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectVisible(checked: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current);
      visibleListings.forEach((listing) => {
        if (checked) next.add(listing.id);
        else next.delete(listing.id);
      });
      return next;
    });
  }

  function listingNumericId(listing: AdminListing) {
    return listing.numericId ?? Number(listing.id);
  }

  function openAction(action: PendingAction["action"], listing?: AdminListing, selectedIdsForAction?: string[]) {
    setPendingAction({ action, listing, selectedIds: selectedIdsForAction });
    setReason("");
    setInternalNote("");
    setNotifySeller(true);
    if (listing && action === "edit_metadata") {
      setMetadataDraft({
        title: listing.title,
        author: listing.author,
        genre: listing.category,
        language: listing.language,
        condition: listing.condition,
        isbn: listing.isbn,
      });
    }
  }

  function resetModal() {
    setPendingAction(null);
    setReason("");
    setInternalNote("");
  }

  function applyAction() {
    if (!pendingAction) return;
    const action = pendingAction.action;
    if (action === "edit_metadata" && pendingAction.listing) {
      updateMetadata.mutate({
        listingId: listingNumericId(pendingAction.listing),
        title: metadataDraft.title,
        author: metadataDraft.author,
        genre: metadataDraft.genre,
        language: metadataDraft.language,
        condition: metadataDraft.condition,
        isbn: metadataDraft.isbn,
      });
      return;
    }

    const actionMap = {
      hide_listing: "hide_listing",
      remove_listing: "remove_listing",
      restore_listing: "restore_listing",
      flag_suspicious: "flag_suspicious",
      mark_reviewed: "mark_reviewed",
      bulk_hide: "hide_listing",
      bulk_remove: "remove_listing",
      bulk_restore: "restore_listing",
      bulk_flag: "flag_suspicious",
    } as const;
    const mappedAction = actionMap[action as keyof typeof actionMap];
    if (!mappedAction) return;
    const targetIds = pendingAction.listing
      ? [listingNumericId(pendingAction.listing)]
      : visibleListings
          .filter((listing) => pendingAction.selectedIds?.includes(listing.id))
          .map(listingNumericId);
    moderateListings.mutate({
      listingIds: targetIds,
      action: mappedAction,
      reason,
      internalNote,
      notifySeller,
    });
  }

  const selectedListings = visibleListings.filter((listing) => selectedIds.has(listing.id));
  const isSubmitting = moderateListings.isPending || updateMetadata.isPending;
  const submitError = moderateListings.error?.message ?? updateMetadata.error?.message ?? null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <h1 className="text-2xl font-bold text-[#111]">Listing moderation</h1>
          <p className="mt-1 text-sm text-[#666]">
            Review book listings, safety flags, duplicates, and seller risk.
          </p>
        </div>
        <button
          type="button"
          onClick={() => exportCsv(visibleListings, "bookswap-admin-listings.csv")}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#DDE1E5] bg-white px-4 text-sm font-semibold text-[#111] hover:bg-[#F6F7F8]"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Active listings" value={summary.active} />
        <SummaryCard label="New this week" value={summary.newThisWeek} />
        <SummaryCard label="Sell listings" value={summary.sell} />
        <SummaryCard label="Swap listings" value={summary.swap} />
        <SummaryCard label="Giveaway listings" value={summary.giveaway} />
        <SummaryCard label="Flagged listings" value={summary.flagged} />
        <SummaryCard label="Reported listings" value={summary.reported} />
        <SummaryCard label="Removed listings" value={summary.removed} />
      </div>

      <section className="rounded-xl border border-[#E2E4E8] bg-white p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-[#777]" />
          <input
            value={filters.search}
            onChange={(event) => updateFilter("search", event.target.value)}
            placeholder="Search by title, author, ISBN, listing ID, seller name, school, city, or country"
            className="h-10 w-full rounded-lg border border-[#DDE1E5] bg-white pl-10 pr-3 text-sm outline-none focus:border-[#007782]"
          />
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SelectFilter label="Listing type" value={filters.listingType} options={listingTypes} onChange={(value) => updateFilter("listingType", value as ListingFilters["listingType"])} />
          <SelectFilter label="Listing status" value={filters.listingStatus} options={listingStatuses} onChange={(value) => updateFilter("listingStatus", value as ListingFilters["listingStatus"])} />
          <SelectFilter label="Moderation status" value={filters.moderationStatus} options={moderationStatuses} onChange={(value) => updateFilter("moderationStatus", value as ListingFilters["moderationStatus"])} />
          <SelectFilter label="Risk level" value={filters.riskLevel} options={riskLevels} onChange={(value) => updateFilter("riskLevel", value as ListingFilters["riskLevel"])} />
          <SelectFilter label="Country" value={filters.country} options={options?.countries ?? []} onChange={(value) => updateFilter("country", value)} />
          <SelectFilter label="City" value={filters.city} options={options?.cities ?? []} onChange={(value) => updateFilter("city", value)} />
          <SelectFilter label="Category" value={filters.category} options={options?.categories ?? []} onChange={(value) => updateFilter("category", value)} />
          <SelectFilter label="Education level" value={filters.educationLevel} options={options?.educationLevels ?? []} onChange={(value) => updateFilter("educationLevel", value)} />
          <SelectFilter label="School type" value={filters.schoolType} options={schoolTypes} onChange={(value) => updateFilter("schoolType", value as ListingFilters["schoolType"])} />
          <SelectFilter label="Subject" value={filters.subject} options={options?.subjects ?? []} onChange={(value) => updateFilter("subject", value)} />
          <SelectFilter label="Language" value={filters.language} options={options?.languages ?? []} onChange={(value) => updateFilter("language", value)} />
          <SelectFilter label="Condition" value={filters.condition} options={listingConditions} onChange={(value) => updateFilter("condition", value as ListingFilters["condition"])} />
          <SelectFilter label="Seller type" value={filters.sellerType} options={sellerTypes} onChange={(value) => updateFilter("sellerType", value as ListingFilters["sellerType"])} />
          <SelectFilter label="Created date" value={filters.createdDate} options={["today", "this_week", "this_month"]} onChange={(value) => updateFilter("createdDate", value as ListingFilters["createdDate"])} />
          <SelectFilter label="Reports count" value={filters.reportsCount} options={["has_reports", "three_plus"]} onChange={(value) => updateFilter("reportsCount", value as ListingFilters["reportsCount"])} />
          <SelectFilter label="Photos" value={filters.photos} options={photoFilters} onChange={(value) => updateFilter("photos", value as ListingFilters["photos"])} />
          <SelectFilter label="Duplicate status" value={filters.duplicateStatus} options={duplicateStatuses} onChange={(value) => updateFilter("duplicateStatus", value as ListingFilters["duplicateStatus"])} />
        </div>
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setFilters(defaultListingFilters)}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#DDE1E5] px-4 text-sm font-semibold text-[#111] hover:bg-[#F6F7F8]"
          >
            <RotateCcw className="h-4 w-4" />
            Reset filters
          </button>
        </div>
      </section>

      {listingsQuery.error ? (
        <p className="rounded-xl border border-[#F2C6C6] bg-white p-4 text-sm font-semibold text-[#B71C1C]">
          {listingsQuery.error.message}
        </p>
      ) : null}

      {listingsQuery.isLoading ? (
        <TableSkeleton />
      ) : (
        <section className="overflow-hidden rounded-xl border border-[#E2E4E8] bg-white">
          {selectedIds.size > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2E4E8] bg-[#F8FAFA] px-4 py-3">
              <p className="text-sm font-semibold text-[#111]">{selectedIds.size} selected</p>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => openAction("bulk_hide", undefined, [...selectedIds])} className="rounded-lg border border-[#DDE1E5] bg-white px-3 py-2 text-xs font-semibold text-[#111]">Hide selected</button>
                <button type="button" onClick={() => openAction("bulk_remove", undefined, [...selectedIds])} className="rounded-lg border border-[#F2C6C6] bg-white px-3 py-2 text-xs font-semibold text-[#B71C1C]">Remove selected</button>
                <button type="button" onClick={() => openAction("bulk_restore", undefined, [...selectedIds])} className="rounded-lg border border-[#DDE1E5] bg-white px-3 py-2 text-xs font-semibold text-[#111]">Restore selected</button>
                <button type="button" onClick={() => openAction("bulk_flag", undefined, [...selectedIds])} className="rounded-lg border border-[#DDE1E5] bg-white px-3 py-2 text-xs font-semibold text-[#111]">Flag for review</button>
                <button type="button" onClick={() => exportCsv(selectedListings, "bookswap-selected-listings.csv")} className="rounded-lg border border-[#DDE1E5] bg-white px-3 py-2 text-xs font-semibold text-[#111]">Export selected</button>
              </div>
            </div>
          ) : null}

          <div className="overflow-x-auto">
            <table className="min-w-[1100px] w-full text-left">
              <thead className="bg-[#F6F7F8] text-xs font-bold uppercase tracking-wide text-[#666]">
                <tr>
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      aria-label="Select visible listings"
                      checked={visibleListings.length > 0 && visibleListings.every((listing) => selectedIds.has(listing.id))}
                      onChange={(event) => selectVisible(event.target.checked)}
                    />
                  </th>
                  {[
                    ["Listing", "title"],
                    ["Type", "listingType"],
                    ["Seller", "sellerName"],
                    ["Price", null],
                    ["Location", null],
                    ["Condition", null],
                    ["Listing status", null],
                    ["Moderation", null],
                    ["Reports", "reportsCount"],
                    ["Created", "createdAt"],
                  ].map(([label, key]) => (
                    <th key={label} className="px-4 py-3">
                      {key ? (
                        <button type="button" onClick={() => toggleSort(key as SortKey)} className="font-bold">
                          {label}
                        </button>
                      ) : (
                        label
                      )}
                    </th>
                  ))}
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8EAED]">
                {visibleListings.map((listing) => (
                  <tr key={listing.id} className="align-top">
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        aria-label={`Select ${listing.id}`}
                        checked={selectedIds.has(listing.id)}
                        onChange={() => toggleSelected(listing.id)}
                      />
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex min-w-64 gap-3">
                        {listing.coverImageUrl ? (
                          <img src={listing.coverImageUrl} alt="" className="h-16 w-12 rounded-md object-cover" />
                        ) : (
                          <div className="flex h-16 w-12 items-center justify-center rounded-md bg-[#F2F3F5] text-[10px] font-bold text-[#777]">
                            No photo
                          </div>
                        )}
                        <div>
                          <Link href={`/admin/listings/${listing.id}`} className="font-semibold text-[#111] hover:text-[#007782]">
                            {listing.title}
                          </Link>
                          <p className="mt-1 text-xs text-[#666]">{listing.author}</p>
                          <p className="mt-1 text-xs font-semibold text-[#777]">{listing.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4"><Badge value={listing.listingType} /></td>
                    <td className="px-4 py-4">
                      <p className="font-medium text-[#111]">{listing.sellerName}</p>
                      <p className="mt-1 text-xs text-[#666]">{formatLabel(listing.sellerType)}</p>
                    </td>
                    <td className="px-4 py-4 text-sm font-semibold text-[#111]">
                      {listing.listingType === "sale" ? formatMoney(listing.priceAmountMinor, listing.currencyCode) : "N/A"}
                    </td>
                    <td className="px-4 py-4 text-sm text-[#555]">{listing.city}, {listing.country}</td>
                    <td className="px-4 py-4"><Badge value={listing.condition} /></td>
                    <td className="px-4 py-4"><Badge value={listing.listingStatus} /></td>
                    <td className="px-4 py-4">
                      <div className="space-y-2">
                        <Badge value={listing.moderationStatus} />
                        <Badge value={listing.riskLevel} />
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm font-bold text-[#111]">{listing.reportsCount}</td>
                    <td className="px-4 py-4 text-sm text-[#555]">{formatDate(listing.createdAt)}</td>
                    <td className="px-4 py-4">
                      <details className="relative">
                        <summary className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-lg border border-[#DDE1E5] text-[#555]">
                          <MoreHorizontal className="h-4 w-4" />
                        </summary>
                        <div className="absolute right-0 z-10 mt-2 w-48 rounded-lg border border-[#DDE1E5] bg-white p-1 shadow-lg">
                          <Link href={`/admin/listings/${listing.id}`} className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-[#111] hover:bg-[#F6F7F8]"><Eye className="h-4 w-4" />View details</Link>
                          <button type="button" onClick={(event) => { openAction("edit_metadata", listing); event.currentTarget.closest("details")?.removeAttribute("open"); }} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-[#111] hover:bg-[#F6F7F8]"><Pencil className="h-4 w-4" />Edit metadata</button>
                          <button type="button" onClick={(event) => { openAction("hide_listing", listing); event.currentTarget.closest("details")?.removeAttribute("open"); }} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-[#111] hover:bg-[#F6F7F8]"><ShieldAlert className="h-4 w-4" />Hide listing</button>
                          <button type="button" onClick={(event) => { openAction("remove_listing", listing); event.currentTarget.closest("details")?.removeAttribute("open"); }} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-[#B71C1C] hover:bg-[#FFF5F5]"><Trash2 className="h-4 w-4" />Remove listing</button>
                          <button type="button" onClick={(event) => { openAction("restore_listing", listing); event.currentTarget.closest("details")?.removeAttribute("open"); }} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-[#111] hover:bg-[#F6F7F8]"><RotateCcw className="h-4 w-4" />Restore listing</button>
                          <button type="button" onClick={(event) => { openAction("flag_suspicious", listing); event.currentTarget.closest("details")?.removeAttribute("open"); }} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-[#111] hover:bg-[#F6F7F8]"><Flag className="h-4 w-4" />Flag suspicious</button>
                          <button type="button" onClick={(event) => { openAction("mark_reviewed", listing); event.currentTarget.closest("details")?.removeAttribute("open"); }} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-[#111] hover:bg-[#F6F7F8]"><CheckCircle2 className="h-4 w-4" />Mark reviewed</button>
                          <Link href={`/admin/users/${listing.sellerId}`} className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-[#111] hover:bg-[#F6F7F8]">View seller profile</Link>
                        </div>
                      </details>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {visibleListings.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
              <AlertTriangle className="h-8 w-8 text-[#E65100]" />
              <p className="mt-3 font-semibold text-[#111]">No listings match these filters.</p>
              <p className="mt-1 text-sm text-[#666]">Reset filters or broaden the search query.</p>
            </div>
          ) : null}

          <div className="flex flex-col justify-between gap-3 border-t border-[#E2E4E8] px-4 py-3 text-sm text-[#666] md:flex-row md:items-center">
            <span>
              Showing {visibleListings.length === 0 ? 0 : (page - 1) * pageSize + 1}-
              {Math.min(page * pageSize, totalListings)} of {totalListings}
            </span>
            <div className="flex gap-2">
              <button type="button" disabled={page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="rounded-lg border border-[#DDE1E5] px-3 py-2 font-semibold disabled:opacity-40">Previous</button>
              <span className="px-2 py-2 font-semibold text-[#111]">Page {page} of {totalPages}</span>
              <button type="button" disabled={page === totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))} className="rounded-lg border border-[#DDE1E5] px-3 py-2 font-semibold disabled:opacity-40">Next</button>
            </div>
          </div>
        </section>
      )}

      {pendingAction ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-5 shadow-xl">
            <h2 className="text-lg font-bold text-[#111]">{formatLabel(pendingAction.action)}</h2>
            <p className="mt-1 text-sm text-[#666]">
              This action updates the live listing record and writes a moderation audit event.
            </p>
            <div className="mt-4 grid gap-3">
              {pendingAction.action === "edit_metadata" ? (
                <>
                  <label className="text-sm font-semibold text-[#555]">
                    Title
                    <input value={metadataDraft.title} onChange={(event) => setMetadataDraft((current) => ({ ...current, title: event.target.value }))} className="mt-1 h-10 w-full rounded-lg border border-[#DDE1E5] px-3 text-sm" />
                  </label>
                  <label className="text-sm font-semibold text-[#555]">
                    Author
                    <input value={metadataDraft.author} onChange={(event) => setMetadataDraft((current) => ({ ...current, author: event.target.value }))} className="mt-1 h-10 w-full rounded-lg border border-[#DDE1E5] px-3 text-sm" />
                  </label>
                  <label className="text-sm font-semibold text-[#555]">
                    Genre
                    <input value={metadataDraft.genre} onChange={(event) => setMetadataDraft((current) => ({ ...current, genre: event.target.value }))} className="mt-1 h-10 w-full rounded-lg border border-[#DDE1E5] px-3 text-sm" />
                  </label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-sm font-semibold text-[#555]">
                      Language
                      <input value={metadataDraft.language} onChange={(event) => setMetadataDraft((current) => ({ ...current, language: event.target.value }))} className="mt-1 h-10 w-full rounded-lg border border-[#DDE1E5] px-3 text-sm" />
                    </label>
                    <label className="text-sm font-semibold text-[#555]">
                      Condition
                      <select value={metadataDraft.condition} onChange={(event) => setMetadataDraft((current) => ({ ...current, condition: event.target.value as AdminListing["condition"] }))} className="mt-1 h-10 w-full rounded-lg border border-[#DDE1E5] px-3 text-sm">
                        {listingConditions.map((condition) => (
                          <option key={condition} value={condition}>{formatLabel(condition)}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <label className="text-sm font-semibold text-[#555]">
                    ISBN
                    <input value={metadataDraft.isbn} onChange={(event) => setMetadataDraft((current) => ({ ...current, isbn: event.target.value }))} className="mt-1 h-10 w-full rounded-lg border border-[#DDE1E5] px-3 text-sm" />
                  </label>
                </>
              ) : null}
              {pendingAction.action !== "edit_metadata" ? (
                <>
                  <label className="text-sm font-semibold text-[#555]">
                    Reason
                    <input value={reason} onChange={(event) => setReason(event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-[#DDE1E5] px-3 text-sm" />
                  </label>
                  <label className="text-sm font-semibold text-[#555]">
                    Internal note
                    <textarea value={internalNote} onChange={(event) => setInternalNote(event.target.value)} className="mt-1 min-h-24 w-full rounded-lg border border-[#DDE1E5] px-3 py-2 text-sm" />
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm font-semibold text-[#555]">
                    <input type="checkbox" checked={notifySeller} onChange={(event) => setNotifySeller(event.target.checked)} />
                    Notify seller
                  </label>
                </>
              ) : null}
              {submitError ? (
                <p className="rounded-lg border border-[#F2C6C6] bg-[#FFF5F5] p-3 text-sm font-semibold text-[#B71C1C]">
                  {submitError}
                </p>
              ) : null}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" disabled={isSubmitting} onClick={resetModal} className="rounded-lg border border-[#DDE1E5] px-4 py-2 text-sm font-semibold text-[#111] disabled:opacity-50">Cancel</button>
              <button
                type="button"
                onClick={applyAction}
                disabled={
                  isSubmitting ||
                  (pendingAction.action !== "edit_metadata" && (!reason.trim() || !internalNote.trim())) ||
                  (pendingAction.action === "edit_metadata" && (!metadataDraft.title.trim() || !metadataDraft.author.trim() || !metadataDraft.genre.trim()))
                }
                className="rounded-lg bg-[#007782] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-[#9FBFC3]"
              >
                {isSubmitting ? "Saving..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
