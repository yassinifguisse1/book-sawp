import Link from "next/link";
import {
  BadgeCheck,
  BookMarked,
  BookOpen,
  CheckCircle2,
  Handshake,
  Heart,
  MessageCircle,
  PackageCheck,
  Search,
  ShieldCheck,
  Sparkles,
  Tag,
} from "lucide-react";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";

const listingSteps = [
  {
    icon: BookOpen,
    title: "List your book",
    text: "Add the cover, title, author, condition, language, genre, description, and delivery options so readers know exactly what is available.",
  },
  {
    icon: Tag,
    title: "Choose one mode",
    text: "Every listing is clearly marked as swap, giveaway, or sale. The request flow changes to match the mode you picked.",
  },
  {
    icon: MessageCircle,
    title: "Reply to readers",
    text: "Answer questions, confirm details, and keep the conversation tied to the listing before you accept a request.",
  },
];

const requestSteps = [
  {
    icon: Search,
    title: "Find the right copy",
    text: "Browse by genre, search by title or author, filter by transaction mode, and check condition details before requesting.",
  },
  {
    icon: Heart,
    title: "Save or request",
    text: "Favorite books for later or start a request when you are ready. Owners cannot request their own listings.",
  },
  {
    icon: PackageCheck,
    title: "Complete the handoff",
    text: "Once accepted, arrange the agreed delivery or meetup, then mark the transaction complete when the book changes hands.",
  },
];

const transactionModes = [
  {
    label: "Swap",
    title: "Trade book for book",
    text: "Offer one of your available books in return. The owner reviews your offered book before accepting or declining.",
    href: "/?transactionType=swap",
    accent: "bg-[#E6F3F4] text-[#007782]",
  },
  {
    label: "Giveaway",
    title: "Request a free book",
    text: "Send a free-book request. No payment and no book are required in return, but clear pickup or delivery details still matter.",
    href: "/?transactionType=giveaway",
    accent: "bg-[#EEF7EA] text-[#2E7D32]",
  },
  {
    label: "Sale",
    title: "Buy at the listed price",
    text: "Follow the purchase flow for a priced listing. BookSwap shows the listing details clearly but does not promise escrow, refunds, or delivery guarantees.",
    href: "/?transactionType=sale",
    accent: "bg-[#FFF3D9] text-[#8A5A00]",
  },
];

const trustSignals = [
  "Check profile details, reviews, and active listings.",
  "Read condition notes and look closely at cover photos.",
  "Keep messages and request decisions inside BookSwap.",
  "Use clear status labels: sent, accepted, declined, canceled, and completed.",
];

