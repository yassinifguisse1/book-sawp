export type SafetyPriority = "low" | "medium" | "high" | "critical";
export type SafetyStatus = "open" | "under_review" | "resolved" | "dismissed" | "escalated";
export type TriggerSource = "user_report" | "automatic_rule" | "transaction_review";
export type ConversationType = "sell" | "swap" | "giveaway" | "general_inquiry";
export type SafetyRuleCategory = "payment_scam" | "contact_sharing" | "spam" | "conduct" | "transaction_risk";
export type SafetyRuleAction =
  | "deliver_and_flag"
  | "deliver_warn_and_flag"
  | "block_message_and_flag"
  | "restrict_actions_until_review";
export type AuditAction =
  | "flagged_chat_context_opened"
  | "additional_context_requested"
  | "violation_confirmed"
  | "flag_dismissed"
  | "sender_warned"
  | "sender_suspended"
  | "domain_blocked"
  | "safety_rule_changed"
  | "internal_note_added";

export type ChatSafetyFlag = {
  id: string;
  conversationId: string;
  flaggedMessageId: string;
  triggerSource: TriggerSource;
  triggeredRule: string;
  priority: SafetyPriority;
  status: SafetyStatus;
  conversationType: ConversationType;
  senderId: number;
  senderName: string;
  senderVerified: boolean;
  senderAccountStatus: "active" | "suspended" | "banned" | "deleted";
  senderRiskLevel: "normal" | "flagged" | "high_risk";
  recipientId: number;
  recipientName: string;
  recipientVerified: boolean;
  recipientAccountStatus: "active" | "suspended" | "banned" | "deleted";
  recipientRiskLevel: "normal" | "flagged" | "high_risk";
  listingId?: number;
  listingTitle?: string;
  transactionId?: string;
  reportId?: string;
  messagePreview: string;
  highlightedPhrases: string[];
  suspiciousUrl?: string;
  repeatFlagsCount: number;
  safetyFlags: string[];
  assignedModeratorId?: number;
  assignedModeratorName?: string;
  country: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  resolutionNote?: string;
  previousReports: number;
  moderationHistory: string[];
};

export type ConversationMessage = {
  id: string;
  flagId: string;
  senderName: string;
  recipientName: string;
  timestamp: string;
  body: string;
  isFlagged?: boolean;
};

export type SafetyRule = {
  id: string;
  category: SafetyRuleCategory;
  severity: SafetyPriority;
  enabled: boolean;
  action: SafetyRuleAction;
  updatedAt: string;
  updatedBy: string;
};

export type BlockedDomain = {
  domain: string;
  reason: string;
  status: "active" | "disabled";
  addedBy: string;
  createdAt: string;
};

export type SafetyAuditEvent = {
  id: string;
  adminUserId: number;
  actionType: AuditAction;
  flagId: string;
  conversationId: string;
  targetUserId?: number;
  reason: string;
  metadata: string;
  createdAt: string;
};

