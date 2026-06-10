import type { ReactNode } from "react";
import Link from "next/link";
import { BookOpen, CheckCircle2, MessageCircle, RefreshCw, ShieldCheck } from "lucide-react";
import Image from "next/image";

type AuthPageProps = {
  mode: "sign-in" | "sign-up";
  children: ReactNode;
};

const authHighlights = [
  {
    icon: RefreshCw,
    title: "Swap with context",
    text: "Offer one of your available books and keep every request tied to the listing.",
  },
  {
    icon: MessageCircle,
    title: "Message before meeting",
    text: "Ask about condition, edition, delivery, pickup, and ISBN details in one place.",
  },
  {
    icon: ShieldCheck,
    title: "Build reader trust",
    text: "Profiles, reviews, and clear transaction statuses help both sides decide confidently.",
  },
];

export function AuthPage({ mode, children }: AuthPageProps) {
  const isSignIn = mode === "sign-in";

  return (
    <main className="min-h-screen bg-white">
      <div className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative hidden overflow-hidden bg-[#11353A] text-white lg:block">
          <Image
            src="/images/hero.jpg"
            width={1000}
            height={1000}
            alt="Books ready to swap through BookSwap"
            className="absolute inset-0 h-full w-full object-cover opacity-55"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-[#071D21]/95 via-[#11353A]/78 to-[#007782]/55" />
          <div className="relative flex min-h-screen flex-col justify-between p-10 xl:p-14">
            <Link href="/" className="inline-flex w-fit items-center gap-2">
              <BookOpen className="h-7 w-7 text-[#73D7CF]" />
              <span className="text-xl font-bold">BookSwap</span>
            </Link>

            <div className="max-w-xl">
              <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/12 px-3 py-1.5 text-sm font-semibold text-[#B8F1EC]">
                <CheckCircle2 className="h-4 w-4" />
                Reader marketplace access
              </p>
              <h1 className="text-5xl font-bold tracking-normal">
                {isSignIn ? "Welcome back to your next read." : "Join the community moving books forward."}
              </h1>
              <p className="mt-5 text-lg leading-8 text-white/78">
                {isSignIn
                  ? "Sign in to manage listings, answer requests, save books, and continue conversations."
                  : "Create your account to swap, give away, or sell books with local readers."}
              </p>
            </div>

            <div className="grid gap-3">
              {authHighlights.map(({ icon: Icon, title, text }) => (
                <div key={title} className="rounded-lg bg-white/10 p-4 backdrop-blur-sm">
                  <div className="flex gap-3">
                    <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#73D7CF]/18 text-[#73D7CF]">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div>
                      <h2 className="text-sm font-bold">{title}</h2>
                      <p className="mt-1 text-sm leading-6 text-white/72">{text}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="flex min-h-screen flex-col bg-[#F7F7F7]">
          <div className="flex items-center justify-between px-5 py-5 md:px-8">
            <Link href="/" className="inline-flex items-center gap-2 text-[#007782]">
              <BookOpen className="h-6 w-6" />
              <span className="font-bold">BookSwap</span>
            </Link>
            <Link
              href={isSignIn ? "/sign-up" : "/sign-in"}
              className="rounded-md border border-[#C7D0D4] bg-white px-3 py-2 text-sm font-bold text-[#111] transition-colors hover:border-[#007782] hover:text-[#007782]"
            >
              {isSignIn ? "Create account" : "Sign in"}
            </Link>
          </div>

          <div className="flex flex-1 items-center justify-center px-4 py-8">
            <div className="w-full max-w-[460px]">
              <div className="mb-6 lg:hidden">
                <p className="text-sm font-bold uppercase tracking-normal text-[#007782]">
                  BookSwap account
                </p>
                <h1 className="mt-2 text-3xl font-bold text-[#111]">
                  {isSignIn ? "Welcome back." : "Start swapping books."}
                </h1>
                <p className="mt-2 text-sm leading-6 text-[#666]">
                  {isSignIn
                    ? "Manage listings, requests, favorites, and messages."
                    : "Create your account to list, request, and message readers."}
                </p>
              </div>
              {children}
              <p className="mt-5 text-center text-xs leading-5 text-[#777]">
                By continuing, you agree to use BookSwap for real book listings and respectful reader-to-reader exchanges.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
