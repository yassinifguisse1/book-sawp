"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  FileWarning,
  Filter,
  Flag,
  MessageSquareWarning,
  MoreHorizontal,
  RefreshCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  UserRoundCheck,
} from "lucide-react";

import { AdminButton, AdminModal, AdminPanel } from "@/components/admin/users/AdminUserShared";
import {
  blockedDomains,
  chatSafetyFlags,
  labelize,
  safetyRules,
  type ChatSafetyFlag,
  type ConversationType,
  type SafetyPriority,
  type SafetyStatus,
  type TriggerSource,
} from "./mock-data";

function utcDateKey(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toISOString().slice(0, 10);
}

type MainTab = "queue" | "rules" | "domains";
type QueueTab =
  | "all"
  | "open"
  | "high_risk"
  | "user_reported"
  | "automatic_rules"
  | "under_review"
  | "resolved"
  | "dismissed";
type SortKey = "id" | "priority" | "triggeredRule" | "repeatFlagsCount" | "status" | "assignedModeratorName" | "createdAt";
type SensitiveAction =
  | "assign"
  | "under_review"
  | "violation"
  | "dismiss"
  | "escalate"
  | "warn"
  | "suspend"
  | "note"
  | "bulk"
  | "domain";

type Filters = {
  status: "all" | SafetyStatus;
  priority: "all" | SafetyPriority;
  triggerSource: "all" | TriggerSource;
  safetyRule: string;
  conversationType: "all" | ConversationType;
  country: string;
  createdDate: "all" | "today" | "last_7_days";
  repeatOffender: "all" | "yes" | "no";
  linkedTransaction: "all" | "yes" | "no";
  linkedReport: "all" | "yes" | "no";
  assignedModerator: string;
};

const emptyFilters: Filters = {
  status: "all",
  priority: "all",
  triggerSource: "all",
  safetyRule: "all",
  conversationType: "all",
  country: "all",
  createdDate: "all",
  repeatOffender: "all",
  linkedTransaction: "all",
  linkedReport: "all",
  assignedModerator: "all",
};

const queueTabs: { key: QueueTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "open", label: "Open" },
  { key: "high_risk", label: "High risk" },
  { key: "user_reported", label: "User reported" },
  { key: "automatic_rules", label: "Automatic rules" },
  { key: "under_review", label: "Under review" },
  { key: "resolved", label: "Resolved" },
  { key: "dismissed", label: "Dismissed" },
];

const priorityRank: Record<SafetyPriority, number> = { low: 1, medium: 2, high: 3, critical: 4 };