export const safetyRules: SafetyRule[] = [
  { id: "advance_payment_request", category: "payment_scam", severity: "high", enabled: true, action: "deliver_warn_and_flag", updatedAt: "2026-06-08T08:10:00Z", updatedBy: "Amal Benali" },
  { id: "external_payment_link", category: "payment_scam", severity: "critical", enabled: true, action: "block_message_and_flag", updatedAt: "2026-06-07T15:35:00Z", updatedBy: "Nora Ellis" },
  { id: "bank_transfer_request", category: "payment_scam", severity: "high", enabled: true, action: "deliver_warn_and_flag", updatedAt: "2026-06-05T10:12:00Z", updatedBy: "Nora Ellis" },
  { id: "crypto_payment_request", category: "payment_scam", severity: "critical", enabled: true, action: "block_message_and_flag", updatedAt: "2026-06-05T10:12:00Z", updatedBy: "Nora Ellis" },
  { id: "suspicious_url", category: "payment_scam", severity: "high", enabled: true, action: "block_message_and_flag", updatedAt: "2026-06-04T12:20:00Z", updatedBy: "Jon Price" },
  { id: "repeated_external_payment_request", category: "payment_scam", severity: "critical", enabled: true, action: "restrict_actions_until_review", updatedAt: "2026-06-01T09:00:00Z", updatedBy: "Amal Benali" },
  { id: "phone_number_shared", category: "contact_sharing", severity: "low", enabled: true, action: "deliver_and_flag", updatedAt: "2026-06-02T14:10:00Z", updatedBy: "Amal Benali" },
  { id: "email_address_shared", category: "contact_sharing", severity: "low", enabled: true, action: "deliver_and_flag", updatedAt: "2026-06-02T14:10:00Z", updatedBy: "Amal Benali" },
  { id: "messaging_app_link", category: "contact_sharing", severity: "medium", enabled: true, action: "deliver_warn_and_flag", updatedAt: "2026-06-03T16:00:00Z", updatedBy: "Jon Price" },
  { id: "repeated_off_platform_contact_request", category: "contact_sharing", severity: "high", enabled: true, action: "restrict_actions_until_review", updatedAt: "2026-06-03T16:00:00Z", updatedBy: "Jon Price" },
  { id: "spam_burst", category: "spam", severity: "medium", enabled: true, action: "deliver_warn_and_flag", updatedAt: "2026-06-06T11:45:00Z", updatedBy: "Nora Ellis" },
  { id: "repeated_message", category: "spam", severity: "medium", enabled: true, action: "deliver_and_flag", updatedAt: "2026-06-06T11:45:00Z", updatedBy: "Nora Ellis" },
  { id: "mass_messaging_pattern", category: "spam", severity: "high", enabled: true, action: "restrict_actions_until_review", updatedAt: "2026-06-06T11:45:00Z", updatedBy: "Nora Ellis" },
  { id: "duplicate_message_across_conversations", category: "spam", severity: "high", enabled: true, action: "restrict_actions_until_review", updatedAt: "2026-06-06T11:45:00Z", updatedBy: "Nora Ellis" },
  { id: "excessive_link_sharing", category: "spam", severity: "high", enabled: true, action: "block_message_and_flag", updatedAt: "2026-06-06T11:45:00Z", updatedBy: "Nora Ellis" },
  { id: "harassment_keyword", category: "conduct", severity: "high", enabled: true, action: "deliver_warn_and_flag", updatedAt: "2026-06-01T13:20:00Z", updatedBy: "Amal Benali" },
  { id: "threatening_language", category: "conduct", severity: "critical", enabled: true, action: "block_message_and_flag", updatedAt: "2026-06-01T13:20:00Z", updatedBy: "Amal Benali" },
  { id: "abusive_language", category: "conduct", severity: "medium", enabled: true, action: "deliver_warn_and_flag", updatedAt: "2026-06-01T13:20:00Z", updatedBy: "Amal Benali" },
  { id: "prohibited_content", category: "conduct", severity: "critical", enabled: true, action: "block_message_and_flag", updatedAt: "2026-06-01T13:20:00Z", updatedBy: "Amal Benali" },
  { id: "multiple_cancelled_reservations", category: "transaction_risk", severity: "medium", enabled: true, action: "deliver_and_flag", updatedAt: "2026-06-07T09:25:00Z", updatedBy: "Jon Price" },
  { id: "multiple_reports", category: "transaction_risk", severity: "high", enabled: true, action: "restrict_actions_until_review", updatedAt: "2026-06-07T09:25:00Z", updatedBy: "Jon Price" },
  { id: "high_message_volume", category: "transaction_risk", severity: "medium", enabled: true, action: "deliver_and_flag", updatedAt: "2026-06-07T09:25:00Z", updatedBy: "Jon Price" },
  { id: "duplicate_account_signal", category: "transaction_risk", severity: "high", enabled: true, action: "restrict_actions_until_review", updatedAt: "2026-06-07T09:25:00Z", updatedBy: "Jon Price" },
  { id: "new_account_high_activity", category: "transaction_risk", severity: "medium", enabled: true, action: "deliver_warn_and_flag", updatedAt: "2026-06-07T09:25:00Z", updatedBy: "Jon Price" },
];