function StepCard({
  icon: Icon,
  title,
  text,
  index,
}: {
  icon: typeof BookOpen;
  title: string;
  text: string;
  index: number;
}) {
  return (
    <article className="rounded-lg border border-[#D7DDE0] bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-md bg-[#E6F3F4] text-[#007782]">
          <Icon className="h-5 w-5" />
        </span>
        <span className="text-sm font-bold text-[#A3A3A3]">0{index + 1}</span>
      </div>
      <h3 className="text-lg font-bold text-[#111]">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[#666]">{text}</p>
    </article>
  );
}

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <main>
        <section className="relative overflow-hidden border-b border-[#E0E0E0] bg-[#F7F7F7]">
          <div className="mx-auto grid max-w-[1200px] gap-8 px-4 py-12 md:grid-cols-[1.05fr_0.95fr] md:items-center md:py-16">
            <div>
              <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-[#007782] shadow-sm">
                <Sparkles className="h-4 w-4" />
                A reader-first marketplace
              </p>
              <h1 className="max-w-2xl text-4xl font-bold tracking-normal text-[#111] md:text-5xl">
                How BookSwap works
              </h1>
              <p className="mt-4 max-w-xl text-base leading-7 text-[#555] md:text-lg">
                List books you no longer need, discover your next read, and use the right request flow for swaps, giveaways, and sales.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/list"
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-[#007782] px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-[#005f66]"
                >
                  <BookMarked className="h-4 w-4" />
                  List a book
                </Link>
                <Link
                  href="/"
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-[#C7D0D4] bg-white px-5 py-3 text-sm font-bold text-[#111] transition-colors hover:border-[#007782] hover:text-[#007782]"
                >
                  <Search className="h-4 w-4" />
                  Browse books
                </Link>
              </div>
            </div>

            <div className="relative min-h-[320px] overflow-hidden rounded-lg bg-[#11353A] shadow-xl">
              <img
                src="/images/hero.jpg"
                alt="Books arranged for swapping in the BookSwap community"
                className="absolute inset-0 h-full w-full object-cover opacity-70"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#071D21]/90 via-[#11353A]/30 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
                <div className="grid grid-cols-3 gap-2">
                  {["Swap", "Give away", "Sell"].map((mode) => (
                    <div key={mode} className="rounded-md bg-white/92 p-3 text-[#111] shadow-sm">
                      <p className="text-xs font-bold uppercase tracking-normal text-[#007782]">
                        {mode}
                      </p>
                      <p className="mt-1 text-sm font-semibold">One clear flow</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1200px] px-4 py-12 md:py-16">
          <div className="mb-7 max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-normal text-[#007782]">
              For owners
            </p>
            <h2 className="mt-2 text-3xl font-bold text-[#111]">Turn finished books into new possibilities</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {listingSteps.map((step, index) => (
              <StepCard key={step.title} {...step} index={index} />
            ))}
          </div>
        </section>

        <section className="bg-[#F7F7F7]">
          <div className="mx-auto max-w-[1200px] px-4 py-12 md:py-16">
            <div className="mb-7 max-w-2xl">
              <p className="text-sm font-bold uppercase tracking-normal text-[#007782]">
                Three ways to exchange
              </p>
              <h2 className="mt-2 text-3xl font-bold text-[#111]">Pick the transaction mode that fits the book</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {transactionModes.map((mode) => (
                <article key={mode.label} className="rounded-lg border border-[#D7DDE0] bg-white p-5 shadow-sm">
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${mode.accent}`}>
                    {mode.label}
                  </span>
                  <h3 className="mt-5 text-lg font-bold text-[#111]">{mode.title}</h3>
                  <p className="mt-2 min-h-24 text-sm leading-6 text-[#666]">{mode.text}</p>
                  <Link
                    href={mode.href}
                    className="mt-5 inline-flex text-sm font-bold text-[#007782] hover:text-[#005f66]"
                  >
                    Browse {mode.label.toLowerCase()} books
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-[1200px] gap-10 px-4 py-12 md:grid-cols-[0.95fr_1.05fr] md:items-start md:py-16">
          <div>
            <p className="text-sm font-bold uppercase tracking-normal text-[#007782]">
              For readers
            </p>
            <h2 className="mt-2 text-3xl font-bold text-[#111]">Request with the details in front of you</h2>
            <p className="mt-4 text-base leading-7 text-[#666]">
              BookSwap keeps the important book details, owner profile, conversation, and transaction status connected so both sides know what is happening next.
            </p>
          </div>
          <div className="grid gap-4">
            {requestSteps.map((step, index) => (
              <StepCard key={step.title} {...step} index={index} />
            ))}
          </div>
        </section>

        <section className="border-y border-[#E0E0E0] bg-[#11353A] text-white">
          <div className="mx-auto grid max-w-[1200px] gap-8 px-4 py-12 md:grid-cols-[0.8fr_1.2fr] md:items-center md:py-14">
            <div>
              <ShieldCheck className="h-10 w-10 text-[#73D7CF]" />
              <h2 className="mt-4 text-3xl font-bold">Trust signals before every request</h2>
              <p className="mt-3 text-sm leading-6 text-white/75">
                A good book exchange starts with clear information. BookSwap surfaces the practical details readers need before they commit.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {trustSignals.map((signal) => (
                <div key={signal} className="flex gap-3 rounded-lg bg-white/10 p-4">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#73D7CF]" />
                  <p className="text-sm leading-6 text-white/85">{signal}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1200px] px-4 py-12 md:py-16">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-[#D7DDE0] p-5">
              <Handshake className="h-8 w-8 text-[#007782]" />
              <h3 className="mt-4 text-lg font-bold text-[#111]">Accept only when it fits</h3>
              <p className="mt-2 text-sm leading-6 text-[#666]">
                Owners can accept, decline, or keep discussing a request. Available books should not stay open to conflicting accepted requests.
              </p>
            </div>
            <div className="rounded-lg border border-[#D7DDE0] p-5">
              <BadgeCheck className="h-8 w-8 text-[#007782]" />
              <h3 className="mt-4 text-lg font-bold text-[#111]">Complete real exchanges</h3>
              <p className="mt-2 text-sm leading-6 text-[#666]">
                Transaction history gives swaps, giveaways, and sales a clear record after both sides finish the handoff.
              </p>
            </div>
            <div className="rounded-lg border border-[#D7DDE0] p-5">
              <MessageCircle className="h-8 w-8 text-[#007782]" />
              <h3 className="mt-4 text-lg font-bold text-[#111]">Keep it book-specific</h3>
              <p className="mt-2 text-sm leading-6 text-[#666]">
                Ask about edition, notes, wear, pickup, delivery, or ISBN details before making a final decision.
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1200px] px-4 pb-4">
          <div className="rounded-lg bg-[#E6F3F4] p-6 md:flex md:items-center md:justify-between md:p-8">
            <div>
              <h2 className="text-2xl font-bold text-[#111]">Ready to move a story forward?</h2>
              <p className="mt-2 text-sm leading-6 text-[#555]">
                Start by listing one book or browsing what readers nearby are sharing.
              </p>
            </div>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row md:mt-0">
              <Link
                href="/list"
                className="inline-flex items-center justify-center rounded-md bg-[#007782] px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-[#005f66]"
              >
                List a book
              </Link>
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-md bg-white px-5 py-3 text-sm font-bold text-[#111] transition-colors hover:text-[#007782]"
              >
                Browse books
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
