// Serverseitige Text-to-Speech-Abstraktion.
// Unterstützt ElevenLabs und OpenAI; wählt automatisch anhand der gesetzten Keys.
// Gibt { fallback: true } zurück, wenn kein Anbieter konfiguriert ist –
// dann nutzt das Frontend die (einfachere) Browser-Stimme.

export type TtsProvider = "elevenlabs" | "openai" | "browser";

export type TtsResult =
  | { audio: ArrayBuffer; contentType: string }
  | { fallback: true };

export function ttsProvider(): TtsProvider {
  const explicit = process.env.TTS_PROVIDER?.toLowerCase();
  if (explicit === "elevenlabs" || explicit === "openai") return explicit;
  if (process.env.ELEVENLABS_API_KEY) return "elevenlabs";
  if (process.env.OPENAI_API_KEY) return "openai";
  return "browser";
}

export async function synthesize(text: string): Promise<TtsResult> {
  switch (ttsProvider()) {
    case "elevenlabs":
      return synthElevenLabs(text);
    case "openai":
      return synthOpenAI(text);
    default:
      return { fallback: true };
  }
}

async function synthElevenLabs(text: string): Promise<TtsResult> {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) return { fallback: true };

  // Standard-Stimme "Sarah" (warm, mehrsprachig). Eigene Stimme aus deiner
  // ElevenLabs-Bibliothek per ELEVENLABS_VOICE_ID setzen.
  const voiceId = process.env.ELEVENLABS_VOICE_ID || "EXAVITQu4vr4xnSDxMaL";
  // eleven_turbo_v2_5: sehr niedrige Latenz + Deutsch. Für maximale Qualität:
  // eleven_multilingual_v2.
  const model = process.env.ELEVENLABS_MODEL || "eleven_turbo_v2_5";

  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: {
        "xi-api-key": key,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: model,
        // Sprachstil: etwas mehr Ausdruck/Emotion, damit es nicht flach klingt.
        voice_settings: {
          stability: 0.4,
          similarity_boost: 0.75,
          style: 0.35,
          use_speaker_boost: true,
        },
      }),
    },
  );

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`ElevenLabs ${res.status}: ${detail.slice(0, 300)}`);
  }
  return { audio: await res.arrayBuffer(), contentType: "audio/mpeg" };
}

async function synthOpenAI(text: string): Promise<TtsResult> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return { fallback: true };

  const voice = process.env.OPENAI_TTS_VOICE || "shimmer";
  const model = process.env.OPENAI_TTS_MODEL || "gpt-4o-mini-tts";
  // gpt-4o-mini-tts lässt sich per "instructions" im Ton steuern.
  const instructions =
    process.env.OPENAI_TTS_INSTRUCTIONS ||
    "Sprich natürlich und locker auf Deutsch, wie in einem echten, entspannten Gespräch: warm, freundlich, mit lebendiger Betonung und kleinen, natürlichen Sprechpausen. Nicht monoton und nicht roboterhaft.";

  const res = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      voice,
      input: text,
      instructions,
      response_format: "mp3",
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`OpenAI TTS ${res.status}: ${detail.slice(0, 300)}`);
  }
  return { audio: await res.arrayBuffer(), contentType: "audio/mpeg" };
}
