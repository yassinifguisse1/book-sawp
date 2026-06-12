"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Search, Loader2, Eye, Pencil, Archive, Trash2, Send } from "lucide-react";

import { trpc } from "@/providers/app-providers";
import { AdminButton, AdminPanel } from "@/components/admin/users/AdminUserShared";
import { StatusBadge, formatAdminDate, AdminInput, AdminSelect } from "./AdminBlogShared";

const statusOptions = [
  { value: "all", label: "All statuses" },
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
];

export function AdminBlogPage() {
  const utils = trpc.useUtils();
  const [status, setStatus] = useState<"all" | "draft" | "published" | "archived">("all");
  const [query, setQuery] = useState("");

  const posts = trpc.admin.blog.list.useQuery({ status, query });
  const publish = trpc.post.publish.useMutation({
    onSuccess: () => {
      utils.admin.blog.list.invalidate();
    },
  });
  const archive = trpc.post.archive.useMutation({
    onSuccess: () => {
      utils.admin.blog.list.invalidate();
    },
  });
  const remove = trpc.post.delete.useMutation({
    onSuccess: () => {
      utils.admin.blog.list.invalidate();
    },
  });

  const isMutating = publish.isPending || archive.isPending || remove.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#111]">Blog & SEO</h1>
          <p className="mt-1 text-sm text-[#666]">
            Create and manage blog articles, reviews, and SEO landing content.
          </p>
        </div>
        <Link href="/admin/blog/new">
          <AdminButton variant="primary">
            <Plus className="h-4 w-4" />
            New article
          </AdminButton>
        </Link>
      </div>

      <AdminPanel className="p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#999]" />
            <AdminInput
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search articles by title..."
              className="pl-9"
            />
          </div>
          <AdminSelect
            value={status}
            onChange={(e) => setStatus(e.target.value as "all" | "draft" | "published" | "archived")}
            className="w-44"
          >
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </AdminSelect>
        </div>
      </AdminPanel>

      <AdminPanel className="overflow-hidden">
        {posts.isLoading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-6 w-6 animate-spin text-[#007782]" />
          </div>
        ) : posts.data?.items.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-[#666]">No articles found.</p>
            <Link href="/admin/blog/new" className="mt-2 inline-block text-sm font-semibold text-[#007782] hover:underline">
              Create your first article
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-[#FAFAFA] text-left text-xs uppercase tracking-wide text-[#666]">
              <tr>
                <th className="px-4 py-3">Article</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Categories</th>
                <th className="px-4 py-3">Published</th>
                <th className="px-4 py-3">Updated</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {posts.data?.items.map((post) => (
                <tr key={post.publicId} className="border-t border-[#EEE]">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {post.coverImageUrl ? (
                        <img
                          src={post.coverImageUrl}
                          alt=""
                          className="h-10 w-14 rounded object-cover"
                        />
                      ) : (
                        <div className="h-10 w-14 rounded bg-[#EEEEEE]" />
                      )}
                      <div>
                        <p className="font-semibold text-[#111]">{post.title}</p>
                        <p className="text-xs text-[#888]">/{post.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={post.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {post.categories.map((category) => (
                        <span
                          key={category.id}
                          className="rounded-full bg-[#E6F3F3] px-2 py-0.5 text-xs text-[#007782]"
                        >
                          {category.name}
                        </span>
                      ))}
                      {post.categories.length === 0 ? (
                        <span className="text-xs text-[#999]">—</span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[#666]">
                    {formatAdminDate(post.publishedAt)}
                  </td>
                  <td className="px-4 py-3 text-[#666]">
                    {formatAdminDate(post.updatedAt)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/blog/${post.slug}`}
                        target="_blank"
                        className="rounded-md border border-[#D6DADF] p-1.5 text-[#555] hover:bg-[#F7F7F7]"
                        title="View"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                      <Link
                        href={`/admin/blog/${post.publicId}/edit`}
                        className="rounded-md border border-[#D6DADF] p-1.5 text-[#007782] hover:bg-[#F2FAFB]"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </Link>
                      {post.status === "draft" || post.status === "archived" ? (
                        <button
                          type="button"
                          disabled={isMutating}
                          onClick={() => publish.mutate({ publicId: post.publicId })}
                          className="rounded-md border border-[#B8E1D2] p-1.5 text-[#2E7D32] hover:bg-[#E8F5E9]"
                          title="Publish"
                        >
                          <Send className="h-4 w-4" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={isMutating}
                          onClick={() => archive.mutate({ publicId: post.publicId })}
                          className="rounded-md border border-[#FFD8A6] p-1.5 text-[#B85D00] hover:bg-[#FFF3E0]"
                          title="Archive"
                        >
                          <Archive className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={isMutating}
                        onClick={() => {
                          if (confirm("Delete this article? It will be soft-deleted.")) {
                            remove.mutate({ publicId: post.publicId });
                          }
                        }}
                        className="rounded-md border border-[#F1C3C3] p-1.5 text-[#B71C1C] hover:bg-[#FFF5F5]"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </AdminPanel>
    </div>
  );
}
