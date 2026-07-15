# 🎙️ Sprach-Chat mit Claude

Ein Chat-Interface, mit dem du **natürlich sprechen** kannst und das dir **auf Deutsch per Sprachausgabe** antwortet.

- **Spracheingabe:** Web Speech API des Browsers (`SpeechRecognition`, Deutsch)
- **Antworten:** Claude (`claude-opus-4-8`) über den offiziellen `@anthropic-ai/sdk`, gestreamt, mit umgangssprachlichem Sprechstil (Binde-/Füllwörter, kurze Sätze)
- **Sprachausgabe:** neuronale Stimme über **ElevenLabs** oder **OpenAI** (natürlich, nicht roboterhaft), satzweise gestreamt für niedrige Latenz. Fallback: Browserstimme, falls kein TTS-Key gesetzt ist.
- **Sicherheit:** Alle API-Keys liegen serverseitig in Next.js Routes – sie werden nie an den Browser gesendet.

## Einrichtung

1. Abhängigkeiten installieren:

   ```bash
   cd voice-chat
   npm install
   ```

2. Keys hinterlegen – kopiere `.env.example` zu `.env.local`:

   ```bash
   cp .env.example .env.local
   ```

   Dann in `.env.local` eintragen:
   - **`ANTHROPIC_API_KEY`** (Pflicht) – <https://console.anthropic.com/settings/keys>
   - Für die **natürliche Stimme** genau einen der beiden Anbieter (empfohlen):
     - **ElevenLabs** – natürlichste Stimmen: `ELEVENLABS_API_KEY` von <https://elevenlabs.io>. Optional eine eigene Stimme per `ELEVENLABS_VOICE_ID` aus deiner Voice-Bibliothek.
     - **OpenAI** – sehr natürlich und günstiger: `OPENAI_API_KEY` von <https://platform.openai.com/api-keys>. Der Sprechton lässt sich über `OPENAI_TTS_INSTRUCTIONS` steuern.

   Ohne TTS-Key funktioniert die App weiterhin – dann mit der einfacheren Browserstimme.

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
- **Stimme wählen:** Die App zeigt unten an, welche Stimme aktiv ist (ElevenLabs / OpenAI / Browser). Anbieter und Stimme steuerst du komplett über die Variablen in `.env.example`.
- **Latenz:** Antworten werden satzweise vorgelesen – der erste Satz kommt, sobald er fertig ist, statt auf die ganze Antwort zu warten. ElevenLabs `eleven_turbo_v2_5` bzw. OpenAI `gpt-4o-mini-tts` sind auf niedrige Latenz ausgelegt.
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
