"use client";

import { useMemo, useState } from "react";

const positions = ["Forward", "Midfielder", "Defender", "Goalkeeper"];

function money(value: number) {
  const rounded = Math.round(value * 10) / 10;
  return `£${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)}m`;
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
  const [position, setPosition] = useState("Forward");
  const [appearances, setAppearances] = useState(31);
  const [goals, setGoals] = useState(14);
  const [assists, setAssists] = useState(8);
  const [minutes, setMinutes] = useState(2360);

  const result = useMemo(() => {
    const positionBase: Record<string, number> = { Forward: 10.5, Midfielder: 9.2, Defender: 7.6, Goalkeeper: 6.4 };
    const peak = Math.max(0.35, 1 - Math.abs(age - 24) * 0.065);
    const availability = appearances / 38;
    const per90 = minutes ? ((goals * 1.7 + assists * 1.15) / minutes) * 90 : 0;
    const estimate = Math.max(1.2, (positionBase[position] + appearances * 0.18 + goals * 1.25 + assists * 0.72 + per90 * 8.5) * peak * (0.72 + availability * 0.35));
    return {
      estimate,
      low: estimate * 0.84,
      high: estimate * 1.18,
      confidence: Math.min(92, Math.round(66 + appearances * 0.55 + Math.min(minutes / 500, 5))),
      factors: [
        { name: "Goal contribution", value: Math.min(96, 34 + goals * 2.4 + assists), positive: true },
        { name: "Age curve", value: Math.round(peak * 88), positive: age <= 28 },
        { name: "Availability", value: Math.round(availability * 90), positive: appearances >= 24 },
      ],
    };
  }, [age, position, appearances, goals, assists, minutes]);

  return (
    <div className="workbench shell">
      <form className="controls" onSubmit={(event) => event.preventDefault()}>
        <div className="control-head"><span>PLAYER PROFILE</span><button type="button" onClick={() => { setAge(23); setPosition("Forward"); setAppearances(31); setGoals(14); setAssists(8); setMinutes(2360); }}>Reset</button></div>
        <label className="select-field"><span>Position</span><select value={position} onChange={(event) => setPosition(event.target.value)}>{positions.map((item) => <option key={item}>{item}</option>)}</select></label>
        <RangeField label="Age" value={age} min={17} max={36} onChange={setAge} />
        <RangeField label="Appearances" value={appearances} min={1} max={38} onChange={setAppearances} />
        <div className="split-fields">
          <RangeField label="Goals" value={goals} min={0} max={35} onChange={setGoals} />
          <RangeField label="Assists" value={assists} min={0} max={25} onChange={setAssists} />
        </div>
        <RangeField label="Minutes played" value={minutes} min={90} max={3420} step={30} suffix="′" onChange={setMinutes} />
      </form>

      <div className="result-panel" aria-live="polite">
        <div className="result-top"><span>MODEL ESTIMATE</span><span className="confidence"><i /> {result.confidence}% confidence</span></div>
        <div className="estimate"><span>Estimated market value</span><strong>{money(result.estimate)}</strong><p>Likely range {money(result.low)} — {money(result.high)}</p></div>
        <div className="distribution" aria-label={`Estimated market value ${money(result.estimate)}`}>
          <div className="distribution-labels"><span>£0</span><span>£25m</span><span>£50m</span><span>£75m+</span></div>
          <div className="distribution-line"><div className="range-band" style={{ left: `${Math.min(88, result.low / 0.75)}%`, width: `${Math.min(25, (result.high - result.low) / 0.75)}%` }} /><div className="estimate-pin" style={{ left: `${Math.min(96, result.estimate / 0.75)}%` }}><span>{money(result.estimate)}</span></div></div>
        </div>
        <div className="drivers"><span>TOP VALUE DRIVERS</span>{result.factors.map((factor) => <div className="driver" key={factor.name}><span>{factor.name}</span><div><i style={{ width: `${factor.value}%` }} /></div><strong className={factor.positive ? "up" : "down"}>{factor.positive ? "↗" : "↘"}</strong></div>)}</div>
        <p className="disclaimer">Demo estimate based on a transparent heuristic model. Production training and live data ingestion are the next engineering milestone.</p>
      </div>
    </div>
  );
}
