import type { Metadata } from "next";
import { SiteNav } from "../site-nav";
import { FeedbackForm } from "./feedback-form";

export const metadata: Metadata = { title: "Beta Feedback — Touchline", description: "Run a short Touchline usability test and submit privacy-preserving product feedback." };
export default function FeedbackPage() { return <main className="feedback-page"><SiteNav active="feedback" /><header className="compare-hero shell"><div className="eyebrow"><span /> PRODUCT BETA</div><h1>Test the decision.<br /><em>Improve the system.</em></h1><p>Complete one real football decision, then tell us what was clear, confusing, slow, or inaccessible. Feedback is stored without names, emails, or raw IP addresses.</p></header><FeedbackForm /></main>; }
