"use client";

import { useCallback, useEffect, useMemo, useState, type ComponentProps } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { trpc } from "@/providers/app-providers";
import { Navbar } from "@/components/layout/Navbar";
import { BookCard } from "@/components/books/BookCard";
import { Footer } from "@/components/layout/Footer";
import { useAuth } from "@/hooks/useAuth";
import { useBrowseContext } from "@/hooks/useBrowseContext";
import { countryName } from "@/lib/location-format";
import type { DiscoveryListing } from "@/server/platform/marketplace-search";
import { BookOpen, RefreshCw, SlidersHorizontal, MapPin } from "lucide-react";

const SECTION_PAGE_SIZE = 8;

const transactionFilters = [
  { label: "All", value: "" },
  { label: "Swap", value: "swap" },
  { label: "Giveaway", value: "giveaway" },
  { label: "For Sale", value: "sale" },
];

const sortOptions = [
  { label: "Best match", value: "relevance" },
  { label: "Recently Added", value: "recent" },
  { label: "Closest first", value: "distance" },
  { label: "Price: Low to High", value: "price_asc" },
  { label: "Price: High to Low", value: "price_desc" },
];

const deliveryOptions = [
  { label: "Pickup or shipping", value: "both" },
  { label: "Pickup only", value: "pickup" },
  { label: "Shipping only", value: "ship" },
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
];

type DiscoverItem = DiscoveryListing;

type BookCardBook = ComponentProps<typeof BookCard>["book"];

function validTransactionType(value: string | null) {
  return value === "swap" || value === "giveaway" || value === "sale" ? value : "";
}

