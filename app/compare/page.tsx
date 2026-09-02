import type { Metadata } from "next";
import { SiteNav } from "../site-nav";
import { ComparisonLab } from "./comparison-lab";

export const metadata: Metadata = { title: "Player Comparison — Touchline", description: "Compare Premier League player profiles, model valuations, uncertainty ranges, and performance evidence side by side." };

export default function ComparePage() {
  return <main className="compare-page"><SiteNav active="compare" /><header className="compare-hero shell"><div className="eyebrow"><span /> PLAYER COMPARISON</div><h1>See the trade-offs.<br /><em>Share the evidence.</em></h1><p>Select two or three players to compare normalized profile shape, exact production metrics, model valuation, uncertainty, and role-specific strengths.</p></header><ComparisonLab /><footer className="footer shell"><div className="brand"><span className="brand-mark">T</span><span>TOUCHLINE</span></div><p>Transparent normalization · shareable decisions</p><a href="/transfers">Transfer scenarios →</a></footer></main>;
}
