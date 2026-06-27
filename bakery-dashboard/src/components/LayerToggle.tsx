export type LayerKey = "dichte" | "frequenz" | "luecken" | "schliessungen";

const LAYER_LABELS: Record<LayerKey, string> = {
  dichte: "Dichte (Bäckereien)",
  frequenz: "Frequenz-Potenzial",
  luecken: "Lücken/Potenzial",
  schliessungen: "Schließungen",
};

export default function LayerToggle({
  active,
  onToggle,
}: {
  active: Record<LayerKey, boolean>;
  onToggle: (layer: LayerKey) => void;
}) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", padding: 8 }}>
      {(Object.keys(LAYER_LABELS) as LayerKey[]).map((key) => (
        <label key={key} style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
          <input type="checkbox" checked={active[key]} onChange={() => onToggle(key)} />
          {LAYER_LABELS[key]}
        </label>
      ))}
    </div>
  );
}
