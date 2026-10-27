import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppointmentForm } from "@/components/site/AppointmentForm";
import { DoctorListCard, FilterSelect, PageHero, Pager } from "@/components/site/cards";
import { getDoctors, getFacets } from "@/lib/data-fns";
import { canonical, validateListSearch } from "@/lib/search";

export const Route = createFileRoute("/doctors")({
  validateSearch: validateListSearch,
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    const [list, facets] = await Promise.all([getDoctors({ data: { ...deps, pageSize: 24 } }), getFacets()]);
    return { list, facets };
  },
  head: () => ({
    meta: [
      { title: "Our Doctors | Top Specialists in India | Ikra Meditrip" },
      {
        name: "description",
        content:
          "Meet cardiologists, oncologists, orthopaedic, transplant and neuro specialists from India's leading hospitals, empanelled with Ikra Meditrip.",
      },
      { property: "og:title", content: "Our Doctors | Ikra Meditrip" },
      {
        property: "og:description",
        content: "Experienced specialists across cardiology, oncology, orthopaedics, transplants and more.",
      },
    ],
    links: [{ rel: "canonical", href: canonical("/doctors") }],
  }),
  component: Doctors,
});

function Doctors() {
  const { list, facets } = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const [q, setQ] = useState(search.q ?? "");

  const set = (patch: Partial<typeof search>) =>
    navigate({ search: (prev) => ({ ...prev, ...patch, page: patch.page }) });

  const cities = facets.cities.filter((c) => !search.country || c.country === search.country);

  return (
    <>
      <PageHero
        title="Our experienced doctors"
        intro="A team of health experts with many years of experience in their own specialised domains, practising at our partner hospitals across India."
      >
        <form
          role="search"
          className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
          onSubmit={(e) => {
            e.preventDefault();
            set({ q: q.trim() || undefined });
          }}
        >
          <label className="block text-xs font-medium text-muted-foreground sm:col-span-2 lg:col-span-1">
            Search
            <input
              type="search"
              value={q}
              maxLength={80}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Name or designation"
              className="mt-1 h-11 w-full rounded-lg border border-input bg-background px-4 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
          <FilterSelect
            label="Country"
            allLabel="All countries"
            value={search.country ?? ""}
            onChange={(v) => set({ country: v || undefined, city: undefined })}
            options={facets.countries.map((c) => ({ value: c.value, label: `${c.value} (${c.count})` }))}
          />
          <FilterSelect
            label="City"
            allLabel="All cities"
            value={search.city ?? ""}
            onChange={(v) => set({ city: v || undefined })}
            options={cities.map((c) => ({ value: c.value, label: c.value }))}
          />
          <FilterSelect
            label="Speciality"
            allLabel="All specialities"
            value={search.department ?? ""}
            onChange={(v) => set({ department: v || undefined })}
            options={facets.departments.map((d) => ({ value: d.value, label: d.label }))}
          />
          <FilterSelect
            label="Treatment"
            allLabel="All treatments"
            value={search.treatment ?? ""}
            onChange={(v) => set({ treatment: v || undefined })}
            options={facets.treatments}
          />
          <FilterSelect
            label="Hospital"
            allLabel="All hospitals"
            value={search.hospital ?? ""}
            onChange={(v) => set({ hospital: v || undefined })}
            options={facets.hospitals.map((h) => ({ value: h.value, label: `${h.label} · ${h.city}` }))}
          />
        </form>
      </PageHero>

      <section className="mx-auto max-w-6xl px-4 py-12">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          Showing {list.rows.length} of {list.total} doctors
        </p>
        {list.rows.length === 0 ? (
          <p className="mt-8 text-muted-foreground">
            No doctors match these filters. Try removing a filter, or tell us what you need below and
            we will recommend a specialist.
          </p>
        ) : (
          <div className="mt-8 space-y-5">
            {list.rows.map((d) => (
              <DoctorListCard key={d.slug} d={d} />
            ))}
          </div>
        )}
        <Pager page={list.page} pageSize={list.pageSize} total={list.total} onPage={(p) => set({ page: p })} />
      </section>

      <section className="mx-auto max-w-3xl px-4 pb-20">
        <AppointmentForm
          title="Request an appointment with a specialist"
          subtitle="Tell us your condition and we will recommend the right doctor for you."
        />
      </section>
    </>
  );
}
