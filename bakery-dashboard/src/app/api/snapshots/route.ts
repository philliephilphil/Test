import { NextResponse } from "next/server";
import { getCollectionStats } from "@/lib/snapshots";

export async function GET() {
  const stats = await getCollectionStats();
  return NextResponse.json(stats);
}
