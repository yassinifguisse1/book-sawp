"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeftRight,
  BookOpen,
  CheckCircle2,
  Flag,
  Gauge,
  Gift,
  ShieldCheck,
  ShoppingBag,
  UserCheck,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { trpc } from "@/providers/app-providers";

type ActivityRow = {
  day: string;
  count: number;
};

function formatPercent(value: number) {
  if (!Number.isFinite(value)) return "0%";
  return `${Math.round(value)}%`;
}

function getPercent(value: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((value / total) * 100);
}

function StatCard({
  label,
  value,
  helper,
  icon: Icon,
  tone = "neutral",
}: {
  label: string;
  value: number;
  helper: string;
  icon: LucideIcon;
  tone?: "neutral" | "good" | "warning" | "danger" | "brand";
}) {
  const tones = {
    neutral: "bg-[#F6F7F8] text-[#111]",
    good: "bg-[#E8F5E9] text-[#2E7D32]",
    warning: "bg-[#FFF4E5] text-[#B85C00]",
    danger: "bg-[#FFF0F0] text-[#B71C1C]",
    brand: "bg-[#E5F4F5] text-[#007782]",
  };

  return (
    <div className="rounded-lg border border-[#E1E5E8] bg-white p-4 shadow-[0_1px_0_rgb(17_17_17/0.03)]">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-[#555]">{label}</p>
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${tones[tone]}`}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-3 text-3xl font-bold leading-none text-[#111]">{value}</p>
      <p className="mt-2 text-xs font-medium text-[#777]">{helper}</p>
    </div>
  );
}

function Panel({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-[#E1E5E8] bg-white p-5 shadow-[0_1px_0_rgb(17_17_17/0.03)]">
      <div>
        {eyebrow ? (
          <p className="text-xs font-bold uppercase tracking-wide text-[#777]">{eyebrow}</p>
        ) : null}
        <h2 className="text-base font-bold text-[#111]">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function ActivityBars({ rows, emptyLabel }: { rows: ActivityRow[]; emptyLabel: string }) {
  const max = Math.max(...rows.map((row) => row.count), 1);

  if (rows.length === 0) {
    return <p className="mt-4 text-sm text-[#666]">{emptyLabel}</p>;
  }

  return (
    <div className="mt-4 flex h-36 items-end gap-2">
      {rows.map((row) => {
        const height = Math.max(10, Math.round((row.count / max) * 100));
        const day = new Intl.DateTimeFormat(undefined, {
          month: "short",
          day: "numeric",
        }).format(new Date(`${row.day}T00:00:00`));

        return (
          <div key={row.day} className="flex min-w-0 flex-1 flex-col items-center gap-2">
            <div className="flex h-24 w-full items-end rounded-md bg-[#F4F6F7] px-1">
              <div
                className="w-full rounded-sm bg-[#007782]"
                style={{ height: `${height}%` }}
                title={`${day}: ${row.count}`}
              />
            </div>
            <div className="text-center">
              <p className="text-xs font-bold text-[#111]">{row.count}</p>
              <p className="text-[11px] font-medium text-[#777]">{day}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function AdminDashboard() {
  const dashboard = trpc.admin.dashboard.useQuery();

  if (dashboard.isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-20 animate-pulse rounded-lg bg-white" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="h-32 animate-pulse rounded-lg bg-white" />
          ))}
        </div>
      </div>
    );
  }
  if (dashboard.error) {
    return (
      <p className="rounded-md bg-white p-4 text-sm text-[#D32F2F]">
        {dashboard.error.message}
      </p>
    );
  }

  const data = dashboard.data;
  if (!data) return null;

  const { totals, listingsByType, countryDistribution, dailyActivity } = data;
  const totalListingsByMode =
    listingsByType.sale + listingsByType.swap + listingsByType.giveaway;
  const totalTransactions = totals.completedExchanges + totals.cancelledExchanges;
  const verificationRate = getPercent(totals.verifiedUsers, totals.totalUsers);
  const completionRate = getPercent(totals.completedExchanges, totalTransactions);
  const cancellationRate = getPercent(totals.cancelledExchanges, totalTransactions);
  const openIssues = totals.openReports + totals.suspendedUsers;
  const marketplaceState =
    openIssues > 0 ? "Needs review" : totals.activeListings > 0 ? "Stable" : "Needs inventory";
  const countryMax = Math.max(...countryDistribution.map((row) => row.count), 1);
  const quickActions = [
    {
      href: "/admin/reports",
      label: "Review reports",
      value: totals.openReports,
      icon: Flag,
      tone: totals.openReports > 0 ? "text-[#E65100]" : "text-[#007782]",
    },
    {
      href: "/admin/transactions",
      label: "Check transactions",
      value: totals.reservations,
      icon: ArrowLeftRight,
      tone: "text-[#007782]",
    },
    {
      href: "/admin/listings",
      label: "Manage listings",
      value: totals.activeListings,
      icon: BookOpen,
      tone: "text-[#111]",
    },
  ];
  const listingModes = [
    { label: "Sale", value: listingsByType.sale, icon: ShoppingBag, tone: "bg-[#EAF3FF] text-[#2458A6]" },
    { label: "Swap", value: listingsByType.swap, icon: ArrowLeftRight, tone: "bg-[#E5F4F5] text-[#007782]" },
    { label: "Giveaway", value: listingsByType.giveaway, icon: Gift, tone: "bg-[#F0F7EC] text-[#2E7D32]" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
        <section className="rounded-lg border border-[#D7E5E7] bg-[#F7FBFB] p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-[#007782]">
                Admin overview
              </p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#111]">Dashboard</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#555]">
                Monitor marketplace trust, book inventory, and transaction pressure from one place.
              </p>
            </div>
            <div className="rounded-md border border-[#CFE4E6] bg-white px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-wide text-[#777]">Marketplace state</p>
              <p className="mt-1 flex items-center gap-2 text-sm font-bold text-[#111]">
                <Gauge className="h-4 w-4 text-[#007782]" />
                {marketplaceState}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-[#E1E5E8] bg-white p-5">
          <p className="text-sm font-bold text-[#111]">Priority actions</p>
          <div className="mt-4 space-y-2">
            {quickActions.map(({ href, label, value, icon: Icon, tone }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center justify-between gap-4 rounded-md border border-[#ECEFF1] px-3 py-3 text-sm transition-colors hover:border-[#BFDADC] hover:bg-[#F7FBFB]"
              >
                <span className="flex items-center gap-3 font-semibold text-[#111]">
                  <Icon className={`h-4 w-4 ${tone}`} />
                  {label}
                </span>
                <span className="rounded-full bg-[#F1F3F4] px-2.5 py-1 text-xs font-bold text-[#555]">
                  {value}
                </span>
              </Link>
            ))}
          </div>
        </section>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total users"
          value={totals.totalUsers}
          helper={`${verificationRate}% email verified`}
          icon={Users}
        />
        <StatCard
          label="Verified users"
          value={totals.verifiedUsers}
          helper="Eligible trust base"
          icon={UserCheck}
          tone="brand"
        />
        <StatCard
          label="Active listings"
          value={totals.activeListings}
          helper={`${totalListingsByMode} categorized by mode`}
          icon={BookOpen}
        />
        <StatCard
          label="Reservations"
          value={totals.reservations}
          helper="Books currently held"
          icon={ArrowLeftRight}
          tone="brand"
        />
        <StatCard
          label="Completed exchanges"
          value={totals.completedExchanges}
          helper={`${completionRate}% of closed transactions`}
          icon={CheckCircle2}
          tone="good"
        />
        <StatCard
          label="Cancelled exchanges"
          value={totals.cancelledExchanges}
          helper={`${cancellationRate}% cancellation rate`}
          icon={AlertTriangle}
          tone={totals.cancelledExchanges > 0 ? "danger" : "neutral"}
        />
        <StatCard
          label="Open reports"
          value={totals.openReports}
          helper={totals.openReports > 0 ? "Needs moderation" : "Queue is clear"}
          icon={Flag}
          tone={totals.openReports > 0 ? "warning" : "neutral"}
        />
        <StatCard
          label="Suspended users"
          value={totals.suspendedUsers}
          helper="Restricted accounts"
          icon={ShieldCheck}
          tone={totals.suspendedUsers > 0 ? "danger" : "neutral"}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Listing mode mix" eyebrow="Inventory">
          <div className="mt-5 space-y-4">
            {listingModes.map(({ label, value, icon: Icon, tone }) => {
              const percent = getPercent(value, totalListingsByMode);
              return (
                <div key={label}>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className={`flex h-8 w-8 items-center justify-center rounded-md ${tone}`}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="text-sm font-bold text-[#111]">{label}</p>
                        <p className="text-xs font-medium text-[#777]">{formatPercent(percent)} of active listings</p>
                      </div>
                    </div>
                    <p className="text-lg font-bold text-[#111]">{value}</p>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#EEF1F2]">
                    <div className="h-full rounded-full bg-[#007782]" style={{ width: `${percent}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel title="Country distribution" eyebrow="Community">
          {countryDistribution.length === 0 ? (
            <div className="mt-5 rounded-md border border-dashed border-[#D5DBDF] bg-[#FAFBFB] p-5">
              <p className="text-sm font-semibold text-[#111]">No country data yet</p>
              <p className="mt-1 text-sm text-[#666]">
                Ask users for location preferences before scaling local discovery.
              </p>
            </div>
          ) : (
            <ul className="mt-5 space-y-3">
              {countryDistribution.map((row) => (
                <li key={row.country}>
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <span className="font-semibold text-[#111]">{row.country}</span>
                    <span className="font-bold text-[#555]">{row.count}</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#EEF1F2]">
                    <div
                      className="h-full rounded-full bg-[#2E7D32]"
                      style={{ width: `${Math.max(8, getPercent(row.count, countryMax))}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel title="Daily activity" eyebrow="Last 7 days">
        <div className="mt-5 grid gap-8 lg:grid-cols-2">
          <div className="min-w-0">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-bold text-[#111]">New users</p>
              <p className="text-xs font-semibold text-[#777]">
                {dailyActivity.users.reduce((sum, row) => sum + row.count, 0)} total
              </p>
            </div>
            <ActivityBars rows={dailyActivity.users} emptyLabel="No new users." />
          </div>
          <div className="min-w-0">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-bold text-[#111]">New listings</p>
              <p className="text-xs font-semibold text-[#777]">
                {dailyActivity.listings.reduce((sum, row) => sum + row.count, 0)} total
              </p>
            </div>
            <ActivityBars rows={dailyActivity.listings} emptyLabel="No new listings." />
          </div>
        </div>
      </Panel>
    </div>
  );
}
