import type { Metadata } from "next";
import imageManifest from "../../data/player-images.json";
import scoutingIndex from "../../data/scouting-index.json";
import { PlayerAvatar, type PlayerPhoto } from "../player-avatar";
import { SiteNav } from "../site-nav";

export const metadata: Metadata = { title: "Player Photo Credits — Touchline", description: "Wikimedia Commons authors, licences, and source pages for locally cached Touchline player photography." };

export default function PhotoCreditsPage() {
  const names = new Map(scoutingIndex.players.map((player) => [String(player.player_id), player]));
  const credits = Object.entries(imageManifest.players).map(([id, photo]) => ({ id, player: names.get(id), photo: photo as PlayerPhoto })).filter((item) => item.player);
  return <main><SiteNav active="scouting" /><header className="credits-hero shell"><div className="eyebrow"><span /> RESPONSIBLE MEDIA REUSE</div><h1>Player photo credits.</h1><p>Touchline downloads eligible Wikimedia Commons thumbnails during the data pipeline, serves the cached files from its own deployment, and retains the author, licence, and source page for every image.</p></header><section className="credits-grid shell">{credits.map(({ id, player, photo }) => player && <article key={id}><PlayerAvatar name={player.name} position={player.position} photo={photo} size="large" /><div><h2>{player.name}</h2><p>Photo: {photo.author}</p><p><a href={photo.licenseUrl} target="_blank" rel="noreferrer">{photo.license}</a> · <a href={photo.sourceUrl} target="_blank" rel="noreferrer">Wikimedia Commons source</a></p><small>Cached resized thumbnail; no editorial changes.</small></div></article>)}</section><section className="credits-note shell"><strong>Fallback policy</strong><p>When identity or licensing cannot be verified confidently, Touchline displays a position-coloured initials avatar. A missing photo is preferable to a wrong person or unclear rights.</p></section></main>;
}
