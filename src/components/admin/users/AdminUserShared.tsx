"use client";

import { AlertTriangle, CheckCircle2, Eye, ShieldAlert, X } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import type { AccountStatus, AdminUser, RiskStatus } from "./types";

export type ModalKind =
  | "warn"
  | "suspend"
  | "ban"
  | "restore"
  | "note"
  | "reveal_phone"
  | "bulk";

export type ModalState = {
  kind: ModalKind;
  user?: AdminUser;
  userIds?: number[];
  selectedCount?: number;
  bulkAction?: string;
} | null;

export type UserActionSubmitPayload = {
  reason?: string;
  duration?: string;
  notifyUser: boolean;
};

const labelize = (value: string) =>
  value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

export function formatAdminDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function formatAdminDateTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function statusLabel(value: string) {
  if (value === "user") return "Customer";
  return labelize(value);
}

export function AccountStatusBadge({ status }: { status: AccountStatus }) {
  const classes: Record<AccountStatus, string> = {
    active: "border-[#B8E1D2] bg-[#E8F5E9] text-[#2E7D32]",
    suspended: "border-[#FFD8A6] bg-[#FFF3E0] text-[#B85D00]",
    banned: "border-[#F4B6B6] bg-[#FFF5F5] text-[#B71C1C]",
    deleted: "border-[#D5D7DA] bg-[#F2F3F5] text-[#666]",
  };

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${classes[status]}`}>
      {statusLabel(status)}
    </span>
  );
}

export function RiskBadge({ risk }: { risk: RiskStatus }) {
  const classes: Record<RiskStatus, string> = {
    normal: "border-[#CFE6E8] bg-[#F2FAFA] text-[#007782]",
    flagged: "border-[#FFD8A6] bg-[#FFF8E1] text-[#9A5A00]",
    high_risk: "border-[#F4B6B6] bg-[#FFF5F5] text-[#B71C1C]",
  };

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${classes[risk]}`}>
      {statusLabel(risk)}
    </span>
  );
}

export function VerificationBadges({ user }: { user: AdminUser }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <span
        className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-semibold ${
          user.emailVerified
            ? "border-[#B8E1D2] bg-[#E8F5E9] text-[#2E7D32]"
            : "border-[#D5D7DA] bg-[#F2F3F5] text-[#777]"
        }`}
      >
        <CheckCircle2 className="h-3 w-3" />
        Email
      </span>
      <span
        className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-semibold ${
          user.phoneVerified
            ? "border-[#B8E1D2] bg-[#E8F5E9] text-[#2E7D32]"
            : "border-[#D5D7DA] bg-[#F2F3F5] text-[#777]"
        }`}
      >
        <CheckCircle2 className="h-3 w-3" />
        Phone
      </span>
    </div>
  );
}

export function AdminPanel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-xl border border-[#E2E4E8] bg-white ${className}`}>
      {children}
    </section>
  );
}

