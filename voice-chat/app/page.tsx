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

type QueueItem = {
  text: string;
  audio: Promise<string | null>; // Object-URL der Audiodatei, oder null → Browserstimme
  ac: AbortController;
  gen: number;
};

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [listening, setListening] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [speakEnabled, setSpeakEnabled] = useState(true);
  const [status, setStatus] = useState("");
  const [supported, setSupported] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [voiceLabel, setVoiceLabel] = useState("");

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const messagesRef = useRef<Message[]>([]);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const germanVoiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const speakEnabledRef = useRef(speakEnabled);

  // Audio-Warteschlange für die neuronale Stimme
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const queueRef = useRef<QueueItem[]>([]);
  const drainingRef = useRef(false);
  const genRef = useRef(0);
  const resolvePlayRef = useRef<(() => void) | null>(null);
  const useNeuralTtsRef = useRef(false);

  messagesRef.current = messages;
  speakEnabledRef.current = speakEnabled;

  // Welcher TTS-Anbieter ist serverseitig aktiv?
  useEffect(() => {
    fetch("/api/tts")
      .then((r) => r.json())
      .then((d: { provider?: string }) => {
        useNeuralTtsRef.current =
          d.provider === "elevenlabs" || d.provider === "openai";
        setVoiceLabel(
          d.provider === "elevenlabs"
            ? "Stimme: ElevenLabs"
            : d.provider === "openai"
              ? "Stimme: OpenAI"
              : "Stimme: Browser (kein TTS-Key gesetzt)",
        );
      })
      .catch(() => setVoiceLabel(""));
  }, []);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Deutsche Stimme für den Browser-Fallback auswählen
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

  // --- Sprachausgabe ---------------------------------------------------------

  const stopSpeaking = useCallback(() => {
    genRef.current++; // laufende/warteschlangige Ausgaben ungültig machen
    queueRef.current.forEach((i) => i.ac.abort());
    queueRef.current = [];
    const a = audioElRef.current;
    if (a) {
      a.pause();
      a.removeAttribute("src");
      a.onended = null;
      a.onerror = null;
    }
    window.speechSynthesis?.cancel();
    if (resolvePlayRef.current) {
      resolvePlayRef.current();
      resolvePlayRef.current = null;
    }
  }, []);

  const fetchTtsAudio = useCallback(
    async (text: string, signal: AbortSignal): Promise<string | null> => {
      if (!useNeuralTtsRef.current) return null; // kein Anbieter → Browserstimme
      try {
        const res = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
          signal,
        });
        const ct = res.headers.get("Content-Type") || "";
        if (!res.ok || !ct.startsWith("audio")) return null; // Fallback
        const blob = await res.blob();
        return URL.createObjectURL(blob);
      } catch {
        return null;
      }
    },
    [],
  );

  const playUrl = useCallback((url: string) => {
    return new Promise<void>((resolve) => {
      const a = audioElRef.current ?? new Audio();
      audioElRef.current = a;
      resolvePlayRef.current = resolve;
      const done = () => {
        resolvePlayRef.current = null;
        resolve();
      };
      a.src = url;
      a.onended = done;
      a.onerror = done;
      a.play().catch(done);
    });
  }, []);

  const browserSpeak = useCallback((text: string) => {
    return new Promise<void>((resolve) => {
      if (!window.speechSynthesis) return resolve();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "de-DE";
      if (germanVoiceRef.current) u.voice = germanVoiceRef.current;
      u.rate = 1.02;
      resolvePlayRef.current = resolve;
      const done = () => {
        resolvePlayRef.current = null;
        resolve();
      };
      u.onend = done;
      u.onerror = done;
      window.speechSynthesis.speak(u);
    });
  }, []);

  const drainQueue = useCallback(async () => {
    if (drainingRef.current) return;
    drainingRef.current = true;
    try {
      let item: QueueItem | undefined;
      while ((item = queueRef.current.shift())) {
        const url = await item.audio;
        if (item.gen !== genRef.current) {
          if (url) URL.revokeObjectURL(url);
          continue;
        }
        if (url) {
          await playUrl(url);
          URL.revokeObjectURL(url);
        } else {
          await browserSpeak(item.text);
        }
      }
    } finally {
      drainingRef.current = false;
    }
    if (queueRef.current.length) void drainQueue();
  }, [playUrl, browserSpeak]);

  const enqueueSpeak = useCallback(
    (text: string) => {
      const clean = text.trim();
      if (!clean || !speakEnabledRef.current) return;
      const ac = new AbortController();
      const gen = genRef.current;
      const audio = fetchTtsAudio(clean, ac.signal);
      queueRef.current.push({ text: clean, audio, ac, gen });
      void drainQueue();
    },
    [fetchTtsAudio, drainQueue],
  );

  // --- Gespräch --------------------------------------------------------------

  const sendMessage = useCallback(
    async (text: string) => {
      setError(null);
      stopSpeaking(); // Barge-in: laufende Ausgabe abbrechen

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
            enqueueSpeak(match[0]);
            consumed = match.index + match[0].length;
          }
          if (consumed > 0) spokenUpTo += consumed;
          if (final && spokenUpTo < full.length) {
            enqueueSpeak(full.slice(spokenUpTo));
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
        setError(err instanceof Error ? err.message : "Unbekannter Fehler.");
      }
    },
    [stopSpeaking, enqueueSpeak],
  );

  const toggleListening = () => {
    const rec = recognitionRef.current;
    if (!rec) return;

    // Audio-Element beim ersten Antippen "freischalten" (Autoplay-Regeln).
    if (!audioElRef.current) audioElRef.current = new Audio();

    if (listening) {
      rec.stop();
      setListening(false);
      return;
    }
    setError(null);
    stopSpeaking();
    try {
      rec.start();
      setListening(true);
      setStatus("Ich höre zu … sprich jetzt.");
    } catch {
      // start() wirft, wenn bereits aktiv – ignorieren
    }
  };

  const reset = () => {
    stopSpeaking();
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
                    if (!e.target.checked) stopSpeaking();
                  }}
                />
                Sprachausgabe
              </label>
              <button className="small-btn" onClick={reset}>
                Neu starten
              </button>
            </div>
            {voiceLabel && (
              <div className="status" style={{ fontSize: 12, opacity: 0.7 }}>
                {voiceLabel}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
