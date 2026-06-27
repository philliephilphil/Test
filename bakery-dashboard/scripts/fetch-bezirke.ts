// Fetches the 6 Bezirk boundary polygons (5 Politische Bezirke +
// Statutarstadt Salzburg) and writes them as GeoJSON to data/bezirke.geojson.
// Requires normal internet access (this script cannot run inside a
// network-restricted sandbox) — see README "Bekannte Grenzen".
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { buildBezirkeQuery, runOverpassQuery, type OverpassElement } from "../src/lib/overpass";
import { assembleRingsFromWays, OSM_BEZIRK_NAME_TO_GAU } from "../src/lib/geo";
import { BEZIRKE } from "../src/lib/types";

async function main() {
  console.log("Fetching Bezirk boundaries from Overpass...");
  const response = await runOverpassQuery(buildBezirkeQuery());

  const waysById = new Map<number, { lat: number; lon: number }[]>();
  for (const el of response.elements) {
    if (el.type === "way" && el.geometry) {
      waysById.set(el.id, el.geometry.map((g) => ({ lat: g.lat, lon: g.lon })));
    }
  }

  const features: { properties: { name: string }; geometry: { type: "Polygon"; coordinates: number[][][] } }[] = [];
  const foundGauNames = new Set<string>();

  for (const el of response.elements) {
    if (el.type !== "relation" || !el.tags?.name) continue;
    const gauName = OSM_BEZIRK_NAME_TO_GAU[el.tags.name];
    if (!gauName) {
      console.warn(`Unmapped Bezirk relation name "${el.tags.name}" (relation ${el.id}) — skipped.`);
      continue;
    }
    const outerWays = (el.members ?? [])
      .filter((m) => m.type === "way" && (m.role === "outer" || m.role === ""))
      .map((m) => waysById.get(m.ref))
      .filter((w): w is { lat: number; lon: number }[] => Array.isArray(w) && w.length > 0);

    const rings = assembleRingsFromWays(outerWays);
    if (rings.length === 0) {
      console.warn(`No closed ring assembled for "${gauName}" (relation ${el.id}) — skipped.`);
      continue;
    }
    features.push({
      properties: { name: gauName },
      geometry: { type: "Polygon", coordinates: rings },
    });
    foundGauNames.add(gauName);
  }

  const missing = BEZIRKE.filter((b) => !foundGauNames.has(b));
  if (missing.length > 0) {
    console.warn(`WARNING: missing Bezirk polygons for: ${missing.join(", ")}. Check the OSM_BEZIRK_NAME_TO_GAU mapping in src/lib/geo.ts.`);
  }
  if (foundGauNames.size !== 6 || features.length !== 6) {
    console.warn(`WARNING: expected exactly 6 Bezirk polygons, got ${features.length}. Verify before trusting downstream Bezirk-zuordnung.`);
  }

  const geojson = { type: "FeatureCollection", features };
  const outPath = path.join(process.cwd(), "data", "bezirke.geojson");
  await writeFile(outPath, JSON.stringify(geojson, null, 2), "utf-8");
  console.log(`Wrote ${features.length} Bezirk polygons to ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
