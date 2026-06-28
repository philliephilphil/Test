"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, GeoJSON } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import HeatmapLayer, { type HeatPoint } from "./HeatmapLayer";
import LayerToggle, { type LayerKey } from "./LayerToggle";
import ScoreBreakdownPanel from "./ScoreBreakdownPanel";
import ClosureDataEmptyState from "./ClosureDataEmptyState";
import OpportunityBubbles from "./OpportunityBubbles";
import OpportunityPanel from "./OpportunityPanel";
import type { Bakery, BezirkName, CollectionStats, FrequencyPoi, Opportunity, ScoreResult } from "@/lib/types";

const SALZBURG_CENTER: [number, number] = [47.45, 13.1];

type ScoreByBezirk = Record<string, ScoreResult>;

function scoreColor(score: number | null): string {
  if (score === null) return "#cccccc";
  // low score -> light, high score -> saturated orange/red (more potential)
  const hue = 30;
  const lightness = 90 - score * 50;
  return `hsl(${hue}, 80%, ${lightness}%)`;
}

// Browser-side fallback: when the build-time Overpass cache is empty (e.g. the
// public Overpass instance rate-limited the Vercel build with HTTP 429), the
// client fetches the bakeries live from OpenStreetMap directly. Overpass sends
// permissive CORS headers, so this works from the browser. Bezirk tagging
// (point-in-polygon) is server-only, so bezirk stays null in this path.
const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

const BAKERY_QUERY = `
[out:json][timeout:60];
area["name"="Salzburg"]["boundary"="administrative"]["admin_level"="4"]->.s;
nwr["shop"="bakery"](area.s);
out center tags;`;

async function fetchBakeriesViaOverpass(): Promise<Bakery[]> {
  let lastErr: unknown;
  for (const url of OVERPASS_ENDPOINTS) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: "data=" + encodeURIComponent(BAKERY_QUERY),
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const json = await res.json();
      const out: Bakery[] = [];
      for (const el of json.elements ?? []) {
        const lat = el.lat ?? el.center?.lat;
        const lon = el.lon ?? el.center?.lon;
        if (typeof lat !== "number" || typeof lon !== "number") continue;
        const t = el.tags ?? {};
        out.push({
          osmId: el.id,
          osmType: el.type === "way" ? "way" : "node",
          name: t.name ?? null,
          lat,
          lon,
          openingHours: t.opening_hours ?? null,
          addr: {
            street: t["addr:street"],
            housenumber: t["addr:housenumber"],
            postcode: t["addr:postcode"],
            city: t["addr:city"],
          },
          website: t.website,
          phone: t.phone,
          bezirk: null,
        });
      }
      return out;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr ?? new Error("Overpass fehlgeschlagen");
}