export default function ChatSafetyPage() {
  const [mainTab, setMainTab] = useState<MainTab>("queue");
  const [queueTab, setQueueTab] = useState<QueueTab>("all");
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState("assign");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState<{ kind: SensitiveAction; flag?: ChatSafetyFlag; label?: string; count?: number } | null>(null);

  const filteredFlags = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return chatSafetyFlags.filter((flag) => {
      if (queueTab === "open" && flag.status !== "open") return false;
      if (queueTab === "high_risk" && !["high", "critical"].includes(flag.priority)) return false;
      if (queueTab === "user_reported" && flag.triggerSource !== "user_report") return false;
      if (queueTab === "automatic_rules" && flag.triggerSource !== "automatic_rule") return false;
      if (queueTab === "under_review" && flag.status !== "under_review") return false;
      if (queueTab === "resolved" && flag.status !== "resolved") return false;
      if (queueTab === "dismissed" && flag.status !== "dismissed") return false;
      if (filters.status !== "all" && flag.status !== filters.status) return false;
      if (filters.priority !== "all" && flag.priority !== filters.priority) return false;
      if (filters.triggerSource !== "all" && flag.triggerSource !== filters.triggerSource) return false;
      if (filters.safetyRule !== "all" && flag.triggeredRule !== filters.safetyRule) return false;
      if (filters.conversationType !== "all" && flag.conversationType !== filters.conversationType) return false;
      if (filters.country !== "all" && flag.country !== filters.country) return false;
      if (filters.repeatOffender === "yes" && flag.repeatFlagsCount < 2) return false;
      if (filters.repeatOffender === "no" && flag.repeatFlagsCount >= 2) return false;
      if (filters.linkedTransaction === "yes" && !flag.transactionId) return false;
      if (filters.linkedTransaction === "no" && flag.transactionId) return false;
      if (filters.linkedReport === "yes" && !flag.reportId) return false;
      if (filters.linkedReport === "no" && flag.reportId) return false;
      if (filters.assignedModerator !== "all" && flag.assignedModeratorName !== filters.assignedModerator) return false;
      if (filters.createdDate === "today" && utcDateKey(flag.createdAt) !== utcDateKey(new Date())) return false;
      if (normalizedQuery) {
        const haystack = [
          flag.id,
          flag.conversationId,
          flag.senderName,
          flag.recipientName,
          flag.listingTitle,
          flag.transactionId,
          flag.triggeredRule,
          flag.messagePreview,
        ].join(" ").toLowerCase();
        if (!haystack.includes(normalizedQuery)) return false;
      }
      return true;
    });
  }, [filters, query, queueTab]);

  const sortedFlags = useMemo(() => {
    return [...filteredFlags].sort((a, b) => {
      let compare = 0;
      if (sortKey === "priority") compare = priorityRank[a.priority] - priorityRank[b.priority];
      else if (sortKey === "repeatFlagsCount") compare = a.repeatFlagsCount - b.repeatFlagsCount;
      else compare = String(a[sortKey] ?? "").localeCompare(String(b[sortKey] ?? ""));
      return sortDirection === "asc" ? compare : -compare;
    });
  }, [filteredFlags, sortDirection, sortKey]);

  const pageSize = 5;
  const pageCount = Math.max(1, Math.ceil(sortedFlags.length / pageSize));
  const visibleFlags = sortedFlags.slice((page - 1) * pageSize, page * pageSize);
  const allVisibleSelected = visibleFlags.length > 0 && visibleFlags.every((flag) => selectedIds.includes(flag.id));

  const summary = useMemo(() => {
    const today = utcDateKey(new Date());
    return [
      { label: "Open safety flags", value: chatSafetyFlags.filter((flag) => flag.status === "open").length, icon: Flag, accent: "text-[#E65100]" },
      { label: "High-risk conversations", value: chatSafetyFlags.filter((flag) => ["high", "critical"].includes(flag.priority)).length, icon: ShieldAlert, accent: "text-[#B71C1C]" },
      { label: "User-reported messages", value: chatSafetyFlags.filter((flag) => flag.triggerSource === "user_report").length, icon: MessageSquareWarning },
      { label: "Automatic rule flags", value: chatSafetyFlags.filter((flag) => flag.triggerSource === "automatic_rule").length, icon: FileWarning },
      { label: "Resolved today", value: chatSafetyFlags.filter((flag) => flag.status === "resolved" && flag.resolvedAt && utcDateKey(flag.resolvedAt) === today).length, icon: CheckCircle2 },
      { label: "Dismissed today", value: chatSafetyFlags.filter((flag) => flag.status === "dismissed" && flag.resolvedAt && utcDateKey(flag.resolvedAt) === today).length, icon: Ban },
      { label: "Suspended users", value: chatSafetyFlags.filter((flag) => flag.senderAccountStatus === "suspended").length, icon: UserRoundCheck },
    ];
  }, []);

  const countries = unique(chatSafetyFlags.map((flag) => flag.country));
  const moderators = unique(chatSafetyFlags.map((flag) => flag.assignedModeratorName).filter(Boolean) as string[]);

  function updateFilter<Key extends keyof Filters>(key: Key, value: Filters[Key]) {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
    setSelectedIds([]);
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDirection("asc");
    }
  }

  function toggleVisibleSelection() {
    if (allVisibleSelected) setSelectedIds((current) => current.filter((id) => !visibleFlags.some((flag) => flag.id === id)));
    else setSelectedIds((current) => unique([...current, ...visibleFlags.map((flag) => flag.id)]));
  }

  function exportCsv(rows = sortedFlags) {
    const headers = ["Flag", "Priority", "Rule", "Preview", "Sender", "Recipient", "Context", "Repeat flags", "Status", "Moderator", "Created"];
    const data = rows.map((flag) => [
      flag.id,
      flag.priority,
      flag.triggeredRule,
      flag.messagePreview,
      flag.senderName,
      flag.recipientName,
      flag.transactionId ?? flag.listingTitle ?? "",
      flag.repeatFlagsCount,
      flag.status,
      flag.assignedModeratorName ?? "Unassigned",
      flag.createdAt,
    ]);
    const csv = [headers, ...data].map((row) => row.map(csvValue).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "bookswap-chat-safety-flags.csv";
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    window.setTimeout(() => {
      URL.revokeObjectURL(url);
      link.remove();
    }, 1000);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#111]">Chat safety</h1>
          <p className="mt-1 max-w-3xl text-sm text-[#666]">
            Review only reported messages, deterministic rule flags, flagged transactions, and audited moderator context requests.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <AdminButton onClick={() => exportCsv()} disabled={sortedFlags.length === 0}>
            <Download className="h-4 w-4" />
            Export CSV
          </AdminButton>
          <AdminButton variant="primary" onClick={() => setModal({ kind: "domain", label: "Add blocked domain" })}>
            <ShieldCheck className="h-4 w-4" />
            Add blocked domain
          </AdminButton>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-7">
        {summary.map(({ label, value, icon: Icon, accent }) => (
          <AdminPanel key={label} className="p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase text-[#666]">{label}</p>
              <Icon className="h-4 w-4 text-[#007782]" />
            </div>
            <p className={`mt-3 text-2xl font-bold ${accent ?? "text-[#111]"}`}>{value}</p>
          </AdminPanel>
        ))}
      </div>

      <AdminPanel className="p-2">
        <div className="flex flex-wrap gap-1">
          {[
            ["queue", "Moderation Queue"],
            ["rules", "Safety Rules"],
            ["domains", "Blocked Domains"],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setMainTab(key as MainTab)}
              className={`rounded-md px-3 py-2 text-sm font-semibold ${mainTab === key ? "bg-[#E5F4F5] text-[#007782]" : "text-[#555] hover:bg-[#F2F3F5]"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </AdminPanel>

      {mainTab === "queue" ? (
        <>
          <AdminPanel className="p-2">
            <div className="flex flex-wrap gap-1">
              {queueTabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => {
                    setQueueTab(tab.key);
                    setPage(1);
                    setSelectedIds([]);
                  }}
                  className={`rounded-md px-3 py-2 text-sm font-semibold ${queueTab === tab.key ? "bg-[#273444] text-white" : "text-[#555] hover:bg-[#F2F3F5]"}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </AdminPanel>

          <AdminPanel className="space-y-4 p-5">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#777]" />
              <input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
                placeholder="Search by flag ID, conversation ID, user, listing, transaction, rule, or keyword"
                className="admin-input pl-9"
              />
            </label>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <FilterSelect label="Status" value={filters.status} onChange={(value) => updateFilter("status", value as Filters["status"])}>
                <option value="all">All statuses</option>
                {["open", "under_review", "resolved", "dismissed", "escalated"].map((status) => <option key={status} value={status}>{labelize(status)}</option>)}
              </FilterSelect>
              <FilterSelect label="Priority" value={filters.priority} onChange={(value) => updateFilter("priority", value as Filters["priority"])}>
                <option value="all">All priorities</option>
                {["low", "medium", "high", "critical"].map((priority) => <option key={priority} value={priority}>{labelize(priority)}</option>)}
              </FilterSelect>
              <FilterSelect label="Trigger source" value={filters.triggerSource} onChange={(value) => updateFilter("triggerSource", value as Filters["triggerSource"])}>
                <option value="all">All sources</option>
                {["user_report", "automatic_rule", "transaction_review"].map((source) => <option key={source} value={source}>{labelize(source)}</option>)}
              </FilterSelect>
              <FilterSelect label="Safety rule" value={filters.safetyRule} onChange={(value) => updateFilter("safetyRule", value)}>
                <option value="all">All rules</option>
                {safetyRules.map((rule) => <option key={rule.id} value={rule.id}>{labelize(rule.id)}</option>)}
              </FilterSelect>
              <FilterSelect label="Conversation type" value={filters.conversationType} onChange={(value) => updateFilter("conversationType", value as Filters["conversationType"])}>
                <option value="all">All types</option>
                {["sell", "swap", "giveaway", "general_inquiry"].map((type) => <option key={type} value={type}>{labelize(type)}</option>)}
              </FilterSelect>
              <FilterSelect label="Country" value={filters.country} onChange={(value) => updateFilter("country", value)}>
                <option value="all">All countries</option>
                {countries.map((country) => <option key={country} value={country}>{country}</option>)}
              </FilterSelect>
              <FilterSelect label="Created date" value={filters.createdDate} onChange={(value) => updateFilter("createdDate", value as Filters["createdDate"])}>
                <option value="all">Any date</option>
                <option value="today">Today</option>
                <option value="last_7_days">Last 7 days</option>
              </FilterSelect>
              <FilterSelect label="Repeat offender" value={filters.repeatOffender} onChange={(value) => updateFilter("repeatOffender", value as Filters["repeatOffender"])}>
                <option value="all">Any</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </FilterSelect>
              <FilterSelect label="Linked transaction" value={filters.linkedTransaction} onChange={(value) => updateFilter("linkedTransaction", value as Filters["linkedTransaction"])}>
                <option value="all">Any</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </FilterSelect>
              <FilterSelect label="Linked report" value={filters.linkedReport} onChange={(value) => updateFilter("linkedReport", value as Filters["linkedReport"])}>
                <option value="all">Any</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </FilterSelect>
              <FilterSelect label="Assigned moderator" value={filters.assignedModerator} onChange={(value) => updateFilter("assignedModerator", value)}>
                <option value="all">Any moderator</option>
                {moderators.map((moderator) => <option key={moderator} value={moderator}>{moderator}</option>)}
              </FilterSelect>
              <div className="flex items-end gap-2">
                <AdminButton className="flex-1" onClick={() => {
                  setFilters(emptyFilters);
                  setQuery("");
                  setPage(1);
                  setSelectedIds([]);
                }}>
                  <RefreshCcw className="h-4 w-4" />
                  Reset filters
                </AdminButton>
              </div>
            </div>
          </AdminPanel>

          <AdminPanel className="overflow-hidden">
            {selectedIds.length > 0 ? (
              <div className="flex flex-col gap-3 border-b border-[#E2E4E8] bg-[#F8FAFA] px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
                <p className="text-sm font-semibold text-[#273444]">{selectedIds.length} selected</p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <select value={bulkAction} onChange={(event) => setBulkAction(event.target.value)} className="admin-input sm:w-64">
                    <option value="assign">Assign selected</option>
                    <option value="under_review">Mark selected as under review</option>
                    <option value="dismiss_low">Dismiss selected low-risk flags</option>
                    <option value="escalate">Escalate selected</option>
                    <option value="export">Export selected</option>
                  </select>
                  <AdminButton
                    variant={bulkAction === "escalate" ? "danger" : "primary"}
                    onClick={() => {
                      if (bulkAction === "export") exportCsv(chatSafetyFlags.filter((flag) => selectedIds.includes(flag.id)));
                      else setModal({ kind: "bulk", label: labelize(bulkAction), count: selectedIds.length });
                    }}
                  >
                    Apply bulk action
                  </AdminButton>
                </div>
              </div>
            ) : null}

            {sortedFlags.length === 0 ? (
              <EmptyState />
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1320px] text-left text-sm">
                    <thead className="border-b border-[#E2E4E8] bg-[#FAFAFB] text-xs font-semibold uppercase text-[#666]">
                      <tr>
                        <th className="w-10 px-4 py-3">
                          <input type="checkbox" aria-label="Select visible flags" checked={allVisibleSelected} onChange={toggleVisibleSelection} className="h-4 w-4 rounded border-[#C9D2D6]" />
                        </th>
                        <SortableTh label="Flag" sortKey="id" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} />
                        <SortableTh label="Priority" sortKey="priority" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} />
                        <SortableTh label="Trigger rule" sortKey="triggeredRule" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} />
                        <th className="px-4 py-3">Limited message preview</th>
                        <th className="px-4 py-3">Sender</th>
                        <th className="px-4 py-3">Recipient</th>
                        <th className="px-4 py-3">Context</th>
                        <SortableTh label="Repeat" sortKey="repeatFlagsCount" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} />
                        <SortableTh label="Status" sortKey="status" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} />
                        <SortableTh label="Moderator" sortKey="assignedModeratorName" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} />
                        <SortableTh label="Created" sortKey="createdAt" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} />
                        <th className="px-4 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#ECEEF1]">
                      {visibleFlags.map((flag) => (
                        <tr key={flag.id} className="bg-white hover:bg-[#FAFAFB]">
                          <td className="px-4 py-4">
                            <input
                              type="checkbox"
                              aria-label={`Select ${flag.id}`}
                              checked={selectedIds.includes(flag.id)}
                              onChange={() => setSelectedIds((current) => current.includes(flag.id) ? current.filter((id) => id !== flag.id) : [...current, flag.id])}
                              className="h-4 w-4 rounded border-[#C9D2D6]"
                            />
                          </td>
                          <td className="px-4 py-4">
                            <Link href={`/admin/chat-safety/${flag.id}`} className="font-bold text-[#007782] hover:underline">{flag.id}</Link>
                            <p className="text-xs text-[#666]">{flag.conversationId}</p>
                          </td>
                          <td className="px-4 py-4"><PriorityBadge priority={flag.priority} /></td>
                          <td className="px-4 py-4">
                            <p className="font-semibold text-[#111]">{labelize(flag.triggeredRule)}</p>
                            <p className="text-xs text-[#666]">{labelize(flag.triggerSource)}</p>
                          </td>
                          <td className="max-w-xs px-4 py-4 text-[#444]">{flag.messagePreview}</td>
                          <td className="px-4 py-4">
                            <Link href={`/admin/users/${flag.senderId}`} className="font-semibold text-[#111] hover:text-[#007782]">{flag.senderName}</Link>
                            <p className="text-xs text-[#666]">ID {flag.senderId}</p>
                          </td>
                          <td className="px-4 py-4">
                            <Link href={`/admin/users/${flag.recipientId}`} className="font-semibold text-[#111] hover:text-[#007782]">{flag.recipientName}</Link>
                            <p className="text-xs text-[#666]">ID {flag.recipientId}</p>
                          </td>
                          <td className="px-4 py-4">
                            <p className="font-medium text-[#111]">{flag.listingTitle ?? "General inquiry"}</p>
                            <p className="text-xs text-[#666]">{flag.transactionId ?? "No linked transaction"}</p>
                          </td>
                          <td className="px-4 py-4 font-semibold text-[#111]">{flag.repeatFlagsCount}</td>
                          <td className="px-4 py-4"><StatusBadge status={flag.status} /></td>
                          <td className="px-4 py-4 text-[#555]">{flag.assignedModeratorName ?? "Unassigned"}</td>
                          <td className="px-4 py-4 text-[#555]">{formatDate(flag.createdAt)}</td>
                          <td className="px-4 py-4"><ActionsMenu flag={flag} onAction={(kind, label) => setModal({ kind, flag, label })} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex flex-col gap-3 border-t border-[#E2E4E8] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-[#666]">
                    Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, sortedFlags.length)} of {sortedFlags.length} flags
                  </p>
                  <div className="flex items-center gap-2">
                    <AdminButton disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}><ChevronLeft className="h-4 w-4" />Previous</AdminButton>
                    <span className="text-sm font-semibold text-[#273444]">Page {page} of {pageCount}</span>
                    <AdminButton disabled={page === pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))}>Next<ChevronRight className="h-4 w-4" /></AdminButton>
                  </div>
                </div>
              </>
            )}
          </AdminPanel>
        </>
      ) : null}

      {mainTab === "rules" ? <RulesTable onAction={(label) => setModal({ kind: "domain", label })} /> : null}
      {mainTab === "domains" ? <DomainsTable onAction={(label) => setModal({ kind: "domain", label })} /> : null}
      <SensitiveActionModal modal={modal} onClose={() => setModal(null)} />
    </div>
  );
}

