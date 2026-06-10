import Link from "next/link";
import { ArrowLeft, CheckCircle2, Clock, Mail, ShieldCheck } from "lucide-react";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";

export type LegalSection = {
  title: string;
  body: string[];
};

export type LegalPageContent = {
  eyebrow: string;
  title: string;
  description: string;
  lastUpdated: string;
  highlights: string[];
  sections: LegalSection[];
};

type LegalPageProps = {
  content: LegalPageContent;
  supportEmail?: string | null;
};

export function LegalPage({ content, supportEmail }: LegalPageProps) {
  const mailtoHref = supportEmail ? `mailto:${supportEmail}` : null;
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <main>
        <section className="border-b border-[#E0E0E0] bg-[#F7F7F7]">
          <div className="mx-auto grid max-w-[1200px] gap-8 px-4 py-10 md:grid-cols-[minmax(0,1fr)_340px] md:py-14">
            <div>
              <Link
                href="/"
                className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-[#007782] transition-colors hover:text-[#005f66]"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to marketplace
              </Link>
              <p className="mb-3 text-sm font-bold uppercase tracking-[0.16em] text-[#007782]">
                {content.eyebrow}
              </p>
              <h1 className="max-w-3xl text-4xl font-bold leading-tight text-[#111] md:text-5xl">
                {content.title}
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-[#555] md:text-lg">
                {content.description}
              </p>
            </div>

            <aside className="self-end rounded-lg border border-[#D7DDE0] bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3 border-b border-[#E0E0E0] pb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#E8F6F7] text-[#007782]">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#111]">BookSwap policy</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-[#666]">
                    <Clock className="h-3.5 w-3.5" />
                    Updated {content.lastUpdated}
                  </p>
                </div>
              </div>
              <ul className="mt-4 space-y-3">
                {content.highlights.map((highlight) => (
                  <li key={highlight} className="flex gap-2 text-sm leading-6 text-[#444]">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#007782]" />
                    <span>{highlight}</span>
                  </li>
                ))}
              </ul>
            </aside>
          </div>
        </section>

        <section className="mx-auto grid max-w-[1200px] gap-8 px-4 py-10 lg:grid-cols-[260px_minmax(0,1fr)] lg:py-14">
          <nav
            aria-label={`${content.title} sections`}
            className="hidden h-max rounded-lg border border-[#E0E0E0] bg-white p-4 lg:block"
          >
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-[#777]">
              On this page
            </p>
            <ol className="space-y-2">
              {content.sections.map((section) => (
                <li key={section.title}>
                  <a
                    href={`#${section.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                    className="block rounded-md px-3 py-2 text-sm text-[#555] transition-colors hover:bg-[#F7F7F7] hover:text-[#007782]"
                  >
                    {section.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <article className="space-y-8">
            {content.sections.map((section) => (
              <section
                key={section.title}
                id={section.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}
                className="scroll-mt-32 border-b border-[#E0E0E0] pb-8 last:border-b-0"
              >
                <h2 className="text-2xl font-bold text-[#111]">{section.title}</h2>
                <div className="mt-4 space-y-4">
                  {section.body.map((paragraph) => (
                    <p key={paragraph} className="text-base leading-7 text-[#555]">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </section>
            ))}

            <section className="rounded-lg border border-[#D7DDE0] bg-[#F7F7F7] p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-bold text-[#111]">Questions about this page?</h2>
                  <p className="mt-1 text-sm leading-6 text-[#666]">
                    Contact BookSwap support for privacy, account, or marketplace policy requests.
                  </p>
                </div>
                {mailtoHref ? (
                  <a
                    href={mailtoHref}
                    className="inline-flex items-center justify-center gap-2 rounded-md bg-[#007782] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#005f66]"
                  >
                    <Mail className="h-4 w-4" />
                    Contact support
                  </a>
                ) : (
                  <p className="text-sm font-medium text-[#666]">
                    Support email is not configured for this environment.
                  </p>
                )}
              </div>
            </section>
          </article>
        </section>
      </main>

      <Footer />
    </div>
  );
}
