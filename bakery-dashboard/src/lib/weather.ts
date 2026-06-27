// Open-Meteo client + a documented behavioral heuristic translating
// temperature/precipitation into a 0..1 "Wetter-Gunst" (weather favorability)
// score for bakery footfall.
//
// IMPORTANT: this heuristic is a named-constant, documented ASSUMPTION, not a
// measured correlation. There is no real dataset linking Salzburger-Land
// bakery footfall to weather; we therefore use a transparent, reasoned
// estimate instead of inventing a fake "measured" number. The rule that
// fired and the raw inputs are always returned alongside the score so the UI
// can show exactly why a value was produced (see ScoreBreakdownPanel).
import type { Source, WeatherFavorability } from "./types";

const FORECAST_ENDPOINT = "https://api.open-meteo.com/v1/forecast";
const ARCHIVE_ENDPOINT = "https://archive-api.open-meteo.com/v1/archive";

// Temperature bands (°C, max daily temperature) -> base favorability.
// Reasoning: frost suppresses casual walk-in trade; mild-to-warm weather
// brings people outdoors and into shops; very hot days keep the morning
// rush (bakeries open early) but visibly suppress afternoon footfall.
const FROST_MAX_C = 0;
const FROST_FAVORABILITY = 0.3;
const MILD_MAX_C = 15;
const MILD_FAVORABILITY = 0.5;
const IDEAL_MAX_C = 26;
const IDEAL_FAVORABILITY = 0.9;
const HOT_MAX_C = 32;
const HOT_FAVORABILITY = 0.8; // business shifts to the morning, but mostly compensated
const EXTREME_HEAT_FAVORABILITY = 0.6; // afternoon footfall drops noticeably

// Heavy precipitation/storm dampens footfall regardless of temperature band.
const STORM_PRECIPITATION_MM_THRESHOLD = 15;
const STORM_DAMPENING_FACTOR = 0.7;

function baseFavorabilityForTemperature(tempMaxC: number): { value: number; basis: string } {
  if (tempMaxC < FROST_MAX_C) {
    return { value: FROST_FAVORABILITY, basis: `Frost (${tempMaxC}°C < ${FROST_MAX_C}°C): wenig Lust auf Wegerl/Spaziergang` };
  }
  if (tempMaxC < MILD_MAX_C) {
    return { value: MILD_FAVORABILITY, basis: `Kühl (${tempMaxC}°C, 0–${MILD_MAX_C}°C): normales Alltagsgeschäft` };
  }
  if (tempMaxC < IDEAL_MAX_C) {
    return { value: IDEAL_FAVORABILITY, basis: `Schönwetter (${tempMaxC}°C, ${MILD_MAX_C}–${IDEAL_MAX_C}°C): viel Spaziergang-/Tourist*innen-Aktivität` };
  }
  if (tempMaxC <= HOT_MAX_C) {
    return { value: HOT_FAVORABILITY, basis: `Heiß (${tempMaxC}°C, ${IDEAL_MAX_C}–${HOT_MAX_C}°C): Geschäft verschiebt sich auf den Vormittag, größtenteils kompensiert` };
  }
  return { value: EXTREME_HEAT_FAVORABILITY, basis: `Extremhitze (${tempMaxC}°C > ${HOT_MAX_C}°C): Vormittagsgeschäft hält, Nachmittagsfrequenz bricht ein` };
}

export function computeWeatherFavorability(
  tempMaxC: number,
  precipitationMm: number,
  source: Source,
): WeatherFavorability {
  const base = baseFavorabilityForTemperature(tempMaxC);
  let value = base.value;
  let basis = base.basis;
  if (precipitationMm > STORM_PRECIPITATION_MM_THRESHOLD) {
    value *= STORM_DAMPENING_FACTOR;
    basis += `; Starkregen/Sturm (${precipitationMm}mm > ${STORM_PRECIPITATION_MM_THRESHOLD}mm): zusätzlicher Abschlag ×${STORM_DAMPENING_FACTOR}`;
  }
  return {
    value: Math.round(value * 100) / 100,
    basis,
    temperatureMaxC: tempMaxC,
    precipitationMm,
    source,
  };
}

type DailyWeatherResult = {
  temperatureMaxC: number;
  precipitationMm: number;
};

async function fetchDaily(endpoint: string, lat: number, lon: number, params: Record<string, string>): Promise<DailyWeatherResult> {
  const url = new URL(endpoint);
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lon));
  url.searchParams.set("daily", "temperature_2m_max,precipitation_sum");
  url.searchParams.set("timezone", "Europe/Vienna");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Open-Meteo request failed: ${res.status} ${res.statusText}`);
  const json = await res.json();
  const idx = json.daily.time.length - 1;
  return {
    temperatureMaxC: json.daily.temperature_2m_max[idx],
    precipitationMm: json.daily.precipitation_sum[idx],
  };
}

// Current/today's forecast for a reference point.
export async function fetchTodayWeather(lat: number, lon: number): Promise<{ result: DailyWeatherResult; source: Source }> {
  const result = await fetchDaily(FORECAST_ENDPOINT, lat, lon, { forecast_days: "1" });
  return {
    result,
    source: {
      url: `${FORECAST_ENDPOINT}?latitude=${lat}&longitude=${lon}`,
      retrievedAt: new Date().toISOString(),
      note: "Open-Meteo Forecast API, heutiger Tageswert",
    },
  };
}

// Historical day (ERA5 archive), e.g. for seasonality baselines.
export async function fetchHistoricalDayWeather(
  lat: number,
  lon: number,
  isoDate: string,
): Promise<{ result: DailyWeatherResult; source: Source }> {
  const result = await fetchDaily(ARCHIVE_ENDPOINT, lat, lon, { start_date: isoDate, end_date: isoDate });
  return {
    result,
    source: {
      url: `${ARCHIVE_ENDPOINT}?latitude=${lat}&longitude=${lon}&start_date=${isoDate}&end_date=${isoDate}`,
      retrievedAt: new Date().toISOString(),
      note: `Open-Meteo Archive API (ERA5), ${isoDate}`,
    },
  };
}
