import type { Metadata } from "next";
import model from "../../data/valuation-model.json";
import { SiteNav } from "../site-nav";
import { ValuationWorkbench } from "../valuation-workbench";

export const metadata: Metadata = { title: "Valuation Lab — Touchline", description: "Estimate player value with uncertainty intervals and inspectable model contributions." };

export default function ValuationPage() {
  return <main><SiteNav active="valuation" /><header className="scout-hero shell"><div className="eyebrow"><span /> VALUATION LAB / 01</div><div className="scout-heading"><h1>Price the profile,<br /><em>inspect the signal.</em></h1><p>Adjust performance, age, role, and availability to generate a model estimate, bootstrap interval, and feature-level explanation.</p></div></header><section className="workbench-wrap valuation-page-workbench"><ValuationWorkbench /></section><section className="model-section shell" id="model-card"><div className="model-title"><span className="section-index">MODEL CARD / {model.version}</span><h2>Built to be<br /><em>questioned.</em></h2></div><div className="model-copy"><p className="lead">A prediction without context is just a number. Touchline shows what drives every estimate.</p><div className="model-grid"><div><span>APPROACH</span><strong>Regularized log regression</strong><p>Compared against gradient-boosted trees and evaluated with cross-validation.</p></div><div><span>PRIMARY METRIC</span><strong>€{Math.round(model.metrics.mae_eur / 1_000_000)}m mean absolute error</strong><p>Reported alongside R², fold variance, and a transparent baseline comparison.</p></div><div><span>UNCERTAINTY</span><strong>Bootstrap interval</strong><p>Repeated resampling estimates the spread around each prediction.</p></div><div><span>VERSIONING</span><strong>Reproducible artifacts</strong><p>Every response names the immutable model version used for inference.</p></div></div></div></section></main>;
}
