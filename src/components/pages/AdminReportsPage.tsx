"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  Download,
  ExternalLink,
  Filter,
  Flag,
  Inbox,
  MessageSquareWarning,
  Search,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { AdminButton, AdminPanel } from "@/components/admin/users/AdminUserShared";
import { trpc } from "@/providers/app-providers";

type TargetType = "all" | "listing" | "user" | "message";

const targetOptions: TargetType[] = ["all", "listing", "user", "message"];

const targetConfig = {
  listing: {
    label: "Listing",
    icon: Flag,
    tone: "bg-[#FFEBEE] text-[#B71C1C]",
    href: (id: number) => `/admin/listings/${id}`,
  },
  user: {
    label: "User",
    icon: UserRound,
    tone: "bg-[#EEF2FF] text-[#3347A0]",
    href: (id: number) => `/admin/users/${id}`,
  },
  message: {
    label: "Message",
    icon: MessageSquareWarning,
    tone: "bg-[#FFF3E0] text-[#E65100]",
    href: (id?: number | null) => (id != null ? `/admin/chat-safety/${id}` : "/admin/chat-safety"),
  },
};

function formatLabel(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function csvValue(value: string | number | Date | null | undefined) {
  const normalized = String(value ?? "")
    .replaceAll(/\r\n|\n|\r/g, " ")
    .replaceAll('"', '""');
  return `"${normalized}"`;
}

export default function AdminReportsPage() {
  const [query, setQuery] = useState("");
  const [targetType, setTargetType] = useState<TargetType>("all");
  const utils = trpc.useUtils();
  const queue = trpc.moderation.queue.useQuery();
  const updateReport = trpc.moderation.updateReport.useMutation({
    onSuccess: () => utils.moderation.queue.invalidate(),
  });

  const reports = useMemo(() => queue.data ?? [], [queue.data]);
  const filteredReports = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return reports.filter((report) => {
      if (targetType !== "all" && report.targetType !== targetType) return false;
      if (!normalizedQuery) return true;
      return [
        report.id,
        report.targetType,
        report.targetId,
        report.reason,
        report.details,
        report.reporterId,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [query, reports, targetType]);

  const summary = useMemo(() => {
    const counts = { listing: 0, user: 0, message: 0 };
    for (const report of reports) counts[report.targetType] += 1;
    return [
      { label: "Open reports", value: reports.length, icon: Inbox, accent: "text-[#E65100]" },
      { label: "Listing reports", value: counts.listing, icon: Flag },
      { label: "User reports", value: counts.user, icon: UserRound },
      { label: "Message reports", value: counts.message, icon: MessageSquareWarning },
    ];
  }, [reports]);

  function updateStatus(id: number, status: "reviewing" | "resolved" | "dismissed") {
    updateReport.mutate({ id, status });
  }

  function exportCsv() {
    const headers = [
      "Report ID",
      "Target Type",
      "Target ID",
      "Reason",
      "Details",
      "Reporter ID",
      "Created",
    ];
    const rows = filteredReports.map((report) => [
      report.id,
      report.targetType,
      report.targetId,
      report.reason,
      report.details,
      report.reporterId,
      report.createdAt,
    ]);
    const csv = [headers, ...rows].map((row) => row.map(csvValue).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "bookswap-open-reports.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  const pendingReportId = updateReport.variables?.id;
  const hasReports = reports.length > 0;
  const hasFilteredReports = filteredReports.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#111]">Reports queue</h1>
          <p className="mt-1 text-sm text-[#666]">
            Triage open marketplace reports and route them to the right moderation surface.
          </p>
        </div>
        <AdminButton onClick={exportCsv} disabled={!hasFilteredReports}>
          <Download className="h-4 w-4" />
          Export CSV
        </AdminButton>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summary.map(({ label, value, icon: Icon, accent }) => (
          <AdminPanel key={label} className="p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-[#666]">{label}</p>
              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-[#F2FAFA] text-[#007782]">
                <Icon className="h-4 w-4" />
              </span>
            </div>
            <p className={`mt-3 text-3xl font-bold ${accent ?? "text-[#111]"}`}>{value}</p>
          </AdminPanel>
        ))}
      </div>

      {queue.error ? (
        <AdminPanel className="border-[#F4B4B4] bg-[#FFF5F5] p-4 text-sm text-[#B71C1C]">
          {queue.error.message}
        </AdminPanel>
      ) : null}

      <AdminPanel className="p-5">
        <div className="grid gap-3 lg:grid-cols-[1fr_220px]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#777]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by report ID, target ID, reason, details, or reporter"
              className="admin-input pl-9"
            />
          </label>
          <label className="relative block">
            <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#777]" />
            <select
              value={targetType}
              onChange={(event) => setTargetType(event.target.value as TargetType)}
              className="admin-input pl-9"
            >
              {targetOptions.map((option) => (
                <option key={option} value={option}>
                  {option === "all" ? "All targets" : `${formatLabel(option)} reports`}
                </option>
              ))}
            </select>
          </label>
        </div>
      </AdminPanel>

      {queue.isLoading ? (
        <AdminPanel className="p-4">
          <div className="h-5 w-48 animate-pulse rounded bg-[#EEF0F2]" />
          <div className="mt-5 space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-24 animate-pulse rounded-lg bg-[#F2F3F5]" />
            ))}
          </div>
        </AdminPanel>
      ) : null}

      {!queue.isLoading && !hasReports ? (
        <AdminPanel className="p-8 text-center">
          <ShieldCheck className="mx-auto h-10 w-10 text-[#007782]" />
          <h2 className="mt-3 text-lg font-bold text-[#111]">No open reports</h2>
          <p className="mt-1 text-sm text-[#666]">
            New listing, user, and message reports will appear here for staff review.
          </p>
        </AdminPanel>
      ) : null}

      {!queue.isLoading && hasReports && !hasFilteredReports ? (
        <AdminPanel className="p-6 text-sm text-[#666]">
          No open reports match the current filters.
        </AdminPanel>
      ) : null}

      {!queue.isLoading && hasFilteredReports ? (
        <div className="space-y-3">
          {filteredReports.map((report) => {
            const config = targetConfig[report.targetType];
            const Icon = config.icon;
            const isPending = updateReport.isPending && pendingReportId === report.id;
            return (
              <AdminPanel key={report.id} className="p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${config.tone}`}>
                        <Icon className="h-3.5 w-3.5" />
                        {config.label}
                      </span>
                      <span className="rounded-full bg-[#F2F3F5] px-2.5 py-1 text-xs font-semibold text-[#555]">
                        Report #{report.id}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-[#777]">
                        <Clock3 className="h-3.5 w-3.5" />
                        {formatDate(report.createdAt)}
                      </span>
                    </div>
                    <div className="mt-3">
                      <h2 className="text-base font-bold text-[#111]">
                        {formatLabel(report.reason)}
                      </h2>
                      <p className="mt-1 text-sm text-[#666]">
                        Target {config.label.toLowerCase()} #{report.targetId} reported by user #
                        {report.reporterId}
                      </p>
                    </div>
                    {report.details ? (
                      <p className="mt-3 rounded-lg bg-[#F7F8F9] p-3 text-sm leading-6 text-[#444]">
                        {report.details}
                      </p>
                    ) : (
                      <p className="mt-3 rounded-lg bg-[#F7F8F9] p-3 text-sm text-[#777]">
                        No additional details provided by the reporter.
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2 lg:w-72 lg:justify-end">
                    <Link
                      href={config.href(report.targetId)}
                      className="inline-flex items-center justify-center gap-2 rounded-md border border-[#D7DDE0] bg-white px-3 py-2 text-sm font-semibold text-[#273444] transition-colors hover:border-[#007782] hover:text-[#007782]"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Open target
                    </Link>
                    <AdminButton
                      onClick={() => updateStatus(report.id, "reviewing")}
                      disabled={updateReport.isPending}
                    >
                      Reviewing
                    </AdminButton>
                    <AdminButton
                      variant="primary"
                      onClick={() => updateStatus(report.id, "resolved")}
                      disabled={updateReport.isPending}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Resolve
                    </AdminButton>
                    <AdminButton
                      variant="ghost"
                      onClick={() => updateStatus(report.id, "dismissed")}
                      disabled={updateReport.isPending}
                    >
                      {isPending ? "Saving..." : "Dismiss"}
                    </AdminButton>
                  </div>
                </div>
              </AdminPanel>
            );
          })}
        </div>
      ) : null}

      {updateReport.error ? (
        <AdminPanel className="border-[#F4B4B4] bg-[#FFF5F5] p-4 text-sm text-[#B71C1C]">
          {updateReport.error.message}
        </AdminPanel>
      ) : null}
    </div>
  );
}
