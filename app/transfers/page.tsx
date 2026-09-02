import type { Metadata } from "next";
import { SiteNav } from "../site-nav";
import { TransferBuilder } from "./transfer-builder";

export const metadata: Metadata = { title: "Transfer Scenario Builder — Touchline", description: "Compare replacement profiles, valuation-model costs, trade-offs, and potential transfer savings." };

export default function TransfersPage() { return <main className="transfers-page"><SiteNav active="transfers" /><header className="transfer-hero shell"><div className="eyebrow"><span /> TRANSFER SCENARIO / 04</div><div className="scout-heading"><h1>Replace the role,<br /><em>reprice the squad.</em></h1><p>Connect similarity scouting with model-based replacement cost. Compare up to three alternatives and share the exact shortlist with one URL.</p></div></header><TransferBuilder /><section className="transfer-method shell"><span className="section-index">COMPOSED PRODUCT FLOW</span><h2>One decision, three systems.</h2><div><article><strong>01</strong><h3>Retrieve</h3><p>Same-position nearest neighbours surface plausible statistical profiles.</p></article><article><strong>02</strong><h3>Revalue</h3><p>Every shortlisted profile runs through the versioned valuation API.</p></article><article><strong>03</strong><h3>Compare</h3><p>Radar signals and replacement-cost deltas expose trade-offs clearly.</p></article></div></section></main>; }
