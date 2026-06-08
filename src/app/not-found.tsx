import Link from "next/link";
import { BookOpen } from "lucide-react";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-white px-4">
      <div className="text-center">
        <BookOpen className="mx-auto mb-4 h-14 w-14 text-[#007782]" />
        <h1 className="text-2xl font-bold text-[#111]">Page not found</h1>
        <p className="mt-2 text-sm text-[#666]">
          The page you requested does not exist.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex rounded-md bg-[#007782] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#005f66]"
        >
          Back to BookSwap
        </Link>
      </div>
    </main>
  );
}
