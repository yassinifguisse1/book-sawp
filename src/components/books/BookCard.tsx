"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Heart, RefreshCw, Gift, DollarSign, MapPin } from "lucide-react";
import { bookPath } from "@/lib/slugs";
import { useState } from "react";

interface BookCardProps {
  book: {
    id: number;
    publicId: string;
    title: string;
    author: string;
    genre: string;
    condition: string;
    transactionType: string;
    price: string | null;
    currency: string;
    imageUrl: string | null;
    ownerName: string | null;
    ownerAvatar: string | null;
    createdAt: Date;
    displayLocation?: string | null;
    distanceLabel?: string | null;
    pickupAvailable?: boolean;
    shipsToYou?: boolean;
    isDemo?: boolean;
  };
  index?: number;
  isFavorited?: boolean;
  favoritePending?: boolean;
  onToggleFavorite?: (bookId: number) => void;
}

const conditionLabels: Record<string, string> = {
  likenew: "Like New",
  verygood: "Very Good",
  good: "Good",
  fair: "Fair",
  poor: "Poor",
};

export function BookCard({
  book,
  index = 0,
  isFavorited = false,
  favoritePending = false,
  onToggleFavorite,
}: BookCardProps) {
  const [imageError, setImageError] = useState(false);

  const getTransactionBadge = () => {
    switch (book.transactionType) {
      case "swap":
        return (
          <span className="absolute top-2.5 left-2.5 flex items-center gap-1 rounded-full bg-[#007782] px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm">
            <RefreshCw className="h-3 w-3" />
            Swap
          </span>
        );
      case "giveaway":
        return (
          <span className="absolute top-2.5 left-2.5 flex items-center gap-1 rounded-full bg-[#2E7D32] px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm">
            <Gift className="h-3 w-3" />
            Free
          </span>
        );
      case "sale":
        return (
          <span className="absolute top-2.5 left-2.5 flex items-center gap-1 rounded-full bg-[#F5A623] px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm">
            <DollarSign className="h-3 w-3" />
            {book.currency} {book.price}
          </span>
        );
      default:
        return null;
    }
  };

  const getPriceDisplay = () => {
    switch (book.transactionType) {
      case "swap":
        return <span className="text-sm font-bold text-[#007782]">Swap</span>;
      case "giveaway":
        return <span className="text-sm font-bold text-[#2E7D32]">Free</span>;
      case "sale":
        return (
          <span className="text-sm font-bold text-[#2C2C2C]">
            {book.currency} {book.price}
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.04 }}
      className="h-full"
    >
      <Link href={bookPath(book)} className="group flex h-full flex-col">
        <div className="flex h-full flex-col overflow-hidden rounded-xl bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition-all duration-200 hover:shadow-[0_4px_16px_rgba(0,0,0,0.1)] hover:-translate-y-0.5">
          {/* Image */}
          <div className="relative aspect-[3/4] shrink-0 overflow-hidden bg-[#F5F0E8]">
            {!imageError && book.imageUrl ? (
              <img
                src={book.imageUrl}
                alt={book.title}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                onError={() => setImageError(true)}
                loading="lazy"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#E6F3F4] to-[#F5F0E8]">
                <span className="text-5xl font-bold text-[#007782]/15">
                  {book.title.charAt(0)}
                </span>
              </div>
            )}

            {getTransactionBadge()}

            {book.isDemo ? (
              <span className="absolute top-2.5 right-10 rounded-full bg-[#666]/80 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
                Example
              </span>
            ) : null}

            {onToggleFavorite ? (
              <button
                type="button"
                disabled={favoritePending}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onToggleFavorite(book.id);
                }}
                className="absolute top-2.5 right-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur-sm transition-colors hover:bg-white disabled:opacity-60"
              >
                <motion.div whileTap={{ scale: 1.3 }} transition={{ duration: 0.15 }}>
                  <Heart
                    className={`h-4 w-4 transition-colors ${
                      isFavorited
                        ? "fill-[#D32F2F] text-[#D32F2F]"
                        : "text-[#666] hover:text-[#D32F2F]"
                    }`}
                  />
                </motion.div>
              </button>
            ) : null}
          </div>

          {/* Content */}
          <div className="flex flex-1 flex-col p-3">
            <h3 className="mb-0.5 text-sm font-semibold leading-snug text-[#2C2C2C] line-clamp-2">
              {book.title}
            </h3>
            <p className="mb-2 text-xs text-[#666]">{book.author}</p>

            <div className="mb-auto">
              <span className="inline-block rounded-md bg-[#F5F0E8] px-1.5 py-0.5 text-[11px] font-medium text-[#595959]">
                {conditionLabels[book.condition] || book.condition}
              </span>
            </div>

            <div className="mt-2 flex items-center gap-1 text-[11px] text-[#999]">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">
                {book.displayLocation ?? "Unknown location"}
                {book.distanceLabel ? ` · ${book.distanceLabel}` : ""}
              </span>
            </div>

            <div className="mt-1.5 flex items-center justify-between">
              {getPriceDisplay()}
              <span className="text-[11px] text-[#999]">
                {new Date(book.createdAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
