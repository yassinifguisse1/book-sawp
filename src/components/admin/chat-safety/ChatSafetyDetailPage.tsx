"use client";

import Link from "next/link";
import { useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  ExternalLink,
  FileWarning,
  MessageSquareText,
  NotebookPen,
  ShieldAlert,
  UserRound,
} from "lucide-react";

import { AdminButton, AdminModal, AdminPanel } from "@/components/admin/users/AdminUserShared";
import {
  auditEvents,
  getChatSafetyFlag,
  getLimitedConversation,
  labelize,
  type ChatSafetyFlag,
} from "./mock-data";
import { formatDate, PriorityBadge, StatusBadge } from "./ChatSafetyPage";

type DetailTab =
  | "review"
  | "context"
  | "participants"
  | "linked"
  | "previous"
  | "audit";

const detailTabs: { key: DetailTab; label: string }[] = [
  { key: "review", label: "Flag Review" },
  { key: "context", label: "Conversation Context" },
  { key: "participants", label: "Participants" },
  { key: "linked", label: "Linked Listing and Transaction" },
  { key: "previous", label: "Previous Reports and Safety Flags" },
  { key: "audit", label: "Internal Notes and Audit Log" },
];

export default function ChatSafetyDetailPage({ flagId }: { flagId: string }) {
  const flag = getChatSafetyFlag(flagId);
  const [activeTab, setActiveTab] = useState<DetailTab>("review");
  const [modal, setModal] = useState<string | null>(null);

  if (!flag) return null;

  return (
    <div className="space-y-6">
      <Link href="/admin/chat-safety" className="inline-flex items-center gap-2 text-sm font-semibold text-[#007782] hover:underline">
        <ArrowLeft className="h-4 w-4" />
        Back to chat safety
      </Link>

      <AdminPanel className="p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-[#111]">{flag.id}</h1>
              <StatusBadge status={flag.status} />
              <PriorityBadge priority={flag.priority} />
            </div>
            <p className="mt-2 text-sm text-[#666]">
              {labelize(flag.triggeredRule)} from {labelize(flag.triggerSource)} in {labelize(flag.conversationType)} conversation {flag.conversationId}.
            </p>
          </div>
          <div className="grid gap-2 text-sm sm:grid-cols-2 xl:min-w-[520px]">
            <Meta label="Created" value={formatDate(flag.createdAt)} />
            <Meta label="Assigned moderator" value={flag.assignedModeratorName ?? "Unassigned"} />
            <Meta label="Linked report" value={flag.reportId ?? "None"} />
            <Meta label="Linked transaction" value={flag.transactionId ?? "None"} />
            <Meta label="Linked listing" value={flag.listingTitle ?? "None"} />
            <Meta label="Flagged message" value={flag.flaggedMessageId} />
          </div>
        </div>
      </AdminPanel>

      <AdminPanel className="p-4">
        <div className="flex flex-wrap gap-2">
          {["Assign to me", "Mark as violation", "Dismiss flag", "Escalate", "Warn sender", "Suspend sender", "Add internal note"].map((action) => (
            <AdminButton key={action} variant={["Dismiss flag", "Escalate", "Suspend sender", "Mark as violation"].includes(action) ? "danger" : "secondary"} onClick={() => setModal(action)}>
              {action}
            </AdminButton>
          ))}
        </div>
      </AdminPanel>

      <AdminPanel className="p-2">
        <div className="flex flex-wrap gap-1">
          {detailTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-md px-3 py-2 text-sm font-semibold ${activeTab === tab.key ? "bg-[#273444] text-white" : "text-[#555] hover:bg-[#F2F3F5]"}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </AdminPanel>

      {activeTab === "review" ? <ReviewTab flag={flag} onAction={setModal} /> : null}
      {activeTab === "context" ? <ContextTab flag={flag} onRequestContext={() => setModal("Request additional conversation context")} /> : null}
      {activeTab === "participants" ? <ParticipantsTab flag={flag} /> : null}
      {activeTab === "linked" ? <LinkedTab flag={flag} /> : null}
      {activeTab === "previous" ? <PreviousTab flag={flag} /> : null}
      {activeTab === "audit" ? <AuditTab flag={flag} /> : null}

      <ReasonModal title={modal} flag={flag} onClose={() => setModal(null)} />
    </div>
  );
}

function ReviewTab({ flag, onAction }: { flag: ChatSafetyFlag; onAction: (action: string) => void }) {
  return (
    <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
      <AdminPanel className="p-5">
        <h2 className="text-lg font-bold text-[#111]">Flag review</h2>
        <div className="mt-4 rounded-lg border border-[#F4B6B6] bg-[#FFF5F5] p-4">
          <div className="flex gap-3">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-[#B71C1C]" />
            <div>
              <p className="font-semibold text-[#111]">{labelize(flag.triggeredRule)}</p>
              <p className="mt-1 text-sm text-[#555]">{flag.messagePreview}</p>
              {flag.suspiciousUrl ? <p className="mt-2 text-sm font-semibold text-[#B71C1C]">URL: {flag.suspiciousUrl}</p> : null}
            </div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {flag.highlightedPhrases.map((phrase) => (
            <span key={phrase} className="rounded-full bg-[#FFF8E1] px-2.5 py-1 text-xs font-semibold text-[#7A4A00]">{phrase}</span>
          ))}
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Info label="Trigger source" value={labelize(flag.triggerSource)} />
          <Info label="Rule behavior" value="Deterministic Phase 1 rule, no AI moderation" />
          <Info label="Repeat flags" value={`${flag.repeatFlagsCount} related flags`} />
          <Info label="Country" value={flag.country} />
        </div>
      </AdminPanel>
      <AdminPanel className="p-5">
        <h2 className="text-lg font-bold text-[#111]">Quick actions</h2>
        <div className="mt-4 grid gap-2">
          {["Assign to me", "Mark as violation", "Dismiss flag", "Escalate", "Warn sender", "Suspend sender", "Add internal note"].map((action) => (
            <AdminButton key={action} variant={["Dismiss flag", "Escalate", "Suspend sender", "Mark as violation"].includes(action) ? "danger" : "secondary"} onClick={() => onAction(action)}>
              {action}
            </AdminButton>
          ))}
        </div>
      </AdminPanel>
    </div>
  );
}

function ContextTab({ flag, onRequestContext }: { flag: ChatSafetyFlag; onRequestContext: () => void }) {
  const messages = getLimitedConversation(flag.id);
  return (
    <AdminPanel className="p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-lg font-bold text-[#111]">Limited conversation context</h2>
          <p className="mt-1 text-sm text-[#666]">Showing the flagged message plus up to three messages before and after. Full conversation access is not shown by default.</p>
        </div>
        <AdminButton variant="primary" onClick={onRequestContext}>
          <MessageSquareText className="h-4 w-4" />
          Request additional context
        </AdminButton>
      </div>
      <div className="mt-5 space-y-3">
        {messages.map((message) => (
          <div key={message.id} className={`rounded-lg border p-4 ${message.isFlagged ? "border-[#F4B6B6] bg-[#FFF5F5]" : "border-[#E2E4E8] bg-white"}`}>
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#666]">
              <span className="font-semibold text-[#111]">{message.senderName}</span>
              <span>to {message.recipientName}</span>
              <span>{formatDate(message.timestamp)}</span>
              {message.isFlagged ? <span className="rounded-full bg-[#B71C1C] px-2 py-0.5 font-semibold text-white">Flagged message</span> : null}
            </div>
            <p className="mt-2 text-sm text-[#333]">{highlightMessage(message.body, flag.highlightedPhrases)}</p>
          </div>
        ))}
      </div>
      {flag.suspiciousUrl ? (
        <div className="mt-4 rounded-md border border-[#FFD8A6] bg-[#FFF8E1] p-3 text-sm text-[#7A4A00]">
          Suspicious URL captured by rule: <span className="font-semibold">{flag.suspiciousUrl}</span>
        </div>
      ) : null}
    </AdminPanel>
  );
}

function ParticipantsTab({ flag }: { flag: ChatSafetyFlag }) {
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <ParticipantCard
        title="Sender"
        id={flag.senderId}
        name={flag.senderName}
        verified={flag.senderVerified}
        status={flag.senderAccountStatus}
        risk={flag.senderRiskLevel}
      />
      <ParticipantCard
        title="Recipient"
        id={flag.recipientId}
        name={flag.recipientName}
        verified={flag.recipientVerified}
        status={flag.recipientAccountStatus}
        risk={flag.recipientRiskLevel}
      />
    </div>
  );
}

function ParticipantCard({ title, id, name, verified, status, risk }: { title: string; id: number; name: string; verified: boolean; status: string; risk: string }) {
  return (
    <AdminPanel className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase text-[#666]">{title}</p>
          <h2 className="mt-1 text-lg font-bold text-[#111]">{name}</h2>
          <p className="text-sm text-[#666]">User ID {id}</p>
        </div>
        <UserRound className="h-6 w-6 text-[#007782]" />
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Info label="Verification" value={verified ? "Email and phone verified" : "Verification incomplete"} />
        <Info label="Account status" value={labelize(status)} />
        <Info label="Risk level" value={labelize(risk)} />
      </div>
      <div className="mt-4 rounded-md border border-[#E2E4E8] bg-[#FAFAFB] p-3 text-sm text-[#666]">
        Phone numbers are not displayed automatically. Reveals require a separate audited moderation reason.
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <LinkButton href={`/admin/users/${id}`} label={`Open ${title.toLowerCase()} profile`} />
      </div>
    </AdminPanel>
  );
}

function LinkedTab({ flag }: { flag: ChatSafetyFlag }) {
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <AdminPanel className="p-5">
        <div className="flex items-start gap-3">
          <BookOpen className="mt-1 h-5 w-5 text-[#007782]" />
          <div>
            <h2 className="text-lg font-bold text-[#111]">Linked listing</h2>
            <p className="mt-1 text-sm text-[#666]">{flag.listingTitle ?? "No listing linked"}</p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Info label="Listing ID" value={flag.listingId ? String(flag.listingId) : "None"} />
          <Info label="Conversation type" value={labelize(flag.conversationType)} />
        </div>
        {flag.listingId ? <div className="mt-4"><LinkButton href={`/admin/listings/${flag.listingId}`} label="Open listing" /></div> : null}
      </AdminPanel>
      <AdminPanel className="p-5">
        <div className="flex items-start gap-3">
          <FileWarning className="mt-1 h-5 w-5 text-[#007782]" />
          <div>
            <h2 className="text-lg font-bold text-[#111]">Linked transaction and reports</h2>
            <p className="mt-1 text-sm text-[#666]">Only linked marketplace context is shown here.</p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Info label="Transaction" value={flag.transactionId ?? "None"} />
          <Info label="Report" value={flag.reportId ?? "None"} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <LinkButton href="/admin/transactions" label="Open transaction queue" />
          <LinkButton href="/admin/reports" label="Open linked reports" />
        </div>
      </AdminPanel>
    </div>
  );
}

function PreviousTab({ flag }: { flag: ChatSafetyFlag }) {
  return (
    <AdminPanel className="p-5">
      <h2 className="text-lg font-bold text-[#111]">Previous reports and safety flags</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Info label="Previous reports" value={String(flag.previousReports)} />
        <Info label="Repeat flags count" value={String(flag.repeatFlagsCount)} />
        <Info label="Safety flags" value={flag.safetyFlags.map(labelize).join(", ")} />
      </div>
      <div className="mt-5 space-y-2">
        {flag.moderationHistory.map((entry) => (
          <div key={entry} className="rounded-md border border-[#E2E4E8] bg-[#FAFAFB] p-3 text-sm text-[#555]">{entry}</div>
        ))}
      </div>
    </AdminPanel>
  );
}

function AuditTab({ flag }: { flag: ChatSafetyFlag }) {
  const entries = auditEvents.filter((event) => event.flagId === flag.id);
  return (
    <AdminPanel className="p-5">
      <h2 className="text-lg font-bold text-[#111]">Internal notes and audit log</h2>
      {flag.resolutionNote ? <div className="mt-4 rounded-md border border-[#CFE6E8] bg-[#F2FAFA] p-3 text-sm text-[#055D66]">{flag.resolutionNote}</div> : null}
      <div className="mt-5 space-y-3">
        {entries.length === 0 ? <p className="text-sm text-[#666]">No audit events for this mock flag yet.</p> : null}
        {entries.map((event) => (
          <div key={event.id} className="rounded-lg border border-[#E2E4E8] bg-white p-4">
            <div className="flex flex-wrap items-center gap-2">
              <NotebookPen className="h-4 w-4 text-[#007782]" />
              <p className="font-semibold text-[#111]">{labelize(event.actionType)}</p>
              <span className="text-xs text-[#666]">{formatDate(event.createdAt)}</span>
            </div>
            <p className="mt-2 text-sm text-[#555]">{event.reason}</p>
            <p className="mt-1 text-xs text-[#777]">Admin user #{event.adminUserId}. {event.metadata}</p>
          </div>
        ))}
      </div>
    </AdminPanel>
  );
}

function ReasonModal({ title, flag, onClose }: { title: string | null; flag: ChatSafetyFlag; onClose: () => void }) {
  if (!title) return null;
  return (
    <AdminModal title={title} description={`${flag.id} actions require a reason and internal note for the audit log.`} onClose={onClose}>
      <form className="space-y-4" onSubmit={(event) => event.preventDefault()}>
        {title === "Request additional conversation context" ? (
          <div className="rounded-md border border-[#FFD8A6] bg-[#FFF8E1] p-3 text-sm text-[#7A4A00]">
            <div className="flex gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>This records an additional_context_requested audit event and should only be used when the limited seven-message window is insufficient.</p>
            </div>
          </div>
        ) : null}
        <label className="block">
          <span className="text-xs font-semibold uppercase text-[#666]">Reason</span>
          <select className="admin-input mt-1">
            <option>Complete moderation review</option>
            <option>Confirm scam risk</option>
            <option>Assess participant safety</option>
            <option>False positive review</option>
            <option>Escalation evidence</option>
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-semibold uppercase text-[#666]">Internal note</span>
          <textarea className="admin-input mt-1 min-h-28 resize-none" placeholder="Staff-only context. Do not include unrelated private chat content." />
        </label>
        <div className="flex justify-end gap-2">
          <AdminButton onClick={onClose}>Cancel</AdminButton>
          <AdminButton variant={["Dismiss flag", "Escalate", "Suspend sender", "Mark as violation"].includes(title) ? "danger" : "primary"} onClick={onClose}>
            Confirm
          </AdminButton>
        </div>
      </form>
    </AdminModal>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[#E2E4E8] bg-[#FAFAFB] px-3 py-2">
      <p className="text-xs font-semibold uppercase text-[#666]">{label}</p>
      <p className="mt-1 font-semibold text-[#111]">{value}</p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-[#666]">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[#111]">{value}</p>
    </div>
  );
}

function LinkButton({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2 rounded-md border border-[#D7DDE0] bg-white px-3 py-2 text-sm font-semibold text-[#273444] hover:border-[#007782] hover:text-[#007782]">
      {label}
      <ExternalLink className="h-4 w-4" />
    </Link>
  );
}

function highlightMessage(body: string, phrases: string[]) {
  if (!body || phrases.length === 0) return body;

  type HighlightRange = { start: number; end: number; phrase: string };
  const ranges: HighlightRange[] = [];
  const lowerBody = body.toLowerCase();

  for (const phrase of phrases) {
    if (!phrase) continue;
    const lowerPhrase = phrase.toLowerCase();
    let from = 0;
    while (from <= body.length - phrase.length) {
      const start = lowerBody.indexOf(lowerPhrase, from);
      if (start === -1) break;
      ranges.push({ start, end: start + phrase.length, phrase });
      from = start + 1;
    }
  }

  if (ranges.length === 0) return body;

  ranges.sort((a, b) => a.start - b.start || b.end - a.end);

  const merged: HighlightRange[] = [];
  for (const range of ranges) {
    const last = merged.at(-1);
    if (!last || range.start >= last.end) {
      merged.push({ ...range });
      continue;
    }
    if (range.end > last.end) {
      last.end = range.end;
    }
  }

  const pieces: React.ReactNode[] = [];
  let cursor = 0;
  for (const range of merged) {
    if (range.start > cursor) {
      pieces.push(body.slice(cursor, range.start));
    }
    pieces.push(
      <mark key={`${range.phrase}-${range.start}`} className="rounded bg-[#FFF1A8] px-1 text-[#111]">
        {body.slice(range.start, range.end)}
      </mark>,
    );
    cursor = range.end;
  }
  if (cursor < body.length) {
    pieces.push(body.slice(cursor));
  }

  return pieces;
}
