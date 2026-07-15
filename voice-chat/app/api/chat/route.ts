import Anthropic from "@anthropic-ai/sdk";

// Läuft in der Node.js-Runtime (nicht Edge), damit das SDK sauber funktioniert.
export const runtime = "nodejs";

const client = new Anthropic(); // liest ANTHROPIC_API_KEY aus der Umgebung

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-opus-4-8";

const SYSTEM_PROMPT = `Du bist ein freundlicher, natürlicher Gesprächspartner und antwortest immer auf Deutsch.

Deine Antworten werden per Sprachausgabe vorgelesen. Deshalb:
- Sprich in natürlicher, gesprochener Sprache – so, wie ein Mensch reden würde.
- Halte dich kurz und klar. Ein bis drei Sätze reichen meistens.
- Vermeide Aufzählungszeichen, Markdown, Code-Blöcke, Emojis und Sonderzeichen, die sich schlecht vorlesen lassen.
- Schreibe Zahlen und Abkürzungen so, dass sie natürlich klingen, wenn man sie laut vorliest.
- Wenn eine längere Erklärung nötig ist, fasse dich trotzdem so knapp wie möglich und biete an, mehr Details zu geben.`;

type ChatMessage = { role: "user" | "assistant"; content: string };

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response(
      JSON.stringify({
        error:
          "ANTHROPIC_API_KEY ist nicht gesetzt. Lege eine .env.local an (siehe .env.example).",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  let messages: ChatMessage[];
  try {
    const body = await req.json();
    messages = body.messages;
    if (!Array.isArray(messages) || messages.length === 0) {
      throw new Error("Keine Nachrichten übergeben.");
    }
  } catch {
    return new Response(
      JSON.stringify({ error: "Ungültige Anfrage." }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  // Antwort als reinen Text-Stream zurückgeben – das Frontend liest ihn Stück für Stück.
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const claudeStream = client.messages.stream({
          model: MODEL,
          max_tokens: 1024,
          system: SYSTEM_PROMPT,
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
        });

        for await (const event of claudeStream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        controller.close();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unbekannter Fehler bei der Anthropic-API.";
        controller.enqueue(encoder.encode(`\n[Fehler: ${message}]`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}
