"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { trackProductEvent, type ProductEvent } from "./product-events";

const routeEvents: Record<string, ProductEvent> = { "/scouting": "player_search", "/compare": "comparison_opened", "/trends": "trend_compared", "/transfers": "transfer_scenario" };

export function ProductJourney() {
  const pathname = usePathname();
  useEffect(() => { const event = routeEvents[pathname]; if (event) trackProductEvent(event); }, [pathname]);
  useEffect(() => { const listener = (event: MouseEvent) => { const target = event.target instanceof Element ? event.target.closest("button") : null; if (target?.textContent?.toUpperCase().includes("SAVE TO WORKSPACE")) trackProductEvent("workspace_save"); }; document.addEventListener("click", listener, { passive: true }); return () => document.removeEventListener("click", listener); }, []);
  return null;
}
