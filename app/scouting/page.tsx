import type { Metadata } from "next";
import Link from "next/link";
import { ScoutingLab } from "./scouting-lab";
import { SiteNav } from "../site-nav";

export const metadata: Metadata = { title: "Scouting Lab — Touchline", description: "Find comparable Premier League player profiles with a transparent nearest-neighbour model." };

export default function ScoutingPage() {
  return (
    <main className="scouting-page">
      <SiteNav active="scouting" />
      <header className="scout-hero shell">
        <div className="eyebrow"><span /> SCOUTING LAB / 02</div>
        <div className="scout-heading"><h1>Recruit the profile,<br /><em>not the reputation.</em></h1><p>Choose a Premier League player, set your recruitment constraints, and surface the closest statistical alternatives—with the reasoning exposed.</p></div>
      </header>
      <ScoutingLab />
      <section className="scout-method shell">
        <div><span className="section-index">HOW IT WORKS</span><h2>Similarity you can<br />interrogate.</h2></div>
        <div className="method-steps">
          <article><span>01</span><h3>Normalize</h3><p>Scale six profile signals so age or minutes cannot dominate through units alone.</p></article>
          <article><span>02</span><h3>Constrain</h3><p>Compare within the same broad position, then apply your age, budget, and club filters.</p></article>
          <article><span>03</span><h3>Rank</h3><p>Return the nearest standardized profiles and reveal their three strongest shared signals.</p></article>
        </div>
      </section>
      <footer className="footer shell"><div className="brand"><span className="brand-mark">T</span><span>TOUCHLINE</span></div><p>CC0 data · scouting-neighbors-2025-v1</p><Link href="/valuation">Valuation lab →</Link></footer>
    </main>
  );
}
