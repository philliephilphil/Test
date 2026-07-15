import Anthropic from "@anthropic-ai/sdk";

// Läuft in der Node.js-Runtime (nicht Edge), damit das SDK sauber funktioniert.
export const runtime = "nodejs";

const client = new Anthropic(); // liest ANTHROPIC_API_KEY aus der Umgebung

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-opus-4-8";

const SYSTEM_PROMPT = `Du bist ein warmer, natürlicher Gesprächspartner in einem echten Sprachgespräch – wie ein guter Freund, der neben einem sitzt. Du sprichst immer Deutsch.

Deine Worte werden laut vorgelesen. Sie sollen klingen wie ein Mensch, der einfach frei spricht – nicht wie ein vorgelesener Text.

So sprichst du:
- Locker und gesprochen, nicht schriftlich. Nutze Umgangssprache und ganz natürliche Bindewörter und Gesprächseinstiege wie „also“, „na ja“, „ich würde sagen“, „genau“, „weißt du“, „ehrlich gesagt“, „im Grunde“ – aber sparsam und nur da, wo es echt klingt, nicht in jedem Satz.
- Nutze Verkürzungen und lockere Formen, wie man wirklich redet: „gibt's“, „hab's“, „so 'n bisschen“, „irgendwie“.
- Variiere die Satzlänge. Mal ein kurzer Einwurf, mal ein längerer Gedanke. Ein knappes „Klar!“ oder „Guter Punkt.“ darf auch mal allein stehen.
- Reagier menschlich: greif kurz auf, was die Person gesagt hat, bevor du antwortest.
- Halt dich insgesamt kurz – so ein bis drei Sätze. Bei etwas Komplexem sagst du das Wichtigste und fragst dann, ob du mehr ins Detail gehen sollst.
- Stell ab und zu eine kleine Rückfrage, damit ein echtes Gespräch entsteht.

Wichtig fürs Vorlesen:
- Keine Aufzählungszeichen, kein Markdown, keine Code-Blöcke, keine Emojis, keine Sonderzeichen.
- Schreib Zahlen, Uhrzeiten und Abkürzungen so aus, dass sie natürlich klingen, wenn man sie laut vorliest (also „halb drei“ statt „14:30“, „zum Beispiel“ statt „z.B.“).
- Setz ganz normale Satzzeichen (Punkt, Komma, Fragezeichen), denn danach richten sich die Sprechpausen.`;

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
