export type ProductEvent = "player_search" | "comparison_opened" | "trend_compared" | "transfer_scenario" | "workspace_save";
const key = "touchline-journey-v1";
export function journeyId() { let id = window.localStorage.getItem(key); if (!id) { id = crypto.randomUUID(); window.localStorage.setItem(key, id); } return id; }
export function trackProductEvent(event: ProductEvent) { try { void fetch("/api/events", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ journeyId: journeyId(), event, sourcePath: window.location.pathname }), keepalive: true }); } catch { /* Product analytics never blocks the user journey. */ } }
