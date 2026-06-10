"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { useAuth } from "@/hooks/useAuth";
import { BrowseLocationSelector } from "@/components/location/BrowseLocationSelector";
import { Search, Camera, HelpCircle, Menu, X, BookOpen, User, MessageCircle, Bell } from "lucide-react";

function NavbarFallback() {
  return (
    <header className="sticky top-0 z-50 border-b border-[#E0E0E0] bg-white">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-4 px-4">
        <div className="flex items-center gap-2 shrink-0">
          <BookOpen className="h-7 w-7 text-[#007782]" />
          <span className="hidden text-xl font-bold text-[#007782] sm:inline">BookSwap</span>
        </div>
        <div className="h-10 flex-1 max-w-xl animate-pulse rounded-md bg-[#EEEEEE]" />
      </div>
    </header>
  );
}

function NavbarContent() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();
  const currentSearch = searchParams.get("search") ?? "";
  const [searchQuery, setSearchQuery] = useState(currentSearch);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (pathname !== "/") return;
    const normalizedSearch = searchQuery.trim();
    if (normalizedSearch === currentSearch) return;

    const timeout = window.setTimeout(() => {
      const params = new URLSearchParams(searchParamsString);
      if (normalizedSearch) {
        params.set("search", normalizedSearch);
      } else {
        params.delete("search");
      }
      const nextQuery = params.toString();
      router.replace(nextQuery ? `/?${nextQuery}` : "/", { scroll: false });
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [currentSearch, pathname, router, searchParamsString, searchQuery]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedSearch = searchQuery.trim();
    const params = new URLSearchParams(pathname === "/" ? searchParamsString : "");
    if (normalizedSearch) {
      params.set("search", normalizedSearch);
    } else {
      params.delete("search");
    }
    const nextQuery = params.toString();
    router.push(nextQuery ? `/?${nextQuery}` : "/");
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-[#E0E0E0]">
      {/* Main Nav */}
      <div className="max-w-[1400px] mx-auto px-4 h-16 flex items-center gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <BookOpen className="w-7 h-7 text-[#007782]" />
          <span className="text-xl font-bold text-[#007782] hidden sm:inline">BookSwap</span>
        </Link>

        {/* Browse location selector */}
        <div className="hidden md:block shrink-0">
          <BrowseLocationSelector />
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="flex-1 max-w-xl">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#999]" />
            <input
              type="text"
              placeholder="Search for books, authors, genres..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 bg-[#F7F7F7] rounded-md text-sm text-[#111] placeholder:text-[#999] focus:outline-none focus:ring-2 focus:ring-[#007782]/20 focus:bg-white border border-transparent focus:border-[#007782] transition-all"
            />
            <Camera className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#999] cursor-pointer hover:text-[#007782]" />
          </div>
        </form>

        {/* Right Section */}
        <div className="flex items-center gap-2 shrink-0">
          {/* List a Book Button */}
          <Link
            href="/list"
            className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 bg-[#007782] text-white text-sm font-semibold rounded-md hover:bg-[#005f66] transition-colors"
          >
            <BookOpen className="w-4 h-4" />
            List a Book
          </Link>

          {/* Help */}
          <Link
            href="/how-it-works"
            aria-label="How BookSwap works"
            className="hidden md:flex p-2 text-[#666] hover:text-[#007782] transition-colors rounded-full hover:bg-[#F7F7F7]"
          >
            <HelpCircle className="w-5 h-5" />
          </Link>

          {/* Auth */}
          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              <Link
                href="/messages"
                className="hidden md:flex p-2 text-[#666] hover:text-[#007782] transition-colors rounded-full hover:bg-[#F7F7F7]"
              >
                <MessageCircle className="w-5 h-5" />
              </Link>
              <Link
                href="/notifications"
                aria-label="Notifications"
                className="hidden md:flex p-2 text-[#666] hover:text-[#007782] transition-colors rounded-full hover:bg-[#F7F7F7]"
              >
                <Bell className="w-5 h-5" />
              </Link>
              {user ? (
                <Link
                  href="/profile/me"
                  aria-label="My profile"
                  className="hidden rounded-full p-2 text-[#666] transition-colors hover:bg-[#F7F7F7] hover:text-[#007782] md:flex"
                >
                  <User className="h-5 w-5" />
                </Link>
              ) : null}
              <UserButton />
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/sign-in"
                className="text-sm font-medium text-[#111] hover:text-[#007782] transition-colors px-3 py-2"
              >
                Sign up | Log in
              </Link>
            </div>
          )}

          {/* Mobile Menu */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-[#666] hover:text-[#007782] transition-colors"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="border-t border-[#E0E0E0] overflow-x-auto scrollbar-hide">
        <div className="max-w-[1400px] mx-auto px-4 flex items-center gap-1 h-11">
          {["All", "Fiction", "Non-Fiction", "Sci-Fi & Fantasy", "Romance", "Mystery", "Biography", "Self-Help", "Academic", "Children's"].map((cat) => (
            <Link
              key={cat}
              href={cat === "All" ? "/" : `/?genre=${encodeURIComponent(cat)}`}
              className="shrink-0 px-3 py-1.5 text-[13px] text-[#666] hover:text-[#111] transition-colors rounded-md hover:bg-[#F7F7F7] whitespace-nowrap"
            >
              {cat}
            </Link>
          ))}
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#E0E0E0] bg-white px-4 py-4 space-y-3">
          <div className="pb-1">
            <BrowseLocationSelector />
          </div>
          <Link
            href="/list"
            className="flex items-center gap-2 px-4 py-2.5 bg-[#007782] text-white text-sm font-semibold rounded-md"
            onClick={() => setMobileMenuOpen(false)}
          >
            <BookOpen className="w-4 h-4" />
            List a Book
          </Link>
          <Link
            href="/how-it-works"
            className="flex items-center gap-2 px-4 py-2.5 text-sm text-[#111] hover:bg-[#F7F7F7] rounded-md"
            onClick={() => setMobileMenuOpen(false)}
          >
            <HelpCircle className="w-4 h-4" />
            How it works
          </Link>
          {isAuthenticated && (
            <>
              <Link
                href="/profile/me"
                className="flex items-center gap-2 px-4 py-2.5 text-sm text-[#111] hover:bg-[#F7F7F7] rounded-md"
                onClick={() => setMobileMenuOpen(false)}
              >
                <User className="w-4 h-4" />
                My Profile
              </Link>
              <Link
                href="/messages"
                className="flex items-center gap-2 px-4 py-2.5 text-sm text-[#111] hover:bg-[#F7F7F7] rounded-md"
                onClick={() => setMobileMenuOpen(false)}
              >
                <MessageCircle className="w-4 h-4" />
                Messages
              </Link>
              <Link
                href="/notifications"
                className="flex items-center gap-2 px-4 py-2.5 text-sm text-[#111] hover:bg-[#F7F7F7] rounded-md"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Bell className="w-4 h-4" />
                Notifications
              </Link>
            </>
          )}
        </div>
      )}
    </header>
  );
}

export function Navbar() {
  return (
    <Suspense fallback={<NavbarFallback />}>
      <NavbarContent />
    </Suspense>
  );
}
