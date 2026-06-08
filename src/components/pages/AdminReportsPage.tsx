"use client";

import { ShieldAlert } from "lucide-react";

import { Navbar } from "@/components/layout/Navbar";
import { trpc } from "@/providers/app-providers";

export default function AdminReportsPage() {
  const utils = trpc.useUtils();
  const queue = trpc.moderation.queue.useQuery();
  const updateReport = trpc.moderation.updateReport.useMutation({
    onSuccess: () => utils.moderation.queue.invalidate(),
  });

  return (
    <div className="min-h-screen bg-[#F7F7F7]">
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6 flex items-center gap-3">
          <ShieldAlert className="h-7 w-7 text-[#D32F2F]" />
          <h1 className="text-2xl font-bold text-[#111]">Moderation Reports</h1>
        </div>
        {queue.error ? <p className="rounded-md bg-white p-4 text-sm text-[#D32F2F]">{queue.error.message}</p> : null}
        <div className="space-y-3">
          {queue.data?.map((report) => (
            <article key={report.id} className="rounded-xl border border-[#E0E0E0] bg-white p-4">
              <p className="text-sm font-semibold text-[#111]">{report.targetType} #{report.targetId}: {report.reason}</p>
              {report.details ? <p className="mt-2 text-sm text-[#666]">{report.details}</p> : null}
              <div className="mt-4 flex gap-2">
                <button onClick={() => updateReport.mutate({ id: report.id, status: "resolved" })} className="rounded-md bg-[#007782] px-3 py-2 text-sm font-medium text-white">Resolve</button>
                <button onClick={() => updateReport.mutate({ id: report.id, status: "dismissed" })} className="rounded-md border border-[#E0E0E0] px-3 py-2 text-sm font-medium text-[#666]">Dismiss</button>
              </div>
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}