export const chatSafetyFlags: ChatSafetyFlag[] = [
  {
    id: "CSF-1028",
    conversationId: "CNV-81241",
    flaggedMessageId: "MSG-612889",
    triggerSource: "automatic_rule",
    triggeredRule: "external_payment_link",
    priority: "critical",
    status: "open",
    conversationType: "sell",
    senderId: 218,
    senderName: "Milo Novak",
    senderVerified: false,
    senderAccountStatus: "active",
    senderRiskLevel: "high_risk",
    recipientId: 94,
    recipientName: "Sara Lind",
    recipientVerified: true,
    recipientAccountStatus: "active",
    recipientRiskLevel: "normal",
    listingId: 731,
    listingTitle: "The Left Hand of Darkness",
    transactionId: "TX-44518",
    reportId: "RPT-9093",
    messagePreview: "Pay through this secure reader link instead of BookSwap: books-pay.example/checkout",
    highlightedPhrases: ["secure reader link", "instead of BookSwap"],
    suspiciousUrl: "books-pay.example/checkout",
    repeatFlagsCount: 5,
    safetyFlags: ["external_payment_link", "repeated_external_payment_request", "suspicious_url"],
    assignedModeratorId: 12,
    assignedModeratorName: "Nora Ellis",
    country: "US",
    createdAt: "2026-06-08T09:18:00Z",
    updatedAt: "2026-06-08T09:29:00Z",
    previousReports: 3,
    moderationHistory: ["Warning issued on Jun 2", "Two payment-link flags in the last 48 hours"],
  },
  {
    id: "CSF-1027",
    conversationId: "CNV-81209",
    flaggedMessageId: "MSG-612712",
    triggerSource: "user_report",
    triggeredRule: "harassment_keyword",
    priority: "high",
    status: "under_review",
    conversationType: "swap",
    senderId: 77,
    senderName: "Owen Hart",
    senderVerified: true,
    senderAccountStatus: "active",
    senderRiskLevel: "flagged",
    recipientId: 181,
    recipientName: "Mina Ruiz",
    recipientVerified: true,
    recipientAccountStatus: "active",
    recipientRiskLevel: "normal",
    listingId: 688,
    listingTitle: "Beloved",
    transactionId: "TX-44480",
    reportId: "RPT-9089",
    messagePreview: "You wasted my time. I know where your pickup area is.",
    highlightedPhrases: ["I know where your pickup area is"],
    repeatFlagsCount: 2,
    safetyFlags: ["harassment_keyword", "threatening_language"],
    assignedModeratorId: 15,
    assignedModeratorName: "Amal Benali",
    country: "GB",
    createdAt: "2026-06-08T08:54:00Z",
    updatedAt: "2026-06-08T09:07:00Z",
    previousReports: 1,
    moderationHistory: ["User report opened by Amal Benali"],
  },
  {
    id: "CSF-1026",
    conversationId: "CNV-81191",
    flaggedMessageId: "MSG-612501",
    triggerSource: "transaction_review",
    triggeredRule: "multiple_cancelled_reservations",
    priority: "medium",
    status: "open",
    conversationType: "giveaway",
    senderId: 302,
    senderName: "Priya Shah",
    senderVerified: true,
    senderAccountStatus: "active",
    senderRiskLevel: "flagged",
    recipientId: 140,
    recipientName: "Jacob Reed",
    recipientVerified: false,
    recipientAccountStatus: "active",
    recipientRiskLevel: "normal",
    listingId: 702,
    listingTitle: "A Little Life",
    transactionId: "TX-44466",
    messagePreview: "I can reserve it again, but only if you confirm pickup today.",
    highlightedPhrases: ["reserve it again"],
    repeatFlagsCount: 4,
    safetyFlags: ["multiple_cancelled_reservations", "high_message_volume"],
    country: "CA",
    createdAt: "2026-06-08T07:41:00Z",
    updatedAt: "2026-06-08T07:41:00Z",
    previousReports: 0,
    moderationHistory: ["Linked transaction auto-flagged after third cancellation"],
  },
  {
    id: "CSF-1025",
    conversationId: "CNV-81144",
    flaggedMessageId: "MSG-612188",
    triggerSource: "automatic_rule",
    triggeredRule: "phone_number_shared",
    priority: "low",
    status: "dismissed",
    conversationType: "general_inquiry",
    senderId: 129,
    senderName: "Theo Park",
    senderVerified: true,
    senderAccountStatus: "active",
    senderRiskLevel: "normal",
    recipientId: 243,
    recipientName: "Leah Stone",
    recipientVerified: true,
    recipientAccountStatus: "active",
    recipientRiskLevel: "normal",
    listingId: 642,
    listingTitle: "Norwegian Wood",
    messagePreview: "My number is in the pickup note if the library entrance is closed.",
    highlightedPhrases: ["number"],
    repeatFlagsCount: 1,
    safetyFlags: ["phone_number_shared"],
    assignedModeratorId: 12,
    assignedModeratorName: "Nora Ellis",
    country: "US",
    createdAt: "2026-06-08T06:10:00Z",
    updatedAt: "2026-06-08T06:39:00Z",
    resolvedAt: "2026-06-08T06:39:00Z",
    resolutionNote: "Single pickup coordination message. No suspicious pattern.",
    previousReports: 0,
    moderationHistory: ["Dismissed as legitimate pickup coordination"],
  },
  {
    id: "CSF-1024",
    conversationId: "CNV-81097",
    flaggedMessageId: "MSG-611930",
    triggerSource: "automatic_rule",
    triggeredRule: "mass_messaging_pattern",
    priority: "high",
    status: "escalated",
    conversationType: "sell",
    senderId: 411,
    senderName: "Rami Cole",
    senderVerified: false,
    senderAccountStatus: "suspended",
    senderRiskLevel: "high_risk",
    recipientId: 188,
    recipientName: "Iris Wong",
    recipientVerified: true,
    recipientAccountStatus: "active",
    recipientRiskLevel: "normal",
    listingId: 604,
    listingTitle: "Atomic Habits",
    transactionId: "TX-44381",
    reportId: "RPT-9068",
    messagePreview: "I have many copies. Message me on QuickChat for the payment link.",
    highlightedPhrases: ["many copies", "payment link"],
    suspiciousUrl: "quickchat.example/rami-books",
    repeatFlagsCount: 9,
    safetyFlags: ["mass_messaging_pattern", "messaging_app_link", "external_payment_link"],
    assignedModeratorId: 22,
    assignedModeratorName: "Jon Price",
    country: "AU",
    createdAt: "2026-06-07T22:23:00Z",
    updatedAt: "2026-06-08T02:13:00Z",
    previousReports: 6,
    moderationHistory: ["Temporary suspension applied", "Escalated for trust review"],
  },
  {
    id: "CSF-1023",
    conversationId: "CNV-81043",
    flaggedMessageId: "MSG-611502",
    triggerSource: "user_report",
    triggeredRule: "abusive_language",
    priority: "medium",
    status: "resolved",
    conversationType: "swap",
    senderId: 55,
    senderName: "Lena Moss",
    senderVerified: true,
    senderAccountStatus: "active",
    senderRiskLevel: "normal",
    recipientId: 98,
    recipientName: "Samir Khan",
    recipientVerified: true,
    recipientAccountStatus: "active",
    recipientRiskLevel: "normal",
    listingId: 590,
    listingTitle: "The Overstory",
    transactionId: "TX-44290",
    reportId: "RPT-9049",
    messagePreview: "That was rude. I still want to swap if you confirm the condition.",
    highlightedPhrases: ["rude"],
    repeatFlagsCount: 1,
    safetyFlags: ["abusive_language"],
    assignedModeratorId: 15,
    assignedModeratorName: "Amal Benali",
    country: "FR",
    createdAt: "2026-06-07T18:15:00Z",
    updatedAt: "2026-06-08T08:04:00Z",
    resolvedAt: "2026-06-08T08:04:00Z",
    resolutionNote: "Warning sent; conversation cooled down.",
    previousReports: 0,
    moderationHistory: ["Sender warned", "Resolved after participant follow-up"],
  },
];

