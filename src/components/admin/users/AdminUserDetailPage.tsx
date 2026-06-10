"use client";

import Link from "next/link";
import { useState, type ComponentType } from "react";
import {
  Activity,
  ArrowLeft,
  Ban,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  MapPin,
  MessageSquareWarning,
  NotebookPen,
  RotateCcw,
  ShieldAlert,
  Star,
  UserRound,
} from "lucide-react";

import { trpc } from "@/providers/app-providers";
import { mockUserDetails } from "./mock-data";
import type { AdminUserRole } from "./types";
import { canPerformUserAction } from "./types";
import {
  AccountStatusBadge,
  AdminButton,
  AdminPanel,
  RiskBadge,
  UserActionModal,
  VerificationBadges,
  formatAdminDate,
  formatAdminDateTime,
  statusLabel,
  type ModalState,
  type UserActionSubmitPayload,
} from "./AdminUserShared";

type DetailTab =
  | "overview"
  | "listings"
  | "transactions"
  | "reports"
  | "reviews"
  | "chatSafetyFlags"
  | "moderationHistory"
  | "internalNotes";

const tabs: { key: DetailTab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "listings", label: "Listings" },
  { key: "transactions", label: "Transactions" },
  { key: "reports", label: "Reports" },
  { key: "reviews", label: "Reviews" },
  { key: "chatSafetyFlags", label: "Chat Safety Flags" },
  { key: "moderationHistory", label: "Moderation History" },
  { key: "internalNotes", label: "Internal Notes" },
];

const currentAdminRole: AdminUserRole = "super_admin";
const userActionKinds = new Set(["warn", "suspend", "ban", "restore", "note"]);

