import type { Metadata } from "next";
import { SiteNav } from "../site-nav";
import { StatusDashboard } from "./status-dashboard";

export const metadata: Metadata = { title: "System Status — Touchline", description: "Live health, data freshness, and deployed model versions for Touchline Intelligence." };

export default function StatusPage() {
  return <main className="status-page"><SiteNav active="status" /><header className="status-hero shell"><div className="eyebrow"><span /> PRODUCTION OPERATIONS</div><h1>Trust the system.<br /><em>Inspect the evidence.</em></h1><p>Live data freshness, scheduled pipeline runs, immutable predictions, and the exact model artifacts currently serving requests.</p></header><div className="shell"><StatusDashboard /></div><footer className="footer shell"><div className="brand"><span className="brand-mark">T</span><span>TOUCHLINE</span></div><p>Public health summary · protected detailed diagnostics</p><a href="/matches/performance">Model performance →</a></footer></main>;
}
