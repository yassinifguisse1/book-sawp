import type { LegalPageContent } from "@/components/pages/LegalPage";

const lastUpdated = "June 8, 2026";

export const privacyCenterContent: LegalPageContent = {
  eyebrow: "Privacy Center",
  title: "Your privacy controls for BookSwap.",
  description:
    "BookSwap uses account, listing, message, and trust information to run a safe community marketplace for readers. This page explains what we collect, why we use it, and how you can manage it.",
  lastUpdated,
  highlights: [
    "We use your data to operate book listings, requests, messages, favorites, reviews, and safety checks.",
    "Clerk handles authentication identifiers; BookSwap keeps local numeric user IDs for marketplace relationships.",
    "Verified phone numbers are stored locally only as keyed HMAC values, not raw phone numbers.",
  ],
  sections: [
    {
      title: "Information we collect",
      body: [
        "We collect the account details you provide, such as your display name, profile information, verified email status, and marketplace preferences. We also store listing details, including book titles, authors, condition, language, genre, delivery options, transaction mode, prices for sale listings, photos, descriptions, and availability.",
        "When you use marketplace features, we process favorites, conversations, transaction requests, transaction status history, reviews, reports, moderation signals, and notification preferences. We may also collect basic technical data such as device, browser, IP address, log events, and security telemetry.",
      ],
    },
    {
      title: "How we use information",
      body: [
        "We use information to show book listings, support swaps, giveaways, and sales, route messages, enforce listing availability, prevent self-requests, show trust signals, and maintain transaction history.",
        "We also use information to detect abuse, reduce fraud, troubleshoot service issues, improve browsing and search, send important marketplace notifications, and satisfy legal, security, accounting, or compliance obligations.",
      ],
    },
    {
      title: "Authentication and trust",
      body: [
        "BookSwap uses Clerk for authentication and user menus. Clerk user IDs are external authentication identifiers, while BookSwap preserves local numeric user IDs for database relationships.",
        "For marketplace mutations, BookSwap may require verified email and phone trust checks. Raw verified phone numbers should not be stored in the application database; the local record stores only a keyed HMAC of the verified E.164 phone number.",
      ],
    },
    {
      title: "Sharing and service providers",
      body: [
        "We share information with service providers that help operate the product, such as authentication, hosting, database, search, cache, realtime messaging, email, file storage, analytics, error monitoring, and payment or billing providers when those features are used.",
        "Other users can see marketplace information you intentionally publish, such as listings, profile details, ratings, reviews, and transaction-relevant messages. We do not sell your personal information.",
      ],
    },
    {
      title: "Your choices",
      body: [
        "You can update profile details, manage listings, remove favorites, adjust notification preferences when available, and request support with account access, correction, export, deletion, or privacy questions.",
        "Deleting marketplace data may be limited where records are needed for transaction history, safety, fraud prevention, dispute handling, tax, accounting, or legal obligations. BookSwap uses soft deletion for user and listing removal unless a retention-aware cleanup process applies.",
      ],
    },
    {
      title: "Security and retention",
      body: [
        "We use reasonable technical and organizational controls to protect account and marketplace data. No internet service can guarantee absolute security, so you should avoid sending payment card details, passwords, or unrelated sensitive information in listing messages.",
        "We keep information for as long as needed to provide BookSwap, maintain marketplace records, protect users, comply with obligations, and resolve disputes. Retention periods vary by data type and legal context.",
      ],
    },
  ],
};

export const cookiePolicyContent: LegalPageContent = {
  eyebrow: "Cookie Policy",
  title: "How BookSwap uses cookies and similar technologies.",
  description:
    "Cookies help BookSwap keep you signed in, remember preferences, protect the marketplace, measure reliability, and understand how readers use listings and request flows.",
  lastUpdated,
  highlights: [
    "Required cookies support sign-in, security, routing, and core marketplace functions.",
    "Preference cookies may remember settings such as location and browsing choices.",
    "You can manage cookies in your browser, but blocking required cookies may break sign-in or requests.",
  ],
  sections: [
    {
      title: "What cookies are",
      body: [
        "Cookies are small files stored on your device. Similar technologies include local storage, pixels, SDKs, and server logs. These technologies help websites remember information and understand how services are used.",
        "BookSwap and our providers may use these technologies when you browse listings, sign in, favorite books, send messages, submit transaction requests, or manage your account.",
      ],
    },
    {
      title: "Required cookies",
      body: [
        "Required cookies support authentication, session security, fraud prevention, load balancing, error handling, and the basic operation of App Router pages and API routes.",
        "Because BookSwap uses Clerk for authentication, Clerk may set cookies or similar storage needed to keep you signed in and protect your account. Disabling these cookies can prevent login, user menus, listing creation, messages, and requests from working.",
      ],
    },
    {
      title: "Preference cookies",
      body: [
        "Preference cookies and local storage may remember choices such as location preference prompts, browsing filters, sort choices, display settings, or notification preferences when those controls are available.",
        "These technologies make BookSwap feel more familiar between visits, but they are not used to merge swap, giveaway, and sale flows into a generic checkout action.",
      ],
    },
    {
      title: "Analytics and performance",
      body: [
        "Analytics and performance technologies help us understand aggregate product usage, page reliability, search quality, conversion through listing and request flows, and application errors.",
        "These tools may collect technical data such as page URL, browser details, approximate location from IP address, timestamps, and interaction events. We use this information to improve BookSwap and monitor service health.",
      ],
    },
    {
      title: "Advertising",
      body: [
        "BookSwap is not designed around behavioral advertising. If advertising or campaign measurement is added later, this policy should be updated before those cookies are used.",
        "We do not use cookies to imply escrow, buyer protection, refunds, or delivery guarantees for external sale payments.",
      ],
    },
    {
      title: "Managing cookies",
      body: [
        "Most browsers let you block, delete, or limit cookies. Your choices may need to be repeated across browsers and devices.",
        "If you block required cookies, some BookSwap features may fail, including sign-in, profile access, listing creation, favorites, conversations, notifications, and transaction requests.",
      ],
    },
  ],
};

