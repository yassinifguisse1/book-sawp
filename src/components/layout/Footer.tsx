"use client";

import Link from "next/link";
import { BookHeart, BookOpen, MessageCircle, Share2, ShieldCheck } from "lucide-react";

const footerSections = [
  {
    title: "BookSwap",
    links: [
      { label: "How it works", href: "/how-it-works" },
      { label: "List a book", href: "/list" },
      { label: "My profile", href: "/profile/me" },
      { label: "Messages", href: "/messages" },
    ],
  },
  {
    title: "Discover",
    links: [
      { label: "Fiction", href: "/?genre=Fiction" },
      { label: "Mystery", href: "/?genre=Mystery" },
      { label: "Sci-Fi & Fantasy", href: "/?genre=Sci-Fi%20%26%20Fantasy" },
      { label: "Children's books", href: "/?genre=Children%27s" },
    ],
  },
  {
    title: "Help",
    links: [
      { label: "How swaps work", href: "/how-it-works" },
      { label: "Buying books", href: "/?transactionType=sale" },
      { label: "Free books", href: "/?transactionType=giveaway" },
      { label: "Trust and safety", href: "/how-it-works" },
    ],
  },
  {
    title: "Community",
    links: [
      { label: "Local libraries", href: "/?search=library" },
      { label: "Textbooks", href: "/?search=textbook" },
      { label: "Book clubs", href: "/?search=book%20club" },
      { label: "Reading gifts", href: "/?transactionType=giveaway" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="mt-16 border-t border-[#E0E0E0] bg-[#F7F7F7]">
      <div className="mx-auto max-w-[1200px] px-4 py-10 md:py-12">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {footerSections.map((section) => (
            <nav key={section.title} aria-label={section.title}>
              <h2 className="mb-5 text-base font-bold text-[#111]">{section.title}</h2>
              <ul className="space-y-4">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-[#666] transition-colors hover:text-[#007782]"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-10 border-t border-[#E0E0E0] pt-6">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <Link href="/" className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-[#007782]" />
              <span className="font-semibold text-[#111]">BookSwap</span>
            </Link>

            <div className="flex items-center gap-4 text-[#999]">
              <Link href="/" aria-label="BookSwap community" className="hover:text-[#007782]">
                <MessageCircle className="h-5 w-5" />
              </Link>
              <Link href="/" aria-label="Share BookSwap" className="hover:text-[#007782]">
                <Share2 className="h-5 w-5" />
              </Link>
              <Link href="/" aria-label="Saved book ideas" className="hover:text-[#007782]">
                <BookHeart className="h-5 w-5" />
              </Link>
              <Link href="/" aria-label="BookSwap safety" className="hover:text-[#007782]">
                <ShieldCheck className="h-5 w-5" />
              </Link>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 text-xs text-[#666] md:flex-row md:items-center md:justify-between">
            <p>Share stories. Build community. Swap books.</p>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              <Link href="/privacy" className="hover:text-[#007782]">Privacy Center</Link>
              <Link href="/cookies" className="hover:text-[#007782]">Cookie Policy</Link>
              <Link href="/terms" className="hover:text-[#007782]">Terms & Conditions</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
