"use client";

import Link from "next/link";
import { Bell, Check } from "lucide-react";

import { Navbar } from "@/components/layout/Navbar";
import { trpc } from "@/providers/app-providers";

export default function NotificationsPage() {
  const utils = trpc.useUtils();
  const { data: notifications, isLoading } = trpc.notification.list.useQuery();
  const markRead = trpc.notification.markRead.useMutation({
    onSuccess: () => utils.notification.list.invalidate(),
  });

  return (
    <div className="min-h-screen bg-[#F7F7F7]">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold text-[#111]">Notifications</h1>
        <div className="overflow-hidden rounded-xl border border-[#E0E0E0] bg-white">
          {isLoading ? (
            <p className="p-6 text-sm text-[#666]">Loading notifications...</p>
          ) : notifications?.length ? (
            notifications.map((notification) => (
              <article key={notification.id} className={`flex gap-3 border-b border-[#EEEEEE] p-4 last:border-0 ${notification.readAt ? "" : "bg-[#F3FBFB]"}`}>
                <Bell className="mt-1 h-5 w-5 shrink-0 text-[#007782]" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-[#111]">{notification.title}</p>
                  <p className="mt-1 text-sm text-[#666]">{notification.body}</p>
                  {notification.link ? <Link className="mt-2 inline-flex text-sm font-medium text-[#007782]" href={notification.link}>Open</Link> : null}
                </div>
                {!notification.readAt ? (
                  <button onClick={() => markRead.mutate({ id: notification.id })} aria-label="Mark notification as read" className="h-8 rounded-md border border-[#E0E0E0] px-2 text-[#007782]">
                    <Check className="h-4 w-4" />
                  </button>
                ) : null}
              </article>
            ))
          ) : (
            <p className="p-6 text-sm text-[#666]">No notifications yet.</p>
          )}
        </div>
      </main>
    </div>
  );
}
