import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { site, specialties } from "@/data/site";
import { trackLead } from "@/lib/analytics";

type Props = {
  title?: string;
  subtitle?: string;
  compact?: boolean;
  /** Lead type stored in the database. */
  type?: "appointment" | "cost_enquiry" | "contact";
  /** Pre-filled treatment / speciality. */
  defaultTreatment?: string;
  /** Slugs link the lead to the page it came from, for the sales team. */
  doctorSlug?: string;
  hospitalSlug?: string;
  treatmentSlug?: string;
  submitLabel?: string;
};

const MAX_FILES = 5;
const MAX_MB = 10;

/**
 * Lead form - fields exactly as specified by the client (LEAD_FORM.docx):
 * patient name, age, country, city, contact number, treatment required, reports/documents.
 * Submits multipart/form-data to /api/leads, which stores the lead + files in the database.
 */
export function AppointmentForm({
  title = "Know your treatment cost",
  subtitle = "Share a few details and a patient coordinator will reply within 24 hours.",
  compact = false,
  type = "appointment",
  defaultTreatment = "",
  doctorSlug,
  hospitalSlug,
  treatmentSlug,
  submitLabel = "Send my request",
}: Props) {
  const uid = useId();
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const name = String(data.get("name") ?? "").trim();
    const phone = String(data.get("phone") ?? "").trim();
    const age = String(data.get("age") ?? "").trim();

    if (name.length < 2) return setError("Please enter the patient's name.");
    if (age && !(Number.isInteger(Number(age)) && Number(age) >= 0 && Number(age) <= 120))
      return setError("Please enter a valid age.");
    if (!/^[+()\d][\d\s().-]{4,19}$/.test(phone)) return setError("Please enter a valid contact number.");
    if (data.get("consent") !== "on") return setError("Please tick the box to confirm you agree to be contacted.");

    const files = data.getAll("reports").filter((f): f is File => f instanceof File && f.size > 0);
    if (files.length > MAX_FILES) return setError(`Please attach at most ${MAX_FILES} files.`);
    if (files.some((f) => f.size > MAX_MB * 1024 * 1024)) return setError(`Each file must be ${MAX_MB} MB or smaller.`);

    data.delete("consent");
    data.set("consent", "true");
    data.set("type", type);
    data.set("source_page", window.location.pathname);
    if (doctorSlug) data.set("doctor_slug", doctorSlug);
    if (hospitalSlug) data.set("hospital_slug", hospitalSlug);
    if (treatmentSlug) data.set("treatment_slug", treatmentSlug);

    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/leads", { method: "POST", body: data });
      if (res.status === 429) return setError("Too many requests from this device. Please try again later or call us.");
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string; errors?: Record<string, string> };
        return setError(Object.values(j.errors ?? {})[0] ?? j.error ?? "Something went wrong. Please try again or call us.");
      }
      setSent(true);
      trackLead(type, window.location.pathname); // conversion only after the server accepted the lead
      form.reset();
    } catch {
      setError(`We could not send your request. Please call or WhatsApp ${site.phone}.`);
    } finally {
      setBusy(false);
    }
  }

  const id = (n: string) => `${uid}-${n}`;
  const grid = compact ? "space-y-4" : "grid gap-4 sm:grid-cols-2";

  return (
    <div className="rounded-3xl border border-border bg-card p-6 shadow-lift sm:p-8">
      <h3 className="text-xl font-semibold tracking-tight text-foreground">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>

      <form onSubmit={handleSubmit} className="relative mt-6 space-y-4" noValidate>
        <div className={grid}>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor={id("name")}>Patient name</Label>
            <Input id={id("name")} name="name" required maxLength={100} autoComplete="name" placeholder="Full name of the patient" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={id("age")}>Age</Label>
            <Input id={id("age")} name="age" type="number" inputMode="numeric" min={0} max={120} placeholder="Years" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={id("phone")}>Contact number (with country code)</Label>
            <Input id={id("phone")} name="phone" type="tel" required maxLength={20} autoComplete="tel" placeholder="+000 000 0000" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={id("country")}>Country</Label>
            <Input id={id("country")} name="country" maxLength={100} autoComplete="country-name" placeholder="Country of residence" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={id("city")}>City</Label>
            <Input id={id("city")} name="city" maxLength={100} autoComplete="address-level2" placeholder="City" />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={id("treatment")}>Treatment required</Label>
          <Input
            id={id("treatment")}
            name="treatment_interest"
            list={id("treatments")}
            maxLength={160}
            defaultValue={defaultTreatment}
            placeholder="e.g. knee replacement, bone marrow transplant, IVF"
          />
          <datalist id={id("treatments")}>
            {specialties.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={id("reports")}>Reports / documents (optional)</Label>
          <input
            id={id("reports")}
            name="reports"
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,application/pdf,image/jpeg,image/png"
            className="block w-full rounded-md border border-input bg-background text-sm text-muted-foreground file:mr-3 file:cursor-pointer file:border-0 file:bg-accent file:px-4 file:py-2.5 file:text-sm file:font-medium file:text-accent-foreground"
          />
          <p className="text-xs text-muted-foreground">PDF, JPG, PNG or Word · up to {MAX_FILES} files · {MAX_MB} MB each</p>
        </div>

        {/* Honeypot: hidden from people, filled in by bots */}
        <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
          <label>
            Website
            <input type="text" name="website" tabIndex={-1} autoComplete="off" />
          </label>
        </div>

        <label className="flex items-start gap-2 text-xs text-muted-foreground">
          <input type="checkbox" name="consent" className="mt-0.5" required />
          <span>I agree that Ikra Meditrip may contact me about this enquiry and handle my information as described in the privacy policy.</span>
        </label>

        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        {sent ? (
          <p role="status" className="rounded-lg bg-accent p-3 text-sm text-accent-foreground">
            Thank you - your request has been received. Our team will reply within 24 hours. You can also call or WhatsApp us on {site.phone}.
          </p>
        ) : null}

        <Button type="submit" size="lg" disabled={busy} className="w-full gradient-brand text-primary-foreground">
          {busy ? "Sending…" : submitLabel}
        </Button>
      </form>
    </div>
  );
}
