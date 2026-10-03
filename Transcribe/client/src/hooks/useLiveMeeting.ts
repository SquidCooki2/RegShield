import { useCallback, useEffect, useRef, useState } from "react";
import { toaster } from "@/components/ui/toaster";
import { formatTime } from "@/lib/format";
import type { SeverityLevel } from "@/types";

/**
 * Socket protocol (/ws/live-stream)
 *   client -> server  { type: "AUDIO_CHUNK_S3", audioBase64, timestamp }
 *   client -> server  { type: "LIVE_TRANSCRIPT_CHUNK", text }          (browser STT fallback only)
 *   server -> client  { type: "SESSION_STARTED", meetingId, s3Key }    (vault confirmed by the server)
 *   server -> client  { type: "TRANSCRIPT_TURN", speaker, startSec, text }
 *   server -> client  { type: "ADVISOR_NUDGE", severity, message }
 */

export type MeetingStatus = "idle" | "connecting" | "live" | "stopping";

export interface TranscriptTurn {
  id: string;
  speaker: string;
  timestamp: string;
  text: string;
  source: "server" | "browser";
}

export interface LiveNudge {
  id: string;
  severity: SeverityLevel;
  message: string;
}

interface RecognitionResultLike {
  isFinal: boolean;
  0: { transcript: string };
}
interface RecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((e: { resultIndex: number; results: ArrayLike<RecognitionResultLike> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  start(): void;
  stop(): void;
}
type RecognitionCtor = new () => RecognitionLike;

const getRecognitionCtor = (): RecognitionCtor | null => {
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};

const CHUNK_MS = 3000;
const FLUSH_TIMEOUT_MS = 1500;

const blobToBase64 = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

export const buildTranscript = (turns: TranscriptTurn[]) =>
  turns.map((t) => `[${t.timestamp}] ${t.speaker}: ${t.text}`).join("\n");

interface Options {
  onLiveChange?: (live: boolean) => void;
}

export function useLiveMeeting({ onLiveChange }: Options = {}) {
  const [status, setStatus] = useState<MeetingStatus>("idle");
  const [turns, setTurns] = useState<TranscriptTurn[]>([]);
  const [nudge, setNudge] = useState<LiveNudge | null>(null);
  const [vaultKey, setVaultKey] = useState<string | null>(null);

  const statusRef = useRef<MeetingStatus>("idle");
  const turnsRef = useRef<TranscriptTurn[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<RecognitionLike | null>(null);
  const wantSttRef = useRef(false);
  const serverTurnsRef = useRef(false);
  const startedAtRef = useRef(0);
  const sendQueueRef = useRef<Promise<void>>(Promise.resolve());
  const onLiveChangeRef = useRef(onLiveChange);
  onLiveChangeRef.current = onLiveChange;

  const updateStatus = useCallback((next: MeetingStatus) => {
    statusRef.current = next;
    setStatus(next);
  }, []);

  const elapsedSeconds = () => (Date.now() - startedAtRef.current) / 1000;

  const appendTurn = useCallback((turn: Omit<TranscriptTurn, "id">) => {
    turnsRef.current = [...turnsRef.current, { ...turn, id: crypto.randomUUID() }];
    setTurns(turnsRef.current);
  }, []);

  const releaseMedia = useCallback(() => {
    wantSttRef.current = false;
    try {
      recognitionRef.current?.stop();
    } catch {
      /* already stopped */
    }
    recognitionRef.current = null;

    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      try {
        recorder.stop();
      } catch {
        /* already stopped */
      }
    }
    recorderRef.current = null;

    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  /** Tear everything down after a failure. Transcript captured so far is kept. */
  const abort = useCallback(
    (title: string, description: string) => {
      statusRef.current = "idle"; // set first so ws.onclose ignores the close below
      releaseMedia();
      wsRef.current?.close();
      wsRef.current = null;
      setStatus("idle");
      onLiveChangeRef.current?.(false);
      toaster.create({ title, description, type: "error" });
    },
    [releaseMedia]
  );

  const startRecognition = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      toaster.create({
        title: "Live transcription unavailable",
        description: "This browser can't transcribe live. Audio is still being recorded.",
        type: "warning",
      });
      return;
    }

    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      if (serverTurnsRef.current) return; // the server's labeled turns take over
      // Walk every new result, not just the last one, so nothing is dropped.
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (!result.isFinal) continue;
        const text = result[0].transcript.trim();
        if (!text) continue;

        appendTurn({
          speaker: "Unlabeled",
          timestamp: formatTime(elapsedSeconds()),
          text,
          source: "browser",
        });
        const ws = wsRef.current;
        if (ws?.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "LIVE_TRANSCRIPT_CHUNK", text }));
        }
      }
    };

    // Chrome ends continuous recognition after silence, so restart while recording.
    recognition.onend = () => {
      if (!wantSttRef.current) return;
      try {
        recognition.start();
      } catch {
        /* already running */
      }
    };

    recognition.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        wantSttRef.current = false;
        toaster.create({
          title: "Live transcription blocked",
          description: "Speech recognition permission was denied. Audio is still being recorded.",
          type: "warning",
        });
      }
    };

    wantSttRef.current = true;
    recognitionRef.current = recognition;
    recognition.start();
  }, [appendTurn]);

  const start = useCallback(async () => {
    if (statusRef.current !== "idle") return;
    updateStatus("connecting");
    turnsRef.current = [];
    setTurns([]);
    setNudge(null);
    setVaultKey(null);
    serverTurnsRef.current = false;
    sendQueueRef.current = Promise.resolve();

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      updateStatus("idle");
      toaster.create({
        title: "Microphone unavailable",
        description: "Allow microphone access in your browser, then try again.",
        type: "error",
      });
      return;
    }
    streamRef.current = stream;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws/live-stream`);
    wsRef.current = ws;

    ws.onopen = () => {
      try {
        startedAtRef.current = Date.now();
        const recorder = new MediaRecorder(stream);
        recorderRef.current = recorder;

        recorder.ondataavailable = (event) => {
          if (event.data.size === 0) return;
          // Chain sends so the final chunk can be awaited before the socket closes.
          sendQueueRef.current = sendQueueRef.current
            .then(async () => {
              if (ws.readyState !== WebSocket.OPEN) return;
              const audioBase64 = await blobToBase64(event.data);
              ws.send(
                JSON.stringify({ type: "AUDIO_CHUNK_S3", audioBase64, timestamp: Date.now() })
              );
            })
            .catch((err) => console.error("Audio chunk failed:", err));
        };

        recorder.start(CHUNK_MS);
        startRecognition();
        updateStatus("live");
        onLiveChangeRef.current?.(true);
        toaster.create({ title: "Recording started", type: "success" });
      } catch (err) {
        console.error(err);
        abort("Couldn't start recording", "This browser couldn't start the audio recorder.");
      }
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        switch (data.type) {
          case "SESSION_STARTED":
            setVaultKey(data.s3Key ?? null);
            break;
          case "TRANSCRIPT_TURN":
            if (!serverTurnsRef.current) {
              serverTurnsRef.current = true;
              // Drop browser-generated lines so the transcript isn't duplicated.
              turnsRef.current = turnsRef.current.filter((t) => t.source === "server");
            }
            appendTurn({
              speaker: data.speaker ?? "Speaker",
              timestamp: formatTime(data.startSec ?? elapsedSeconds()),
              text: data.text,
              source: "server",
            });
            break;
          case "ADVISOR_NUDGE":
            setNudge({
              id: crypto.randomUUID(),
              severity: data.severity ?? "HIGH",
              message: data.message,
            });
            break;
        }
      } catch (err) {
        console.error("Bad socket message:", err);
      }
    };

    ws.onclose = () => {
      const current = statusRef.current;
      if (current === "idle" || current === "stopping") return;
      abort(
        current === "connecting" ? "Couldn't reach the streaming service" : "Connection lost",
        current === "connecting"
          ? "Check that the server is running, then try again."
          : "Recording stopped. The transcript captured so far is kept."
      );
    };
  }, [abort, appendTurn, startRecognition, updateStatus]);

  /** Flushes speech recognition and the recorder, closes the socket, returns the transcript. */
  const stop = useCallback(async (): Promise<string> => {
    if (statusRef.current !== "live") return "";
    updateStatus("stopping");

    try {
      // 1. Let speech recognition deliver its last result.
      wantSttRef.current = false;
      const recognition = recognitionRef.current;
      if (recognition) {
        await new Promise<void>((resolve) => {
          const timer = setTimeout(resolve, FLUSH_TIMEOUT_MS);
          recognition.onend = () => {
            clearTimeout(timer);
            resolve();
          };
          try {
            recognition.stop();
          } catch {
            clearTimeout(timer);
            resolve();
          }
        });
        recognitionRef.current = null;
      }

      // 2. Let the recorder emit its final chunk, then wait for it to be sent.
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        await new Promise<void>((resolve) => {
          recorder.onstop = () => resolve();
          recorder.stop();
        });
      }
      await sendQueueRef.current;
    } finally {
      releaseMedia();
      wsRef.current?.close();
      wsRef.current = null;
      updateStatus("idle");
      onLiveChangeRef.current?.(false);
    }

    return buildTranscript(turnsRef.current);
  }, [releaseMedia, updateStatus]);

  // Unmount only: release the mic and socket without firing error toasts.
  useEffect(
    () => () => {
      statusRef.current = "idle";
      releaseMedia();
      wsRef.current?.close();
    },
    [releaseMedia]
  );

  return {
    status,
    turns,
    nudge,
    vaultKey,
    transcriptSource: turns.some((t) => t.source === "server") ? ("server" as const) : ("browser" as const),
    start,
    stop,
  };
}