import { NextResponse } from "next/server";
import { BEZIRKE } from "@/lib/types";
import { DISTRICTS } from "@/lib/districts";
import { computeWeatherFavorability, fetchTodayWeather } from "@/lib/weather";

export async function GET() {
  const results = await Promise.all(
    BEZIRKE.map(async (bezirk) => {
      const district = DISTRICTS.find((d) => d.name === bezirk)!;
      try {
        const { result, source } = await fetchTodayWeather(district.referencePoint.lat, district.referencePoint.lon);
        const favorability = computeWeatherFavorability(result.temperatureMaxC, result.precipitationMm, source);
        return { bezirk, favorability };
      } catch (err) {
        return { bezirk, favorability: null, error: err instanceof Error ? err.message : "Wetterabfrage fehlgeschlagen" };
      }
    }),
  );
  return NextResponse.json({ data: results });
}