export function AdminButton({
  children,
  variant = "secondary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
}) {
  const variants = {
    primary: "bg-[#007782] text-white hover:bg-[#005f66]",
    secondary: "border border-[#D7DDE0] bg-white text-[#273444] hover:border-[#007782] hover:text-[#007782]",
    danger: "border border-[#D32F2F] bg-white text-[#B71C1C] hover:bg-[#FFF5F5]",
    ghost: "text-[#555] hover:bg-[#F2F3F5] hover:text-[#111]",
  };

  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function AdminModal({
  title,
  description,
  children,
  onClose,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4 py-6">
      <div className="w-full max-w-lg rounded-xl border border-[#D7DDE0] bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-[#E2E4E8] px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-[#111]">{title}</h2>
            {description ? <p className="mt-1 text-sm text-[#666]">{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="rounded-md p-1 text-[#666] hover:bg-[#F2F3F5] hover:text-[#111]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-5 py-5">{children}</div>
      </div>
    </div>
  );
}

export function UserActionModal({
  modal,
  revealedPhone,
  onRevealPhone,
  onConfirm,
  isSubmitting,
  submitError,
  onClose,
}: {
  modal: ModalState;
  revealedPhone?: string;
  onRevealPhone?: (reason: string) => void;
  onConfirm?: (payload: UserActionSubmitPayload) => void;
  isSubmitting?: boolean;
  submitError?: string | null;
  onClose: () => void;
}) {
  const [revealReason, setRevealReason] = useState("");

  if (!modal) return null;

  const userName = modal.user?.fullName ?? `${modal.selectedCount ?? 0} selected users`;
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const note = String(formData.get("note") ?? "").trim();
    const reason = String(formData.get("reason") ?? "").trim();
    const duration = String(formData.get("duration") ?? "").trim();
    onConfirm?.({
      reason: note || reason || undefined,
      duration: duration || undefined,
      notifyUser: formData.get("notifyUser") === "on",
    });
  };

  if (modal.kind === "suspend") {
    return (
      <AdminModal
        title={`Suspend ${userName}`}
        description="This restricts marketplace mutations until the suspension expires or is restored."
        onClose={onClose}
      >
        <form className="space-y-4" onSubmit={handleSubmit}>
          <FormField label="Reason">
            <select name="reason" className="admin-input">
              <option>Policy violation</option>
              <option>Suspected scam behavior</option>
              <option>Repeated report pattern</option>
              <option>Trust verification issue</option>
            </select>
          </FormField>
          <FormField label="Duration">
            <select name="duration" className="admin-input">
              <option>24 hours</option>
              <option>7 days</option>
              <option>30 days</option>
              <option>Until manually restored</option>
            </select>
          </FormField>
          <FormField label="Internal note">
            <textarea name="note" className="admin-input min-h-24 resize-none" placeholder="Add context for future moderators." />
          </FormField>
          <label className="flex items-center gap-2 text-sm font-medium text-[#444]">
            <input name="notifyUser" type="checkbox" defaultChecked className="h-4 w-4 rounded border-[#C9D2D6]" />
            Notify user by email
          </label>
          <SubmitError message={submitError} />
          <ModalActions onClose={onClose} confirmLabel="Suspend user" danger isSubmitting={isSubmitting} />
        </form>
      </AdminModal>
    );
  }

  if (modal.kind === "reveal_phone") {
    return (
      <AdminModal
        title={`Reveal phone for ${userName}`}
        description="Phone number reveal is audited. Enter a moderation reason before viewing."
        onClose={onClose}
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            const reason = revealReason.trim();
            if (!reason) return;
            onRevealPhone?.(reason);
          }}
        >
          <div className="rounded-md border border-[#FFD8A6] bg-[#FFF8E1] p-3 text-sm text-[#7A4A00]">
            <div className="flex gap-2">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <p>This action will be written to the audit log with your admin identity and reason.</p>
            </div>
          </div>
          <FormField label="Reason">
            <textarea
              value={revealReason}
              onChange={(event) => setRevealReason(event.target.value)}
              className="admin-input min-h-24 resize-none"
              placeholder="Example: verify phone trust after a report."
              required
            />
          </FormField>
          {revealedPhone ? (
            <div className="rounded-md border border-[#CFE6E8] bg-[#F2FAFA] p-3">
              <p className="text-xs font-semibold uppercase text-[#666]">Revealed phone</p>
              <p className="mt-1 text-lg font-bold text-[#111]">{revealedPhone}</p>
            </div>
          ) : null}
          <SubmitError message={submitError} />
          <div className="flex justify-end gap-2">
            <AdminButton type="button" onClick={onClose}>
              Cancel
            </AdminButton>
            <AdminButton
              variant="primary"
              type="submit"
              disabled={isSubmitting || !revealReason.trim()}
            >
              <Eye className="h-4 w-4" />
              Reveal phone number
            </AdminButton>
          </div>
        </form>
      </AdminModal>
    );
  }

  const copy: Record<Exclude<ModalKind, "suspend" | "reveal_phone">, { title: string; description: string; label: string; danger?: boolean }> = {
    warn: {
      title: `Warn ${userName}`,
      description: "Send a policy warning and record it in moderation history.",
      label: "Send warning",
    },
    ban: {
      title: `Ban ${userName}`,
      description: "This is destructive and disables the account from marketplace use.",
      label: "Ban user",
      danger: true,
    },
    restore: {
      title: `Restore ${userName}`,
      description: "Restore access for a suspended or banned account.",
      label: "Restore user",
    },
    note: {
      title: `Add note for ${userName}`,
      description: "Internal notes are visible to staff only.",
      label: "Save note",
    },
    bulk: {
      title: `Confirm ${statusLabel(modal.bulkAction ?? "bulk_action")}`,
      description: `Apply this action to ${modal.selectedCount ?? 0} selected users.`,
      label: "Confirm bulk action",
      danger: modal.bulkAction === "ban" || modal.bulkAction === "suspend",
    },
  };

  const active = copy[modal.kind];

  return (
    <AdminModal title={active.title} description={active.description} onClose={onClose}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        {(modal.kind === "ban" || modal.kind === "bulk") && active.danger ? (
          <div className="rounded-md border border-[#F4B6B6] bg-[#FFF5F5] p-3 text-sm text-[#B71C1C]">
            <div className="flex gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>Confirmation is required before this account restriction is applied.</p>
            </div>
          </div>
        ) : null}
        <FormField label={modal.kind === "note" ? "Internal note" : "Reason"}>
          <textarea name="reason" className="admin-input min-h-24 resize-none" placeholder="Add staff-only context." />
        </FormField>
        {modal.kind === "warn" ||
        modal.kind === "ban" ||
        (modal.kind === "bulk" && ["warn", "suspend", "ban"].includes(modal.bulkAction ?? "")) ? (
          <label className="flex items-center gap-2 text-sm font-medium text-[#444]">
            <input
              name="notifyUser"
              type="checkbox"
              defaultChecked={modal.kind !== "bulk" || modal.bulkAction !== "note"}
              className="h-4 w-4 rounded border-[#C9D2D6]"
            />
            Notify user by email
          </label>
        ) : null}
        <SubmitError message={submitError} />
        <ModalActions onClose={onClose} confirmLabel={active.label} danger={active.danger} isSubmitting={isSubmitting} />
      </form>
    </AdminModal>
  );
}

