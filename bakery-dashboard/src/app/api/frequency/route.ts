import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { FrequencyPoi } from "@/lib/types";

export async function GET() {
  try {
    const raw = await readFile(path.join(process.cwd(), "data", "frequency-pois.json"), "utf-8");
    const pois = JSON.parse(raw) as FrequencyPoi[];
    return NextResponse.json({ pois });
  } catch {
    return NextResponse.json(
      { pois: [], error: "Noch keine Frequenz-POI-Daten. `npm run fetch:frequency-pois` ausführen." },
      { status: 200 },
    );
  }
}
