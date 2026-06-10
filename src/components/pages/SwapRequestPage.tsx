"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { trpc } from "@/providers/app-providers";
import { Navbar } from "@/components/layout/Navbar";
import { useAuth } from "@/hooks/useAuth";
import { useTrustActionRedirect } from "@/hooks/useTrustActionRedirect";
import { bookPath, makeBookSlug, parsePublicSlug } from "@/lib/slugs";
import { motion } from "framer-motion";
import { Check, RefreshCw, ChevronLeft, BookOpen } from "lucide-react";

export default function SwapRequest() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const publicId = parsePublicSlug(slug);
  const [selectedBook, setSelectedBook] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const handleTrustError = useTrustActionRedirect();

  const { data: targetBook, isLoading } = trpc.book.byPublicId.useQuery(
    { publicId: publicId ?? "" },
    { enabled: Boolean(publicId) }
  );

  useEffect(() => {
    if (!targetBook || !publicId) return;
    const canonicalSlug = makeBookSlug(targetBook);
    if (slug !== canonicalSlug) {
      router.replace(`/swap/${canonicalSlug}`);
    }
  }, [publicId, router, slug, targetBook]);

  const { data: myBooks } = trpc.book.myBooks.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const createTransaction = trpc.transaction.create.useMutation({
    onSuccess: () => {
      alert("Swap request sent successfully!");
      router.push("/");
    },
    onError: handleTrustError,
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <div className="max-w-md mx-auto px-4 py-20 text-center">
          <RefreshCw className="w-16 h-16 text-[#999] mx-auto mb-4" />
          <h2 className="text-xl font-bold text-[#111] mb-2">Sign in to request a swap</h2>
          <button
            onClick={() => router.push("/login")}
            className="px-6 py-2.5 bg-[#007782] text-white font-semibold rounded-md hover:bg-[#005f66] transition-colors"
          >
            Sign in
          </button>
        </div>
      </div>
    );
  }

  const handleSubmit = () => {
    if (!selectedBook || !targetBook) return;
    createTransaction.mutate({
      bookId: targetBook.id,
      offeredBookId: selectedBook,
      idempotencyKey: crypto.randomUUID(),
      message: message || undefined,
    });
  };

  if (!publicId) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <div className="max-w-md mx-auto px-4 py-20 text-center">
          <BookOpen className="w-16 h-16 text-[#999] mx-auto mb-4" />
          <h2 className="text-xl font-bold text-[#111] mb-2">Book not found</h2>
          <Link href="/" className="text-[#007782] hover:underline">
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <div className="max-w-lg mx-auto px-4 py-8 animate-pulse">
          <div className="h-8 bg-[#EEEEEE] rounded w-1/2 mb-4" />
          <div className="h-32 bg-[#EEEEEE] rounded mb-4" />
          <div className="h-64 bg-[#EEEEEE] rounded" />
        </div>
      </div>
    );
  }

  if (!targetBook) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <div className="max-w-md mx-auto px-4 py-20 text-center">
          <BookOpen className="w-16 h-16 text-[#999] mx-auto mb-4" />
          <h2 className="text-xl font-bold text-[#111] mb-2">Book not found</h2>
          <Link href="/" className="text-[#007782] hover:underline">
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  const mySwapBooks = myBooks?.filter((b) => b.id !== targetBook.id && b.status === "active") ?? [];

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <div className="max-w-[500px] mx-auto px-4 py-8">
        <Link
          href={bookPath(targetBook)}
          className="inline-flex items-center gap-1 text-sm text-[#666] hover:text-[#007782] mb-6"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to book
        </Link>

        <h1 className="text-2xl font-bold text-[#111] mb-6">Request Swap</h1>

        {/* Book to Receive */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-[#666] uppercase tracking-wide mb-3">
            You will receive
          </h2>
          <div className="flex gap-4 p-4 bg-[#e6f3f4] rounded-lg">
            <img
              src={targetBook.imageUrl || ""}
              alt={targetBook.title}
              className="w-16 h-22 object-cover rounded"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
            <div>
              <h3 className="font-semibold text-[#111]">{targetBook.title}</h3>
              <p className="text-sm text-[#666]">{targetBook.author}</p>
              <p className="text-xs text-[#007782] mt-1 flex items-center gap-1">
                <RefreshCw className="w-3 h-3" />
                Swap
              </p>
            </div>
          </div>
        </div>

        {/* My Books to Offer */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-[#666] uppercase tracking-wide mb-3">
            Select a book to offer
          </h2>
          {mySwapBooks.length > 0 ? (
            <div className="grid grid-cols-3 gap-3">
              {mySwapBooks.map((book) => (
                <button
                  key={book.id}
                  onClick={() => setSelectedBook(book.id)}
                  className={`relative rounded-lg overflow-hidden border-2 transition-all ${
                    selectedBook === book.id
                      ? "border-[#007782] ring-2 ring-[#007782]/20"
                      : "border-transparent hover:border-[#E0E0E0]"
                  }`}
                >
                  <div className="aspect-[3/4] bg-[#F7F7F7]">
                    {book.imageUrl ? (
                      <img
                        src={book.imageUrl}
                        alt={book.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <BookOpen className="w-8 h-8 text-[#999]" />
                      </div>
                    )}
                  </div>
                  {selectedBook === book.id && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute top-2 right-2 w-6 h-6 bg-[#007782] rounded-full flex items-center justify-center"
                    >
                      <Check className="w-4 h-4 text-white" />
                    </motion.div>
                  )}
                  <div className="p-1.5">
                    <p className="text-[11px] font-medium text-[#111] line-clamp-1">
                      {book.title}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-[#F7F7F7] rounded-lg">
              <BookOpen className="w-10 h-10 text-[#999] mx-auto mb-2" />
              <p className="text-sm text-[#666]">No books available to swap</p>
              <Link
                href="/list"
                className="text-sm text-[#007782] hover:underline mt-1 inline-block"
              >
                List a book first
              </Link>
            </div>
          )}
        </div>

        {/* Message */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-[#111] mb-2">
            Add a message (optional)
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full px-3 py-2.5 border border-[#E0E0E0] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#007782]/20 focus:border-[#007782] resize-none"
            rows={3}
            placeholder="Hi! I'd love to swap this book with you..."
          />
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!selectedBook || createTransaction.isPending}
          className="w-full py-3 bg-[#007782] text-white font-semibold rounded-md hover:bg-[#005f66] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {createTransaction.isPending ? "Sending Request..." : "Send Swap Request"}
        </button>
      </div>
    </div>
  );
}
