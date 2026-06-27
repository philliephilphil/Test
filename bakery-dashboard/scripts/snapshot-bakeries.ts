// Daily snapshot job: reads the current data/bakeries.json and appends one
// metadata snapshot per bakery to data/snapshots/bakery-status.jsonl. This
// never records "open"/"closed" — only OSM tag metadata over time, the
// honest basis for the closures layer's "Datensammlung läuft" view.
import { readFile } from "node:fs/promises";
import path from "node:path";
import { appendSnapshots, bakeryToSnapshot } from "../src/lib/snapshots";
import type { Bakery } from "../src/lib/types";

async function main() {
  const raw = await readFile(path.join(process.cwd(), "data", "bakeries.json"), "utf-8");
  const bakeries = JSON.parse(raw) as Bakery[];
  const capturedAt = new Date().toISOString();
  const snapshots = bakeries.map((b) => bakeryToSnapshot(b, capturedAt));
  await appendSnapshots(snapshots);
  console.log(`Appended ${snapshots.length} snapshots at ${capturedAt}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
