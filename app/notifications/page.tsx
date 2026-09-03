import type { Metadata } from "next";
import { requireChatGPTUser } from "../chatgpt-auth";
import { SiteNav } from "../site-nav";
import { NotificationInbox } from "./notification-inbox";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Notifications — Touchline", description: "Your Touchline collaboration alerts and weekly football intelligence briefings." };

export default async function NotificationsPage() {
  const user = await requireChatGPTUser("/notifications");
  return <main className="notifications-page"><SiteNav active="notifications" /><header className="notifications-hero shell"><div className="eyebrow"><span /> DECISION INBOX</div><div><h1>Stay close to<br /><em>every decision.</em></h1><p>Invitations, scouting-room activity, access changes, and weekly model briefings—delivered reliably to {user.email}.</p></div></header><NotificationInbox /><footer className="footer shell"><div className="brand"><span className="brand-mark">T</span><span>TOUCHLINE</span></div><p>Durable delivery · retry-safe · preference controlled</p><a href="/workspace">Open workspace →</a></footer></main>;
}
