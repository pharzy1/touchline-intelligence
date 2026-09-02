export type PlayerPhoto = { src: string; author: string; license: string; licenseUrl: string; sourceUrl: string };

export function PlayerAvatar({ name, position, photo, size = "medium" }: { name: string; position: string; photo?: PlayerPhoto | null; size?: "small" | "medium" | "large" }) {
  const initials = name.split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase();
  return <figure className={`player-avatar ${size} position-${position.toLowerCase()}`}>
    {photo ? <><img src={photo.src} alt={`${name}, cached from Wikimedia Commons`} loading="lazy" /><a href={photo.sourceUrl} target="_blank" rel="noreferrer" title={`Photo: ${photo.author}; ${photo.license}, via Wikimedia Commons`}>{photo.license}</a></> : <span aria-label={`${name} initials avatar`}>{initials}</span>}
  </figure>;
}
