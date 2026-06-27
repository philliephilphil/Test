"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, GeoJSON } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import HeatmapLayer, { type HeatPoint } from "./HeatmapLayer";
import LayerToggle, { type LayerKey } from "./LayerToggle";
import ScoreBreakdownPanel from "./ScoreBreakdownPanel";
import ClosureDataEmptyState from "./ClosureDataEmptyState";
import type { Bakery, BezirkName, CollectionStats, FrequencyPoi, ScoreResult } from "@/lib/types";

const SALZBURG_CENTER: [number, number] = [47.45, 13.1];

type ScoreByBezirk = Record<string, ScoreResult>;

function scoreColor(score: number | null): string {
  if (score === null) return "#cccccc";
  // low score -> light, high score -> saturated orange/red (more potential)
  const hue = 30;
  const lightness = 90 - score * 50;
  return `hsl(${hue}, 80%, ${lightness}%)`;
}

export default function MapView() {
  const [bakeries, setBakeries] = useState<Bakery[]>([]);
  const [bakeriesError, setBakeriesError] = useState<string | null>(null);
  const [pois, setPois] = useState<FrequencyPoi[]>([]);
  const [scores, setScores] = useState<ScoreByBezirk>({});
  const [districtsGeoJson, setDistrictsGeoJson] = useState<GeoJSON.FeatureCollection | null>(null);
  const [collectionStats, setCollectionStats] = useState<CollectionStats | null>(null);
  const [selectedBezirk, setSelectedBezirk] = useState<BezirkName | null>(null);
  const [active, setActive] = useState<Record<LayerKey, boolean>>({
    dichte: true,
    frequenz: false,
    luecken: false,
    schliessungen: false,
  });

  useEffect(() => {
    fetch("/api/bakeries")
      .then((r) => r.json())
      .then((json) => {
        setBakeries(json.bakeries ?? []);
        if (json.error) setBakeriesError(json.error);
      });
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
      <MapContainer center={SALZBURG_CENTER} zoom={9} style={{ height: "70vh", width: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
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
