const suspiciousUrl = /\b(?:https?:\/\/|www\.)\S+/i;
const contactShare = /\b(?:whatsapp|telegram|signal|send money|bank transfer|crypto|gift card)\b/i;
const paymentPressure = /\b(?:pay now|urgent payment|deposit first|wire me|friends and family)\b/i;

export function scanMarketplaceText(text: string, recentMessages: string[] = []) {
  const reasons = [
    suspiciousUrl.test(text) ? "external_url" : null,
    contactShare.test(text) ? "off_platform_contact_or_payment" : null,
    paymentPressure.test(text) ? "payment_pressure" : null,
    recentMessages.length >= 8 ? "spam_frequency" : null,
    contactShare.test(text) && recentMessages.some((message) => contactShare.test(message))
      ? "repeated_contact_sharing"
      : null,
  ].filter((reason): reason is string => Boolean(reason));

  return {
    flagged: reasons.length > 0,
    reasons,
  };
}
