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
  Tabs,
  Text,
  VStack,
} from "@chakra-ui/react";
import { LuCloudUpload, LuFileAudio, LuLock, LuMic, LuRadio, LuSquare } from "react-icons/lu";
import { toaster } from "@/components/ui/toaster";
import { PanelHeader } from "./PanelHeader";
import { useLiveMeeting } from "@/hooks/useLiveMeeting";
import { stripExtension } from "@/lib/format";
import type { ComplianceAuditReport, SeverityLevel, UserProfile } from "@/types";

interface AuditResponse {
  report: ComplianceAuditReport;
  s3Location?: string;
}

/** POST to the audit endpoint with real upload progress (fetch can't report it). */
const postAudit = (formData: FormData, onProgress?: (pct: number) => void) =>
  new Promise<AuditResponse>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/compliance/upload");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new Error(`The server responded with ${xhr.status}.`));
        return;
      }
      try {
        const data = JSON.parse(xhr.responseText);
        if (data.report) resolve(data);
        else reject(new Error("The server returned no audit report."));
      } catch {
        reject(new Error("The server returned an unreadable response."));
      }
    };
    xhr.onerror = () => reject(new Error("Network error."));
    xhr.send(formData);
  });

const nudgeStatus = (severity: SeverityLevel) =>
  severity === "CRITICAL" || severity === "HIGH" ? "error" : severity === "MEDIUM" ? "warning" : "info";

type Phase = "idle" | "uploading" | "processing";

interface Props {
  user: UserProfile;
  onAuditComplete: (report: ComplianceAuditReport, audioUri?: string) => void;
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
  const [failedTranscript, setFailedTranscript] = useState<string | null>(null);

  const meeting = useLiveMeeting({ onLiveChange });
  const inSession = meeting.status === "live" || meeting.status === "stopping";
  const sessionBusy = meeting.status !== "idle";
  const busy = phase !== "idle";
  const locked = sessionBusy || busy;

  const feedRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = feedRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [meeting.turns]);

  const handleComplete = (data: AuditResponse) => {
    onAuditComplete(data.report, data.s3Location);
    setHasConsent(false); // consent applies to one meeting
    toaster.create({
      title: "Audit complete",
      description: `Risk level: ${data.report.overallRiskLevel}. The audit was saved.`,
      type: "success",
    });
  };

  const runLiveAudit = async (transcript: string) => {
    setPhase("processing");
    setFailedTranscript(null);
    try {
      const formData = new FormData();
      formData.append("transcript", transcript);
      formData.append("advisorId", user.id);
      handleComplete(await postAudit(formData));
    } catch (err) {
      setFailedTranscript(transcript);
      toaster.create({
        title: "Audit failed",
        description: `${(err as Error).message} The transcript is kept, so you can retry.`,
        type: "error",
      });
    } finally {
      setPhase("idle");
    }
  };

  const endMeeting = async () => {
    const transcript = await meeting.stop();
    if (!transcript.trim()) {
      toaster.create({
        title: "No speech captured",
        description: "Nothing was transcribed during this session, so no audit was run.",
        type: "warning",
      });
      return;
    }
    await runLiveAudit(transcript);
  };

  const submitBatch = async () => {
    if (!file || !hasConsent) return;
    setPhase("uploading");
    setUploadPct(0);
    try {
      const formData = new FormData();
      formData.append("audio", file);
      formData.append("advisorId", user.id);
      formData.append("meetingTitle", title || file.name);
      const data = await postAudit(formData, (pct) => {
        setUploadPct(pct);
        if (pct >= 100) setPhase("processing"); // upload done, server is transcribing
      });
      handleComplete(data);
      setFile(null);
      setTitle("");
      setUploadKey((k) => k + 1);
    } catch (err) {
      toaster.create({
        title: "Upload failed",
        description: (err as Error).message,
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
        ? "Recording and streaming"
        : meeting.status === "stopping"
          ? "Finishing up..."
          : phase === "processing"
            ? "Running the audit..."
            : "Ready to start";

  return (
    <Card.Root variant="outline" h="full">
      <Card.Header>
        <PanelHeader
          icon={<LuFileAudio size={20} />}
          title="Meeting audio"
          subtitle="Record a live meeting or upload a recording"
          right={
            <Badge colorPalette={meeting.vaultKey ? "green" : "gray"} variant="subtle" title={meeting.vaultKey ?? undefined}>
              <LuLock />
              {meeting.vaultKey ? "Vault locked" : "Vault idle"}
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
              {meeting.nudge && (
                <Alert.Root status={nudgeStatus(meeting.nudge.severity)}>
                  <Alert.Indicator />
                  <Alert.Content>
                    <Alert.Title>Compliance nudge ({meeting.nudge.severity})</Alert.Title>
                    <Alert.Description>{meeting.nudge.message}</Alert.Description>
                  </Alert.Content>
                </Alert.Root>
              )}

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
                  <Text fontSize="sm" fontWeight="medium">
                    {statusLabel}
                  </Text>
                </HStack>

                {inSession ? (
                  <Button size="sm" colorPalette="red" onClick={endMeeting} loading={meeting.status === "stopping"}>
                    <LuSquare /> End meeting and run audit
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    colorPalette="blue"
                    onClick={meeting.start}
                    loading={meeting.status === "connecting"}
                    disabled={!hasConsent || locked}
                  >
                    <LuMic /> Start meeting
                  </Button>
                )}
              </Flex>

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
                {meeting.turns.length === 0 ? (
                  <Text color="fg.muted" fontStyle="italic" textAlign="center" py={16} fontFamily="body">
                    {meeting.status === "live"
                      ? "Listening. Lines appear as people speak."
                      : "The transcript appears here during the meeting."}
                  </Text>
                ) : (
                  meeting.turns.map((turn) => (
                    <Text key={turn.id} mb={2}>
                      <Span fontWeight="bold" color="blue.fg">
                        [{turn.timestamp}] {turn.speaker}:
                      </Span>{" "}
                      {turn.text}
                    </Text>
                  ))
                )}
              </Box>

              {meeting.turns.length > 0 && meeting.transcriptSource === "browser" && (
                <Alert.Root status="warning" size="sm">
                  <Alert.Indicator />
                  <Alert.Content>
                    <Alert.Description>
                      Browser transcription can't tell speakers apart, so every line is unlabeled.
                      Check who said what before relying on any flag.
                    </Alert.Description>
                  </Alert.Content>
                </Alert.Root>
              )}

              {phase === "processing" && <Progress.Root value={null} size="xs"><Progress.Track><Progress.Range /></Progress.Track></Progress.Root>}

              {failedTranscript && !locked && (
                <Button size="sm" variant="outline" onClick={() => runLiveAudit(failedTranscript)}>
                  Retry audit
                </Button>
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
                    <Box color="fg.muted">MP3, WAV or M4A</Box>
                  </FileUpload.DropzoneContent>
                </FileUpload.Dropzone>
                <FileUpload.List clearable />
              </FileUpload.Root>

              {busy && (
                <VStack align="stretch" gap={1.5}>
                  <Progress.Root value={phase === "uploading" ? uploadPct : null} size="xs">
                    <Progress.Track>
                      <Progress.Range />
                    </Progress.Track>
                  </Progress.Root>
                  <Text fontSize="xs" color="fg.muted">
                    {phase === "uploading" ? `Uploading ${uploadPct}%` : "Transcribing and analyzing..."}
                  </Text>
                </VStack>
              )}

              <Button
                size="sm"
                colorPalette="blue"
                onClick={submitBatch}
                disabled={!file || !hasConsent || busy}
                loading={busy}
                loadingText="Processing..."
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