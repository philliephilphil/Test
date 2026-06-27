import { NextResponse } from "next/server";
import { BEZIRKE } from "@/lib/types";
import { getBedsForBezirk, getNightsForBezirk } from "@/lib/tourism";
import { getPopulationForBezirk } from "@/lib/population";

export async function GET() {
  const data = BEZIRKE.map((bezirk) => ({
    bezirk,
    nights: getNightsForBezirk(bezirk),
    beds: getBedsForBezirk(bezirk),
    population: getPopulationForBezirk(bezirk),
  }));
  return NextResponse.json({ data });
}
