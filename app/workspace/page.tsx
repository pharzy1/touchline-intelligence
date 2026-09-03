import type { Metadata } from "next";
import { requireChatGPTUser, chatGPTSignOutPath } from "../chatgpt-auth";
import { SiteNav } from "../site-nav";
import { WorkspaceDashboard } from "./workspace-dashboard";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Workspace — Touchline", description: "Your private Touchline squad and transfer scenarios, synchronized across sessions." };

export default async function WorkspacePage() {
  const user = await requireChatGPTUser("/workspace");
  return <main className="workspace-page"><SiteNav active="workspace" /><header className="workspace-hero shell"><div className="eyebrow"><span /> PRIVATE WORKSPACE</div><div><h1>Your decisions.<br /><em>Saved with history.</em></h1><div><p>Squad plans and transfer scenarios are private by default, synchronized to your account, and restorable from prior versions.</p><span>Signed in as <strong>{user.displayName}</strong></span><a href={chatGPTSignOutPath("/")}>Sign out</a></div></div></header><WorkspaceDashboard /><footer className="footer shell"><div className="brand"><span className="brand-mark">T</span><span>TOUCHLINE</span></div><p>Private by default · versioned in D1</p><a href="/squad-planner">Build a plan →</a></footer></main>;
}
