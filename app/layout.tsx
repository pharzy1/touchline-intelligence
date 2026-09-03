import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { ProductJourney } from "./product-journey";

export async function generateMetadata(): Promise<Metadata> {
  const incoming = await headers();
  const host = incoming.get("host") ?? "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  const base = new URL(`${protocol}://${host}`);
  const title = "Touchline — Premier League Intelligence";
  const description = "Transparent player valuation, scouting, and match intelligence for the Premier League.";
  return {
    metadataBase: base,
    title,
    description,
    openGraph: { title, description, type: "website", images: [{ url: "/og.png", width: 1200, height: 630, alt: "Touchline Premier League Intelligence" }] },
    twitter: { card: "summary_large_image", title, description, images: ["/og.png"] },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><a className="skip-link" href="#main-content">Skip to main content</a><ProductJourney /><div id="main-content" tabIndex={-1}>{children}</div></body></html>;
}
