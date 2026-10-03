import { useCallback, useEffect, useRef, useState } from "react";
import { LiveServerMessage, type LiveAlert, type LiveClientMessage, type ReviewRecord } from "@transcribe/shared";
import { toaster } from "@/components/ui/toaster";
import { errorMessage } from "@/lib/api";
import { formatTime } from "@/lib/format";
import workletUrl from "@/lib/pcm-worklet.js?url";

/**
 * Live meeting over /api/live (protocol in shared/src/schema.ts):
 *   client -> server  { type: "start", title, createdBy, consent: true }, then binary 16 kHz PCM, then { type: "stop" }
 *   server -> client  session_started, caption (final, redacted), live_alert, error, meeting_complete
 * Only the server's redacted captions are shown; nothing is transcribed in the browser.
 */

export type MeetingStatus = "idle" | "connecting" | "live" | "analyzing";

export interface Caption {
  id: string;
  speaker: string;
  timestamp: string;
  text: string;
}

interface Options {
  onLiveChange?: (live: boolean) => void;
  /** Called with the full review once the server has archived the audio and run the full analysis. */
  onComplete?: (review: ReviewRecord) => void;
}

export function useLiveMeeting({ onLiveChange, onComplete }: Options = {}) {
  const [status, setStatus] = useState<MeetingStatus>("idle");
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [alerts, setAlerts] = useState<LiveAlert[]>([]);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const statusRef = useRef<MeetingStatus>("idle");
  const wsRef = useRef<WebSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const callbacksRef = useRef({ onLiveChange, onComplete });
  callbacksRef.current = { onLiveChange, onComplete };

  const updateStatus = useCallback((next: MeetingStatus) => {
    statusRef.current = next;
    setStatus(next);
  }, []);

  useEffect(() => {
    if (status !== "live" || startedAt === null) return;
    const timer = setInterval(() => setElapsedSeconds((Date.now() - startedAt) / 1000), 1000);
    return () => clearInterval(timer);
  }, [status, startedAt]);

  const releaseAudio = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
  }, []);

  /** Tear everything down after a failure. Captions received so far stay on screen. */
  const fail = useCallback(
    (title: string, description: string) => {
      const wasLive = statusRef.current !== "connecting";
      updateStatus("idle"); // set first so ws.onclose ignores the close below
      releaseAudio();
      wsRef.current?.close();
      wsRef.current = null;
      if (wasLive) callbacksRef.current.onLiveChange?.(false);
      toaster.create({ title, description, type: "error" });
    },
    [releaseAudio, updateStatus]
  );

  /** Mic -> worklet (16 kHz PCM, 100 ms buffers) -> binary socket messages. */
  const startAudio = useCallback(async (stream: MediaStream, ws: WebSocket) => {
    const ctx = new AudioContext(); // device rate; the worklet resamples
    audioCtxRef.current = ctx;
    await ctx.audioWorklet.addModule(workletUrl);
    const node = new AudioWorkletNode(ctx, "pcm-processor", { numberOfOutputs: 0 });
    node.port.onmessage = (e: MessageEvent<ArrayBuffer>) => {
      if (ws.readyState === WebSocket.OPEN) ws.send(e.data);
    };
    ctx.createMediaStreamSource(stream).connect(node);
    await ctx.resume();
  }, []);

  const finish = useCallback(
    async (meetingId: string) => {
      updateStatus("idle"); // the server closes the socket next; that close is expected
      wsRef.current = null;
      try {
        const res = await fetch(`/api/meetings/${meetingId}`);
        if (!res.ok) throw new Error(errorMessage(res.status, await res.text()));
        callbacksRef.current.onComplete?.((await res.json()) as ReviewRecord);
      } catch (err) {
        toaster.create({
          title: "Couldn't load the review",
          description: `${(err as Error).message} The meeting is saved and will appear in the compliance queue.`,
          type: "error",
        });
      }
    },
    [updateStatus]
  );

  const start = useCallback(
    async (title: string, createdBy: string) => {
      if (statusRef.current !== "idle") return;
      updateStatus("connecting");
      setCaptions([]);
      setAlerts([]);
      setStartedAt(null);
      setElapsedSeconds(0);

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
        });
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
      const ws = new WebSocket(`${protocol}//${window.location.host}/api/live`);
      wsRef.current = ws;

      ws.onopen = () => {
        const message: LiveClientMessage = { type: "start", title, createdBy, consent: true };
        ws.send(JSON.stringify(message));
      };

      ws.onmessage = async (event) => {
        const parsed = LiveServerMessage.safeParse(JSON.parse(String(event.data)));
        if (!parsed.success) return console.error("Bad socket message:", event.data);
        const message = parsed.data;

        switch (message.type) {
          case "session_started":
            try {
              await startAudio(stream, ws);
            } catch (err) {
              console.error(err);
              fail("Couldn't start recording", "This browser couldn't start audio capture.");
              return;
            }
            setStartedAt(Date.now());
            updateStatus("live");
            callbacksRef.current.onLiveChange?.(true);
            toaster.create({ title: "Recording started", type: "success" });
            break;
          case "caption":
            setCaptions((prev) => [
              ...prev,
              {
                id: crypto.randomUUID(),
                speaker: message.turn.speaker,
                timestamp: formatTime(message.turn.start),
                text: message.turn.text,
              },
            ]);
            break;
          case "live_alert":
            setAlerts((prev) => [...prev, message.alert]);
            break;
          case "error":
            toaster.create({ title: "Live meeting problem", description: message.message, type: "error" });
            break;
          case "meeting_complete":
            await finish(message.meetingId);
            break;
        }
      };

      ws.onclose = () => {
        const current = statusRef.current;
        if (current === "idle") return;
        if (current === "connecting") {
          fail("Couldn't reach the live service", "Check that the server is running, then try again.");
        } else {
          fail(
            "Connection lost",
            "Recording stopped. What was captured is saved and will appear in the compliance queue."
          );
        }
      };
    },
    [fail, finish, startAudio, updateStatus]
  );

  /** Stops the mic and asks the server to archive the audio and run the full analysis. */
  const stop = useCallback(() => {
    if (statusRef.current !== "live") return;
    releaseAudio();
    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "stop" } satisfies LiveClientMessage));
    updateStatus("analyzing");
    callbacksRef.current.onLiveChange?.(false);
  }, [releaseAudio, updateStatus]);

  // Unmount only: release the mic and socket without firing error toasts.
  useEffect(
    () => () => {
      statusRef.current = "idle";
      releaseAudio();
      wsRef.current?.close();
    },
    [releaseAudio]
  );

  return { status, captions, alerts, elapsedSeconds, start, stop };
}
