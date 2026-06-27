"use client";

import { useEffect, useState } from "react";
import { DISTRICTS } from "@/lib/districts";
import { BRANDNER_BRANCHES } from "@/lib/brandner";
import ScoreBreakdownPanel from "./ScoreBreakdownPanel";
import type { ScoreResult } from "@/lib/types";

function haversineKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function nearestBranchDistanceKm(point: { lat: number; lon: number }): number {
  return Math.min(...BRANDNER_BRANCHES.map((branch) => haversineKm(point, branch)));
}

export default function BrandnerOpportunityList() {
  const [scores, setScores] = useState<Record<string, ScoreResult>>({});

  useEffect(() => {
    fetch("/api/score")
      .then((r) => r.json())
      .then((json) => {
        const map: Record<string, ScoreResult> = {};
        for (const entry of json.data ?? []) map[entry.bezirk] = entry.score;
        setScores(map);
      });
  }, []);

  const ranked = DISTRICTS.map((d) => ({
    district: d,
    distanceKm: nearestBranchDistanceKm(d.referencePoint),
    score: scores[d.name],
  })).sort((a, b) => a.distanceKm - b.distanceKm);

  return (
    <div>
      <h2>Potenzial nach Nähe zu bestehenden Filialen</h2>
      {ranked.map(({ district, distanceKm, score }) => (
        <div key={district.name} style={{ marginBottom: 12 }}>
          <p>
            <strong>{district.name}</strong> ({district.referenceTown}) — ~{distanceKm.toFixed(0)} km von der
            nächsten Brandner-Filiale
          </p>
          {score ? (
            <ScoreBreakdownPanel title={`Potenzial-Score ${district.name}`} result={score} />
          ) : (
            <p>Score lädt...</p>
          )}
        </div>
      ))}
    </div>
  );
}
