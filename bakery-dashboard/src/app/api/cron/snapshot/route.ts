import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { appendSnapshots, bakeryToSnapshot } from "@/lib/snapshots";
import type { Bakery } from "@/lib/types";

// HTTP endpoint for an external cron (e.g. a scheduled GitHub Action or
// hosting-provider cron) to trigger today's snapshot in production, where
// the npm script isn't directly invokable.
export async function POST() {
  try {
    const raw = await readFile(path.join(process.cwd(), "data", "bakeries.json"), "utf-8");
    const bakeries = JSON.parse(raw) as Bakery[];
    const capturedAt = new Date().toISOString();
    const snapshots = bakeries.map((b) => bakeryToSnapshot(b, capturedAt));
    await appendSnapshots(snapshots);
    return NextResponse.json({ ok: true, count: snapshots.length, capturedAt });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "snapshot failed" }, { status: 500 });
  }
}
