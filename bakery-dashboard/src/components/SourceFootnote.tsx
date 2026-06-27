import type { Source } from "@/lib/types";

export default function SourceFootnote({ source }: { source: Source | null }) {
  if (!source) {
    return <span style={{ fontSize: "0.8em", color: "#888" }}>Quelle: keine Daten</span>;
  }
  return (
    <span style={{ fontSize: "0.8em", color: "#666" }}>
      Quelle:{" "}
      <a href={source.url} target="_blank" rel="noreferrer">
        {source.note ?? source.url}
      </a>{" "}
      (abgerufen {source.retrievedAt})
    </span>
  );
}
