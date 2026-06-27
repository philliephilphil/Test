// Frequency-potential ("wo sind viele Leute") proxy. Combines population,
// accommodation/bed capacity, and OSM POI density per Bezirk into a 0..1
// factor. Explicit proxy for foot-traffic, NOT real-time traffic and NOT
// Google data (unavailable via any free/keyless API).
import type { BezirkName, FrequencyPoi } from "./types";
import { getPopulationForBezirk } from "./population";
import { getBedsForBezirk } from "./tourism";

export type FrequencyBreakdown = {
  value: number | null;
  populationScore: number | null;
  bedsScore: number | null;
  poiDensityScore: number | null;
  poiCount: number;
};

function normalize(value: number, values: number[]): number {
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max === min) return 1;
  return (value - min) / (max - min);
}

export function computeFrequencyPotential(
  bezirk: BezirkName,
  allBezirke: BezirkName[],
  pois: FrequencyPoi[],
): FrequencyBreakdown {
  const populations = allBezirke
    .map((b) => getPopulationForBezirk(b).inhabitants)
    .filter((v): v is number => v !== null);
  const beds = allBezirke
    .map((b) => getBedsForBezirk(b).beds)
    .filter((v): v is number => v !== null);
  const poiCounts = allBezirke.map((b) => pois.filter((p) => p.bezirk === b).length);

  const ownPopulation = getPopulationForBezirk(bezirk).inhabitants;
  const ownBeds = getBedsForBezirk(bezirk).beds;
  const ownPoiCount = pois.filter((p) => p.bezirk === bezirk).length;

  const populationScore =
    ownPopulation !== null && populations.length >= 2 ? normalize(ownPopulation, populations) : null;
  const bedsScore = ownBeds !== null && beds.length >= 2 ? normalize(ownBeds, beds) : null;
  const poiDensityScore = poiCounts.some((c) => c > 0) ? normalize(ownPoiCount, poiCounts) : null;

  const parts = [populationScore, bedsScore, poiDensityScore].filter((v): v is number => v !== null);
  const value = parts.length > 0 ? parts.reduce((a, b) => a + b, 0) / parts.length : null;

  return {
    value: value !== null ? Math.round(value * 100) / 100 : null,
    populationScore,
    bedsScore,
    poiDensityScore,
    poiCount: ownPoiCount,
  };
}
