import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/** Client-supplied hero photographs (public/hero). 800w for phones, 1600w for larger screens. */
export const heroSlides = [
  { name: "hero-surgery", w: [800, 1600], alt: "Surgeon operating in a modern operating theatre", pos: "70% center" },
  { name: "hero-consultation", w: [800, 1060], alt: "Doctor checking a patient's blood pressure during a consultation", pos: "75% center" },
  { name: "hero-doctors", w: [800, 1060], alt: "Three doctors in white coats standing together outdoors", pos: "72% center" },
] as const;

/** Time each slide stays on screen; the cross-fade below takes 1.8 s, so changes are gentle rather than abrupt. */
const INTERVAL_MS = 10000;

/**
 * Full-bleed background slider with cross-fade. Content is passed as children and sits above a readability
 * overlay. Autoplay pauses on hover/focus and is disabled for users who prefer reduced motion.
 */
export function HeroSlider({ children }: { children: ReactNode }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const root = useRef<HTMLElement>(null);
  const n = heroSlides.length;

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (paused || reduced) return;
    const t = window.setInterval(() => setI((x) => (x + 1) % n), INTERVAL_MS);
    return () => window.clearInterval(t);
  }, [paused, reduced, n]);

  const go = useCallback((to: number) => setI(((to % n) + n) % n), [n]);

  return (
    <section
      ref={root}
      aria-roledescription="carousel"
      aria-label="Ikra Meditrip highlights"
      className="relative isolate overflow-hidden bg-background"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(e) => {
        if (!root.current?.contains(e.relatedTarget as Node | null)) setPaused(false);
      }}
    >
      <div className="absolute inset-0 -z-10" aria-live={paused ? "polite" : "off"}>
        {heroSlides.map((s, k) => (
          <img
            key={s.name}
            src={`/hero/${s.name}-1600.webp`}
            srcSet={`/hero/${s.name}-800.webp 800w, /hero/${s.name}-1600.webp ${s.w[1]}w`}
            sizes="100vw"
            alt={k === i ? s.alt : ""}
            aria-hidden={k !== i}
            width={s.w[1]}
            height={Math.round(s.w[1] * 0.5625)}
            loading={k === 0 ? "eager" : "lazy"}
            fetchPriority={k === 0 ? "high" : "auto"}
            decoding="async"
            style={{ objectPosition: s.pos }}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-[1800ms] ease-in-out motion-reduce:transition-none ${
              k === i ? "opacity-100" : "opacity-0"
            }`}
          />
        ))}
        {/* readability: solid-ish on phones, fading left→right on wide screens so the photo still shows */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/45 to-background/20 lg:bg-gradient-to-r lg:from-background/85 lg:via-background/40 lg:to-transparent" />
      </div>

      {children}

      <div className="absolute inset-x-0 bottom-4 z-10 flex items-center justify-center gap-3">
        <button type="button" aria-label="Previous slide" onClick={() => go(i - 1)}
          className="hidden h-8 w-8 items-center justify-center rounded-full border border-border bg-background/80 text-foreground backdrop-blur hover:bg-background sm:flex">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex gap-2" role="group" aria-label="Choose slide">
          {heroSlides.map((s, k) => (
            <button key={s.name} type="button" aria-label={`Show slide ${k + 1} of ${n}`} aria-current={k === i}
              onClick={() => go(k)}
              className={`h-2.5 rounded-full transition-all ${k === i ? "w-8 bg-primary" : "w-2.5 bg-foreground/30 hover:bg-foreground/50"}`} />
          ))}
        </div>
        <button type="button" aria-label="Next slide" onClick={() => go(i + 1)}
          className="hidden h-8 w-8 items-center justify-center rounded-full border border-border bg-background/80 text-foreground backdrop-blur hover:bg-background sm:flex">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
}
