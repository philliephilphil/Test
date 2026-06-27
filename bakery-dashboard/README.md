# Bäckerei-Dashboard Salzburger Land

Web-Dashboard für Bäckereien im Salzburger Land (inkl. Stadt Salzburg):
Dichte, Frequenz-Potenzial, Lücken/Marktpotenzial und eine ehrliche
Schließungs-Datensammlung. Zusätzlich eine Perspektive aus Sicht der echten
Bäckerei **Brandner** (`/brandner`) für eine filialnahe Auswertung.

Alle gezeigten Zahlen sind entweder echte, zitierte Daten oder explizit als
"keine Daten" gekennzeichnet — siehe [Bekannte Grenzen](#bekannte-grenzen).
Es wird nichts erfunden.

## Setup

```bash
npm install
npm run dev
```

Die App startet auch **ohne** vorherigen Datenabruf — sie zeigt dann ehrlich
"noch keine Daten" statt eines Absturzes oder erfundener Werte.

### Echtdaten abrufen

Diese Skripte rufen externe, kostenlose, keyless APIs auf (OpenStreetMap
Overpass, Open-Meteo) und müssen in einer Umgebung mit normalem Internetzugang
ausgeführt werden (siehe [Bekannte Grenzen](#bekannte-grenzen) zum
Sandbox-Netzwerklimit dieser Entwicklungsumgebung):

```bash
npm run fetch:bezirke         # Bezirksgrenzen -> data/bezirke.geojson
npm run fetch:bakeries        # Bäckerei-Standorte -> data/bakeries.json
npm run fetch:frequency-pois  # Frequenz-Proxy-POIs -> data/frequency-pois.json
npm run snapshot:bakeries     # ein Snapshot-Durchlauf -> data/snapshots/bakery-status.jsonl
```

`fetch:bezirke` zuerst ausführen, da die Bäckerei- und POI-Zuordnung zu
Bezirken davon abhängt. Für laufende Schließungs-Datensammlung
`snapshot:bakeries` regelmäßig (z. B. täglich per Cron) ausführen, oder den
HTTP-Endpoint `POST /api/cron/snapshot` extern triggern.

### Tests

```bash
npm test
```

Deckt `lib/score.ts` (Potenzial-Score, reine Funktion) ab.

## Datenquellen

| Schicht | Quelle | Hinweis |
|---|---|---|
| Bäckerei-Standorte (Dichte) | OpenStreetMap / Overpass API (`shop=bakery`) | kein Google Maps, kein Key nötig |
| Frequenz-Potenzial | Einwohnerzahl + Bettenkapazität (Land Salzburg Landesstatistik) + OSM-POI-Dichte (Haltestellen, Parkplätze, Sehenswürdigkeiten, Geschäfte) | **Proxy**, kein Echtzeit-Verkehr, keine Google-"Beliebte Zeiten"-Daten |
| Tourismus-Intensität | Nächtigungszahlen Sommersaison 2023, Land Salzburg Landesstatistik | statisch, mit Quelle/Datum pro Bezirk |
| Wetter-Gunst | Open-Meteo (Forecast/Archive) + dokumentierte Verhaltens-Heuristik | siehe unten |
| Schließungen | eigene Snapshot-Architektur (OSM-Metadaten-Änderungen über Zeit) | sammelt erst ab jetzt, keine erfundene Historie |

Jedes `lib/*.ts`-Datenmodul liefert sein Ergebnis mit Quellenangabe; in der UI
rendert `SourceFootnote` diese Angabe.

## Potenzial-Score

```
Score = 0.30 × Bäckerei-Lücke (inverse Dichte)
      + 0.30 × Frequenz-Potenzial (Einwohner + Betten + OSM-POI-Dichte)
      + 0.25 × Tourismus-Intensität (normalisierte Nächtigungen)
      + 0.15 × Wetter-Gunst (Saisonalität)
```

Implementiert in `src/lib/score.ts`. Fehlt ein Faktor für einen Bezirk,
wird er **nicht geraten** — die übrigen Gewichte werden renormiert, und die
`explanation` im `ScoreResult` listet auf, welche Faktoren fehlen. Nur wenn
alle vier Faktoren fehlen, ist der Score `null` ("nicht berechenbar").

### Wetter-Verhaltens-Heuristik

Es existiert keine reale Messreihe, die Bäckerei-Frequenz und Wetter im
Salzburger Land tatsächlich korreliert. `src/lib/weather.ts` verwendet daher
eine **begründete, dokumentierte Annahme** (benannte Konstanten, kein
trainiertes Modell):

- `< 0 °C` (Frost): Gunst ≈ 0.3
- `0–15 °C`: Gunst ≈ 0.5
- `15–26 °C` (ideales Schönwetter): Gunst ≈ 0.9
- `26–32 °C`: Gunst ≈ 0.8 (Geschäft verschiebt sich auf den Vormittag)
- `> 32 °C` (Hitzetage): Gunst ≈ 0.6 (Nachmittagsfrequenz bricht ein)
- Starker Niederschlag (>15 mm/Tag): zusätzlicher Abschlag ×0.7

Diese Schwellenwerte sind nachvollziehbar, aber kalibrierbar — nicht
"bewiesen". `ScoreBreakdownPanel` zeigt bei Bedarf, welche Regel gegriffen
hat.

## Bekannte Grenzen

- **Keine erfundenen Schließungs-/Urlaubsstatistiken.** Die Schließungen-
  Schicht zeigt nur echte Sammel-Metadaten (seit wann, wie viele Snapshots),
  nie eine erfundene "schließt X-mal pro Jahr"-Zahl. Direkt nach dem ersten
  Start zeigt sie ehrlich "Datensammlung läuft seit Start" statt Historie.
- **Kein Google Maps/Places.** Kein Key vorhanden, daher kein Live-
  Open/Closed-Signal. Bäckerei-Standorte stammen ausschließlich aus
  OpenStreetMap.
- **Kein Google-Verkehr/"Beliebte Zeiten".** Diese Daten sind über keine API
  abrufbar. Die Frequenz-Potenzial-Schicht ist explizit ein Proxy aus
  Einwohnerzahl + Bettenkapazität + OSM-POI-Dichte, kein gemessener
  Fußgängerverkehr.
- **Unvollständige Bevölkerungs-/Bettendaten.** Für Pongau (Bevölkerung) und
  alle Bezirke (Gästebetten pro Bezirk) wurde kein aktuell zitierbarer,
  bezirksgenauer Wert gefunden — diese Felder sind `null` mit Hinweis im
  JSON, statt geschätzt zu werden. Landesweite Eckwerte (z. B. >231.000
  Gästebetten in Salzburg) sind bekannt, aber nicht auf Bezirksebene
  aufgeschlüsselt verfügbar gewesen.
- **Räumliche Auflösung der Wetterdaten:** ein Referenzpunkt pro Bezirk, nicht
  pro Bäckerei — die Daten stützen keine feinere Auflösung.
- **Entwicklungsumgebung ohne Internetzugang zu den Ziel-APIs:** Diese App
  wurde in einer Sandbox entwickelt, deren Netzwerk-Policy ausgehende
  Verbindungen zu Overpass, Open-Meteo und salzburg.gv.at blockiert. Die
  Fetch-Skripte (`fetch:bakeries`, `fetch:bezirke`, `fetch:frequency-pois`)
  und die Live-Wetterabfrage in `/api/weather` und `/api/score` sind daher
  in dieser Entwicklungsumgebung ungetestet gegen echte Endpunkte — Code,
  Typen und Build wurden geprüft, aber nicht gegen die echten APIs
  verifiziert. In einer Umgebung mit normalem Internetzugang funktionieren
  sie ohne Anpassung (beide APIs sind kostenlos und benötigen keinen Key).

## Projektstruktur

```
data/                  # Caches + statische, zitierte Datendateien
scripts/               # Fetch- und Snapshot-Skripte (siehe oben)
src/lib/               # Datenmodule, Geo-Logik, Score-Berechnung
src/components/        # Karte, Layer, Score-Breakdown, Leerzustände
src/app/               # Next.js Routen + API-Routen
```