export const conversationMessages: ConversationMessage[] = [
  { id: "MSG-612886", flagId: "CSF-1028", senderName: "Sara Lind", recipientName: "Milo Novak", timestamp: "2026-06-08T09:11:00Z", body: "Is the listing price still the same?" },
  { id: "MSG-612887", flagId: "CSF-1028", senderName: "Milo Novak", recipientName: "Sara Lind", timestamp: "2026-06-08T09:13:00Z", body: "Yes, but BookSwap fees are slow for me." },
  { id: "MSG-612888", flagId: "CSF-1028", senderName: "Sara Lind", recipientName: "Milo Novak", timestamp: "2026-06-08T09:15:00Z", body: "I only want to keep it in BookSwap messages." },
  { id: "MSG-612889", flagId: "CSF-1028", senderName: "Milo Novak", recipientName: "Sara Lind", timestamp: "2026-06-08T09:18:00Z", body: "Pay through this secure reader link instead of BookSwap: books-pay.example/checkout", isFlagged: true },
  { id: "MSG-612890", flagId: "CSF-1028", senderName: "Sara Lind", recipientName: "Milo Novak", timestamp: "2026-06-08T09:19:00Z", body: "No, I am reporting this." },
  { id: "MSG-612891", flagId: "CSF-1028", senderName: "Milo Novak", recipientName: "Sara Lind", timestamp: "2026-06-08T09:20:00Z", body: "It is faster. Everyone uses it." },
  { id: "MSG-612892", flagId: "CSF-1028", senderName: "Sara Lind", recipientName: "Milo Novak", timestamp: "2026-06-08T09:21:00Z", body: "Please stop sending external links." },
  { id: "MSG-612709", flagId: "CSF-1027", senderName: "Mina Ruiz", recipientName: "Owen Hart", timestamp: "2026-06-08T08:47:00Z", body: "I cannot swap today. The station is closed." },
  { id: "MSG-612710", flagId: "CSF-1027", senderName: "Owen Hart", recipientName: "Mina Ruiz", timestamp: "2026-06-08T08:50:00Z", body: "You changed the plan twice." },
  { id: "MSG-612711", flagId: "CSF-1027", senderName: "Mina Ruiz", recipientName: "Owen Hart", timestamp: "2026-06-08T08:52:00Z", body: "I understand. We can cancel the swap." },
  { id: "MSG-612712", flagId: "CSF-1027", senderName: "Owen Hart", recipientName: "Mina Ruiz", timestamp: "2026-06-08T08:54:00Z", body: "You wasted my time. I know where your pickup area is.", isFlagged: true },
  { id: "MSG-612713", flagId: "CSF-1027", senderName: "Mina Ruiz", recipientName: "Owen Hart", timestamp: "2026-06-08T08:55:00Z", body: "That sounds threatening. I am reporting this." },
  { id: "MSG-612714", flagId: "CSF-1027", senderName: "Owen Hart", recipientName: "Mina Ruiz", timestamp: "2026-06-08T08:56:00Z", body: "Fine. Cancel it." },
  { id: "MSG-612715", flagId: "CSF-1027", senderName: "Mina Ruiz", recipientName: "Owen Hart", timestamp: "2026-06-08T08:58:00Z", body: "Please do not contact me outside BookSwap." },
];

