"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import {
  ListingForm,
  ListingFormUnavailable,
  type ListingFormSubmitValues,
} from "@/components/listings/ListingForm";
import { useTrustActionRedirect } from "@/hooks/useTrustActionRedirect";
import { normalizeShippingScopeForForm } from "@/lib/listing-delivery";
import { bookPath, makeBookSlug, parsePublicSlug } from "@/lib/slugs";
import { trpc } from "@/providers/app-providers";

const editableStatuses = new Set(["draft", "active"]);

export default function EditListingPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const utils = trpc.useUtils();
  const handleTrustError = useTrustActionRedirect();
  const publicId = parsePublicSlug(slug);

  const {
    data: listing,
    isLoading,
    error,
  } = trpc.book.ownedByPublicId.useQuery(
    { publicId: publicId ?? "" },
    { enabled: Boolean(publicId), retry: false },
  );

  useEffect(() => {
    if (!listing || !publicId) return;
    const canonicalSlug = makeBookSlug(listing);
    if (slug !== canonicalSlug) {
      router.replace(`/book/${canonicalSlug}/edit`);
    }
  }, [listing, publicId, router, slug]);

  const updateListing = trpc.book.update.useMutation({
    onSuccess: (_data, variables) => {
      if (!listing) return;
      const nextBook = {
        title: variables.title ?? listing.title,
        publicId: listing.publicId,
      };

      utils.book.ownedByPublicId.invalidate({ publicId: listing.publicId });
      utils.book.byPublicId.invalidate({ publicId: listing.publicId });
      utils.book.myBooks.invalidate();
      utils.book.list.invalidate();
      utils.book.search.invalidate();
      utils.book.feed.invalidate();

      router.push(listing.status === "draft" ? "/profile/me" : bookPath(nextBook));
    },
    onError: handleTrustError,
  });

  const handleSubmit = (values: ListingFormSubmitValues) => {
    if (!listing) return;
    updateListing.mutate({ id: listing.id, ...values });
  };

  if (!publicId || error) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <ListingFormUnavailable
          title="Listing not found"
          message="This listing is unavailable, or you do not have permission to edit it."
        />
      </div>
    );
  }

  if (isLoading || !listing) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <div className="mx-auto max-w-[600px] px-4 py-8">
          <div className="h-8 w-44 animate-pulse rounded bg-[#EEEEEE]" />
          <div className="mt-8 space-y-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-11 animate-pulse rounded-md bg-[#EEEEEE]" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!editableStatuses.has(listing.status)) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <ListingFormUnavailable
          title="This listing cannot be edited"
          message={`Only draft or active listings can be edited. This listing is currently ${listing.status}.`}
        />
        <div className="-mt-12 text-center">
          <Link href="/profile/me" className="text-sm font-semibold text-[#007782] hover:underline">
            Back to my profile
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <ListingForm
        key={listing.publicId}
        mode="edit"
        initialValues={{
          title: listing.title,
          author: listing.author,
          description: listing.description ?? "",
          genre: listing.genre,
          condition: listing.condition,
          isbn: listing.isbn ?? "",
          language: listing.language ?? "English",
          pages: listing.pages ? String(listing.pages) : "",
          price: listing.price ?? "",
          imageUrl: listing.imageUrl ?? "",
          imageUrls: listing.imageUrls ?? (listing.imageUrl ? [listing.imageUrl] : []),
          shippingCost: listing.shippingCost ?? "0",
          currency: listing.currency,
          country: listing.country,
          city: listing.city,
          locationId: listing.locationId ?? null,
          educationLevel: listing.educationLevel ?? "",
          schoolType: listing.schoolType ?? "",
          pickupAvailable: listing.pickupAvailable,
          manualShippingEnabled: listing.manualShippingEnabled,
          shippingScope: normalizeShippingScopeForForm(listing.shippingScope),
          transactionType: listing.transactionType,
        }}
        isPending={updateListing.isPending}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
