import MapView from "@/components/MapViewClient";

export default function Home() {
  return (
    <main style={{ padding: 16 }}>
      <h1>Bäckerei-Dashboard Salzburger Land</h1>
      <p style={{ color: "#555", maxWidth: 720 }}>
        Dichte, Frequenz-Potenzial, Lücken/Marktpotenzial und Schließungs-Datensammlung für Bäckereien im
        Salzburger Land inkl. Stadt Salzburg. Alle Zahlen mit Quellenangabe — siehe{" "}
        <a href="/brandner">Brandner-Perspektive</a> für eine filialnahe Auswertung.
      </p>
      <MapView />
    </main>
  );
}
