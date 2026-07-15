"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Message = { role: "user" | "assistant"; content: string };

// Minimale Typen für die Web Speech API (nicht in den Standard-DOM-Typen enthalten).
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}
interface SpeechRecognitionEventLike {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [listening, setListening] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [speakEnabled, setSpeakEnabled] = useState(true);
  const [status, setStatus] = useState("");
  const [supported, setSupported] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const messagesRef = useRef<Message[]>([]);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const germanVoiceRef = useRef<SpeechSynthesisVoice | null>(null);

  messagesRef.current = messages;

  // Spracherkennung einrichten
  useEffect(() => {
    const w = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) {
      setSupported(false);
      return;
    }
    const rec = new Ctor();
    rec.lang = "de-DE";
    rec.continuous = false;
    rec.interimResults = false;

    rec.onresult = (e) => {
      const transcript = e.results[0][0].transcript.trim();
      if (transcript) void sendMessage(transcript);
    };
    rec.onerror = (e) => {
      if (e.error === "no-speech") {
        setStatus("Nichts gehört – tippe auf das Mikrofon und sprich.");
      } else if (e.error === "not-allowed") {
        setError("Mikrofonzugriff wurde blockiert. Bitte im Browser erlauben.");
      } else {
        setStatus("");
      }
      setListening(false);
    };
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;

    return () => rec.abort();
    // sendMessage ist stabil (useCallback), Abhängigkeit bewusst leer gelassen
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Deutsche Stimme für die Sprachausgabe auswählen
  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const pick = () => {
      const voices = window.speechSynthesis.getVoices();
      germanVoiceRef.current =
        voices.find((v) => v.lang === "de-DE") ||
        voices.find((v) => v.lang.startsWith("de")) ||
        null;
    };
    pick();
    window.speechSynthesis.onvoiceschanged = pick;
  }, []);

  // Automatisch nach unten scrollen
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, thinking]);

  const speak = useCallback(
    (text: string) => {
      if (!speakEnabled || !window.speechSynthesis) return;
      const clean = text.trim();
      if (!clean) return;
      const utter = new SpeechSynthesisUtterance(clean);
      utter.lang = "de-DE";
      if (germanVoiceRef.current) utter.voice = germanVoiceRef.current;
      utter.rate = 1.02;
      utter.pitch = 1;
      window.speechSynthesis.speak(utter);
    },
    [speakEnabled],
  );

  const sendMessage = useCallback(
    async (text: string) => {
      setError(null);
      window.speechSynthesis?.cancel(); // laufende Ausgabe stoppen (Barge-in)

      const nextMessages: Message[] = [
        ...messagesRef.current,
        { role: "user", content: text },
      ];
      setMessages(nextMessages);
      setThinking(true);
      setStatus("Claude denkt nach …");

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: nextMessages }),
        });

        if (!res.ok || !res.body) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error || `Serverfehler (${res.status}).`);
        }

        // Platzhalter für die Antwort anlegen und beim Streamen füllen
        setMessages((m) => [...m, { role: "assistant", content: "" }]);
        setThinking(false);
        setStatus("");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let full = "";
        let spokenUpTo = 0;

        // Satzweise vorlesen, sobald ein Satz vollständig ist – geringere Latenz.
        const flushSentences = (final: boolean) => {
          const pending = full.slice(spokenUpTo);
          const regex = /[^.!?…]*[.!?…]+/g;
          let match: RegExpExecArray | null;
          let consumed = 0;
          while ((match = regex.exec(pending)) !== null) {
            speak(match[0]);
            consumed = match.index + match[0].length;
          }
          if (consumed > 0) spokenUpTo += consumed;
          if (final && spokenUpTo < full.length) {
            speak(full.slice(spokenUpTo));
            spokenUpTo = full.length;
          }
        };

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          full += decoder.decode(value, { stream: true });
          setMessages((m) => {
            const copy = [...m];
            copy[copy.length - 1] = { role: "assistant", content: full };
            return copy;
          });
          flushSentences(false);
        }
        flushSentences(true);
      } catch (err) {
        setThinking(false);
        setStatus("");
        setError(
          err instanceof Error ? err.message : "Unbekannter Fehler.",
        );
      }
    },
    [speak],
  );

  const toggleListening = () => {
    const rec = recognitionRef.current;
    if (!rec) return;
    if (listening) {
      rec.stop();
      setListening(false);
      return;
    }
    setError(null);
    window.speechSynthesis?.cancel();
    try {
      rec.start();
      setListening(true);
      setStatus("Ich höre zu … sprich jetzt.");
    } catch {
      // start() wirft, wenn bereits aktiv – ignorieren
    }
  };

  const reset = () => {
    window.speechSynthesis?.cancel();
    setMessages([]);
    setStatus("");
    setError(null);
  };

  return (
    <div className="app">
      <div className="header">
        <h1>🎙️ Sprach-Chat mit Claude</h1>
        <p>Sprich natürlich – Claude antwortet auf Deutsch per Sprachausgabe.</p>
      </div>

      <div className="messages" ref={scrollRef}>
        {messages.length === 0 && !thinking && (
          <div className="empty">
            Tippe auf das Mikrofon und stell deine Frage.
            <br />
            Zum Beispiel: „Erklär mir kurz, wie ein Vulkan entsteht.“
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`bubble ${m.role}`}>
            {m.content || (m.role === "assistant" ? "…" : "")}
          </div>
        ))}
        {thinking && <div className="bubble assistant">…</div>}
      </div>

      {error && <div className="error">{error}</div>}

      <div className="controls">
        {!supported ? (
          <div className="error">
            Dein Browser unterstützt keine Spracherkennung. Bitte nutze Chrome
            oder Edge auf dem Desktop.
          </div>
        ) : (
          <>
            <button
              className={`mic-btn ${listening ? "listening" : ""}`}
              onClick={toggleListening}
              disabled={thinking}
              aria-label={listening ? "Aufnahme stoppen" : "Sprechen"}
            >
              {listening ? "■" : "🎤"}
            </button>
            <div className="status">{status}</div>
            <div className="row">
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={speakEnabled}
                  onChange={(e) => {
                    setSpeakEnabled(e.target.checked);
                    if (!e.target.checked) window.speechSynthesis?.cancel();
                  }}
                />
                Sprachausgabe
              </label>
              <button className="small-btn" onClick={reset}>
                Neu starten
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
