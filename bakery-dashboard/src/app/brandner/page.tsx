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
      <h2>Echte Filialen im Scope</h2>
      <ul>
        {BRANDNER_BRANCHES.map((b) => (
          <li key={b.name}>
            <strong>{b.name}</strong> — {b.address}
          </li>
        ))}
      </ul>
      <BrandnerOpportunityList />
    </main>
  );
}