export const blockedDomains: BlockedDomain[] = [
  { domain: "books-pay.example", reason: "Payment impersonation reports", status: "active", addedBy: "Nora Ellis", createdAt: "2026-06-08T09:35:00Z" },
  { domain: "quickchat.example", reason: "Repeated off-platform payment requests", status: "active", addedBy: "Jon Price", createdAt: "2026-06-07T23:40:00Z" },
  { domain: "oldpickup.example", reason: "Legacy pickup link, no current abuse", status: "disabled", addedBy: "Amal Benali", createdAt: "2026-05-29T13:05:00Z" },
];

export const auditEvents: SafetyAuditEvent[] = [
  { id: "AUD-5018", adminUserId: 12, actionType: "flagged_chat_context_opened", flagId: "CSF-1028", conversationId: "CNV-81241", targetUserId: 218, reason: "Review critical payment-link flag", metadata: "Limited seven-message window opened", createdAt: "2026-06-08T09:30:00Z" },
  { id: "AUD-5017", adminUserId: 15, actionType: "flagged_chat_context_opened", flagId: "CSF-1027", conversationId: "CNV-81209", targetUserId: 77, reason: "Review user harassment report", metadata: "Limited seven-message window opened", createdAt: "2026-06-08T09:08:00Z" },
  { id: "AUD-5016", adminUserId: 12, actionType: "flag_dismissed", flagId: "CSF-1025", conversationId: "CNV-81144", targetUserId: 129, reason: "Single phone mention for pickup coordination", metadata: "No repeated pattern found", createdAt: "2026-06-08T06:39:00Z" },
  { id: "AUD-5015", adminUserId: 22, actionType: "sender_suspended", flagId: "CSF-1024", conversationId: "CNV-81097", targetUserId: 411, reason: "Repeated payment links across conversations", metadata: "24 hour temporary suspension", createdAt: "2026-06-08T02:13:00Z" },
];

export function getChatSafetyFlag(flagId: string) {
  return chatSafetyFlags.find((flag) => flag.id === flagId);
}

export function getLimitedConversation(flagId: string) {
  return conversationMessages.filter((message) => message.flagId === flagId);
}

export function labelize(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