function FilterSelect({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase text-[#666]">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="admin-input mt-1">
        {children}
      </select>
    </label>
  );
}

function SortableTh({ label, sortKey, activeKey, direction, onSort }: { label: string; sortKey: SortKey; activeKey: SortKey; direction: "asc" | "desc"; onSort: (key: SortKey) => void }) {
  const active = sortKey === activeKey;
  return (
    <th className="px-4 py-3">
      <button type="button" onClick={() => onSort(sortKey)} className="inline-flex items-center gap-1 font-semibold hover:text-[#007782]">
        {label}
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${active && direction === "asc" ? "rotate-180" : ""} ${active ? "text-[#007782]" : "text-[#999]"}`} />
      </button>
    </th>
  );
}

function ActionsMenu({ flag, onAction }: { flag: ChatSafetyFlag; onAction: (kind: SensitiveAction, label: string) => void }) {
  return (
    <details className="relative">
      <summary className="inline-flex cursor-pointer list-none items-center justify-center rounded-md border border-[#D7DDE0] bg-white p-2 text-[#555] hover:border-[#007782] hover:text-[#007782]">
        <MoreHorizontal className="h-4 w-4" />
        <span className="sr-only">Open actions for {flag.id}</span>
      </summary>
      <div className="absolute right-0 z-10 mt-2 w-56 rounded-lg border border-[#D7DDE0] bg-white p-1 shadow-lg">
        <Link href={`/admin/chat-safety/${flag.id}`} className="block rounded-md px-3 py-2 text-sm font-medium text-[#444] hover:bg-[#F2F3F5]">Open flag</Link>
        <ActionButton label="Assign to me" onClick={() => onAction("assign", "Assign to me")} />
        <ActionButton label="Assign moderator" onClick={() => onAction("assign", "Assign moderator")} />
        <ActionButton label="Mark under review" onClick={() => onAction("under_review", "Mark under review")} />
        <ActionButton label="Mark as violation" onClick={() => onAction("violation", "Mark as violation")} />
        <ActionButton label="Dismiss flag" onClick={() => onAction("dismiss", "Dismiss flag")} />
        <ActionButton label="Escalate" onClick={() => onAction("escalate", "Escalate flag")} danger />
        <ActionButton label="Warn sender" onClick={() => onAction("warn", "Warn sender")} />
        <ActionButton label="Suspend sender" onClick={() => onAction("suspend", "Suspend sender")} danger />
        <ActionButton label="Add internal note" onClick={() => onAction("note", "Add internal note")} />
      </div>
    </details>
  );
}

function ActionButton({ label, danger, onClick }: { label: string; danger?: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`block w-full rounded-md px-3 py-2 text-left text-sm font-medium ${danger ? "text-[#B71C1C] hover:bg-[#FFF5F5]" : "text-[#444] hover:bg-[#F2F3F5]"}`}>
      {label}
    </button>
  );
}

function RulesTable({ onAction }: { onAction: (label: string) => void }) {
  return (
    <AdminPanel className="overflow-hidden">
      <div className="border-b border-[#E2E4E8] px-5 py-4">
        <h2 className="text-lg font-bold text-[#111]">Safety rules</h2>
        <p className="mt-1 text-sm text-[#666]">Deterministic Phase 1 rules. AI moderation is not enabled.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px] text-left text-sm">
          <thead className="border-b border-[#E2E4E8] bg-[#FAFAFB] text-xs font-semibold uppercase text-[#666]">
            <tr>
              <th className="px-4 py-3">Rule ID</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Severity</th>
              <th className="px-4 py-3">Enabled</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Updated date</th>
              <th className="px-4 py-3">Updated by</th>
              <th className="px-4 py-3">Admin actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#ECEEF1]">
            {safetyRules.map((rule) => (
              <tr key={rule.id} className="bg-white hover:bg-[#FAFAFB]">
                <td className="px-4 py-4 font-semibold text-[#111]">{rule.id}</td>
                <td className="px-4 py-4 text-[#555]">{labelize(rule.category)}</td>
                <td className="px-4 py-4"><PriorityBadge priority={rule.severity} /></td>
                <td className="px-4 py-4">{rule.enabled ? "Enabled" : "Disabled"}</td>
                <td className="px-4 py-4 text-[#555]">{labelize(rule.action)}</td>
                <td className="px-4 py-4 text-[#555]">{formatDate(rule.updatedAt)}</td>
                <td className="px-4 py-4 text-[#555]">{rule.updatedBy}</td>
                <td className="px-4 py-4"><AdminButton onClick={() => onAction("Change safety rule")}>Change rule</AdminButton></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminPanel>
  );
}

function DomainsTable({ onAction }: { onAction: (label: string) => void }) {
  return (
    <AdminPanel className="overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-[#E2E4E8] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-[#111]">Blocked domains</h2>
          <p className="mt-1 text-sm text-[#666]">Admin and super admin changes require an internal note.</p>
        </div>
        <AdminButton variant="primary" onClick={() => onAction("Add blocked domain")}>Add blocked domain</AdminButton>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-[#E2E4E8] bg-[#FAFAFB] text-xs font-semibold uppercase text-[#666]">
            <tr>
              <th className="px-4 py-3">Domain</th>
              <th className="px-4 py-3">Reason</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Added by</th>
              <th className="px-4 py-3">Created date</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#ECEEF1]">
            {blockedDomains.map((domain) => (
              <tr key={domain.domain} className="bg-white hover:bg-[#FAFAFB]">
                <td className="px-4 py-4 font-semibold text-[#111]">{domain.domain}</td>
                <td className="px-4 py-4 text-[#555]">{domain.reason}</td>
                <td className="px-4 py-4"><StatusPill label={labelize(domain.status)} muted={domain.status === "disabled"} /></td>
                <td className="px-4 py-4 text-[#555]">{domain.addedBy}</td>
                <td className="px-4 py-4 text-[#555]">{formatDate(domain.createdAt)}</td>
                <td className="px-4 py-4">
                  <div className="flex flex-wrap gap-2">
                    <AdminButton onClick={() => onAction(domain.status === "active" ? "Disable block" : "Restore block")}>{domain.status === "active" ? "Disable block" : "Restore block"}</AdminButton>
                    <AdminButton onClick={() => onAction("Add internal note")}>Add note</AdminButton>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminPanel>
  );
}

export function PriorityBadge({ priority }: { priority: SafetyPriority }) {
  const classes: Record<SafetyPriority, string> = {
    low: "border-[#CFE6E8] bg-[#F2FAFA] text-[#007782]",
    medium: "border-[#FFD8A6] bg-[#FFF8E1] text-[#9A5A00]",
    high: "border-[#F4B6B6] bg-[#FFF5F5] text-[#B71C1C]",
    critical: "border-[#B71C1C] bg-[#B71C1C] text-white",
  };
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${classes[priority]}`}>{labelize(priority)}</span>;
}

export function StatusBadge({ status }: { status: SafetyStatus }) {
  const classes: Record<SafetyStatus, string> = {
    open: "border-[#FFD8A6] bg-[#FFF8E1] text-[#9A5A00]",
    under_review: "border-[#CFE6E8] bg-[#F2FAFA] text-[#007782]",
    resolved: "border-[#B8E1D2] bg-[#E8F5E9] text-[#2E7D32]",
    dismissed: "border-[#D5D7DA] bg-[#F2F3F5] text-[#666]",
    escalated: "border-[#F4B6B6] bg-[#FFF5F5] text-[#B71C1C]",
  };
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${classes[status]}`}>{labelize(status)}</span>;
}

function StatusPill({ label, muted }: { label: string; muted?: boolean }) {
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${muted ? "border-[#D5D7DA] bg-[#F2F3F5] text-[#666]" : "border-[#B8E1D2] bg-[#E8F5E9] text-[#2E7D32]"}`}>{label}</span>;
}

