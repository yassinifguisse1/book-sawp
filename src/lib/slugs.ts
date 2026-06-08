const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function slugify(value: string | null | undefined, fallback: string) {
  const slug = (value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/^-+|-+$/g, "");

  return slug || fallback;
}

export function parsePublicSlug(segment: string | string[] | undefined) {
  if (!segment || Array.isArray(segment)) return null;

  const decoded = decodeURIComponent(segment);
  const markerIndex = decoded.lastIndexOf("--");
  if (markerIndex <= 0) return null;

  const publicId = decoded.slice(markerIndex + 2).toLowerCase();
  return UUID_PATTERN.test(publicId) ? publicId : null;
}

export function makeBookSlug(book: { title: string; publicId: string }) {
  return `${slugify(book.title, "book")}--${book.publicId.toLowerCase()}`;
}

export function makeProfileSlug(user: { name: string | null; publicId: string }) {
  return `${slugify(user.name, "member")}--${user.publicId.toLowerCase()}`;
}

export function bookPath(book: { title: string; publicId: string }) {
  return `/book/${makeBookSlug(book)}`;
}

export function profilePath(user: { name: string | null; publicId: string }) {
  return `/profile/${makeProfileSlug(user)}`;
}
