import { BRANDNER_BRANCHES } from "@/lib/brandner";
import BrandnerOpportunityList from "@/components/BrandnerOpportunityList";

export default function BrandnerPage() {
  return (
    <main style={{ padding: 16 }}>
      <h1>Bäckerei Brandner — Expansions-Perspektive</h1>
      <p style={{ color: "#555", maxWidth: 720 }}>
        Verankert an den beiden echten Salzburger-Land-Filialen von Brandner. Zeigt Umsatz-Einzugsgebiete
        (Tourismus, Frequenz-Potenzial, Bäckerei-Lücke, Wetter-Gunst) — nicht nur Urlaubslücken von
        Wettbewerbern, sondern generelles Marktpotenzial.
      </p>
      <h2>Echte Filialen im Scope (Salzburger Land)</h2>
      <ul>
        {BRANDNER_BRANCHES.map((b) => (
          <li key={b.name} style={{ marginBottom: 8 }}>
            <strong>{b.name}</strong> — {b.address}
            <br />
            <span style={{ color: "#555", fontSize: "0.9em" }}>Öffnungszeiten: {b.openingHours}</span>
          </li>
        ))}
      </ul>
      <p style={{ color: "#777", fontSize: "0.8em", maxWidth: 720 }}>
        Filialen bestätigt 06/2026 über die offizielle Filialliste (baeckerei-brandner.at), gegengeprüft mit
        herold.at/firmenabc.at. Filialen in Oberösterreich (z. B. Ostermiething, Riedersbach) liegen außerhalb
        des Salzburger-Land-Scopes. Markerkoordinaten sind ungefähr (Orts-/Straßenebene).
      </p>
      <BrandnerOpportunityList />
    </main>
  );
}
