"use client";

import { useEffect, useState } from "react";
import { upload } from "@vercel/blob/client";
import { AnimatePresence, motion } from "framer-motion";
import {
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Gift,
  Loader2,
  MapPin,
  RefreshCw,
  Upload,
  X,
} from "lucide-react";
import { trpc } from "@/providers/app-providers";
import { useBrowseContext } from "@/hooks/useBrowseContext";
import { COUNTRY_NAMES } from "@/lib/location-format";
import { useTrustActionRedirect } from "@/hooks/useTrustActionRedirect";

const countryOptions = Object.entries(COUNTRY_NAMES)
  .map(([code, name]) => ({ code, name }))
  .sort((a, b) => a.name.localeCompare(b.name));

type ShippingScopeOption = "domestic_only" | "selected_countries" | "worldwide";
type ListingSchoolType = "public_school" | "private_school" | "not_applicable";

const genres = [
  "Fiction",
  "Non-Fiction",
  "Sci-Fi & Fantasy",
  "Romance",
  "Mystery",
  "Biography",
  "Self-Help",
  "Academic",
  "Children's",
  "History",
  "Cooking",
  "Horror",
];

const conditions = [
  { value: "likenew", label: "Like New" },
  { value: "verygood", label: "Very Good" },
  { value: "good", label: "Good" },
  { value: "fair", label: "Fair" },
  { value: "poor", label: "Poor" },
] as const;
const coverImageContentTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxCoverImageBytes = 8 * 1024 * 1024;
const minCoverImageWidth = 400;
const minCoverImageHeight = 600;
const maxListingImages = 4;

export type ListingCondition = (typeof conditions)[number]["value"];
export type ListingTransactionType = "swap" | "giveaway" | "sale";

type ListingFormState = {
  title: string;
  author: string;
  description: string;
  genre: string;
  condition: ListingCondition | "";
  isbn: string;
  language: string;
  pages: string;
  price: string;
  imageUrl: string;
  imageUrls: string[];
  shippingCost: string;
  currency: string;
  country: string;
  city: string;
  locationId: number | null;
  regionCode: string | null;
  educationLevel: string;
  schoolType: ListingSchoolType | "";
  pickupAvailable: boolean;
  manualShippingEnabled: boolean;
  shippingScope: ShippingScopeOption;
  shippingDestinations: string[];
};

export type ListingFormSubmitValues = {
  title: string;
  author: string;
  description?: string;
  genre: string;
  condition: ListingCondition;
  isbn?: string;
  language?: string;
  pages?: number;
  transactionType: ListingTransactionType;
  price?: number;
  imageUrl?: string;
  imageUrls?: string[];
  shippingCost: number;
  currency: string;
  country: string;
  city: string;
  locationId?: number;
  educationLevel?: string;
  schoolType?: ListingSchoolType;
  pickupEnabled: boolean;
  pickupAvailable: boolean;
  manualShippingEnabled: boolean;
  shippingScope: "pickup_only" | ShippingScopeOption;
  shippingDestinationCountryCodes?: string[];
};

type ListingFormProps = {
  mode: "create" | "edit";
  initialValues?: Partial<ListingFormState> & {
    transactionType?: ListingTransactionType;
  };
  isPending: boolean;
  onSubmit: (values: ListingFormSubmitValues) => void;
};

const emptyForm: ListingFormState = {
  title: "",
  author: "",
  description: "",
  genre: "",
  condition: "",
  isbn: "",
  language: "English",
  pages: "",
  price: "",
  imageUrl: "",
  imageUrls: [],
  shippingCost: "0",
  currency: "USD",
  country: "",
  city: "",
  locationId: null,
  regionCode: null,
  educationLevel: "",
  schoolType: "",
  pickupAvailable: false,
  manualShippingEnabled: false,
  shippingScope: "domestic_only",
  shippingDestinations: [],
};

function initialFormState(initialValues?: ListingFormProps["initialValues"]) {
  const imageUrls = [
    ...(initialValues?.imageUrls ?? []),
    ...(initialValues?.imageUrl ? [initialValues.imageUrl] : []),
  ]
    .map((url) => url.trim())
    .filter(Boolean);

  return {
    ...emptyForm,
    ...initialValues,
    condition: initialValues?.condition ?? "",
    imageUrl: imageUrls[0] ?? "",
    imageUrls: [...new Set(imageUrls)].slice(0, maxListingImages),
  };
}

