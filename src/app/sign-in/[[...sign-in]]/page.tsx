import { SignIn } from "@clerk/nextjs";

export default function Page() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#f7f7f7] px-4 py-12">
      <SignIn />
    </main>
  );
}
