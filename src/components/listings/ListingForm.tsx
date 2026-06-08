"use client";

import { useState } from "react";
import { upload } from "@vercel/blob/client";
import { AnimatePresence, motion } from "framer-motion";
import {
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Gift,
  RefreshCw,
  Upload,
  X,
} from "lucide-react";
import { useLocationPreference } from "@/hooks/useLocationPreference";
import { useTrustActionRedirect } from "@/hooks/useTrustActionRedirect";

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
  shippingCost: string;
  currency: string;
  country: string;
  city: string;
  pickupAvailable: boolean;
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
  pickupAvailable: boolean;
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
  shippingCost: "0",
  currency: "USD",
  country: "",
  city: "",
  pickupAvailable: false,
};

function initialFormState(initialValues?: ListingFormProps["initialValues"]) {
  return {
    ...emptyForm,
    ...initialValues,
    condition: initialValues?.condition ?? "",
  };
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
  const [previewImage, setPreviewImage] = useState(initialValues?.imageUrl ?? "");
  const [isUploading, setIsUploading] = useState(false);
  const handleTrustError = useTrustActionRedirect();
  const locationPreference = useLocationPreference();
  const preferredCountry = locationPreference?.savedAt ? locationPreference.country : "US";
  const listingCountry = formData.country || (mode === "create" ? preferredCountry : "US");
  const isSalePriceValid = transactionType !== "sale" || Number.parseFloat(formData.price) > 0;
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

  const handleCoverUpload = async (file: File | undefined) => {
    if (!file) return;
    setIsUploading(true);
    try {
      const blob = await upload(`listing-covers/${file.name}`, file, {
        access: "public",
        handleUploadUrl: "/api/uploads/listing-image",
        clientPayload: JSON.stringify({ sizeBytes: file.size }),
      });
      setFormData((current) => ({ ...current, imageUrl: blob.url }));
      setPreviewImage(blob.url);
    } catch (error) {
      handleTrustError({ message: error instanceof Error ? error.message : "Upload failed" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = () => {
    if (!isStep1Valid || !formData.condition) return;

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
      ...(formData.imageUrl
        ? { imageUrl: formData.imageUrl }
        : mode === "edit"
          ? { imageUrls: [] }
          : {}),
      shippingCost: Number.parseFloat(formData.shippingCost) || 0,
      currency: formData.currency.toUpperCase(),
      country: listingCountry.toUpperCase(),
      city: formData.city,
      pickupAvailable: formData.pickupAvailable,
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
                <div>
                  <label className="block text-sm font-medium text-[#111] mb-1">Country *</label>
                  <input
                    value={listingCountry}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value.toUpperCase() })}
                    maxLength={2}
                    className="w-full px-3 py-2.5 border border-[#E0E0E0] rounded-md text-sm uppercase"
                    placeholder="US"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#111] mb-1">City *</label>
                  <input
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-2.5 border border-[#E0E0E0] rounded-md text-sm"
                    placeholder="City"
                  />
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
                Book Cover Image
              </label>
              <div className="border-2 border-dashed border-[#E0E0E0] rounded-lg p-6 text-center hover:border-[#007782] transition-colors">
                <Upload className="w-8 h-8 text-[#999] mx-auto mb-2" />
                <p className="text-sm text-[#666] mb-3">
                  Upload JPEG, PNG, or WebP up to 8 MB, or enter an image URL.
                </p>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={isUploading}
                  onChange={(event) => void handleCoverUpload(event.target.files?.[0])}
                  className="mb-3 block w-full text-sm text-[#666] file:mr-3 file:rounded-md file:border-0 file:bg-[#e6f3f4] file:px-3 file:py-2 file:text-sm file:font-medium file:text-[#007782]"
                />
                <input
                  type="text"
                  value={formData.imageUrl}
                  onChange={(e) => {
                    setFormData({ ...formData, imageUrl: e.target.value });
                    setPreviewImage(e.target.value);
                  }}
                  className="w-full px-3 py-2 border border-[#E0E0E0] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#007782]/20 focus:border-[#007782]"
                  placeholder="https://example.com/book-cover.jpg"
                />
              </div>

              {previewImage && (
                <div className="mt-4 relative inline-block">
                  <img
                    src={previewImage}
                    alt="Preview"
                    className="w-32 h-44 object-cover rounded-lg"
                    onError={() => setPreviewImage("")}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewImage("");
                      setFormData({ ...formData, imageUrl: "" });
                    }}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-[#D32F2F] text-white rounded-full flex items-center justify-center"
                    aria-label="Remove cover image"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-[#111] mb-3">
                Shipping Options
              </label>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-[#666] mb-1">
                    Shipping Cost ({formData.currency})
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
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.pickupAvailable}
                    onChange={(e) => setFormData({ ...formData, pickupAvailable: e.target.checked })}
                    className="w-4 h-4 text-[#007782] rounded border-[#E0E0E0] focus:ring-[#007782]"
                  />
                  <span className="text-sm text-[#111]">Local pickup available</span>
                </label>
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
                disabled={isPending || isUploading}
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
