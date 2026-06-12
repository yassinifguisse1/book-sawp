"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Flag,
  ArrowLeftRight,
  MessageSquareWarning,
  SlidersHorizontal,
  ScrollText,
  ShieldCheck,
  UserCog,
  FileText,
} from "lucide-react";

type AdminShellProps = {
  role: string;
  name: string;
  children: ReactNode;
};

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/listings", label: "Listings", icon: BookOpen },
  { href: "/admin/reports", label: "Reports", icon: Flag },
  { href: "/admin/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/admin/chat-safety", label: "Chat Safety", icon: MessageSquareWarning },
  { href: "/admin/taxonomy", label: "Taxonomy", icon: SlidersHorizontal },
  { href: "/admin/audit", label: "Audit Logs", icon: ScrollText },
  { href: "/admin/blog", label: "Blog & SEO", icon: FileText },
];

const superAdminNavItems = [
  { href: "/admin/team", label: "Team", icon: UserCog },
];

const roleLabels: Record<string, string> = {
  moderator: "Moderator",
  admin: "Admin",
  super_admin: "Super Admin",
};

export function AdminShell({ role, name, children }: AdminShellProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#F4F5F7]">
      <aside className="fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-[#E2E4E8] bg-white">
        <div className="flex items-center gap-2 border-b border-[#E2E4E8] px-5 py-4">
          <ShieldCheck className="h-6 w-6 text-[#007782]" />
          <div>
            <p className="text-sm font-bold text-[#111]">BookSwap Admin</p>
            <p className="text-xs text-[#777]">{roleLabels[role] ?? role}</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {[...navItems, ...(role === "super_admin" ? superAdminNavItems : [])].map(({ href, label, icon: Icon }) => {
            const isActive =
              href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-[#E5F4F5] text-[#007782]"
                    : "text-[#444] hover:bg-[#F2F3F5]"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-[#E2E4E8] px-5 py-4">
          <p className="truncate text-sm font-medium text-[#111]">{name}</p>
          <Link href="/" className="text-xs font-semibold text-[#007782] hover:underline">
            Back to marketplace
          </Link>
        </div>
      </aside>
      <main className="ml-64 min-h-screen overflow-x-hidden px-8 py-8">{children}</main>
    </div>
  );
}
