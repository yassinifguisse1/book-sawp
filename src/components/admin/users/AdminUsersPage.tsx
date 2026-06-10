"use client";

import Link from "next/link";
import { useState, type MouseEvent, type ReactNode } from "react";
import {
  Ban,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  MoreHorizontal,
  RotateCcw,
  Search,
  ShieldAlert,
  UserCheck,
  UserPlus,
  Users,
} from "lucide-react";

import { trpc } from "@/providers/app-providers";
import type {
  AccountStatus,
  ActivityFilter,
  AdminUser,
  AdminUserRole,
  JoinedDateFilter,
  RiskStatus,
  SellerType,
  VerificationFilter,
} from "./types";
import { canPerformUserAction } from "./types";
import {
  AccountStatusBadge,
  AdminButton,
  AdminPanel,
  RiskBadge,
  UserActionModal,
  VerificationBadges,
  exportUsersCsv,
  formatAdminDate,
  statusLabel,
  type ModalState,
  type UserActionSubmitPayload,
} from "./AdminUserShared";

type SortKey =
  | "fullName"
  | "country"
  | "activeListingsCount"
  | "completedTransactionsCount"
  | "reportsReceivedCount"
  | "riskStatus"
  | "accountStatus"
  | "joinedAt";

type Filters = {
  query: string;
  accountStatus: "all" | AccountStatus;
  verification: VerificationFilter;
  role: "all" | AdminUserRole;
  country: string;
  city: string;
  joinedDate: JoinedDateFilter;
  activity: ActivityFilter;
  riskStatus: "all" | RiskStatus;
  sellerType: "all" | SellerType;
};

const emptyFilters: Filters = {
  query: "",
  accountStatus: "all",
  verification: "all",
  role: "all",
  country: "all",
  city: "all",
  joinedDate: "all",
  activity: "all",
  riskStatus: "all",
  sellerType: "all",
};

const pageSize = 5;
const currentAdminRole: AdminUserRole = "super_admin";
const accountStatuses: AccountStatus[] = ["active", "suspended", "banned", "deleted"];
const riskStatuses: RiskStatus[] = ["normal", "flagged", "high_risk"];
const roles: AdminUserRole[] = ["user", "moderator", "admin", "super_admin"];
const sellerTypes: SellerType[] = ["private_user", "bookstore", "pro_seller"];
const userActionKinds = new Set(["warn", "suspend", "ban", "restore", "note"]);

