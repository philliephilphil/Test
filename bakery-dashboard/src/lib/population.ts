import populationData from "../../data/population/einwohner-by-bezirk.json";
import type { BezirkName, PopulationEntry, Source } from "./types";

type PopulationFile = {
  source: Source;
  entries: Record<string, { inhabitants: number | null; period: string }>;
};

const populationFile = populationData as PopulationFile;

export function getPopulationForBezirk(bezirk: BezirkName): PopulationEntry {
  const entry = populationFile.entries[bezirk];
  if (!entry || entry.inhabitants === null) {
    return { inhabitants: null, period: entry?.period ?? "unbekannt", source: null };
  }
  return { inhabitants: entry.inhabitants, period: entry.period, source: populationFile.source };
}
