// Best-effort data fetch run at build time (npm "prebuild" hook).
//
// On a host with internet (e.g. the Vercel build environment) this populates
// data/bezirke.geojson, data/bakeries.json and data/frequency-pois.json so the
// deployed site shows real data immediately instead of empty states.
//
// Each step runs as an isolated child process so that a failing fetch (the
// fetch scripts call process.exit(1) on error) NEVER aborts the build — the
// app degrades gracefully to its "noch keine Daten" states. Weather is fetched
// live per request and is not part of this step.
//
// Order matters: Bezirk boundaries must be fetched before bakeries/POIs, since
// those are tagged with the Bezirk they fall into.
import { spawnSync } from "node:child_process";
import path from "node:path";

const steps: { label: string; script: string }[] = [
  { label: "Bezirksgrenzen", script: "scripts/fetch-bezirke.ts" },
  { label: "Bäckereien", script: "scripts/fetch-bakeries.ts" },
  { label: "Frequenz-POIs", script: "scripts/fetch-frequency-pois.ts" },
];

let failures = 0;
for (const { label, script } of steps) {
  console.log(`\n[build-data] ${label}: ${script}`);
  const result = spawnSync("npx", ["tsx", path.join(process.cwd(), script)], {
    stdio: "inherit",
    env: process.env,
  });
  if (result.status !== 0 || result.error) {
    failures++;
    console.warn(
      `[build-data] WARN: "${label}" fehlgeschlagen (${result.error?.message ?? `exit ${result.status}`}). ` +
        `Build läuft weiter; die App fällt für diese Schicht auf den Leerzustand zurück.`,
    );
  }
}

if (failures > 0) {
  console.warn(`[build-data] ${failures}/${steps.length} Schritt(e) ohne Daten — siehe Warnungen oben.`);
} else {
  console.log("[build-data] Alle Datensätze erfolgreich abgerufen.");
}
// Always exit 0: data fetch is optional, the build must not fail because of it.
process.exit(0);
