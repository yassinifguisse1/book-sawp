"use client";

import type { ReactNode } from "react";
import { AdminPanel } from "@/components/admin/users/AdminUserShared";

export const statusBadge: Record<string, string> = {
  draft: "bg-[#FFF8E1] text-[#8D4E00]",
  published: "bg-[#E8F5E9] text-[#2E7D32]",
  archived: "bg-[#F2F3F5] text-[#555]",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
        statusBadge[status] ?? statusBadge.draft
      }`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export function formatAdminDate(value: string | Date | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function AdminSection({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <AdminPanel className="p-5">
      <h2 className="text-lg font-bold text-[#111]">{title}</h2>
      {description ? <p className="mt-1 text-sm text-[#666]">{description}</p> : null}
      <div className="mt-4">{children}</div>
    </AdminPanel>
  );
}

export function FormField({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-[#333]">{label}</span>
      {hint ? <span className="ml-1 text-xs text-[#888]">{hint}</span> : null}
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

export function AdminInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`block w-full rounded-md border border-[#D6DADF] bg-white px-3 py-2 text-sm text-[#111] placeholder:text-[#999] focus:border-[#007782] focus:outline-none focus:ring-1 focus:ring-[#007782] ${props.className ?? ""}`}
    />
  );
}

export function AdminTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`block w-full rounded-md border border-[#D6DADF] bg-white px-3 py-2 text-sm text-[#111] placeholder:text-[#999] focus:border-[#007782] focus:outline-none focus:ring-1 focus:ring-[#007782] ${props.className ?? ""}`}
    />
  );
}

export function AdminSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`block w-full rounded-md border border-[#D6DADF] bg-white px-3 py-2 text-sm text-[#111] focus:border-[#007782] focus:outline-none focus:ring-1 focus:ring-[#007782] ${props.className ?? ""}`}
    />
  );
}

export function slugify(title: string) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}
