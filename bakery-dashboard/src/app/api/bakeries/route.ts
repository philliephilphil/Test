import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Bakery, BakeriesMeta } from "@/lib/types";

export async function GET() {
  try {
    const [bakeriesRaw, metaRaw] = await Promise.all([
      readFile(path.join(process.cwd(), "data", "bakeries.json"), "utf-8"),
      readFile(path.join(process.cwd(), "data", "bakeries.meta.json"), "utf-8"),
    ]);
    const bakeries = JSON.parse(bakeriesRaw) as Bakery[];
    const meta = JSON.parse(metaRaw) as BakeriesMeta;
    return NextResponse.json({ bakeries, meta });
  } catch {
    return NextResponse.json(
      { bakeries: [], meta: null, error: "Noch keine Bäckerei-Daten. `npm run fetch:bakeries` ausführen." },
      { status: 200 },
    );
  }
}
