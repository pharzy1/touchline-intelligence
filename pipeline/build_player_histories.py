#!/usr/bin/env python3
"""Build honest multi-season player trajectories from CC0 performance data.

Transfermarkt's player snapshot includes only the latest recorded market value,
so historical points are model estimates based on each season's performance.
The artifact keeps the latest recorded value separate from that trajectory.
"""
from __future__ import annotations

import csv, gzip, json, math
from collections import defaultdict
from datetime import date, datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE, DATA = ROOT / "work" / "source-data", ROOT / "data"
SEASONS = [2022, 2023, 2024, 2025]

def rows(name):
    with gzip.open(SOURCE / name, "rt", encoding="utf-8", newline="") as handle:
        yield from csv.DictReader(handle)

def age_on(birth, when):
    born = datetime.fromisoformat(birth).date()
    return when.year - born.year - ((when.month, when.day) < (born.month, born.day))

def predict(model, values):
    score = model["intercept"]
    contributions = {}
    for index, feature in enumerate(model["features"]):
        term = ((values[feature] - model["mean"][index]) / model["scale"][index]) * model["coefficients"][index]
        score += term
        contributions[feature] = term
    return max(round(math.expm1(score)), 0), contributions

def main():
    model = json.loads((DATA / "valuation-model.json").read_text())
    scouting = json.loads((DATA / "scouting-index.json").read_text())
    current = {str(player["player_id"]): player for player in scouting["players"]}
    profiles = {}
    for player in rows("players.csv.gz"):
        if player["player_id"] in current:
            profiles[player["player_id"]] = player

    games, season_ends = {}, {}
    for game in rows("games.csv.gz"):
        season = int(game["season"])
        if game["competition_id"] == "GB1" and season in SEASONS:
            games[game["game_id"]] = season
            played = date.fromisoformat(game["date"])
            season_ends[season] = max(season_ends.get(season, played), played)

    totals = defaultdict(lambda: {"appearances": 0, "goals": 0, "assists": 0, "minutes": 0})
    for appearance in rows("appearances.csv.gz"):
        season = games.get(appearance["game_id"])
        if season is None or appearance["player_id"] not in current:
            continue
        stats = totals[(appearance["player_id"], season)]
        stats["appearances"] += 1
        stats["goals"] += int(appearance["goals"] or 0)
        stats["assists"] += int(appearance["assists"] or 0)
        stats["minutes"] += int(appearance["minutes_played"] or 0)

    histories = []
    by_position_season = defaultdict(list)
    for player_id, player in current.items():
        profile = profiles[player_id]
        points = []
        for season in SEASONS:
            stats = totals[(player_id, season)]
            if stats["minutes"] < 180 or stats["appearances"] < 3:
                continue
            minutes = stats["minutes"]
            values = {
                "age": age_on(profile["date_of_birth"], season_ends[season]), **stats,
                "goals_per_90": stats["goals"] * 90 / minutes,
                "assists_per_90": stats["assists"] * 90 / minutes,
                "international_caps": float(profile["international_caps"] or 0),
                "is_forward": int(player["position"] == "Attack"),
                "is_midfielder": int(player["position"] == "Midfield"),
                "is_defender": int(player["position"] == "Defender"),
                "is_goalkeeper": int(player["position"] == "Goalkeeper"),
            }
            estimate, contributions = predict(model, values)
            point = {"season": season, "estimate_eur": estimate, **{key: round(value, 4) if isinstance(value, float) else value for key, value in values.items() if key in ["age", "appearances", "goals", "assists", "minutes", "goals_per_90", "assists_per_90"]}, "contributions": contributions}
            points.append(point); by_position_season[(player["position"], season)].append(estimate)
        if points:
            histories.append({"player_id": int(player_id), "name": player["name"], "club": player["club"], "position": player["position"], "latest_recorded_value_eur": player["market_value_eur"], "points": points})

    labels = {"age": "age curve", "goals_per_90": "scoring rate", "assists_per_90": "creative output", "minutes": "minutes played", "appearances": "availability", "goals": "total goals", "assists": "total assists"}
    for history in histories:
        previous = None
        for point in history["points"]:
            estimates = sorted(by_position_season[(history["position"], point["season"])])
            point["peer_median_eur"] = estimates[len(estimates) // 2]
            point["position_percentile"] = round(100 * sum(value <= point["estimate_eur"] for value in estimates) / len(estimates))
            if previous:
                deltas = [(feature, point["contributions"].get(feature, 0) - previous["contributions"].get(feature, 0)) for feature in labels]
                point["drivers"] = [{"label": labels[feature], "direction": "up" if delta >= 0 else "down"} for feature, delta in sorted(deltas, key=lambda item: abs(item[1]), reverse=True)[:3]]
            else: point["drivers"] = []
            previous = point
        for point in history["points"]: del point["contributions"]

    artifact = {"version": "player-history-2025-v1", "created_at": datetime.now(timezone.utc).isoformat(), "model_version": model["version"], "seasons": SEASONS, "methodology": "Season-level performance is passed through the deployed valuation model. Only the latest recorded market value is available in the source snapshot.", "players": histories}
    (DATA / "player-histories.json").write_text(json.dumps(artifact, ensure_ascii=False, indent=2) + "\n")
    print(f"Built {len(histories)} player histories with {sum(len(row['points']) for row in histories)} season points")

if __name__ == "__main__": main()
