import type { Metadata } from "next";
import { requireChatGPTUser, chatGPTSignOutPath } from "../chatgpt-auth";
import { SiteNav } from "../site-nav";
import { WorkspaceDashboard } from "./workspace-dashboard";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Workspace — Touchline", description: "Private and collaborative Touchline squad and transfer rooms with permissions, comments, and history." };

export default async function WorkspacePage() {
  const user = await requireChatGPTUser("/workspace");
  return <main className="workspace-page"><SiteNav active="workspace" /><header className="workspace-hero shell"><div className="eyebrow"><span /> SCOUTING WORKSPACE</div><div><h1>Your decisions.<br /><em>Made together.</em></h1><div><p>Plans start private. Invite editors or viewers, discuss decisions, review every change, and revoke access whenever you need to.</p><span>Signed in as <strong>{user.displayName}</strong></span><a href={chatGPTSignOutPath("/")}>Sign out</a></div></div></header><WorkspaceDashboard /><footer className="footer shell"><div className="brand"><span className="brand-mark">T</span><span>TOUCHLINE</span></div><p>Role-protected · private by default · fully auditable</p><a href="/squad-planner">Build a plan →</a></footer></main>;
}