export default function MapView() {
  const [bakeries, setBakeries] = useState<Bakery[]>([]);
  const [bakeriesError, setBakeriesError] = useState<string | null>(null);
  const [bakeriesNote, setBakeriesNote] = useState<string | null>(null);
  const [pois, setPois] = useState<FrequencyPoi[]>([]);
  const [scores, setScores] = useState<ScoreByBezirk>({});
  const [districtsGeoJson, setDistrictsGeoJson] = useState<GeoJSON.FeatureCollection | null>(null);
  const [collectionStats, setCollectionStats] = useState<CollectionStats | null>(null);
  const [selectedBezirk, setSelectedBezirk] = useState<BezirkName | null>(null);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);
  const [active, setActive] = useState<Record<LayerKey, boolean>>({
    chancen: true,
    dichte: false,
    frequenz: false,
    luecken: false,
    schliessungen: false,
  });

  useEffect(() => {
    (async () => {
      try {
        const json = await (await fetch("/api/bakeries")).json();
        const fromApi: Bakery[] = json.bakeries ?? [];
        if (fromApi.length > 0) {
          setBakeries(fromApi);
          return;
        }
        // Build-Cache leer (z. B. Overpass-Drosselung beim Build) -> live im Browser nachladen.
        try {
          const live = await fetchBakeriesViaOverpass();
          if (live.length > 0) {
            setBakeries(live);
            setBakeriesNote(`${live.length} Bäckereien live aus OpenStreetMap geladen (Build-Cache war leer).`);
          } else {
            setBakeriesError(json.error ?? "Keine Bäckereien gefunden.");
          }
        } catch {
          setBakeriesError(
            "Bäckerei-Daten konnten nicht geladen werden (OpenStreetMap evtl. kurz überlastet). Bitte später neu laden.",
          );
        }
      } catch {
        setBakeriesError("Bäckerei-Daten konnten nicht geladen werden.");
      }
    })();
    fetch("/api/frequency")
      .then((r) => r.json())
      .then((json) => setPois(json.pois ?? []));
    fetch("/api/score")
      .then((r) => r.json())
      .then((json) => {
        const map: ScoreByBezirk = {};
        for (const entry of json.data ?? []) map[entry.bezirk] = entry.score;
        setScores(map);
      });
    fetch("/api/opportunities")
      .then((r) => r.json())
      .then((json) => setOpportunities(json.data ?? []));
    fetch("/api/snapshots")
      .then((r) => r.json())
      .then(setCollectionStats);
    fetch("/api/districts")
      .then((r) => (r.ok ? r.json() : null))
      .then(setDistrictsGeoJson)
      .catch(() => setDistrictsGeoJson(null));
  }, []);

  function toggleLayer(layer: LayerKey) {
    setActive((prev) => ({ ...prev, [layer]: !prev[layer] }));
  }

  const bakeryHeatPoints: HeatPoint[] = bakeries.map((b) => [b.lat, b.lon, 1]);
  const frequencyHeatPoints: HeatPoint[] = pois.map((p) => [p.lat, p.lon, 1]);

  return (
    <div>
      <LayerToggle active={active} onToggle={toggleLayer} />
      {bakeriesError && (
        <div style={{ padding: 8, background: "#ffebee", color: "#b71c1c", fontSize: "0.9em" }}>{bakeriesError}</div>
      )}
      {bakeriesNote && (
        <div style={{ padding: 8, background: "#e8f5e9", color: "#1b5e20", fontSize: "0.9em" }}>{bakeriesNote}</div>
      )}
      {active.schliessungen && collectionStats && (
        <div style={{ padding: 8 }}>
          <ClosureDataEmptyState stats={collectionStats} />
        </div>
      )}
      {selectedBezirk && scores[selectedBezirk] && (
        <div style={{ padding: 8, maxWidth: 480 }}>
          <ScoreBreakdownPanel title={`Potenzial-Score: ${selectedBezirk}`} result={scores[selectedBezirk]} />
        </div>
      )}
      {active.chancen && (
        <div style={{ padding: 8, fontSize: "0.85em", color: "#555" }}>
          🎯 <strong>Chancen-Layer:</strong> Bubble-Größe = Marktgröße, Farbe = Umsatz-Potenzial (🟥 niedrig → 🟩 hoch),
          Zahl = Index 0–100. Bubble antippen zeigt die Kennzahlen.
        </div>
      )}
      {active.chancen && selectedOpportunity && (
        <div style={{ padding: 8 }}>
          <OpportunityPanel o={selectedOpportunity} />
        </div>
      )}
      <MapContainer center={SALZBURG_CENTER} zoom={9} style={{ height: "70vh", width: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {active.chancen && opportunities.length > 0 && (
          <OpportunityBubbles opportunities={opportunities} onSelect={setSelectedOpportunity} />
        )}
        {active.dichte && bakeryHeatPoints.length > 0 && (
          <HeatmapLayer points={bakeryHeatPoints} options={{ gradient: { 0.4: "blue", 0.7: "lime", 1: "red" } }} />
        )}
        {active.dichte &&
          bakeries.map((b) => (
            <Marker key={`${b.osmType}-${b.osmId}`} position={[b.lat, b.lon]}>
              <Popup>
                <strong>{b.name ?? "Bäckerei (Name unbekannt in OSM)"}</strong>
                <br />
                {b.addr.street} {b.addr.housenumber}
                <br />
                {b.addr.postcode} {b.addr.city}
                <br />
                {b.bezirk ?? "Bezirk unbekannt"}
                <br />
                Öffnungszeiten (OSM-Rohwert): {b.openingHours ?? "nicht angegeben"}
              </Popup>
            </Marker>
          ))}
        {active.frequenz && frequencyHeatPoints.length > 0 && (
          <HeatmapLayer
            points={frequencyHeatPoints}
            options={{ gradient: { 0.4: "purple", 0.7: "orange", 1: "yellow" }, radius: 20 }}
          />
        )}
        {active.luecken && districtsGeoJson && (
          <GeoJSON
            data={districtsGeoJson}
            style={(feature) => ({
              fillColor: scoreColor(feature ? scores[feature.properties?.name as string]?.score ?? null : null),
              fillOpacity: 0.5,
              color: "#555",
              weight: 1,
            })}
            onEachFeature={(feature, layer) => {
              layer.on("click", () => setSelectedBezirk(feature.properties?.name as BezirkName));
              layer.bindTooltip(feature.properties?.name as string);
            }}
          />
        )}
      </MapContainer>
    </div>
  );
}
