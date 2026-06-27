import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";

export async function GET() {
  try {
    const raw = await readFile(path.join(process.cwd(), "data", "bezirke.geojson"), "utf-8");
    return new NextResponse(raw, { headers: { "Content-Type": "application/geo+json" } });
  } catch {
    return NextResponse.json({ type: "FeatureCollection", features: [] });
  }
}
