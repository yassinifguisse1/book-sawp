"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { trpc } from "@/providers/app-providers";
import { Navbar } from "@/components/layout/Navbar";
import { useAuth } from "@/hooks/useAuth";
import { useTrustActionRedirect } from "@/hooks/useTrustActionRedirect";
import { bookPath, makeBookSlug, makeProfileSlug, parsePublicSlug } from "@/lib/slugs";
import { useEffect, useState } from "react";
import {
  MapPin,
  Calendar,
  BookOpen,
  RefreshCw,
  Star,
  Heart,
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

function ProfileNotFound() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <BookOpen className="w-16 h-16 text-[#999] mx-auto mb-4" />
        <h2 className="text-xl font-bold text-[#111] mb-2">Profile not found</h2>
        <Link href="/" className="text-[#007782] hover:underline">
          Back to home
        </Link>
      </div>
    </div>
  );
}

export default function Profile() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const { user: currentUser, isAuthenticated, isLoading: authLoading } = useAuth();
  const utils = trpc.useUtils();
  const handleTrustError = useTrustActionRedirect();
  const isMeRoute = slug === "me";
  const parsedPublicId = isMeRoute ? currentUser?.publicId ?? null : parsePublicSlug(slug);
  const [activeTab, setActiveTab] = useState<"books" | "swaps" | "reviews">("books");

  const {
    data: profile,
    isLoading: profileLoading,
    error: profileError,
  } = trpc.profile.public.useQuery(
    { publicId: parsedPublicId ?? "" },
    { enabled: Boolean(parsedPublicId) },
  );

  const isMyProfile =
    isMeRoute ||
    Boolean(currentUser?.publicId && parsedPublicId && currentUser.publicId === parsedPublicId);

  useEffect(() => {
    if (isMeRoute || !profile) return;
    const canonicalSlug = makeProfileSlug(profile.user);
    if (slug !== canonicalSlug) {
      router.replace(`/profile/${canonicalSlug}`);
    }
  }, [isMeRoute, profile, router, slug]);

  const { data: myBooks, isLoading: myBooksLoading } = trpc.book.myBooks.useQuery(
    undefined,
    { enabled: isAuthenticated && isMyProfile },
  );

  const { data: favorites } = trpc.favorite.list.useQuery(
    undefined,
    { enabled: isAuthenticated && isMyProfile },
  );

  const deleteListing = trpc.book.delete.useMutation({
    onSuccess: () => {
      utils.book.myBooks.invalidate();
      utils.profile.public.invalidate();
      utils.book.list.invalidate();
      utils.book.search.invalidate();
      utils.book.feed.invalidate();
    },
    onError: handleTrustError,
  });

  const handleUnpublish = (bookId: number) => {
    const confirmed = window.confirm(
      "Unpublish this listing? It will be removed from the public book feed.",
    );
    if (!confirmed) return;
    deleteListing.mutate({ id: bookId });
  };

  if (isMeRoute && authLoading) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <div className="max-w-[1000px] mx-auto px-4 py-8">
          <div className="h-44 animate-pulse rounded-xl bg-[#EEEEEE]" />
        </div>
      </div>
    );
  }

  if (isMeRoute && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <div className="max-w-md mx-auto px-4 py-20 text-center">
          <BookOpen className="w-16 h-16 text-[#999] mx-auto mb-4" />
          <h2 className="text-xl font-bold text-[#111] mb-2">Sign in to view your profile</h2>
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

  if (!isMeRoute && !parsedPublicId) {
    return <ProfileNotFound />;
  }

  if (profileLoading || (isMyProfile && myBooksLoading && !profile)) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <div className="max-w-[1000px] mx-auto px-4 py-8">
          <div className="h-44 animate-pulse rounded-xl bg-[#EEEEEE]" />
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="aspect-[3/4] animate-pulse rounded-lg bg-[#EEEEEE]" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!profile || profileError) {
    return <ProfileNotFound />;
  }

  const profileUser = profile.user;
  const displayBooks = isMyProfile ? myBooks : profile.books;
  const userReviews = profile.reviews;
  const totalBooks = displayBooks?.length ?? 0;
  const swapBooks = displayBooks?.filter((book) => book.transactionType === "swap").length ?? 0;
  const avgRating = userReviews.length
    ? (userReviews.reduce((sum, review) => sum + review.rating, 0) / userReviews.length).toFixed(1)
    : "0";
  const location =
    profileUser.location ||
    [profileUser.city, profileUser.country].filter(Boolean).join(", ") ||
    "Location TBD";
  const joined = profileUser.createdAt.toLocaleDateString(undefined, {
    month: "short",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <div className="max-w-[1000px] mx-auto px-4 py-8">
        <div className="bg-[#F7F7F7] rounded-xl p-6 md:p-8 mb-6">
          <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6">
            <img
              src={
                profileUser.avatar ||
                `https://api.dicebear.com/7.x/avataaars/svg?seed=${profileUser.publicId}`
              }
              alt={profileUser.name || "Profile"}
              className="w-20 h-20 md:w-24 md:h-24 rounded-full object-cover border-4 border-white shadow-md"
            />
            <div className="text-center md:text-left">
              <h1 className="text-xl md:text-2xl font-bold text-[#111]">
                {isMyProfile ? profileUser.name || "My Profile" : profileUser.name || "BookSwap member"}
              </h1>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-2 text-sm text-[#666]">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {location}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  Member since {joined}
                </span>
              </div>
              {profileUser.bio && (
                <p className="text-sm text-[#666] mt-2 max-w-md">{profileUser.bio}</p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-center md:justify-start gap-6 mt-6 pt-6 border-t border-[#E0E0E0]">
            <div className="text-center">
              <div className="text-xl font-bold text-[#111]">{totalBooks}</div>
              <div className="text-xs text-[#666]">Books Listed</div>
            </div>
            <div className="w-px h-8 bg-[#E0E0E0]" />
            <div className="text-center">
              <div className="text-xl font-bold text-[#111]">{swapBooks}</div>
              <div className="text-xs text-[#666]">For Swap</div>
            </div>
            <div className="w-px h-8 bg-[#E0E0E0]" />
            <div className="text-center">
              <div className="text-xl font-bold text-[#111] flex items-center gap-1">
                {avgRating}
                <Star className="w-4 h-4 fill-[#FFB800] text-[#FFB800]" />
              </div>
              <div className="text-xs text-[#666]">Rating</div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-0 border-b border-[#E0E0E0] mb-6">
          {[
            { key: "books" as const, label: isMyProfile ? "My Books" : "Books", icon: BookOpen },
            { key: "swaps" as const, label: "Swaps", icon: RefreshCw },
            { key: "reviews" as const, label: "Reviews", icon: Star },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? "border-[#007782] text-[#007782]"
                  : "border-transparent text-[#666] hover:text-[#111]"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "books" && (
          <div>
            {isMyProfile && favorites && favorites.length > 0 && (
              <div className="mb-8">
                <h2 className="text-lg font-semibold text-[#111] mb-3 flex items-center gap-2">
                  <Heart className="w-5 h-5 text-[#D32F2F]" />
                  My Favorites
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {favorites.slice(0, 4).map((book) => (
                    <Link key={book.id} href={bookPath(book)} className="group">
                      <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-all overflow-hidden">
                        <div className="aspect-[3/4] overflow-hidden bg-[#F7F7F7]">
                          {book.imageUrl ? (
                            <img
                              src={book.imageUrl}
                              alt={book.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <span className="text-2xl font-bold text-[#007782]/20">
                                {book.title.charAt(0)}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="p-2.5">
                          <h4 className="text-sm font-medium text-[#111] line-clamp-1">
                            {book.title}
                          </h4>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <h2 className="text-lg font-semibold text-[#111] mb-3">
              {isMyProfile ? "My Listings" : "Books for Exchange"}
            </h2>
            {displayBooks && displayBooks.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {displayBooks.map((book) => {
                  const bookId = "id" in book && typeof book.id === "number" ? book.id : null;
                  const canEditListing =
                    Boolean(bookId) && (book.status === "active" || book.status === "draft");

                  return (
                    <div key={book.publicId} className="group relative">
                      <Link href={bookPath(book)} className="block">
                        <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-all overflow-hidden">
                          <div className="aspect-[3/4] overflow-hidden bg-[#F7F7F7]">
                            {book.imageUrl ? (
                              <img
                                src={book.imageUrl}
                                alt={book.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <span className="text-2xl font-bold text-[#007782]/20">
                                  {book.title.charAt(0)}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="p-2.5">
                            <h4 className="text-sm font-medium text-[#111] line-clamp-1">
                              {book.title}
                            </h4>
                            <p className="text-xs text-[#666]">{book.author}</p>
                            <div className="flex items-center justify-between mt-1">
                              <span className="text-xs text-[#999]">
                                {conditionLabels[book.condition]}
                              </span>
                              <span
                                className={`text-xs font-medium ${
                                  book.transactionType === "swap"
                                    ? "text-[#007782]"
                                    : book.transactionType === "giveaway"
                                      ? "text-[#2E7D32]"
                                      : "text-[#E65100]"
                                }`}
                              >
                                {book.transactionType === "swap"
                                  ? "Swap"
                                  : book.transactionType === "giveaway"
                                    ? "Free"
                                    : `${book.currency} ${book.price}`}
                              </span>
                            </div>
                          </div>
                        </div>
                      </Link>
                      {isMyProfile && (
                        <>
                          <div className="absolute top-2 right-2">
                            <span
                              className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${
                                book.status === "active"
                                  ? "bg-[#E8F5E9] text-[#2E7D32]"
                                  : "bg-[#FFF3E0] text-[#E65100]"
                              }`}
                            >
                              {book.status}
                            </span>
                          </div>
                          <div className="mt-2 grid grid-cols-2 gap-2">
                            <Link
                              href={`/book/${makeBookSlug(book)}/edit`}
                              aria-disabled={!canEditListing}
                              className={`inline-flex items-center justify-center gap-1.5 rounded-md border px-2 py-1.5 text-xs font-semibold transition-colors ${
                                canEditListing
                                  ? "border-[#007782] text-[#007782] hover:bg-[#e6f3f4]"
                                  : "pointer-events-none border-[#E0E0E0] text-[#999]"
                              }`}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Edit
                            </Link>
                            <button
                              type="button"
                              onClick={() => {
                                if (bookId) handleUnpublish(bookId);
                              }}
                              disabled={!canEditListing || deleteListing.isPending}
                              className="inline-flex items-center justify-center gap-1.5 rounded-md border border-[#D32F2F] px-2 py-1.5 text-xs font-semibold text-[#D32F2F] transition-colors hover:bg-[#FFF5F5] disabled:pointer-events-none disabled:border-[#E0E0E0] disabled:text-[#999]"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Unpublish
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <BookOpen className="w-12 h-12 text-[#999] mx-auto mb-3" />
                <p className="text-[#666]">No books listed yet</p>
                {isMyProfile && (
                  <Link
                    href="/list"
                    className="inline-block mt-3 text-[#007782] hover:underline text-sm"
                  >
                    List your first book
                  </Link>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === "swaps" && (
          <div className="text-center py-12">
            <RefreshCw className="w-12 h-12 text-[#999] mx-auto mb-3" />
            <p className="text-[#666]">Swap history will appear here</p>
          </div>
        )}

        {activeTab === "reviews" && (
          <div>
            {userReviews.length > 0 ? (
              <div className="space-y-4">
                {userReviews.map((review) => (
                  <div
                    key={review.publicId}
                    className="p-4 bg-white border border-[#E0E0E0] rounded-lg"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <img
                        src={
                          review.reviewerAvatar ||
                          `https://api.dicebear.com/7.x/avataaars/svg?seed=${review.reviewerName || "user"}`
                        }
                        alt={review.reviewerName || "Reviewer"}
                        className="w-8 h-8 rounded-full"
                      />
                      <div>
                        <p className="text-sm font-medium text-[#111]">
                          {review.reviewerName || "Anonymous"}
                        </p>
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3 h-3 ${
                                i < review.rating
                                  ? "fill-[#FFB800] text-[#FFB800]"
                                  : "text-[#E0E0E0]"
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                    {review.comment && (
                      <p className="text-sm text-[#666]">{review.comment}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Star className="w-12 h-12 text-[#999] mx-auto mb-3" />
                <p className="text-[#666]">No reviews yet</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
