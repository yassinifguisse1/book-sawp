const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PLACEHOLDER_DOMAIN_PATTERN = /(?:^|\.)example(?:\.com)?$/i;

export function resolveSupportEmail(candidate?: string | null): string | null {
  const email = candidate?.trim() ?? "";
  if (!email || !EMAIL_PATTERN.test(email)) return null;

  const domain = email.split("@")[1] ?? "";
  if (PLACEHOLDER_DOMAIN_PATTERN.test(domain)) return null;

  return email;
}
