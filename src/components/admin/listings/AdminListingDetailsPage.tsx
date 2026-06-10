"use client";

import Link from "next/link";
import { useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Flag,
  ImageOff,
  ShieldAlert,
  Trash2,
} from "lucide-react";

import { trpc } from "@/providers/app-providers";
import { formatDate, formatLabel, formatMoney } from "./data";
import type { AdminListing } from "./types";

type Tab = "overview" | "photos" | "safety" | "reports" | "history";

const tabs: Array<{ id: Tab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "photos", label: "Photos" },
  { id: "safety", label: "Description and Safety Flags" },
  { id: "reports", label: "Reports" },
  { id: "history", label: "Moderation History" },
];

function Badge({ value }: { value: string }) {
  const tones: Record<string, string> = {
    active: "bg-[#E8F5E9] text-[#2E7D32]",
    reserved: "bg-[#E5F4F5] text-[#007782]",
    hidden: "bg-[#FFF3E0] text-[#E65100]",
    removed: "bg-[#FFEBEE] text-[#B71C1C]",
    normal: "bg-[#F2F3F5] text-[#555]",
    reported: "bg-[#FFEBEE] text-[#B71C1C]",
    flagged: "bg-[#FFF3E0] text-[#E65100]",
    under_review: "bg-[#E5F4F5] text-[#007782]",
    high_risk: "bg-[#FFEBEE] text-[#B71C1C]",
    medium_risk: "bg-[#FFF3E0] text-[#E65100]",
  };
  return (
    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${tones[value] ?? "bg-[#F2F3F5] text-[#555]"}`}>
      {formatLabel(value)}
    </span>
  );
}

function Field({ label, value }: { label: string; value: string | number | null }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-[#777]">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[#111]">{value || "Not provided"}</p>
    </div>
  );
}

function ActionModal({
  title,
  onClose,
  onConfirm,
  isSubmitting,
  error,
}: {
  title: string;
  onClose: () => void;
  onConfirm: (payload: { reason: string; internalNote: string; notifySeller: boolean }) => void;
  isSubmitting: boolean;
  error?: string | null;
}) {
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [notifySeller, setNotifySeller] = useState(true);
  const requiresReason = !/reviewed/i.test(title);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-5 shadow-xl">
        <h2 className="text-lg font-bold text-[#111]">{title}</h2>
        <p className="mt-1 text-sm text-[#666]">
          This action updates the live listing record and writes a moderation audit event.
        </p>
        {requiresReason ? (
          <div className="mt-4 grid gap-3">
            <label className="text-sm font-semibold text-[#555]">
              Reason
              <input value={reason} onChange={(event) => setReason(event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-[#DDE1E5] px-3 text-sm" />
            </label>
            <label className="text-sm font-semibold text-[#555]">
              Internal note
              <textarea value={note} onChange={(event) => setNote(event.target.value)} className="mt-1 min-h-24 w-full rounded-lg border border-[#DDE1E5] px-3 py-2 text-sm" />
            </label>
            <label className="inline-flex items-center gap-2 text-sm font-semibold text-[#555]">
              <input type="checkbox" checked={notifySeller} onChange={(event) => setNotifySeller(event.target.checked)} />
              Notify seller
            </label>
          </div>
        ) : null}
        {error ? (
          <p className="mt-4 rounded-lg border border-[#F2C6C6] bg-[#FFF5F5] p-3 text-sm font-semibold text-[#B71C1C]">
            {error}
          </p>
        ) : null}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" disabled={isSubmitting} onClick={onClose} className="rounded-lg border border-[#DDE1E5] px-4 py-2 text-sm font-semibold text-[#111] disabled:opacity-50">Cancel</button>
          <button
            type="button"
            disabled={requiresReason && (!reason.trim() || !note.trim())}
            onClick={() => onConfirm({ reason, internalNote: note, notifySeller })}
            className="rounded-lg bg-[#007782] px-4 py-2 text-sm font-semibold text-white disabled:bg-[#9FBFC3]"
          >
            {isSubmitting ? "Saving..." : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Overview({ listing }: { listing: AdminListing }) {
  return (
    <div className="grid gap-4 rounded-xl border border-[#E2E4E8] bg-white p-5 md:grid-cols-3">
      <Field label="Title" value={listing.title} />
      <Field label="Author" value={listing.author} />
      <Field label="ISBN" value={listing.isbn} />
      <Field label="Edition" value={listing.edition} />
      <Field label="Language" value={listing.language} />
      <Field label="Category" value={listing.category} />
      <Field label="Education level" value={listing.educationLevel} />
      <Field label="Grade" value={listing.grade} />
      <Field label="School type" value={formatLabel(listing.schoolType)} />
      <Field label="School name" value={listing.schoolName} />
      <Field label="Subject" value={listing.subject} />
      <Field label="Listing type" value={formatLabel(listing.listingType)} />
      <Field label="Price" value={formatMoney(listing.priceAmountMinor, listing.currencyCode)} />
      <Field label="Currency" value={listing.currencyCode} />
      <Field label="Condition" value={formatLabel(listing.condition)} />
      <Field label="Country" value={listing.country} />
      <Field label="City" value={listing.city} />
      <Field label="Delivery options" value={listing.deliveryOptions.join(", ")} />
      <Field label="Seller verification" value={listing.sellerVerified ? "Verified" : "Not verified"} />
      <Field label="Views" value={listing.viewsCount} />
      <Field label="Favorites" value={listing.favoritesCount} />
      <Field label="Reservation requests" value={listing.reservationRequestsCount} />
      <Field label="Reports count" value={listing.reportsCount} />
      <Field label="Duplicate status" value={formatLabel(listing.duplicateStatus)} />
    </div>
  );
}

function Photos({ listing, openAction }: { listing: AdminListing; openAction: (title: string) => void }) {
  if (listing.imageUrls.length === 0) {
    return (
      <div className="rounded-xl border border-[#E2E4E8] bg-white p-8 text-center">
        <ImageOff className="mx-auto h-8 w-8 text-[#777]" />
        <p className="mt-3 font-semibold text-[#111]">This listing has no photos.</p>
      </div>
    );
  }
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {listing.imageUrls.map((imageUrl, index) => (
        <article key={imageUrl} className="overflow-hidden rounded-xl border border-[#E2E4E8] bg-white">
          <a href={imageUrl} target="_blank" rel="noreferrer">
            <img src={imageUrl} alt={`${listing.title} photo ${index + 1}`} className="h-64 w-full object-cover" />
          </a>
          <div className="flex flex-wrap gap-2 p-3">
            <button type="button" onClick={() => openAction("Remove image")} className="rounded-lg border border-[#DDE1E5] px-3 py-2 text-xs font-semibold">Remove image</button>
            <button type="button" onClick={() => openAction("Mark image as inappropriate")} className="rounded-lg border border-[#DDE1E5] px-3 py-2 text-xs font-semibold">Mark inappropriate</button>
            <button type="button" onClick={() => openAction("Request seller update")} className="rounded-lg border border-[#DDE1E5] px-3 py-2 text-xs font-semibold">Request update</button>
            <button type="button" onClick={() => openAction("Set primary image")} className="rounded-lg border border-[#DDE1E5] px-3 py-2 text-xs font-semibold">Set primary</button>
          </div>
        </article>
      ))}
    </div>
  );
}

function Safety({ listing }: { listing: AdminListing }) {
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <section className="rounded-xl border border-[#E2E4E8] bg-white p-5">
        <h2 className="text-base font-bold text-[#111]">Description</h2>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#444]">{listing.description}</p>
      </section>
      <section className="rounded-xl border border-[#E2E4E8] bg-white p-5">
        <h2 className="text-base font-bold text-[#111]">Safety rule matches</h2>
        {listing.safetyFlags.length === 0 ? (
          <p className="mt-3 text-sm text-[#666]">No deterministic rule matches.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {listing.safetyFlags.map((flag) => (
              <li key={flag.id} className="rounded-lg bg-[#FFF7E8] p-3">
                <p className="text-sm font-bold text-[#111]">{flag.label}</p>
                <p className="mt-1 text-xs font-semibold text-[#E65100]">{flag.ruleId}</p>
                <p className="mt-2 text-sm text-[#555]">{flag.snippet}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Reports({ listing }: { listing: AdminListing }) {
  return (
    <section className="rounded-xl border border-[#E2E4E8] bg-white p-5">
      <h2 className="text-base font-bold text-[#111]">Reports</h2>
      {listing.reports.length === 0 ? (
        <p className="mt-3 text-sm text-[#666]">No listing reports.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-[900px] w-full text-left text-sm">
            <thead className="text-xs font-bold uppercase tracking-wide text-[#666]">
              <tr>
                <th className="py-2">Report ID</th>
                <th>Reporter</th>
                <th>Reason</th>
                <th>Description</th>
                <th>Created</th>
                <th>Status</th>
                <th>Assigned</th>
                <th>Resolution</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8EAED]">
              {listing.reports.map((report) => (
                <tr key={report.id}>
                  <td className="py-3 font-semibold text-[#111]">{report.id}</td>
                  <td>{report.reporter}</td>
                  <td>{formatLabel(report.reason)}</td>
                  <td>{report.description}</td>
                  <td>{formatDate(report.createdAt)}</td>
                  <td><Badge value={report.status} /></td>
                  <td>{report.assignedModerator}</td>
                  <td>{report.resolution || "Pending"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function resolveListingNumericId(listing: AdminListing): number | null {
  if (
    typeof listing.numericId === "number" &&
    Number.isInteger(listing.numericId) &&
    listing.numericId > 0
  ) {
    return listing.numericId;
  }

  const parsed = Number.parseInt(String(listing.id), 10);
  if (Number.isInteger(parsed) && parsed > 0) {
    return parsed;
  }

  return null;
}

function History({ listing }: { listing: AdminListing }) {
  return (
    <section className="rounded-xl border border-[#E2E4E8] bg-white p-5">
      <h2 className="text-base font-bold text-[#111]">Moderation history</h2>
      <div className="mt-4 space-y-3">
        {listing.moderationHistory.map((entry) => (
          <article key={entry.id} className="rounded-lg border border-[#E8EAED] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold text-[#111]">{entry.action}</p>
              <p className="text-xs font-semibold text-[#777]">{formatDate(entry.date)}</p>
            </div>
            <p className="mt-2 text-sm text-[#555]">Moderator: {entry.moderator}</p>
            <p className="mt-1 text-sm text-[#555]">Reason: {entry.reason}</p>
            <p className="mt-1 text-sm text-[#555]">Internal note: {entry.internalNote}</p>
            <p className="mt-2 text-xs font-semibold text-[#777]">
              {formatLabel(entry.previousStatus)} to {formatLabel(entry.newStatus)}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function AdminListingDetailsPage({ listingId }: { listingId: string }) {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [modalTitle, setModalTitle] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const numericListingId = Number(listingId);
  const utils = trpc.useUtils();
  const listingQuery = trpc.admin.listingDetail.useQuery(
    { listingId: numericListingId },
    { enabled: Number.isInteger(numericListingId) && numericListingId > 0 },
  );
  const moderateListings = trpc.admin.moderateListings.useMutation({
    onSuccess: () => {
      setModalTitle(null);
      setActionError(null);
      utils.admin.listingDetail.invalidate({ listingId: numericListingId });
      utils.admin.listings.invalidate();
      utils.admin.dashboard.invalidate();
    },
  });
  const listing = listingQuery.data;

  function actionFromTitle(title: string) {
    if (/hide/i.test(title)) return "hide_listing";
    if (/remove/i.test(title)) return "remove_listing";
    if (/restore/i.test(title)) return "restore_listing";
    if (/flag/i.test(title)) return "flag_suspicious";
    return "mark_reviewed";
  }

  function confirmAction(payload: { reason: string; internalNote: string; notifySeller: boolean }) {
    if (!modalTitle || !listing) return;

    const listingNumericId = resolveListingNumericId(listing);
    if (listingNumericId === null) {
      setActionError(
        "This listing is missing a valid numeric ID, so the moderation action cannot be saved.",
      );
      return;
    }

    setActionError(null);
    moderateListings.mutate({
      listingIds: [listingNumericId],
      action: actionFromTitle(modalTitle),
      reason: payload.reason,
      internalNote: payload.internalNote,
      notifySeller: payload.notifySeller,
    });
  }

  if (listingQuery.isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-32 animate-pulse rounded-xl bg-[#EEF0F2]" />
        <div className="h-80 animate-pulse rounded-xl bg-[#EEF0F2]" />
      </div>
    );
  }

  if (listingQuery.error) {
    return (
      <div className="rounded-xl border border-[#F2C6C6] bg-white p-6 text-sm font-semibold text-[#B71C1C]">
        {listingQuery.error.message}
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="rounded-xl border border-[#E2E4E8] bg-white p-8">
        <AlertTriangle className="h-8 w-8 text-[#E65100]" />
        <h1 className="mt-3 text-xl font-bold text-[#111]">Listing not found</h1>
        <p className="mt-1 text-sm text-[#666]">No listing exists for ID {listingId}.</p>
        <Link href="/admin/listings" className="mt-4 inline-flex rounded-lg bg-[#007782] px-4 py-2 text-sm font-semibold text-white">
          Back to listings
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link href="/admin/listings" className="inline-flex items-center gap-2 text-sm font-semibold text-[#007782]">
        <ArrowLeft className="h-4 w-4" />
        Back to listing moderation
      </Link>

      <section className="rounded-xl border border-[#E2E4E8] bg-white p-5">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
          <div className="flex gap-4">
            {listing.coverImageUrl ? (
              <img src={listing.coverImageUrl} alt="" className="h-28 w-20 rounded-lg object-cover" />
            ) : (
              <div className="flex h-28 w-20 items-center justify-center rounded-lg bg-[#F2F3F5] text-xs font-bold text-[#777]">No photo</div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-[#111]">{listing.title}</h1>
              <p className="mt-1 text-sm text-[#666]">{listing.id} by {listing.author}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge value={listing.listingType} />
                <Badge value={listing.listingStatus} />
                <Badge value={listing.moderationStatus} />
                <Badge value={listing.riskLevel} />
              </div>
              <p className="mt-3 text-sm text-[#555]">
                Seller: <span className="font-semibold text-[#111]">{listing.sellerName}</span> · {listing.city}, {listing.country}
              </p>
              <p className="mt-1 text-xs text-[#777]">
                Created {formatDate(listing.createdAt)} · Updated {formatDate(listing.updatedAt)}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setModalTitle("Hide listing")} className="inline-flex items-center gap-2 rounded-lg border border-[#DDE1E5] px-3 py-2 text-sm font-semibold"><ShieldAlert className="h-4 w-4" />Hide</button>
            <button type="button" onClick={() => setModalTitle("Remove listing")} className="inline-flex items-center gap-2 rounded-lg border border-[#F2C6C6] px-3 py-2 text-sm font-semibold text-[#B71C1C]"><Trash2 className="h-4 w-4" />Remove</button>
            <button type="button" onClick={() => setModalTitle("Restore listing")} className="inline-flex items-center gap-2 rounded-lg border border-[#DDE1E5] px-3 py-2 text-sm font-semibold">Restore</button>
            <button type="button" onClick={() => setModalTitle("Flag as suspicious")} className="inline-flex items-center gap-2 rounded-lg border border-[#DDE1E5] px-3 py-2 text-sm font-semibold"><Flag className="h-4 w-4" />Flag</button>
            <button type="button" onClick={() => setModalTitle("Mark as reviewed")} className="inline-flex items-center gap-2 rounded-lg bg-[#007782] px-3 py-2 text-sm font-semibold text-white"><CheckCircle2 className="h-4 w-4" />Reviewed</button>
          </div>
        </div>
      </section>

      <div className="overflow-x-auto rounded-xl border border-[#E2E4E8] bg-white p-2">
        <div className="flex min-w-max gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                activeTab === tab.id ? "bg-[#E5F4F5] text-[#007782]" : "text-[#555] hover:bg-[#F6F7F8]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "overview" ? <Overview listing={listing} /> : null}
      {activeTab === "photos" ? <Photos listing={listing} openAction={setModalTitle} /> : null}
      {activeTab === "safety" ? <Safety listing={listing} /> : null}
      {activeTab === "reports" ? <Reports listing={listing} /> : null}
      {activeTab === "history" ? <History listing={listing} /> : null}

      {modalTitle ? (
        <ActionModal
          title={modalTitle}
          onClose={() => {
            if (!moderateListings.isPending) {
              setModalTitle(null);
              setActionError(null);
            }
          }}
          onConfirm={confirmAction}
          isSubmitting={moderateListings.isPending}
          error={actionError ?? moderateListings.error?.message ?? null}
        />
      ) : null}
    </div>
  );
}
