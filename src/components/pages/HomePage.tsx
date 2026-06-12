"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ComponentProps } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { trpc } from "@/providers/app-providers";
import { Navbar } from "@/components/layout/Navbar";
import { BookCard } from "@/components/books/BookCard";
import { Footer } from "@/components/layout/Footer";
import { CompactHero } from "@/components/home/CompactHero";
import { CategoryDiscovery } from "@/components/home/CategoryDiscovery";
import { FilterBar } from "@/components/home/FilterBar";
import { TrustStrip } from "@/components/home/TrustStrip";
import { FreshFromBlog } from "@/components/home/FreshFromBlog";
import { useAuth } from "@/hooks/useAuth";
import { useBrowseContext } from "@/hooks/useBrowseContext";
import { countryName } from "@/lib/location-format";
import type { DiscoveryListing } from "@/server/platform/marketplace-search";
import { RefreshCw, MapPin, BookOpen, ChevronRight, ChevronLeft } from "lucide-react";

const SECTION_PAGE_SIZE = 8;

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
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#2C2C2C] md:text-2xl">{title}</h2>
          <p className="mt-0.5 text-sm text-[#666]">{subtitle}</p>
        </div>
        <span className="mb-0.5 text-sm text-[#999]">{total} results</span>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {children}
      </div>
      {total > limit ? (
        <div className="flex justify-center pt-5">
          <button
            type="button"
            onClick={onShowMore}
            className="inline-flex items-center gap-1 text-sm font-semibold text-[#007782] transition-colors hover:text-[#005f66]"
          >
            Show more
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      ) : null}
    </section>
  );
}

function HorizontalScrollSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 1);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);
    return () => {
      el.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [updateScrollState]);

  const scroll = useCallback((direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const gap = 16;
    const delta = el.clientWidth - gap;
    el.scrollBy({ left: direction === "left" ? -delta : delta, behavior: "smooth" });
  }, []);

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold text-[#2C2C2C] md:text-2xl">{title}</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => scroll("left")}
            disabled={!canScrollLeft}
            aria-label="Scroll left"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E6E6E6] bg-white text-[#2C2C2C] shadow-sm transition hover:border-[#007782] hover:text-[#007782] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => scroll("right")}
            disabled={!canScrollRight}
            aria-label="Scroll right"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E6E6E6] bg-white text-[#2C2C2C] shadow-sm transition hover:border-[#007782] hover:text-[#007782] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
      <div
        ref={scrollRef}
        className="scrollbar-hide flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory"
      >
        {children}
      </div>
    </section>
  );
}