export function AdminUsersPage() {
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [sortKey, setSortKey] = useState<SortKey>("joinedAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [modal, setModal] = useState<ModalState>(null);
  const [bulkAction, setBulkAction] = useState("warn");

  const utils = trpc.useUtils();
  const usersQuery = trpc.admin.users.useQuery({
    filters,
    page,
    pageSize,
    sortKey,
    sortDirection,
  });
  const moderateUsers = trpc.admin.moderateUsers.useMutation({
    onSuccess: () => {
      setModal(null);
      setSelectedIds([]);
      utils.admin.users.invalidate();
      utils.admin.userDetail.invalidate();
      utils.admin.dashboard.invalidate();
    },
  });

  const visibleUsers = usersQuery.data?.rows ?? [];
  const countries = usersQuery.data?.options.countries ?? [];
  const cities = usersQuery.data?.options.cities ?? [];
  const pageCount = usersQuery.data?.pageCount ?? 1;
  const totalUsers = usersQuery.data?.total ?? 0;
  const allVisibleSelected =
    visibleUsers.length > 0 && visibleUsers.every((user) => selectedIds.includes(user.id));

  const summaryData = usersQuery.data?.summary;
  const summary = [
    { label: "Total users", value: summaryData?.totalUsers ?? 0, icon: Users },
    {
      label: "Fully verified users",
      value: summaryData?.fullyVerifiedUsers ?? 0,
      icon: UserCheck,
      accent: "text-[#007782]",
    },
    {
      label: "New users this week",
      value: summaryData?.newUsersThisWeek ?? 0,
      icon: UserPlus,
    },
    {
      label: "Flagged users",
      value: summaryData?.flaggedUsers ?? 0,
      icon: ShieldAlert,
      accent: "text-[#E65100]",
    },
    {
      label: "Suspended users",
      value: summaryData?.suspendedUsers ?? 0,
      icon: FileText,
      accent: "text-[#B85D00]",
    },
    {
      label: "Banned users",
      value: summaryData?.bannedUsers ?? 0,
      icon: Ban,
      accent: "text-[#B71C1C]",
    },
  ];

  function updateFilter<Key extends keyof Filters>(key: Key, value: Filters[Key]) {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
    setSelectedIds([]);
  }

  function toggleSort(nextKey: SortKey) {
    if (sortKey === nextKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(nextKey);
    setSortDirection("asc");
  }

  function toggleVisibleSelection() {
    if (allVisibleSelected) {
      setSelectedIds((current) => current.filter((id) => !visibleUsers.some((user) => user.id === id)));
      return;
    }
    setSelectedIds((current) => uniqueNumbers([...current, ...visibleUsers.map((user) => user.id)]));
  }

  function toggleUserSelection(userId: number) {
    setSelectedIds((current) =>
      current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId],
    );
  }

  function openBulkModal() {
    setModal({
      kind: "bulk",
      selectedCount: selectedIds.length,
      userIds: selectedIds,
      bulkAction,
    });
  }

  function handleModalConfirm(payload: UserActionSubmitPayload) {
    if (!modal) return;
    const action = modal.kind === "bulk" ? modal.bulkAction : modal.kind;
    if (!action || !userActionKinds.has(action)) return;
    const userIds = modal.kind === "bulk" ? modal.userIds ?? [] : modal.user ? [modal.user.id] : [];
    if (userIds.length === 0) return;
    moderateUsers.mutate({
      userIds,
      action: action as "warn" | "suspend" | "ban" | "restore" | "note",
      reason: payload.reason,
      duration: payload.duration,
      notifyUser: payload.notifyUser,
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#111]">User management</h1>
          <p className="mt-1 text-sm text-[#666]">
            Search, inspect, and moderate marketplace users.
          </p>
        </div>
        <AdminButton
          onClick={() => exportUsersCsv(visibleUsers)}
          disabled={!canPerformUserAction(currentAdminRole, "export_csv")}
        >
          <Download className="h-4 w-4" />
          Export CSV
        </AdminButton>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
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

      <AdminPanel className="p-5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#777]" />
          <input
            value={filters.query}
            onChange={(event) => updateFilter("query", event.target.value)}
            placeholder="Search by name, email, user ID, phone number, or city"
            className="admin-input pl-9"
          />
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
          <FilterSelect label="Account status" value={filters.accountStatus} onChange={(value) => updateFilter("accountStatus", value as Filters["accountStatus"])}>
            <option value="all">All statuses</option>
            {accountStatuses.map((status) => (
              <option key={status} value={status}>{statusLabel(status)}</option>
            ))}
          </FilterSelect>
          <FilterSelect label="Verification" value={filters.verification} onChange={(value) => updateFilter("verification", value as VerificationFilter)}>
            <option value="all">All verification</option>
            <option value="email_verified">Email verified</option>
            <option value="phone_verified">Phone verified</option>
            <option value="fully_verified">Fully verified</option>
            <option value="not_verified">Not verified</option>
          </FilterSelect>
          <FilterSelect label="Role" value={filters.role} onChange={(value) => updateFilter("role", value as Filters["role"])}>
            <option value="all">All roles</option>
            {roles.map((role) => (
              <option key={role} value={role}>{statusLabel(role)}</option>
            ))}
          </FilterSelect>
          <FilterSelect label="Country" value={filters.country} onChange={(value) => updateFilter("country", value)}>
            <option value="all">All countries</option>
            {countries.map((country) => (
              <option key={country} value={country}>{country}</option>
            ))}
          </FilterSelect>
          <FilterSelect label="City" value={filters.city} onChange={(value) => updateFilter("city", value)}>
            <option value="all">All cities</option>
            {cities.map((city) => (
              <option key={city} value={city}>{city}</option>
            ))}
          </FilterSelect>
          <FilterSelect label="Joined date" value={filters.joinedDate} onChange={(value) => updateFilter("joinedDate", value as JoinedDateFilter)}>
            <option value="all">Any date</option>
            <option value="today">Today</option>
            <option value="this_week">This week</option>
            <option value="this_month">This month</option>
            <option value="this_quarter">This quarter</option>
          </FilterSelect>
          <FilterSelect label="Activity" value={filters.activity} onChange={(value) => updateFilter("activity", value as ActivityFilter)}>
            <option value="all">All activity</option>
            <option value="has_listings">Has listings</option>
            <option value="has_transactions">Has transactions</option>
            <option value="has_reports">Has reports</option>
          </FilterSelect>
          <FilterSelect label="Risk status" value={filters.riskStatus} onChange={(value) => updateFilter("riskStatus", value as Filters["riskStatus"])}>
            <option value="all">All risk</option>
            {riskStatuses.map((risk) => (
              <option key={risk} value={risk}>{statusLabel(risk)}</option>
            ))}
          </FilterSelect>
          <FilterSelect label="Seller type" value={filters.sellerType} onChange={(value) => updateFilter("sellerType", value as Filters["sellerType"])}>
            <option value="all">All sellers</option>
            {sellerTypes.map((type) => (
              <option key={type} value={type}>{statusLabel(type)}</option>
            ))}
          </FilterSelect>
          <div className="flex items-end">
            <AdminButton
              className="w-full"
              onClick={() => {
                setFilters(emptyFilters);
                setPage(1);
                setSelectedIds([]);
              }}
            >
              <RotateCcw className="h-4 w-4" />
              Reset filters
            </AdminButton>
          </div>
        </div>
      </AdminPanel>

      <AdminPanel className="overflow-hidden">
        {selectedIds.length > 0 ? (
          <div className="flex flex-col gap-3 border-b border-[#E2E4E8] bg-[#F8FAFA] px-4 py-3 md:flex-row md:items-center md:justify-between">
            <p className="text-sm font-semibold text-[#273444]">{selectedIds.length} selected</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <select
                value={bulkAction}
                onChange={(event) => setBulkAction(event.target.value)}
                className="admin-input sm:w-48"
              >
                <option value="warn">Warn users</option>
                <option value="suspend">Suspend users</option>
                <option value="ban">Ban users</option>
                <option value="restore">Restore users</option>
                <option value="note">Add internal note</option>
              </select>
              <AdminButton
                variant={bulkAction === "ban" || bulkAction === "suspend" ? "danger" : "primary"}
                onClick={openBulkModal}
              >
                Apply bulk action
              </AdminButton>
            </div>
          </div>
        ) : null}

        {usersQuery.isLoading ? <UsersTableSkeleton /> : null}
        {usersQuery.error ? <UsersErrorState message={usersQuery.error.message} /> : null}
        {!usersQuery.isLoading && !usersQuery.error && totalUsers === 0 ? <UsersEmptyState /> : null}

        {!usersQuery.isLoading && !usersQuery.error && totalUsers > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-[1120px] w-full text-left text-sm">
                <thead className="border-b border-[#E2E4E8] bg-[#FAFAFB] text-xs font-semibold uppercase text-[#666]">
                  <tr>
                    <th className="w-10 px-4 py-3">
                      <input
                        type="checkbox"
                        aria-label="Select visible users"
                        checked={allVisibleSelected}
                        onChange={toggleVisibleSelection}
                        className="h-4 w-4 rounded border-[#C9D2D6]"
                      />
                    </th>
                    <SortableTh label="User" sortKey="fullName" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} />
                    <SortableTh label="Location" sortKey="country" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} />
                    <th className="px-4 py-3">Verification</th>
                    <SortableTh label="Listings" sortKey="activeListingsCount" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} />
                    <SortableTh label="Transactions" sortKey="completedTransactionsCount" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} />
                    <SortableTh label="Reports" sortKey="reportsReceivedCount" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} />
                    <SortableTh label="Risk" sortKey="riskStatus" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} />
                    <SortableTh label="Status" sortKey="accountStatus" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} />
                    <SortableTh label="Joined" sortKey="joinedAt" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} />
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ECEEF1]">
                  {visibleUsers.map((user) => (
                    <tr key={user.id} className="bg-white hover:bg-[#FAFAFB]">
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          aria-label={`Select ${user.fullName}`}
                          checked={selectedIds.includes(user.id)}
                          onChange={() => toggleUserSelection(user.id)}
                          className="h-4 w-4 rounded border-[#C9D2D6]"
                        />
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={user.avatarUrl}
                            alt=""
                            className="h-10 w-10 rounded-full border border-[#E2E4E8] bg-[#F2FAFA]"
                          />
                          <div>
                            <Link href={`/admin/users/${user.id}`} className="font-semibold text-[#111] hover:text-[#007782]">
                              {user.fullName}
                            </Link>
                            <p className="text-xs text-[#666]">ID {user.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-medium text-[#111]">{user.country}</p>
                        <p className="text-xs text-[#666]">{user.city}</p>
                      </td>
                      <td className="px-4 py-4">
                        <VerificationBadges user={user} />
                      </td>
                      <td className="px-4 py-4 font-semibold text-[#111]">{user.activeListingsCount}</td>
                      <td className="px-4 py-4 font-semibold text-[#111]">{user.completedTransactionsCount}</td>
                      <td className="px-4 py-4 font-semibold text-[#111]">{user.reportsReceivedCount}</td>
                      <td className="px-4 py-4"><RiskBadge risk={user.riskStatus} /></td>
                      <td className="px-4 py-4"><AccountStatusBadge status={user.accountStatus} /></td>
                      <td className="px-4 py-4 text-[#555]">{formatAdminDate(user.joinedAt)}</td>
                      <td className="px-4 py-4">
                        <ActionsMenu user={user} onAction={(kind) => setModal({ kind, user })} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-col gap-3 border-t border-[#E2E4E8] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-[#666]">
                Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, totalUsers)} of {totalUsers} users
              </p>
              <div className="flex items-center gap-2">
                <AdminButton disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </AdminButton>
                <span className="text-sm font-semibold text-[#273444]">Page {page} of {pageCount}</span>
                <AdminButton disabled={page === pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))}>
                  Next
                  <ChevronRight className="h-4 w-4" />
                </AdminButton>
              </div>
            </div>
          </>
        ) : null}
      </AdminPanel>

      <UserActionModal
        modal={modal}
        onConfirm={handleModalConfirm}
        isSubmitting={moderateUsers.isPending}
        submitError={moderateUsers.error?.message ?? null}
        onClose={() => {
          if (!moderateUsers.isPending) setModal(null);
        }}
      />
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase text-[#666]">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="admin-input mt-1">
        {children}
      </select>
    </label>
  );
}

