import type { Metadata } from "next";
import { notFound } from "next/navigation";
import histories from "../../../data/player-histories.json";
import images from "../../../data/player-images.json";
import { PlayerAvatar, type PlayerPhoto } from "../../player-avatar";
import { SiteNav } from "../../site-nav";
import { PlayerHistory } from "./player-history";

type Params = Promise<{ id: string }>;
const positionLabel = (value: string) => value === "Attack" ? "Forward" : value;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params; const player = histories.players.find((item) => item.player_id === Number(id));
  return player ? { title: `${player.name} Intelligence — Touchline`, description: `Multi-season valuation trajectory, performance evidence, and peer benchmarks for ${player.name}.` } : { title: "Player not found — Touchline" };
}

export default async function PlayerPage({ params }: { params: Params }) {
  const { id } = await params; const player = histories.players.find((item) => item.player_id === Number(id)); if (!player) notFound();
  const photo = (images.players as Record<string, PlayerPhoto>)[id] ?? null;
  return <main className="player-page"><SiteNav active="scouting" /><header className="player-profile-hero shell"><div className="player-identity"><PlayerAvatar name={player.name} position={player.position} photo={photo} size="large" /><div><div className="eyebrow"><span /> PLAYER INTELLIGENCE / {player.player_id}</div><h1>{player.name}</h1><p>{player.club} · {positionLabel(player.position)} · Four-season performance view</p></div></div><div className="profile-actions"><a href={`/transfers?player=${player.player_id}`}>Build transfer scenario <span>→</span></a><a href={`/scouting?player_id=${player.player_id}`}>Find similar profiles</a></div></header><div className="shell"><PlayerHistory points={player.points} recordedValue={player.latest_recorded_value_eur} /><section className="history-method"><div className="section-index">03 / METHODOLOGY</div><h2>One model. Different seasons.<br /><em>No invented prices.</em></h2><p>Each historical point uses that season’s Premier League appearances, minutes, goals, assists, rates, and the player’s age at season end. The source publishes only today’s recorded market value, so Touchline shows it once as a comparison marker rather than presenting it as historical ground truth.</p><div><span>ARTIFACT</span><strong>{histories.version}</strong><span>SERVING MODEL</span><strong>{histories.model_version}</strong></div></section></div><footer className="footer shell"><div className="brand"><span className="brand-mark">T</span><span>TOUCHLINE</span></div><p>CC0 performance data · transparent estimated trajectory</p><a href="/scouting">Scouting lab →</a></footer></main>;
}
