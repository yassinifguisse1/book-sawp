"use client";

import { useState } from "react";
import { Check, Loader2, Plus, X } from "lucide-react";

import { trpc } from "@/providers/app-providers";
import { COUNTRY_NAMES, countryName } from "@/lib/location-format";

const tabs = [
  { id: "categories", label: "Categories" },
  { id: "markets", label: "Markets" },
  { id: "locations", label: "Locations" },
  { id: "reference", label: "Education & school" },
] as const;

type TabId = (typeof tabs)[number]["id"];

const statusBadge: Record<string, string> = {
  active: "bg-[#E8F5E9] text-[#2E7D32]",
  draft: "bg-[#FFF8E1] text-[#8D4E00]",
  inactive: "bg-[#F2F3F5] text-[#555]",
};

const countryOptions = Object.entries(COUNTRY_NAMES)
  .map(([code, name]) => ({ code, name }))
  .sort((a, b) => a.name.localeCompare(b.name));

export function AdminTaxonomyPage() {
  const [tab, setTab] = useState<TabId>("categories");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#111]">Taxonomy & configuration</h1>
        <p className="mt-1 text-sm text-[#666]">
          Manage the controlled vocabularies and market settings that power discovery.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-[#E0E0E0]">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-semibold transition-colors ${
              tab === item.id
                ? "border-[#007782] text-[#007782]"
                : "border-transparent text-[#666] hover:text-[#111]"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "categories" ? <CategoriesTab /> : null}
      {tab === "markets" ? <MarketsTab /> : null}
      {tab === "locations" ? <LocationsTab /> : null}
      {tab === "reference" ? <ReferenceTab /> : null}
    </div>
  );
}

