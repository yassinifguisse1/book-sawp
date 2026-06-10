"use client";

import { useState, type FormEvent } from "react";
import {
  AlertTriangle,
  MailPlus,
  MoreHorizontal,
  ShieldCheck,
  UserCog,
  UserMinus,
  Users,
  XCircle,
  type LucideIcon,
} from "lucide-react";

import { trpc } from "@/providers/app-providers";
import {
  AdminButton,
  AdminModal,
  AdminPanel,
  formatAdminDate,
  formatAdminDateTime,
} from "@/components/admin/users/AdminUserShared";

type StaffRole = "moderator" | "admin" | "super_admin";

const staffRoles: StaffRole[] = ["moderator", "admin", "super_admin"];
const roleLabels: Record<StaffRole, string> = {
  moderator: "Moderator",
  admin: "Admin",
  super_admin: "Super Admin",
};

function roleBadgeClass(role: StaffRole) {
  if (role === "super_admin") return "border-[#CFE6E8] bg-[#F2FAFA] text-[#007782]";
  if (role === "admin") return "border-[#D7DDE0] bg-[#F7F8FA] text-[#273444]";
  return "border-[#E5E0C8] bg-[#FFF8E1] text-[#7A4A00]";
}

function RoleBadge({ role }: { role: StaffRole }) {
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${roleBadgeClass(role)}`}>
      {roleLabels[role]}
    </span>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-dashed border-[#D7DDE0] px-4 py-8 text-center text-sm font-medium text-[#666]">
      {label}
    </div>
  );
}

export function AdminTeamPage() {
  const utils = trpc.useUtils();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<StaffRole>("moderator");
  const [roleDrafts, setRoleDrafts] = useState<Record<number, StaffRole>>({});
  const [openActionsId, setOpenActionsId] = useState<number | null>(null);
  const [memberToRemove, setMemberToRemove] = useState<number | null>(null);

  const teamQuery = trpc.admin.teamMembers.useQuery();

  const refreshTeam = () => {
    utils.admin.teamMembers.invalidate();
    utils.admin.users.invalidate();
    utils.admin.dashboard.invalidate();
  };

  const inviteTeamMember = trpc.admin.inviteTeamMember.useMutation({
    onSuccess: () => {
      setInviteOpen(false);
      setInviteEmail("");
      setInviteRole("moderator");
      refreshTeam();
    },
  });

  const revokeInvite = trpc.admin.revokeTeamInvite.useMutation({
    onSuccess: refreshTeam,
  });

  const updateRole = trpc.admin.updateTeamMemberRole.useMutation({
    onSuccess: () => {
      setRoleDrafts({});
      setOpenActionsId(null);
      refreshTeam();
    },
  });

  const removeMember = trpc.admin.removeTeamMember.useMutation({
    onSuccess: () => {
      setMemberToRemove(null);
      setOpenActionsId(null);
      refreshTeam();
    },
  });

  const members = teamQuery.data?.members ?? [];
  const invitations = teamQuery.data?.invitations ?? [];
  const summary = teamQuery.data?.summary ?? {
    members: 0,
    superAdmins: 0,
    pendingInvites: 0,
    deliveryIssues: 0,
  };
  const mutationError =
    inviteTeamMember.error?.message ??
    revokeInvite.error?.message ??
    updateRole.error?.message ??
    removeMember.error?.message ??
    null;

  function submitInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    inviteTeamMember.mutate({ email: inviteEmail, role: inviteRole });
  }

  function roleValue(memberId: number, fallback: StaffRole) {
    return roleDrafts[memberId] ?? fallback;
  }

  function canChangeFromSuperAdmin(memberRole: StaffRole) {
    return memberRole !== "super_admin" || summary.superAdmins > 1;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#111]">Admin team</h1>
          <p className="mt-1 text-sm text-[#666]">
            Invite staff, assign roles, and keep admin access auditable.
          </p>
        </div>
        <AdminButton variant="primary" onClick={() => setInviteOpen(true)}>
          <MailPlus className="h-4 w-4" />
          Invite team member
        </AdminButton>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Staff members" value={summary.members} icon={Users} />
        <SummaryCard label="Super admins" value={summary.superAdmins} icon={ShieldCheck} />
        <SummaryCard label="Pending invites" value={summary.pendingInvites} icon={MailPlus} />
        <SummaryCard label="Delivery issues" value={summary.deliveryIssues} icon={AlertTriangle} accent={summary.deliveryIssues > 0 ? "text-[#B71C1C]" : undefined} />
      </div>

      {mutationError ? (
        <p className="rounded-lg border border-[#F4B6B6] bg-[#FFF5F5] px-4 py-3 text-sm font-semibold text-[#B71C1C]">
          {mutationError}
        </p>
      ) : null}

      <AdminPanel>
        <div className="border-b border-[#E2E4E8] px-5 py-4">
          <h2 className="text-lg font-bold text-[#111]">Staff access</h2>
          <p className="mt-1 text-sm text-[#666]">
            These users can access the admin panel based on their local BookSwap role.
          </p>
        </div>
        <div className="overflow-x-auto">
          {teamQuery.isLoading ? (
            <div className="p-5">
              <EmptyState label="Loading team members..." />
            </div>
          ) : members.length === 0 ? (
            <div className="p-5">
              <EmptyState label="No staff members found." />
            </div>
          ) : (
            <table className="min-w-full divide-y divide-[#E2E4E8] text-sm">
              <thead className="bg-[#FAFBFC] text-left text-xs font-bold uppercase text-[#666]">
                <tr>
                  <th className="px-5 py-3">Member</th>
                  <th className="px-5 py-3">Role</th>
                  <th className="px-5 py-3">Last active</th>
                  <th className="px-5 py-3">Joined</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEF0F2]">
                {members.map((member) => {
                  const selectedRole = roleValue(member.id, member.role);
                  const roleChanged = selectedRole !== member.role;
                  const superAdminLocked = !canChangeFromSuperAdmin(member.role);
                  return (
                    <tr key={member.id} className="align-middle">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <img src={member.avatarUrl} alt="" className="h-10 w-10 rounded-full border border-[#D7DDE0]" />
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-bold text-[#111]">{member.name}</p>
                              {member.isOwner ? (
                                <span className="rounded-full border border-[#CFE6E8] bg-[#F2FAFA] px-2 py-0.5 text-xs font-semibold text-[#007782]">
                                  Owner
                                </span>
                              ) : null}
                            </div>
                            <p className="text-xs text-[#666]">{member.email || "No email on file"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <RoleBadge role={member.role} />
                          <select
                            value={selectedRole}
                            disabled={superAdminLocked}
                            onChange={(event) =>
                              setRoleDrafts((current) => ({
                                ...current,
                                [member.id]: event.target.value as StaffRole,
                              }))
                            }
                            className="admin-input h-9 w-40"
                          >
                            {staffRoles.map((role) => (
                              <option key={role} value={role}>
                                {roleLabels[role]}
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-[#555]">{formatAdminDateTime(member.lastActiveAt)}</td>
                      <td className="px-5 py-4 text-[#555]">{formatAdminDate(member.joinedAt)}</td>
                      <td className="relative px-5 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <AdminButton
                            disabled={!roleChanged || updateRole.isPending}
                            onClick={() => updateRole.mutate({ userId: member.id, role: selectedRole })}
                          >
                            <UserCog className="h-4 w-4" />
                            Update
                          </AdminButton>
                          <button
                            type="button"
                            onClick={() => setOpenActionsId((current) => (current === member.id ? null : member.id))}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#D7DDE0] text-[#444] hover:border-[#007782] hover:text-[#007782]"
                            aria-label={`Open actions for ${member.name}`}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </div>
                        {openActionsId === member.id ? (
                          <div className="absolute right-5 top-14 z-20 w-52 rounded-lg border border-[#D7DDE0] bg-white p-1 text-left shadow-xl">
                            <button
                              type="button"
                              disabled={member.isOwner || superAdminLocked}
                              onClick={() => {
                                setOpenActionsId(null);
                                setMemberToRemove(member.id);
                              }}
                              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-[#B71C1C] hover:bg-[#FFF5F5] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <UserMinus className="h-4 w-4" />
                              Remove staff access
                            </button>
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </AdminPanel>

      <AdminPanel>
        <div className="border-b border-[#E2E4E8] px-5 py-4">
          <h2 className="text-lg font-bold text-[#111]">Pending invites</h2>
          <p className="mt-1 text-sm text-[#666]">
            Invited people become staff when their Clerk account syncs with the matching email.
          </p>
        </div>
        <div className="p-5">
          {invitations.length === 0 ? (
            <EmptyState label="No pending team invites." />
          ) : (
            <div className="space-y-3">
              {invitations.map((invite) => (
                <div key={invite.id} className="flex flex-col gap-3 rounded-lg border border-[#E2E4E8] px-4 py-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-[#111]">{invite.email}</p>
                      <RoleBadge role={invite.role} />
                    </div>
                    <p className="mt-1 text-xs text-[#666]">
                      Invited by {invite.invitedBy} on {formatAdminDate(invite.createdAt)}
                      {invite.expiresAt ? `, expires ${formatAdminDate(invite.expiresAt)}` : ""}
                    </p>
                    {invite.deliveryError ? (
                      <p className="mt-2 inline-flex items-center gap-2 rounded-md border border-[#F4B6B6] bg-[#FFF5F5] px-2 py-1 text-xs font-semibold text-[#B71C1C]">
                        <XCircle className="h-3.5 w-3.5" />
                        Clerk email delivery issue
                      </p>
                    ) : null}
                  </div>
                  <AdminButton
                    variant="danger"
                    disabled={revokeInvite.isPending}
                    onClick={() => revokeInvite.mutate({ invitationId: invite.id })}
                  >
                    Revoke invite
                  </AdminButton>
                </div>
              ))}
            </div>
          )}
        </div>
      </AdminPanel>

      {inviteOpen ? (
        <AdminModal
          title="Invite team member"
          description="Assign the staff role before the person accepts the Clerk invite."
          onClose={() => setInviteOpen(false)}
        >
          <form className="space-y-4" onSubmit={submitInvite}>
            <label className="block">
              <span className="text-sm font-semibold text-[#273444]">Email</span>
              <input
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
                required
                type="email"
                className="admin-input mt-1"
                placeholder="staff@example.com"
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-[#273444]">Role</span>
              <select
                value={inviteRole}
                onChange={(event) => setInviteRole(event.target.value as StaffRole)}
                className="admin-input mt-1"
              >
                {staffRoles.map((role) => (
                  <option key={role} value={role}>
                    {roleLabels[role]}
                  </option>
                ))}
              </select>
            </label>
            {inviteTeamMember.error ? (
              <p className="rounded-md border border-[#F4B6B6] bg-[#FFF5F5] p-3 text-sm font-semibold text-[#B71C1C]">
                {inviteTeamMember.error.message}
              </p>
            ) : null}
            <div className="flex justify-end gap-2">
              <AdminButton onClick={() => setInviteOpen(false)} disabled={inviteTeamMember.isPending}>
                Cancel
              </AdminButton>
              <AdminButton type="submit" variant="primary" disabled={inviteTeamMember.isPending}>
                {inviteTeamMember.isPending ? "Inviting..." : "Send invite"}
              </AdminButton>
            </div>
          </form>
        </AdminModal>
      ) : null}

      {memberToRemove ? (
        <AdminModal
          title="Remove staff access"
          description="This demotes the user to Customer and blocks admin panel access."
          onClose={() => setMemberToRemove(null)}
        >
          <div className="space-y-4">
            <div className="rounded-md border border-[#FFD8A6] bg-[#FFF8E1] p-3 text-sm text-[#7A4A00]">
              This action is audited and cannot remove the last super admin.
            </div>
            {removeMember.error ? (
              <p className="rounded-md border border-[#F4B6B6] bg-[#FFF5F5] p-3 text-sm font-semibold text-[#B71C1C]">
                {removeMember.error.message}
              </p>
            ) : null}
            <div className="flex justify-end gap-2">
              <AdminButton onClick={() => setMemberToRemove(null)} disabled={removeMember.isPending}>
                Cancel
              </AdminButton>
              <AdminButton
                variant="danger"
                disabled={removeMember.isPending}
                onClick={() => removeMember.mutate({ userId: memberToRemove })}
              >
                {removeMember.isPending ? "Removing..." : "Remove access"}
              </AdminButton>
            </div>
          </div>
        </AdminModal>
      ) : null}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  accent?: string;
}) {
  return (
    <AdminPanel className="p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-[#666]">{label}</p>
        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-[#F2FAFA] text-[#007782]">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className={`mt-3 text-3xl font-bold ${accent ?? "text-[#111]"}`}>{value}</p>
    </AdminPanel>
  );
}
