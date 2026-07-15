import { synthesize, ttsProvider } from "../../lib/tts";

export const runtime = "nodejs";

// Das Frontend fragt hier ab, welcher Anbieter aktiv ist.
export async function GET() {
  return Response.json({ provider: ttsProvider() });
}

export async function POST(req: Request) {
  let text: unknown;
  try {
    ({ text } = await req.json());
  } catch {
    return Response.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }
  if (typeof text !== "string" || !text.trim()) {
    return Response.json({ error: "Kein Text übergeben." }, { status: 400 });
  }

  try {
    const result = await synthesize(text);
    if ("fallback" in result) {
      // Kein Anbieter konfiguriert → Frontend nutzt die Browser-Stimme.
      return Response.json({ fallback: true });
    }
    return new Response(result.audio, {
      headers: {
        "Content-Type": result.contentType,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unbekannter TTS-Fehler.";
    return Response.json({ error: message }, { status: 502 });
  }
}
