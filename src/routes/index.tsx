import { createFileRoute, Link } from "@tanstack/react-router";
import { AppointmentForm } from "@/components/site/AppointmentForm";
import { faqs } from "@/data/faqs";
import { journeySteps, site } from "@/data/site";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { DeptIcon } from "@/components/site/DeptIcon";
import { DoctorCard, HomeHospitalCard } from "@/components/site/cards";
import { FindBar } from "@/components/site/FindBar";
import { HOME_HOSPITAL_COUNT, HOME_SERVICES } from "@/data/home-services";
import { getFacets, getHome } from "@/lib/data-fns";
import { Testimonials } from "@/components/site/Testimonials";
import { HeroSlider } from "@/components/site/HeroSlider";
import { canonical, jsonLdScript } from "@/lib/search";
import ctaImage from "@/assets/cta-patient.jpg";
import { ArrowRight } from "lucide-react";

export const Route = createFileRoute("/")({
  loader: async () => {
    const [home, facets] = await Promise.all([getHome(), getFacets()]);
    return { home, facets };
  },
  head: () => ({
    meta: [
      { title: "Ikra Meditrip | Medical Treatment in India for International Patients" },
      {
        name: "description",
        content:
          "Robotic and non-robotic surgeries, top accredited Indian hospitals and specialists. Get a free treatment cost estimate, medical visa and travel support.",
      },
      { property: "og:title", content: "Ikra Meditrip | Your Medical Advisor" },
      {
        property: "og:description",
        content:
          "Plan your healthcare journey to India with free cost estimates, visa help and a dedicated patient coordinator.",
      },
    ],
    links: [{ rel: "canonical", href: canonical("/") }],
    scripts: [
      jsonLdScript({
        "@context": "https://schema.org",
        "@type": "Organization",
        name: site.name,
        url: site.url,
        email: site.email,
        telephone: site.phone,
        sameAs: Object.values(site.socials),
      }),
    ],
  }),
  component: Home,
});

