"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Clock, RotateCcw, XCircle } from "lucide-react";

import { trpc } from "@/providers/app-providers";
import { bookPath, profilePath } from "@/lib/slugs";

const statusOptions = ["all", "pending", "accepted", "completed", "declined", "cancelled", "expired"] as const;
const typeOptions = ["all", "swap_request", "giveaway_request", "sale_reservation"] as const;

const typeLabels: Record<string, string> = {
  swap_request: "Swap request",
  giveaway_request: "Giveaway request",
  sale_reservation: "Sale reservation",
};

const statusStyles: Record<string, string> = {
  pending: "bg-[#FFF8E1] text-[#8D4E00]",
  accepted: "bg-[#E5F4F5] text-[#007782]",
  completed: "bg-[#E8F5E9] text-[#2E7D32]",
  declined: "bg-[#F2F3F5] text-[#555]",
  cancelled: "bg-[#FFF5F5] text-[#B71C1C]",
  expired: "bg-[#FFF5F5] text-[#B71C1C]",
};

function formatDate(value: Date | string | null) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatMoney(currency: string | null, price: number | null) {
  if (price == null) return null;
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency ?? "USD",
  }).format(price);
}

export function AdminTransactionsPage() {
  const [status, setStatus] = useState<(typeof statusOptions)[number]>("all");
  const [type, setType] = useState<(typeof typeOptions)[number]>("all");
  const utils = trpc.useUtils();

  const transactions = trpc.admin.transactions.useQuery({
    status: status === "all" ? undefined : status,
    type: type === "all" ? undefined : type,
    limit: 75,
  });

  const updateTransaction = trpc.admin.updateTransaction.useMutation({
    onSuccess: () => {
      utils.admin.transactions.invalidate();
      utils.admin.dashboard.invalidate();
    },
  });

  const rows = transactions.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#111]">Transactions & reservations</h1>
          <p className="mt-1 text-sm text-[#666]">
            Inspect swap, giveaway, and sale flows without merging their marketplace rules.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <label className="text-xs font-semibold uppercase tracking-wide text-[#666]">
            Status
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as typeof status)}
              className="mt-1 block rounded-md border border-[#D6DADF] bg-white px-3 py-2 text-sm normal-case tracking-normal text-[#111]"
            >
              {statusOptions.map((option) => (
                <option key={option} value={option}>
                  {option === "all" ? "All statuses" : option}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold uppercase tracking-wide text-[#666]">
            Type
            <select
              value={type}
              onChange={(event) => setType(event.target.value as typeof type)}
              className="mt-1 block rounded-md border border-[#D6DADF] bg-white px-3 py-2 text-sm normal-case tracking-normal text-[#111]"
            >
              {typeOptions.map((option) => (
                <option key={option} value={option}>
                  {option === "all" ? "All types" : typeLabels[option]}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {transactions.error ? (
        <p className="rounded-md bg-white p-4 text-sm text-[#D32F2F]">
          {transactions.error.message}
        </p>
      ) : null}

      <section className="overflow-hidden rounded-xl border border-[#E2E4E8] bg-white">
        {transactions.isLoading ? (
          <p className="p-5 text-sm text-[#666]">Loading transactions...</p>
        ) : rows.length === 0 ? (
          <p className="p-5 text-sm text-[#666]">No transactions match these filters.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[#ECEEF1] text-sm">
              <thead className="bg-[#F8F9FA] text-left text-xs font-semibold uppercase tracking-wide text-[#666]">
                <tr>
                  <th className="px-4 py-3">Listing</th>
                  <th className="px-4 py-3">People</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Timing</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ECEEF1]">
                {rows.map((transaction) => {
                  const isAccepted = transaction.status === "accepted";
                  const canComplete = isAccepted;
                  const canCancel = transaction.status === "pending" || isAccepted;
                  const price = formatMoney(transaction.currency, transaction.price);
                  const listingPath = transaction.bookPublicId
                    ? bookPath({
                        title: transaction.bookTitle ?? "book",
                        publicId: transaction.bookPublicId,
                      })
                    : null;
                  const requesterPath = transaction.requesterPublicId
                    ? profilePath({
                        name: transaction.requesterName,
                        publicId: transaction.requesterPublicId,
                      })
                    : null;
                  const ownerPath = transaction.ownerPublicId
                    ? profilePath({
                        name: transaction.ownerName,
                        publicId: transaction.ownerPublicId,
                      })
                    : null;

                  return (
                    <tr key={transaction.id} className="align-top">
                      <td className="max-w-xs px-4 py-4">
                        {listingPath ? (
                          <Link href={listingPath} className="font-semibold text-[#111] hover:text-[#007782]">
                            {transaction.bookTitle ?? "Removed listing"}
                          </Link>
                        ) : (
                          <span className="font-semibold text-[#111]">
                            {transaction.bookTitle ?? "Removed listing"}
                          </span>
                        )}
                        <p className="mt-1 text-xs text-[#666]">
                          {transaction.bookAuthor ?? "Unknown author"} · listing {transaction.bookStatus ?? "unknown"}
                        </p>
                        {transaction.offeredBookTitle ? (
                          <p className="mt-1 text-xs text-[#007782]">
                            Offered: {transaction.offeredBookTitle} ({transaction.offeredBookStatus})
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-4">
                        <div className="space-y-1 text-xs">
                          <p>
                            <span className="font-semibold text-[#666]">Requester: </span>
                            {requesterPath ? (
                              <Link href={requesterPath} className="text-[#111] hover:text-[#007782]">
                                {transaction.requesterName ?? transaction.requesterEmail ?? "Unknown"}
                              </Link>
                            ) : (
                              <span>{transaction.requesterName ?? transaction.requesterEmail ?? "Unknown"}</span>
                            )}
                          </p>
                          <p>
                            <span className="font-semibold text-[#666]">Owner: </span>
                            {ownerPath ? (
                              <Link href={ownerPath} className="text-[#111] hover:text-[#007782]">
                                {transaction.ownerName ?? transaction.ownerEmail ?? "Unknown"}
                              </Link>
                            ) : (
                              <span>{transaction.ownerName ?? transaction.ownerEmail ?? "Unknown"}</span>
                            )}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-medium text-[#111]">{typeLabels[transaction.type]}</p>
                        {price ? <p className="mt-1 text-xs text-[#666]">{price}</p> : null}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[transaction.status]}`}>
                          {transaction.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-xs text-[#666]">
                        <p className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          Created {formatDate(transaction.createdAt)}
                        </p>
                        {transaction.type === "sale_reservation" ? (
                          <p className="mt-1">Expires {formatDate(transaction.reservationExpiresAt)}</p>
                        ) : null}
                        {transaction.completedAt ? (
                          <p className="mt-1">Completed {formatDate(transaction.completedAt)}</p>
                        ) : null}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex justify-end gap-2">
                          {canComplete ? (
                            <button
                              type="button"
                              onClick={() => updateTransaction.mutate({ id: transaction.id, status: "completed" })}
                              disabled={updateTransaction.isPending}
                              className="inline-flex items-center gap-1 rounded-md bg-[#2E7D32] px-3 py-2 text-xs font-semibold text-white hover:bg-[#1B5E20] disabled:opacity-50"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Complete
                            </button>
                          ) : null}
                          {canCancel ? (
                            <button
                              type="button"
                              onClick={() => updateTransaction.mutate({ id: transaction.id, status: "cancelled" })}
                              disabled={updateTransaction.isPending}
                              className="inline-flex items-center gap-1 rounded-md border border-[#C9D2D6] px-3 py-2 text-xs font-semibold text-[#444] hover:bg-[#F2F3F5] disabled:opacity-50"
                            >
                              {isAccepted ? <RotateCcw className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                              Cancel
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