function SortableTh({
  label,
  sortKey,
  activeKey,
  direction,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  activeKey: SortKey;
  direction: "asc" | "desc";
  onSort: (key: SortKey) => void;
}) {
  const active = sortKey === activeKey;
  return (
    <th className="px-4 py-3">
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className="inline-flex items-center gap-1 font-semibold hover:text-[#007782]"
      >
        {label}
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${active && direction === "asc" ? "rotate-180" : ""} ${active ? "text-[#007782]" : "text-[#999]"}`} />
      </button>
    </th>
  );
}

function ActionsMenu({
  user,
  onAction,
}: {
  user: AdminUser;
  onAction: (kind: "warn" | "suspend" | "ban" | "restore" | "note") => void;
}) {
  return (
    <details className="relative">
      <summary className="inline-flex cursor-pointer list-none items-center justify-center rounded-md border border-[#D7DDE0] bg-white p-2 text-[#555] hover:border-[#007782] hover:text-[#007782]">
        <MoreHorizontal className="h-4 w-4" />
        <span className="sr-only">Open actions for {user.fullName}</span>
      </summary>
      <div className="absolute right-0 z-10 mt-2 w-48 rounded-lg border border-[#D7DDE0] bg-white p-1 shadow-lg">
        <Link href={`/admin/users/${user.id}`} className="block rounded-md px-3 py-2 text-sm font-medium text-[#444] hover:bg-[#F2F3F5]">
          View profile
        </Link>
        <ActionButton label="Warn user" disabled={!canPerformUserAction(currentAdminRole, "warn")} onClick={() => onAction("warn")} />
        <ActionButton label="Suspend user" disabled={!canPerformUserAction(currentAdminRole, "suspend")} onClick={() => onAction("suspend")} />
        <ActionButton label="Ban user" disabled={!canPerformUserAction(currentAdminRole, "ban")} onClick={() => onAction("ban")} danger />
        <ActionButton label="Restore user" disabled={!canPerformUserAction(currentAdminRole, "restore")} onClick={() => onAction("restore")} />
        <ActionButton label="Add internal note" disabled={!canPerformUserAction(currentAdminRole, "add_note")} onClick={() => onAction("note")} />
      </div>
    </details>
  );
}

function ActionButton({
  label,
  disabled,
  danger,
  onClick,
}: {
  label: string;
  disabled?: boolean;
  danger?: boolean;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={(event) => {
        onClick(event);
        event.currentTarget.closest("details")?.removeAttribute("open");
      }}
      className={`block w-full rounded-md px-3 py-2 text-left text-sm font-medium disabled:cursor-not-allowed disabled:text-[#AAA] ${
        danger ? "text-[#B71C1C] hover:bg-[#FFF5F5]" : "text-[#444] hover:bg-[#F2F3F5]"
      }`}
    >
      {label}
    </button>
  );
}

function UsersTableSkeleton() {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="h-14 animate-pulse rounded-md bg-[#EEF0F2]" />
      ))}
    </div>
  );
}

function UsersEmptyState() {
  return (
    <div className="p-8 text-center">
      <p className="text-base font-semibold text-[#111]">No users match these filters.</p>
      <p className="mt-1 text-sm text-[#666]">Reset filters or broaden your search to inspect more accounts.</p>
    </div>
  );
}

function UsersErrorState({ message }: { message: string }) {
  return (
    <div className="p-6">
      <p className="rounded-md border border-[#F4B6B6] bg-[#FFF5F5] p-4 text-sm font-medium text-[#B71C1C]">
        {message}
      </p>
    </div>
  );
}

function uniqueNumbers(values: number[]) {
  return Array.from(new Set(values));
}
