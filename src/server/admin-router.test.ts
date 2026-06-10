import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./context";

type InsertCall = { table: unknown; value: Record<string, unknown> };
type UpdateCall = { table: unknown; value: Record<string, unknown> };

const insertCalls: InsertCall[] = [];
const updateCalls: UpdateCall[] = [];
const selectQueue: unknown[][] = [];
let currentRole = "super_admin";
let insertId = 100;

function fakeSelectResult() {
  const rows = selectQueue.shift() ?? [];
  const result = {
    leftJoin: () => result,
    where: () => result,
    orderBy: () => result,
    groupBy: () => result,
    limit: async () => rows,
    then(
      onFulfilled?: (value: unknown[]) => unknown,
      onRejected?: (reason: unknown) => unknown,
    ) {
      return Promise.resolve(rows).then(onFulfilled, onRejected);
    },
  };
  return result;
}

function fakeSelect() {
  const builder = {
    from: () => builder,
    leftJoin: () => builder,
    where: () => fakeSelectResult(),
    orderBy: () => builder,
    groupBy: () => builder,
    limit: async () => selectQueue.shift() ?? [],
  };
  return builder;
}

function fakeInsert(table: unknown) {
  return {
    values: async (value: Record<string, unknown>) => {
      insertCalls.push({ table, value });
      insertId += 1;
      return [{ insertId }];
    },
  };
}

function fakeUpdate(table: unknown) {
  return {
    set(value: Record<string, unknown>) {
      updateCalls.push({ table, value });
      return {
        where: async () => undefined,
      };
    },
  };
}

vi.mock("@/server/db/connection", () => ({
  getDb: () => ({
    select: fakeSelect,
    insert: fakeInsert,
    update: fakeUpdate,
    transaction: async (
      callback: (tx: {
        insert: typeof fakeInsert;
        update: typeof fakeUpdate;
        select: typeof fakeSelect;
      }) => Promise<void>,
    ) => callback({ insert: fakeInsert, update: fakeUpdate, select: fakeSelect }),
  }),
}));

vi.mock("@/server/db/users", () => ({
  resolveLocalUser: async () => ({
    id: 1,
    role: currentRole,
    deletedAt: null,
    bannedAt: null,
    suspendedAt: null,
  }),
}));

vi.mock("@clerk/nextjs/server", () => ({
  clerkClient: async () => ({
    invitations: {
      createInvitation: vi.fn(async () => ({ id: "inv_test" })),
      revokeInvitation: vi.fn(async () => ({ id: "inv_test" })),
    },
  }),
}));

vi.mock("@/server/domain/outbox", () => ({
  scheduleOutboxProcessing: vi.fn(),
  writeOutboxEvent: vi.fn(async (tx: { insert: typeof fakeInsert }, event: Record<string, unknown>) => {
    await tx.insert("outbox").values(event);
  }),
}));

import { appRouter } from "./router";

const context = {
  auth: { userId: "staff_clerk_id" },
  ipAddress: "127.0.0.1",
  requestId: "test-request",
} as TrpcContext;

