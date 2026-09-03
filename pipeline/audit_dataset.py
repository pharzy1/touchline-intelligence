#!/usr/bin/env python3
"""Audit a refreshed player snapshot and publish a human-readable change ledger."""
from __future__ import annotations

import argparse
import csv
import gzip
import hashlib
import json
from datetime import datetime, timedelta, timezone
from pathlib import Path

EXPECTED = {
    "players.csv.gz": {"player_id", "name", "current_club_name", "position", "market_value_in_eur"},
    "games.csv.gz": {"game_id", "competition_id", "season", "date"},
    "appearances.csv.gz": {"game_id", "player_id", "minutes_played", "goals", "assists"},
}
POSITIONS = {"Attack", "Midfield", "Defender", "Goalkeeper"}


def load(directory: Path, name: str) -> dict:
    return json.loads((directory / name).read_text())


def source_evidence(directory: Path) -> tuple[list[dict], dict[str, int], int, str | None]:
    files, row_counts, latest_season, latest_match = [], {}, 0, None
    for name, required in EXPECTED.items():
        path = directory / name
        digest = hashlib.sha256()
        with path.open("rb") as handle:
            for chunk in iter(lambda: handle.read(1024 * 1024), b""):
                digest.update(chunk)
        with gzip.open(path, "rt", encoding="utf-8", newline="") as handle:
            reader = csv.DictReader(handle)
            missing = required - set(reader.fieldnames or [])
            if missing:
                raise ValueError(f"{name} is missing columns: {', '.join(sorted(missing))}")
            count = 0
            for row in reader:
                count += 1
                if name == "games.csv.gz" and row.get("competition_id") == "GB1":
                    latest_season = max(latest_season, int(row["season"]))
                    latest_match = max(latest_match or row["date"], row["date"])
            row_counts[name] = count
        files.append({"name": name, "bytes": path.stat().st_size, "sha256": digest.hexdigest()})
    return files, row_counts, latest_season, latest_match


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-dir", type=Path, required=True)
    parser.add_argument("--candidate-dir", type=Path, required=True)
    parser.add_argument("--production-dir", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    files, raw_rows, source_season, latest_match = source_evidence(args.source_dir)
    current = load(args.production_dir, "scouting-index.json")
    candidate = load(args.candidate_dir, "scouting-index.json")
    histories = load(args.candidate_dir, "player-histories.json")
    previous = {player["player_id"]: player for player in current["players"]}
    incoming = {player["player_id"]: player for player in candidate["players"]}
    shared = previous.keys() & incoming.keys()
    transfers = [{"playerId": player_id, "name": incoming[player_id]["name"], "from": previous[player_id]["club"], "to": incoming[player_id]["club"]} for player_id in shared if previous[player_id]["club"] != incoming[player_id]["club"]]
    values = [{"playerId": player_id, "name": incoming[player_id]["name"], "beforeEur": previous[player_id]["market_value_eur"], "afterEur": incoming[player_id]["market_value_eur"], "changeEur": incoming[player_id]["market_value_eur"] - previous[player_id]["market_value_eur"]} for player_id in shared if previous[player_id]["market_value_eur"] != incoming[player_id]["market_value_eur"]]
    performance_fields = ("appearances", "goals", "assists", "minutes")
    performance_changes = sum(any(previous[player_id][field] != incoming[player_id][field] for field in performance_fields) for player_id in shared)
    player_rows = list(incoming.values())
    clubs = {player["club"] for player in player_rows}
    gates = [
        {"name": "Source contracts", "passed": len(files) == len(EXPECTED), "detail": "All compressed source tables opened and exposed the required columns."},
        {"name": "Record coverage", "passed": len(player_rows) >= max(300, len(previous) * .9), "detail": f"{len(player_rows)} eligible players vs {len(previous)} in production."},
        {"name": "League coverage", "passed": len(clubs) >= 18, "detail": f"{len(clubs)} Premier League clubs represented."},
        {"name": "Identity uniqueness", "passed": len(player_rows) == len({player['player_id'] for player in player_rows}), "detail": "Every serving record has a unique player identifier."},
        {"name": "Domain validity", "passed": all(player["position"] in POSITIONS and 15 <= player["age"] <= 50 and player["market_value_eur"] > 0 and player["minutes"] >= 0 for player in player_rows), "detail": "Positions, ages, values, and performance totals stay inside serving constraints."},
        {"name": "Season monotonicity", "passed": candidate["season"] >= current["season"] and source_season >= candidate["season"], "detail": f"Candidate season {candidate['season']} does not move backward from {current['season']}."},
        {"name": "History coverage", "passed": len(histories["players"]) >= len(player_rows) * .95, "detail": f"{len(histories['players'])} of {len(player_rows)} players have validated history artifacts."},
        {"name": "Change-rate guardrail", "passed": len(previous.keys() - incoming.keys()) <= max(20, len(previous) * .15), "detail": "Unexpected mass removals block the refresh before review."},
    ]
    passed = all(gate["passed"] for gate in gates)
    generated = datetime.now(timezone.utc)
    now = generated.isoformat()
    report = {
        "schemaVersion": 1, "status": "validated" if passed else "rejected", "generatedAt": now,
        "cadence": "weekly", "nextReviewAfter": (generated + timedelta(days=7)).isoformat(), "season": candidate["season"], "modelVersion": candidate["version"],
        "source": {"name": "dcaribou/transfermarkt-datasets", "license": "CC0-1.0", "latestMatchDate": latest_match, "files": files, "rawRows": raw_rows},
        "counts": {"previousPlayers": len(previous), "candidatePlayers": len(incoming), "clubs": len(clubs), "added": len(incoming.keys() - previous.keys()), "removed": len(previous.keys() - incoming.keys()), "transfers": len(transfers), "valueChanges": len(values), "performanceChanges": performance_changes},
        "changes": {"transfers": sorted(transfers, key=lambda item: item["name"])[:50], "largestValueChanges": sorted(values, key=lambda item: abs(item["changeEur"]), reverse=True)[:20]},
        "gates": gates,
        "releasePolicy": "A validated snapshot opens a pull request. Production changes only after review, merge, CI, and deployment.",
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n")
    print(json.dumps({"status": report["status"], "players": len(incoming), "transfers": len(transfers), "valueChanges": len(values)}))
    if not passed:
        raise SystemExit(2)


if __name__ == "__main__":
    main()
