import type { Post, PostCategory, User } from "@/server/db/schema";

export type SiteContext = {
  url: string;
  name: string;
  logoUrl?: string;
  twitterHandle?: string;
};

export type PostWithAuthorAndCategories = Post & {
  author: Pick<User, "id" | "publicId" | "name" | "avatar"> | null;
  categories: PostCategory[];
};

export function generateOrganizationSchema(site: SiteContext) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: site.name,
    url: site.url,
    logo: site.logoUrl ?? `${site.url}/logo.png`,
    sameAs: site.twitterHandle ? [`https://twitter.com/${site.twitterHandle}`] : undefined,
  };
}

export function generateWebSiteSchema(site: SiteContext) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: site.name,
    url: site.url,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${site.url}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function generateBreadcrumbSchema(
  crumbs: { title: string; path: string }[],
  siteUrl: string
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.title,
      item: `${siteUrl}${crumb.path}`,
    })),
  };
}

export function generateBlogPostingSchema(
  post: PostWithAuthorAndCategories,
  site: SiteContext
) {
  const author = post.author;

  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.seoTitle || post.title,
    description: post.seoDescription || post.excerpt || undefined,
    image: post.coverImageUrl ?? undefined,
    datePublished: post.publishedAt?.toISOString(),
    dateModified: post.updatedAt.toISOString(),
    author: author
      ? {
          "@type": "Person",
          name: author.name || "BookSwap Team",
          url: `${site.url}/profile/${author.publicId}`,
          image: author.avatar ?? undefined,
        }
      : {
          "@type": "Organization",
          name: site.name,
          url: site.url,
        },
    publisher: {
      "@type": "Organization",
      name: site.name,
      url: site.url,
      logo: {
        "@type": "ImageObject",
        url: site.logoUrl ?? `${site.url}/logo.png`,
      },
    },
    articleSection: post.categories.map((c) => c.name).join(", ") || undefined,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${site.url}/blog/${post.slug}`,
    },
  };
}

export function generateBlogSchema(
  posts: PostWithAuthorAndCategories[],
  site: SiteContext
) {
  return {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: `BookSwap Blog`,
    url: `${site.url}/blog`,
    description:
      "Reading tips, book reviews, community stories, and sustainable book swapping advice from BookSwap.",
    blogPost: posts.map((post) => ({
      "@type": "BlogPosting",
      headline: post.title,
      url: `${site.url}/blog/${post.slug}`,
      datePublished: post.publishedAt?.toISOString(),
      author: post.author?.name || "BookSwap Team",
    })),
  };
}

export function generateProductSchema({
  title,
  description,
  image,
  price,
  currency,
  availability,
  condition,
  url,
}: {
  title: string;
  description?: string | null;
  image?: string | null;
  price: string;
  currency: string;
  availability: "InStock" | "OutOfStock";
  condition: string;
  url: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: title,
    description: description ?? undefined,
    image: image ?? undefined,
    offers: {
      "@type": "Offer",
      price,
      priceCurrency: currency,
      availability: `https://schema.org/${availability}`,
      url,
    },
    itemCondition: `https://schema.org/${condition}Condition`,
  };
}

export function generatePersonSchema(
  user: Pick<User, "id" | "publicId" | "name" | "bio" | "avatar">,
  siteUrl: string
) {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: user.name || "BookSwap Member",
    description: user.bio ?? undefined,
    image: user.avatar ?? undefined,
    url: `${siteUrl}/profile/${user.publicId}`,
  };
}
