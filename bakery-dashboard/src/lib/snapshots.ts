import { appendFile, mkdir, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import type { Bakery, BakerySnapshot, CollectionStats } from "./types";

const SNAPSHOT_PATH = path.join(process.cwd(), "data", "snapshots", "bakery-status.jsonl");

export function hashOpeningHours(openingHours: string | null): string | null {
  if (!openingHours) return null;
  return createHash("sha256").update(openingHours).digest("hex").slice(0, 16);
}

export function bakeryToSnapshot(bakery: Bakery, capturedAt: string): BakerySnapshot {
  return {
    osmId: bakery.osmId,
    capturedAt,
    openingHoursRaw: bakery.openingHours,
    openingHoursHash: hashOpeningHours(bakery.openingHours),
    tagsPresent: bakery.openingHours !== null,
    nameRaw: bakery.name,
  };
}

export async function appendSnapshots(snapshots: BakerySnapshot[]): Promise<void> {
  await mkdir(path.dirname(SNAPSHOT_PATH), { recursive: true });
  const lines = snapshots.map((s) => JSON.stringify(s)).join("\n") + "\n";
  await appendFile(SNAPSHOT_PATH, lines, "utf-8");
}

export async function readAllSnapshots(): Promise<BakerySnapshot[]> {
  try {
    const raw = await readFile(SNAPSHOT_PATH, "utf-8");
    return raw
      .split("\n")
      .filter((line) => line.trim().length > 0)
      .map((line) => JSON.parse(line) as BakerySnapshot);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}

export async function getCollectionStats(): Promise<CollectionStats> {
  const snapshots = await readAllSnapshots();
  if (snapshots.length === 0) {
    return { since: null, snapshotCount: 0, daysCovered: 0 };
  }
  const timestamps = snapshots.map((s) => new Date(s.capturedAt).getTime());
  const since = new Date(Math.min(...timestamps)).toISOString();
  const distinctDays = new Set(snapshots.map((s) => s.capturedAt.slice(0, 10)));
  return { since, snapshotCount: snapshots.length, daysCovered: distinctDays.size };
}