function CategoriesTab() {
  const utils = trpc.useUtils();
  const categories = trpc.admin.taxonomy.categories.useQuery();
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState<string>("");

  const invalidate = () => utils.admin.taxonomy.categories.invalidate();
  const createCategory = trpc.admin.taxonomy.createCategory.useMutation({
    onSuccess: () => {
      setName("");
      setParentId("");
      invalidate();
    },
  });
  const setStatus = trpc.admin.taxonomy.setCategoryStatus.useMutation({ onSuccess: invalidate });
  const deleteCategory = trpc.admin.taxonomy.deleteCategory.useMutation({ onSuccess: invalidate });

  const flat = categories.data?.flat ?? [];
  const summary = categories.data?.summary;
  const actionError =
    createCategory.error?.message ?? setStatus.error?.message ?? deleteCategory.error?.message;

  return (
    <div className="space-y-4">
      {summary ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SummaryCard label="Total" value={summary.total} />
          <SummaryCard label="Active" value={summary.active} />
          <SummaryCard label="Draft" value={summary.draft} />
          <SummaryCard label="Inactive" value={summary.inactive} />
        </div>
      ) : null}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!name.trim()) return;
          const parent =
            typeof parentId === "string" &&
            parentId.trim() !== "" &&
            !Number.isNaN(Number(parentId)) &&
            Number(parentId) > 0
              ? Number(parentId)
              : null;
          createCategory.mutate({
            name: name.trim(),
            parentId: parent,
            status: "active",
          });
        }}
        className="flex flex-wrap items-end gap-3 rounded-lg border border-[#E0E0E0] bg-[#FAFAFA] p-4"
      >
        <label className="flex-1 text-xs font-semibold uppercase tracking-wide text-[#666]">
          New category
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Category name"
            className="mt-1 block w-full rounded-md border border-[#D6DADF] bg-white px-3 py-2 text-sm normal-case tracking-normal text-[#111]"
          />
        </label>
        <label className="text-xs font-semibold uppercase tracking-wide text-[#666]">
          Parent
          <select
            value={parentId}
            onChange={(event) => setParentId(event.target.value)}
            className="mt-1 block rounded-md border border-[#D6DADF] bg-white px-3 py-2 text-sm normal-case tracking-normal text-[#111]"
          >
            <option value="">Top level</option>
            {flat
              .filter((category) => category.depth === 0)
              .map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
          </select>
        </label>
        <button
          type="submit"
          disabled={createCategory.isPending || !name.trim()}
          className="flex items-center gap-1.5 rounded-md bg-[#007782] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#005f66] disabled:opacity-50"
        >
          <Plus className="h-4 w-4" /> Add
        </button>
      </form>

      {actionError ? <p className="text-sm text-[#B71C1C]">{actionError}</p> : null}

      <div className="overflow-hidden rounded-lg border border-[#E0E0E0]">
        {categories.isLoading ? (
          <LoadingRow />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-[#FAFAFA] text-left text-xs uppercase tracking-wide text-[#666]">
              <tr>
                <th className="px-4 py-2">Category</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Listings</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {flat.map((category) => (
                <tr key={category.id} className="border-t border-[#EEE]">
                  <td className="px-4 py-2">
                    <span style={{ paddingLeft: category.depth * 16 }} className="text-[#111]">
                      {category.name}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        statusBadge[category.status] ?? statusBadge.inactive
                      }`}
                    >
                      {category.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-[#666]">{category.listingCount}</td>
                  <td className="px-4 py-2">
                    <div className="flex justify-end gap-2">
                      {category.status === "active" ? (
                        <button
                          type="button"
                          onClick={() =>
                            setStatus.mutate({ categoryId: category.id, status: "inactive" })
                          }
                          className="rounded-md border border-[#D6DADF] px-2 py-1 text-xs font-medium text-[#555] hover:bg-[#F7F7F7]"
                        >
                          Deactivate
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            setStatus.mutate({ categoryId: category.id, status: "active" })
                          }
                          className="rounded-md border border-[#D6DADF] px-2 py-1 text-xs font-medium text-[#007782] hover:bg-[#F2FAFB]"
                        >
                          Activate
                        </button>
                      )}
                      {category.listingCount === 0 ? (
                        <button
                          type="button"
                          onClick={() => deleteCategory.mutate({ categoryId: category.id })}
                          className="rounded-md border border-[#F1C3C3] px-2 py-1 text-xs font-medium text-[#B71C1C] hover:bg-[#FFF5F5]"
                        >
                          Delete
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function MarketsTab() {
  const utils = trpc.useUtils();
  const markets = trpc.admin.markets.list.useQuery();
  const invalidate = () => utils.admin.markets.list.invalidate();

  const upsert = trpc.admin.markets.upsert.useMutation({ onSuccess: invalidate });
  const setEnabled = trpc.admin.markets.setEnabled.useMutation({ onSuccess: invalidate });

  const [countryCode, setCountryCode] = useState("US");
  const [currency, setCurrency] = useState("USD");
  const [distanceUnit, setDistanceUnit] = useState<"km" | "mi">("mi");

  const flagFields = [
    { field: "enabledForBrowsing", label: "Browsing" },
    { field: "enabledForListings", label: "Listings" },
    { field: "enabledForManualShipping", label: "Shipping" },
    { field: "enabledForProtectedPayments", label: "Payments" },
  ] as const;

  return (
    <div className="space-y-4">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          upsert.mutate({
            countryCode,
            defaultCurrencyCode: currency.toUpperCase(),
            distanceUnit,
          });
        }}
        className="flex flex-wrap items-end gap-3 rounded-lg border border-[#E0E0E0] bg-[#FAFAFA] p-4"
      >
        <label className="text-xs font-semibold uppercase tracking-wide text-[#666]">
          Country
          <select
            value={countryCode}
            onChange={(event) => setCountryCode(event.target.value)}
            className="mt-1 block rounded-md border border-[#D6DADF] bg-white px-3 py-2 text-sm normal-case tracking-normal text-[#111]"
          >
            {countryOptions.map((country) => (
              <option key={country.code} value={country.code}>
                {country.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold uppercase tracking-wide text-[#666]">
          Currency
          <input
            value={currency}
            onChange={(event) => setCurrency(event.target.value.toUpperCase())}
            maxLength={3}
            className="mt-1 block w-20 rounded-md border border-[#D6DADF] bg-white px-3 py-2 text-sm uppercase tracking-normal text-[#111]"
          />
        </label>
        <label className="text-xs font-semibold uppercase tracking-wide text-[#666]">
          Distance unit
          <select
            value={distanceUnit}
            onChange={(event) => setDistanceUnit(event.target.value as "km" | "mi")}
            className="mt-1 block rounded-md border border-[#D6DADF] bg-white px-3 py-2 text-sm normal-case tracking-normal text-[#111]"
          >
            <option value="km">km</option>
            <option value="mi">mi</option>
          </select>
        </label>
        <button
          type="submit"
          disabled={upsert.isPending}
          className="flex items-center gap-1.5 rounded-md bg-[#007782] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#005f66] disabled:opacity-50"
        >
          <Plus className="h-4 w-4" /> Save market
        </button>
      </form>

      <div className="overflow-hidden rounded-lg border border-[#E0E0E0]">
        {markets.isLoading ? (
          <LoadingRow />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-[#FAFAFA] text-left text-xs uppercase tracking-wide text-[#666]">
              <tr>
                <th className="px-4 py-2">Market</th>
                <th className="px-4 py-2">Currency</th>
                <th className="px-4 py-2">Unit</th>
                {flagFields.map((flag) => (
                  <th key={flag.field} className="px-4 py-2 text-center">
                    {flag.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(markets.data ?? []).map((market) => (
                <tr key={market.countryCode} className="border-t border-[#EEE]">
                  <td className="px-4 py-2 text-[#111]">{countryName(market.countryCode)}</td>
                  <td className="px-4 py-2 text-[#666]">{market.defaultCurrencyCode}</td>
                  <td className="px-4 py-2 text-[#666]">{market.distanceUnit}</td>
                  {flagFields.map((flag) => {
                    const enabled = market[flag.field];
                    return (
                      <td key={flag.field} className="px-4 py-2 text-center">
                        <button
                          type="button"
                          onClick={() =>
                            setEnabled.mutate({
                              countryCode: market.countryCode,
                              field: flag.field,
                              enabled: !enabled,
                            })
                          }
                          aria-label={`Toggle ${flag.label} for ${market.countryCode}`}
                          className={`inline-flex h-6 w-6 items-center justify-center rounded-full ${
                            enabled
                              ? "bg-[#E8F5E9] text-[#2E7D32]"
                              : "bg-[#F2F3F5] text-[#999]"
                          }`}
                        >
                          {enabled ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function LocationsTab() {
  const utils = trpc.useUtils();
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState("");
  const [activeOnly, setActiveOnly] = useState(false);
  const [page, setPage] = useState(1);

  const locations = trpc.admin.locations.list.useQuery({
    query: query.trim() || undefined,
    countryCode: country || undefined,
    activeOnly: activeOnly || undefined,
    page,
    pageSize: 25,
  });
  const setActive = trpc.admin.locations.setActive.useMutation({
    onSuccess: () => utils.admin.locations.list.invalidate(),
  });

  const data = locations.data;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex-1 text-xs font-semibold uppercase tracking-wide text-[#666]">
          Search city
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder="City name"
            className="mt-1 block w-full rounded-md border border-[#D6DADF] bg-white px-3 py-2 text-sm normal-case tracking-normal text-[#111]"
          />
        </label>
        <label className="text-xs font-semibold uppercase tracking-wide text-[#666]">
          Country
          <select
            value={country}
            onChange={(event) => {
              setCountry(event.target.value);
              setPage(1);
            }}
            className="mt-1 block rounded-md border border-[#D6DADF] bg-white px-3 py-2 text-sm normal-case tracking-normal text-[#111]"
          >
            <option value="">All</option>
            {countryOptions.map((option) => (
              <option key={option.code} value={option.code}>
                {option.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 pb-2 text-sm text-[#111]">
          <input
            type="checkbox"
            checked={activeOnly}
            onChange={(event) => {
              setActiveOnly(event.target.checked);
              setPage(1);
            }}
            className="h-4 w-4 rounded border-[#C9DADD] text-[#007782] focus:ring-[#007782]"
          />
          Active only
        </label>
      </div>

      <div className="overflow-hidden rounded-lg border border-[#E0E0E0]">
        {locations.isLoading ? (
          <LoadingRow />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-[#FAFAFA] text-left text-xs uppercase tracking-wide text-[#666]">
              <tr>
                <th className="px-4 py-2">Location</th>
                <th className="px-4 py-2">Type</th>
                <th className="px-4 py-2">Population</th>
                <th className="px-4 py-2 text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {(data?.rows ?? []).map((location) => (
                <tr key={location.id} className="border-t border-[#EEE]">
                  <td className="px-4 py-2 text-[#111]">{location.label}</td>
                  <td className="px-4 py-2 text-[#666]">{location.placeType}</td>
                  <td className="px-4 py-2 text-[#666]">{location.population.toLocaleString()}</td>
                  <td className="px-4 py-2">
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() =>
                          setActive.mutate({
                            locationId: location.id,
                            isActive: !location.isActive,
                          })
                        }
                        className={`rounded-md border px-2 py-1 text-xs font-medium ${
                          location.isActive
                            ? "border-[#D6DADF] text-[#555] hover:bg-[#F7F7F7]"
                            : "border-[#D6DADF] text-[#007782] hover:bg-[#F2FAFB]"
                        }`}
                      >
                        {location.isActive ? "Disable" : "Enable"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {data && data.rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-sm text-[#999]">
                    No locations found. Run npm run locations:import to populate the catalogue.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        )}
      </div>

      {data && data.pageCount > 1 ? (
        <div className="flex items-center justify-between text-sm text-[#666]">
          <span>
            Page {data.page} of {data.pageCount} · {data.total} locations
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="rounded-md border border-[#D6DADF] px-3 py-1 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= data.pageCount}
              onClick={() => setPage((current) => current + 1)}
              className="rounded-md border border-[#D6DADF] px-3 py-1 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ReferenceTab() {
  const lists = [
    {
      title: "Listing conditions",
      items: ["Like New", "Very Good", "Good", "Fair", "Poor"],
    },
    {
      title: "School types",
      items: ["Public school", "Private school", "Not applicable"],
    },
    {
      title: "Education levels",
      items: [
        "Primary",
        "Middle school",
        "High school",
        "Undergraduate",
        "Graduate",
        "Professional",
      ],
    },
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm text-[#666]">
        These dimensions are fixed enums used by listing filters. They are shown here for reference;
        listings collect them during creation.
      </p>
      <div className="grid gap-4 sm:grid-cols-3">
        {lists.map((list) => (
          <div key={list.title} className="rounded-lg border border-[#E0E0E0] p-4">
            <h3 className="text-sm font-semibold text-[#111]">{list.title}</h3>
            <ul className="mt-2 space-y-1 text-sm text-[#666]">
              {list.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-[#E0E0E0] bg-white p-3">
      <p className="text-xs uppercase tracking-wide text-[#666]">{label}</p>
      <p className="mt-1 text-xl font-bold text-[#111]">{value}</p>
    </div>
  );
}

function LoadingRow() {
  return (
    <div className="flex items-center gap-2 px-4 py-6 text-sm text-[#666]">
      <Loader2 className="h-4 w-4 animate-spin" /> Loading...
    </div>
  );
}
