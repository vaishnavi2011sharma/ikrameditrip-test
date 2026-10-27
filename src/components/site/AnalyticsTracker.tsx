import { useEffect, useRef } from "react";
import { useRouterState } from "@tanstack/react-router";
import { analyticsEnabled, initAnalytics, trackPageView } from "@/lib/analytics";
import { useConsent } from "@/lib/consent";

/**
 * Mounted once in the root layout. Loads GA4 / Meta Pixel (only if their env IDs exist) and sends exactly one page view per
 * path change - initial load and client-side navigation alike. Query-string changes (filters, paging) are not new pages.
 */
export function AnalyticsTracker() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const last = useRef<string | null>(null);
  const { consent } = useConsent();

  useEffect(() => {
    // nothing non-essential loads before the visitor accepts (see lib/consent.ts)
    if (!analyticsEnabled() || consent !== "granted") return;
    initAnalytics();
    if (last.current === pathname) return; // StrictMode / re-render guard
    last.current = pathname;
    // wait one tick so <title> of the new route is in the document
    window.setTimeout(() => trackPageView(pathname), 0);
  }, [pathname, consent]);

  return null;
}