export function AdminUserDetailPage({ userId }: { userId: number }) {
  const [activeTab, setActiveTab] = useState<DetailTab>("overview");
  const [modal, setModal] = useState<ModalState>(null);
  const [revealedPhone, setRevealedPhone] = useState<string | undefined>();

  const utils = trpc.useUtils();
  const detailQuery = trpc.admin.userDetail.useQuery({ userId });
  const moderateUsers = trpc.admin.moderateUsers.useMutation({
    onSuccess: () => {
      setModal(null);
      utils.admin.userDetail.invalidate({ userId });
      utils.admin.users.invalidate();
      utils.admin.dashboard.invalidate();
    },
  });
  const revealUserPhone = trpc.admin.revealUserPhone.useMutation({
    onSuccess: (data) => {
      setRevealedPhone(data.phoneMasked);
      utils.admin.userDetail.invalidate({ userId });
    },
  });
  const user = detailQuery.data?.user ?? null;
  const moderationHistory = detailQuery.data?.moderationHistory ?? [];

  function handleModalConfirm(payload: UserActionSubmitPayload) {
    if (!modal) return;
    const action = modal.kind === "bulk" ? modal.bulkAction : modal.kind;
    if (!action || !userActionKinds.has(action) || !modal.user) return;
    moderateUsers.mutate({
      userIds: [modal.user.id],
      action: action as "warn" | "suspend" | "ban" | "restore" | "note",
      reason: payload.reason,
      duration: payload.duration,
      notifyUser: payload.notifyUser,
    });
  }

  if (detailQuery.isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-28 animate-pulse rounded-xl bg-[#EEF0F2]" />
        <div className="h-80 animate-pulse rounded-xl bg-[#EEF0F2]" />
      </div>
    );
  }

  if (detailQuery.error) {
    return (
      <AdminPanel className="p-6">
        <p className="rounded-md border border-[#F4B6B6] bg-[#FFF5F5] p-4 text-sm font-medium text-[#B71C1C]">
          {detailQuery.error.message}
        </p>
      </AdminPanel>
    );
  }

  if (!user) {
    return (
      <AdminPanel className="p-8 text-center">
        <p className="text-lg font-bold text-[#111]">User not found</p>
        <p className="mt-1 text-sm text-[#666]">This admin user does not exist.</p>
        <Link href="/admin/users" className="mt-4 inline-flex text-sm font-semibold text-[#007782] hover:underline">
          Back to users
        </Link>
      </AdminPanel>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/users" className="inline-flex items-center gap-2 text-sm font-semibold text-[#007782] hover:underline">
          <ArrowLeft className="h-4 w-4" />
          Back to users
        </Link>
      </div>

      <AdminPanel className="p-5">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <img
              src={user.avatarUrl}
              alt=""
              className="h-20 w-20 rounded-full border border-[#E2E4E8] bg-[#F2FAFA]"
            />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold text-[#111]">{user.fullName}</h1>
                <AccountStatusBadge status={user.accountStatus} />
                <RiskBadge risk={user.riskStatus} />
              </div>
              <p className="mt-1 text-sm text-[#666]">Internal user ID {user.id}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <VerificationBadges user={user} />
                <span className="inline-flex rounded-full border border-[#D7DDE0] px-2.5 py-1 text-xs font-semibold text-[#555]">
                  {statusLabel(user.role)}
                </span>
                <span className="inline-flex rounded-full border border-[#D7DDE0] px-2.5 py-1 text-xs font-semibold text-[#555]">
                  {statusLabel(user.sellerType)}
                </span>
              </div>
            </div>
          </div>

          <div className="grid gap-3 text-sm sm:grid-cols-2 xl:min-w-[520px]">
            <Info label="Location" value={`${user.country}, ${user.city}`} />
            <Info label="Joined" value={formatAdminDate(user.joinedAt)} />
            <Info label="Last active" value={formatAdminDateTime(user.lastActiveAt)} />
            <Info label="Phone" value={revealedPhone ?? user.phoneMasked} />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2 border-t border-[#E2E4E8] pt-4">
          <AdminButton onClick={() => setModal({ kind: "warn", user })}>Warn user</AdminButton>
          <AdminButton
            onClick={() => setModal({ kind: "suspend", user })}
            disabled={!canPerformUserAction(currentAdminRole, "suspend")}
          >
            <ShieldAlert className="h-4 w-4" />
            Suspend user
          </AdminButton>
          <AdminButton
            variant="danger"
            onClick={() => setModal({ kind: "ban", user })}
            disabled={!canPerformUserAction(currentAdminRole, "ban")}
          >
            <Ban className="h-4 w-4" />
            Ban user
          </AdminButton>
          <AdminButton
            onClick={() => setModal({ kind: "restore", user })}
            disabled={!canPerformUserAction(currentAdminRole, "restore")}
          >
            <RotateCcw className="h-4 w-4" />
            Restore user
          </AdminButton>
          <AdminButton onClick={() => setModal({ kind: "note", user })}>
            <NotebookPen className="h-4 w-4" />
            Add internal note
          </AdminButton>
          <AdminButton
            onClick={() => setModal({ kind: "reveal_phone", user })}
            disabled={!canPerformUserAction(currentAdminRole, "reveal_phone")}
          >
            <Eye className="h-4 w-4" />
            Reveal phone number
          </AdminButton>
        </div>
      </AdminPanel>

      <AdminPanel className="overflow-hidden">
        <div className="flex gap-1 overflow-x-auto border-b border-[#E2E4E8] bg-white px-3 py-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`whitespace-nowrap rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
                activeTab === tab.key
                  ? "bg-[#E5F4F5] text-[#007782]"
                  : "text-[#555] hover:bg-[#F2F3F5] hover:text-[#111]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="p-5">
          {activeTab === "overview" ? (
            <Overview user={user} moderationHistory={moderationHistory} />
          ) : (
            <TabContent activeTab={activeTab} moderationHistory={moderationHistory} />
          )}
        </div>
      </AdminPanel>

      <UserActionModal
        modal={modal}
        revealedPhone={revealedPhone}
        onRevealPhone={(reason) => revealUserPhone.mutate({ userId: user.id, reason })}
        onConfirm={handleModalConfirm}
        isSubmitting={moderateUsers.isPending || revealUserPhone.isPending}
        submitError={moderateUsers.error?.message ?? revealUserPhone.error?.message ?? null}
        onClose={() => {
          if (!moderateUsers.isPending && !revealUserPhone.isPending) setModal(null);
        }}
      />
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#ECEEF1] bg-[#FAFAFB] p-3">
      <p className="text-xs font-semibold uppercase text-[#777]">{label}</p>
      <p className="mt-1 font-semibold text-[#111]">{value}</p>
    </div>
  );
}

type ModerationHistoryRow = {
  id: number;
  action: string;
  actor: string;
  note: string;
  date: string;
};

function Overview({
  user,
  moderationHistory,
}: {
  user: {
    id: number;
    accountStatus: string;
    riskStatus: string;
    role: string;
    sellerType: string;
    emailVerified: boolean;
    phoneVerified: boolean;
    country: string;
    city: string;
    activeListingsCount: number;
    completedTransactionsCount: number;
    reportsReceivedCount: number;
    joinedAt: string;
    lastActiveAt: string;
  };
  moderationHistory: ModerationHistoryRow[];
}) {
  const warningCount = moderationHistory.filter((row) => row.action === "user.warned").length;
  const restrictionCount = moderationHistory.filter((row) =>
    ["user.suspended", "user.banned"].includes(row.action),
  ).length;
  const noteCount = moderationHistory.filter((row) => row.action === "user.note_added").length;
  const latestAction = moderationHistory.at(0);
  const trustItems = [
    user.emailVerified ? "Email verified" : "Email not verified",
    user.phoneVerified ? "Phone verified" : "Phone not verified",
    `${statusLabel(user.role)} role`,
    `${statusLabel(user.sellerType)} seller`,
  ];
  const actionGuidance = getActionGuidance(user.accountStatus, user.riskStatus, user.reportsReceivedCount);

  return (
    <div className="grid gap-4 xl:grid-cols-[1.35fr_0.9fr]">
      <section className="rounded-lg border border-[#DDE6E8] bg-[#FBFEFE] p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-[#007782]">Moderation briefing</p>
            <h2 className="mt-1 text-xl font-bold text-[#111]">{actionGuidance.title}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#555]">{actionGuidance.description}</p>
          </div>
          <div className="grid min-w-64 grid-cols-2 gap-2 text-sm">
            <Signal label="Status" value={statusLabel(user.accountStatus)} tone={user.accountStatus === "active" ? "good" : "danger"} />
            <Signal label="Risk" value={statusLabel(user.riskStatus)} tone={user.riskStatus === "normal" ? "good" : user.riskStatus === "flagged" ? "warn" : "danger"} />
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Metric icon={FileText} label="Active listings" value={user.activeListingsCount} detail="Books currently exposed to buyers and swappers." />
          <Metric icon={CheckCircle2} label="Completed transactions" value={user.completedTransactionsCount} detail="Completed marketplace exchanges." />
          <Metric icon={ShieldAlert} label="Reports received" value={user.reportsReceivedCount} detail={user.reportsReceivedCount === 0 ? "No user reports on record." : "Review report context before restricting."} tone={user.reportsReceivedCount > 0 ? "warn" : "good"} />
          <Metric icon={MessageSquareWarning} label="Restrictions" value={restrictionCount} detail="Suspensions and bans in moderation history." tone={restrictionCount > 0 ? "danger" : "good"} />
        </div>
      </section>

      <section className="rounded-lg border border-[#E2E4E8] bg-white p-5">
        <div className="flex items-center gap-2 text-[#007782]">
          <UserRound className="h-4 w-4" />
          <h2 className="font-bold text-[#111]">Identity and trust</h2>
        </div>
        <div className="mt-4 grid gap-2">
          {trustItems.map((item, index) => (
            <div key={`${item}-${index}`} className="flex items-center justify-between rounded-md border border-[#ECEEF1] px-3 py-2 text-sm">
              <span className="text-[#555]">{item}</span>
              <span className="h-2 w-2 rounded-full bg-[#007782]" />
            </div>
          ))}
        </div>
        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-1">
          <CompactFact icon={MapPin} label="Location" value={`${user.country}, ${user.city}`} />
          <CompactFact icon={Clock} label="Last active" value={formatAdminDateTime(user.lastActiveAt)} />
        </div>
      </section>

      <section className="rounded-lg border border-[#E2E4E8] bg-white p-5 xl:col-span-2">
        <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr_1fr]">
          <div>
            <div className="flex items-center gap-2 text-[#007782]">
              <Activity className="h-4 w-4" />
              <h2 className="font-bold text-[#111]">Account timeline</h2>
            </div>
            <dl className="mt-4 space-y-3 text-sm">
              <TimelineFact label="Joined" value={formatAdminDate(user.joinedAt)} />
              <TimelineFact label="Latest staff action" value={latestAction ? `${statusLabel(latestAction.action.replace(/^user\./, ""))} · ${formatAdminDateTime(latestAction.date)}` : "No moderation action yet"} />
              <TimelineFact label="Internal notes" value={`${noteCount} staff-only ${noteCount === 1 ? "note" : "notes"}`} />
            </dl>
          </div>

          <div>
            <div className="flex items-center gap-2 text-[#007782]">
              <Star className="h-4 w-4" />
              <h2 className="font-bold text-[#111]">Marketplace posture</h2>
            </div>
            <p className="mt-4 text-sm leading-6 text-[#555]">
              {user.completedTransactionsCount > 0
                ? `This user has completed ${user.completedTransactionsCount} marketplace ${user.completedTransactionsCount === 1 ? "transaction" : "transactions"} with ${user.activeListingsCount} active ${user.activeListingsCount === 1 ? "listing" : "listings"}.`
                : `This user has not completed a transaction yet and has ${user.activeListingsCount} active ${user.activeListingsCount === 1 ? "listing" : "listings"}.`}
            </p>
            <p className="mt-2 text-sm leading-6 text-[#555]">
              {warningCount > 0
                ? `${warningCount} warning ${warningCount === 1 ? "has" : "have"} already been sent. Check moderation history before sending another warning.`
                : "No warning has been sent yet."}
            </p>
          </div>

          <div className="rounded-md border border-[#FFD8A6] bg-[#FFF8E1] p-4 text-sm text-[#7A4A00]">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              <p className="font-semibold text-[#5D3700]">Privacy guardrail</p>
            </div>
            <p className="mt-2 leading-6">
              Phone numbers stay masked by default. Revealing private contact data requires a reason and is treated as an audited moderation action.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function getActionGuidance(accountStatus: string, riskStatus: string, reportsReceivedCount: number) {
  if (accountStatus === "banned") {
    return {
      title: "Account is banned",
      description: "Marketplace access is blocked. Review moderation history and reports before restoring this user.",
    };
  }
  if (accountStatus === "suspended") {
    return {
      title: "Account is suspended",
      description: "Marketplace mutations are restricted. Check the latest staff note and decide whether to restore, extend, or ban.",
    };
  }
  if (riskStatus === "high_risk" || reportsReceivedCount >= 5) {
    return {
      title: "High-risk account needs staff review",
      description: "Reports or risk signals are elevated. Review reports, listings, and chat safety flags before allowing more marketplace activity.",
    };
  }
  if (riskStatus === "flagged" || reportsReceivedCount > 0) {
    return {
      title: "Flagged account, monitor closely",
      description: "There are marketplace signals to inspect. Start with reports and moderation history, then decide whether a warning is enough.",
    };
  }
  return {
    title: "Account looks clear",
    description: "No elevated risk signals are visible from the current admin record. Continue normal monitoring unless new reports arrive.",
  };
}

function Signal({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "good" | "warn" | "danger";
}) {
  const tones = {
    neutral: "border-[#D7DDE0] bg-white text-[#273444]",
    good: "border-[#B8E1D2] bg-[#E8F5E9] text-[#2E7D32]",
    warn: "border-[#FFD8A6] bg-[#FFF8E1] text-[#9A5A00]",
    danger: "border-[#F4B6B6] bg-[#FFF5F5] text-[#B71C1C]",
  };
  return (
    <div className={`rounded-md border px-3 py-2 ${tones[tone]}`}>
      <p className="text-[11px] font-semibold uppercase opacity-75">{label}</p>
      <p className="mt-1 font-bold">{value}</p>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  detail,
  tone = "neutral",
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: number;
  detail: string;
  tone?: "neutral" | "good" | "warn" | "danger";
}) {
  const tones = {
    neutral: "text-[#007782]",
    good: "text-[#2E7D32]",
    warn: "text-[#B85D00]",
    danger: "text-[#B71C1C]",
  };
  return (
    <article className="rounded-lg border border-[#E2E4E8] bg-white p-4">
      <div className={`flex items-center gap-2 ${tones[tone]}`}>
        <Icon className="h-4 w-4" />
        <p className="text-xs font-semibold uppercase text-[#666]">{label}</p>
      </div>
      <p className="mt-2 text-2xl font-bold text-[#111]">{value}</p>
      <p className="mt-1 text-xs leading-5 text-[#666]">{detail}</p>
    </article>
  );
}

function CompactFact({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-[#ECEEF1] bg-[#FAFAFB] p-3">
      <div className="flex items-center gap-2 text-[#007782]">
        <Icon className="h-4 w-4" />
        <p className="text-xs font-semibold uppercase text-[#777]">{label}</p>
      </div>
      <p className="mt-1 font-semibold text-[#111]">{value}</p>
    </div>
  );
}

function TimelineFact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase text-[#777]">{label}</dt>
      <dd className="mt-1 font-semibold text-[#111]">{value}</dd>
    </div>
  );
}

function TabContent({
  activeTab,
  moderationHistory,
}: {
  activeTab: Exclude<DetailTab, "overview">;
  moderationHistory: ModerationHistoryRow[];
}) {
  if (activeTab === "listings") {
    return (
      <SimpleRows
        empty="No listings for this user."
        rows={mockUserDetails.listings.map((row) => ({
          key: row.id,
          title: `${row.title} (${row.id})`,
          meta: `${statusLabel(row.mode)} · ${statusLabel(row.status)} · ${row.reports} reports`,
        }))}
      />
    );
  }

  if (activeTab === "transactions") {
    return (
      <SimpleRows
        empty="No completed transactions yet."
        rows={mockUserDetails.transactions.map((row) => ({
          key: row.id,
          title: `${row.id} · ${statusLabel(row.mode)}`,
          meta: `${statusLabel(row.status)} with ${row.counterparty} on ${row.date}`,
        }))}
      />
    );
  }

  if (activeTab === "reports") {
    return (
      <SimpleRows
        empty="No reports received."
        rows={mockUserDetails.reports.map((row) => ({
          key: row.id,
          title: `${row.id} · ${row.reason}`,
          meta: `${statusLabel(row.status)} · ${row.date}`,
        }))}
      />
    );
  }

  if (activeTab === "reviews") {
    return (
      <SimpleRows
        empty="No reviews yet."
        rows={mockUserDetails.reviews.map((row) => ({
          key: row.id,
          title: `${row.rating}/5 from ${row.author}`,
          meta: `${row.text} · ${row.date}`,
        }))}
      />
    );
  }

  if (activeTab === "chatSafetyFlags") {
    return (
      <div className="space-y-3">
        <p className="rounded-md border border-[#CFE6E8] bg-[#F2FAFA] p-3 text-sm text-[#276267]">
          Chat Safety Flags show only reported messages or anti-scam rule triggers. Full private
          conversations are not exposed in this Phase 1 admin view.
        </p>
        <SimpleRows
          empty="No chat safety flags."
          rows={mockUserDetails.chatSafetyFlags.map((row) => ({
            key: row.id,
            title: `${row.id} · ${row.trigger}`,
            meta: `${row.snippet} · ${statusLabel(row.status)} · ${row.date}`,
          }))}
        />
      </div>
    );
  }

  if (activeTab === "moderationHistory") {
    return (
      <SimpleRows
        empty="No moderation history."
        rows={moderationHistory.map((row) => ({
          key: String(row.id),
          title: `${statusLabel(row.action.replace(/^user\./, ""))} by ${row.actor}`,
          meta: `${row.note || "No note provided."} · ${formatAdminDateTime(row.date)}`,
        }))}
      />
    );
  }

  return (
    <SimpleRows
      empty="No internal notes."
      rows={moderationHistory
        .filter((row) => row.action === "user.note_added")
        .map((row) => ({
          key: String(row.id),
          title: `NOTE-${row.id} by ${row.actor}`,
          meta: `${row.note || "No note provided."} · ${formatAdminDateTime(row.date)}`,
      }))}
    />
  );
}

function SimpleRows({
  rows,
  empty,
}: {
  rows: { key: string; title: string; meta: string }[];
  empty: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-[#E2E4E8] bg-[#FAFAFB] p-6 text-sm text-[#666]">
        {empty}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <article key={row.key} className="rounded-lg border border-[#E2E4E8] bg-white p-4">
          <p className="font-semibold text-[#111]">{row.title}</p>
          <p className="mt-1 text-sm text-[#666]">{row.meta}</p>
        </article>
      ))}
    </div>
  );
}
