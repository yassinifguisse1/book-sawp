"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Heart, RefreshCw, Gift, DollarSign, MapPin, Truck } from "lucide-react";
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
          <span className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 bg-[#007782] text-white text-xs font-medium rounded">
            <RefreshCw className="w-3 h-3" />
            Swap
          </span>
        );
      case "giveaway":
        return (
          <span className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 bg-[#2E7D32] text-white text-xs font-medium rounded">
            <Gift className="w-3 h-3" />
            Free
          </span>
        );
      case "sale":
        return (
          <span className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 bg-[#E65100] text-white text-xs font-medium rounded">
            <DollarSign className="w-3 h-3" />
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
        return <span className="text-sm font-semibold text-[#007782]">Swap</span>;
      case "giveaway":
        return <span className="text-sm font-semibold text-[#2E7D32]">Free</span>;
      case "sale":
        return <span className="text-sm font-semibold text-[#111]">{book.currency} {book.price}</span>;
      default:
        return null;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
    >
      <Link href={bookPath(book)} className="group block">
        <div className="bg-white rounded-lg shadow-[0_1px_3px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] transition-all duration-200 hover:-translate-y-0.5 overflow-hidden">
          {/* Image */}
          <div className="relative aspect-[3/4] overflow-hidden bg-[#F7F7F7]">
            {!imageError && book.imageUrl ? (
              <img
                src={book.imageUrl}
                alt={book.title}
                className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#e6f3f4] to-[#F7F7F7]">
                <span className="text-4xl font-bold text-[#007782]/20">{book.title.charAt(0)}</span>
              </div>
            )}

            {/* Transaction Badge */}
            {getTransactionBadge()}

            {/* Demo Badge */}
            {book.isDemo ? (
              <span className="absolute top-2 right-10 flex items-center gap-1 rounded bg-[#666] px-1.5 py-0.5 text-[10px] font-medium text-white">
                Example
              </span>
            ) : null}

            {/* Favorite Button */}
            {onToggleFavorite ? (
              <button
                type="button"
                disabled={favoritePending}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onToggleFavorite(book.id);
                }}
                className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur-sm transition-colors hover:bg-white disabled:opacity-60"
              >
                <motion.div whileTap={{ scale: 1.3 }} transition={{ duration: 0.15 }}>
                  <Heart
                    className={`w-4 h-4 transition-colors ${
                      isFavorited ? "fill-[#D32F2F] text-[#D32F2F]" : "text-[#666] hover:text-[#D32F2F]"
                    }`}
                  />
                </motion.div>
              </button>
            ) : null}
          </div>

          {/* Content */}
          <div className="p-3">
            <h3 className="text-sm font-semibold text-[#111] line-clamp-2 leading-tight mb-0.5">
              {book.title}
            </h3>
            <p className="text-xs text-[#666] mb-1.5">{book.author}</p>

            <div className="flex items-center gap-1.5 mb-2">
              <span className="inline-block px-1.5 py-0.5 bg-[#F7F7F7] text-[#666] text-[11px] rounded">
                {conditionLabels[book.condition] || book.condition}
              </span>
            </div>

            {(book.displayLocation || book.distanceLabel || book.pickupAvailable || book.shipsToYou) && (
              <div className="mb-2 flex flex-wrap items-center gap-1.5 text-[11px] text-[#666]">
                {book.displayLocation ? (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-[#999]" />
                    {book.displayLocation}
                  </span>
                ) : null}
                {book.distanceLabel ? (
                  <span className="text-[#999]">· {book.distanceLabel} away</span>
                ) : null}
                <span className="flex w-full items-center gap-1.5">
                  {book.pickupAvailable ? (
                    <span className="inline-flex items-center gap-0.5 rounded bg-[#E6F3F4] px-1.5 py-0.5 text-[10px] font-medium text-[#007782]">
                      <MapPin className="h-2.5 w-2.5" /> Pickup
                    </span>
                  ) : null}
                  {book.shipsToYou ? (
                    <span className="inline-flex items-center gap-0.5 rounded bg-[#EAF5EC] px-1.5 py-0.5 text-[10px] font-medium text-[#2E7D32]">
                      <Truck className="h-2.5 w-2.5" /> Ships to you
                    </span>
                  ) : null}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between">
              {getPriceDisplay()}
              <span className="text-[11px] text-[#999]">{book.genre}</span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
