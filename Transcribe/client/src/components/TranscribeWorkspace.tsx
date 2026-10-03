import React, { useEffect, useRef, useState } from "react";
import {
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
import { LuCircle, LuCircleCheck, LuCloudUpload } from "react-icons/lu";
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
          : "Not recording";

  const consentHint = !hasConsent ? "Confirm consent before you start." : undefined;

  return (
    <Card.Root variant="outline" h="full">
      <Card.Header pb={0}>
        <PanelHeader
          title="Meeting audio"
          subtitle="Record a live meeting or upload a recording"
          right={
            archived ? (
              <Text fontSize="sm" color="green.fg">
                Original archived
              </Text>
            ) : undefined
          }
        />
      </Card.Header>

      <Card.Body gap={6}>
        <Checkbox.Root
          checked={hasConsent}
          disabled={locked}
          onCheckedChange={(d) => setHasConsent(d.checked === true)}
          alignItems="flex-start"
        >
          <Checkbox.HiddenInput />
          <Checkbox.Control mt={0.5} />
          <Box>
            <Checkbox.Label fontWeight="medium">
              The client agreed to recording and automated supervisory review
            </Checkbox.Label>
            <Text fontSize="xs" color="fg.muted" mt={0.5}>
              Applies to one meeting. You'll confirm again next time.
            </Text>
          </Box>
        </Checkbox.Root>

        <Tabs.Root value={tab} onValueChange={(e) => setTab(e.value)} variant="line">
          <Tabs.List>
            <Tabs.Trigger value="live" disabled={busy}>
              Live meeting
            </Tabs.Trigger>
            <Tabs.Trigger value="recorded" disabled={locked}>
              Upload recording
            </Tabs.Trigger>
          </Tabs.List>

          <Tabs.Content value="live" pt={6}>
            <VStack align="stretch" gap={6}>
              <Field.Root required>
                <Field.Label>Meeting title</Field.Label>
                <Input
                  placeholder="Annual review"
                  value={liveTitle}
                  onChange={(e) => setLiveTitle(e.target.value)}
                  disabled={locked}
                />
              </Field.Root>

              <Flex justify="space-between" align="center" gap={4}>
                <HStack gap={3}>
                  <Box
                    boxSize={2}
                    borderRadius="full"
                    bg={meeting.status === "live" ? "red.solid" : "border.emphasized"}
                    animationName={meeting.status === "live" ? "pulse" : undefined}
                    animationDuration="1.5s"
                    animationIterationCount="infinite"
                  />
                  <Box>
                    <Text fontSize="sm" fontWeight="medium" fontVariantNumeric="tabular-nums">
                      {statusLabel}
                    </Text>
                    {meeting.status === "idle" && consentHint && (
                      <Text fontSize="xs" color="fg.muted">
                        {consentHint}
                      </Text>
                    )}
                  </Box>
                </HStack>

                {inSession ? (
                  <Button size="sm" colorPalette="red" onClick={meeting.stop} loading={meeting.status === "analyzing"}>
                    End meeting
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={startMeeting}
                    loading={meeting.status === "connecting"}
                    disabled={!hasConsent || !liveTitle.trim() || locked}
                  >
                    Start meeting
                  </Button>
                )}
              </Flex>

              {meeting.status === "analyzing" && (
                <Progress.Root value={null} size="xs">
                  <Progress.Track>
                    <Progress.Range />
                  </Progress.Track>
                </Progress.Root>
              )}

              {meeting.alerts.length > 0 && (
                <VStack align="stretch" gap={3} aria-live="polite">
                  {[...meeting.alerts].reverse().map((alert) => (
                    <Box
                      key={`${alert.ruleId}-${alert.shownAt}`}
                      colorPalette="orange"
                      borderLeftWidth="3px"
                      borderLeftColor="colorPalette.solid"
                      pl={3}
                      py={0.5}
                    >
                      <Text fontSize="sm" fontWeight="medium">
                        {alert.nudge}
                      </Text>
                      <Text fontSize="xs" color="fg.muted" mt={0.5}>
                        {alert.ruleId} at {formatTime(alert.timestampSeconds)}: "{alert.quote}"
                      </Text>
                    </Box>
                  ))}
                </VStack>
              )}

              <Box
                ref={feedRef}
                h="260px"
                overflowY="auto"
                borderTopWidth="1px"
                borderBottomWidth="1px"
                py={4}
                fontSize="sm"
                lineHeight="tall"
              >
                {meeting.captions.length === 0 ? (
                  <Text color="fg.muted" textAlign="center" pt={20}>
                    {meeting.status === "live"
                      ? "Listening. Lines appear a moment after each person finishes speaking."
                      : "The redacted transcript appears here during the meeting."}
                  </Text>
                ) : (
                  meeting.captions.map((caption) => (
                    <Box key={caption.id} mb={3}>
                      <Text fontSize="xs" color="fg.muted" fontVariantNumeric="tabular-nums">
                        {caption.timestamp} <Span fontWeight="medium" color="fg">{caption.speaker}</Span>
                      </Text>
                      <Text>{caption.text}</Text>
                    </Box>
                  ))
                )}
              </Box>
            </VStack>
          </Tabs.Content>

          <Tabs.Content value="recorded" pt={6}>
            <VStack align="stretch" gap={6}>
              <Field.Root>
                <Field.Label>Meeting title</Field.Label>
                <Input
                  placeholder="Annual review"
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
                <FileUpload.Dropzone w="full" py={8}>
                  <Icon size="lg" color="fg.muted">
                    <LuCloudUpload />
                  </Icon>
                  <FileUpload.DropzoneContent>
                    <Box>Drop a recording here or click to browse</Box>
                    <Box color="fg.muted">MP3, WAV, M4A, FLAC, OGG, or WebM</Box>
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
                <VStack align="stretch" gap={2.5} aria-live="polite">
                  {STAGES.map(({ stage: s, label }, i) => {
                    const current = STAGES.findIndex((x) => x.stage === stage);
                    return (
                      <HStack key={s} gap={2.5} color={i > current ? "fg.subtle" : undefined}>
                        {i < current ? (
                          <Icon color="green.fg">
                            <LuCircleCheck />
                          </Icon>
                        ) : i === current ? (
                          <Spinner size="xs" />
                        ) : (
                          <Icon>
                            <LuCircle />
                          </Icon>
                        )}
                        <Text fontSize="sm">{label}</Text>
                      </HStack>
                    );
                  })}
                </VStack>
              )}

              <Button
                size="sm"
                alignSelf="flex-start"
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