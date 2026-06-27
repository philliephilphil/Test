// Fetches all shop=bakery POIs in the Bundesland Salzburg from Overpass and
// writes data/bakeries.json + data/bakeries.meta.json. Run data/bezirke.geojson
// (npm run fetch:bezirke) first so each bakery can be tagged with its Bezirk.
// Requires normal internet access — see README "Bekannte Grenzen".
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { buildBakeryQuery, elementLatLon, runOverpassQuery } from "../src/lib/overpass";
import { findBezirkForPoint, loadBezirkPolygons } from "../src/lib/geo";
import type { Bakery, BakeriesMeta } from "../src/lib/types";

async function main() {
  console.log("Fetching bakeries from Overpass...");
  const response = await runOverpassQuery(buildBakeryQuery());

  let polygons: Awaited<ReturnType<typeof loadBezirkPolygons>> = [];
  try {
    polygons = await loadBezirkPolygons();
  } catch {
    console.warn("data/bezirke.geojson not found — bakeries will be written with bezirk=null. Run `npm run fetch:bezirke` first.");
  }

  const bakeries: Bakery[] = [];
  for (const el of response.elements) {
    if (el.type !== "node" && el.type !== "way") continue;
    const tags = el.tags ?? {};
    if (tags.shop !== "bakery") continue;
    const pos = elementLatLon(el);
    if (!pos) continue;

    bakeries.push({
      osmId: el.id,
      osmType: el.type,
      name: tags.name ?? null,
      lat: pos.lat,
      lon: pos.lon,
      openingHours: tags.opening_hours ?? null,
      addr: {
        street: tags["addr:street"],
        housenumber: tags["addr:housenumber"],
        postcode: tags["addr:postcode"],
        city: tags["addr:city"],
      },
      website: tags.website,
      phone: tags.phone,
      bezirk: polygons.length > 0 ? findBezirkForPoint(pos.lon, pos.lat, polygons) : null,
    });
  }

  if (bakeries.length === 0) {
    console.warn("WARNING: 0 bakeries found. Expected a few hundred — check the Overpass query / area filter before trusting this output.");
  } else if (bakeries.length > 5000) {
    console.warn(`WARNING: ${bakeries.length} bakeries found, implausibly high for Salzburger Land — check whether the area filter accidentally matched the wrong "Salzburg".`);
  }

  await writeFile(path.join(process.cwd(), "data", "bakeries.json"), JSON.stringify(bakeries, null, 2), "utf-8");

  const meta: BakeriesMeta = {
    fetchedAt: new Date().toISOString(),
    source: "https://overpass-api.de/api/interpreter",
    query: 'shop=bakery within area[name=Salzburg][boundary=administrative][admin_level=4]',
    relationId: -1,
    count: bakeries.length,
  };
  await writeFile(path.join(process.cwd(), "data", "bakeries.meta.json"), JSON.stringify(meta, null, 2), "utf-8");

  console.log(`Wrote ${bakeries.length} bakeries to data/bakeries.json`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
