"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

export function CompactHero() {
  return (
    <section className="bg-[#F8F8F8]">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mx-auto grid max-w-[1200px] grid-cols-1 gap-4 px-4 py-6 md:grid-cols-3"
      >
        {/* Main promo card */}
        <Link
          href="/list"
          className="group relative flex min-h-[280px] overflow-hidden rounded-2xl bg-[#0B5560] shadow-sm md:col-span-2 md:min-h-[340px]"
        >
          <div className="flex w-full flex-col items-start justify-center p-6 sm:p-8 md:w-[45%] md:p-10">
            <h2 className="text-3xl font-bold leading-tight text-white ">
              Swap a story, discover books near you
            </h2>
            <p className="mt-3 text-white/85 sm:text-md">
              Join fellow readers swapping, gifting, and selling books in your community.
            </p>
            <span className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[#007782] transition-all group-hover:bg-white/90 group-hover:shadow-md">
              List a Book
            </span>
          </div>
          <div className="relative hidden w-[55%] md:block">
            <img
              src="/images/hero.jpg"
              alt="Cozy home library with books"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          </div>
        </Link>

        {/* Secondary promo card */}
        <Link
          href="/?transactionType=swap"
          className="group relative min-h-[200px] overflow-hidden rounded-2xl shadow-sm md:min-h-[340px]"
        >
          <img
            src="/images/books/book9.jpg"
            alt="Stack of books"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <div className="absolute bottom-0 left-0 p-6">
            <h3 className="text-xl font-bold text-white sm:text-2xl">
              Ready for your next read?
            </h3>
            <span className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-white/90 transition-colors group-hover:text-white">
              Browse swaps
              <ArrowRight className="h-4 w-4" />
            </span>
          </div>
        </Link>
      </motion.div>
    </section>
  );
}
