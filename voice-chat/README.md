# 🎙️ Sprach-Chat mit Claude

Ein Chat-Interface, mit dem du **natürlich sprechen** kannst und das dir **auf Deutsch per Sprachausgabe** antwortet.

- **Spracheingabe:** Web Speech API des Browsers (`SpeechRecognition`, Deutsch)
- **Antworten:** Claude (`claude-opus-4-8`) über den offiziellen `@anthropic-ai/sdk`, gestreamt
- **Sprachausgabe:** Web Speech API (`speechSynthesis`) mit deutscher Stimme, satzweise
- **Sicherheit:** Der API-Key liegt serverseitig in einer Next.js Route – er wird nie an den Browser gesendet.

## Einrichtung

1. Abhängigkeiten installieren:

   ```bash
   cd voice-chat
   npm install
   ```

2. API-Key hinterlegen – kopiere `.env.example` zu `.env.local` und trage deinen Anthropic-Key ein:

   ```bash
   cp .env.example .env.local
   # dann .env.local öffnen und ANTHROPIC_API_KEY setzen
   ```

   Einen Key bekommst du unter <https://console.anthropic.com/settings/keys>.

3. Starten:

   ```bash
   npm run dev
   ```

   Dann <http://localhost:3000> im Browser öffnen.

## Benutzung

- Auf das **Mikrofon** tippen und sprechen. Nach dem Sprechen wird deine Frage automatisch an Claude geschickt.
- Claude antwortet im Chat und liest die Antwort **auf Deutsch** vor.
- Die Sprachausgabe lässt sich über den Schalter „Sprachausgabe“ abschalten.
- Beginnst du erneut zu sprechen, wird die laufende Ausgabe gestoppt (Barge-in).

## Hinweise

- **Browser:** Die Spracherkennung funktioniert am zuverlässigsten in **Chrome** oder **Edge** (Desktop). Firefox unterstützt `SpeechRecognition` nur eingeschränkt.
- **Mikrofon-Erlaubnis:** Beim ersten Mal fragt der Browser nach Mikrofonzugriff – bitte erlauben.
- **Deutsche Stimme:** Welche Stimmen verfügbar sind, hängt vom Betriebssystem ab. Die App wählt automatisch eine `de-DE`-Stimme, falls vorhanden.
- **Modell wechseln:** Über die Umgebungsvariable `ANTHROPIC_MODEL` (z. B. `claude-sonnet-5` für niedrigere Kosten).

## Aufbau

```
voice-chat/
├── app/
│   ├── api/chat/route.ts   # Server-Route: ruft Claude auf und streamt die Antwort
│   ├── page.tsx            # UI: Spracherkennung + Streaming-Anzeige + Sprachausgabe
│   ├── layout.tsx
│   └── globals.css
├── .env.example
└── package.json
```
