"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { upload } from "@vercel/blob/client";
import { Loader2, Upload, X, ImageIcon, Eye, Save } from "lucide-react";
import Link from "next/link";

import { trpc } from "@/providers/app-providers";
import { AdminButton } from "@/components/admin/users/AdminUserShared";
import {
  AdminInput,
  AdminSelect,
  AdminTextarea,
  AdminSection,
  FormField,
  StatusBadge,
  slugify,
} from "./AdminBlogShared";
import type { PostWithAuthorAndCategories } from "@/server/domain/posts";

interface AdminBlogEditorProps {
  publicId?: string;
  initialData?: PostWithAuthorAndCategories | null;
}

const emptyForm = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  coverImageUrl: "",
  seoTitle: "",
  seoDescription: "",
  status: "draft" as "draft" | "published" | "archived",
  publishedAt: "",
  categoryIds: [] as number[],
};

export function AdminBlogEditor({ publicId, initialData }: AdminBlogEditorProps) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const isEdit = Boolean(publicId);

  const categoriesQuery = trpc.post.categories.useQuery();
  const create = trpc.post.create.useMutation({
    onSuccess: (data) => {
      utils.admin.blog.list.invalidate();
      router.push(`/admin/blog/${data.publicId}/edit`);
    },
  });
  const update = trpc.post.update.useMutation({
    onSuccess: () => {
      utils.admin.blog.list.invalidate();
      utils.admin.blog.byPublicId.invalidate({ publicId: publicId! });
    },
  });

  const [form, setForm] = useState(() =>
    initialData
      ? {
          title: initialData.title,
          slug: initialData.slug,
          excerpt: initialData.excerpt ?? "",
          content: initialData.content,
          coverImageUrl: initialData.coverImageUrl ?? "",
          seoTitle: initialData.seoTitle ?? "",
          seoDescription: initialData.seoDescription ?? "",
          status: initialData.status,
          publishedAt: initialData.publishedAt
            ? new Date(initialData.publishedAt).toISOString().slice(0, 16)
            : "",
          categoryIds: initialData.categories.map((c) => c.id),
        }
      : emptyForm
  );
  const [uploading, setUploading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const updateField = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const mutationError = create.error?.message ?? update.error?.message;
  const isPending = create.isPending || update.isPending;

  const handleCoverUpload = async (file: File) => {
    setUploading(true);
    try {
      const blob = await upload(`blog-covers/${file.name}`, file, {
        access: "public",
        handleUploadUrl: "/api/uploads/blog-image",
        clientPayload: JSON.stringify({ sizeBytes: file.size }),
      });
      updateField("coverImageUrl", blob.url);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const payload = {
      ...form,
      excerpt: form.excerpt || undefined,
      coverImageUrl: form.coverImageUrl || undefined,
      seoTitle: form.seoTitle || undefined,
      seoDescription: form.seoDescription || undefined,
      publishedAt: form.publishedAt ? new Date(form.publishedAt) : undefined,
      categoryIds: form.categoryIds.length ? form.categoryIds : undefined,
    };
    if (isEdit && publicId) {
      update.mutate({ publicId, ...payload });
    } else {
      create.mutate(payload);
    }
  };

  const toggleCategory = (id: number) => {
    setForm((prev) => ({
      ...prev,
      categoryIds: prev.categoryIds.includes(id)
        ? prev.categoryIds.filter((c) => c !== id)
        : [...prev.categoryIds, id],
    }));
  };

  const seoPreviewTitle = form.seoTitle || form.title || "Post title";
  const seoPreviewDescription = form.seoDescription || form.excerpt || "No description yet.";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#111]">
            {isEdit ? "Edit article" : "New article"}
          </h1>
          <p className="mt-1 text-sm text-[#666]">
            {isEdit
              ? "Update content, SEO metadata, and publishing settings."
              : "Create a new blog article optimized for search."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <AdminButton type="button" variant="ghost" onClick={() => setPreviewOpen(true)}>
            <Eye className="h-4 w-4" />
            Preview SEO
          </AdminButton>
          <AdminButton type="submit" variant="primary" disabled={isPending || !form.title || !form.slug}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isEdit ? "Save changes" : "Create article"}
          </AdminButton>
        </div>
      </div>

      {mutationError ? (
        <div className="rounded-lg border border-[#F1C3C3] bg-[#FFF5F5] px-4 py-3 text-sm text-[#B71C1C]">
          {mutationError}
        </div>
      ) : null}

      {isEdit && initialData ? (
        <div className="flex items-center gap-3 text-sm text-[#666]">
          <StatusBadge status={initialData.status} />
          <span>Created {formatAdminDate(initialData.createdAt)}</span>
          <span>·</span>
          <Link
            href={`/blog/${initialData.slug}`}
            target="_blank"
            className="text-[#007782] hover:underline"
          >
            View on site →
          </Link>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <AdminSection title="Content">
            <div className="space-y-4">
              <FormField label="Title">
                <AdminInput
                  value={form.title}
                  onChange={(e) => {
                    const title = e.target.value;
                    setForm((prev) => ({
                      ...prev,
                      title,
                      slug: prev.slug && isEdit ? prev.slug : slugify(title),
                    }));
                  }}
                  placeholder="e.g. How to Swap Books Safely"
                  required
                />
              </FormField>

              <FormField label="URL slug" hint="Used in /blog/your-slug">
                <AdminInput
                  value={form.slug}
                  onChange={(e) => updateField("slug", slugify(e.target.value))}
                  placeholder="how-to-swap-books-safely"
                  required
                />
              </FormField>

              <FormField label="Excerpt" hint="Short summary shown in cards and search results">
                <AdminTextarea
                  value={form.excerpt}
                  onChange={(e) => updateField("excerpt", e.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder="A one or two sentence summary of the article."
                />
              </FormField>

              <FormField label="Content" hint="HTML is supported">
                <AdminTextarea
                  value={form.content}
                  onChange={(e) => updateField("content", e.target.value)}
                  rows={16}
                  placeholder="<p>Write your article here...</p>"
                  required
                />
              </FormField>
            </div>
          </AdminSection>

          <AdminSection title="Cover image">
            <div className="space-y-4">
              {form.coverImageUrl ? (
                <div className="relative inline-block overflow-hidden rounded-lg border border-[#E0E0E0]">
                  <img
                    src={form.coverImageUrl}
                    alt="Cover preview"
                    className="h-48 w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => updateField("coverImageUrl", "")}
                    className="absolute right-2 top-2 rounded-full bg-black/50 p-1 text-white hover:bg-black/70"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : null}

              <label className="flex cursor-pointer items-center gap-2 rounded-md border border-[#D6DADF] bg-white px-4 py-2 text-sm font-semibold text-[#273444] transition-colors hover:border-[#007782] hover:text-[#007782]">
                <Upload className="h-4 w-4" />
                {uploading ? "Uploading..." : "Upload cover image"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleCoverUpload(file);
                  }}
                />
              </label>

              <div className="text-xs text-[#888]">
                Or paste an image URL:
                <AdminInput
                  value={form.coverImageUrl}
                  onChange={(e) => updateField("coverImageUrl", e.target.value)}
                  placeholder="https://..."
                  className="mt-1"
                />
              </div>
            </div>
          </AdminSection>
        </div>

        <div className="space-y-6">
          <AdminSection title="Publishing">
            <div className="space-y-4">
              <FormField label="Status">
                <AdminSelect
                  value={form.status}
                  onChange={(e) => updateField("status", e.target.value as typeof form.status)}
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </AdminSelect>
              </FormField>

              <FormField label="Publish date" hint="Leave blank to use now">
                <AdminInput
                  type="datetime-local"
                  value={form.publishedAt}
                  onChange={(e) => updateField("publishedAt", e.target.value)}
                />
              </FormField>

              <FormField label="Categories">
                <div className="space-y-2">
                  {categoriesQuery.data?.map((category) => (
                    <label key={category.id} className="flex items-center gap-2 text-sm text-[#333]">
                      <input
                        type="checkbox"
                        checked={form.categoryIds.includes(category.id)}
                        onChange={() => toggleCategory(category.id)}
                        className="h-4 w-4 rounded border-[#D6DADF] text-[#007782] focus:ring-[#007782]"
                      />
                      {category.name}
                    </label>
                  ))}
                  {categoriesQuery.isLoading ? (
                    <span className="text-sm text-[#888]">Loading categories...</span>
                  ) : null}
                </div>
              </FormField>
            </div>
          </AdminSection>

          <AdminSection title="SEO metadata" description="Controls how the article appears in search and social previews.">
            <div className="space-y-4">
              <FormField label="SEO title" hint={`${form.seoTitle.length}/160`}>
                <AdminInput
                  value={form.seoTitle}
                  onChange={(e) => updateField("seoTitle", e.target.value.slice(0, 160))}
                  placeholder="Override the page title for search engines"
                />
              </FormField>

              <FormField label="SEO description" hint={`${form.seoDescription.length}/320`}>
                <AdminTextarea
                  value={form.seoDescription}
                  onChange={(e) => updateField("seoDescription", e.target.value.slice(0, 320))}
                  rows={4}
                  placeholder="Short description for search results and Open Graph"
                />
              </FormField>
            </div>
          </AdminSection>
        </div>
      </div>

      {previewOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-lg rounded-xl border border-[#D7DDE0] bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#111]">Search & social preview</h3>
              <button
                type="button"
                onClick={() => setPreviewOpen(false)}
                className="rounded-md p-1 text-[#666] hover:bg-[#F2F3F5]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3 rounded-lg border border-[#E0E0E0] bg-[#FAFAFA] p-4">
              {form.coverImageUrl ? (
                <img
                  src={form.coverImageUrl}
                  alt=""
                  className="h-40 w-full rounded-md object-cover"
                />
              ) : (
                <div className="flex h-40 w-full items-center justify-center rounded-md bg-[#EEEEEE] text-[#999]">
                  <ImageIcon className="h-8 w-8" />
                </div>
              )}
              <p className="text-xs text-[#007782]">bookswap.app › blog › {form.slug || "slug"}</p>
              <p className="text-lg font-semibold text-[#1a0dab]">{seoPreviewTitle}</p>
              <p className="text-sm leading-relaxed text-[#4d5156]">{seoPreviewDescription}</p>
            </div>
          </div>
        </div>
      ) : null}
    </form>
  );
}

function formatAdminDate(value: string | Date | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}
