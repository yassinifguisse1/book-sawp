"use client";

interface BlogPostContentProps {
  content: string;
}

export function BlogPostContent({ content }: BlogPostContentProps) {
  // In production, content may be Markdown or HTML. For now we render plain HTML
  // with Tailwind typography-safe classes. If using Markdown, swap this for a
  // sanitized markdown renderer.
  return (
    <div
      className="prose prose-slate max-w-none prose-headings:text-[#2C2C2C] prose-a:text-[#007782] prose-a:no-underline hover:prose-a:underline prose-img:rounded-xl"
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}
