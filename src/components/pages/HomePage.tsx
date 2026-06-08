"use client";

import { useMemo, useState, type ComponentProps } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { trpc } from "@/providers/app-providers";
import { Navbar } from "@/components/layout/Navbar";
import { BookCard } from "@/components/books/BookCard";
import { Footer } from "@/components/layout/Footer";
import { LocationPreferencePrompt } from "@/components/location/LocationPreferencePrompt";
import { useAuth } from "@/hooks/useAuth";
import { BookOpen, RefreshCw, SlidersHorizontal } from "lucide-react";

const PAGE_SIZE = 10;

const transactionFilters = [
  { label: "All", value: "" },
  { label: "Swap", value: "swap" },
  { label: "Giveaway", value: "giveaway" },
  { label: "For Sale", value: "sale" },
];

const sortOptions = [
  { label: "Recently Added", value: "recent" },
  { label: "Price: Low to High", value: "price_asc" },
  { label: "Price: High to Low", value: "price_desc" },
];

const popularCategories = [
  { label: "Fiction", href: "/?genre=Fiction" },
  { label: "Mystery", href: "/?genre=Mystery" },
  { label: "Romance", href: "/?genre=Romance" },
  { label: "Sci-Fi & Fantasy", href: "/?genre=Sci-Fi%20%26%20Fantasy" },
  { label: "Children's books", href: "/?genre=Children%27s" },
  { label: "Academic", href: "/?genre=Academic" },
  { label: "Biography", href: "/?genre=Biography" },
  { label: "Self-Help", href: "/?genre=Self-Help" },
  { label: "Textbooks", href: "/?search=textbook" },
  { label: "Classics", href: "/?search=classic" },
];

const popularAuthorsAndGenres = [
  { label: "Anya Sharma", href: "/?search=Anya%20Sharma" },
  { label: "Marcus Reed", href: "/?search=Marcus%20Reed" },
  { label: "Isabella Chen", href: "/?search=Isabella%20Chen" },
  { label: "Victor Blackwood", href: "/?search=Victor%20Blackwood" },
  { label: "Eleanor Vance", href: "/?search=Eleanor%20Vance" },
  { label: "Cookbooks", href: "/?search=cookbook" },
  { label: "Fantasy books", href: "/?genre=Sci-Fi%20%26%20Fantasy" },
  { label: "Free reads", href: "/?transactionType=giveaway" },
  { label: "Book club picks", href: "/?search=book%20club" },
];

type HomeBook = ComponentProps<typeof BookCard>["book"];

type FeedState = {
  key: string;
  books: HomeBook[];
  hasMore: boolean;
};

type LoadErrorState = {
  key: string;
  message: string;
} | null;

function validTransactionType(value: string | null) {
  return value === "swap" || value === "giveaway" || value === "sale" ? value : "";
}

function DiscoveryChips({
  title,
  chips,
}: {
  title: string;
  chips: Array<{ label: string; href: string }>;
}) {
  return (
    <section>
      <h2 className="mb-5 text-xl font-bold text-[#111] md:text-2xl">{title}</h2>
      <div className="flex flex-wrap gap-3">
        {chips.map((chip) => (
          <Link
            key={chip.label}
            href={chip.href}
            className="rounded-md border border-[#D7DDE0] bg-white px-5 py-2.5 text-sm font-medium text-[#273444] transition-colors hover:border-[#007782] hover:text-[#007782]"
          >
            {chip.label}
          </Link>
        ))}
      </div>
    </section>
  );
}