function readImageDimensions(file: File) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Unable to read this image."));
    };
    image.src = objectUrl;
  });
}

export function ListingForm({
  mode,
  initialValues,
  isPending,
  onSubmit,
}: ListingFormProps) {
  const [step, setStep] = useState(1);
  const [transactionType, setTransactionType] = useState<ListingTransactionType>(
    initialValues?.transactionType ?? "swap",
  );
  const [formData, setFormData] = useState<ListingFormState>(() =>
    initialFormState(initialValues),
  );
  const [isUploading, setIsUploading] = useState(false);
  const [coverError, setCoverError] = useState("");
  const [cityQuery, setCityQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const handleTrustError = useTrustActionRedirect();
  const { context } = useBrowseContext();
  const preferredCountry = context.countryCode || "US";
  const listingCountry = formData.country || (mode === "create" ? preferredCountry : "US");
  const isSalePriceValid = transactionType !== "sale" || Number.parseFloat(formData.price) > 0;

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedQuery(cityQuery.trim()), 300);
    return () => window.clearTimeout(timeout);
  }, [cityQuery]);

  const suggestQuery = trpc.location.suggest.useQuery(
    { query: debouncedQuery, countryCode: /^[A-Z]{2}$/.test(listingCountry) ? listingCountry : undefined },
    { enabled: debouncedQuery.length >= 2, staleTime: 60_000 },
  );
  const suggestions = suggestQuery.data ?? [];
  const hasCoverImage = formData.imageUrls.length > 0;
  const hasValidCoverImage = hasCoverImage && !coverError;
  const submitLabel = mode === "edit" ? "Save Changes" : "List Book";
  const pendingLabel = mode === "edit" ? "Saving..." : "Listing...";

  const isStep1Valid =
    formData.title &&
    formData.author &&
    formData.genre &&
    formData.condition &&
    formData.currency &&
    /^[A-Z]{2}$/.test(listingCountry) &&
    formData.city &&
    isSalePriceValid;

  const updateListingImages = (nextImages: string[]) => {
    const imageUrls = [...new Set(nextImages.map((url) => url.trim()).filter(Boolean))].slice(
      0,
      maxListingImages,
    );
    setFormData((current) => ({
      ...current,
      imageUrl: imageUrls[0] ?? "",
      imageUrls,
    }));
  };

  const handleCoverUpload = async (files: FileList | null | undefined) => {
    if (!files?.length) return;
    const remainingSlots = maxListingImages - formData.imageUrls.length;
    if (remainingSlots <= 0) {
      setCoverError(`You can add up to ${maxListingImages} images per listing.`);
      return;
    }
    const selectedFiles = Array.from(files).slice(0, remainingSlots);
    setIsUploading(true);
    setCoverError("");
    try {
      for (const file of selectedFiles) {
        if (!coverImageContentTypes.has(file.type)) {
          setCoverError("Upload JPEG, PNG, or WebP book images.");
          return;
        }
        if (file.size > maxCoverImageBytes) {
          setCoverError("Each book image must be 8 MB or smaller.");
          return;
        }
        const dimensions = await readImageDimensions(file);
        if (dimensions.width < minCoverImageWidth || dimensions.height < minCoverImageHeight) {
          setCoverError(
            `Each book image must be at least ${minCoverImageWidth} x ${minCoverImageHeight} px.`,
          );
          return;
        }
      }

      const uploadedUrls: string[] = [];
      for (const file of selectedFiles) {
        const blob = await upload(`listing-covers/${file.name}`, file, {
          access: "public",
          handleUploadUrl: "/api/uploads/listing-image",
          clientPayload: JSON.stringify({ sizeBytes: file.size }),
        });
        uploadedUrls.push(blob.url);
      }
      updateListingImages([...formData.imageUrls, ...uploadedUrls]);
      if (files.length > remainingSlots) {
        setCoverError(`Only the first ${remainingSlots} image${remainingSlots === 1 ? "" : "s"} were added. Listings can have up to ${maxListingImages} images.`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed";
      setCoverError(message);
      handleTrustError({ message });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = () => {
    if (!isStep1Valid || !formData.condition || !hasValidCoverImage) return;

    const shippingScope: ListingFormSubmitValues["shippingScope"] = formData.manualShippingEnabled
      ? formData.shippingScope
      : "pickup_only";

    onSubmit({
      title: formData.title,
      author: formData.author,
      description: formData.description || undefined,
      genre: formData.genre,
      condition: formData.condition,
      isbn: formData.isbn || undefined,
      language: formData.language || undefined,
      pages: formData.pages ? Number.parseInt(formData.pages, 10) : undefined,
      transactionType,
      price:
        transactionType === "sale" && formData.price
          ? Number.parseFloat(formData.price)
          : undefined,
      imageUrl: formData.imageUrls[0],
      imageUrls: formData.imageUrls,
      shippingCost: Number.parseFloat(formData.shippingCost) || 0,
      currency: formData.currency.toUpperCase(),
      country: listingCountry.toUpperCase(),
      city: formData.city,
      locationId: formData.locationId ?? undefined,
      educationLevel: formData.educationLevel.trim() || undefined,
      schoolType: formData.schoolType || undefined,
      pickupEnabled: formData.pickupAvailable,
      pickupAvailable: formData.pickupAvailable,
      manualShippingEnabled: formData.manualShippingEnabled,
      shippingScope,
      shippingDestinationCountryCodes:
        shippingScope === "selected_countries" ? formData.shippingDestinations : undefined,
    });
  };

  return (
    <div className="max-w-[600px] mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-[#111] mb-2">
        {mode === "edit" ? "Edit Listing" : "List a Book"}
      </h1>

      <div className="flex items-center gap-2 mb-8">
        {[1, 2].map((s) => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                s < step
                  ? "bg-[#007782] text-white"
                  : s === step
                    ? "bg-[#007782] text-white"
                    : "bg-[#EEEEEE] text-[#999]"
              }`}
            >
              {s < step ? <Check className="w-4 h-4" /> : s}
            </div>
            {s < 2 && (
              <div className={`flex-1 h-0.5 ${s < step ? "bg-[#007782]" : "bg-[#EEEEEE]"}`} />
            )}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <div className="mb-6">
              <label className="block text-sm font-semibold text-[#111] mb-3">
                How would you like to exchange this book?
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setTransactionType("swap")}
                  className={`p-4 rounded-lg border-2 text-center transition-all ${
                    transactionType === "swap"
                      ? "border-[#007782] bg-[#e6f3f4]"
                      : "border-[#E0E0E0] hover:border-[#999]"
                  }`}
                >
                  <RefreshCw
                    className={`w-6 h-6 mx-auto mb-2 ${
                      transactionType === "swap" ? "text-[#007782]" : "text-[#666]"
                    }`}
                  />
                  <span
                    className={`text-sm font-medium ${
                      transactionType === "swap" ? "text-[#007782]" : "text-[#111]"
                    }`}
                  >
                    Swap
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setTransactionType("giveaway")}
                  className={`p-4 rounded-lg border-2 text-center transition-all ${
                    transactionType === "giveaway"
                      ? "border-[#2E7D32] bg-[#E8F5E9]"
                      : "border-[#E0E0E0] hover:border-[#999]"
                  }`}
                >
                  <Gift
                    className={`w-6 h-6 mx-auto mb-2 ${
                      transactionType === "giveaway" ? "text-[#2E7D32]" : "text-[#666]"
                    }`}
                  />
                  <span
                    className={`text-sm font-medium ${
                      transactionType === "giveaway" ? "text-[#2E7D32]" : "text-[#111]"
                    }`}
                  >
                    Giveaway
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setTransactionType("sale")}
                  className={`p-4 rounded-lg border-2 text-center transition-all ${
                    transactionType === "sale"
                      ? "border-[#E65100] bg-[#FFF3E0]"
                      : "border-[#E0E0E0] hover:border-[#999]"
                  }`}
                >
                  <DollarSign
                    className={`w-6 h-6 mx-auto mb-2 ${
                      transactionType === "sale" ? "text-[#E65100]" : "text-[#666]"
                    }`}
                  />
                  <span
                    className={`text-sm font-medium ${
                      transactionType === "sale" ? "text-[#E65100]" : "text-[#111]"
                    }`}
                  >
                    Sell
                  </span>
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#111] mb-1">Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2.5 border border-[#E0E0E0] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#007782]/20 focus:border-[#007782]"
                  placeholder="Book title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#111] mb-1">Author *</label>
                <input
                  type="text"
                  value={formData.author}
                  onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                  className="w-full px-3 py-2.5 border border-[#E0E0E0] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#007782]/20 focus:border-[#007782]"
                  placeholder="Author name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#111] mb-1">Genre *</label>
                <select
                  value={formData.genre}
                  onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
                  className="w-full px-3 py-2.5 border border-[#E0E0E0] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#007782]/20 focus:border-[#007782] bg-white"
                >
                  <option value="">Select a genre</option>
                  {genres.map((genre) => (
                    <option key={genre} value={genre}>
                      {genre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#111] mb-1">Condition *</label>
                <select
                  value={formData.condition}
                  onChange={(e) =>
                    setFormData({ ...formData, condition: e.target.value as ListingCondition | "" })
                  }
                  className="w-full px-3 py-2.5 border border-[#E0E0E0] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#007782]/20 focus:border-[#007782] bg-white"
                >
                  <option value="">Select condition</option>
                  {conditions.map((condition) => (
                    <option key={condition.value} value={condition.value}>
                      {condition.label}
                    </option>
                  ))}
                </select>
              </div>

              {transactionType === "sale" && (
                <div>
                  <label className="block text-sm font-medium text-[#111] mb-1">Price *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#666]">
                      {formData.currency}
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      className="w-full pl-14 pr-3 py-2.5 border border-[#E0E0E0] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#007782]/20 focus:border-[#007782]"
                      placeholder="0.00"
                    />
                  </div>
                  {!isSalePriceValid ? (
                    <p className="mt-1 text-xs text-[#8D3D12]">Sale listings require a positive price.</p>
                  ) : null}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-[#111] mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2.5 border border-[#E0E0E0] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#007782]/20 focus:border-[#007782] resize-none"
                  rows={3}
                  placeholder="Tell others about this book..."
                  maxLength={500}
                />
                <p className="text-xs text-[#999] mt-1">{formData.description.length}/500</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#111] mb-1">
                  Where is this book available? *
                </label>
                <p className="text-xs text-[#999] mb-2">
                  Pick the city so nearby readers can discover it. We only ever show the city, never
                  your exact address.
                </p>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#111] mb-1">Currency *</label>
                    <input
                      value={formData.currency}
                      onChange={(e) => setFormData({ ...formData, currency: e.target.value.toUpperCase() })}
                      maxLength={3}
                      className="w-full px-3 py-2.5 border border-[#E0E0E0] rounded-md text-sm uppercase"
                      placeholder="USD"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-[#111] mb-1">Country *</label>
                    <select
                      value={/^[A-Z]{2}$/.test(listingCountry) ? listingCountry : ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          country: e.target.value,
                          locationId: null,
                          city: "",
                          regionCode: null,
                        })
                      }
                      className="w-full px-3 py-2.5 border border-[#E0E0E0] rounded-md text-sm bg-white"
                    >
                      <option value="">Select a country</option>
                      {countryOptions.map((country) => (
                        <option key={country.code} value={country.code}>
                          {country.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-3 relative">
                  <label className="block text-sm font-medium text-[#111] mb-1">City *</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#999]" />
                    <input
                      value={cityQuery || formData.city}
                      onChange={(e) => {
                        setCityQuery(e.target.value);
                        setFormData((current) => ({ ...current, city: e.target.value, locationId: null }));
                      }}
                      className="w-full pl-9 pr-3 py-2.5 border border-[#E0E0E0] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#007782]/20 focus:border-[#007782]"
                      placeholder="Search for a city..."
                    />
                  </div>
                  {debouncedQuery.length >= 2 && cityQuery ? (
                    <div className="mt-1 max-h-44 overflow-y-auto rounded-md border border-[#EEE]">
                      {suggestQuery.isFetching ? (
                        <div className="flex items-center gap-2 px-3 py-2 text-sm text-[#666]">
                          <Loader2 className="h-4 w-4 animate-spin" /> Searching...
                        </div>
                      ) : suggestions.length === 0 ? (
                        <p className="px-3 py-2 text-sm text-[#999]">No cities found.</p>
                      ) : (
                        suggestions.map((place) => (
                          <button
                            key={place.locationId}
                            type="button"
                            onClick={() => {
                              setFormData((current) => ({
                                ...current,
                                locationId: place.locationId,
                                city: place.cityName ?? place.label,
                                country: place.countryCode,
                                regionCode: place.regionCode,
                              }));
                              setCityQuery("");
                              setDebouncedQuery("");
                            }}
                            className="block w-full px-3 py-2 text-left text-sm transition-colors hover:bg-[#F2FAFB] text-[#111]"
                          >
                            {place.label}
                          </button>
                        ))
                      )}
                    </div>
                  ) : null}
                  {formData.locationId ? (
                    <p className="mt-1 text-xs text-[#007782]">
                      Verified location: {formData.city}
                      {formData.regionCode ? `, ${formData.regionCode}` : ""}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#111] mb-1">Education level</label>
                  <input
                    type="text"
                    value={formData.educationLevel}
                    onChange={(e) => setFormData({ ...formData, educationLevel: e.target.value })}
                    className="w-full px-3 py-2.5 border border-[#E0E0E0] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#007782]/20 focus:border-[#007782]"
                    placeholder="Optional (e.g. High school)"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#111] mb-1">School type</label>
                  <select
                    value={formData.schoolType}
                    onChange={(e) =>
                      setFormData({ ...formData, schoolType: e.target.value as ListingSchoolType | "" })
                    }
                    className="w-full px-3 py-2.5 border border-[#E0E0E0] rounded-md text-sm bg-white"
                  >
                    <option value="">Not specified</option>
                    <option value="public_school">Public school</option>
                    <option value="private_school">Private school</option>
                    <option value="not_applicable">Not applicable</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#111] mb-1">ISBN</label>
                  <input
                    type="text"
                    value={formData.isbn}
                    onChange={(e) => setFormData({ ...formData, isbn: e.target.value })}
                    className="w-full px-3 py-2.5 border border-[#E0E0E0] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#007782]/20 focus:border-[#007782]"
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#111] mb-1">Pages</label>
                  <input
                    type="number"
                    value={formData.pages}
                    onChange={(e) => setFormData({ ...formData, pages: e.target.value })}
                    className="w-full px-3 py-2.5 border border-[#E0E0E0] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#007782]/20 focus:border-[#007782]"
                    placeholder="Optional"
                  />
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setStep(2)}
              disabled={!isStep1Valid}
              className="w-full mt-6 py-3 bg-[#007782] text-white font-semibold rounded-md hover:bg-[#005f66] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              Continue
              <ChevronRight className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <div className="mb-6">
              <label className="block text-sm font-semibold text-[#111] mb-3">
                Book Images *
              </label>
              <div className="border-2 border-dashed border-[#E0E0E0] rounded-lg p-6 text-center hover:border-[#007782] transition-colors">
                <Upload className="w-8 h-8 text-[#999] mx-auto mb-2" />
                <p className="text-sm text-[#666] mb-3">
                  Upload 1 to {maxListingImages} clear JPEG, PNG, or WebP photos. Show the cover first, then the back, spine, or condition details. Minimum 400 x 600 px, up to 8 MB each.
                </p>
                <input
                  type="file"
                  required={mode === "create"}
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  disabled={isUploading}
                  onChange={(event) => {
                    void handleCoverUpload(event.target.files);
                    event.currentTarget.value = "";
                  }}
                  className="mb-3 block w-full text-sm text-[#666] file:mr-3 file:rounded-md file:border-0 file:bg-[#e6f3f4] file:px-3 file:py-2 file:text-sm file:font-medium file:text-[#007782]"
                />
                <p className="text-xs text-[#999]">
                  {formData.imageUrls.length}/{maxListingImages} images added
                </p>
              </div>
              {!hasCoverImage ? (
                <p className="mt-2 text-xs text-[#8D3D12]">
                  At least one book photo is required before you can publish this listing.
                </p>
              ) : null}
              {coverError ? (
                <p className="mt-2 text-xs text-[#8D3D12]">{coverError}</p>
              ) : null}

              {formData.imageUrls.length > 0 && (
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {formData.imageUrls.map((imageUrl, index) => (
                    <div key={imageUrl} className="relative rounded-lg border border-[#E0E0E0] bg-white p-1">
                      <img
                        src={imageUrl}
                        alt={index === 0 ? "Cover preview" : `Book image ${index + 1} preview`}
                        className="aspect-[3/4] w-full rounded-md object-cover"
                        onError={() => {
                          updateListingImages(formData.imageUrls.filter((url) => url !== imageUrl));
                        }}
                      />
                      {index === 0 ? (
                        <span className="absolute bottom-2 left-2 rounded bg-[#007782] px-2 py-0.5 text-[11px] font-semibold text-white">
                          Cover
                        </span>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => {
                          updateListingImages(formData.imageUrls.filter((url) => url !== imageUrl));
                          setCoverError("");
                        }}
                        className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-[#D32F2F] text-white"
                        aria-label={`Remove image ${index + 1}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-[#111] mb-3">
                How can another user receive this book?
              </label>
              <div className="space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.pickupAvailable}
                    onChange={(e) => setFormData({ ...formData, pickupAvailable: e.target.checked })}
                    className="w-4 h-4 text-[#007782] rounded border-[#E0E0E0] focus:ring-[#007782]"
                  />
                  <span className="text-sm text-[#111]">Local pickup available</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.manualShippingEnabled}
                    onChange={(e) =>
                      setFormData({ ...formData, manualShippingEnabled: e.target.checked })
                    }
                    className="w-4 h-4 text-[#007782] rounded border-[#E0E0E0] focus:ring-[#007782]"
                  />
                  <span className="text-sm text-[#111]">Offer shipping</span>
                </label>

                {formData.manualShippingEnabled ? (
                  <div className="space-y-3 rounded-md border border-[#EEE] bg-[#FAFAFA] p-3">
                    <div>
                      <label className="block text-sm text-[#666] mb-1">Where do you ship?</label>
                      <select
                        value={formData.shippingScope}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            shippingScope: e.target.value as ShippingScopeOption,
                          })
                        }
                        className="w-full px-3 py-2.5 border border-[#E0E0E0] rounded-md text-sm bg-white"
                      >
                        <option value="domestic_only">Within my country only</option>
                        <option value="selected_countries">Selected countries</option>
                        <option value="worldwide">Worldwide</option>
                      </select>
                    </div>

                    {formData.shippingScope === "selected_countries" ? (
                      <div>
                        <label className="block text-sm text-[#666] mb-1">Ships to</label>
                        <div className="grid grid-cols-2 gap-1.5 max-h-44 overflow-y-auto rounded-md border border-[#E0E0E0] bg-white p-2">
                          {countryOptions.map((country) => {
                            const checked = formData.shippingDestinations.includes(country.code);
                            return (
                              <label
                                key={country.code}
                                className="flex items-center gap-2 text-sm text-[#111] cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={(e) =>
                                    setFormData((current) => ({
                                      ...current,
                                      shippingDestinations: e.target.checked
                                        ? [...current.shippingDestinations, country.code]
                                        : current.shippingDestinations.filter(
                                            (code) => code !== country.code,
                                          ),
                                    }))
                                  }
                                  className="h-4 w-4 rounded border-[#C9DADD] text-[#007782] focus:ring-[#007782]"
                                />
                                {country.name}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}

                    <div>
                      <label className="block text-sm text-[#666] mb-1">
                        Shipping cost ({formData.currency})
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.shippingCost}
                        onChange={(e) => setFormData({ ...formData, shippingCost: e.target.value })}
                        className="w-full px-3 py-2.5 border border-[#E0E0E0] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#007782]/20 focus:border-[#007782]"
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 py-3 border border-[#E0E0E0] text-[#111] font-semibold rounded-md hover:bg-[#F7F7F7] transition-colors flex items-center justify-center gap-2"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isPending || isUploading || !hasValidCoverImage}
                className="flex-[2] py-3 bg-[#007782] text-white font-semibold rounded-md hover:bg-[#005f66] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isPending || isUploading ? pendingLabel : submitLabel}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function ListingSuccess({
  onViewListings,
  onListAnother,
}: {
  onViewListings: () => void;
  onListAnother: () => void;
}) {
  return (
    <div className="max-w-[600px] mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-12"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="w-20 h-20 bg-[#2E7D32] rounded-full flex items-center justify-center mx-auto mb-6"
        >
          <Check className="w-10 h-10 text-white" />
        </motion.div>
        <h2 className="text-2xl font-bold text-[#111] mb-2">Your book is listed!</h2>
        <p className="text-sm text-[#666] mb-8">
          Other readers can now find and request your book.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            type="button"
            onClick={onViewListings}
            className="px-6 py-2.5 bg-[#007782] text-white font-semibold rounded-md hover:bg-[#005f66] transition-colors"
          >
            View Listings
          </button>
          <button
            type="button"
            onClick={onListAnother}
            className="px-6 py-2.5 border border-[#E0E0E0] text-[#111] font-semibold rounded-md hover:bg-[#F7F7F7] transition-colors"
          >
            List Another
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export function ListingFormUnavailable({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <div className="max-w-md mx-auto px-4 py-20 text-center">
      <BookOpen className="w-16 h-16 text-[#999] mx-auto mb-4" />
      <h2 className="text-xl font-bold text-[#111] mb-2">{title}</h2>
      <p className="text-sm text-[#666]">{message}</p>
    </div>
  );
}
