"use client";

import { ShieldCheck, MapPin, Truck, Users } from "lucide-react";

const trustItems = [
  {
    icon: ShieldCheck,
    label: "Swap safely",
    description: "Verified profiles & reviews",
  },
  {
    icon: MapPin,
    label: "Meet locally",
    description: "Pick up books nearby",
  },
  {
    icon: Truck,
    label: "Ship anywhere",
    description: "Domestic & international",
  },
  {
    icon: Users,
    label: "Join the community",
    description: "Share stories with readers",
  },
];

export function TrustStrip() {
  return (
    <section className="">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-6 px-4 py-8 sm:py-6">
        {trustItems.map((item) => (
          <div key={item.label} className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#007782]/10">
              <item.icon className="h-5 w-5 text-[#007782]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#2C2C2C]">{item.label}</p>
              <p className="text-xs text-[#666]">{item.description}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
