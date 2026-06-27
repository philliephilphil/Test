import type { ScoreResult } from "@/lib/types";

export default function ScoreBreakdownPanel({ result, title }: { result: ScoreResult; title: string }) {
  return (
    <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 8, marginBottom: 8 }}>
      <strong>{title}</strong>
      <div style={{ fontSize: "1.4em", margin: "4px 0" }}>
        {result.score !== null ? result.score.toFixed(2) : "nicht berechenbar"}
      </div>
      <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: "0.9em" }}>
        {result.terms.map((t) => (
          <li key={t.label}>
            {t.label} ({Math.round(t.weight * 100)}%): {t.value !== null ? t.value.toFixed(2) : "keine Daten"}
          </li>
        ))}
      </ul>
      <p style={{ fontSize: "0.85em", color: "#555", marginTop: 6 }}>{result.explanation}</p>
    </div>
  );
}