function SensitiveActionModal({ modal, onClose }: { modal: { kind: SensitiveAction; flag?: ChatSafetyFlag; label?: string; count?: number } | null; onClose: () => void }) {
  if (!modal) return null;
  const title = modal.label ?? labelize(modal.kind);
  const target = modal.flag ? `${modal.flag.id} / ${modal.flag.senderName}` : modal.count ? `${modal.count} selected flags` : "chat safety configuration";
  const isDanger = ["dismiss", "escalate", "suspend", "violation", "bulk"].includes(modal.kind);
  return (
    <AdminModal title={title} description={`This action is audited. Target: ${target}.`} onClose={onClose}>
      <form className="space-y-4" onSubmit={(event) => event.preventDefault()}>
        <div className="rounded-md border border-[#FFD8A6] bg-[#FFF8E1] p-3 text-sm text-[#7A4A00]">
          <div className="flex gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>Enter a reason and internal note before changing a flag, user restriction, rule, or domain block.</p>
          </div>
        </div>
        {modal.kind === "assign" ? (
          <label className="block">
            <span className="text-xs font-semibold uppercase text-[#666]">Assigned moderator</span>
            <select className="admin-input mt-1">
              <option>Assign to me</option>
              <option>Nora Ellis</option>
              <option>Amal Benali</option>
              <option>Jon Price</option>
            </select>
          </label>
        ) : null}
        {modal.kind === "domain" ? (
          <label className="block">
            <span className="text-xs font-semibold uppercase text-[#666]">Domain</span>
            <input className="admin-input mt-1" placeholder="example.com" />
          </label>
        ) : null}
        <label className="block">
          <span className="text-xs font-semibold uppercase text-[#666]">Reason</span>
          <select className="admin-input mt-1">
            <option>Policy violation review</option>
            <option>Payment scam risk</option>
            <option>User report investigation</option>
            <option>Transaction risk investigation</option>
            <option>False positive review</option>
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-semibold uppercase text-[#666]">Internal note</span>
          <textarea className="admin-input mt-1 min-h-28 resize-none" placeholder="Staff-only context for the audit log." />
        </label>
        <div className="flex justify-end gap-2">
          <AdminButton onClick={onClose}>Cancel</AdminButton>
          <AdminButton variant={isDanger ? "danger" : "primary"} onClick={onClose}>{title}</AdminButton>
        </div>
      </form>
    </AdminModal>
  );
}

function EmptyState() {
  return (
    <div className="p-8 text-center">
      <Filter className="mx-auto h-10 w-10 text-[#007782]" />
      <h2 className="mt-3 text-lg font-bold text-[#111]">No safety flags match these filters</h2>
      <p className="mt-1 text-sm text-[#666]">Reset filters or broaden the search to continue triage.</p>
    </div>
  );
}

function unique<T>(values: T[]) {
  return Array.from(new Set(values));
}

function csvValue(value: string | number | undefined) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
