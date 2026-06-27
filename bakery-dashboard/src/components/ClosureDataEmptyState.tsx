import type { CollectionStats } from "@/lib/types";

export default function ClosureDataEmptyState({ stats }: { stats: CollectionStats }) {
  if (stats.snapshotCount === 0) {
    return (
      <div style={{ padding: 16, background: "#fff8e1", border: "1px solid #ffe082", borderRadius: 8 }}>
        <strong>Datensammlung läuft seit Start.</strong>
        <p>
          Es gibt keine API, die echte Schließungs-/Urlaubshäufigkeit von Bäckereien liefert (auch Google nicht).
          Diese Ansicht sammelt deshalb seit dem ersten Lauf von <code>npm run snapshot:bakeries</code> echte
          OSM-Metadaten-Snapshots pro Bäckerei. Sobald genug Historie da ist, zeigt diese Seite OSM-Metadaten-
          Änderungen über Zeit — niemals eine erfundene &quot;schließt X-mal pro Jahr&quot;-Zahl.
        </p>
        <p>Bisher erfasste Snapshots: 0.</p>
      </div>
    );
  }
  return (
    <div style={{ padding: 16, background: "#e8f5e9", border: "1px solid #a5d6a7", borderRadius: 8 }}>
      <strong>Datensammlung läuft seit {stats.since?.slice(0, 10)}.</strong>
      <p>
        {stats.snapshotCount} Snapshots über {stats.daysCovered} Tag(e) erfasst. Gezeigt werden ausschließlich
        beobachtete OSM-Metadaten-Änderungen (z.B. opening_hours-Tag verändert/entfernt), nie eine erfundene
        Schließungs-Statistik.
      </p>
    </div>
  );
}
