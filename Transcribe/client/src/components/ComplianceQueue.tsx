import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Field,
  Flex,
  Grid,
  GridItem,
  HStack,
  Separator,
  Spinner,
  Text,
  Textarea,
  VStack,
} from "@chakra-ui/react";
import {
  LuArrowUpRight,
  LuCircleCheck,
  LuClock,
  LuPause,
  LuPlay,
  LuRefreshCw,
  LuShieldAlert,
} from "react-icons/lu";
import { toaster } from "@/components/ui/toaster";
import { PanelHeader } from "./PanelHeader";
import { errorMessage, sendJson } from "@/lib/api";
import { formatTime, riskPalette } from "@/lib/format";
import type { UserProfile } from "@/types";
import type { ReviewRecord, SpeakerRole } from "@transcribe/shared";

/** One row of GET /api/meetings (already sorted by risk, then newest). */
type QueueItem = Pick<
  ReviewRecord,
  "meetingId" | "mode" | "title" | "createdAt" | "createdBy" | "status" | "overallRisk" | "summaryStatus"
> & { flagCount: number };

/** GET /api/meetings/:id adds a short-lived presigned link to the archived original. */
type MeetingDetail = ReviewRecord & { audioUrl?: string };

type Decision = "approve" | "escalate";

const ROLE_LABEL: Record<SpeakerRole, string> = {
  advisor: "Advisor",
  client: "Client",
  third_party: "Third party",
};

const speakerName = (detail: MeetingDetail, speaker: string) => {
  const role = detail.speakerRoles[speaker];
  return role ? ROLE_LABEL[role] : speaker;
};

const formatDate = (iso: string) => new Date(iso).toLocaleString();

const seekAndPlay = (audio: HTMLAudioElement, seconds: number) => {
  const go = () => {
    audio.currentTime = seconds;
    audio.play().catch(console.error);
  };
  if (audio.readyState >= 1) go();
  else audio.addEventListener("loadedmetadata", go, { once: true });
};