export default function Home({ posts }: { posts: import("@/server/domain/posts").PostWithAuthorAndCategories[] }) {
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
    ]
  );

  const filterKey = JSON.stringify({ ...discoverInput, perGroupLimit: undefined });
  const prevFilterKeyRef = useRef(filterKey);
  useEffect(() => {
    if (prevFilterKeyRef.current !== filterKey) {
      prevFilterKeyRef.current = filterKey;
      setNearLimit(SECTION_PAGE_SIZE);
      setCountryLimit(SECTION_PAGE_SIZE);
      setIntlLimit(SECTION_PAGE_SIZE);
    }
  }, [filterKey]);

  const discoverQuery = trpc.discovery.discover.useQuery(discoverInput, {
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const fallbackInput = useMemo(
    () => ({
      ...discoverInput,
      radiusKm: null as number | null,
      includeDomesticShipping: true,
      includeInternationalShipping: true,
    }),
    [discoverInput]
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
    { enabled: isAuthenticated && allIds.length > 0, staleTime: 30_000, retry: false }
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
    [router, searchParamsString]
  );

  const renderCard = (item: DiscoverItem, index: number) => {
    const book = toBookCardBook(item);
    return (
      <BookCard
        key={item.publicId}
        book={book}
        index={index}
        isFavorited={favoritesQuery.data?.[item.id] ?? false}
        favoritePending={toggleFavorite.isPending}
        onToggleFavorite={
          isAuthenticated ? (bookId) => toggleFavorite.mutate({ bookId }) : undefined
        }
      />
    );
  };

  const isInitialLoading = discoverQuery.isLoading && !data;
  const distanceUnitNote = data?.meta.distanceUnit === "mi" ? "miles" : "kilometers";

  const expandRadius = () => {
    const ladder = [5, 10, 25, 50, 100];
    const current = radiusKm ?? Infinity;
    const next = ladder.find((value) => value > current);
    setParam({ radius: next ? String(next) : "any" });
  };

  // Build "Recommended" items: deduplicated across all groups, first 10
  const recommendedItems = useMemo(() => {
    if (!activeData) return [];
    const seen = new Set<string>();
    const items: DiscoverItem[] = [];
    for (const item of [
      ...activeData.nearYou.items,
      ...activeData.inCountry.items,
      ...activeData.international.items,
    ]) {
      if (!seen.has(item.publicId)) {
        seen.add(item.publicId);
        items.push(item);
      }
    }
    return items.slice(0, 10);
  }, [activeData]);

  const hasAnyResults = data && data.meta.totalEligible > 0;

  return (
    <div className="min-h-screen bg-[#FAF9F7]">
      <Navbar />
      <CompactHero />
      <CategoryDiscovery />

      <FilterBar
        transactionType={transactionType}
        sort={sort}
        delivery={delivery}
        includeDomesticShipping={includeDomesticShipping}
        includeInternationalShipping={includeInternationalShipping}
        genreParam={genreParam}
        searchParam={searchParam}
        categoryParam={categoryParam}
        onParamChange={setParam}
      />

      <section className="mx-auto max-w-[1200px] px-4 py-6 md:py-8">
        {discoverQuery.isError ? (
          <div className="mb-6 flex flex-col gap-3 rounded-xl border border-[#F2D6C7] bg-[#FFF8F4] px-4 py-3 text-sm text-[#8D3D12] sm:flex-row sm:items-center sm:justify-between">
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
                <div className="mb-3 aspect-[3/4] rounded-xl bg-[#EEEEEE]" />
                <div className="mb-2 h-4 w-3/4 rounded bg-[#EEEEEE]" />
                <div className="mb-2 h-3 w-1/2 rounded bg-[#EEEEEE]" />
                <div className="h-3 w-1/3 rounded bg-[#EEEEEE]" />
              </div>
            ))}
          </div>
        ) : hasAnyResults ? (
          <div className="space-y-12">
            {/* Recommended / Fresh arrivals */}
            {recommendedItems.length > 0 && (
              <HorizontalScrollSection title={sort === "recent" ? "Fresh arrivals" : "Recommended for you"}>
                {recommendedItems.map((item, index) => (
                  <div key={item.publicId} className="w-[180px] shrink-0 snap-start sm:w-[200px]">
                    {renderCard(item, index)}
                  </div>
                ))}
              </HorizontalScrollSection>
            )}

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
                {data.nearYou.items.slice(0, nearLimit).map((item, i) => renderCard(item, i))}
              </DiscoverySection>
            ) : null}

            {data.meta.sparseNearby ? (
              <div className="rounded-xl border border-[#D7E8EA] bg-[#F4FAFB] px-4 py-4">
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
                {data.inCountry.items.slice(0, countryLimit).map((item, i) => renderCard(item, i))}
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
                {data.international.items.slice(0, intlLimit).map((item, i) => renderCard(item, i))}
              </DiscoverySection>
            ) : null}

            <p className="text-center text-xs text-[#999]">
              Distances are approximate, shown in {distanceUnitNote}. Exact addresses are never shared.
            </p>
          </div>
        ) : fallbackData && fallbackData.meta.totalEligible > 0 ? (
          <div className="space-y-6">
            <div className="rounded-xl border border-[#D7E8EA] bg-[#F4FAFB] px-4 py-4">
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
              {[
                ...fallbackData.nearYou.items,
                ...fallbackData.inCountry.items,
                ...fallbackData.international.items,
              ]
                .slice(0, nearLimit)
                .map((item, i) => renderCard(item, i))}
            </DiscoverySection>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#F5F0E8]">
              <BookOpen className="h-8 w-8 text-[#999]" />
            </div>
            <h3 className="mb-2 text-xl font-bold text-[#2C2C2C]">Be the first to list a book</h3>
            <p className="mb-1 max-w-sm text-center text-sm text-[#666]">
              {context.cityName
                ? `No listings in ${context.cityName} yet. Start the community by listing a book you want to swap, give away, or sell.`
                : "No listings in your area yet. Start the community by listing a book you want to swap, give away, or sell."}
            </p>
            <div className="mt-6 flex flex-col items-center gap-4">
              <Link
                href="/list"
                className="rounded-lg bg-[#007782] px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-[#005f66]"
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

      <FreshFromBlog posts={posts} />
      <TrustStrip />
      <Footer />
    </div>
  );
}
