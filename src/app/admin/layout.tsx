import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

import { resolveLocalUser } from "@/server/db/users";
import { canAccessAdminPanel } from "@/server/domain/admin-team";
import { AdminShell } from "@/components/admin/AdminShell";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const { userId, redirectToSignIn } = await auth();
  if (!userId) return redirectToSignIn();

  const user = await resolveLocalUser(userId);
  if (!user) {
    redirect("/");
  }
  if (!canAccessAdminPanel(user)) {
    redirect("/");
  }

  return (
    <AdminShell role={user.role} name={user.name ?? "Staff"}>
      {children}
    </AdminShell>
  );
}