export const ComplianceQueue: React.FC<{ reviewer: UserProfile }> = ({ reviewer }) => {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<MeetingDetail | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  // Bumped by Refresh so the open case reloads too (its audio link expires after 15 minutes).
  const [refreshCount, setRefreshCount] = useState(0);
  const [note, setNote] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [playingFlag, setPlayingFlag] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const fetchQueue = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/meetings");
      if (!res.ok) throw new Error(errorMessage(res.status, await res.text()));
      const next = ((await res.json()) as QueueItem[]).filter((m) => m.status === "needs_review");
      setQueue(next);
      setSelectedId((prev) => (next.some((m) => m.meetingId === prev) ? prev : (next[0]?.meetingId ?? null)));
      setRefreshCount((n) => n + 1);
    } catch (err) {
      toaster.create({
        title: "Couldn't load the queue",
        description: `${(err as Error).message} Check your connection, then try Refresh.`,
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  // The note and playback belong to one case, so they reset only when the selection changes.
  useEffect(() => {
    setNote("");
    setPlayingFlag(null);
    setDetail(null);
  }, [selectedId]);

  useEffect(() => {
    setDetailError(null);
    if (!selectedId) return;
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch(`/api/meetings/${selectedId}`, { signal: controller.signal });
        if (!res.ok) throw new Error(errorMessage(res.status, await res.text()));
        setDetail((await res.json()) as MeetingDetail);
      } catch (err) {
        if ((err as Error).name !== "AbortError") setDetailError((err as Error).message);
      }
    })();
    return () => controller.abort();
  }, [selectedId, refreshCount]);

  const toggleFlagAudio = (idx: number, seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playingFlag === idx && !audio.paused) {
      audio.pause();
      return;
    }
    setPlayingFlag(idx);
    seekAndPlay(audio, seconds);
  };

  const decide = async (decision: Decision) => {
    if (!detail || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await sendJson(`/api/meetings/${detail.meetingId}/${decision}`, "POST", {
        actor: reviewer.name,
        note: note.trim() || undefined,
      });
      toaster.create({
        title: decision === "escalate" ? "Meeting escalated" : "Meeting approved",
        description: `"${detail.title}" left the queue. Your decision is in its audit trail.`,
        type: decision === "escalate" ? "warning" : "success",
      });
      await fetchQueue();
    } catch (err) {
      toaster.create({
        title: "Decision not saved",
        description: (err as Error).message,
        type: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selected = queue.find((m) => m.meetingId === selectedId) ?? null;

  return (
    <Card.Root variant="outline">
      <Card.Header>
        <PanelHeader
          palette="red"
          icon={<LuShieldAlert size={20} />}
          title="Supervisory review queue"
          subtitle="Flagged meetings with time-aligned audio evidence"
          right={
            <Button size="xs" variant="outline" onClick={fetchQueue} loading={isLoading}>
              <LuRefreshCw size={12} /> Refresh
            </Button>
          }
        />
      </Card.Header>

      <Card.Body>
        <Grid templateColumns={{ base: "minmax(0, 1fr)", lg: "minmax(0, 5fr) minmax(0, 7fr)" }} gap={6}>
          {/* Queue list */}
          <GridItem pr={{ lg: 6 }} borderRightWidth={{ base: 0, lg: "1px" }}>
            <Text fontSize="sm" fontWeight="semibold" mb={3}>
              Needs review ({queue.length})
            </Text>
            <VStack align="stretch" gap={2} maxH="65vh" overflowY="auto">
              {queue.length === 0 && !isLoading && (
                <Text fontSize="sm" color="fg.muted">
                  No meetings need review. Flagged meetings appear here once their analysis finishes.
                </Text>
              )}
              {queue.map((item) => {
                const active = item.meetingId === selectedId;
                return (
                  <Box
                    key={item.meetingId}
                    as="button"
                    w="full"
                    textAlign="left"
                    p={3.5}
                    borderRadius="lg"
                    borderWidth="1px"
                    colorPalette="blue"
                    borderColor={active ? "colorPalette.solid" : "border"}
                    bg={active ? "colorPalette.subtle" : "transparent"}
                    _hover={{ borderColor: "colorPalette.solid" }}
                    aria-pressed={active}
                    onClick={() => setSelectedId(item.meetingId)}
                  >
                    <Flex justify="space-between" align="center" gap={2} mb={1.5}>
                      <Text fontWeight="semibold" fontSize="sm" truncate>
                        {item.title}
                      </Text>
                      <Badge colorPalette={riskPalette(item.overallRisk)} size="sm" flexShrink={0}>
                        {item.overallRisk} risk
                      </Badge>
                    </Flex>
                    <HStack gap={2} fontSize="xs" color="fg.muted">
                      <Badge variant="outline" size="sm">
                        {item.mode === "live" ? "Live" : "Recorded"}
                      </Badge>
                      <Text truncate>
                        {item.flagCount} {item.flagCount === 1 ? "flag" : "flags"} · {item.createdBy} ·{" "}
                        {formatDate(item.createdAt)}
                      </Text>
                    </HStack>
                  </Box>
                );
              })}
            </VStack>
          </GridItem>

          {/* Case detail */}
          <GridItem>
            {!selected ? (
              <VStack py={16} gap={2} color="fg.muted" textAlign="center">
                <LuClock size={32} />
                <Text fontSize="sm">Select a meeting to review its flags and audio.</Text>
              </VStack>
            ) : detailError ? (
              <Alert.Root status="error">
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Title>Couldn't load this meeting</Alert.Title>
                  <Alert.Description>{detailError} Try Refresh.</Alert.Description>
                </Alert.Content>
              </Alert.Root>
            ) : !detail ? (
              <VStack py={16}>
                <Spinner />
              </VStack>
            ) : (
              <VStack align="stretch" gap={5}>
                <Flex justify="space-between" align="center" gap={3}>
                  <Box minW={0}>
                    <Text fontWeight="semibold" truncate>
                      {detail.title}
                    </Text>
                    <Text fontSize="xs" color="fg.muted">
                      {detail.mode === "live" ? "Live meeting" : "Recorded meeting"} by {detail.createdBy},{" "}
                      {formatDate(detail.createdAt)}
                    </Text>
                  </Box>
                  <Badge colorPalette={riskPalette(detail.overallRisk)} variant="subtle" size="md">
                    {detail.overallRisk} risk
                  </Badge>
                </Flex>

                {detail.audioUrl ? (
                  <audio
                    ref={audioRef}
                    src={detail.audioUrl}
                    controls
                    preload="metadata"
                    style={{ width: "100%" }}
                    onPause={() => setPlayingFlag(null)}
                    onEnded={() => setPlayingFlag(null)}
                    onError={() =>
                      toaster.create({
                        title: "Audio couldn't play",
                        description: "The link may have expired. Refresh the queue to get a new one.",
                        type: "error",
                      })
                    }
                  />
                ) : (
                  <Text fontSize="xs" color="fg.muted">
                    Audio isn't available for this meeting.
                  </Text>
                )}

                <Separator />

                <VStack align="stretch" gap={3}>
                  <Text fontSize="sm" fontWeight="semibold">
                    Compliance flags ({detail.flags.length})
                  </Text>
                  {detail.flags.map((flag, idx) => (
                    <Box
                      key={idx}
                      colorPalette={riskPalette(flag.severity)}
                      p={4}
                      borderRadius="lg"
                      borderWidth="1px"
                      borderColor="colorPalette.muted"
                      bg="colorPalette.subtle"
                    >
                      <Flex justify="space-between" align="center" gap={2} wrap="wrap">
                        <HStack gap={2} wrap="wrap">
                          <Badge colorPalette={riskPalette(flag.severity)} size="sm">
                            {flag.severity}
                          </Badge>
                          <Text fontSize="sm" fontWeight="semibold">
                            {flag.ruleId}: {flag.ruleName}
                          </Text>
                          <Badge variant="outline" size="sm">
                            {ROLE_LABEL[flag.speakerRole]}
                          </Badge>
                        </HStack>
                        <Button
                          size="xs"
                          variant="subtle"
                          colorPalette="blue"
                          disabled={!detail.audioUrl}
                          onClick={() => toggleFlagAudio(idx, flag.timestampSeconds)}
                        >
                          {playingFlag === idx ? <LuPause size={11} /> : <LuPlay size={11} />}
                          {playingFlag === idx
                            ? `Pause (${formatTime(flag.timestampSeconds)})`
                            : `Play at ${formatTime(flag.timestampSeconds)}`}
                        </Button>
                      </Flex>
                      <Text fontSize="sm" fontFamily="mono" fontWeight="medium" color="colorPalette.fg" mt={3}>
                        "{flag.quote}"
                      </Text>
                      {!flag.quoteVerified && (
                        <Text fontSize="xs" color="orange.fg" mt={1}>
                          This quote wasn't found in the transcript. Listen to the audio before relying on it.
                        </Text>
                      )}
                      <Text fontSize="sm" mt={2}>
                        {flag.explanation}
                      </Text>
                      <Text fontSize="sm" color="fg.muted" mt={1.5}>
                        <Text as="span" fontWeight="semibold" color="fg">
                          Suggested action:
                        </Text>{" "}
                        {flag.suggestedAction}
                      </Text>
                    </Box>
                  ))}
                </VStack>

                {detail.liveAlerts.length > 0 && (
                  <VStack align="stretch" gap={2}>
                    <Text fontSize="sm" fontWeight="semibold">
                      Alerts shown to the advisor during the meeting ({detail.liveAlerts.length})
                    </Text>
                    {detail.liveAlerts.map((alert, idx) => (
                      <Text key={idx} fontSize="sm">
                        <Text as="span" fontFamily="mono" color="fg.muted">
                          [{formatTime(alert.timestampSeconds)}] {alert.ruleId}
                        </Text>{" "}
                        {alert.nudge}
                      </Text>
                    ))}
                  </VStack>
                )}

                <VStack align="stretch" gap={2}>
                  <Text fontSize="sm" fontWeight="semibold">
                    Redacted transcript
                  </Text>
                  <Box
                    maxH="240px"
                    overflowY="auto"
                    p={3.5}
                    bg="bg.muted"
                    borderWidth="1px"
                    borderRadius="lg"
                    fontSize="xs"
                    lineHeight="tall"
                  >
                    {detail.transcript.map((turn, idx) => (
                      <Text key={idx} mb={2}>
                        <Text as="span" fontWeight="bold" color="blue.fg">
                          [{formatTime(turn.start)}] {speakerName(detail, turn.speaker)}:
                        </Text>{" "}
                        {turn.text}
                      </Text>
                    ))}
                  </Box>
                </VStack>

                <VStack align="stretch" gap={2}>
                  <Text fontSize="sm" fontWeight="semibold">
                    Audit trail
                  </Text>
                  <VStack align="stretch" gap={1} fontSize="xs">
                    {detail.audit.map((event, idx) => (
                      <Text key={idx}>
                        <Text as="span" color="fg.muted">
                          {formatDate(event.at)}
                        </Text>{" "}
                        <Text as="span" fontWeight="medium">
                          {event.action.replaceAll("_", " ")}
                        </Text>{" "}
                        by {event.actor}
                        {event.note && (
                          <Text as="span" color="fg.muted">
                            {" "}
                            ({event.note})
                          </Text>
                        )}
                      </Text>
                    ))}
                  </VStack>
                </VStack>

                <Box p={4} borderRadius="lg" bg="bg.muted" borderWidth="1px">
                  <Field.Root>
                    <Field.Label>Reviewer note ({reviewer.name})</Field.Label>
                    <Textarea
                      size="sm"
                      bg="bg.panel"
                      rows={3}
                      placeholder="Saved to the audit trail with your decision"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      disabled={isSubmitting}
                    />
                    <Field.HelperText>A note is required to escalate.</Field.HelperText>
                  </Field.Root>
                  <HStack gap={2} justify="flex-end" mt={4} wrap="wrap">
                    <Button
                      size="sm"
                      colorPalette="red"
                      onClick={() => decide("escalate")}
                      disabled={isSubmitting || note.trim().length === 0}
                    >
                      <LuArrowUpRight /> Escalate
                    </Button>
                    <Button
                      size="sm"
                      colorPalette="green"
                      variant="subtle"
                      onClick={() => decide("approve")}
                      disabled={isSubmitting}
                    >
                      <LuCircleCheck /> Approve
                    </Button>
                  </HStack>
                </Box>
              </VStack>
            )}
          </GridItem>
        </Grid>
      </Card.Body>
    </Card.Root>
  );
};
