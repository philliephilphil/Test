import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { BEZIRKE, type Bakery, type FrequencyPoi, type ScoreResult } from "@/lib/types";
import { DISTRICTS } from "@/lib/districts";
import { computeWeatherFavorability, fetchTodayWeather } from "@/lib/weather";
import { normalizeTourismIntensity } from "@/lib/tourism";
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

export async function GET() {
  const bakeries = await readJsonOrEmpty<Bakery[]>("bakeries.json", []);
  const pois = await readJsonOrEmpty<FrequencyPoi[]>("frequency-pois.json", []);

  const bakeryCounts = BEZIRKE.map((b) => bakeries.filter((bak) => bak.bezirk === b).length);
  const haveBakeryData = bakeryCounts.some((c) => c > 0);

  const results: { bezirk: string; score: ScoreResult }[] = await Promise.all(
    BEZIRKE.map(async (bezirk) => {
      const ownCount = bakeries.filter((b) => b.bezirk === bezirk).length;
      const bakeryGap = haveBakeryData ? 1 - normalize(ownCount, bakeryCounts) : null;

      const frequency = computeFrequencyPotential(bezirk, BEZIRKE, pois);
      const tourismIntensity = normalizeTourismIntensity(bezirk, BEZIRKE);

      const district = DISTRICTS.find((d) => d.name === bezirk)!;
      let weatherFavorability: number | null = null;
      try {
        const { result, source } = await fetchTodayWeather(district.referencePoint.lat, district.referencePoint.lon);
        weatherFavorability = computeWeatherFavorability(result.temperatureMaxC, result.precipitationMm, source).value;
      } catch {
        weatherFavorability = null;
      }

      const score = computePotentialScore({
        bakeryGap,
        frequencyPotential: frequency.value,
        tourismIntensity,
        weatherFavorability,
      });
      return { bezirk, score };
    }),
  );

  return NextResponse.json({ data: results });
}
