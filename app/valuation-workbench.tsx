"use client";

import { useEffect, useState } from "react";

const positions = [
  { label: "Forward", value: "Attack" }, { label: "Midfielder", value: "Midfield" }, { label: "Defender", value: "Defender" }, { label: "Goalkeeper", value: "Goalkeeper" },
];

function money(value: number) {
  const millions = value / 1_000_000;
  const rounded = Math.round(millions * 10) / 10;
  return `€${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)}m`;
}

function RangeField({ label, value, min, max, step = 1, suffix = "", onChange }: { label: string; value: number; min: number; max: number; step?: number; suffix?: string; onChange: (value: number) => void }) {
  const fill = ((value - min) / (max - min)) * 100;
  return (
    <label className="range-field">
      <span><span>{label}</span><strong>{value}{suffix}</strong></span>
      <input type="range" min={min} max={max} step={step} value={value} style={{ "--fill": `${fill}%` } as React.CSSProperties} onChange={(event) => onChange(Number(event.target.value))} />
      <small><span>{min}{suffix}</span><span>{max}{suffix}</span></small>
    </label>
  );
}

export function ValuationWorkbench() {
  const [age, setAge] = useState(23);
  const [position, setPosition] = useState("Attack");
  const [appearances, setAppearances] = useState(31);
  const [goals, setGoals] = useState(14);
  const [assists, setAssists] = useState(8);
  const [minutes, setMinutes] = useState(2360);
  const [result, setResult] = useState<{ estimateEur: number; lowEur: number; highEur: number; version: string; metrics: { r2: number } } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch("/api/predict", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ age, position, appearances, goals, assists, minutes, internationalCaps: 0 }), signal: controller.signal });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error ?? "Prediction failed");
        setResult(payload); setError("");
      } catch (reason) {
        if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Prediction unavailable");
      }
    }, 180);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [age, position, appearances, goals, assists, minutes]);

  const confidence = result ? Math.round(Math.max(45, Math.min(90, result.metrics.r2 * 100))) : 0;
  const factors = [
    { name: "Goal contribution", value: Math.min(96, 30 + goals * 2.2 + assists), positive: goals + assists >= 8 },
    { name: "Age profile", value: Math.max(20, 100 - Math.abs(age - 24) * 9), positive: age <= 28 },
    { name: "Availability", value: Math.round((appearances / 38) * 90), positive: appearances >= 24 },
  ];

  return (
    <div className="workbench shell">
      <form className="controls" onSubmit={(event) => event.preventDefault()}>
        <div className="control-head"><span>PLAYER PROFILE</span><button type="button" onClick={() => { setAge(23); setPosition("Attack"); setAppearances(31); setGoals(14); setAssists(8); setMinutes(2360); }}>Reset</button></div>
        <label className="select-field"><span>Position</span><select value={position} onChange={(event) => setPosition(event.target.value)}>{positions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
        <RangeField label="Age" value={age} min={17} max={36} onChange={setAge} />
        <RangeField label="Appearances" value={appearances} min={1} max={38} onChange={setAppearances} />
        <div className="split-fields">
          <RangeField label="Goals" value={goals} min={0} max={35} onChange={setGoals} />
          <RangeField label="Assists" value={assists} min={0} max={25} onChange={setAssists} />
        </div>
        <RangeField label="Minutes played" value={minutes} min={90} max={3420} step={30} suffix="′" onChange={setMinutes} />
      </form>

      <div className="result-panel" aria-live="polite">
        <div className="result-top"><span>TRAINED MODEL ESTIMATE</span><span className="confidence"><i /> {result ? `${confidence}% fit score` : "calculating"}</span></div>
        <div className="estimate"><span>Estimated market value</span><strong>{result ? money(result.estimateEur) : "—"}</strong><p>{error || (result ? `Likely range ${money(result.lowEur)} — ${money(result.highEur)}` : "Sending profile to the prediction API…")}</p></div>
        <div className="distribution" aria-label={result ? `Estimated market value ${money(result.estimateEur)}` : "Calculating estimated market value"}>
          <div className="distribution-labels"><span>€0</span><span>€50m</span><span>€100m</span><span>€150m+</span></div>
          <div className="distribution-line">{result && <><div className="range-band" style={{ left: `${Math.min(88, result.lowEur / 1_500_000)}%`, width: `${Math.min(25, (result.highEur - result.lowEur) / 1_500_000)}%` }} /><div className="estimate-pin" style={{ left: `${Math.min(96, result.estimateEur / 1_500_000)}%` }}><span>{money(result.estimateEur)}</span></div></>}</div>
        </div>
        <div className="drivers"><span>PROFILE SIGNALS</span>{factors.map((factor) => <div className="driver" key={factor.name}><span>{factor.name}</span><div><i style={{ width: `${factor.value}%` }} /></div><strong className={factor.positive ? "up" : "down"}>{factor.positive ? "↗" : "↘"}</strong></div>)}</div>
        <p className="disclaimer">{result ? `${result.version} · trained on 2025/26 Premier League profiles · CC0 source data. Estimates are directional, not recruitment advice.` : "Loading versioned model…"}</p>
      </div>
    </div>
  );
}