export const termsContent: LegalPageContent = {
  eyebrow: "Terms & Conditions",
  title: "The rules for using BookSwap.",
  description:
    "These terms explain the responsibilities that keep BookSwap useful and trustworthy for readers who swap, give away, and sell books in the community marketplace.",
  lastUpdated,
  highlights: [
    "Every listing must be one explicit mode: swap, giveaway, or sale.",
    "Listings must describe real books accurately, including condition and delivery options.",
    "V1 external sale payments are visibly unprotected; BookSwap does not provide escrow or buyer protection.",
  ],
  sections: [
    {
      title: "Using BookSwap",
      body: [
        "BookSwap is a community marketplace for books. You may browse listings, create and manage listings, favorite books, view profiles, exchange messages, and send transaction requests when you meet the applicable account and trust requirements.",
        "You are responsible for keeping your account secure, using truthful profile information, and complying with applicable laws. You must not misuse BookSwap, interfere with the service, scrape at abusive rates, or attempt to bypass trust, moderation, or availability rules.",
      ],
    },
    {
      title: "Listings and transaction modes",
      body: [
        "Each book listing must have exactly one transaction mode: swap, giveaway, or sale. Swap means book-for-book exchange, giveaway means a free-book request, and sale means a listed-price purchase flow.",
        "You must provide accurate book details, including cover information when available, title, author, condition, genre, description, language, page count, delivery options, owner details, and transaction mode. Sale prices must be honest and may be stored in integer minor units with an ISO 4217 currency.",
      ],
    },
    {
      title: "Requests and availability",
      body: [
        "You may not request your own listing. Only available books can receive new requests. A book involved in an accepted or completed transaction must not remain available for conflicting requests.",
        "For swaps, the requester should choose one of their available books to offer. For giveaways, the requester sends a free-book request. For sales, the requester follows the purchase flow shown by BookSwap.",
      ],
    },
    {
      title: "Payments and delivery",
      body: [
        "BookSwap may support sale listings, but V1 external sale payments are unprotected. BookSwap does not provide escrow, refunds, buyer protection, seller protection, delivery guarantees, or payment reversal guarantees unless a future policy explicitly says otherwise.",
        "Users are responsible for agreeing on delivery or pickup details, complying with postal or local rules, and avoiding unsafe payment or shipping arrangements.",
      ],
    },
    {
      title: "Reviews and trust signals",
      body: [
        "Profiles, ratings, reviews, active listings, condition labels, and completed transaction history can help users make better decisions. Reviews should be tied to real completed transactions when that workflow is implemented.",
        "You must not manipulate reviews, create fake transactions, misrepresent book condition, impersonate another person, or use messages to harass, spam, scam, or pressure other users.",
      ],
    },
    {
      title: "Content and moderation",
      body: [
        "You are responsible for the content you post, including listing descriptions, images, messages, profile text, and reviews. Do not post illegal, infringing, deceptive, hateful, explicit, or unsafe content.",
        "BookSwap may remove content, limit marketplace actions, suspend accounts, retain records for safety, and report activity when needed to protect users, comply with law, or enforce these terms.",
      ],
    },
    {
      title: "Changes and termination",
      body: [
        "BookSwap may change features, policies, and these terms as the marketplace evolves. Continued use after an update means you accept the updated terms.",
        "You may stop using BookSwap at any time. Account or listing deletion may use soft deletion and may be limited by retention needs for transaction history, safety, fraud prevention, accounting, disputes, or legal obligations.",
      ],
    },
  ],
};
