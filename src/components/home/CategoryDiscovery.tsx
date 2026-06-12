"use client";

import Link from "next/link";

const categories = [
  { label: "Fiction", href: "/?genre=Fiction", image: "/images/books/book1.jpg" },
  { label: "Mystery", href: "/?genre=Mystery", image: "/images/books/book2.jpg" },
  { label: "Romance", href: "/?genre=Romance", image: "/images/books/book3.jpg" },
  { label: "Sci-Fi & Fantasy", href: "/?genre=Sci-Fi%20%26%20Fantasy", image: "/images/books/book4.jpg" },
  { label: "Children's", href: "/?genre=Children%27s", image: "/images/books/book5.jpg" },
  { label: "Academic", href: "/?genre=Academic", image: "/images/books/book6.jpg" },
  { label: "Biography", href: "/?genre=Biography", image: "/images/books/book7.jpg" },
  { label: "Self-Help", href: "/?genre=Self-Help", image: "/images/books/book8.jpg" },
];

export function CategoryDiscovery() {
  return (
    <section className="mx-auto max-w-[1200px] px-4 py-8">
      <h2 className="mb-5 text-lg font-bold text-[#2C2C2C] md:text-xl">
        Browse by category
      </h2>
      <div className="scrollbar-hide flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory">
        {categories.map((cat) => (
          <Link
            key={cat.label}
            href={cat.href}
            className="group relative block w-[140px] shrink-0 snap-start overflow-hidden rounded-xl sm:w-[160px]"
          >
            <div className="relative aspect-[3/4] overflow-hidden">
              <img
                src={cat.image}
                alt={cat.label}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <span className="absolute bottom-3 left-3 right-3 text-sm font-bold text-white">
                {cat.label}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
