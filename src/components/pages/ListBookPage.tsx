"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import {
  ListingForm,
  ListingFormUnavailable,
  ListingSuccess,
  type ListingFormSubmitValues,
} from "@/components/listings/ListingForm";
import { useAuth } from "@/hooks/useAuth";
import { useTrustActionRedirect } from "@/hooks/useTrustActionRedirect";
import { trpc } from "@/providers/app-providers";

export default function ListBook() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [createdKey, setCreatedKey] = useState(0);
  const [created, setCreated] = useState(false);
  const handleTrustError = useTrustActionRedirect();

  const createBook = trpc.book.create.useMutation({
    onSuccess: () => {
      setCreated(true);
    },
    onError: handleTrustError,
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <ListingFormUnavailable
          title="Sign in to list a book"
          message="You need to be logged in to list your books for swap, giveaway, or sale."
        />
        <div className="-mt-14 text-center">
          <button
            type="button"
            onClick={() => router.push("/login")}
            className="px-6 py-2.5 bg-[#007782] text-white font-semibold rounded-md hover:bg-[#005f66] transition-colors"
          >
            Sign in
          </button>
        </div>
      </div>
    );
  }

  const handleSubmit = (values: ListingFormSubmitValues) => {
    createBook.mutate(values);
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      {created ? (
        <ListingSuccess
          onViewListings={() => router.push("/")}
          onListAnother={() => {
            setCreated(false);
            setCreatedKey((key) => key + 1);
          }}
        />
      ) : (
        <ListingForm
          key={createdKey}
          mode="create"
          isPending={createBook.isPending}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}
