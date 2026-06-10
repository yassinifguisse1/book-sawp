import { Construction } from "lucide-react";

export function AdminPlanned({
  title,
  description,
  items,
}: {
  title: string;
  description: string;
  items: string[];
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#111]">{title}</h1>
        <p className="mt-1 text-sm text-[#666]">{description}</p>
      </div>
      <div className="rounded-xl border border-dashed border-[#C9D2D6] bg-white p-6">
        <div className="flex items-center gap-2 text-[#E65100]">
          <Construction className="h-5 w-5" />
          <span className="text-sm font-semibold">Planned for Phase 1 build-out</span>
        </div>
        <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-[#444]">
          {items.map((item , index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
