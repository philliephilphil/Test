import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { BEZIRKE, type Bakery, type FrequencyPoi, type Opportunity } from "@/lib/types";
import { DISTRICTS } from "@/lib/districts";
import { computeWeatherFavorability, fetchTodayWeather } from "@/lib/weather";
import { getBedsForBezirk, getNightsForBezirk, normalizeTourismIntensity } from "@/lib/tourism";
import { getPopulationForBezirk } from "@/lib/population";
import { computeFrequencyPotential } from "@/lib/frequency";
import { computePotentialScore } from "@/lib/score";

async function readJsonOrEmpty<T>(file: string, fallback: T): Promise<T> {
  try {
    const raw = await readFile(path.join(process.cwd(), "data", file), "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function normalize(value: number, values: number[]): number {
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max === min) return 1;
  return (value - min) / (max - min);
}

function avg(nums: (number | null)[]): number | null {
  const vals = nums.filter((v): v is number => v !== null);
  if (vals.length === 0) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

export async function GET() {
  const bakeries = await readJsonOrEmpty<Bakery[]>("bakeries.json", []);
  const pois = await readJsonOrEmpty<FrequencyPoi[]>("frequency-pois.json", []);

  const counts = BEZIRKE.map((b) => bakeries.filter((x) => x.bezirk === b).length);
  const haveBakeryData = counts.some((c) => c > 0);
  const populations = BEZIRKE.map((b) => getPopulationForBezirk(b).inhabitants).filter(
    (v): v is number => v !== null,
  );

  // Pre-compute supply (bakeries per 10k) per Bezirk so we can describe a
  // Bezirk relative to the others ("unter-/überdurchschnittlich versorgt").
  const supplyByBezirk = new Map<string, number | null>();
  BEZIRKE.forEach((b, i) => {
    const pop = getPopulationForBezirk(b).inhabitants;
    // Only meaningful once real bakery data exists — otherwise "0" would
    // falsely imply there are zero bakeries rather than "no data yet".
    supplyByBezirk.set(b, haveBakeryData && pop && pop > 0 ? Math.round((counts[i] / pop) * 10000 * 100) / 100 : null);
  });
  const supplyValues = [...supplyByBezirk.values()].filter((v): v is number => v !== null);
  const avgSupply = supplyValues.length > 0 ? avg(supplyValues) : null;

  const data: Opportunity[] = await Promise.all(
    BEZIRKE.map(async (bezirk, i): Promise<Opportunity> => {
      const district = DISTRICTS.find((d) => d.name === bezirk)!;
      const bakeryCount = counts[i];
      const population = getPopulationForBezirk(bezirk).inhabitants;
      const nights = getNightsForBezirk(bezirk).nights;
      const beds = getBedsForBezirk(bezirk).beds;

      const frequency = computeFrequencyPotential(bezirk, BEZIRKE, pois).value;
      const tourismIntensity = normalizeTourismIntensity(bezirk, BEZIRKE);
      const bakeryGap = haveBakeryData ? 1 - normalize(bakeryCount, counts) : null;

      let weatherFavorability: number | null = null;
      try {
        const { result, source } = await fetchTodayWeather(
          district.referencePoint.lat,
          district.referencePoint.lon,
        );
        weatherFavorability = computeWeatherFavorability(
          result.temperatureMaxC,
          result.precipitationMm,
          source,
        ).value;
      } catch {
        weatherFavorability = null;
      }

      const opportunityScore = computePotentialScore({
        bakeryGap,
        frequencyPotential: frequency,
        tourismIntensity,
        weatherFavorability,
      }).score;

      const populationNorm =
        population !== null && populations.length >= 2 ? normalize(population, populations) : null;
      const marketSize = avg([populationNorm, tourismIntensity, frequency]);
      const supplyPer10k = supplyByBezirk.get(bezirk) ?? null;

      // "Warum hier" — kurze, datengetriebene Begründung.
      const reasons: string[] = [];
      if (tourismIntensity !== null && tourismIntensity >= 0.6) reasons.push("hohe Tourismusfrequenz");
      if (frequency !== null && frequency >= 0.6) reasons.push("hohe Alltagsfrequenz/Einzugsstärke");
      if (populationNorm !== null && populationNorm >= 0.6) reasons.push("großes Einwohner-Einzugsgebiet");
      if (supplyPer10k !== null && avgSupply !== null) {
        if (supplyPer10k < avgSupply * 0.85) reasons.push("unterdurchschnittlich mit Bäckereien versorgt");
        else if (supplyPer10k > avgSupply * 1.15) reasons.push("bereits überdurchschnittlich versorgt");
      }
      const drivers =
        reasons.length > 0
          ? reasons.join(" · ")
          : haveBakeryData
            ? "durchschnittliche Werte über alle Faktoren"
            : "Bäckerei-Versorgung noch ohne Daten — Bewertung aus Tourismus/Frequenz/Wetter";

      return {
        bezirk,
        referencePoint: district.referencePoint,
        opportunityScore,
        marketSize: marketSize !== null ? Math.round(marketSize * 100) / 100 : null,
        bakeryCount,
        population,
        nights,
        beds,
        frequency,
        tourismIntensity: tourismIntensity !== null ? Math.round(tourismIntensity * 100) / 100 : null,
        weatherFavorability,
        supplyPer10k,
        drivers,
      };
    }),
  );

  return NextResponse.json({ data });
}