function Home() {
  const { home, facets } = Route.useLoaderData();

  return (
    <>
      {/* 1. Hero: cost-enquiry form (left) and tagline over the client's image slider. Search/filter lives in the FindBar below and on the Doctors/Hospitals pages */}
      <HeroSlider>
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 pb-24 pt-12 sm:pb-28 sm:pt-16 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-12 lg:pb-32 lg:pt-16">
          {/* Lead form on the banner (cost enquiry), left on desktop; under the heading on phones */}
          <div className="order-2 w-full lg:order-1 lg:max-w-md">
            <AppointmentForm
              type="cost_enquiry"
              title="Know your treatment cost"
              subtitle="Share a few details and a patient coordinator will reply within 24 hours."
              submitLabel="Know your cost"
            />
          </div>
          <div className="order-1 max-w-2xl lg:order-2 lg:rounded-2xl lg:bg-background/80 lg:p-8 lg:shadow-card lg:backdrop-blur-sm">
            <span className="inline-flex items-center rounded-full border border-secondary/40 bg-background px-4 py-1.5 text-xs font-medium uppercase tracking-[0.14em] text-secondary-foreground">
              {site.tagline}
            </span>
            <h1 className="mt-6 text-3xl font-semibold leading-[1.1] tracking-tight text-foreground sm:text-4xl xl:text-5xl">
              World-class treatment in India, <span className="text-gradient-brand">planned around you</span>
            </h1>
            <p className="mt-5 max-w-xl text-base text-foreground/75 sm:text-lg">
              From your first report review to your flight home, Ikra Meditrip handles hospital and
              doctor selection, transparent cost estimates, medical visa and every travel detail.
            </p>
          </div>
        </div>
      </HeroSlider>

      {/* Find the right doctor / hospital (Country · City · Speciality · Treatment · Hospital) */}
      <FindBar facets={facets} />

      {/* 2. Multispeciality medical services */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Multispeciality medical services</h2>
        <p className="mt-3 text-muted-foreground">
          Robotic and non-robotic surgeries · Best medical treatment in India · Global hub for advanced healthcare
        </p>
        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {HOME_SERVICES.map((svc) => {
            const d = home.departments.find((x) => x.slug === svc.slug);
            return (
              <Link
                key={svc.slug}
                to="/services/$slug"
                params={{ slug: svc.slug }}
                className="group rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:shadow-card"
              >
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-primary">
                  <DeptIcon name={d?.icon ?? null} className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-sm font-medium leading-snug text-foreground group-hover:text-primary">{svc.label}</h3>
              </Link>
            );
          })}
        </div>
        <div className="mt-8">
          <Link to="/services" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* 3. Plan your healthcare journey */}
      <section className="bg-accent/40 py-20">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Plan your healthcare journey</h2>
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {journeySteps.map((step, i) => (
              <div key={step.title} className="rounded-2xl bg-card p-6 shadow-card">
                <span className="text-xs font-semibold tracking-[0.2em] text-secondary">STEP {String(i + 1).padStart(2, "0")}</span>
                <h3 className="mt-3 text-lg font-semibold text-foreground">{step.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Our partnered hospitals (3 on the homepage in a slider; the full directory is /hospitals) */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Our partnered hospitals</h2>
          <Link to="/hospitals" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <Carousel opts={{ align: "start" }} className="mt-10 px-10">
          <CarouselContent>
            {home.featuredHospitals.slice(0, HOME_HOSPITAL_COUNT).map((h) => (
              <CarouselItem key={h.slug} className="basis-full md:basis-1/2 xl:basis-1/3">
                <HomeHospitalCard h={h} />
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious aria-label="Previous hospitals" />
          <CarouselNext aria-label="Next hospitals" />
        </Carousel>
      </section>

      {/* 5. Trusted network: moving logo carousel (name tiles until genuine logos are supplied) */}
      <section className="border-y border-border bg-accent/30 py-12" aria-labelledby="network-h">
        <div className="mx-auto max-w-6xl px-4">
          <h2 id="network-h" className="text-center text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Our trusted network of top hospitals
          </h2>
        </div>
        <div className="mt-8 overflow-hidden">
          <div className="marquee-track flex w-max gap-4 hover:[animation-play-state:paused] focus-within:[animation-play-state:paused]">
            {[0, 1].map((copy) =>
              home.network.map((h) => (
                <Link
                  key={`${copy}-${h.slug}`}
                  to="/hospitals/$slug"
                  params={{ slug: h.slug }}
                  aria-hidden={copy === 1}
                  tabIndex={copy === 1 ? -1 : 0}
                  className="flex h-24 w-56 items-center justify-center rounded-xl border border-border bg-white px-6 text-center text-sm font-medium text-foreground hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {h.logo_url ? <img src={h.logo_url} alt={`${h.name}, ${h.city} logo`} loading="lazy" className="max-h-14 max-w-44 object-contain" /> : h.name}
                </Link>
              )),
            )}
          </div>
        </div>
      </section>

      {/* 6. Know our best doctors */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Know our best doctors</h2>
          <Link to="/doctors" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <Carousel opts={{ align: "start" }} className="mt-10 px-10">
          <CarouselContent>
            {home.featuredDoctors.map((d) => (
              <CarouselItem key={d.slug} className="basis-1/2 lg:basis-1/4">
                <DoctorCard d={d} showAction />
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious />
          <CarouselNext />
        </Carousel>
      </section>

      {/* 7. Blogs (real posts; labelled placeholders until the first articles are published in the admin) */}
      <section className="bg-accent/40 py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Blogs</h2>
            <Link to="/blog" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {home.posts.length
              ? home.posts.map((p) => (
                  <Link key={p.slug} to="/blog/$slug" params={{ slug: p.slug }} className="overflow-hidden rounded-2xl border border-border bg-card shadow-card transition hover:shadow-lift">
                    {p.cover_image_url ? (
                      <img src={p.cover_image_url} alt={p.cover_image_alt || p.title} loading="lazy" className="h-44 w-full object-cover" />
                    ) : null}
                    <div className="p-5">
                      <h3 className="font-semibold text-foreground">{p.title}</h3>
                      {p.excerpt ? <p className="mt-2 text-sm text-muted-foreground">{p.excerpt}</p> : null}
                      <span className="mt-3 inline-block text-sm font-medium text-primary">Read more →</span>
                    </div>
                  </Link>
                ))
              : [1, 2, 3].map((n) => (
                  <Link key={n} to="/blog" className="rounded-2xl border border-dashed border-border bg-card p-5">
                    <div className="flex h-36 items-center justify-center rounded-xl bg-accent text-xs text-muted-foreground">Image placeholder</div>
                    <h3 className="mt-4 font-semibold text-foreground">Article coming soon</h3>
                    <p className="mt-2 text-sm text-muted-foreground">Placeholder - blog articles supplied by Ikra Meditrip will appear here once published.</p>
                  </Link>
                ))}
          </div>
        </div>
      </section>

      {/* Patient feedback: genuine consented testimonials, or clearly labelled demo cards until supplied */}
      <Testimonials items={home.testimonials} />

      {/* 8. Big image + enquiry form */}
      <section id="appointment" className="scroll-mt-24 bg-accent/40 py-20">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 lg:grid-cols-2">
          <div>
            <img
              src={ctaImage}
              alt="Patient coordinator welcoming an international patient (placeholder image)"
              width={1280}
              height={960}
              loading="lazy"
              className="w-full rounded-3xl object-cover shadow-card"
            />
            <h2 className="mt-8 text-3xl font-semibold tracking-tight text-foreground">Talk to a patient coordinator</h2>
            <p className="mt-3 text-muted-foreground">
              Send your reports and we will come back with hospital options, doctor profiles and a cost estimate - usually within 24 hours.
            </p>
            <p className="mt-4 text-sm text-foreground">
              <a href={`mailto:${site.email}`} className="font-medium text-primary">{site.email}</a> ·{" "}
              <a href={`tel:${site.phoneHref}`} className="font-medium text-primary">{site.phone}</a>
            </p>
          </div>
          <AppointmentForm type="appointment" title="Book an appointment / enquire now" subtitle="Tell us what you need and we will arrange the right specialist." />
        </div>
      </section>

      {/* 9. FAQs - every question and answer is visible, no click or hover needed */}
      <section className="mx-auto max-w-4xl px-4 py-20">
        <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Frequently asked questions</h2>
        <dl className="mt-10 space-y-4">
          {faqs.map((f) => (
            <div key={f.q} className="rounded-2xl border border-border bg-card p-6">
              <dt className="text-base font-semibold text-foreground">{f.q}</dt>
              <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.a}</dd>
            </div>
          ))}
        </dl>
      </section>
    </>
  );
}