function FormField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-[#273444]">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function ModalActions({
  onClose,
  confirmLabel,
  danger,
  isSubmitting,
}: {
  onClose: () => void;
  confirmLabel: string;
  danger?: boolean;
  isSubmitting?: boolean;
}) {
  return (
    <div className="flex justify-end gap-2">
      <AdminButton onClick={onClose} disabled={isSubmitting}>Cancel</AdminButton>
      <AdminButton type="submit" variant={danger ? "danger" : "primary"} disabled={isSubmitting}>
        {isSubmitting ? "Saving..." : confirmLabel}
      </AdminButton>
    </div>
  );
}

function SubmitError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p className="rounded-md border border-[#F4B6B6] bg-[#FFF5F5] p-3 text-sm font-medium text-[#B71C1C]">
      {message}
    </p>
  );
}

export function exportUsersCsv(users: AdminUser[]) {
  const headers = [
    "id",
    "fullName",
    "email",
    "country",
    "city",
    "role",
    "sellerType",
    "riskStatus",
    "accountStatus",
    "activeListingsCount",
    "completedTransactionsCount",
    "reportsReceivedCount",
    "joinedAt",
    "lastActiveAt",
  ];

  const rows = users.map((user) =>
    headers.map((key) => JSON.stringify(user[key as keyof AdminUser] ?? "")).join(","),
  );
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "bookswap-admin-users.csv";
  link.click();
  URL.revokeObjectURL(url);
}