function toBookCardBook(item: DiscoverItem): BookCardBook {
  return {
    id: item.id,
    publicId: item.publicId,
    title: item.title,
    author: item.author,
    genre: item.genre,
    condition: item.condition,
    transactionType: item.transactionType,
    price: item.price,
    currency: item.currency,
    imageUrl: item.imageUrl,
    ownerName: item.owner.name,
    ownerAvatar: item.owner.avatar,
    createdAt: item.createdAt,
    displayLocation: item.displayLocation,
    distanceLabel: item.distanceLabel,
    pickupAvailable: item.pickupAvailable,
    shipsToYou: item.shipsToYou,
    isDemo: item.owner.name === "BookSwap Team",
  };
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const { context } = useBrowseContext();

  const genreParam = searchParams.get("genre") || "";
  const searchParam = searchParams.get("search") || "";
  const transactionType = validTransactionType(searchParams.get("transactionType"));
  const sort = searchParams.get("sort") || "relevance";
  const delivery = searchParams.get("delivery") || "both";
  const categoryParam = searchParams.get("category") || "";
  const localOnly = searchParams.get("localOnly") === "1";

  const radiusParam = searchParams.get("radius");
  const parsedRadius = radiusParam && radiusParam !== "any" ? Number(radiusParam) : NaN;
  const radiusKm =
    radiusParam === "any"
      ? null
      : Number.isFinite(parsedRadius) && parsedRadius > 0
        ? parsedRadius
        : context.radiusKm;
  const locationParam = searchParams.get("location");
  const parsedLocation = locationParam ? Number(locationParam) : NaN;
  const locationId =
    Number.isFinite(parsedLocation) && parsedLocation > 0
      ? parsedLocation
      : context.locationId ?? undefined;
  const countryCode = searchParams.get("country") || context.countryCode;
  const includeDomesticShipping = searchParams.has("domestic")
    ? searchParams.get("domestic") === "1"
    : context.includeDomesticShipping;
  const includeInternationalShipping = searchParams.has("intl")
    ? searchParams.get("intl") === "1"
    : context.includeInternationalShipping;

  const [nearLimit, setNearLimit] = useState(SECTION_PAGE_SIZE);
  const [countryLimit, setCountryLimit] = useState(SECTION_PAGE_SIZE);
  const [intlLimit, setIntlLimit] = useState(SECTION_PAGE_SIZE);


  const discoverInput = useMemo(
    () => ({
      locationId: locationId ?? undefined,
      countryCode,
      radiusKm,
      includeDomesticShipping,
      includeInternationalShipping,
      search: searchParam || undefined,
      genre: genreParam || undefined,
      categorySlug: categoryParam || undefined,
      transactionType: (transactionType as "swap" | "giveaway" | "sale") || undefined,
      deliveryMode: delivery as "pickup" | "ship" | "both",
      localOnly: localOnly || undefined,
      sort: sort as "relevance" | "recent" | "price_asc" | "price_desc" | "distance",
      perGroupLimit: Math.min(40, Math.max(nearLimit, countryLimit, intlLimit)),
    }),
    [
      categoryParam,
      countryCode,
      countryLimit,
      delivery,
      genreParam,
      includeDomesticShipping,
      includeInternationalShipping,
      intlLimit,
      localOnly,
      locationId,
      nearLimit,
      radiusKm,
      searchParam,
      sort,
      transactionType,
    ],
  );

  const filterKey = JSON.stringify({ ...discoverInput, perGroupLimit: undefined });
  useEffect(() => {
    setNearLimit(SECTION_PAGE_SIZE);
    setCountryLimit(SECTION_PAGE_SIZE);
    setIntlLimit(SECTION_PAGE_SIZE);
  }, [filterKey]);

  const discoverQuery = trpc.discovery.discover.useQuery(discoverInput, {
    retry: 1,
    refetchOnWindowFocus: false,
  });

  // Auto-fallback: when local results are empty, query anywhere
  const fallbackInput = useMemo(
    () => ({
      ...discoverInput,
      radiusKm: null as number | null,
      includeDomesticShipping: true,
      includeInternationalShipping: true,
    }),
    [discoverInput],
  );

  const data = discoverQuery.data;

  const fallbackQuery = trpc.discovery.discover.useQuery(fallbackInput, {
    enabled: data?.meta.totalEligible === 0 && !discoverQuery.isLoading,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const fallbackData = fallbackQuery.data;

  const activeData = data && data.meta.totalEligible > 0 ? data : fallbackData;

  const allIds = useMemo(() => {
    if (!activeData) return [];
    return [
      ...activeData.nearYou.items,
      ...activeData.inCountry.items,
      ...activeData.international.items,
    ].map((item) => item.id);
  }, [activeData]);

  const favoritesQuery = trpc.favorite.checkMany.useQuery(
    { bookIds: allIds },
    { enabled: isAuthenticated && allIds.length > 0, staleTime: 30_000, retry: false },
  );

  const toggleFavorite = trpc.favorite.toggle.useMutation({
    onSuccess: (_data, variables) => {
      utils.favorite.check.invalidate({ bookId: variables.bookId });
      utils.favorite.checkMany.invalidate();
      utils.favorite.list.invalidate();
    },
  });

  const setParam = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParamsString);
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") params.delete(key);
        else params.set(key, value);
      }
      const next = params.toString();
      router.replace(next ? `/?${next}` : "/", { scroll: false });
    },
    [router, searchParamsString],
  );

  const renderCards = (items: DiscoverItem[]) =>
    items.map((item, index) => {
      const book = toBookCardBook(item);
      return (
        <BookCard
          key={item.publicId}
          book={book}
          index={index % SECTION_PAGE_SIZE}
          isFavorited={favoritesQuery.data?.[item.id] ?? false}
          favoritePending={toggleFavorite.isPending}
          onToggleFavorite={
            isAuthenticated ? (bookId) => toggleFavorite.mutate({ bookId }) : undefined
          }
        />
      );
    });

  const isInitialLoading = discoverQuery.isLoading && !data;
  const distanceUnitNote = data?.meta.distanceUnit === "mi" ? "miles" : "kilometers";

  const expandRadius = () => {
    const ladder = [5, 10, 25, 50, 100];
    const current = radiusKm ?? Infinity;
    const next = ladder.find((value) => value > current);
    setParam({ radius: next ? String(next) : "any" });
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero Banner */}
      <section className="relative h-[280px] overflow-hidden md:h-[320px]">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url(/images/hero.jpg)" }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent" />
        </div>
        <div className="relative mx-auto flex h-full max-w-[1200px] items-center px-4">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-sm rounded-xl bg-white/95 p-6 shadow-lg backdrop-blur-sm md:p-8"
          >
            <h1 className="mb-2 text-2xl font-bold text-[#111] md:text-3xl">
              Share the Stories You Love
            </h1>
            <p className="mb-5 text-sm text-[#666]">
              Swap, give away, or sell your books to fellow readers
            </p>
            <Link
              href="/list"
              className="block w-full rounded-md bg-[#007782] py-2.5 text-center font-semibold text-white transition-colors hover:bg-[#005f66]"
            >
              List a Book
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Filter Bar */}
      <section className="sticky top-[105px] z-40 border-b border-[#E0E0E0] bg-white">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-3 px-4 py-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {transactionFilters.map((filter) => (
              <button
                key={filter.value}
                onClick={() => setParam({ transactionType: filter.value || null })}
                className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-all ${
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

          <div className="flex items-center gap-2">
            <select
              value={delivery}
              onChange={(event) => setParam({ delivery: event.target.value })}
              className="cursor-pointer rounded-md border-none bg-[#F7F7F7] px-3 py-1.5 text-sm text-[#111] focus:outline-none focus:ring-2 focus:ring-[#007782]/20"
            >
              {deliveryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <SlidersHorizontal className="h-4 w-4 text-[#666]" />
            <select
              value={sort}
              onChange={(event) => setParam({ sort: event.target.value })}
              className="cursor-pointer rounded-md border-none bg-[#F7F7F7] px-3 py-1.5 text-sm text-[#111] focus:outline-none focus:ring-2 focus:ring-[#007782]/20"
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

      <section className="mx-auto max-w-[1200px] px-4 py-5 md:py-6">
        {(genreParam || searchParam || transactionType || categoryParam) && (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="text-sm text-[#666]">Results for:</span>
            {genreParam && (
              <span className="rounded-full bg-[#e6f3f4] px-2.5 py-1 text-xs font-medium text-[#007782]">
                {genreParam}
              </span>
            )}
            {searchParam && (
              <span className="rounded-full bg-[#e6f3f4] px-2.5 py-1 text-xs font-medium text-[#007782]">
                &quot;{searchParam}&quot;
              </span>
            )}
            {transactionType && (
              <span className="rounded-full bg-[#e6f3f4] px-2.5 py-1 text-xs font-medium text-[#007782]">
                {transactionFilters.find((filter) => filter.value === transactionType)?.label}
              </span>
            )}
          </div>
        )}

        {discoverQuery.isError ? (
          <div className="mb-5 flex flex-col gap-3 rounded-md border border-[#F2D6C7] bg-[#FFF8F4] px-4 py-3 text-sm text-[#8D3D12] sm:flex-row sm:items-center sm:justify-between">
            <span>
              We could not refresh listings right now. You can still browse with your current
              filters or try again.
            </span>
            <button
              type="button"
              onClick={() => discoverQuery.refetch()}
              className="inline-flex items-center gap-2 rounded-md border border-[#E6B99B] bg-white px-3 py-2 font-semibold text-[#8D3D12] transition-colors hover:border-[#007782] hover:text-[#007782]"
            >
              <RefreshCw className="h-4 w-4" />
              Retry
            </button>
          </div>
        ) : null}

        {isInitialLoading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="mb-3 aspect-[3/4] rounded-lg bg-[#EEEEEE]" />
                <div className="mb-2 h-4 w-3/4 rounded bg-[#EEEEEE]" />
                <div className="mb-2 h-3 w-1/2 rounded bg-[#EEEEEE]" />
                <div className="h-3 w-1/3 rounded bg-[#EEEEEE]" />
              </div>
            ))}
          </div>
        ) : data && data.meta.totalEligible > 0 ? (
          <div className="space-y-10">
            {/* Near you */}
            {data.nearYou.total > 0 ? (
              <DiscoverySection
                title="Near you"
                subtitle={`Within ${radiusKm === null ? "any distance" : `${radiusKm} km`} of ${
                  context.cityName ?? countryName(countryCode)
                }`}
                total={data.nearYou.total}
                limit={nearLimit}
                onShowMore={() => setNearLimit((value) => value + SECTION_PAGE_SIZE)}
              >
                {renderCards(data.nearYou.items.slice(0, nearLimit))}
              </DiscoverySection>
            ) : null}

            {data.meta.sparseNearby ? (
              <div className="rounded-lg border border-[#D7E8EA] bg-[#F4FAFB] px-4 py-4">
                <p className="mb-3 flex items-center gap-2 text-sm font-medium text-[#0B5560]">
                  <MapPin className="h-4 w-4" />
                  Only a few books were found nearby.
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={expandRadius}
                    className="rounded-md border border-[#9FCBD0] bg-white px-3 py-1.5 text-sm font-semibold text-[#007782] hover:border-[#007782]"
                  >
                    Expand search radius
                  </button>
                  <button
                    type="button"
                    onClick={() => setParam({ domestic: "1" })}
                    className="rounded-md border border-[#9FCBD0] bg-white px-3 py-1.5 text-sm font-semibold text-[#007782] hover:border-[#007782]"
                  >
                    Show all in {countryName(countryCode)}
                  </button>
                  <button
                    type="button"
                    onClick={() => setParam({ intl: "1" })}
                    className="rounded-md border border-[#9FCBD0] bg-white px-3 py-1.5 text-sm font-semibold text-[#007782] hover:border-[#007782]"
                  >
                    Include international results
                  </button>
                </div>
              </div>
            ) : null}

            {/* In country */}
            {data.inCountry.total > 0 ? (
              <DiscoverySection
                title={`Available in ${data.meta.countryName}`}
                subtitle={`Books shipped or picked up across ${data.meta.countryName}`}
                total={data.inCountry.total}
                limit={countryLimit}
                onShowMore={() => setCountryLimit((value) => value + SECTION_PAGE_SIZE)}
              >
                {renderCards(data.inCountry.items.slice(0, countryLimit))}
              </DiscoverySection>
            ) : null}

            {/* International */}
            {data.international.total > 0 ? (
              <DiscoverySection
                title="International options"
                subtitle="Sellers abroad who can ship to your country"
                total={data.international.total}
                limit={intlLimit}
                onShowMore={() => setIntlLimit((value) => value + SECTION_PAGE_SIZE)}
              >
                {renderCards(data.international.items.slice(0, intlLimit))}
              </DiscoverySection>
            ) : null}

            <p className="text-center text-xs text-[#999]">
              Distances are approximate, shown in {distanceUnitNote}. Exact addresses are never shared.
            </p>
          </div>
        ) : fallbackData && fallbackData.meta.totalEligible > 0 ? (
          <div className="space-y-6">
            <div className="rounded-lg border border-[#D7E8EA] bg-[#F4FAFB] px-4 py-4">
              <p className="mb-2 flex items-center gap-2 text-sm font-medium text-[#0B5560]">
                <MapPin className="h-4 w-4" />
                No books found nearby — showing listings from around the world.
              </p>
              <p className="text-sm text-[#0B5560]/80">
                Be the first to list a book in {context.cityName ?? countryName(countryCode)} and help build the community!
              </p>
            </div>

            <DiscoverySection
              title="Books from around the world"
              subtitle="Browse example listings while the community grows"
              total={fallbackData.meta.totalEligible}
              limit={nearLimit}
              onShowMore={() => setNearLimit((value) => value + SECTION_PAGE_SIZE)}
            >
              {renderCards([
                ...fallbackData.nearYou.items,
                ...fallbackData.inCountry.items,
                ...fallbackData.international.items,
              ].slice(0, nearLimit))}
            </DiscoverySection>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20">
            <BookOpen className="mb-4 h-16 w-16 text-[#999]" />
            <h3 className="mb-2 text-xl font-bold text-[#111]">Be the first to list a book</h3>
            <p className="mb-1 max-w-sm text-center text-sm text-[#666]">
              {context.cityName
                ? `No listings in ${context.cityName} yet. Start the community by listing a book you want to swap, give away, or sell.`
                : "No listings in your area yet. Start the community by listing a book you want to swap, give away, or sell."}
            </p>
            <div className="mt-6 flex flex-col items-center gap-4">
              <Link
                href="/list"
                className="rounded-md bg-[#007782] px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-[#005f66]"
              >
                List a Book
              </Link>
              <div className="flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={expandRadius}
                  className="rounded-md border border-[#D7DDE0] bg-white px-3 py-1.5 text-sm font-semibold text-[#007782] hover:border-[#007782]"
                >
                  Expand search radius
                </button>
                <button
                  type="button"
                  onClick={() => setParam({ intl: "1" })}
                  className="rounded-md border border-[#D7DDE0] bg-white px-3 py-1.5 text-sm font-semibold text-[#007782] hover:border-[#007782]"
                >
                  Include international results
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="mx-auto grid max-w-[1200px] gap-10 px-4 py-12 md:grid-cols-2 md:py-14">
        <DiscoveryChips title="Popular book categories" chips={popularCategories} />
      </section>

      <Footer />
    </div>
  );
}

function DiscoverySection({
  title,
  subtitle,
  total,
  limit,
  onShowMore,
  children,
}: {
  title: string;
  subtitle: string;
  total: number;
  limit: number;
  onShowMore: () => void;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-4">
        <h2 className="text-xl font-bold text-[#111] md:text-2xl">
          {title} <span className="text-[#999]">({total})</span>
        </h2>
        <p className="text-sm text-[#666]">{subtitle}</p>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {children}
      </div>
      {total > limit ? (
        <div className="flex justify-center pt-6">
          <button
            type="button"
            onClick={onShowMore}
            className="rounded-md border border-[#D7DDE0] bg-white px-6 py-2.5 text-sm font-bold text-[#007782] transition-colors hover:border-[#007782]"
          >
            Show more
          </button>
        </div>
      ) : null}
    </section>
  );
}
