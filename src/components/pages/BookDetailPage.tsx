"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { trpc } from "@/providers/app-providers";
import { Navbar } from "@/components/layout/Navbar";
import { useAuth } from "@/hooks/useAuth";
import { useTrustActionRedirect } from "@/hooks/useTrustActionRedirect";
import { bookPath, makeBookSlug, parsePublicSlug, profilePath } from "@/lib/slugs";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Heart,
  RefreshCw,
  Gift,
  DollarSign,
  MapPin,
  Clock,
  ChevronRight,
  Truck,
  ShieldAlert,
  Flag,
  Pencil,
  Trash2,
} from "lucide-react";

const conditionLabels: Record<string, string> = {
  likenew: "Like New",
  verygood: "Very Good",
  good: "Good",
  fair: "Fair",
  poor: "Poor",
};

export default function BookDetail() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const publicId = parsePublicSlug(slug);
  const [selectedImage, setSelectedImage] = useState<{
    publicId: string;
    imageUrl: string;
  } | null>(null);
  const [failedImages, setFailedImages] = useState<Set<string>>(() => new Set());
  const handleTrustError = useTrustActionRedirect();

  const { data: book, isLoading } = trpc.book.byPublicId.useQuery(
    { publicId: publicId ?? "" },
    { enabled: Boolean(publicId) }
  );

  useEffect(() => {
    if (!book || !publicId) return;
    const canonicalSlug = makeBookSlug(book);
    if (slug !== canonicalSlug) {
      router.replace(`/book/${canonicalSlug}`);
    }
  }, [book, publicId, router, slug]);

  const { data: similarBooks } = trpc.book.similarByPublicId.useQuery(
    { publicId: publicId ?? "", limit: 4 },
    { enabled: Boolean(publicId) }
  );

  const { data: favData } = trpc.favorite.check.useQuery(
    { bookId: book?.id ?? 0 },
    { enabled: isAuthenticated && Boolean(book?.id) }
  );

  const toggleFav = trpc.favorite.toggle.useMutation({
    onSuccess: () => {
      if (book?.id) {
        utils.favorite.check.invalidate({ bookId: book.id });
      }
    },
  });

  const createTransaction = trpc.transaction.create.useMutation({
    onSuccess: () => {
      alert("Request sent successfully!");
      router.push("/");
    },
    onError: handleTrustError,
  });

  const startConversation = trpc.message.startConversation.useMutation({
    onSuccess: () => {
      router.push("/messages");
    },
    onError: handleTrustError,
  });
  const reportListing = trpc.moderation.report.useMutation({
    onSuccess: () => alert("Report sent to the moderation team."),
    onError: handleTrustError,
  });

  const utils = trpc.useUtils();

  const isOwner = user?.publicId === book?.ownerPublicId;
  const canEditListing = book?.status === "active" || book?.status === "draft";
  const listingImages = useMemo(() => {
    if (!book) return [];
    const urls = [...(book.imageUrls ?? []), ...(book.imageUrl ? [book.imageUrl] : [])]
      .map((url) => url.trim())
      .filter(Boolean);
    return [...new Set(urls)].slice(0, 4);
  }, [book]);
  const visibleImages = useMemo(
    () => listingImages.filter((imageUrl) => !failedImages.has(imageUrl)),
    [failedImages, listingImages],
  );
  const activeImage =
    selectedImage && selectedImage.publicId === book?.publicId
      ? (visibleImages.find((imageUrl) => imageUrl === selectedImage.imageUrl) ??
        visibleImages[0])
      : visibleImages[0];
  const activeImageIndex = activeImage ? visibleImages.indexOf(activeImage) : -1;

  const deleteListing = trpc.book.delete.useMutation({
    onSuccess: () => {
      utils.book.myBooks.invalidate();
      utils.book.list.invalidate();
      utils.book.search.invalidate();
      utils.book.feed.invalidate();
      if (book?.publicId) {
        utils.book.byPublicId.invalidate({ publicId: book.publicId });
      }
      router.push("/profile/me");
    },
    onError: handleTrustError,
  });

  const handleAction = () => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    if (!book) return;

    if (book.transactionType === "swap") {
      router.push(`/swap/${makeBookSlug(book)}`);
    } else if (book.transactionType === "giveaway") {
      createTransaction.mutate({
        bookId: book.id,
        idempotencyKey: crypto.randomUUID(),
      });
    } else if (book.transactionType === "sale") {
      createTransaction.mutate({
        bookId: book.id,
        idempotencyKey: crypto.randomUUID(),
      });
    }
  };

  const handleMessage = () => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    if (!book) return;

    startConversation.mutate({
      bookId: book.id,
    });
  };

  const handleUnpublish = () => {
    if (!book || !canEditListing) return;
    const confirmed = window.confirm(
      "Unpublish this listing? It will be removed from the public book feed.",
    );
    if (!confirmed) return;
    deleteListing.mutate({ id: book.id });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <div className="max-w-[1000px] mx-auto px-4 py-8">
          <div className="animate-pulse grid md:grid-cols-5 gap-8">
            <div className="md:col-span-3 aspect-[3/4] bg-[#EEEEEE] rounded-lg" />
            <div className="md:col-span-2 space-y-4">
              <div className="h-6 bg-[#EEEEEE] rounded w-3/4" />
              <div className="h-4 bg-[#EEEEEE] rounded w-1/2" />
              <div className="h-8 bg-[#EEEEEE] rounded w-1/3" />
              <div className="h-24 bg-[#EEEEEE] rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <div className="max-w-[1000px] mx-auto px-4 py-20 text-center">
          <h2 className="text-2xl font-bold text-[#111] mb-2">Book not found</h2>
          <Link href="/" className="text-[#007782] hover:underline">
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <div className="max-w-[1000px] mx-auto px-4 py-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1 text-sm text-[#666] mb-6">
          <Link href="/" className="hover:text-[#007782]">Home</Link>
          <ChevronRight className="w-3 h-3" />
          <Link href={`/?genre=${encodeURIComponent(book.genre)}`} className="hover:text-[#007782]">
            {book.genre}
          </Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-[#111] truncate max-w-[200px]">{book.title}</span>
        </nav>

        <div className="grid md:grid-cols-5 gap-8">
          {/* Left: Image */}
          <div className="md:col-span-3">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
              <div className="relative overflow-hidden rounded-lg bg-[#F7F7F7]">
                {activeImage ? (
                  <img
                    src={activeImage}
                    alt={`${book.title} image ${activeImageIndex >= 0 ? activeImageIndex + 1 : 1}`}
                    className="max-h-[640px] w-full object-contain"
                    onError={() => {
                      setFailedImages((current) => new Set(current).add(activeImage));
                    }}
                  />
                ) : (
                  <div className="aspect-[3/4] flex items-center justify-center">
                    <span className="text-6xl font-bold text-[#007782]/20">{book.title.charAt(0)}</span>
                  </div>
                )}

                {/* Favorite */}
                {isAuthenticated && (
                  <button
                    onClick={() => toggleFav.mutate({ bookId: book.id })}
                    className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center bg-white/90 backdrop-blur-sm rounded-full shadow-md hover:bg-white transition-colors"
                    aria-label={favData?.favorited ? "Remove from favorites" : "Add to favorites"}
                  >
                    <motion.div whileTap={{ scale: 1.3 }}>
                      <Heart
                        className={`w-5 h-5 ${
                          favData?.favorited ? "fill-[#D32F2F] text-[#D32F2F]" : "text-[#666]"
                        }`}
                      />
                    </motion.div>
                  </button>
                )}
              </div>

              {visibleImages.length > 1 ? (
                <div className="grid grid-cols-4 gap-2">
                  {visibleImages.map((imageUrl, index) => (
                    <button
                      key={imageUrl}
                      type="button"
                      onClick={() =>
                        setSelectedImage({ publicId: book.publicId, imageUrl })
                      }
                      className={`overflow-hidden rounded-md border-2 bg-[#F7F7F7] transition-colors ${
                        activeImage === imageUrl
                          ? "border-[#007782]"
                          : "border-transparent hover:border-[#B8C5C8]"
                      }`}
                      aria-label={`Show book image ${index + 1}`}
                    >
                      <img
                        src={imageUrl}
                        alt=""
                        className="aspect-[3/4] w-full object-cover"
                        onError={() => {
                          setFailedImages((current) => new Set(current).add(imageUrl));
                        }}
                      />
                    </button>
                  ))}
                </div>
              ) : null}
            </motion.div>
          </div>

          {/* Right: Info */}
          <div className="md:col-span-2 space-y-5">
            {/* Transaction Badge */}
            <div>
              {book.transactionType === "swap" && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#e6f3f4] text-[#007782] text-sm font-medium rounded-full">
                  <RefreshCw className="w-4 h-4" />
                  Available for Swap
                </span>
              )}
              {book.transactionType === "giveaway" && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#E8F5E9] text-[#2E7D32] text-sm font-medium rounded-full">
                  <Gift className="w-4 h-4" />
                  Free - Giveaway
                </span>
              )}
              {book.transactionType === "sale" && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#FFF3E0] text-[#E65100] text-sm font-medium rounded-full">
                  <DollarSign className="w-4 h-4" />
                  For Sale
                </span>
              )}
            </div>

            {/* Title & Author */}
            <div>
              <h1 className="text-2xl font-bold text-[#111] mb-1">{book.title}</h1>
              <p className="text-[#666]">by {book.author}</p>
            </div>

            {/* Meta */}
            <div className="flex items-center gap-2 text-sm text-[#666]">
              <span>{conditionLabels[book.condition]}</span>
              <span className="text-[#E0E0E0]">&#183;</span>
              <span>{book.genre}</span>
              <span className="text-[#E0E0E0]">&#183;</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                Just now
              </span>
            </div>

            {/* Price */}
            <div className="pt-2 border-t border-[#E0E0E0]">
              {book.transactionType === "sale" && book.price && (
                <div className="text-3xl font-bold text-[#111]">{book.currency} {book.price}</div>
              )}
              {book.transactionType === "swap" && (
                <div className="text-xl font-semibold text-[#007782]">Swap</div>
              )}
              {book.transactionType === "giveaway" && (
                <div className="text-xl font-semibold text-[#2E7D32]">Free</div>
              )}
            </div>

            {/* Action Buttons */}
            {!isOwner && (
              <div className="space-y-2.5">
                <button
                  onClick={handleAction}
                  disabled={createTransaction.isPending}
                  className={`w-full py-3 text-white font-semibold rounded-md transition-colors disabled:opacity-50 ${
                    book.transactionType === "giveaway"
                      ? "bg-[#2E7D32] hover:bg-[#1B5E20]"
                      : "bg-[#007782] hover:bg-[#005f66]"
                  }`}
                >
                  {createTransaction.isPending
                    ? "Sending..."
                    : book.transactionType === "swap"
                    ? "Request Swap"
                    : book.transactionType === "giveaway"
                    ? "Request Book"
                    : "Reserve Book"}
                </button>
                <button
                  onClick={handleMessage}
                  disabled={startConversation.isPending}
                  className="w-full py-3 border-2 border-[#007782] text-[#007782] font-semibold rounded-md hover:bg-[#e6f3f4] transition-colors disabled:opacity-50"
                >
                  {startConversation.isPending ? "Opening..." : "Message Owner"}
                </button>
              </div>
            )}

            {book.transactionType === "sale" && (
              <div className="flex gap-2 rounded-md border border-[#FFE0B2] bg-[#FFF8E1] p-3 text-xs leading-5 text-[#8D4E00]">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                External payments are unprotected. BookSwap does not provide escrow, refunds, buyer
                protection, or delivery guarantees in V1.
              </div>
            )}

            {!isOwner ? (
              <button
                onClick={() => reportListing.mutate({ targetType: "listing", targetId: book.id, reason: "user_report" })}
                disabled={reportListing.isPending}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#666] hover:text-[#D32F2F] disabled:opacity-50"
              >
                <Flag className="h-3.5 w-3.5" />
                Report listing
              </button>
            ) : null}

            {isOwner && (
              <div className="rounded-md bg-[#e6f3f4] p-3">
                <p className="mb-3 text-sm font-semibold text-[#007782]">This is your listing</p>
                {canEditListing ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Link
                      href={`/book/${makeBookSlug(book)}/edit`}
                      className="inline-flex items-center justify-center gap-2 rounded-md bg-[#007782] px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#005f66]"
                    >
                      <Pencil className="h-4 w-4" />
                      Edit listing
                    </Link>
                    <button
                      type="button"
                      onClick={handleUnpublish}
                      disabled={deleteListing.isPending}
                      className="inline-flex items-center justify-center gap-2 rounded-md border border-[#D32F2F] bg-white px-3 py-2 text-sm font-semibold text-[#D32F2F] transition-colors hover:bg-[#FFF5F5] disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                      {deleteListing.isPending ? "Unpublishing..." : "Unpublish"}
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-[#666]">
                    This listing is {book.status} and cannot be edited.
                  </p>
                )}
              </div>
            )}

            {/* Details */}
            <div className="pt-4 border-t border-[#E0E0E0]">
              <h3 className="font-semibold text-[#111] mb-3">Book Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#666]">Title</span>
                  <span className="text-[#111] text-right max-w-[60%]">{book.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#666]">Author</span>
                  <span className="text-[#111]">{book.author}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#666]">Genre</span>
                  <span className="text-[#111]">{book.genre}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#666]">Condition</span>
                  <span className="text-[#111]">{conditionLabels[book.condition]}</span>
                </div>
                {book.isbn && (
                  <div className="flex justify-between">
                    <span className="text-[#666]">ISBN</span>
                    <span className="text-[#111]">{book.isbn}</span>
                  </div>
                )}
                {book.language && (
                  <div className="flex justify-between">
                    <span className="text-[#666]">Language</span>
                    <span className="text-[#111]">{book.language}</span>
                  </div>
                )}
                {book.pages && (
                  <div className="flex justify-between">
                    <span className="text-[#666]">Pages</span>
                    <span className="text-[#111]">{book.pages}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            {book.description && (
              <div className="pt-4 border-t border-[#E0E0E0]">
                <h3 className="font-semibold text-[#111] mb-2">Description</h3>
                <p className="text-sm text-[#666] leading-relaxed">{book.description}</p>
              </div>
            )}

            {/* Shipping */}
            <div className="pt-4 border-t border-[#E0E0E0]">
              <div className="flex items-center gap-2 text-sm">
                <Truck className="w-4 h-4 text-[#666]" />
                <span className="text-[#666]">Shipping from</span>
                <span className="font-medium text-[#111]">{book.currency} {book.shippingCost || "0"}</span>
              </div>
              {book.pickupAvailable && (
                <div className="flex items-center gap-2 text-sm mt-1">
                  <MapPin className="w-4 h-4 text-[#666]" />
                  <span className="text-[#2E7D32]">Local pickup available</span>
                </div>
              )}
            </div>

            {/* Owner Card */}
            <div className="pt-4 border-t border-[#E0E0E0]">
              <Link
                href={profilePath({ name: book.ownerName, publicId: book.ownerPublicId })}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-[#F7F7F7] transition-colors"
              >
                <img
                  src={
                    book.ownerAvatar ||
                    `https://api.dicebear.com/7.x/avataaars/svg?seed=${book.ownerName || "user"}`
                  }
                  alt={book.ownerName || "Owner"}
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[#111] text-sm">{book.ownerName || "Unknown"}</p>
                  {book.ownerLocation && (
                    <p className="text-xs text-[#666] flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {book.ownerLocation}
                    </p>
                  )}
                </div>
                <ChevronRight className="w-5 h-5 text-[#999]" />
              </Link>
            </div>
          </div>
        </div>

        {/* Similar Books */}
        {similarBooks && similarBooks.length > 0 && (
          <div className="mt-12 pt-8 border-t border-[#E0E0E0]">
            <h2 className="text-xl font-bold text-[#111] mb-4">Similar books</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {similarBooks.map((b) => (
                <Link key={b.id} href={bookPath(b)} className="group">
                  <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-all overflow-hidden">
                    <div className="aspect-[3/4] overflow-hidden bg-[#F7F7F7]">
                      {b.imageUrl ? (
                        <img
                          src={b.imageUrl}
                          alt={b.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-2xl font-bold text-[#007782]/20">{b.title.charAt(0)}</span>
                        </div>
                      )}
                    </div>
                    <div className="p-2.5">
                      <h4 className="text-sm font-medium text-[#111] line-clamp-1">{b.title}</h4>
                      <p className="text-xs text-[#666]">{b.author}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
