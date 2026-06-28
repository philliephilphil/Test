"use client";

import type { Opportunity } from "@/lib/types";

function pct(v: number | null): string {
  return v !== null ? `${Math.round(v * 100)}/100` : "keine Daten";
}

function num(v: number | null): string {
  return v !== null ? v.toLocaleString("de-AT") : "keine Daten";
}

function Row({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "3px 0", borderBottom: "1px solid #f0f0f0" }}>
      <span style={{ color: "#444" }}>
        {label}
        {hint && <span style={{ color: "#999", fontSize: "0.8em" }}> · {hint}</span>}
      </span>
      <strong>{value}</strong>
    </div>
  );
}

export default function OpportunityPanel({ o }: { o: Opportunity }) {
  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, maxWidth: 520, fontSize: "0.92em" }}>
      <h3 style={{ margin: "0 0 8px" }}>
        {o.bezirk} — Umsatz-Potenzial-Index{" "}
        <span style={{ fontSize: "1.2em" }}>{o.opportunityScore !== null ? Math.round(o.opportunityScore * 100) : "?"}</span>
        /100
      </h3>
      <p style={{ margin: "0 0 8px", color: "#1b5e20" }}>
        <strong>Warum hier:</strong> {o.drivers}
      </p>
      <Row
        label="Versorgungsgrad"
        hint="Bäckereien je 10.000 EW"
        value={o.supplyPer10k !== null ? `${o.supplyPer10k.toLocaleString("de-AT")} (${o.bakeryCount} gesamt)` : `keine Daten (${o.bakeryCount} erfasst)`}
      />
      <Row label="Frequenz-Index" hint="Einwohner+Betten+POIs" value={pct(o.frequency)} />
      <Row label="Tourismus" hint="Nächtigungen Sommer 2023" value={o.nights !== null ? num(o.nights) : "keine Daten"} />
      <Row label="Einwohner" value={num(o.population)} />
      <Row label="Gästebetten" value={num(o.beds)} />
      <Row label="Wetter-Gunst (heute)" value={pct(o.weatherFavorability)} />
      <Row label="Marktgröße (Bubble-Größe)" value={pct(o.marketSize)} />
      <p style={{ margin: "8px 0 0", color: "#888", fontSize: "0.8em" }}>
        Der Umsatz-Potenzial-Index ist ein <strong>relativer Vergleichswert</strong> (0–100) aus Bäckerei-Lücke,
        Frequenz, Tourismus und Wetter-Gunst — <strong>kein Euro-Betrag</strong> (echte Umsatzdaten gibt es nicht).
        Quellen: OSM/Overpass, Land Salzburg Landesstatistik, Open-Meteo.
      </p>
    </div>
  );
}
