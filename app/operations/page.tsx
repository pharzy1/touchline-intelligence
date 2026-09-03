import type { Metadata } from "next";
import { requireChatGPTUser } from "../chatgpt-auth";
import { SiteNav } from "../site-nav";
import { OperationsDashboard } from "./operations-dashboard";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Operations — Touchline", description: "Private reliability, security, and product telemetry for Touchline Intelligence." };

export default async function OperationsPage() {
  await requireChatGPTUser("/operations");
  return <main className="operations-page"><SiteNav active="operations" /><header className="operations-hero shell"><div className="eyebrow"><span /> PRIVATE OPERATIONS</div><h1>Run the product.<br /><em>Know when it breaks.</em></h1><p>Production traffic, latency, errors, abuse controls, database health, and scheduled provider reliability—without storing raw IP addresses.</p></header><OperationsDashboard /><footer className="footer shell"><div className="brand"><span className="brand-mark">T</span><span>TOUCHLINE</span></div><p>Admin-only · privacy-bounded telemetry</p><a href="/status">Public health →</a></footer></main>;
}