export default function Home() {
  const searchParams = useSearchParams();
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const genreParam = searchParams.get("genre") || "";
  const searchParam = searchParams.get("search") || "";
  const transactionParam = validTransactionType(searchParams.get("transactionType"));

  const transactionContext = `${genreParam}:${searchParam}:${transactionParam}`;
  const [transactionFilter, setTransactionFilter] = useState({
    context: transactionContext,
    value: transactionParam,
  });
  const transactionType =
    transactionFilter.context === transactionContext
      ? transactionFilter.value
      : transactionParam;
  const [sort, setSort] = useState("recent");
  const filterKey = `${genreParam}:${searchParam}:${transactionType}:${sort}`;
  const [feedState, setFeedState] = useState<FeedState>({
    key: "",
    books: [],
    hasMore: false,
  });
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<LoadErrorState>(null);

  const listQuery = trpc.book.list.useQuery({
    genre: genreParam || undefined,
    search: searchParam || undefined,
    transactionType: (transactionType as "swap" | "giveaway" | "sale") || undefined,
    sort: sort as "recent" | "price_asc" | "price_desc",
    limit: PAGE_SIZE,
    offset: 0,
  }, { enabled: !searchParam, retry: 1 });
  const searchQuery = trpc.book.search.useQuery({
    genre: genreParam || undefined,
    search: searchParam || "__disabled__",
    transactionType: (transactionType as "swap" | "giveaway" | "sale") || undefined,
    sort: sort as "recent" | "price_asc" | "price_desc",
    limit: PAGE_SIZE,
    offset: 0,
  }, { enabled: Boolean(searchParam), retry: 1 });
  const activeQuery = searchParam ? searchQuery : listQuery;
  const firstPageBooks = useMemo(
    () => (searchParam ? searchQuery.data?.items ?? [] : listQuery.data ?? []),
    [listQuery.data, searchParam, searchQuery.data?.items],
  );
  const extraBooks = useMemo(
    () => (feedState.key === filterKey ? feedState.books : []),
    [feedState.books, feedState.key, filterKey],
  );
  const books = useMemo(() => {
    const seen = new Set<number>();
    return [...firstPageBooks, ...extraBooks].filter((book) => {
      if (seen.has(book.id)) return false;
      seen.add(book.id);
      return true;
    });
  }, [extraBooks, firstPageBooks]);
  const firstPageLoaded = searchParam ? Boolean(searchQuery.data) : Boolean(listQuery.data);
  const hasMore =
    feedState.key === filterKey
      ? feedState.hasMore
      : firstPageLoaded && firstPageBooks.length === PAGE_SIZE;
  const isInitialLoading = activeQuery.isLoading && books.length === 0;
  const isLoadingMore = loadingMore || (activeQuery.isFetching && books.length > 0);
  const isFeedError = activeQuery.isError;
  const bookIds = useMemo(() => books.map((book) => book.id), [books]);
  const currentLoadError = loadError?.key === filterKey ? loadError.message : null;

  const favoritesQuery = trpc.favorite.checkMany.useQuery(
    { bookIds },
    {
      enabled: isAuthenticated && bookIds.length > 0,
      staleTime: 30_000,
      retry: false,
    },
  );

  const toggleFavorite = trpc.favorite.toggle.useMutation({
    onSuccess: (_data, variables) => {
      utils.favorite.check.invalidate({ bookId: variables.bookId });
      utils.favorite.checkMany.invalidate();
      utils.favorite.list.invalidate();
    },
  });

  async function loadMore() {
    setLoadingMore(true);
    setLoadError(null);
    try {
      const input = {
        genre: genreParam || undefined,
        transactionType: (transactionType as "swap" | "giveaway" | "sale") || undefined,
        sort: sort as "recent" | "price_asc" | "price_desc",
        limit: PAGE_SIZE,
        offset: books.length,
      };
      const nextPage = searchParam
        ? (await utils.book.search.fetch({ ...input, search: searchParam })).items
        : await utils.book.list.fetch(input);

      setFeedState((current) => {
        const baseBooks = current.key === filterKey ? current.books : [];
        const seen = new Set([...firstPageBooks, ...baseBooks].map((book) => book.id));
        const appended = nextPage.filter((book) => !seen.has(book.id));
        return {
          key: filterKey,
          books: [...baseBooks, ...appended],
          hasMore: nextPage.length === PAGE_SIZE,
        };
      });
    } catch (error) {
      setLoadError({
        key: filterKey,
        message: error instanceof Error ? error.message : "Unable to load more books.",
      });
    } finally {
      setLoadingMore(false);
    }
  }

  function retryFeed() {
    activeQuery.refetch();
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero Banner */}
      <section className="relative h-[280px] md:h-[320px] overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url(/images/hero.jpg)" }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent" />
        </div>
        <div className="relative max-w-[1200px] mx-auto px-4 h-full flex items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="bg-white/95 backdrop-blur-sm rounded-xl p-6 md:p-8 max-w-sm shadow-lg"
          >
            <h1 className="text-2xl md:text-3xl font-bold text-[#111] mb-2">
              Share the Stories You Love
            </h1>
            <p className="text-sm text-[#666] mb-5">
              Swap, give away, or sell your books to fellow readers
            </p>
            <Link
              href="/list"
              className="block w-full text-center py-2.5 bg-[#007782] text-white font-semibold rounded-md hover:bg-[#005f66] transition-colors"
            >
              List a Book
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Filter Bar */}
      <section className="sticky top-[105px] z-40 bg-white border-b border-[#E0E0E0]">
        <div className="max-w-[1200px] mx-auto px-4 py-3 flex flex-wrap items-center gap-3">
          {/* Transaction Type Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {transactionFilters.map((filter) => (
              <button
                key={filter.value}
                onClick={() =>
                  setTransactionFilter({
                    context: transactionContext,
                    value: filter.value,
                  })
                }
                className={`px-3.5 py-1.5 text-sm font-medium rounded-full transition-all ${
                  transactionType === filter.value
                    ? "bg-[#007782] text-white"
                    : "bg-[#F7F7F7] text-[#111] hover:bg-[#EEEEEE]"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <div className="flex-1" />

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-[#666]" />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="text-sm text-[#111] bg-[#F7F7F7] border-none rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#007782]/20 cursor-pointer"
            >
              {sortOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <LocationPreferencePrompt />

      {/* Book Grid */}
      <section className="mx-auto max-w-[1200px] px-4 py-5 md:py-6">
        {/* Active filters display */}
        {(genreParam || searchParam || transactionType) && (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="text-sm text-[#666]">Results for:</span>
            {genreParam && (
              <span className="px-2.5 py-1 bg-[#e6f3f4] text-[#007782] text-xs font-medium rounded-full">
                {genreParam}
              </span>
            )}
            {searchParam && (
              <span className="px-2.5 py-1 bg-[#e6f3f4] text-[#007782] text-xs font-medium rounded-full">
                &quot;{searchParam}&quot;
              </span>
            )}
            {transactionType && (
              <span className="px-2.5 py-1 bg-[#e6f3f4] text-[#007782] text-xs font-medium rounded-full">
                {transactionFilters.find((filter) => filter.value === transactionType)?.label}
              </span>
            )}
          </div>
        )}
        {searchQuery.data?.degradedSearch ? (
          <p className="mb-4 rounded-md bg-[#FFF8E1] px-3 py-2 text-sm text-[#8D4E00]">
            Full-text search is temporarily unavailable. Showing basic title and author matches.
          </p>
        ) : null}

        {isFeedError ? (
          <div className="mb-5 flex flex-col gap-3 rounded-md border border-[#F2D6C7] bg-[#FFF8F4] px-4 py-3 text-sm text-[#8D3D12] sm:flex-row sm:items-center sm:justify-between">
            <span>{activeQuery.error?.message || "Unable to load books right now."}</span>
            <button
              type="button"
              onClick={retryFeed}
              className="inline-flex items-center gap-2 rounded-md border border-[#E6B99B] bg-white px-3 py-2 font-semibold text-[#8D3D12] transition-colors hover:border-[#007782] hover:text-[#007782]"
            >
              <RefreshCw className="h-4 w-4" />
              Retry
            </button>
          </div>
        ) : null}

        {isInitialLoading ? (
          /* Loading Skeleton */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-[3/4] bg-[#EEEEEE] rounded-lg mb-3" />
                <div className="h-4 bg-[#EEEEEE] rounded mb-2 w-3/4" />
                <div className="h-3 bg-[#EEEEEE] rounded mb-2 w-1/2" />
                <div className="h-3 bg-[#EEEEEE] rounded w-1/3" />
              </div>
            ))}
          </div>
        ) : books && books.length > 0 ? (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {books.map((book, index) => (
                <BookCard
                  key={book.id}
                  book={book}
                  index={index % PAGE_SIZE}
                  isFavorited={favoritesQuery.data?.[book.id] ?? false}
                  favoritePending={toggleFavorite.isPending}
                  onToggleFavorite={
                    isAuthenticated
                      ? (bookId) => toggleFavorite.mutate({ bookId })
                      : undefined
                  }
                />
              ))}
            </div>
            {hasMore ? (
              <div className="flex justify-center pt-9">
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={isLoadingMore}
                  className="rounded-md bg-[#007782] px-8 py-3 text-base font-bold text-white transition-colors hover:bg-[#005f66] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoadingMore ? "Loading..." : "Show more"}
                </button>
              </div>
            ) : null}
            {currentLoadError ? (
              <p className="pt-4 text-center text-sm text-[#8D3D12]">
                {currentLoadError}
              </p>
            ) : null}
          </>
        ) : (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-20">
            <BookOpen className="w-16 h-16 text-[#999] mb-4" />
            <h3 className="text-lg font-semibold text-[#111] mb-1">No books found</h3>
            <p className="text-sm text-[#666]">
              Try adjusting your filters or search terms
            </p>
          </div>
        )}
      </section>

      <section className="mx-auto grid max-w-[1200px] gap-10 px-4 py-12 md:grid-cols-2 md:py-14">
        <DiscoveryChips title="Popular book categories" chips={popularCategories} />
        <DiscoveryChips title="Popular authors & genres" chips={popularAuthorsAndGenres} />
      </section>

      <section className="mx-auto max-w-[1200px] px-4 pb-4">
        <div className="grid gap-4 border-y border-[#E0E0E0] py-6 md:grid-cols-3">
          <div>
            <p className="text-sm font-bold text-[#111]">Swap</p>
            <p className="mt-1 text-sm text-[#666]">Trade finished books for your next read.</p>
          </div>
          <div>
            <p className="text-sm font-bold text-[#111]">Give away</p>
            <p className="mt-1 text-sm text-[#666]">Pass stories to another reader for free.</p>
          </div>
          <div>
            <p className="text-sm font-bold text-[#111]">Sell</p>
            <p className="mt-1 text-sm text-[#666]">List books with clear prices and conditions.</p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
