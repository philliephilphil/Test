import nightsData from "../../data/tourism/nights-by-bezirk.json";
import bettenData from "../../data/tourism/betten-by-bezirk.json";
import type { BettenEntry, BezirkName, Source, TourismEntry } from "./types";

type NightsFile = {
  period: string;
  source: Source;
  entries: Record<string, { nights: number | null }>;
};

type BettenFile = {
  period: string;
  source: Source;
  entries: Record<string, { beds: number | null }>;
};

const nightsFile = nightsData as NightsFile;
const bettenFile = bettenData as BettenFile;

export function getNightsForBezirk(bezirk: BezirkName): TourismEntry {
  const entry = nightsFile.entries[bezirk];
  if (!entry || entry.nights === null) {
    return { nights: null, period: nightsFile.period, source: null };
  }
  return { nights: entry.nights, period: nightsFile.period, source: nightsFile.source };
}

export function getBedsForBezirk(bezirk: BezirkName): BettenEntry {
  const entry = bettenFile.entries[bezirk];
  if (!entry || entry.beds === null) {
    return { beds: null, period: bettenFile.period, source: null };
  }
  return { beds: entry.beds, period: bettenFile.period, source: bettenFile.source };
}

// Normalizes nights across all Bezirke to a 0..1 intensity score. Returns
// null when fewer than 2 Bezirke have real data (normalization meaningless).
export function normalizeTourismIntensity(bezirk: BezirkName, allBezirke: BezirkName[]): number | null {
  const values = allBezirke
    .map((b) => getNightsForBezirk(b).nights)
    .filter((v): v is number => v !== null);
  if (values.length < 2) return null;
  const entry = getNightsForBezirk(bezirk);
  if (entry.nights === null) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max === min) return 1;
  return (entry.nights - min) / (max - min);
}
