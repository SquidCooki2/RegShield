import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Checkbox,
  Field,
  FileUpload,
  Flex,
  HStack,
  Icon,
  Input,
  Progress,
  Span,
  Spinner,
  Tabs,
  Text,
  VStack,
} from "@chakra-ui/react";
import { LuCircle, LuCircleCheck, LuCloudUpload, LuFileAudio, LuLock, LuMic, LuRadio, LuSquare } from "react-icons/lu";
import { toaster } from "@/components/ui/toaster";
import { PanelHeader } from "./PanelHeader";
import { useLiveMeeting } from "@/hooks/useLiveMeeting";
import { errorMessage } from "@/lib/api";
import { formatTime, stripExtension } from "@/lib/format";
import type { UserProfile } from "@/types";
import type { ReviewRecord, ReviewStatus } from "@transcribe/shared";

/**
 * POST /api/meetings with the audio as the raw body and real upload progress (fetch can't report
 * it). Resolves once the server has archived the original; analysis continues in the background.
 */
const uploadRecording = (
  file: File,
  query: { title: string; createdBy: string },
  onProgress: (pct: number) => void,
) =>
  new Promise<string>((resolve, reject) => {
    const params = new URLSearchParams({ ...query, fileName: file.name, consent: "true" });
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `/api/meetings?${params}`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new Error(errorMessage(xhr.status, xhr.responseText)));
        return;
      }
      try {
        resolve(JSON.parse(xhr.responseText).meetingId);
      } catch {
        reject(new Error("The server returned an unreadable response."));
      }
    };
    xhr.onerror = () => reject(new Error("Network error. Check your connection and try again."));
    xhr.send(file);
  });

const FINISHED: ReviewStatus[] = ["needs_review", "no_issues", "approved", "escalated", "failed"];
const POLL_MS = 3000;

/** Polls GET /api/meetings/:id until analysis finishes or fails. */
const waitForAnalysis = async (
  meetingId: string,
  signal: AbortSignal,
  onStatus: (status: ReviewStatus) => void,
): Promise<ReviewRecord> => {
  for (;;) {
    await new Promise((r) => setTimeout(r, POLL_MS));
    if (signal.aborted) throw new DOMException("Aborted", "AbortError");
    const res = await fetch(`/api/meetings/${meetingId}`, { signal });
    if (!res.ok) throw new Error(errorMessage(res.status, await res.text()));
    const review = (await res.json()) as ReviewRecord;
    onStatus(review.status);
    if (FINISHED.includes(review.status)) return review;
  }
};

type Phase = "idle" | "uploading" | "processing";

/** Recorded-mode stages shown while a recording is processed, in order. */
type Stage = "archiving" | "transcribing" | "analyzing";
const STAGES: { stage: Stage; label: string }[] = [
  { stage: "archiving", label: "Archiving the original" },
  { stage: "transcribing", label: "Transcribing" },
  { stage: "analyzing", label: "Checking for compliance issues" },
];
const stageFor = (status: ReviewStatus): Stage =>
  status === "uploaded" || status === "transcribing" ? "transcribing" : "analyzing";

interface Props {
  user: UserProfile;
  onAuditComplete: (review: ReviewRecord) => void;
  onLiveChange?: (live: boolean) => void;
}

