// Static reference data for the 6 Bezirke. Reference coordinates are
// representative points (the Bezirk's main town) used to sample
// Bezirk-resolution weather — not a claim of precise per-bakery weather.
import type { BezirkName } from "./types";

export type DistrictInfo = {
  name: BezirkName;
  referencePoint: { lat: number; lon: number };
  referenceTown: string;
};

export const DISTRICTS: DistrictInfo[] = [
  { name: "Pinzgau", referencePoint: { lat: 47.3239, lon: 12.7959 }, referenceTown: "Zell am See" },
  { name: "Pongau", referencePoint: { lat: 47.35, lon: 13.2 }, referenceTown: "St. Johann im Pongau" },
  { name: "Tennengau", referencePoint: { lat: 47.6833, lon: 13.1 }, referenceTown: "Hallein" },
  { name: "Flachgau", referencePoint: { lat: 47.9667, lon: 13.2333 }, referenceTown: "Neumarkt am Wallersee" },
  { name: "Lungau", referencePoint: { lat: 47.1167, lon: 13.8167 }, referenceTown: "Tamsweg" },
  { name: "Salzburg-Stadt", referencePoint: { lat: 47.8095, lon: 13.055 }, referenceTown: "Salzburg (Altstadt)" },
];

export function getDistrict(name: BezirkName): DistrictInfo {
  const d = DISTRICTS.find((d) => d.name === name);
  if (!d) throw new Error(`Unknown Bezirk: ${name}`);
  return d;
}
