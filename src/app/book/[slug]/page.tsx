import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BookDetailPage from "@/components/pages/BookDetailPage";
import { getListingByPublicId } from "@/server/domain/listings";
import { parsePublicSlug } from "@/lib/slugs";
import { env } from "@/server/env";
import { generateBreadcrumbSchema, generateOrganizationSchema, generateProductSchema } from "@/lib/seo/schemas";
import { JsonLd } from "@/components/seo/JsonLd";
import { toMajorUnits } from "@/server/domain/validation";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const publicId = parsePublicSlug(slug);

  if (!publicId) {
    return { title: "Book Not Found | BookSwap" };
  }

  const book = await getListingByPublicId(publicId);

  if (!book) {
    return { title: "Book Not Found | BookSwap" };
  }

  const title = `${book.title} by ${book.author} | BookSwap`;
  const description =
    book.description ||
    `Check out "${book.title}" by ${book.author} on BookSwap. Available for ${book.transactionType}.`;
  const url = `${env.appUrl}/book/${slug}`;
  const image = book.imageUrl || undefined;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      url,
      images: image ? [{ url: image, width: 1200, height: 630, alt: book.title }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: image ? [image] : undefined,
    },
    alternates: {
      canonical: url,
    },
  };
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const publicId = parsePublicSlug(slug);

  if (!publicId) {
    notFound();
  }

  const book = await getListingByPublicId(publicId);

  if (!book) {
    notFound();
  }

  const site = { url: env.appUrl, name: "BookSwap" };
  const price = toMajorUnits(book.priceMinor);

  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      generateOrganizationSchema(site),
      generateBreadcrumbSchema(
        [
          { title: "Home", path: "/" },
          { title: book.title, path: `/book/${slug}` },
        ],
        env.appUrl
      ),
      generateProductSchema({
        title: book.title,
        description: book.description,
        image: book.imageUrl,
        price: price ?? "0",
        currency: book.currency,
        availability: book.status === "active" ? "InStock" : "OutOfStock",
        condition: book.condition,
        url: `${env.appUrl}/book/${slug}`,
      }),
    ],
  };

  return (
    <>
      <JsonLd data={schema} />
      <BookDetailPage />
    </>
  );
}