describe("admin user moderation router", () => {
  beforeEach(() => {
    insertCalls.length = 0;
    updateCalls.length = 0;
    selectQueue.length = 0;
    currentRole = "super_admin";
    insertId = 100;
  });

  it("warns a user with audit log, notification, and outbox event", async () => {
    const caller = appRouter.createCaller(context);
    selectQueue.push([{ id: 2, role: "user" }]);

    await caller.admin.moderateUsers({
      userIds: [2],
      action: "warn",
      reason: "Policy reminder",
      notifyUser: true,
    });

    expect(updateCalls).toHaveLength(0);
    expect(insertCalls.map((call) => call.value.action)).toContain("user.warned");
    expect(insertCalls.map((call) => call.value.type)).toContain("moderation.warn");
    expect(insertCalls.map((call) => call.value.type)).toContain("notification.created");
  });

  it("suspends, bans, and restores account status fields", async () => {
    const caller = appRouter.createCaller(context);
    selectQueue.push(
      [{ id: 2, role: "user" }],
      [{ id: 2, role: "user" }],
      [{ id: 2, role: "user" }],
    );

    await caller.admin.moderateUsers({ userIds: [2], action: "suspend", reason: "Risk", notifyUser: false });
    await caller.admin.moderateUsers({ userIds: [2], action: "ban", reason: "Confirmed abuse", notifyUser: false });
    await caller.admin.moderateUsers({ userIds: [2], action: "restore", reason: "Appeal accepted", notifyUser: false });

    expect(updateCalls[0]?.value).toMatchObject({ bannedAt: null });
    expect(updateCalls[0]?.value.suspendedAt).toBeInstanceOf(Date);
    expect(updateCalls[1]?.value).toMatchObject({ suspendedAt: null });
    expect(updateCalls[1]?.value.bannedAt).toBeInstanceOf(Date);
    expect(updateCalls[2]?.value).toMatchObject({ suspendedAt: null, bannedAt: null });
  });

  it("adds an internal note without notification", async () => {
    const caller = appRouter.createCaller(context);
    selectQueue.push([{ id: 2, role: "user" }]);

    await caller.admin.moderateUsers({
      userIds: [2],
      action: "note",
      reason: "Monitor future reports",
      notifyUser: true,
    });

    expect(insertCalls.map((call) => call.value.action)).toContain("user.note_added");
    expect(insertCalls.some((call) => call.value.type === "moderation.note")).toBe(false);
    expect(insertCalls.some((call) => call.value.type === "notification.created")).toBe(false);
  });

  it("applies bulk actions to every selected user", async () => {
    const caller = appRouter.createCaller(context);
    selectQueue.push([
      { id: 2, role: "user" },
      { id: 3, role: "user" },
    ]);

    const result = await caller.admin.moderateUsers({
      userIds: [2, 3, 3],
      action: "ban",
      reason: "Coordinated abuse",
      notifyUser: false,
    });

    expect(result.affected).toBe(2);
    expect(insertCalls.filter((call) => call.value.action === "user.banned")).toHaveLength(2);
    expect(updateCalls).toHaveLength(1);
  });

  it("blocks moderating staff at or above the actor role", async () => {
    currentRole = "admin";
    const caller = appRouter.createCaller(context);
    selectQueue.push([{ id: 2, role: "super_admin" }]);

    await expect(
      caller.admin.moderateUsers({
        userIds: [2],
        action: "suspend",
        reason: "Risk",
        notifyUser: false,
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    expect(updateCalls).toHaveLength(0);
    expect(insertCalls).toHaveLength(0);
  });
});

describe("admin team router", () => {
  beforeEach(() => {
    insertCalls.length = 0;
    updateCalls.length = 0;
    selectQueue.length = 0;
    currentRole = "super_admin";
    insertId = 100;
  });

  it("blocks customers from super admin team procedures", async () => {
    currentRole = "user";
    const caller = appRouter.createCaller(context);

    await expect(
      caller.admin.inviteTeamMember({ email: "staff@example.com", role: "moderator" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("creates a pending team invite for a new email", async () => {
    const caller = appRouter.createCaller(context);
    selectQueue.push([], []);

    const result = await caller.admin.inviteTeamMember({
      email: "Staff@Example.com",
      role: "admin",
    });

    expect(result.mode).toBe("pending_invite");
    expect(insertCalls.map((call) => call.value.action)).toContain("team.invite_created");
    expect(insertCalls.map((call) => call.value.email)).toContain("staff@example.com");
    expect(updateCalls.at(-1)?.value).toMatchObject({ clerkInvitationId: "inv_test" });
  });

  it("rejects duplicate pending team invites", async () => {
    const caller = appRouter.createCaller(context);
    selectQueue.push([], [{ id: 44, email: "staff@example.com", status: "pending", expiresAt: null }]);

    await expect(
      caller.admin.inviteTeamMember({ email: "staff@example.com", role: "moderator" }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("updates and removes team member roles with audit logs", async () => {
    const caller = appRouter.createCaller(context);
    const target = {
      id: 2,
      role: "admin",
      deletedAt: null,
    };
    selectQueue.push([target], [target]);

    await caller.admin.updateTeamMemberRole({ userId: 2, role: "moderator" });
    await caller.admin.removeTeamMember({ userId: 2 });

    expect(updateCalls.map((call) => call.value.role)).toEqual(["moderator", "user"]);
    expect(insertCalls.map((call) => call.value.action)).toContain("team.member_role_updated");
    expect(insertCalls.map((call) => call.value.action)).toContain("team.member_removed");
  });
});
