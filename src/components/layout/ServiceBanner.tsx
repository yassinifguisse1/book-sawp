export function ServiceBanner() {
  const maintenance = process.env.NEXT_PUBLIC_MAINTENANCE_BANNER;
  const degraded = process.env.NEXT_PUBLIC_DEGRADED_BANNER;
  const message = maintenance || degraded;
  if (!message) return null;

  return (
    <div className={`px-4 py-2 text-center text-sm font-medium ${maintenance ? "bg-[#FFF3E0] text-[#8D4E00]" : "bg-[#e6f3f4] text-[#005f66]"}`}>
      {message}
    </div>
  );
}
