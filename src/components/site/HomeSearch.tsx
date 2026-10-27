import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Homepage search with department + location filters → /search (doctors, hospitals, treatments). */
export function HomeSearch({
  departments,
  cities,
}: {
  departments: { slug: string; name: string }[];
  cities: { value: string }[];
}) {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [department, setDepartment] = useState("");
  const [city, setCity] = useState("");
  const select =
    "h-11 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <form
      role="search"
      className="mt-8 rounded-2xl border border-border bg-card p-4 shadow-card"
      onSubmit={(e) => {
        e.preventDefault();
        navigate({ to: "/search", search: { q: q.trim() || undefined, department: department || undefined, city: city || undefined } });
      }}
    >
      <label htmlFor="home-q" className="text-sm font-medium text-foreground">
        Find a doctor, hospital or treatment
      </label>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <input id="home-q" type="search" value={q} maxLength={80} onChange={(e) => setQ(e.target.value)}
          placeholder="e.g. knee replacement, IVF" className={`${select} sm:col-span-2`} />
        <select aria-label="Department" value={department} onChange={(e) => setDepartment(e.target.value)} className={select}>
          <option value="">All departments</option>
          {departments.map((d) => <option key={d.slug} value={d.slug}>{d.name}</option>)}
        </select>
        <select aria-label="Location" value={city} onChange={(e) => setCity(e.target.value)} className={select}>
          <option value="">All locations</option>
          {cities.map((c) => <option key={c.value} value={c.value}>{c.value}</option>)}
        </select>
      </div>
      <Button type="submit" size="lg" className="mt-3 w-full gradient-brand text-primary-foreground">
        <Search className="mr-2 h-4 w-4" /> Search
      </Button>
    </form>
  );
}
