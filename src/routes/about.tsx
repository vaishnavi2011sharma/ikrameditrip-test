import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";
import { AppointmentForm } from "@/components/site/AppointmentForm";
import { PageHero } from "@/components/site/cards";
import { journeySteps, site } from "@/data/site";
import { canonical } from "@/lib/search";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Ikra Meditrip | Your Medical Advisor for Treatment in India" },
      {
        name: "description",
        content:
          "Ikra Meditrip is a medical travel advisory guiding international patients to the right hospital and specialist in India, with visa, travel and recovery support.",
      },
      { property: "og:title", content: "About Ikra Meditrip" },
    ],
    links: [{ rel: "canonical", href: canonical("/about") }],
  }),
  component: About,
});

function About() {
  return (
    <>
      <PageHero title="About Ikra Meditrip" intro={site.tagline + " - for treatment in India."} />
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 lg:grid-cols-2">
        <img src="/hero/hero-doctors-800.webp" alt="Three doctors in white coats standing together outdoors" width={800} height={450} loading="lazy" className="w-full rounded-3xl object-cover shadow-card" />
        <div>
          <p className="text-muted-foreground">
            Ikra Meditrip is a medical travel advisory that guides international patients to the right
            hospital and the right specialist in India. We are not a hospital - we work for you,
            comparing options across NABH and internationally accredited institutions so you get the
            best clinical outcome at a fair, transparent price.
          </p>
          <ul className="mt-6 space-y-3">
            {[
              "Multiple hospital and doctor recommendations for every case",
              "Written cost estimates with no hidden charges",
              "Medical visa invitation letters and embassy guidance",
              "Airport pickup, accommodation and language interpreters",
              "A dedicated coordinator before, during and after treatment",
            ].map((point) => (
              <li key={point} className="flex gap-3 text-sm text-foreground">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-secondary" />
                {point}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="bg-accent/40 py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">How it works</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {journeySteps.map((step, i) => (
              <div key={step.title} className="rounded-2xl bg-card p-6 shadow-card">
                <span className="text-xs font-semibold tracking-[0.2em] text-secondary">STEP {String(i + 1).padStart(2, "0")}</span>
                <h3 className="mt-3 text-lg font-semibold text-foreground">{step.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{step.text}</p>
              </div>
            ))}
          </div>
          <p className="mt-8 text-sm text-muted-foreground">
            Explore our <Link to="/hospitals" className="text-primary hover:underline">partner hospitals</Link> and{" "}
            <Link to="/doctors" className="text-primary hover:underline">doctors</Link>.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Explore Ikra Meditrip</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { to: "/services", t: "Medical services", d: "Every speciality we coordinate, with its treatments and doctors." },
            { to: "/hospitals", t: "Partner hospitals", d: "Accredited hospitals across India, with their specialities and enquiry forms." },
            { to: "/doctors", t: "Doctors", d: "Specialist profiles, filterable by speciality and city." },
            { to: "/treatment-cost", t: "Treatment Cost", d: "Request a written estimate for your treatment." },
          ].map((c) => (
            <Link key={c.to} to={c.to} className="rounded-2xl border border-border bg-card p-5 shadow-card transition-shadow hover:shadow-lift">
              <h3 className="font-semibold text-foreground">{c.t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{c.d}</p>
            </Link>
          ))}
        </div>
        <p className="mt-6 text-sm text-muted-foreground">
          Read our <Link to="/blog" className="text-primary hover:underline">medical-travel guides</Link> or see our{" "}
          <Link to="/privacy-policy" className="text-primary hover:underline">privacy policy</Link>.
        </p>
      </section>

      <section className="mx-auto max-w-3xl px-4 pb-16">
        <AppointmentForm type="contact" title="Talk to a patient coordinator" />
      </section>
    </>
  );
}