export const TranscribeWorkspace: React.FC<Props> = ({ user, onAuditComplete, onLiveChange }) => {
  const [tab, setTab] = useState("live");
  const [hasConsent, setHasConsent] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [uploadPct, setUploadPct] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [uploadKey, setUploadKey] = useState(0);
  const [liveTitle, setLiveTitle] = useState("");
  const [archived, setArchived] = useState(false);
  const [stage, setStage] = useState<Stage>("archiving");
  const pollRef = useRef<AbortController | null>(null);
  useEffect(() => () => pollRef.current?.abort(), []);

  /** Shared by both modes once the full analysis has finished (or failed). */
  const reportResult = (review: ReviewRecord) => {
    if (review.status === "failed") {
      const reason = [...review.audit].reverse().find((e) => e.action === "failed")?.note;
      toaster.create({
        title: "Analysis failed",
        description: `${reason ?? "Processing stopped."} The original recording is still archived.`,
        type: "error",
      });
      return;
    }
    onAuditComplete(review);
    toaster.create({
      title: review.flags.length ? "Review needed" : "No issues found",
      description: review.flags.length
        ? `${review.flags.length} ${review.flags.length === 1 ? "flag was" : "flags were"} sent to the compliance queue. Overall risk: ${review.overallRisk}.`
        : "The analysis found nothing to flag.",
      type: review.flags.length ? "warning" : "success",
    });
  };

  const meeting = useLiveMeeting({
    onLiveChange,
    onComplete: (review) => {
      setArchived(Boolean(review.archiveKey));
      setLiveTitle("");
      setHasConsent(false); // consent applies to one meeting
      reportResult(review);
    },
  });
  const inSession = meeting.status === "live" || meeting.status === "analyzing";
  const sessionBusy = meeting.status !== "idle";
  const busy = phase !== "idle";
  const locked = sessionBusy || busy;

  const feedRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = feedRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [meeting.captions]);

  const startMeeting = () => {
    setArchived(false);
    void meeting.start(liveTitle.trim(), user.name);
  };

  const submitBatch = async () => {
    if (!file || !hasConsent) return;
    setPhase("uploading");
    setUploadPct(0);
    setStage("archiving");
    let meetingId: string;
    try {
      meetingId = await uploadRecording(
        file,
        { title: title.trim() || stripExtension(file.name), createdBy: user.name },
        (pct) => {
          setUploadPct(pct);
          if (pct >= 100) setPhase("processing"); // upload done, server is archiving
        },
      );
    } catch (err) {
      toaster.create({ title: "Upload failed", description: (err as Error).message, type: "error" });
      setPhase("idle");
      return;
    }

    // The original is archived, so the form can clear and consent is used up.
    setPhase("processing");
    setStage("transcribing");
    setFile(null);
    setTitle("");
    setUploadKey((k) => k + 1);
    setHasConsent(false); // consent applies to one meeting

    const controller = new AbortController();
    pollRef.current = controller;
    try {
      reportResult(await waitForAnalysis(meetingId, controller.signal, (status) => setStage(stageFor(status))));
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      toaster.create({
        title: "Lost track of the analysis",
        description: `${(err as Error).message} The recording is archived and will appear in the compliance queue when it finishes.`,
        type: "error",
      });
    } finally {
      setPhase("idle");
    }
  };

  const statusLabel =
    meeting.status === "connecting"
      ? "Connecting..."
      : meeting.status === "live"
        ? `Recording ${formatTime(meeting.elapsedSeconds)}`
        : meeting.status === "analyzing"
          ? "Archiving and running the full audit..."
          : "Ready to start";

  return (
    <Card.Root variant="outline" h="full">
      <Card.Header>
        <PanelHeader
          icon={<LuFileAudio size={20} />}
          title="Meeting audio"
          subtitle="Record a live meeting or upload a recording"
          right={
            <Badge colorPalette={archived ? "green" : "gray"} variant="subtle">
              <LuLock />
              {archived ? "Vault locked" : "Vault idle"}
            </Badge>
          }
        />
      </Card.Header>

      <Card.Body gap={5}>
        <Box
          colorPalette={hasConsent ? "green" : "orange"}
          bg="colorPalette.subtle"
          borderWidth="1px"
          borderColor="colorPalette.muted"
          borderRadius="lg"
          p={3.5}
        >
          <Checkbox.Root
            checked={hasConsent}
            disabled={locked}
            onCheckedChange={(d) => setHasConsent(d.checked === true)}
          >
            <Checkbox.HiddenInput />
            <Checkbox.Control />
            <Checkbox.Label fontSize="sm" fontWeight="medium">
              The client agreed to recording and automated supervisory review
            </Checkbox.Label>
          </Checkbox.Root>
        </Box>

        <Tabs.Root value={tab} onValueChange={(e) => setTab(e.value)} variant="line">
          <Tabs.List>
            <Tabs.Trigger value="live" disabled={busy}>
              <LuRadio /> Live meeting
            </Tabs.Trigger>
            <Tabs.Trigger value="recorded" disabled={locked}>
              <LuCloudUpload /> Upload recording
            </Tabs.Trigger>
          </Tabs.List>

          <Tabs.Content value="live" pt={5}>
            <VStack align="stretch" gap={4}>
              <Field.Root required>
                <Field.Label>Meeting title</Field.Label>
                <Input
                  size="sm"
                  placeholder="e.g. Annual review"
                  value={liveTitle}
                  onChange={(e) => setLiveTitle(e.target.value)}
                  disabled={locked}
                />
              </Field.Root>

              <Flex justify="space-between" align="center" gap={3} p={3.5} bg="bg.muted" borderRadius="lg">
                <HStack gap={2.5}>
                  <Box
                    boxSize={2.5}
                    borderRadius="full"
                    bg={meeting.status === "live" ? "red.solid" : "fg.subtle"}
                    animationName={meeting.status === "live" ? "pulse" : undefined}
                    animationDuration="1.5s"
                    animationIterationCount="infinite"
                  />
                  <Text fontSize="sm" fontWeight="medium" fontVariantNumeric="tabular-nums">
                    {statusLabel}
                  </Text>
                </HStack>

                {inSession ? (
                  <Button size="sm" colorPalette="red" onClick={meeting.stop} loading={meeting.status === "analyzing"}>
                    <LuSquare /> End meeting
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    colorPalette="blue"
                    onClick={startMeeting}
                    loading={meeting.status === "connecting"}
                    disabled={!hasConsent || !liveTitle.trim() || locked}
                  >
                    <LuMic /> Start meeting
                  </Button>
                )}
              </Flex>

              {meeting.alerts.length > 0 && (
                <VStack align="stretch" gap={2} aria-live="polite">
                  {[...meeting.alerts].reverse().map((alert) => (
                    <Alert.Root key={`${alert.ruleId}-${alert.shownAt}`} status="warning" variant="subtle" size="sm">
                      <Alert.Indicator />
                      <Alert.Content>
                        <Alert.Title>{alert.nudge}</Alert.Title>
                        <Alert.Description color="fg.muted">
                          {alert.ruleId} at {formatTime(alert.timestampSeconds)}: "{alert.quote}"
                        </Alert.Description>
                      </Alert.Content>
                    </Alert.Root>
                  ))}
                </VStack>
              )}

              <Box
                ref={feedRef}
                h="240px"
                overflowY="auto"
                p={3.5}
                bg="bg.muted"
                borderWidth="1px"
                borderRadius="lg"
                fontFamily="mono"
                fontSize="xs"
                lineHeight="tall"
              >
                {meeting.captions.length === 0 ? (
                  <Text color="fg.muted" fontStyle="italic" textAlign="center" py={16} fontFamily="body">
                    {meeting.status === "live"
                      ? "Listening. Lines appear a moment after each person finishes speaking."
                      : "The redacted transcript appears here during the meeting."}
                  </Text>
                ) : (
                  meeting.captions.map((caption) => (
                    <Text key={caption.id} mb={2}>
                      <Span fontWeight="bold" color="blue.fg">
                        [{caption.timestamp}] {caption.speaker}:
                      </Span>{" "}
                      {caption.text}
                    </Text>
                  ))
                )}
              </Box>

              {meeting.status === "analyzing" && (
                <Progress.Root value={null} size="xs">
                  <Progress.Track>
                    <Progress.Range />
                  </Progress.Track>
                </Progress.Root>
              )}
            </VStack>
          </Tabs.Content>

          <Tabs.Content value="recorded" pt={5}>
            <VStack align="stretch" gap={4}>
              <Field.Root>
                <Field.Label>Meeting title</Field.Label>
                <Input
                  size="sm"
                  placeholder="e.g. Annual review"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={busy}
                />
              </Field.Root>

              <FileUpload.Root
                key={uploadKey}
                maxFiles={1}
                accept={["audio/*"]}
                disabled={busy}
                onFileChange={(details) => {
                  const picked = details.acceptedFiles[0] ?? null;
                  setFile(picked);
                  if (picked && !title) setTitle(stripExtension(picked.name));
                }}
              >
                <FileUpload.HiddenInput />
                <FileUpload.Dropzone w="full">
                  <Icon size="lg" color="fg.muted">
                    <LuCloudUpload />
                  </Icon>
                  <FileUpload.DropzoneContent>
                    <Box>Drop a recording here or click to browse</Box>
                    <Box color="fg.muted">MP3, WAV, M4A, FLAC, OGG or WebM</Box>
                  </FileUpload.DropzoneContent>
                </FileUpload.Dropzone>
                <FileUpload.List clearable />
              </FileUpload.Root>

              {phase === "uploading" && (
                <VStack align="stretch" gap={1.5}>
                  <Progress.Root value={uploadPct} size="xs">
                    <Progress.Track>
                      <Progress.Range />
                    </Progress.Track>
                  </Progress.Root>
                  <Text fontSize="xs" color="fg.muted">
                    Uploading {uploadPct}%
                  </Text>
                </VStack>
              )}

              {phase === "processing" && (
                <VStack align="stretch" gap={2} p={3.5} bg="bg.muted" borderRadius="lg" aria-live="polite">
                  {STAGES.map(({ stage: s, label }, i) => {
                    const current = STAGES.findIndex((x) => x.stage === stage);
                    return (
                      <HStack key={s} gap={2.5} color={i > current ? "fg.subtle" : undefined}>
                        {i < current ? (
                          <Icon color="green.fg"><LuCircleCheck /></Icon>
                        ) : i === current ? (
                          <Spinner size="xs" />
                        ) : (
                          <Icon><LuCircle /></Icon>
                        )}
                        <Text fontSize="sm">{label}</Text>
                      </HStack>
                    );
                  })}
                </VStack>
              )}

              <Button
                size="sm"
                colorPalette="blue"
                onClick={submitBatch}
                disabled={!file || !hasConsent || busy}
                loading={busy}
                loadingText={phase === "uploading" ? "Uploading..." : "Processing..."}
              >
                Upload and analyze
              </Button>
            </VStack>
          </Tabs.Content>
        </Tabs.Root>
      </Card.Body>
    </Card.Root>
  );
};