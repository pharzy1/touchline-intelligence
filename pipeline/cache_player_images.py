#!/usr/bin/env python3
"""Cache freely licensed Commons player photos and their attribution metadata."""

from __future__ import annotations

import argparse
import certifi
import html
import json
import re
import time
import urllib.parse
import urllib.request
import ssl
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "data" / "scouting-index.json"
MANIFEST = ROOT / "data" / "player-images.json"
OUTPUT = ROOT / "public" / "players"
API = "https://commons.wikimedia.org/w/api.php"
USER_AGENT = "TouchlineIntelligence/1.0 (portfolio data pipeline; https://touchlineintelligence.com)"
ALLOWED_LICENSES = ("CC BY", "CC0", "Public domain", "PDM")
SSL_CONTEXT = ssl.create_default_context(cafile=certifi.where())
MANUAL_REJECTIONS = {
    "File:Manchester City dressing room 2022.jpg",
    "File:National Football Museum displays 2.jpg",
    "File:20180610 FIFA Friendly Match Austria vs. Brazil Gruppenfoto Brasilien 850 0016.jpg",
    "File:Joao-pedro-palmeiras-2016.jpg",
    "File:Plantel TRA 2019 .jpg",
}
AMBIGUOUS_NAMES = {"Gabriel"}


def plain(value: str) -> str:
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", value or ""))).strip()


def metadata_value(metadata: dict, key: str) -> str:
    return plain(metadata.get(key, {}).get("value", ""))


def commons_candidates(name: str) -> list[dict]:
    query = {
        "action": "query", "format": "json", "formatversion": "2", "generator": "search",
        "gsrsearch": f'"{name}" footballer filetype:bitmap', "gsrnamespace": "6", "gsrlimit": "8",
        "prop": "imageinfo", "iiprop": "url|mime|extmetadata", "iiurlwidth": "320",
    }
    request = urllib.request.Request(f"{API}?{urllib.parse.urlencode(query)}", headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=25, context=SSL_CONTEXT) as response:
        return json.load(response).get("query", {}).get("pages", [])


def choose_photo(name: str, pages: list[dict]) -> dict | None:
    surname = re.sub(r"[^a-z]", "", name.split()[-1].lower())
    full = re.sub(r"[^a-z]", "", name.lower())
    ranked: list[tuple[int, dict]] = []
    for page in pages:
        if page.get("title") in MANUAL_REJECTIONS:
            continue
        info = (page.get("imageinfo") or [{}])[0]
        metadata = info.get("extmetadata") or {}
        license_name = metadata_value(metadata, "LicenseShortName")
        if not license_name.startswith(ALLOWED_LICENSES) or not info.get("thumburl") or info.get("mime") not in {"image/jpeg", "image/png", "image/webp"}:
            continue
        haystack = re.sub(r"[^a-z]", "", " ".join([page.get("title", ""), metadata_value(metadata, "ImageDescription"), metadata_value(metadata, "ObjectName")]).lower())
        if surname not in haystack:
            continue
        score = 3 if full in haystack else 1
        if "football" in plain(metadata.get("Categories", {}).get("value", "")).lower():
            score += 1
        ranked.append((score, {"page": page, "info": info, "metadata": metadata, "license": license_name}))
    return max(ranked, key=lambda item: item[0])[1] if ranked else None


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=40, help="Number of highest-value players to enrich")
    args = parser.parse_args()
    players = sorted(json.loads(INDEX.read_text())["players"], key=lambda player: player["market_value_eur"], reverse=True)[: args.limit]
    OUTPUT.mkdir(parents=True, exist_ok=True)
    manifest = {"version": "commons-player-images-v1", "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "source": "Wikimedia Commons", "players": {}}
    for index, player in enumerate(players, start=1):
        try:
            if player["name"] in AMBIGUOUS_NAMES:
                print(f"[{index}/{len(players)}] manual fallback for ambiguous name: {player['name']}")
                continue
            selected = choose_photo(player["name"], commons_candidates(player["name"]))
            if not selected:
                print(f"[{index}/{len(players)}] no eligible photo: {player['name']}")
                continue
            page, info, metadata = selected["page"], selected["info"], selected["metadata"]
            extension = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}[info["mime"]]
            filename = f"{player['player_id']}.{extension}"
            image_request = urllib.request.Request(info["thumburl"], headers={"User-Agent": USER_AGENT})
            with urllib.request.urlopen(image_request, timeout=30, context=SSL_CONTEXT) as response:
                (OUTPUT / filename).write_bytes(response.read())
            page_url = f"https://commons.wikimedia.org/wiki/{urllib.parse.quote(page['title'].replace(' ', '_'), safe=':_')}"
            manifest["players"][str(player["player_id"])] = {
                "src": f"/players/{filename}", "author": metadata_value(metadata, "Artist") or "Wikimedia Commons contributor",
                "license": selected["license"], "licenseUrl": metadata_value(metadata, "LicenseUrl"), "sourceUrl": page_url,
                "credit": metadata_value(metadata, "Credit"), "cachedThumbnail": True, "changes": "Resized thumbnail; no editorial changes",
            }
            print(f"[{index}/{len(players)}] cached: {player['name']} <- {page['title']}")
        except Exception as error:
            print(f"[{index}/{len(players)}] skipped {player['name']}: {error}")
        time.sleep(0.12)
    retained = {Path(photo["src"]).name for photo in manifest["players"].values()}
    for cached_file in OUTPUT.iterdir():
        if cached_file.is_file() and cached_file.name not in retained:
            cached_file.unlink()
    MANIFEST.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n")
    print(f"Wrote {len(manifest['players'])} licensed photos to {MANIFEST}")


if __name__ == "__main__":
    main()
