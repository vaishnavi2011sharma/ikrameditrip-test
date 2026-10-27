import { MessageCircle, Quote } from "lucide-react";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { demoTestimonials } from "@/data/demo-testimonials";
import { site } from "@/data/site";

type Real = { patient_name: string; country: string | null; treatment: string | null; quote: string; image_url: string | null };

/**
 * Patient feedback. Real, consented testimonials (admin → Testimonials: published + consent confirmed) are shown when
 * they exist. Until then, clearly labelled DEMO cards show the design - never presented as real patient reviews.
 */
export function Testimonials({ items }: { items: Real[] }) {
  const real = items.length > 0;
  const cards = real
    ? items.map((t, i) => ({
        key: `${t.patient_name}-${i}`,
        quote: `“${t.quote}”`,
        name: t.patient_name,
        sub: [t.country, t.treatment].filter(Boolean).join(" · "),
        img: t.image_url ?? null,
      }))
    : demoTestimonials.map((d) => ({ key: d.id, quote: d.quote, name: "Patient name", sub: "Country · Treatment", img: null as string | null }));
  return (
    <section className="relative overflow-hidden py-20" aria-labelledby="feedback-h">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 gradient-soft" />
      <div className="mx-auto max-w-6xl px-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">Patient feedback</p>
        <h2 id="feedback-h" className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          What our patients say
        </h2>
        {!real ? (
          <p role="note" className="mt-4 inline-flex max-w-2xl rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Demo layout: the cards below are placeholders, not real patient reviews. Genuine feedback will replace them once patients have given written consent.
          </p>
        ) : null}

        <Carousel opts={{ align: "start", loop: false }} className="mt-10 px-10">
          <CarouselContent>
            {cards.map((c) => (
              <CarouselItem key={c.key} className="basis-full md:basis-1/2 lg:basis-1/3">
                <figure className="relative h-full rounded-3xl border border-border bg-card p-7 shadow-card">
                  <Quote aria-hidden className="h-8 w-8 text-primary/25" />
                  {!real ? (
                    <span className="absolute right-5 top-5 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-amber-900">Demo</span>
                  ) : null}
                  <blockquote className="mt-3 text-[15px] leading-relaxed text-foreground">{c.quote}</blockquote>
                  <figcaption className="mt-6 flex items-center gap-3 border-t border-border pt-4">
                    {c.img ? (
                      <img src={c.img} alt="" loading="lazy" className="h-11 w-11 rounded-full object-cover" />
                    ) : (
                      <span aria-hidden className="flex h-11 w-11 items-center justify-center rounded-full bg-accent text-sm font-semibold text-primary">
                        {real ? c.name.slice(0, 1).toUpperCase() : "?"}
                      </span>
                    )}
                    <span className="text-sm">
                      <span className="block font-semibold text-foreground">{c.name}</span>
                      <span className="block text-muted-foreground">{c.sub}</span>
                    </span>
                  </figcaption>
                </figure>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious aria-label="Previous feedback" />
          <CarouselNext aria-label="Next feedback" />
        </Carousel>

        <a href={site.whatsappHref} target="_blank" rel="noreferrer" className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
          <MessageCircle className="h-4 w-4" /> Talk to us on WhatsApp
        </a>
      </div>
    </section>
  );
}
