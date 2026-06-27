// Fetches the OSM frequency-proxy POIs (transit, parking, attractions,
// shops) and writes data/frequency-pois.json. Run `npm run fetch:bezirke`
// first so each POI can be tagged with its Bezirk.
// Requires normal internet access — see README "Bekannte Grenzen".
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { buildFrequencyPoiQuery, classifyFrequencyCategory, elementLatLon, runOverpassQuery } from "../src/lib/overpass";
import { findBezirkForPoint, loadBezirkPolygons } from "../src/lib/geo";
import type { FrequencyPoi } from "../src/lib/types";

async function main() {
  console.log("Fetching frequency-proxy POIs from Overpass...");
  const response = await runOverpassQuery(buildFrequencyPoiQuery());

  let polygons: Awaited<ReturnType<typeof loadBezirkPolygons>> = [];
  try {
    polygons = await loadBezirkPolygons();
  } catch {
    console.warn("data/bezirke.geojson not found — POIs will be written with bezirk=null. Run `npm run fetch:bezirke` first.");
  }

  const pois: FrequencyPoi[] = [];
  for (const el of response.elements) {
    if (el.type !== "node") continue;
    const tags = el.tags ?? {};
    const category = classifyFrequencyCategory(tags);
    if (!category) continue;
    const pos = elementLatLon(el);
    if (!pos) continue;

    pois.push({
      osmId: el.id,
      category,
      lat: pos.lat,
      lon: pos.lon,
      bezirk: polygons.length > 0 ? findBezirkForPoint(pos.lon, pos.lat, polygons) : null,
    });
  }

  await writeFile(path.join(process.cwd(), "data", "frequency-pois.json"), JSON.stringify(pois, null, 2), "utf-8");
  console.log(`Wrote ${pois.length} frequency-proxy POIs to data/frequency-pois.json`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
