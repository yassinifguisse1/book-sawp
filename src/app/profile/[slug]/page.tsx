import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ProfilePage from "@/components/pages/ProfilePage";
import { getDb } from "@/server/db/connection";
import { users } from "@/server/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { env } from "@/server/env";
import { generateBreadcrumbSchema, generateOrganizationSchema, generatePersonSchema } from "@/lib/seo/schemas";
import { JsonLd } from "@/components/seo/JsonLd";

interface Props {
  params: Promise<{ slug: string }>;
}

async function getProfileByPublicId(publicId: string) {
  const db = getDb();
  const [profile] = await db
    .select({
      id: users.id,
      publicId: users.publicId,
      name: users.name,
      bio: users.bio,
      avatar: users.avatar,
      city: users.city,
      country: users.country,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(
      and(
        eq(users.publicId, publicId),
        isNull(users.deletedAt),
        isNull(users.bannedAt),
        isNull(users.suspendedAt),
      ),
    )
    .limit(1);
  return profile ?? null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const profile = await getProfileByPublicId(slug);

  if (!profile) {
    return { title: "Profile Not Found | BookSwap" };
  }

  const name = profile.name || "BookSwap Member";
  const title = `${name}'s Profile | BookSwap`;
  const description = profile.bio || `Check out ${name}'s book listings and reviews on BookSwap.`;
  const url = `${env.appUrl}/profile/${slug}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "profile",
      url,
      images: profile.avatar
        ? [{ url: profile.avatar, width: 400, height: 400, alt: name }]
        : undefined,
    },
    twitter: {
      card: "summary",
      title,
      description,
      images: profile.avatar ? [profile.avatar] : undefined,
    },
    alternates: {
      canonical: url,
    },
  };
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const profile = await getProfileByPublicId(slug);

  if (!profile) {
    notFound();
  }

  const site = { url: env.appUrl, name: "BookSwap" };
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      generateOrganizationSchema(site),
      generateBreadcrumbSchema(
        [
          { title: "Home", path: "/" },
          { title: profile.name || "Member", path: `/profile/${slug}` },
        ],
        env.appUrl
      ),
      generatePersonSchema(profile, env.appUrl),
    ],
  };

  return (
    <>
      <JsonLd data={schema} />
      <ProfilePage />
    </>
  );
}
